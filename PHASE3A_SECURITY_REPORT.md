# PHASE 3A — FRONTEND SECURITY AUDIT REPORT
**Project:** WishMe (wishme.today)
**Audit Date:** 2026-05-02
**Auditor:** Frontend Security Engineer
**Scope:** `src/` directory — React 18 + TypeScript + Vite + Supabase
**Deployment Gate:** FAIL — 3 CRITICAL issues must be resolved before production traffic

---

## Executive Summary

A full read of the live source tree was performed. Nine categories of security concern were investigated. Three issues are rated CRITICAL, two are HIGH, and two are MEDIUM. No XSS via `dangerouslySetInnerHTML` was found. No hardcoded secrets outside of the intentionally-public Supabase anon key and Razorpay key_id were found. An `<ErrorBoundary>` wrapper is confirmed present in `src/App.tsx` line 179. The three CRITICAL findings — PII leakage in console logs and two confirmed IDOR vulnerabilities — require immediate remediation.

---

## CRITICAL-1: PII Leakage via console.log

**Files and lines verified in source:**
- `src/hooks/useAuth.tsx` lines 282, 283, 296, 301, 320–325, 359
- `src/pages/Auth.tsx` lines 257, 262, 267, 269, 277, 289, 299

Every login attempt logs the user's email address, Supabase user ID, and session expiry to the browser console. These statements survive into the production bundle because `vite.config.ts` has no `esbuild.drop` configuration. A malicious browser extension that overrides `console.log` silently harvests every victim's email on login.

**Verified log content at `useAuth.tsx` line 283:**
```
console.log('[AUTH] Input:', { emailOrPhone, passwordLength: password?.length });
```
`emailOrPhone` is the raw email string the user typed.

**Verified log content at `useAuth.tsx` lines 320–325:**
```
console.log('[AUTH] Supabase auth SUCCESS:', {
  userId: data.user?.id,
  email: data.user?.email,
  emailConfirmed: data.user?.email_confirmed_at,
  sessionExpiry: data.session?.expires_at
});
```

**Fix:** Remove all PII-bearing `console.log` calls. Add to `vite.config.ts`:
```typescript
esbuild: {
  drop: mode === 'production' ? ['console', 'debugger'] : [],
},
```

---

## CRITICAL-2: IDOR — BookingSummary

**File:** `src/pages/BookingSummary.tsx` lines 34–38

```typescript
// VULNERABLE — no user_id filter
const { data: bookingData, error: bookingError } = await supabase
  .from('bookings')
  .select('*')
  .eq('id', bookingId)
  .single();
```

Any authenticated user can view any other user's booking by changing `bookingId` in the URL.

**Fix:** Add `.eq('user_id', user.id)` after `.eq('id', bookingId)`.

---

## CRITICAL-3: IDOR — WishConfirmation (plus unintended side effect)

**File:** `src/pages/WishConfirmation.tsx` lines 34–56

```typescript
// VULNERABLE — no user_id filter
const { data: orderData, error: orderError } = await supabase
  .from('wish_celebrity_orders')
  .select(`*, celebrities (id, name, image_url, category)`)
  .eq('id', orderId)
  .single();
```

After fetching, line 54 automatically calls `handleGenerateCard()` if `payment_status === 'completed'`. An attacker visiting `/wish-confirmation/<victim_uuid>` therefore reads the victim's personal message and triggers a server-side card regeneration on the victim's order.

**Fix:** Add `.eq('user_id', user.id)` after `.eq('id', orderId)`.

---

## HIGH-1: IDOR — PaymentReceipt

**File:** `src/pages/PaymentReceipt.tsx` lines 29–35

```typescript
// VULNERABLE — no user_id filter
const { data, error } = await supabase
  .from('payment_transactions')
  .select('*')
  .eq('wishme_payment_id', wishmePaymentId)
  .single();
```

**Fix:** Add `.eq('user_id', user.id)` after the `wishme_payment_id` filter.

---

## HIGH-2: Source Maps Not Explicitly Disabled / Console Not Stripped

**File:** `vite.config.ts` — no `build` key present

Vite's default `sourcemap: false` is currently safe, but the absence of explicit configuration means: (a) a future engineer could accidentally enable source maps in production, and (b) all `console.log` PII from CRITICAL-1 ships verbatim in the production bundle today.

**Fix:**
```typescript
build: { sourcemap: false },
esbuild: { drop: mode === 'production' ? ['console', 'debugger'] : [] },
```

---

## MEDIUM-1: localStorage for Order IDs

**File:** `src/pages/WishCelebrityOccasion.tsx` lines 139, 146, 170, 386, 471

Order IDs stored under `wishOrderId:<celebrityId>` in `localStorage` persist across sessions, are not cleared on sign-out, and are accessible to any JavaScript on the origin. Replace with `sessionStorage`.

---

## MEDIUM-2: Unvalidated ?redirect= Parameter

**File:** `src/pages/Auth.tsx` line 65

```typescript
const redirectTo = searchParams.get('redirect') || '/dashboard';
```

React Router's `navigate()` prevents external redirects today, but the lack of validation is a latent risk.

**Fix:**
```typescript
const raw = searchParams.get('redirect') || '/dashboard';
const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
```

---

## CLOSED FINDINGS (Verified Safe)

- **Dev tool routes** (`/admin/populate-celebrities`, `/admin/populate-indian-celebrities`, `/admin/generate-video-messages`) — confirmed nested under `<AdminLayout>` in `src/App.tsx` lines 241–243. `AdminLayout` enforces `role === 'admin'` check at `src/components/admin/AdminLayout.tsx` lines 14–26. CLOSED.
- **Error boundary** — `<ErrorBoundary>` confirmed at `src/App.tsx` line 179. CLOSED.

---

## Cross-Team Escalations

- **database-architect:** Verify RLS on `bookings`, `wish_celebrity_orders`, and `payment_transactions` enforces `user_id` ownership. Frontend fixes are necessary but not sufficient.
- **edge-function-engineer:** Verify `create-razorpay-order` looks up price from the DB rather than trusting the client-supplied amount. Verify `generate-wish-celebrity-card` validates caller ownership of `orderId`.

---

## Issue Summary

| # | Severity | Issue | File | Status |
|---|----------|-------|------|--------|
| 1 | CRITICAL | PII in console.log (email, userId, session) | useAuth.tsx, Auth.tsx | UNRESOLVED |
| 2 | CRITICAL | IDOR — BookingSummary (any booking viewable) | BookingSummary.tsx:34 | UNRESOLVED |
| 3 | CRITICAL | IDOR — WishConfirmation + side effect | WishConfirmation.tsx:34 | UNRESOLVED |
| 4 | HIGH | IDOR — PaymentReceipt | PaymentReceipt.tsx:29 | UNRESOLVED |
| 5 | HIGH | Source maps / console not stripped in production | vite.config.ts | UNRESOLVED |
| 6 | MEDIUM | localStorage stores order IDs across sessions | WishCelebrityOccasion.tsx | UNRESOLVED |
| 7 | MEDIUM | Unvalidated redirect parameter | Auth.tsx:65 | UNRESOLVED |
| 8 | CLOSED | Dev tools behind AdminLayout | App.tsx:241-243 | RESOLVED |
| 9 | CLOSED | ErrorBoundary present | App.tsx:179 | RESOLVED |

---

## Deployment Gate: FAIL

Fix CRITICAL-1, CRITICAL-2, CRITICAL-3, and HIGH-1 before any production traffic. All four require one-line or small changes to existing files. Confirm database-architect has RLS coverage on the three affected tables.
