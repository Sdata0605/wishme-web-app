# PHASE 4A — PAYMENT INTEGRITY AUDIT REPORT
**Project:** WishMe (wishme.today)
**Audit Date:** 2026-05-02
**Auditor:** Payment & Financial Integrity Specialist
**Scope:** Payment edge functions, payment triggers, wallet system
**Deployment Gate:** FAIL — 3 CRITICAL unresolved vulnerabilities

---

## Executive Summary

A full source-level audit of WishMe's payment edge functions and database schema was performed. Seven financial integrity issues were identified: three CRITICAL, two HIGH, two MEDIUM. The most dangerous issue is a double-spend race condition that allows a single Razorpay payment to trigger two separate booking commissions. Referral commissions are architecturally broken and 100% lost. Booking price is computed entirely client-side with no server-side re-validation, enabling trivial price manipulation. The platform MUST NOT be released in its current state.

---

## CRITICAL-1: Double-Spend via Razorpay Payment ID Replay

**File:** `supabase/functions/verify-razorpay-payment/index.ts`

**Issue:** No idempotency guard on `razorpay_payment_id`. After HMAC verification passes, the function unconditionally updates the booking and inserts into `payment_transactions`. The table has UNIQUE only on `wishme_payment_id` (freshly generated on every call), not on `razorpay_payment_id`. Two concurrent calls with the same valid Razorpay payment ID both insert new rows.

**Attack Scenario:**
1. User pays Rs. 10,000 for celebrity video (Rs. 7,000 celebrity commission)
2. Attacker intercepts the verified Razorpay payment ID
3. Sends the same payment ID twice concurrently
4. Both requests pass HMAC verification
5. Both insert into `payment_transactions`
6. Celebrity gets credited Rs. 14,000 instead of Rs. 7,000

**Impact:** Unlimited duplicate bookings for same payment. Celebrity balance inflated. Platform revenue negative.

**Fix A (Database):** 
```sql
ALTER TABLE public.payment_transactions 
ADD CONSTRAINT uq_razorpay_payment_id UNIQUE (razorpay_payment_id);
```

**Fix B (Edge Function):** After HMAC passes, check:
```typescript
const { data: existing } = await supabase
  .from('payment_transactions')
  .select('wishme_payment_id')
  .eq('razorpay_payment_id', razorpayPaymentId)
  .single();

if (existing) {
  return new Response(
    JSON.stringify({ success: true, duplicate: true, wishme_payment_id: existing.wishme_payment_id }),
    { status: 200 }
  );
}
```

---

## CRITICAL-2: Referral Earnings Never Credited to Wallet

**Files:** 
- `supabase/migrations/20251007181109_70d92869-*.sql` — `process_referral_commissions` trigger
- `supabase/migrations/20251024015207_33023ed5-*.sql` — `update_wallet_balance` trigger

**Issue:** `process_referral_commissions` inserts commissions into `referral_transactions` with `status='completed'`. But `update_wallet_balance` trigger only fires on `wallet_transactions` INSERT. For a credit to reach `profiles.wallet_balance`, a row must exist in `wallet_transactions` with `transaction_type='referral_commission'` and `status='completed'`. This never happens.

**Result:** 100% of all referral commissions at all levels are silently lost. Records exist in database but money never reaches referrer's wallet.

**Example Impact:**
- Premium plan referrer (L1 = 10%)
- Booking: Rs. 5,000
- Expected wallet credit: Rs. 500
- Actual wallet credit: Rs. 0

**Fix:** In `process_referral_commissions` trigger, after each `referral_transactions` INSERT, add:
```sql
INSERT INTO wallet_transactions (
  user_id, transaction_type, amount, status, 
  reference_id, created_at
) VALUES (
  l1_referrer_id, 'referral_commission', l1_commission_amount, 'completed',
  NEW.id, now()
);
```

Also: Run one-time historical reconciliation to credit all past referrals.

