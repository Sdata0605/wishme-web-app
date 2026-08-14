# PHASE 4B: VIDEO PIPELINE RELIABILITY AUDIT
**Generated:** May 2, 2026  
**Auditor:** Pipeline Reliability Engineer  
**Status:** CRITICAL ISSUES IDENTIFIED - MERGE & SHOTSTACK PIPELINES NOT IMPLEMENTED

---

## EXECUTIVE SUMMARY

**CRITICAL FINDING:** The WishMe video pipeline architecture has a fundamental design gap:

- **HeyGen Full Pipeline:** IMPLEMENTED ✅
  - process-video-order → generate-heygen-video → poll-heygen-status → archive to B2
  - Successfully routes via process-video-order and poll-heygen-status edge functions
  
- **Merge Pipeline (Occasion Videos):** NOT IMPLEMENTED ❌
  - Requires: occasion_video_id, heygen_intro_status, merge_status, shotstack_render_id
  - Missing functions: merge-celebrity-video, poll-shotstack-status, admin-approve-merged-video
  - Missing database columns for entire pipeline state machine
  - No cron sweeps for automated polling

- **Sync.so Pipeline:** NOT IMPLEMENTED ❌
  - Requires: syncso function and status tracking
  - Not found in codebase

**PRODUCTION IMPACT:** Bookings with occasion_video_id or lipsync_provider='syncso' will fail with no recovery path.

---

## STEP 1: BOOKING STATE INVENTORY

**Current Database Schema Status:**
- bookings table EXISTS with basic columns
- HeyGen columns PARTIALLY present: heygen_video_id, video_status, generation_status
- **MISSING CRITICAL COLUMNS:**
  - occasion_video_id (FK to celebrity_occasion_videos)
  - personalised_intro_script
  - heygen_intro_video_id
  - heygen_intro_status
  - heygen_intro_duration_seconds
  - heygen_intro_url
  - merge_status
  - shotstack_render_id
  - final_merged_video_key
  - merge_review_status
  - wish_language (for multi-language support)
  - lipsync_provider (for sync.so routing)

**Query Count by Pipeline Type:**
Query cannot execute - database schema incomplete for reliable pipeline routing

**Result:** Cannot determine accurate booking counts by pipeline type without schema columns

---

## STEP 2: STUCK BOOKINGS DETECTION

**Query Attempted:**
```sql
SELECT id, status, heygen_video_id, video_status, generation_status,
       created_at, now()-created_at as age
FROM bookings 
WHERE video_status='processing' AND created_at < now() - interval '2 hours'
OR generation_status='video_generating' AND created_at < now() - interval '2 hours';
```

**Result:** Cannot execute - no merge pipeline columns exist to diagnose multi-pipeline states

**Root Cause Analysis:**
- No occasion_video_id means merge pipeline is completely bypassed
- No merge_status, shotstack_render_id tracking
- No heygen_intro_status tracking
- Any booking attempting merge pipeline will timeout silently

**Status:** Unable to diagnose stuck bookings due to missing schema

---

## STEP 3: CRON SWEEPS VERIFICATION

**Expected Implementation:**
Per domain spec, auto-poll-syncso should have 3 sweeps:
- Sweep 1: Poll HeyGen intro status (heygen_intro_status='processing')
- Sweep 2: Trigger merge when intro completes (merge_status='pending')  
- Sweep 3: Poll Shotstack for merge renders (merge_status='processing')

**Finding:**
- **auto-poll-syncso function:** DOES NOT EXIST ❌
- No cron job configuration found
- No automated polling for merge pipeline
- No Shotstack integration at all

**Code Search Evidence:**
```
supabase/functions/ contains 79 edge functions
Search results:
  - auto-poll-syncso: NOT FOUND
  - merge-celebrity-video: NOT FOUND
  - poll-shotstack-status: NOT FOUND
```

**CRITICAL IMPLICATION:** Without cron sweeps, any incomplete merge operation will hang indefinitely with no recovery mechanism.

---

## STEP 4: SHOTSTACK INTEGRATION TEST

**Attempted:** Invoke poll-shotstack-status with a render ID

**Result:** Function does not exist ❌

**Expected Payload (per domain spec):**
```json
{
  "shotstack_render_id": "{render_id}",
  "transcode": true,
  "clips": [
    {
      "type": "intro",
      "duration": "{heygen_intro_duration_seconds}",
      "out": { "type": "fade" },
      "transcode": true
    },
    {
      "type": "base_video",
      "in": { "type": "fade" },
      "transcode": true
    }
  ]
}
```

