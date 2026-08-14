# PHASE 3B — UX AUDIT REPORT
**Project:** WishMe (wishme.today)
**Audit Date:** 2026-05-02
**Auditor:** UX Specialist
**Scope:** src/pages/, src/components/admin/ — All user-facing and admin UI flows
**Deployment Gate:** FAIL — 3 CRITICAL features missing, 5 incomplete, 3 confusing flows

---

## Executive Summary

All findings were verified against actual source code — no assumptions made. Five critical features are entirely absent. Three directly block revenue. Eight flows are incomplete or confusing. The most severe finding is the complete absence of the /celebrity/:id/wish booking route, the admin video review tab, and the admin occasion videos management grid.

---

## MISSING Features (Block Production)

### MISSING-1: /celebrity/:id/wish Route and WishCelebrityBooking Component (CRITICAL)

**Verified:** `App.tsx` has no route matching `/celebrity/:id/wish`. No file named `WishCelebrityBooking.tsx` exists anywhere in `src/`. `App.tsx` line 213 registers `/celebrity/:id/book` (BookingDetail), not the wish flow. Any request to `/celebrity/:id/wish` hits the NotFound catch-all at line 270.

**User Impact:** Users cannot book via the merge pipeline. The entire wish booking flow — occasion_type dropdown from celebrity_occasion_videos, language filter, dynamic pricing, Razorpay — does not exist.

**Required component:** `src/pages/WishCelebrityBooking.tsx` with:
- Real-time occasion_type dropdown from `celebrity_occasion_videos` table
- Language filter based on selected occasion
- Dynamic price calculation (base_price + celebrity_fee)
- Zero-state message if celebrity has no occasion videos
- Razorpay integration for payment
- Loading, error, empty states

**Route to add in App.tsx:**
```tsx
<Route path="/celebrity/:id/wish" element={<WishCelebrityBooking />} />
```

**Estimated fix time:** 3–4 days

---

### MISSING-2: VideoPipelineTab — Admin Merge Video Review (CRITICAL)

**Verified:** Glob of `src/components/admin/` returned 6 files — `VideoPipelineTab.tsx` is not among them. Grep for `merge_review_status` across all of `src/` matched only `src/integrations/supabase/types.ts`, confirming the DB column exists but no UI reads it.

**User Impact:** Admins have no interface to review, approve, or reject merged videos before delivery. Admin approval is the final safety gate — without it, merged videos either never reach users or bypass review entirely.

**Required component:** `src/components/admin/VideoPipelineTab.tsx` showing:
- Bookings where `merge_status='completed'` AND `merge_review_status='pending'`
- Video player showing `final_merged_video_key` (B2 signed URL)
- "Approve & Deliver" button → calls `admin-approve-merged-video`, triggers `send-order-notification`
- "Reject" button → shows reason input + notes textarea → sets `merge_review_status='rejected'`
- Display `merge_review_notes` in rejection reason display

**Estimated fix time:** 2–3 days

---

### MISSING-3: OccasionVideosTab — 20×11 Celebrity Video Grid (CRITICAL)

**Verified:** Glob of `src/components/admin/` confirms `OccasionVideosTab.tsx` does not exist. Grep for "OccasionVideosTab" returns zero matches across all `src/` files.

**User Impact:** Admins cannot upload or manage occasion videos. The merge pipeline has no source material without this interface.

**Required component:** `src/components/admin/OccasionVideosTab.tsx` with:
- 20 occasions × 11 languages = 220 cells grid
- Each cell: green (video uploaded) or grey (empty)
- Click to upload, per-cell progress bar during upload
- "X of 220 uploaded" counter in header
- Mobile: horizontal scrollable, NOT responsive squares
- Celebrity selector or paginated view for multiple celebrities

**Estimated fix time:** 3–5 days

---

### MISSING-4: Pipeline Type Differentiation in BookingDetailsDialog (HIGH)

**Verified:** `BookingDetailsDialog.tsx` read in full (873 lines). The `BookingDetails` interface (lines 27–57) has no fields for `occasion_video_id`, `lipsync_provider`, `merge_status`, `final_merged_video_key`, or `merge_review_status`. The Video Pipeline section (lines 456–626) unconditionally renders HeyGen labels with no conditional branching.

**User Impact:** Admin cannot distinguish between HeyGen, Merge, and Sync.so pipeline bookings. All bookings show identical HeyGen UI regardless of actual pipeline type.

**Fix:** Add missing fields to interface and query; add conditional rendering:
- `occasion_video_id` present → Merge Pipeline (purple badge) + 4-stage progress bar
- `lipsync_provider='syncso'` → Sync.so section (teal badge)
- Default → HeyGen section (blue badge)

**Estimated fix time:** 1 day

---

### MISSING-5: CelebrityProfile "Book a Wish" Routes to Wrong URL (HIGH)

**Verified:** `CelebrityProfile.tsx` `handleBookNow` (lines 110–129) navigates to `/booking/${id}?service=${serviceType}` for wish bookings — the legacy multi-step flow — not to `/celebrity/:id/wish`. No button in `CelebrityProfile.tsx` targets the `/celebrity/:id/wish` path.

**User Impact:** Even if WishCelebrityBooking is built, users cannot reach it from the celebrity profile page.