---

## CRITICAL-3: No Server-Side Booking Price Validation

**Files:** 
- `src/components/booking/CheckoutStep.tsx` (lines 65–68, 112–118)
- `supabase/functions/create-razorpay-order/index.ts`

**Issue:** Frontend computes `totalAmount = discountedServicePrice + discountedServicePrice * 0.1` entirely in React and passes it as POST body. `create-razorpay-order` accepts any `amount` with zero database validation:
```typescript
const { amount, currency, receipt, notes } = await req.json();
const orderData = { amount: amount * 100, ... };
```

No lookup of canonical price from database. No user plan discount verification.

**Attack Scenario:**
1. User selects celebrity booking Rs. 10,000
2. Opens browser DevTools → Network tab
3. Modifies amount in next request from Rs. 11,000 to Rs. 100
4. Pays Rs. 100
5. HMAC verification passes (only validates order ID + payment ID, not amount)
6. Booking recorded at Rs. 100
7. Celebrity receives Rs. 70 for Rs. 10,000 service

**Impact:** Complete price manipulation. Platform gives away services.

**Fix:** `create-razorpay-order` must:
1. Accept `celebrity_id`, `service_type`, `user_id` (NOT `amount`)
2. Look up celebrity base price from `celebrities` table
3. Look up user plan discount from `profiles` + `plans` table
4. Compute `finalPrice` server-side
5. Use computed price for Razorpay order
6. Ignore any client-supplied amount

```typescript
export const POST = async (req: Request) => {
  const { celebrity_id, service_type, user_id } = await req.json();
  
  // Look up price
  const { data: celebrity } = await supabase
    .from('celebrities')
    .select('base_price')
    .eq('id', celebrity_id)
    .single();
  
  // Look up discount
  const { data: profile } = await supabase
    .from('profiles')
    .select('plans(discount_percentage)')
    .eq('id', user_id)
    .single();
  
  // Compute server-side
  const discount = profile.plans?.discount_percentage || 0;
  const discountedPrice = celebrity.base_price * (1 - discount/100);
  const finalPrice = discountedPrice * 1.1; // platform fee
  
  // Create Razorpay order with computed price
  const order = await razorpay.orders.create({
    amount: Math.round(finalPrice * 100),
    currency: 'INR',
    ...
  });
};
```

---

## HIGH-1: Double TDS Deduction

**Files:** 
- `supabase/migrations/20251007171642_84f3418f-*.sql` — `calculate_booking_commission` trigger
- `supabase/migrations/20251008052425_542eaa91-*.sql` — duplicate TDS trigger

**Issue:** `calculate_booking_commission` (ON INSERT booking) computes TDS and deducts it from commission, then inserts into `celebrity_wallet_transactions` with the deducted amount. A second trigger `calculate_celebrity_commission_with_tds` (ON INSERT celebrity_wallet_transactions) applies TDS again.

**Impact on Rs. 10,000 booking, 70% commission, 10% TDS:**
- Expected net payout: Rs. 10,000 × 70% × (1 - 10%) = Rs. 6,300
- Actual net payout: Rs. 10,000 × 70% × (1 - 10%) × (1 - 10%) = Rs. 5,670
- Underpayment per booking: Rs. 630
- On 1000 bookings: Rs. 630,000 underpaid

**Fix:** Remove duplicate trigger:
```sql
DROP TRIGGER IF EXISTS trigger_calculate_tds ON celebrity_wallet_transactions;
DROP FUNCTION IF EXISTS calculate_celebrity_commission_with_tds();
```

---

## HIGH-2: Wallet Double-Approval Race Condition

**File:** `supabase/migrations/20251024015207_33023ed5-*.sql`

**Issue:** The `update_wallet_balance` trigger guards with `NEW.status = 'approved' AND OLD.status = 'pending'`. But if two concurrent admin UPDATE requests arrive before either commits, both read `OLD.status = 'pending'`, both pass guard, both credit wallet.