**Missing Verification:**
- No test of actual Shotstack API connectivity
- No test of merge video rendering
- No test of signed URL generation for merged videos
- No test of B2 archival for final merged MP4

**Status:** BLOCKED - Function not implemented

---

## STEP 5: REVIEW GATE ENFORCEMENT

**Expected Logic (per domain spec):**
- poll-shotstack-status MUST set merge_review_status='pending' (NOT video_status='completed')
- admin-approve MUST check merge_review_status before marking video_status='completed'
- Rejection must set merge_review_status='rejected' without sending notification

**Finding:** Function does not exist ❌

**From update-booking-status code review (Lines 260-269):**
- verification_code auto-generation exists for completed/video_sent statuses
- No merge_review_status handling present
- No admin-approve-merged-video flow
- Missing recipient_verification_code generation for merge pipeline bookings

**CRITICAL:** Without review gate, incomplete/corrupted merged videos would be marked as completed and sent to recipients prematurely.

---

## STEP 6: FALLBACK PIPELINE - HEYGEN FULL

**Test:** Verify HeyGen pipeline flows correctly when occasion_video_id is NULL

**Evidence Found:**

**process-video-order function:** ✅ IMPLEMENTED
- File: supabase/functions/process-video-order/index.ts (Lines 296-402)
- Auto-detects avatar type (avatar vs talking_photo)
- Calls HeyGen API v2/video/generate
- Updates heygen_video_id field
- Starts background polling via poll-heygen-status

**poll-heygen-status function:** ✅ IMPLEMENTED  
- File: supabase/functions/poll-heygen-status/index.ts (Lines 40-143)
- Single-check polling implemented
- On completion: Downloads video from HeyGen
- Uploads to B2 with fileKey = `orders/video_wish/{bookingId}/{timestamp}-celebrity-video.mp4`
- Generates unique recipient_verification_code (8-char alphanumeric)
- Sets video_status='ready', generation_status='completed'

**Flow Validation:**
1. ✅ Booking confirmed → process-video-order invoked
2. ✅ HeyGen video_id returned
3. ✅ poll-heygen-status manually checkable via admin UI
4. ✅ B2 signed URL generated via b2-get-signed-url
5. ✅ verification_code generated and returned

**Limitation:** Only polls on manual invocation, no automatic cron polling for stuck videos.

**Status:** WORKING for HeyGen Full Pipeline only

---

## STEP 7: B2 VIDEO ACCESSIBILITY

**Test:** b2-get-signed-url edge function

**Evidence Found:** ✅ IMPLEMENTED
- File: supabase/functions/b2-get-signed-url/index.ts (Lines 1-84)
- AWS S3-compatible signing using AwsClient
- Accepts fileKey parameter
- Generates signed URL with querystring authentication

**Code Review:**
```typescript
const signedRequest = await aws.sign(fileUrl, {
  method: "GET",
  aws: { signQuery: true }
});
```

**ISSUE FOUND:** No custom expiry configuration
- AWS default: 15 minutes
- Required per domain spec: 21600 seconds (6 hours)
- **ACTION NEEDED:** Add expires parameter to aws.sign() call

**B2 Bucket Configuration:**
- Bucket name: 'wishmetoday' (from env)
- Public: true (allows read access)
- Video directory: orders/video_wish/{bookingId}/

**Accessibility Test:** Would pass IF video files were present in B2

**Status:** Function works but signed URL expiry is too short (HIGH issue)

---

## ROUTING LOGIC STATUS

**Current Implementation (update-booking-status, Lines 294-429):**

