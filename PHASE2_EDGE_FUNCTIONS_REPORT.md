# PHASE 2 — EDGE FUNCTIONS AUDIT REPORT
**Project:** WishMe (wishme.today)
**Audit Date:** 2026-05-02
**Auditor:** Edge Function Engineer
**Scope:** supabase/functions/ — ~80 Deno TypeScript edge functions
**Deployment Gate:** FAIL — 4 CRITICAL issues must be resolved before production

---

## Executive Summary

80 edge functions were inventoried and categorized. 4 CRITICAL issues, 3 HIGH issues, 5 MEDIUM issues, and 3 LOW issues were found. The most severe finding is the complete absence of the 6-function merge pipeline, which blocks the core celebrity video merge feature. 18 functions use the wrong B2 authentication method (aws4fetch instead of B2's native API), breaking all video downloads and uploads. The automated cron polling system is entirely missing, meaning bookings get permanently stuck with no recovery path. Additionally, one admin endpoint is exposed without JWT verification.

---

## Function Inventory (80 Total)

### Video Pipeline (18 functions)
- process-video-order, poll-heygen-status, poll-heygen-status-batch, update-booking-video
- upload-ugc-video, process-ugc-video-id, verify-video-access, check-music-status
- elevenlabs-audio-isolation, elevenlabs-image-music-video, elevenlabs-sound-effects
- elevenlabs-speech-to-speech, elevenlabs-text-to-speech, save-music-to-b2
- heygen-webhook, vapi-upload-voice, b2-get-signed-url, b2-upload-media, b2-delete-media

### Payment (5 functions)
- create-razorpay-order, verify-razorpay-payment, create-wallet-transaction
- process-payout, admin-approve-payout

### Notification (8 functions)
- send-order-notification, send-email-otp, verify-email-otp
- send-unified-message, send-whatsapp-message, send-sms, send-email, process-scheduled-calls

### Auth / User (6 functions)
- create-profile, update-profile, get-profile, verify-phone-otp, send-phone-otp, check-referral

### Celebrity Management (8 functions)
- create-celebrity, update-celebrity, get-celebrity, manage-celebrity-videos
- populate-celebrities, populate-indian-celebrities, generate-video-messages, insert-sample-celebrity

### Admin (10 functions)
- admin-approve-booking, admin-reject-booking, admin-update-booking
- admin-approve-payout, admin-approve-wallet, manage-api-keys
- get-admin-stats, get-admin-bookings, get-admin-celebrities, get-admin-users

### Utility / Other (25 functions)
- Various utility, webhook, and integration functions

---

## CRITICAL ISSUES

### CRITICAL-1: Merge Pipeline Completely Missing (0% Implemented)

**Impact:** Any booking with occasion_video_id (celebrity has uploaded occasion videos) fails silently. The entire celebrity video merge feature — which is the core product differentiation — does not exist.

**Missing Functions (6):**

| Function | Purpose | Status |
|----------|---------|--------|
| `generate-intro-script` | Template-based script, 5-word hard cap, no AI call | MISSING |
| `generate-heygen-intro` | Submit celebrity intro to HeyGen API | MISSING |
| `merge-celebrity-video` | Shotstack merge with transcode:true on BOTH clips + fade transitions | MISSING |
| `poll-shotstack-status` | Poll Shotstack, set merge_review_status='pending' NOT video_status='completed' | MISSING |
| `archive-shotstack-to-b2` | Download from Shotstack CDN, upload to B2 | MISSING |
| `admin-approve-merged-video` | Admin approval gate; on approve → send-order-notification; on reject → merge_review_status='rejected' | MISSING |

**Required Database Columns (also missing):**
- bookings.occasion_video_id
- bookings.heygen_intro_status (pending/processing/completed/failed)
- bookings.merge_status (pending/processing/completed/failed)
- bookings.shotstack_render_id
- bookings.merge_review_status (pending/approved/rejected)
- bookings.merge_reviewed_at
- bookings.merge_reviewed_by
- bookings.merge_review_notes
- bookings.final_merged_video_key

**Estimated fix time:** 48–60 hours

---

### CRITICAL-2: B2 Authentication Bug in 18 Functions

**Impact:** All video uploads and downloads using these functions fail or produce incorrect signed URLs. Users cannot access their videos. Videos uploaded to B2 may not be accessible.

**Root Cause:** Functions use `aws4fetch` (AWS Signature Version 4), which is designed for Amazon S3. Backblaze B2 requires its own native authentication: `b2_authorize_account` → `b2_get_download_authorization`.

**Correct B2 URL format:**
```
{downloadUrl}/file/{bucketName}/{fileKey}?Authorization={authorizationToken}
```

**Correct expiry:** 21600 seconds (6 hours) — not 15 minutes

**Affected functions (18):**
b2-delete-media, b2-get-signed-url, b2-upload-media, check-music-status, elevenlabs-audio-isolation, elevenlabs-image-music-video, elevenlabs-sound-effects, elevenlabs-speech-to-speech, elevenlabs-text-to-speech, heygen-webhook, poll-heygen-status, poll-heygen-status-batch, process-ugc-video-id, save-music-to-b2, update-booking-video, upload-ugc-video, vapi-upload-voice, verify-video-access

**Estimated fix time:** 4–6 hours (shared utility module + update all callers)

---

### CRITICAL-3: Cron Automation Missing — auto-poll-syncso Does Not Exist

**Impact:** Bookings get permanently stuck in 'processing' states with no recovery. HeyGen videos that complete are never detected. Merge jobs that are ready are never triggered. Shotstack renders that finish are never archived. Users wait forever.

**Required cron sweeps (all missing):**
1. **HeyGen intro polling sweep** — find bookings with heygen_intro_status='processing', call HeyGen API, update status
2. **Merge trigger sweep** — find bookings with heygen_intro_status='completed' and merge_status=null, trigger merge-celebrity-video
3. **Shotstack polling sweep** — find bookings with merge_status='processing' and shotstack_render_id NOT NULL, call poll-shotstack-status

**Estimated fix time:** 15–20 hours

---

### CRITICAL-4: manage-api-keys Endpoint Unauthenticated

**File:** `supabase/functions/manage-api-keys/index.ts`
**Impact:** This admin endpoint manages API keys but has `verify_jwt=false` in config (or is missing from config, defaulting to unprotected). Any unauthenticated request can potentially read or modify API key configurations.

**Fix:** Add to supabase/config.toml:
```toml
[functions.manage-api-keys]
verify_jwt = true
```
And add admin role check inside the function.

**Estimated fix time:** 1 hour

---

## HIGH ISSUES

### HIGH-1: Payment Status Not Written to Booking

**File:** `supabase/functions/verify-razorpay-payment/index.ts`
**Issue:** After successful payment verification, the function creates a payment_transaction record but does not update the booking's payment_status field.
**Impact:** Bookings remain in payment_status='pending' even after successful payment. Admin sees no indication of payment.
**Fix:** After creating payment_transaction, update bookings.payment_status='completed'.

---

### HIGH-2: Razorpay Payment Idempotency Gap

**File:** `supabase/functions/verify-razorpay-payment/index.ts`
**Issue:** No SELECT before INSERT — same razorpay_payment_id can create multiple payment_transaction records.
**Impact:** Attacker retries payment verification → multiple commission calculations → inflated celebrity payouts.
**Fix:** 
```typescript
const { data: existing } = await supabase
  .from('payment_transactions')
  .select('id')
  .eq('razorpay_payment_id', razorpayPaymentId)
  .single();
if (existing) return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200 });
```

---

### HIGH-3: update-booking-video Bypasses Admin Approval Gate

**File:** `supabase/functions/update-booking-video/index.ts`
**Issue:** This function sets video_status='completed' and notifies the user directly, bypassing the admin merge review gate.
**Impact:** If called directly (e.g., via HeyGen webhook), videos are delivered to users without admin review.
**Fix:** For merge pipeline bookings, function should set merge_review_status='pending' instead of video_status='completed'.

---

## MEDIUM ISSUES

### MEDIUM-1: Config Coverage Gap — 57 of 80 Functions Unconfigured

**File:** `supabase/config.toml`
**Issue:** Only 23 functions appear in config.toml. 57 functions have no explicit verify_jwt setting.
**Impact:** Default behavior for unconfigured functions is verify_jwt=true, which is safe. But any function needing verify_jwt=false for webhooks must be explicitly configured.
**Functions requiring verify_jwt=false (must be in config):** heygen-webhook, vapi-webhook, process-scheduled-*

---

### MEDIUM-2: Serial API Call Timeout Risk

**File:** `supabase/functions/poll-heygen-status-batch/index.ts`
**Issue:** Processes all pending bookings serially in a single function invocation. If there are 50 stuck bookings, the function may time out (edge functions have a 60s default limit).
**Fix:** Process in parallel batches of 10, or implement a queue-based approach.

---

### MEDIUM-3: Unbounded Verification Code Loop

**File:** `supabase/functions/process-video-order/index.ts`
**Issue:** Verification code generation uses a `while(true)` loop without a maximum iteration count.
**Fix:** Add a max retry count (e.g., 10 iterations) and throw if exceeded.

---

### MEDIUM-4: Hardcoded API URLs

**Multiple functions**
**Issue:** HeyGen and other API base URLs hardcoded as string literals instead of using environment variables or constants.
**Fix:** Extract to a shared constants file.

---

### MEDIUM-5: Missing Error Logging Before Returns

**Multiple functions**
**Issue:** Several functions return error responses without logging the error first, making debugging impossible from Supabase logs.
**Fix:** Add `console.error(error)` before every error response.

---

## LOW ISSUES

### LOW-1: Deno std Version Inconsistency
Multiple functions import from different versions of Deno std library. Standardize on one version.

### LOW-2: Wrong HTTP Status on Signature Failure
`verify-razorpay-payment` returns 400 on HMAC mismatch. Should return 401 (Unauthorized).

### LOW-3: AI Quota Abuse Risk
`generate-video-messages` (admin tool) has no rate limiting. Could be called in a loop to exhaust AI API quota.

---

## Per-Category Status

| Category | Count | Status |
|----------|-------|--------|
| Video Pipeline | 18 | BROKEN (B2 auth bug affects all) |
| Merge Pipeline | 6 | MISSING (0% implemented) |
| Payment | 5 | WARNING (idempotency gap) |
| Notification | 8 | OK |
| Auth / User | 6 | OK |
| Celebrity Management | 8 | WARNING (no rate limiting) |
| Admin | 10 | BROKEN (manage-api-keys unprotected) |
| Cron | 1 | MISSING |

---

## Priority Fix Order

| Priority | Issue | Est. Time |
|----------|-------|-----------|
| P0 | Fix B2 authentication in 18 functions | 4–6 hours |
| P0 | Implement merge pipeline (6 functions) | 48–60 hours |
| P0 | Implement auto-poll-syncso cron | 15–20 hours |
| P1 | Protect manage-api-keys | 1 hour |
| P1 | Add payment idempotency guard | 2 hours |
| P1 | Fix update-booking-video approval bypass | 2 hours |
| P2 | Complete supabase/config.toml coverage | 2 hours |
| P2 | Fix serial timeout risk in batch polling | 3 hours |

**Total estimated: 77–96 hours**

---

## Cross-Agent Notes

- **FOR database-architect:** Add UNIQUE constraint on payment_transactions.razorpay_payment_id. Add 9 missing columns to bookings table for merge pipeline.
- **FOR api-health-checker:** Verify SHOTSTACK_API_KEY and SHOTSTACK_USE_SANDBOX secrets exist in Supabase.
- **FOR notification-auditor:** send-order-notification must only be called from admin-approve-merged-video on approval, not from update-booking-video.
- **FOR frontend-security-auditor:** VideoPipelineTab admin component needed for merge review workflow.

---

## Deployment Gate: FAIL

Do not launch until CRITICAL-1 (merge pipeline), CRITICAL-2 (B2 auth), and CRITICAL-3 (cron automation) are resolved. These block the core product functionality.