**Attack Scenario:**
1. User deposits Rs. 10,000 wallet_transaction
2. Admin clicks Approve button twice very quickly (or network retries request)
3. Both UPDATE transactions start concurrently
4. Both see `status = 'pending'`
5. Both pass trigger guard
6. Both fire `update_wallet_balance`
7. `profiles.wallet_balance` incremented twice
8. User now has Rs. 20,000 instead of Rs. 10,000

**Fix:** Admin approval query must include row lock:
```sql
UPDATE wallet_transactions 
SET status = 'approved', approved_at = now()
WHERE id = $1 AND status = 'pending'
RETURNING *;
```

Postgres row-level locking ensures only one UPDATE matches. Second UPDATE sees committed `approved` state and updates zero rows.

---

## Commission Math Inconsistency

**Frontend:** Platform takes 10% of discounted_price as fee
**Database:** Platform takes 30% of final_price (computed as final_price - 70% celebrity commission)

These don't align. On Rs. 10,000 service (no discount):
- Frontend implies: platform Rs. 1,000, celebrity Rs. 10,000, total Rs. 11,000
- Database computes: platform Rs. 3,300, celebrity Rs. 7,700, total Rs. 11,000

The split definition must be unified before launch.

---

## Wallet Atomicity Issue

**Issue:** Balance check in `handleWalletPayment` is a JavaScript comparison against cached React state value — not a live database read. Two concurrent sessions can both pass balance check and both debit.

**Example:**
- Available balance: Rs. 1,000
- Two concurrent payment requests: Rs. 800 each
- Both read React state: Rs. 1,000
- Both pass balance check
- Both insert into wallet_transactions
- After both complete: balance is Rs. -600

**Fix:** Implement debit as Postgres function with `SELECT FOR UPDATE`:
```sql
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID, 
  p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT wallet_balance INTO v_balance FROM profiles 
  WHERE id = p_user_id FOR UPDATE;
  
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  UPDATE profiles SET wallet_balance = wallet_balance - p_amount 
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

Also add constraint:
```sql
ALTER TABLE profiles 
ADD CONSTRAINT check_wallet_balance_positive CHECK (wallet_balance >= 0);
```

---

## Issue Summary Table

| ID | Severity | Issue | Impact | Status |
|---|---|---|---|---|
| CRITICAL-1 | CRITICAL | Razorpay payment replay / no idempotency | Unlimited duplicate commissions | UNRESOLVED |
| CRITICAL-2 | CRITICAL | Referral earnings never credited | 100% referral loss | UNRESOLVED |
| CRITICAL-3 | CRITICAL | Client-side price with no server validation | Unlimited price manipulation | UNRESOLVED |
| HIGH-1 | HIGH | Double TDS deduction | Rs. 630 underpaid per Rs. 10k booking | UNRESOLVED |
| HIGH-2 | HIGH | Wallet double-approval race | Balance duplication | UNRESOLVED |
| MEDIUM-1 | MEDIUM | Commission math inconsistency | Reconciliation fails | UNRESOLVED |
| MEDIUM-2 | MEDIUM | Wallet overdraft via concurrent requests | Negative balances possible | UNRESOLVED |

---

## Estimated Fix Time

- CRITICAL-1: 3 hours (1 SQL migration + function fix)
- CRITICAL-2: 4 hours (trigger rewrite + historical reconciliation script)
- CRITICAL-3: 6 hours (backend rewrite + frontend refactor)
- HIGH-1: 2 hours (drop duplicate trigger)
- HIGH-2: 2 hours (SQL query fix + testing)
- All other fixes: 6 hours

**Total: 23 hours**

---

## Deployment Gate: FAIL

All three CRITICAL issues must be resolved before any live transactions. This is non-negotiable. The platform currently leaks money through referrals, enables price fraud, and has payment duplication vulnerabilities.