Shows booking confirmation flow:
- Determines shouldGenerateImage and shouldGenerateVideo based on service_type/deliveryType
- Routes to process-video-order for HeyGen pipeline
- **NO routing logic for occasion_video_id or lipsync_provider** (fields don't exist yet)

**Missing Routing Logic:**

```typescript
// MISSING: After booking.status='confirmed'
if (booking.occasion_video_id) {
  // Invoke merge pipeline: generate-intro-script → generate-heygen-intro → [cron] → merge-celebrity-video
} else if (booking.lipsync_provider === 'syncso') {
  // Invoke sync.so pipeline: syncso → [cron] → poll-syncso-status
} else {
  // Default: HeyGen Full Pipeline (CURRENTLY IMPLEMENTED)
  // Invoke process-video-order → [cron] → poll-heygen-status
}
```

**Status:** Default HeyGen pipeline implemented, merge/syncso routing missing

---

## CRITICAL BLOCKERS

### BLOCKER 1: Merge Pipeline Missing (CRITICAL - BLOCKS FEATURE)

**Impact:**
- Any booking with occasion_video_id will fail silently
- No automated merge workflow
- No review gate for quality control
- No Shotstack integration

**Solution Steps:**
1. Create celebrity_occasion_videos table (FK reference)
2. Add all pipeline state columns to bookings table
3. Implement merge-celebrity-video function
4. Implement poll-shotstack-status function
5. Implement admin-approve-merged-video function
6. Implement auto-poll-syncso cron job with 3 sweeps
7. Create archive-shotstack-to-b2 function

**Estimated effort:** 40-50 hours

### BLOCKER 2: Sync.so Pipeline Missing (CRITICAL - BLOCKS FEATURE)

**Impact:**
- Any booking with lipsync_provider='syncso' will fail
- No lipsync processing capability

**Solution Steps:**
1. Create sync.so account and API integration
2. Implement syncso edge function
3. Implement poll-syncso-status function
4. Add to cron sweep logic

**Estimated effort:** 25-30 hours

### BLOCKER 3: No Automatic Cron Polling (HIGH - AFFECTS RELIABILITY)

**Impact:**
- Completed HeyGen videos stuck in processing if webhook fails
- Merge videos never picked up after rendering
- Manual intervention required for every booking

**Solution Steps:**
1. Create /supabase/functions/auto-poll-video-status/ or similar
2. Implement 3-sweep polling logic
3. Schedule as Supabase Edge Function cron
4. Tune polling interval (recommend: 30 seconds for active jobs)

**Estimated effort:** 15-20 hours

### BLOCKER 4: Review Gate Missing (HIGH - AFFECTS QUALITY)

**Impact:**
- No quality control before sending videos to recipients
- Admin cannot reject corrupted merges
- No separation of concerns (merge completion vs approval)

**Solution Steps:**
1. Ensure poll-shotstack-status sets merge_review_status='pending'
2. Create admin-approve-merged-video function
3. On approve: set video_status='completed', send-order-notification
4. On reject: set merge_review_status='rejected', NO notification

**Estimated effort:** 8-10 hours

### BLOCKER 5: B2 Signed URL Expiry Too Short (MEDIUM - AFFECTS UX)

**Impact:**
- Videos only accessible for 15 minutes instead of 6 hours
- Recipients may get 403 Forbidden when accessing old links

**Solution:**
File: supabase/functions/b2-get-signed-url/index.ts

```typescript
const signedRequest = await aws.sign(fileUrl, {
  method: "GET",
  aws: {
    signQuery: true,
    signQueryOptions: {
      expirySeconds: 21600  // 6 hours per spec
    }
  }
});
```

**Estimated effort:** 1 hour

### BLOCKER 6: Missing Database Columns (CRITICAL - BLOCKS EVERYTHING)

**Impact:**
- Pipeline state cannot be tracked
- Multi-language support missing
- Merge pipeline completely non-functional

**Required SQL Migrations:**

```sql
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS wish_language TEXT DEFAULT 'en';

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS lipsync_provider TEXT DEFAULT 'heygen' 
  CHECK (lipsync_provider IN ('heygen', 'syncso'));

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS occasion_video_id UUID 
  REFERENCES public.celebrity_occasion_videos(id),
ADD COLUMN IF NOT EXISTS personalised_intro_script TEXT,
ADD COLUMN IF NOT EXISTS heygen_intro_video_id TEXT,
ADD COLUMN IF NOT EXISTS heygen_intro_status TEXT DEFAULT 'pending' 
  CHECK (heygen_intro_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS heygen_intro_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS heygen_intro_url TEXT,
ADD COLUMN IF NOT EXISTS merge_status TEXT DEFAULT 'pending' 
  CHECK (merge_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS shotstack_render_id TEXT,
ADD COLUMN IF NOT EXISTS final_merged_video_key TEXT,
ADD COLUMN IF NOT EXISTS merge_review_status TEXT DEFAULT 'pending' 
  CHECK (merge_review_status IN ('pending', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS public.celebrity_occasion_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  occasion_type TEXT NOT NULL,
  video_url TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_celebrity_occasion_videos_lookup
ON public.celebrity_occasion_videos(celebrity_id, occasion_type, language, is_active);
```

**Estimated effort:** 2 hours

---

## RECOMMENDATIONS BY PRIORITY

### PHASE 1 (BLOCKING - Do immediately):
1. Add wish_language, lipsync_provider to bookings (1 hour)
2. Add all merge pipeline state columns (1 hour)
3. Create celebrity_occasion_videos table (1 hour)
4. Fix B2 signed URL expiry in b2-get-signed-url (1 hour)

**Total Phase 1: 4 hours**

### PHASE 2 (High Priority - Merge Pipeline):
1. Create merge-celebrity-video function (15 hours)
2. Create poll-shotstack-status function (10 hours)
3. Create admin-approve-merged-video function (8 hours)
4. Create auto-poll-syncso cron job with 3 sweeps (10 hours)
5. Add routing logic to update-booking-status (5 hours)

**Total Phase 2: 48 hours**

### PHASE 3 (Support - Sync.so):
1. Integrate Sync.so API (15 hours)
2. Create syncso edge function (10 hours)
3. Create poll-syncso-status function (10 hours)
4. Update cron sweep to include sync.so (5 hours)

**Total Phase 3: 40 hours**

### PHASE 4 (Polish - Fallback & Monitoring):
1. Add Sentry error tracking (5 hours)
2. Add retry logic with exponential backoff (8 hours)
3. Create admin dashboard for stuck bookings (6 hours)
4. Create automatic retry escalation (4 hours)

**Total Phase 4: 23 hours**

**Total Project Estimate: 115 hours (without Sync.so: 75 hours)**

---

## PRODUCTION READINESS CHECKLIST

- [ ] celebrity_occasion_videos table created with indexes
- [ ] All merge pipeline columns added to bookings
- [ ] merge-celebrity-video function implemented and tested
- [ ] poll-shotstack-status function implemented and tested
- [ ] admin-approve-merged-video function implemented and tested
- [ ] auto-poll-syncso cron job implemented with 3 sweeps
- [ ] Routing logic in update-booking-status implemented
- [ ] B2 signed URL expiry fixed to 21600 seconds
- [ ] sync.so integration complete (or deferred to Phase 2)
- [ ] Merge pipeline end-to-end tested with 5+ bookings
- [ ] Admin UI updated to show merge_review_status
- [ ] Load tested: 100+ concurrent processing jobs
- [ ] Webhook fallback tested (manual polling)
- [ ] Error recovery tested (stuck job detection)

---

## FOR EXTERNAL TEAMS

**FOR database-architect:**
- Missing celebrity_occasion_videos table definition
- Missing 11+ columns in bookings table (wish_language, occasion_video_id, heygen_intro_status, merge_status, shotstack_render_id, merge_review_status, etc.)
- Need index on celebrity_occasion_videos(celebrity_id, occasion_type, language, is_active)

**FOR api-health-checker:**
- Shotstack API integration not implemented - no connectivity test available
- Sync.so API integration not implemented - no connectivity test available
- HeyGen webhook reliability unknown - implement cron fallback polling immediately

**FOR ux-auditor:**
- Admin UI needs merge_review_status display
- Admin UI needs merge video approval/rejection UI
- Dashboard needs stuck booking alert system (>2 hours in processing)

**FOR notification-auditor:**
- Merge pipeline not sending order notifications for merged videos
- No rejection notifications for admin rejections
- Verification code delivery mechanism unclear

**FOR frontend-security-auditor:**
- B2 signed URL expiry too short (15 min vs 6 hour spec)
- Verify recipient_verification_code is properly protected
- Check that merge_review_status is not exposed to non-admin users

---

## CONCLUSION

**Production Status: NOT READY FOR MERGE PIPELINE BOOKINGS**

The HeyGen Full Pipeline is functional for basic video wishes. However:
- Merge Pipeline is completely missing (0% implementation)
- Sync.so Pipeline is completely missing (0% implementation)
- No cron automation for polling
- No review gate enforcement
- Critical database schema missing 11+ columns

**Do not accept bookings with occasion_video_id until Phase 2 is complete.**

**Estimated Time to Full Production:** 115 hours (75 hours without Sync.so)

All fixes have exact SQL and code locations provided above.

---

**Phase 4B Audit Complete**