**Fix:** In `handleBookNow` line 128, add branch:
```typescript
if (serviceType === 'wish') {
  navigate(`/celebrity/${id}/wish`);
  return;
}
```

**Estimated fix time:** 2 hours

---

## INCOMPLETE Features

### INCOMPLETE-1: CelebrityProfile Loading State Is a Blank White Page

**Verified:** `CelebrityProfile.tsx` lines 139–141: `if (loading) { return null; }`

**Fix:** Return a skeleton card layout instead of null.

---

### INCOMPLETE-2: AdminBookings Missing Date Range Filter, Sort Controls, and Pipeline Badge Column

**Verified:** `AdminBookings.tsx` filters section (lines 519–548) has only text search and status Select. No date range, no sort, no pipeline filter. Bookings table columns (lines 615–622) have no Pipeline column.

**Fix:** Add DateRangePicker, sort Select, Pipeline badge column, and pipeline type filter.

---

### INCOMPLETE-3: BookingDetailsDialog Has No Reject Action for Pending Bookings

**Verified:** Admin Controls (lines 790–815) shows Approve button for pending status only. No Reject or Cancel button. Edit button hidden for pending status (line 727).

**Fix:** Add Reject button alongside Approve; remove `booking.status !== "pending"` condition from Edit button guard.

---

### INCOMPLETE-4: Status Filter Breaks Across Admin Tabs

**Verified:** `filteredItems` memo (lines 437–450) applies `statusFilter` uniformly. The `ready_to_send` virtual status checks `generation_status` and `video_status`, which only exist on the bookings table. On other tabs it silently returns zero results.

**Fix:** Make the status filter tab-aware; reset options when `activeTab` changes.

---

### INCOMPLETE-5: UGC Video Upload Has No Size Validation and No Progress Bar

**Verified:** `AdminBookings.tsx` file input (lines 1499–1519) has no maxSize check. `handleLocalVideoUpload` (lines 367–413) shows only a `Loader2` spinner — no byte-level progress.

**Fix:** Validate file size before upload; wire a Progress bar to `XMLHttpRequest.onprogress`.

---

### INCOMPLETE-6: WishBooking.tsx Occasions List Is a Hardcoded Static Array

**Verified:** `WishBooking.tsx` lines 25–28 define a static `const occasions` array. No Supabase query is made.

**Fix:** Query `from('occasions').select('id, name').eq('is_active', true)` on mount; filter by `celebrity_occasion_videos` for selected celebrity.

---

## CONFUSING Flows

### CONFUSING-1: Two Parallel Wish Booking Flows at Different URLs

Paths: `/booking/:celebrityId?service=wish` (multi-step Booking.tsx) and `/wish-booking/:celebrityId` (single-page WishBooking.tsx). Same service, completely different UX, no user-facing indication they are equivalent.

**Fix:** Consolidate to one canonical flow at `/celebrity/:id/wish`. Redirect others.

---

### CONFUSING-2: After Subscribing, User Must Click "Book Now" a Second Time

**Verified:** `handleSubscriptionSuccess` (lines 131–137) calls `checkSubscription()` and shows a toast but does not resume the original booking navigation.

**Fix:** Store intended serviceType in a ref before opening subscription modal; navigate to booking URL inside `handleSubscriptionSuccess`.

---

### CONFUSING-3: Admin Edit Button Hidden for Pending Bookings

**Verified:** `BookingDetailsDialog.tsx` line 727: `{!editing && booking.status !== "pending" && ...}`. Edit is suppressed exactly when admins most need to add notes or set delivery dates.

**Fix:** Remove the `booking.status !== "pending"` condition.

---

## Implementation Priority

| Priority | Feature | Estimated Time |
|----------|---------|----------------|
| P0 | Create WishCelebrityBooking.tsx + route | 3–4 days |
| P0 | Create VideoPipelineTab.tsx | 2–3 days |
| P0 | Create OccasionVideosTab.tsx | 3–5 days |
| P1 | Fix BookingDetailsDialog pipeline differentiation | 1 day |
| P1 | Fix CelebrityProfile "Book a Wish" button | 2 hours |
| P1 | Fix CelebrityProfile loading skeleton | 2 hours |
| P2 | AdminBookings filters + pipeline badges | 4 hours |
| P2 | Add Reject button to BookingDetailsDialog | 2 hours |
| P2 | Fix WishBooking occasions to dynamic query | 3 hours |
| P3 | Fix subscription flow resumption | 2 hours |
| P3 | UGC upload size validation + progress | 3 hours |
| P3 | Consolidate duplicate wish booking flows | 1 day |

---

## Cross-Agent Handoffs

- **FOR edge-function-engineer:** MISSING-2 requires `admin-approve-merged-video` edge function to accept `{ bookingId, adminId }`, set `merge_review_status='approved'`, and trigger `send-order-notification` with type `merged_video_approved`.
- **FOR database-architect:** MISSING-4 requires admin RLS access on `occasion_video_id`, `lipsync_provider`, `merge_status`, `final_merged_video_key`, `merge_review_status` columns.
- **FOR edge-function-engineer:** INCOMPLETE-6 depends on occasions table having `is_active` boolean column.

---

## Deployment Gate: FAIL

Do not launch until MISSING-1, MISSING-2, and MISSING-3 are complete. These block the core product feature (celebrity video merge booking), the admin review gate, and the celebrity video management interface.
