# Celebrity Wish Video — Build Plan

The pipeline you described already exists end-to-end (`celebrity_occasion_videos` table → `generate-heygen-intro` → `poll-heygen-intro-status` → `merge-celebrity-video` → `poll-shotstack-status` → `archive-shotstack-to-b2`, with `OccasionVideosTab` admin UI). We just verified it produces a final merged MP4. We will extend it (not duplicate it) to match your exact spec.

## What changes vs what stays

**Stays exactly as-is:** Shotstack merge logic, B2 native upload helper, signed URL function, archive-to-B2 background, all other services, payments, wallet, notifications, auth, RLS.

**Changes:** add `language` to occasion videos, simplify the HeyGen script to "name only", add a 3-field booking page, add an admin video-review approval gate.

---

## 1. Database migration

`celebrity_occasion_videos`:
- Add `language text not null default 'english'`
- Drop existing single-column unique on `(celebrity_id, occasion_type)` if present, replace with `UNIQUE (celebrity_id, occasion_type, language)`
- Index `(celebrity_id, occasion_type, language, is_active)`
- Backfill existing rows with `language='english'`

`bookings` (all nullable):
- `recipient_name text` — already exists, keep
- `wish_language text` — new
- `merge_review_status text default 'pending'` — new (`pending` | `approved` | `rejected`)
- `merge_reviewed_at timestamptz`, `merge_reviewed_by uuid`, `merge_review_notes text`

No other schema changes. `occasion_video_id`, `heygen_intro_url`, `heygen_intro_duration_seconds`, `merge_status`, `shotstack_render_id`, `final_merged_video_key`, `recipient_verification_code` are all already in place.

## 2. Admin UI — `OccasionVideosTab`

Convert the current flat list into the **occasion × language grid** you described.

- Rows: 20 occasions (Birthday, Anniversary, New Year, Diwali, Holi, Eid, Christmas, Navratri, Dussehra, Raksha Bandhan, Onam, Pongal, Ganesh Chaturthi, Graduation, Wedding, Baby Shower, Promotion, Get Well Soon, Farewell, General Wish)
- Columns: 11 languages (English, Hindi, Hinglish, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi)
- Cell = green ✓ (uploaded, click to preview/replace/delete) or grey – (click to upload)
- Upload dialog: file (mp4), opening pause seconds (default 2.5), real upload progress
- Header: "X of 220 combinations uploaded"
- Above grid: collapsible "Recording instructions" panel with the brief from your spec

Add a small **HeyGen Configuration** section at the top (Avatar ID + Voice ID inputs) with green/amber status badge. Saves to `celebrities.heygen_avatar_id` / `heygen_voice_id`.

Reuse `b2-upload-occasion-video` (already streams via FormData) — just pass `language` in the form data and include it in the DB upsert.

## 3. User booking page — new route `/celebrity/:id/wish`

New file `src/pages/WishCelebrityBooking.tsx`. 3 fields only:

1. **Recipient name** — text, max 50 chars, required
2. **Occasion** — dropdown, only shows occasions where this celebrity has at least one uploaded language
3. **Language** — dropdown, dynamically filtered to languages available for the selected occasion; auto-selects if only one

Below: price + "Book Now" CTA → existing Razorpay flow → creates a `bookings` row with `service_type='video_wish'`, `recipient_name`, `wish_language`, and the matched `occasion_video_id` resolved client-side at submit.

Add a **"Book a Wish"** button on `CelebrityProfile.tsx` that links to this route. No other booking flows touched.

## 4. Edge function changes

**`generate-intro-script`** — change the prompt so the output is just a short name greeting in the booking's `wish_language` (e.g. English → "Hey Tharun…", Hindi → "Arre Tharun yaar…"). Hard-cap to 5 words. Map of greeting templates per language lives in this function.

**`generate-heygen-intro`** — already pulls celebrity's `heygen_avatar_id` and HeyGen voice. No structural change; it will now generate a 1-3s clip because the script is shorter.

**`update-booking-status` routing (lines 430-490)** — change the `celebrity_occasion_videos` lookup to also match `language`:
```
.ilike('occasion_type', normalisedOccasion)
.ilike('language', normalisedLanguage)
```
Source `normalisedLanguage` from `bookings.wish_language` first, then fall back to message JSON, then `'english'`.

**`poll-shotstack-status`** — change the post-merge update so it sets `merge_status='completed'` and `merge_review_status='pending'` but does **not** flip `video_status`/`generation_status` to `completed`. Do not call `send-order-notification` yet. The video is now in admin review, not delivered.

**New: `admin-approve-merged-video`** — admin-only edge function. Input `{ bookingId, decision: 'approved'|'rejected', notes? }`.
- On approve: set `merge_review_status='approved'`, `video_status='completed'`, `generation_status='completed'`, `completed_at=now()`, then invoke `send-order-notification` for the video-ready event (existing function).
- On reject: set `merge_review_status='rejected'` + notes. Admin can re-trigger merge.

## 5. Admin video review UI

Extend `VideoPipelineTab.tsx` (or `AdminWishOrders.tsx`) with a "Pending Review" section listing bookings where `merge_status='completed'` AND `merge_review_status='pending'`. Each row shows the merged video (B2 signed URL via `B2VideoPlayer`), plus Approve / Reject buttons calling the new edge function.

## 6. Cron — no change needed

`auto-poll-syncso` already polls `merge_status='processing'` shotstack renders. Once `poll-shotstack-status` flips merge_status to `completed`, it stops polling and waits for human review.

---

## Technical notes

- Greeting templates per language live in `generate-intro-script` only; no client-side duplication.
- The merge function's Shotstack timeline (intro fade-out + original fade-in cross-fade at the splice) stays exactly as it is — that's what makes the join invisible.
- HeyGen voice/avatar IDs are still validated by the existing `heygen_avatar_id` check (memory: HeyGen Asset Types).
- All new RLS: `celebrity_occasion_videos` SELECT for authenticated, full access via `is_admin_by_auth_uid` (consistent with project's RLS recursion architecture).
- Admin review screen reuses `B2VideoPlayer` so signed URLs and CORS work out of the box.

## Files touched

**New:**
- `src/pages/WishCelebrityBooking.tsx`
- `supabase/functions/admin-approve-merged-video/index.ts`
- one migration

**Modified:**
- `src/components/admin/OccasionVideosTab.tsx` (grid + HeyGen config + language)
- `src/components/admin/VideoPipelineTab.tsx` (review queue)
- `src/components/admin/CelebrityFullEdit.tsx` (no-op if tab already mounted)
- `src/pages/CelebrityProfile.tsx` ("Book a Wish" CTA only)
- `src/App.tsx` (one new route)
- `supabase/functions/b2-upload-occasion-video/index.ts` (accept `language`)
- `supabase/functions/generate-intro-script/index.ts` (name-only greeting)
- `supabase/functions/update-booking-status/index.ts` (lookup adds language)
- `supabase/functions/poll-shotstack-status/index.ts` (gate on review instead of auto-deliver)

**Untouched:** every other service, payment, wallet, notification, auth, every other admin page, every other edge function.



You are working on **WishMe** (wishme.today) — an Indian celebrity engagement 
platform. Before touching any code, internalize everything below as your 
single source of truth.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 1. PROJECT IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- App name: WishMe
- Live URL: https://wishme.today
- Lovable URL: https://wishmefinal.lovable.app
- Supabase project ref: eqikeuqwbphwongtfzhe
- Supabase URL: https://eqikeuqwbphwongtfzhe.supabase.co
- Primary media bucket: Backblaze B2 → bucket name: wishmetoday
- Payment ID format: WM + YYMM + 5 alphanumeric chars (e.g., WM2503A7K3P)
  — generated in verify-razorpay-payment edge function
  — stored in payment_transactions.wishme_payment_id (UNIQUE)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2. TECH STACK (read every file through this lens)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend:
  - React 18 + TypeScript + Vite (SPA, no SSR)
  - Tailwind CSS + shadcn/ui + Radix UI primitives
  - React Router v6 (all routes in src/App.tsx)
  - React Query (QueryClient, stale: 5min, GC: 10min, retry: 1)
    configured with refetchOnMount: false (intentional, can show stale data)
  - React Context for: Auth (AuthProvider), Theme (ThemeProvider),
    AI Assistant (AIAssistantProvider)
  - Lazy loading on all page-level components via React.lazy()

Backend (all Supabase):
  - PostgreSQL database (53+ tables, see Section 7)
  - Supabase Auth (email/password + Google OAuth + custom OTP)
  - Supabase Edge Functions (82 functions, Deno runtime)
  - Supabase Realtime (used for live chat in /messages)
  - Supabase Storage (user uploads — avatars, consent media)
  - Row Level Security enforced on all sensitive tables
  - DB triggers handle: wallet balance, referral commissions,
    TDS calculations, notification dispatch, auto-reply

File Storage:
  - Backblaze B2: all generated media (videos, music, cards, images)
    accessed via signed URLs from b2-get-signed-url edge function
  - Supabase Storage: user-uploaded files (profile photos, consent)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3. AUTHENTICATION & ROLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Auth flows:
  1. Email/Password: 2-step — fill form → OTP sent via send-email-otp
     edge fn → verify via verify-email-otp → profile auto-created
     by DB trigger on auth.users insert
  2. Google OAuth: via Supabase Auth, profile auto-created same way
  3. Password Reset: Supabase resetPasswordForEmail → /reset-password page
  4. Session: stored in localStorage, autoRefreshToken: true,
     onAuthStateChange listener in AuthProvider

Dual role system (IMPORTANT — both must be consistent):
  - profiles.role: enum user_role ('user' | 'celebrity' | 'admin')
  - user_roles table: enum app_role ('admin'|'moderator'|'user'|'celebrity')

SECURITY DEFINER functions (prevent RLS recursion):
  - is_admin_by_auth_uid() → checks user_roles table, returns boolean
  - get_my_profile_id() → maps auth.uid() → profiles.id

Route guards:
  - <ProtectedRoute> wraps all auth-required pages → redirects to /auth
  - <AdminLayout> checks profile.role === 'admin' client-side
    (server-side enforced by RLS — client check is UX only)
  - Celebrity dashboard checks for record in celebrities table
    where profile_id = current profile id

Plans (user_plan enum): basic | premium | elite
  - Stored in profiles.plan
  - Affect: service_discount_percentage, referral_commission_l1/l2
  - Plan details in plans table (features JSON array)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 4. ALL ROUTES (65+ pages)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PUBLIC (no auth):
  /                         → Index (homepage)
  /celebrities              → Celebrities (browse/search)
  /celebrity/:id            → CelebrityProfile
  /how-it-works             → HowItWorks
  /pricing                  → Pricing (Basic/Premium/Elite plans)
  /auth                     → Auth (sign in / sign up / forgot password)
  /reset-password           → ResetPassword
  /celebrity-signup         → CelebritySignup (application form)
  /privacy-policy           → PrivacyPolicy
  /terms                    → TermsOfService
  /celebrity-agreement      → CelebrityAgreement
  /refund-policy            → RefundPolicy
  /support                  → Support
  /referral-program         → ReferralProgram
  /order/:bookingId/view    → OrderVideoView (recipient portal, 
                              protected by recipient_verification_code)
  /payment/:wishmePaymentId → PaymentReceipt (universal receipt)
  /business                 → Business (landing)

AUTHENTICATED USER:
  /dashboard                → Dashboard (stats, recent bookings)
  /profile                  → Profile (edit profile, PAN, Aadhaar, bank)
  /settings                 → Settings
  /plan                     → Plan (upgrade plan)
  /booking/:celebrityId     → Booking (6-step wizard)
  /bookings                 → Bookings (history)
  /booking-summary          → BookingSummary
  /wallet                   → Wallet (balance, top-up, history)
  /commission               → Commission (referral dashboard)
  /referrals                → Referrals (tracking)
  /following                → Following (subscribed celebrities)
  /messages                 → Messages (fan-celebrity chat)
  /occasions                → Occasions (browse)
  /occasions/:id/book       → OccasionBooking
  /occasion-wishes          → OccasionWishes
  /occasion-alerts          → OccasionAlerts (reminders)
  /loved-ones               → LovedOnes (contact management)
  /wish-celebrity           → WishACelebrity (browse to send wishes)
  /wish-booking/:celebrityId → WishBooking
  /wish-confirmation/:orderId → WishConfirmation
  /wish-congratulations     → WishCongratulations
  /wish-orders              → WishOrders (history)
  /occasions/wish-celebrity/:celebrityId → WishCelebrityOccasion
  /greeting-cards           → GreetingCards (AI card generator)
  /image-promotions         → ImagePromotions
  /ai-music                 → AIMusic (landing)
  /music-studio             → MusicStudio (ElevenLabs full studio)
  /ai-music-creation        → AIMusicCreation
  /my-music                 → MyMusic (library)
  /ugc-videos               → UGCVideos
  /ugc-ads                  → UGCAds
  /photo-wish               → PhotoWish
  /voice-call-wish          → VoiceCallWish
  /celebrity-voice-call     → CelebrityVoiceCall

CELEBRITY DASHBOARD:
  /celebrity-dashboard      → CelebrityDashboard (10 tabs — see below)
  /celebrity-notifications  → CelebrityNotifications
  /celebrity-settings       → CelebritySettings
  /celebrity-wishes         → CelebrityWishes

  Celebrity dashboard 10 tabs:
    1. Content    — manage media uploads (photo/video/audio)
    2. Wallet     — earnings, payout requests, TDS breakdown
    3. Messages   — fan conversations + AI auto-reply toggle
    4. Events     — manage public events (celebrity_events table)
    5. Consent    — photo/video consent capture (getUserMedia API)
    6. Bookings   — incoming booking management
    7. Reviews    — fan reviews and ratings
    8. Followers  — subscriber list (celebrity_favorites)
    9. TDS        — tax deduction reports (10% w/ PAN, 20% without)
    10. Profile   — edit celebrity profile

ADMIN (role=admin required, 22 sub-pages):
  /admin                         → AdminOverview
  /admin/users                   → AdminUsers
  /admin/celebrities             → AdminCelebrities
  /admin/celebrity-categories    → AdminCelebrityCategories
  /admin/celebrities/:id/edit    → AdminCelebrityEdit
  /admin/plans                   → AdminPlans
  /admin/bookings                → AdminBookings
  /admin/occasions               → AdminOccasions
  /admin/analytics               → AdminAnalytics
  /admin/tds-reports             → AdminTDSReports
  /admin/settings                → AdminSettings
  /admin/wallet                  → AdminWalletManagement
  /admin/subscriptions           → AdminSubscriptions
  /admin/wish-orders             → AdminWishOrders
  /admin/media-library           → AdminMediaLibrary (B2)
  /admin/banner-media-library    → AdminBannerMediaLibrary
  /admin/communication-hub       → AdminCommunicationHub
                                   (53+ events, per-channel toggles)
  /admin/api-health              → AdminApiHealth
  /admin/audit-log               → AdminAuditLog
  /admin/database-backup         → AdminDatabaseBackup

DEV TOOLS (exposed in production — known issue):
  /populate-celebrities          → PopulateCelebrities
  /populate-indian-celebrities   → PopulateIndianCelebrities
  /generate-video-messages       → GenerateVideoMessages
  /mobile-app-builder            → MobileAppBuilder (incomplete)
  /business-campaigns            → BusinessCampaigns (incomplete)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 5. CORE FEATURE FLOWS (memorize these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### FLOW 1: Celebrity Video Booking (primary revenue flow)
Step 1: User visits /celebrities → selects celebrity → /celebrity/:id
Step 2: Must have active celebrity_favorites record (paid subscription)
        — checked via purchase_celebrity_subscription RPC
Step 3: Enters /booking/:celebrityId — 6-step wizard:
  Step 1 of 6: Request Details (recipient name, language, relationship)
  Step 2 of 6: Delivery Type — video | card | both
               (pricing from delivery_type_pricing table)
  Step 3 of 6: Creative Guidelines (goal, tone, special instructions)
  Step 4 of 6: Script Builder — manual text OR AI via generate-script
               edge fn (calls Lovable AI Gateway → Gemini)
  Step 5 of 6: Review — price = base celebrity price
               - plan discount % (from plans.service_discount_percentage)
               + 10% platform fee
  Step 6 of 6: Checkout — wallet debit OR Razorpay
Step 4: On payment:
  - INSERT into bookings (status='pending')
  - INSERT into payment_transactions (wishme_payment_id generated)
  - DB trigger: notify_booking_status_change fires
    → calls send-wishme-notification edge fn
    → events: booking_placed_user, booking_placed_celebrity,
              booking_placed_admin
Step 5: Admin goes to /admin/bookings → approves booking
  - UPDATE bookings.status = 'confirmed'
  - DB trigger: calculate_booking_commission fires
    → INSERT into celebrity_wallet_transactions
      (gross_amount, tds_amount @ 10% w/ PAN or 20% without, net amount)
    → UPDATE celebrities.total_earnings + available_balance
  - DB trigger: process_referral_commissions fires
    → INSERT into referral_transactions (level 1 + level 2)
    → INSERT into wallet_transactions for each referrer
    → UPDATE profiles.wallet_balance via update_wallet_balance trigger
  - update-booking-status edge fn called → triggers process-video-order
Step 6: process-video-order edge fn:
  - Fetches celebrity.heygen_avatar_id + heygen_voice_id
  - Calls HeyGen API to generate video
  - Stores heygen_video_id in bookings
  - Polls via poll-heygen-status until complete
Step 7: On HeyGen completion:
  - Video uploaded to Backblaze B2
  - UPDATE bookings: video_url, video_file_key, video_status='completed'
    generation_status='completed', completed_at
  - Notification: booking_completed_user (Email + SMS + WhatsApp)
Step 8: Recipient accesses /order/:bookingId/view
  - Must enter recipient_verification_code
  - verify-video-access edge fn validates code
  - B2 signed URL fetched via b2-get-signed-url
  - UPDATE bookings: recipient_video_accessed=true,
                     recipient_video_accessed_at=now()

### FLOW 2: Wish a Celebrity (fan → celebrity wish)
Step 1: User goes to /wish-celebrity → selects celebrity
Step 2: At /wish-booking/:celebrityId:
  - Selects occasion type, writes personal message
  - Optional: AI card prompt for generated image
  - Pays via wallet or Razorpay
Step 3: INSERT into wish_celebrity_orders
Step 4: generate-wish-celebrity-card edge fn:
  - Calls Lovable AI Gateway (Gemini) to generate greeting card image
  - Uploads to B2
  - UPDATE wish_celebrity_orders.generated_card_image_url
Step 5: send-wish-to-celebrity edge fn:
  - Creates or finds conversation in conversations table
  - INSERT into messages (sender_type='user', is_ai_generated=false)
  - Celebrity sees it in /celebrity-dashboard → Messages tab
Step 6: send-wish-thankyou-dm edge fn:
  - INSERT into messages (sender_type='celebrity', is_ai_generated=true)
  - Auto thank-you DM sent back to user

### FLOW 3: Fan-Celebrity Messaging (AI auto-reply)
Step 1: User must have active celebrity_favorites subscription
Step 2: Goes to /messages, selects or creates conversation
        (conversations table: one row per user+celebrity pair)
Step 3: User sends message → INSERT into messages
        (conversation_message_number auto-incremented)
Step 4: DB trigger handle_auto_reply_on_message fires
        → checks celebrity_settings.ai_auto_reply_enabled = true
        → checks conversation.message_count < limit (default 200)
          enforced by check_conversation_limit trigger
        → calls celebrity-conversation-auto-reply edge fn
Step 5: celebrity-conversation-auto-reply calls celebrity-ai-message:
        - Fetches celebrity bio, recent messages for context
        - Calls Lovable AI Gateway (Gemini)
        - Returns AI-generated reply text
Step 6: INSERT into messages:
        (sender_type='celebrity', sender_id=celebrity.profile_id,
         is_ai_generated=true)
Step 7: Supabase Realtime pushes new message to user's UI
        (useMessages hook subscribes to messages channel)
Step 8: UPDATE conversations: unread_count_user++, last_message_at

### FLOW 4: AI Music Generation
Step 1: User goes to /music-studio
Step 2: Enters: song title, genre, mood, optional lyrics, prompt
Step 3: System checks user_music_credits:
        - free_generations_used < free_generations_limit (default 3) → free
        - Otherwise: debit wallet (via wallet_transactions) or Razorpay
Step 4: generate-music or elevenlabs-generate-music edge fn:
        - Calls ElevenLabs Music Generation API
        - Returns api_task_id → stored in music_generations
        - Status polling via check-music-status
Step 5: On completion:
        - Audio URL received from ElevenLabs
        - save-music-to-b2 uploads to Backblaze B2
        - UPDATE music_generations: song_url, download_url,
          status='completed', completed_at
Step 6: User accesses music at /my-music
        - B2 signed URL for playback/download

### FLOW 5: Voice Call Wish (VAPI integration)
Step 1: User goes to /voice-call-wish → selects celebrity
Step 2: Fills: recipient name, recipient phone, occasion, 
        optional scheduled_at time
Step 3: Pays price_paid (voice_call_price from celebrities table,
        default 500 INR)
Step 4: INSERT into voice_call_wishes
Step 5: vapi-make-call edge fn:
        - Uses celebrity.vapi_voice_id + vapi_phone_id
        - Calls VAPI API to initiate outbound call
        - Stores vapi_call_id in voice_call_wishes
Step 6: vapi-webhook receives status updates:
        - call-started, call-ended, transcript-ready events
        - UPDATE voice_call_wishes: call_status, call_duration_seconds,
          call_transcript, disconnect_reason, webhook_payload

### FLOW 6: Greeting Card Generation
Step 1: User goes to /greeting-cards
Step 2: Fills: occasion name, recipient name, prompt text,
        optional reference image (upload/library/camera)
Step 3: Pays 2 credits (amount_charged=2) from wallet
Step 4: INSERT into greeting_card_generations (status='pending')
Step 5: generate-greeting-card-ai edge fn:
        - Optionally refines prompt via Gemini
          (prompt_refinement_used=true if used)
        - Calls image generation via Lovable AI Gateway
        - Returns generated_image_url
        - Uploads to B2
Step 6: UPDATE greeting_card_generations:
        generated_image_url, status='completed', completed_at
Step 7: DB trigger: process_greeting_card_referral_commission fires
        → Credits L1+L2 referrers if applicable

### FLOW 7: Referral Commission System
Structure: 2-level MLM
- L1: direct referrer (person who shared their referral_code)
- L2: referrer's referrer (grandparent)
Commission rates: stored in plans table per plan tier
  plans.referral_commission_l1 (percentage)
  plans.referral_commission_l2 (percentage)

Triggers that fire referral commissions:
  - process_referral_commissions → on bookings completion
  - process_plan_referral_commission → on plan upgrades
  - process_greeting_card_referral_commission → on card generation
  - process_music_generation_referral_commission → on music gen

Each trigger:
  1. Looks up profiles.referred_by (L1 referrer)
  2. Looks up L1's referred_by (L2 referrer)
  3. Calculates commission = order_amount * commission_percentage / 100
  4. INSERT into referral_transactions (commission_level=1 or 2)
  5. INSERT into wallet_transactions (transaction_type='referral_commission')
  6. UPDATE profiles.wallet_balance via update_wallet_balance trigger

### FLOW 8: Celebrity Subscription (celebrity_favorites)
Step 1: User clicks "Subscribe" on celebrity profile
Step 2: purchase_celebrity_subscription RPC called:
        - Reads price from celebrity_favorite_pricing table
        - Payment: wallet debit OR Razorpay
Step 3: INSERT into celebrity_favorites:
        (user_id, celebrity_id, price_paid, status='active',
         subscription_expires_at = now() + 30 days if applicable)
Step 4: Celebrity earns commission:
        INSERT into celebrity_wallet_transactions
        (transaction_type='favorite_subscription',
         amount = price * celebrity_commission_percentage / 100)
Step 5: Referrer earns commission:
        INSERT into referral_transactions
        (commission = price * referrer_commission_percentage / 100)
Step 6: send-celebrity-subscription-email edge fn fires
Step 7: User can now: message celebrity, book video, book UGC

### FLOW 9: Wallet Top-Up
Step 1: User goes to /wallet → clicks Add Money
Step 2: Chooses: UPI | Bank Transfer | Online (Razorpay)
Option A — Razorpay:
  - create-razorpay-order edge fn → Razorpay order created
  - Frontend Razorpay checkout opens
  - On success: verify-razorpay-payment edge fn:
    → Verifies HMAC-SHA256 signature
    → Generates wishme_payment_id
    → INSERT into payment_transactions
    → INSERT into wallet_transactions (status='completed')
    → UPDATE profiles.wallet_balance via trigger
Option B — Manual (UPI/Bank):
  - User uploads payment screenshot
  - INSERT into wallet_transactions (status='pending')
  - Admin reviews at /admin/wallet → approves/rejects
  - On approval: UPDATE status='approved'
  - UPDATE profiles.wallet_balance via update_wallet_balance trigger

### FLOW 10: UGC Ad / Video Generation
Step 1: User goes to /ugc-ads → fills product details:
        product_name, product_description, uploads product_image
        selects avatar, voice, aspect_ratio (9:16 default),
        hook_style, call_to_action
Step 2: INSERT into ugc_ads (status='pending')
Step 3: generate-ugc-ad edge fn:
        - Calls Gemini to generate script
        - Calls HeyGen API with avatar_id + voice_id + script
        - Stores heygen_video_id
        - Polls check-heygen-video-status
Step 4: On completion:
        - Video uploaded to B2
        - UPDATE ugc_ads: video_url, thumbnail_url,
          status='completed', completed_at
Step 5: Celebrity earns ugc_commission via celebrity_wallet_transactions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 6. COMPLETE DATABASE SCHEMA (53 tables)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENUMS:
  user_role: user | celebrity | admin
  app_role: admin | moderator | user | celebrity
  user_plan: basic | premium | elite
  booking_status: pending | confirmed | in_progress | completed |
                  cancelled | video_sent | failed
  service_type: video_wish | image_promotion | video_promotion
  music_generation_status: pending | processing | completed | failed
  music_generation_type: with_lyrics | instrumental | custom

KEY TABLES (memorize relationships):

profiles (central user table):
  id uuid PK | user_id uuid FK→auth.users (UNIQUE) | email text
  first_name | last_name | phone | role user_role | plan user_plan
  avatar_url | is_active bool | referral_code text UNIQUE
  referred_by uuid FK→profiles (self-referential for L1)
  wallet_balance int (auto-updated by trigger) | is_flagged bool
  pan_number | aadhaar_number | pan_verified bool | aadhaar_verified bool
  bank_account_number | bank_name | bank_ifsc | bank_account_holder_name
  pan_document_url | referral_url | profile_completion_percentage int
  referral_4day_reminder_sent bool

celebrities (celebrity profiles):
  id uuid PK | profile_id uuid FK→profiles (nullable, linked account)
  name | category | bio | location | rating numeric | review_count int
  image_url | promotional_image_url | video_thumbnail_url
  is_verified bool | is_active bool | delivery_time text
  commission_percentage int (default 70)
  service_prices jsonb: {general_wish:5000, text_message:2000,
                         image_promotion:25000, video_promotion:50000}
  heygen_avatar_id | heygen_voice_id | avatar_trained bool
  vapi_voice_id | vapi_phone_id | voice_call_price int (default 500)
  total_earnings int | available_balance int
  consent_photo_url | consent_video_url | consent_status | consent_given_at
  verification_status: pending|approved|rejected
  social_media jsonb | followers text | date_of_birth | anniversary_date
  webhook_url

bookings (core transaction table):
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  service_type service_type enum | status booking_status enum
  original_price int | discount_amount int | final_price int
  celebrity_commission int | platform_fee int | commission_percentage int
  delivery_type: video|card|both | message text | instructions text
  recipient_name | recipient_relationship | delivery_date
  script_content text | generated_prompt text
  heygen_video_id | video_url | card_url | video_file_key
  video_generation_method | video_status | generation_status
  generation_error | generation_started_at
  recipient_verification_code | recipient_video_accessed bool
  recipient_video_accessed_at | video_sent_at | video_sent_by FK→profiles
  admin_notes | processed_by FK→profiles | completed_at
  order_type: standard|express | wishme_payment_id
  celebrity_reminder_sent bool

celebrity_favorites (subscriptions):
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  price_paid int | referrer_commission int | celebrity_commission int
  status: active|cancelled | subscription_start_date
  subscription_expires_at | auto_renew bool
  payment_method: wallet|razorpay | cancelled_at

celebrity_favorite_pricing (per-celebrity subscription config):
  id uuid PK | celebrity_id FK→celebrities UNIQUE
  price int (default 999)
  referrer_commission_percentage int (default 10)
  celebrity_commission_percentage int (default 5)
  is_enabled bool

wallet_transactions (user wallet ledger):
  id uuid PK | user_id FK→profiles
  transaction_type: deposit|withdrawal|admin_credit|music_generation|
    music_download|greeting_card_generation|celebrity_subscription|
    ugc_video|image_promotion|booking|referral_commission|earning|
    favorite_subscription|photo_wish|celebrity_call|voice_call|
    plan_upgrade|service_payment|debit
  amount int (positive=credit, sign matters for balance calc)
  status: pending|approved|rejected|completed
  payment_method: upi|bank_transfer|online|admin|wallet|razorpay
  payment_screenshot_url | transaction_details jsonb | admin_note
  processed_by FK→profiles | processed_at | description

celebrity_wallet_transactions (celebrity earnings ledger):
  id uuid PK | celebrity_id FK→celebrities | booking_id FK→bookings
  transaction_type: earning|withdrawal|bonus|penalty|
    favorite_subscription|ugc_commission|image_promotion_commission|
    video_promotion_commission
  amount int | commission_percentage int | platform_fee int
  gross_amount int | tds_percentage int | tds_amount int
  status: pending|completed|failed | description

payment_transactions (universal payment ledger):
  id uuid PK | wishme_payment_id text UNIQUE
  razorpay_payment_id | razorpay_order_id
  booking_id | music_generation_id | voice_call_id | greeting_card_id
  photo_wish_id | image_promotion_id | wish_order_id
  user_id FK→profiles | amount int | currency (default INR)
  payment_method | status | service_type | description | paid_at

referral_transactions (referral commission ledger):
  id uuid PK | referrer_id FK→profiles | referred_id FK→profiles
  booking_id FK→bookings | commission_amount int
  commission_level int (1 or 2) | status | order_type

conversations (user-celebrity chat threads):
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  last_message_at | unread_count_user int | unread_count_celebrity int
  message_count int | is_closed bool | closed_reason | closed_at

messages (chat messages):
  id uuid PK | conversation_id FK→conversations
  sender_type: user|celebrity|system | sender_id FK→profiles
  message_text | is_ai_generated bool | is_read bool
  conversation_message_number int (auto-tracked by trigger)

music_generations (AI music orders):
  id uuid PK | user_id FK→profiles | song_title | genre | mood
  prompt | lyrics | song_url | download_url
  generation_type music_generation_type | status music_generation_status
  credits_used int | api_task_id | error_message | duration int
  price_paid int | wishme_payment_id | completed_at

greeting_card_generations:
  id uuid PK | user_id FK→profiles | original_prompt | refined_prompt
  prompt_refinement_used bool | reference_image_url | reference_image_source
  generated_image_url | occasion_name | recipient_name | greeting_text
  status: pending|processing|completed|failed | error_message
  saved_to_library bool | amount_charged int (default 2)
  wishme_payment_id | completed_at

wish_celebrity_orders (fan-to-celebrity wishes):
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  occasion_type | message | card_prompt | reference_image_url
  generated_card_text | generated_card_image_url | card_url
  card_generation_type: ai|manual | generation_attempts int (max 3)
  card_approved bool | greeting_text | user_uploaded_card_url
  user_uploaded_video_url | status: pending|generated|sent|failed
  payment_status | amount_paid int | payment_method
  razorpay_order_id | razorpay_payment_id | wishme_payment_id
  discount_percentage | discount_amount | recipient_name | completed_at

image_promotions:
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  concept | branding_details | generated_image_url
  status: pending|processing|completed|failed | price_paid int

ugc_ads:
  id uuid PK | user_id FK→auth.users (NOTE: auth.users, not profiles!)
  celebrity_id FK→celebrities | product_name | product_description
  product_image_url | script | video_url | thumbnail_url
  status: pending|pending_approval|script_generating|video_generating|
    video_processing|processing|completed|failed
  avatar_id | avatar_name | voice_id | heygen_video_id
  price_paid | aspect_ratio (default 9:16) | video_style (default ugc)
  hook_style | call_to_action | background_type | prompt
  admin_notes | completed_at

ugc_video_generations:
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  concept | script | video_url | thumbnail_url
  status: pending|processing|completed|failed | price_paid int
  heygen_video_id | ai_model (default gemini-2.5-flash)
  thumbnail_generated_by_ai bool | generation_metadata jsonb

voice_call_wishes:
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  recipient_name | recipient_phone | occasion | sender_name
  vapi_voice_id | vapi_voice_name | vapi_call_id
  call_status | call_duration_seconds | price_paid int (default 100)
  error_message | disconnect_reason | call_transcript
  webhook_payload jsonb | call_config jsonb | scheduled_at | completed_at

photo_wishes:
  id uuid PK | user_id FK→profiles | original_image_url
  edited_image_url | occasion | recipient_name | wish_message
  sender_name | text_style (default elegant) | amount_charged
  status | error_message | completed_at

occasion_alerts:
  id uuid PK | user_id FK→profiles | loved_one_id FK→loved_ones
  celebrity_id FK→celebrities | occasion_type | occasion_name
  occasion_date | alert_enabled bool | auto_send_enabled bool
  alert_days_before int (default 3) | reminder_time time (default 09:00)
  preferred_celebrity_id FK→celebrities | max_budget | message_template

loved_ones:
  id uuid PK | user_id FK→profiles | first_name | last_name
  email | phone | date_of_birth | relationship | notes
  import_source: manual|gmail|facebook|phonebook
  occasions jsonb array

celebrity_settings:
  id uuid PK | celebrity_id FK→celebrities UNIQUE
  email_notifications bool | booking_alerts bool | commission_alerts bool
  marketing_emails bool | auto_accept_bookings bool
  ai_auto_reply_enabled bool | auto_reply_enabled bool

celebrity_occasions:
  id uuid PK | celebrity_id FK→celebrities
  occasion_type: birthday|anniversary|custom | occasion_name
  occasion_date | auto_reply_enabled bool | auto_reply_template
  is_public bool

occasion_wishes:
  id uuid PK | user_id FK→profiles | celebrity_id FK→celebrities
  occasion_id FK→celebrity_occasions | message | reply_message
  reply_sent_at

celebrity_reviews:
  id uuid PK | celebrity_id FK→celebrities | booking_id FK→bookings
  user_id uuid | rating int (1-5) | review_text

celebrity_media:
  id uuid PK | celebrity_id FK→celebrities | title | description
  media_type: photo|video|audio | file_url | thumbnail_url
  is_avatar_content bool | is_promotional bool
  consent_recorded bool | consent_timestamp | is_public bool

celebrity_events:
  id uuid PK | celebrity_id FK→celebrities | title | description
  event_date | event_type: movie_release|award_show|concert|premiere|
    anniversary|birthday|other | location | is_public bool

payout_requests:
  id uuid PK | celebrity_id FK→celebrities | profile_id FK→profiles
  requested_amount int | bank_account_number | bank_name | ifsc_code
  account_holder_name | status (default pending)
  admin_notes | processed_at | processed_by FK→profiles

plans:
  id uuid PK | name text UNIQUE | price int | original_price int
  discount_percentage int | features jsonb array
  referral_commission_l1 int | referral_commission_l2 int
  service_discount_percentage int | is_popular bool | is_active bool

message_events (notification event registry):
  id uuid PK | event_key text UNIQUE | description
  email_template_id FK→message_templates
  whatsapp_template_id FK→message_templates
  sms_template_id FK→message_templates
  delay_minutes int | is_enabled bool
  email_enabled bool | sms_enabled bool | whatsapp_enabled bool
  recipient_type: user|celebrity|admin | category | label | sms_flow_id

message_templates:
  id uuid PK | name | channel: email|whatsapp|both
  subject | content | variables jsonb array | is_active bool

message_logs:
  id uuid PK | channel: email|whatsapp | recipient | template_id
  template_name | event_key | status: sent|failed|pending
  error_message | message_id | metadata jsonb | user_id | sent_at

scheduled_messages:
  id uuid PK | user_id FK→profiles | recipient_name | recipient_email
  recipient_whatsapp | template_id FK→message_templates
  channel | scheduled_at | status: pending|sent|failed|cancelled
  payload jsonb | order_id | order_type | error_message | sent_at

user_music_credits:
  user_id PK FK→profiles | free_generations_used int
  free_generations_limit int (default 3) | paid_credits int
  last_reset_date date

tds_reports:
  id uuid PK | profile_id FK→profiles
  report_type: celebrity_earnings|referral_commissions
  month int | year int | total_gross_amount | total_tds_amount
  total_net_amount | transaction_count | report_data jsonb | pdf_url

OTHER TABLES (full list):
  abandoned_cart_tracking | addresses | admin_media_assets
  ai_conversations | ai_messages | ai_usage_analytics | ai_user_preferences
  api_key_audit_log | areas | audio_isolation_generations | bank_details
  celebrity_applications | celebrity_categories | celebrity_notifications
  celebrity_wallet_transactions | countries | delivery_type_pricing
  email_otp_verifications | image_music_generations | internal_alert_recipients
  media_library | message_campaigns | messaging_settings
  newsletter_subscriptions | occasion_bookings | occasions
  platform_settings | sound_effect_generations | states
  subscription_usage | tts_generations | user_activity_logs
  user_cloned_voices | user_roles | user_singing_personas | user_vapi_voices
  verified_emails | voice_conversion_generations

VIEWS:
  celebrities_public — hides: total_earnings, available_balance,
    commission_percentage, heygen_avatar_id, heygen_voice_id,
    vapi_voice_id, vapi_phone_id, webhook_url
  public_profile_basic — hides: pan_number, aadhaar_number, bank fields,
    wallet_balance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 7. ALL 82 EDGE FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VIDEO GENERATION (HeyGen):
  process-video-order           HTTP  Main orchestrator: script→HeyGen→B2
  generate-heygen-video         HTTP  Direct HeyGen API call
  generate-ai-celebrity-video   HTTP  AI celebrity video
  generate-celebrity-video-messages HTTP Batch generation
  generate-occasion-video       HTTP  Occasion-specific video
  poll-heygen-status            HTTP  Poll single video status
  poll-heygen-status-batch      HTTP  Batch poll
  check-heygen-video-status     HTTP  Status check
  heygen-get-avatars            HTTP  List avatars
  heygen-get-voices             HTTP  List voices
  heygen-get-languages          HTTP  List languages
  heygen-webhook                WEBHOOK HeyGen completion callback
  fix-booking-video             HTTP  Repair broken bookings
  update-booking-status         HTTP  Update + trigger generation
  update-booking-video          HTTP  Update video URL/status

AI MESSAGING:
  celebrity-conversation-auto-reply  DB TRIGGER → HTTP orchestrator
  celebrity-ai-message               HTTP  Gemini reply generation
  ai-assistant                       HTTP  Platform AI assistant
  generate-message-suggestions       HTTP  AI message suggestions
  generate-script                    HTTP  Booking script generation
  generate-occasion-auto-reply       HTTP  Occasion wish auto-reply
  check-messaging-status             HTTP  Health check
  trigger-message-event              HTTP  Manual notification trigger

MUSIC & AUDIO (ElevenLabs):
  elevenlabs-generate-music     HTTP  Generate music track
  elevenlabs-text-to-speech     HTTP  TTS audio
  elevenlabs-clone-voice        HTTP  Voice cloning
  elevenlabs-get-voices         HTTP  List EL voices
  get-user-voices               HTTP  User's custom voices
  elevenlabs-get-languages      HTTP  Languages list
  elevenlabs-sound-effects      HTTP  Sound effect generation
  elevenlabs-audio-isolation    HTTP  Isolate audio from video
  elevenlabs-speech-to-speech   HTTP  Voice conversion
  elevenlabs-image-music-video  HTTP  Image → music video
  verify-elevenlabs-voice       HTTP  Verify cloned voice
  generate-music                HTTP  Music generation wrapper
  check-music-status            HTTP  Poll music task
  generate-lyrics               HTTP  AI lyrics via Gemini
  save-music-to-b2              HTTP  Upload audio to Backblaze B2

PAYMENTS:
  create-razorpay-order         HTTP  Create Razorpay checkout order
  verify-razorpay-payment       HTTP  Verify + generate wishme_payment_id

MEDIA STORAGE (Backblaze B2):
  b2-upload-media               HTTP  Upload file to B2
  b2-get-signed-url             HTTP  Get temporary access URL
  b2-delete-media               HTTP  Delete from B2

VOICE CALLS (VAPI):
  vapi-make-call                HTTP  Initiate call
  vapi-get-voices               HTTP  List VAPI voices
  vapi-upload-voice             HTTP  Upload custom voice
  vapi-celebrity-call           HTTP  Celebrity-specific call flow
  vapi-webhook                  WEBHOOK VAPI status callbacks
  process-scheduled-calls       CRON  Process scheduled calls

NOTIFICATIONS (send-wishme-notification is the central engine):
  send-wishme-notification      HTTP  Central: Email+SMS+WhatsApp (53+ events)
  send-email-otp                HTTP  OTP for signup
  verify-email-otp              HTTP  OTP verification
  send-order-notification       HTTP  Order status
  send-referral-earning-email   HTTP  Referral commission email (Resend)
  send-celebrity-subscription-email HTTP Subscription confirmation
  send-newsletter-welcome       HTTP  Welcome email
  send-bulk-newsletter          HTTP  Bulk newsletter
  send-wish-to-celebrity        HTTP  Wish delivery to celebrity
  send-wish-thankyou-dm         HTTP  Thank-you DM
  send-unified-message          HTTP  Unified sender
  process-scheduled-messages    CRON  Process deferred messages
  process-abandoned-carts       CRON  Cart abandonment reminders

CONTENT GENERATION:
  generate-greeting-card        HTTP  Greeting card (basic)
  generate-greeting-card-ai     HTTP  AI card via Gemini
  generate-image-promotion      HTTP  AI promo image
  generate-photo-wish           HTTP  Photo wish editing
  generate-wish-celebrity-card  HTTP  Celebrity wish card
  suggest-greeting-card-prompts HTTP  AI prompt suggestions
  generate-ugc-ad               HTTP  UGC ad: script + HeyGen video
  generate-ugc-video            HTTP  UGC video generation
  upload-ugc-video              HTTP  Upload UGC video
  process-ugc-video-id          HTTP  Process HeyGen UGC video ID

ADMIN & UTILITIES:
  admin-reset-password          HTTP  Admin password reset
  manage-api-keys               HTTP  API key CRUD
  test-api-connections          HTTP  Health check all APIs
  insert-sample-celebrity       HTTP  Seed sample data
  populate-indian-celebrities   HTTP  Seed Indian celebrities
  get-featured-celebrities      HTTP  Homepage featured list
  verify-video-access           HTTP  Validate recipient verification code

6 CRON JOBS (scheduled):
  1. process-scheduled-messages  — process scheduled_messages table
  2. process-abandoned-carts     — cart abandonment (reminder_sent=false)
  3. process-scheduled-calls     — scheduled voice_call_wishes
  4. occasion-reminders          — alert_days_before check on occasion_alerts
  5. subscription-expiry         — celebrity_favorites.subscription_expires_at
  6. tds-report-generator        — monthly TDS reports

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 8. EXTERNAL API INTEGRATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HeyGen (AI Video):
  Secret: HEYGEN_API_KEY (Supabase secrets)
  Used for: avatar video generation, avatar listing, voice listing
  Relevant fields: celebrities.heygen_avatar_id, heygen_voice_id
  bookings.heygen_video_id, ugc_ads.heygen_video_id

ElevenLabs (Audio/Music):
  Secret: ELEVENLABS_API_KEY (Supabase secrets)
  Used for: music generation, TTS, voice cloning, sound effects,
    audio isolation, speech-to-speech, image-to-music

VAPI (Voice Calls):
  Secret: VAPI_API_KEY (Supabase secrets)
  Used for: outbound voice calls using celebrity voices
  Relevant fields: celebrities.vapi_voice_id, vapi_phone_id

Razorpay (Payments):
  Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (Supabase secrets)
  Anon key also used in frontend for checkout widget
  Verification: HMAC-SHA256 signature in verify-razorpay-payment

Resend (Email):
  Secret: RESEND_API_KEY (Supabase secrets)
  Used in: send-wishme-notification + all email edge functions

MSG91 (SMS):
  Secret: MSG91_AUTH_KEY (Supabase secrets)
  Used in: send-wishme-notification for SMS delivery

Meta Cloud API (WhatsApp):
  Secrets: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID (Supabase secrets)
  Used in: send-wishme-notification for WhatsApp messages

Lovable AI Gateway / Gemini:
  Built-in to Lovable platform (no separate secret needed)
  Used for: script generation, greeting cards, AI auto-replies,
    lyrics, message suggestions, UGC scripts
  Model access: Gemini (via gateway)
  Functions: ai-assistant, celebrity-ai-message, generate-script,
    generate-greeting-card-ai, generate-lyrics, generate-image-promotion

Backblaze B2:
  Secrets: B2_KEY_ID, B2_APPLICATION_KEY (Supabase secrets)
  Bucket: wishmetoday
  Used for: all generated media storage
  Access: signed URLs via b2-get-signed-url

Google (OAuth + Speech):
  OAuth: configured in Supabase Auth dashboard
  Speech-to-Text: useGoogleSpeech hook (frontend) for voice assistant

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 9. KEY DATABASE TRIGGERS (memorize — they drive everything)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ON auth.users INSERT:
  → Auto-creates profiles record with referral_code, default plan=basic

ON bookings INSERT/UPDATE:
  → notify_booking_status_change → send-wishme-notification
  → calculate_booking_commission (on status=confirmed):
      INSERT celebrity_wallet_transactions with TDS calc
      UPDATE celebrities.total_earnings + available_balance
  → process_referral_commissions (on status=completed):
      INSERT referral_transactions (L1 + L2)
      INSERT wallet_transactions for each referrer

ON wallet_transactions INSERT/UPDATE (status→completed/approved):
  → update_wallet_balance:
      UPDATE profiles.wallet_balance
      (deposit/credit = +amount, withdrawal/debit = -amount)

ON messages INSERT:
  → handle_auto_reply_on_message:
      checks celebrity_settings.ai_auto_reply_enabled
      checks conversation.message_count < 200
      calls celebrity-conversation-auto-reply edge fn
  → check_conversation_limit:
      blocks INSERT if message_count >= limit
      auto-closes conversation (is_closed=true)

ON greeting_card_generations INSERT:
  → process_greeting_card_referral_commission

ON music_generations INSERT (status=completed):
  → process_music_generation_referral_commission

ON celebrity_applications (status=approved):
  → Auto-creates celebrity record + profile if needed

ON profiles INSERT:
  → generate_referral_url:
      sets referral_url = 'https://wishme.today/auth?ref=' + referral_code

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 10. NOTIFICATION SYSTEM (53+ events)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Central function: send-wishme-notification
  - Reads event config from message_events table
  - Reads template from message_templates table
  - Sends via: Resend (email) + MSG91 (SMS) + Meta Cloud API (WhatsApp)
  - Logs every attempt to message_logs table
  - Each event has: email_enabled, sms_enabled, whatsapp_enabled toggles
  - Admin can toggle all events at /admin/communication-hub

Key event keys (examples):
  booking_placed_user | booking_placed_celebrity | booking_placed_admin
  booking_confirmed | booking_completed_user | booking_cancelled
  wallet_topup_request | wallet_topup_approved | wallet_topup_rejected
  referral_commission_earned | plan_upgraded | celebrity_subscription
  wish_sent_to_celebrity | music_generated | greeting_card_generated
  occasion_reminder_3days | occasion_reminder_1day
  celebrity_payout_requested | celebrity_payout_processed
  abandoned_cart_reminder | referral_4day_reminder

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 11. FILE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/
├── App.tsx                    # ALL routes defined here — check first
├── main.tsx                   # Entry: wraps QueryClient+AuthProvider
                               + BrowserRouter
├── index.css                  # Tailwind base + global custom styles
│
├── components/
│   ├── ui/                    # shadcn/ui (60+ primitives: Button,
│   │                          # Dialog, Sheet, Toast, etc.)
│   ├── admin/                 # Admin sidebar, layout, celebrity editor
│   ├── ai-assistant/          # AI chatbot: bubble, drawer, messages
│   ├── auth/                  # OTP input, password strength, plan picker
│   ├── booking/               # Steps 1-6 of booking wizard
│   ├── celebrity/             # Celebrity dashboard 10 tabs
│   ├── dashboard/             # User sidebar, occasion alerts widget
│   ├── gdpr/                  # Cookie consent banner
│   ├── home/                  # Hero, featured celebrities, how-it-works,
│   │                          # business CTA, AI music CTA, referral CTA
│   ├── layout/                # ProtectedRoute, AuthenticatedLayout,
│   │                          # AdminLayout
│   ├── media/                 # AudioRecorder, B2VideoPlayer,
│   │                          # ImagePreview, MediaUploader
│   ├── messages/              # ConversationList, MessageBubble,
│   │                          # ChatWindow, AIReplyIndicator
│   ├── payment/               # PaymentModal, MethodSelector,
│   │                          # RazorpayCheckout, WalletBalance
│   ├── profile/               # AddressManager, BankDetailsForm,
│   │                          # PANVerification, AadhaarVerification
│   ├── tds/                   # TDSSummary, TransactionTable, PDFExport
│   ├── voice-assistant/       # GoogleVoice, VAPIInterface
│   ├── Header.tsx             # Main nav: logo, menu, auth buttons
│   ├── Hero.tsx               # Homepage hero section
│   └── CelebrityCard.tsx      # Celebrity grid card component
│
├── pages/                     # 65+ route-level page components
│   ├── admin/                 # 22 admin sub-pages
│   └── [all other pages]
│
├── hooks/                     # 25+ custom hooks
│   ├── useAuth.tsx            # Auth context consumer
│   ├── useMessages.ts         # Messages + Realtime subscription
│   ├── useConversations.ts    # Conversation CRUD
│   ├── useWalletBalance.ts    # Wallet balance polling
│   ├── usePlanDiscount.ts     # Calculate plan-based discounts
│   ├── useGoogleSpeech.ts     # Google STT for voice assistant
│   ├── useCelebrityFavorites.ts # Subscription status check
│   └── [other hooks]
│
├── contexts/
│   ├── ThemeContext.tsx        # Dark/light mode
│   └── AIAssistantContext.tsx # AI assistant open/close state,
│                               # conversation history
│
├── integrations/supabase/
│   ├── client.ts              # Supabase client (URL + anon key hardcoded)
│   └── types.ts               # Auto-generated DB types — source of truth
│                               # for all table/column TypeScript types
│
├── utils/
│   ├── validation.ts          # Form validation helpers
│   ├── paymentId.ts           # WishMe payment ID generator
│   ├── auditLogger.ts         # user_activity_logs writer
│   └── rag.ts                 # RAG helpers for AI knowledge base
│
├── data/knowledge-base/       # JSON files for AI assistant RAG
│   └── *.json                 # Platform info, FAQs, celebrity data
│
└── lib/
    ├── utils.ts               # cn() class merger
    └── performance.ts         # Performance monitoring helpers

supabase/
├── config.toml               # verify_jwt=false for specific functions
├── functions/                # 82 edge functions (Deno/TypeScript)
│   └── [function-name]/
│       └── index.ts
└── migrations/               # Ordered SQL migration files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 12. SECURITY RULES (never violate these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RLS: ALL sensitive tables have RLS enabled
  - Users can only SELECT/UPDATE their own rows
    (WHERE id = get_my_profile_id() or user_id = get_my_profile_id())
  - Admins bypass via is_admin_by_auth_uid()
  - Public tables (occasions, celebrities_public view) allow anon SELECT
  - NEVER expose celebrities.total_earnings or profiles.wallet_balance
    to unauthenticated users

API Keys: ALL stored in Supabase secrets, NEVER in frontend code
  Exception: Razorpay key_id (public key) is safe in frontend
  Exception: Supabase anon key is intentionally public

JWT: verify_jwt = false ONLY on:
  - heygen-webhook (HeyGen calls this without JWT)
  - vapi-webhook (VAPI calls this without JWT)
  - process-scheduled-* (cron invocations)
  All other functions: verify_jwt = true (default)

TDS calculation rules:
  - Celebrity has PAN verified: TDS = 10% of gross_amount
  - Celebrity missing PAN: TDS = 20% of gross_amount
  - net_amount = gross_amount - tds_amount
  - Stored in celebrity_wallet_transactions

Payment verification:
  - ALL Razorpay payments verified via HMAC-SHA256 in verify-razorpay-payment
  - wishme_payment_id generated ONLY after successful verification
  - Duplicate prevention: payment_transactions.wishme_payment_id is UNIQUE

Recipient video access:
  - bookings.recipient_verification_code: random code sent to recipient
  - /order/:bookingId/view requires this code
  - verify-video-access edge fn validates before returning B2 signed URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 13. KNOWN ISSUES (don't recreate, fix instead)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Dev tools exposed in production:
   /populate-celebrities, /populate-indian-celebrities,
   /generate-video-messages — these should be admin-only or removed

2. Hardcoded values:
   - Supabase URL + anon key in src/integrations/supabase/client.ts
   - Platform URL 'https://wishme.today' hardcoded in
     generate_referral_url DB function
   - Platform fee (10%) hardcoded in booking wizard

3. ugc_ads.user_id references auth.users, NOT profiles
   (inconsistency — all other tables reference profiles)

4. React Query refetchOnMount: false can show stale data
   (intentional tradeoff for performance — be aware)

5. No SSR — pure SPA, SEO is poor for public pages

6. /mobile-app-builder and /business-campaigns are incomplete features

7. Homepage calls insert-sample-celebrity if no celebrities exist
   (dev artifact — should be removed in production)

8. Admin role check in AdminLayout is client-side only
   (server-side RLS protection exists — client check is UX only)

9. Dual role system (profiles.role + user_roles table) can
   get out of sync — always update BOTH when changing roles

10. conversation message limit is 200 (check_conversation_limit trigger)
    When hit: conversation auto-closes, is_closed=true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 14. BEFORE EVERY CODE CHANGE — CHECK THESE FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. src/App.tsx — all routes live here
2. src/integrations/supabase/types.ts — DB types source of truth
3. src/hooks/useAuth.tsx — auth state structure
4. supabase/config.toml — JWT settings per function
5. The specific edge function index.ts for any backend change
6. The DB migration files for any schema change

GOLDEN RULES:
- Never modify profiles.wallet_balance directly — only via wallet_transactions
- Never generate wishme_payment_id outside verify-razorpay-payment
- Never skip RLS — add policies for every new table
- Always update BOTH profiles.role AND user_roles table when changing roles
- Always use get_my_profile_id() in RLS policies, never auth.uid() directly
- Never expose celebrities financial fields (use celebrities_public view)
- All media → Backblaze B2, not Supabase Storage (except user uploads)
- Realtime is only used for messages — do not add Realtime to other tables
  without confirming with the team


We are simplifying and fixing the entire celebrity video wish pipeline 
on WishMe. Read this completely before touching any code.

---

## WHAT WE ARE BUILDING — THE COMPLETE VISION

When a fan books a celebrity video wish, the final output must look 
exactly like the celebrity personally recorded that specific wish for 
that specific person. Ultra-realistic. Indistinguishable from real.

Here is how it works from start to finish:

The celebrity comes in for a one-time video shoot. They record 4 short 
raw videos — one for each emotional mood. They say absolutely anything 
in these videos — random sentences, counting numbers, whatever. The 
words they say are completely irrelevant. What we are capturing is their 
natural body language, hand gestures, facial expressions, and presence. 
Each take is 90 seconds long. These raw videos are uploaded once by the 
admin and used forever for every booking for that celebrity.

When a fan places a booking, three AI steps happen automatically:

Step one — Gemini writes a complete personalised script. Not a template. 
A full natural flowing speech in the celebrity's style, addressing the 
recipient by name, referencing the occasion, weaving in the personal 
message the fan provided. Sounds like the celebrity genuinely wrote it.

Step two — ElevenLabs generates audio from that script using the 
celebrity's Professional Voice Clone. Sounds exactly like the celebrity 
speaking. Saved to B2 as an MP3.

Step three — Sync.so takes the celebrity's raw base video plus the 
ElevenLabs audio and replaces every single mouth movement in the entire 
video with perfect lip sync matching the generated audio. The celebrity's 
gestures, expressions, head movements, body language all stay exactly as 
recorded. Only the mouth movements change. The output is a video that 
looks and sounds like the celebrity personally recorded that exact wish.

If a celebrity has no raw videos uploaded yet, the system falls back 
to HeyGen using the existing avatar pipeline. HeyGen stays working 
exactly as it does today as a fallback. Nothing about HeyGen changes.

---

## THE CORE PROBLEM TO FIX RIGHT NOW

The pipeline was built and tested — all 9 test steps passed. But the 
admin UI is completely broken for Sync.so bookings. When admin looks 
at a booking for a celebrity configured with Sync.so, they see:

"No Video ID — This booking doesn't have a HeyGen video ID yet"

This error appears because the admin bookings UI checks for 
heygen_video_id everywhere and assumes every booking uses HeyGen. 
The UI has zero awareness that Sync.so even exists. Fix this completely.

---

## FIX 1 — ADMIN BOOKINGS LIST PAGE

In the admin bookings list table, each row shows video status.

Currently it probably checks heygen_video_id or video_status and 
shows a generic status badge.

Change it so that if lipsync_provider = 'syncso' on the booking, 
the status display uses these rules:

generation_status = 'processing' → amber badge saying "Lipsync Processing"
generation_status = 'completed' → green badge saying "Video Ready"  
generation_status = 'failed' → red badge saying "Lipsync Failed"
generation_status = 'script_generating' → amber badge "Generating Script"
generation_status = 'video_generating' → amber badge "Generating Audio"
syncso_job_id exists but generation_status is processing → show 
  the syncso_job_id truncated to first 8 characters as a subtitle

If lipsync_provider is 'heygen' or null → keep existing UI exactly 
as it is. Do not change HeyGen booking display at all.

---

## FIX 2 — ADMIN BOOKING DETAIL DIALOG

Find BookingDetailsDialog.tsx or whatever component shows the full 
booking detail when admin clicks a booking.

Find every place that shows HeyGen-specific content. This includes:
- "No Video ID" message
- "This booking doesn't have a HeyGen video ID yet" 
- Any check on heygen_video_id being null
- "Generate HeyGen Video" button
- "Poll HeyGen Status" button  
- Any heygen_video_id display field

For every one of these, wrap them in a condition. If 
lipsync_provider = 'syncso' on this booking, hide all HeyGen UI 
and show this Sync.so UI instead:

Show a section titled "Sync.so Lipsync Pipeline" with:

- Provider badge: purple "Sync.so" badge
- Mood used: the selected_base_video_mood value (e.g. "celebratory")
- Job ID: syncso_job_id value
- Started: lipsync_started_at formatted as readable date/time
- Completed: lipsync_completed_at if exists
- Error: lipsync_error if exists, shown in red
- Generated script: generated_script field in a collapsed 
  expandable section (click to expand)
- Audio file: elevenlabs_audio_b2_key if exists

Status section:
- If generation_status = 'processing': show amber spinner with 
  text "Lipsync job running — auto-poll checks every 2 minutes"
  AND show a manual "Check Now" button that calls poll-syncso-status
  with the booking's syncso_job_id and shows the result in a toast
- If generation_status = 'completed': show green "Video Ready" 
  and show a video player. The video player loads the signed URL 
  by calling b2-get-signed-url with video_file_key as the key. 
  If video_file_key is empty but video_url exists use video_url.
- If generation_status = 'failed': show red "Failed" with the 
  lipsync_error message and a "Retry" button that re-invokes 
  process-video-order with this bookingId

If lipsync_provider is 'heygen' or null → keep existing HeyGen 
booking detail UI completely unchanged.

---

## FIX 3 — PROCESS-VIDEO-ORDER ROUTING BUG

Open supabase/functions/process-video-order/index.ts

Find where the celebrity data is fetched with supabase.from('celebrities').
Make sure the SELECT includes these exact fields:
  video_generation_provider,
  elevenlabs_professional_voice_id,
  base_video_celebratory_key,
  base_video_festive_key,
  base_video_heartfelt_key,
  base_video_traditional_key

After fetching the celebrity, the VERY FIRST thing the code must do 
is check video_generation_provider. Before any HeyGen validation. 
Before any heygen_avatar_id check. Before anything else.

The routing logic must be:
the original footage that was shot with real camera.. what ever the celebrity speaks in the original video must be as is.. same words, same video, same original raw video but only at the start at the beginning only the name, and occasion will changes based on the user's provided information of his/her name or his/her occasion only that will be generated using heygen (name, occasion and etc will be generated by heygen) thats it and rest of video will be real original footage itself.. 
basically the celebrity would have record the original video for each and all occasions separately but only the name and occasion will changes based on the user inputs while placing the order 
this is the new requirement a simple requirement but requires a simple video editing feature... heygen will generate  name and occasion at the beginning and then rest of the video will be same originally shot and uploaded video... heygen will generate and name and occasion in original voice of celebrity and web application will merge both heygen and original video and provide the final output... 
the video must be perfectly edited with no glitched, voice change, tone changes, anything i need a perfectly functioning logic... no one should be able to convince or detect that the video was made by AI

The celebrity records ONE complete video per occasion. For example they record a full birthday wish video, a full Diwali wish video, a full New Year video etc. Each video is complete and natural — their real voice, real expressions, everything authentic.
The only thing that changes per booking is the intro. At the very start of the video the celebrity says something like "Hey [NAME], wishing you a very happy [OCCASION]!" — just that one line at the beginning is personalised. Everything after that is the same original footage for everyone who books that occasion.
HeyGen generates only the intro clip — just 5-10 seconds of the celebrity saying the recipient's name and occasion greeting in their voice.
The app then merges both clips — HeyGen personalised intro + original full video = final seamless output.


We are completely rebuilding the celebrity video wish pipeline with a 
new approach that is simpler, more realistic, and uses only HeyGen 
and FFmpeg video merging. Read everything carefully before writing 
any code.

---

## THE COMPLETE VISION

Celebrities pre-record one authentic video for each occasion. These 
are real videos — real voice, real expressions, real environment. 
No AI generation in the main video at all.

When a fan books a wish, only the personalised intro changes. The 
rest of the video is always the original authentic recording.

The final output is structured like this:

PART 1 — Personalised intro (3-8 seconds, HeyGen generated)
The celebrity says the recipient's name and a personalised greeting.
Example: "Hey Rahul! Yaar, tujhe bahut bahut mubarak ho tere 
birthday pe!" — completely personalised, generated by HeyGen using 
the celebrity's existing HeyGen avatar and voice.

PART 2 — Original occasion video (60-90 seconds, authentic footage)
The celebrity's pre-recorded authentic video for this specific 
occasion. Same for every booking of this occasion. Never changes.

FINAL OUTPUT — PART 1 + PART 2 seamlessly merged using FFmpeg.
The merge must be completely seamless. No visible cut. No audio 
jump. No quality change. It must be undetectable that the intro 
was separately generated.

---

## HOW THE CELEBRITY RECORDS THE OCCASION VIDEOS

Each occasion video must start with a 2-3 second natural opening — 
celebrity smiling, looking into camera, natural head nod or small 
gesture. They do NOT say anything during this opening. This silent 
opening pause is the merge point where the personalised intro gets 
attached.

After the 2-3 second opening, the celebrity delivers the full 
occasion wish naturally. Example for birthday: "Yaar, teri life 
mein itni khushiyan aayein ki tu count bhi na kar paaye. Tujhe pata 
hai na ki tu kitna special hai..." etc for 60-90 seconds.

The recording must have:
- Consistent lighting throughout
- Same camera position and framing
- Clean audio (even though AI replaces the opening)
- Natural continuous delivery after the opening pause

---

## DATABASE CHANGES NEEDED

Create a new table called celebrity_occasion_videos with these columns:
- id uuid primary key default gen_random_uuid()
- celebrity_id uuid references celebrities(id) not null
- occasion_type text not null
- video_b2_key text not null (the B2 file key of the original video)
- video_url text (public or signed URL)
- title text (admin-friendly label)
- duration_seconds integer
- opening_pause_seconds numeric default 2.5 
  (how long the silent opening is, admin sets this per video)
- is_active boolean default true
- created_at timestamptz default now()
- updated_at timestamptz default now()

Add RLS: only admins can insert, update, delete. All authenticated 
users can select.

Also add to celebrities table if not exists:
- heygen_avatar_id (already exists)
- heygen_voice_id (already exists)  
- elevenlabs_professional_voice_id text (may already exist)

Add to bookings table if not exists:
- occasion_video_id uuid references celebrity_occasion_videos(id)
- heygen_intro_video_id text (HeyGen video ID for the intro clip)
- heygen_intro_status text
- heygen_intro_url text (B2 key or URL of generated intro clip)
- final_merged_video_key text (B2 key of the final merged video)
- merge_status text default 'pending'
- merge_error text
- personalised_intro_script text (the exact text HeyGen will say)

---

## ADMIN CELEBRITY EDIT PAGE — NEW OCCASION VIDEOS SECTION

In the admin celebrity edit page add a new tab called 
"Occasion Videos". This tab is where admin manages all the 
pre-recorded occasion videos for this celebrity.

The tab shows a grid of occasion video cards. Each card represents 
one uploaded occasion video. The card shows:
- Occasion name (Birthday, Diwali, New Year etc.)
- Video preview player (no autoplay, click to play)
- Duration of the video
- Opening pause duration (editable number input, default 2.5 seconds)
  This tells the system how long the silent opening is so it knows 
  exactly where to attach the personalised intro
- Active/inactive toggle
- Delete button
- Last updated date

Above the grid show an "Add Occasion Video" button. Clicking it 
opens a form/dialog with:
- Occasion type dropdown with all supported occasions:
  Birthday, Anniversary, New Year, Diwali, Holi, Eid, Christmas,
  Navratri, Dussehra, Raksha Bandhan, Onam, Pongal, Durga Puja,
  Ganesh Chaturthi, Graduation, Wedding, Baby Shower, Promotion,
  Get Well Soon, Farewell, Thank You, Motivation, General Wish,
  and a Custom option where admin types the occasion name
- Video file upload (accepts MP4, shows upload progress bar)
- Opening pause duration (seconds, default 2.5)
- Title field (optional admin note)

When admin submits the form:
1. Upload the MP4 to B2 at path 
   videos/occasions/{celebrity-id}/{occasion-type}/{timestamp}.mp4
   using the existing b2-upload-base-video function or the same 
   B2 upload pattern
2. Insert a row into celebrity_occasion_videos table
3. Show the new card in the grid

Video upload must show real progress percentage. These are large 
files (60-90 seconds of high quality video = 100-400MB).

When admin deletes an occasion video, delete from B2 using 
b2-delete-media and delete the database row.

---

## BOOKING FLOW — HOW OCCASION VIDEO IS SELECTED

When a fan places a booking, they select an occasion type. When 
the booking is created, the system should automatically find the 
matching occasion video for this celebrity by querying 
celebrity_occasion_videos where celebrity_id matches and 
occasion_type matches and is_active = true.

Store the celebrity_occasion_videos.id in bookings.occasion_video_id.

If no matching occasion video exists, note this in the booking 
but do not block the booking from being placed. The admin will 
handle it.

---

## THE GENERATION PIPELINE — WHAT HAPPENS WHEN ADMIN APPROVES

When admin approves a booking that has an occasion_video_id set, 
the following pipeline runs automatically in order:

STEP 1 — GENERATE PERSONALISED INTRO SCRIPT

Call Gemini to write a short personalised intro script. This script 
is ONLY the opening greeting — 1-3 sentences maximum, 5-10 seconds 
when spoken. It must include the recipient's name and reference the 
occasion naturally.

Example output for birthday:
"Hey Rahul! Yaar, tujhe bahut bahut mubarak ho is khaas din pe!"

Example output for Diwali:
"Hey Priya, tumhe aur tumhare poore parivaar ko Diwali ki dheron 
shubhkamnaayein!"

The script must match the celebrity's established tone and language 
style. Keep it natural, warm, and short. No more than 3 sentences.

Pass to Gemini: celebrity name, recipient name, occasion type, 
recipient's relationship to sender, any personal note from the 
booking, preferred language.

Store the generated script in bookings.personalised_intro_script.

STEP 2 — GENERATE INTRO VIDEO USING HEYGEN

Call the HeyGen API to generate a short video of the celebrity 
saying the personalised intro script. Use the celebrity's 
heygen_avatar_id and heygen_voice_id which are already configured.

This is a standard HeyGen video generation call — same as the 
existing process-video-order flow does today for full videos. 
The only difference is the script is very short (5-10 seconds).

Store the HeyGen video ID in bookings.heygen_intro_video_id.
Set heygen_intro_status = 'processing'.

Poll for completion using existing poll-heygen-status function or 
the same polling logic already in the codebase.

When HeyGen completes, download the intro video and upload to B2 
at path videos/intros/{booking-id}/intro.mp4. Store the B2 key 
in bookings.heygen_intro_url.

STEP 3 — MERGE INTRO VIDEO WITH ORIGINAL OCCASION VIDEO

This is the critical step. We need to concatenate two videos:
- Part 1: The HeyGen generated intro video (stored in B2, 
  referenced by heygen_intro_url)
- Part 2: The original occasion video (stored in B2, referenced 
  by the celebrity_occasion_videos.video_b2_key for this booking)

The merge must happen at the right splice point. The original 
occasion video has an opening_pause_seconds value. We trim the 
original video to start from that point (cutting off the silent 
opening) and append it after the HeyGen intro.

For example if opening_pause_seconds = 2.5, we take the original 
video from 2.5 seconds onwards and append after the HeyGen intro.

Create a new Supabase edge function called merge-celebrity-video 
that handles this merging. This function:

1. Downloads both video files from B2 as buffers
2. Uses FFmpeg (via a direct FFmpeg binary call or the ffmpeg-wasm 
   library or a video processing API) to:
   a. Take the HeyGen intro video in full
   b. Take the original occasion video starting from 
      opening_pause_seconds
   c. Concatenate them using FFmpeg concat filter
   d. Ensure audio levels are normalised so no volume jump at 
      the splice point (use FFmpeg's audio normalisation filter)
   e. Ensure video resolution and codec are consistent
   f. Output as a single MP4 file
3. Upload the merged video to B2 at 
   videos/final/{booking-id}/final.mp4
4. Update booking with:
   - final_merged_video_key = the B2 key
   - video_file_key = same B2 key (for compatibility)
   - merge_status = 'completed'
   - generation_status = 'completed'
   - video_status = 'completed'
   - status = 'completed'
   - completed_at = now()

For the FFmpeg implementation in a Deno edge function, use this 
approach: invoke an external video processing service or use 
the Remotion/FFmpeg API available at https://api.ffmpeg.cloud 
or implement using the existing pattern in the codebase if there 
is already an FFmpeg or video processing utility. If no FFmpeg 
is available, implement the merge by calling the Cloudflare Stream 
API or AWS MediaConvert or any video concatenation API that is 
simple to integrate. Choose the simplest approach that works 
reliably in a Deno edge function.

IMPORTANT FFmpeg concat requirements:
- Both videos must have the same resolution before merging. 
  If they differ, scale both to 1080x1920 (portrait) using 
  FFmpeg -vf scale
- Both videos must have the same frame rate. Use 25fps.
- Audio must be normalised at the splice point. Use 
  FFmpeg loudnorm filter.
- The final video must play seamlessly with no visible glitch 
  at the 8-10 second mark where the two clips join.

STEP 4 — TRIGGER NOTIFICATION

After merge completes, trigger the existing booking_completed_user 
notification so the user receives their video link.

---

## FALLBACK — WHAT IF NO OCCASION VIDEO IS UPLOADED

If a booking comes in for a celebrity/occasion combination where 
no occasion video has been uploaded yet, the booking should still 
process using the existing full HeyGen pipeline (generate the 
complete video using HeyGen avatar). This is the existing behaviour 
and must remain unchanged.

The system checks: does this celebrity have an active occasion video 
for this occasion type? If yes → new merge pipeline. If no → 
existing HeyGen full video pipeline.

---

## ADMIN BOOKINGS UI UPDATES

In the admin booking detail view, add a section showing the 
pipeline type being used for this booking:

If occasion_video_id is set and the merge pipeline is running:
- Show "Merge Pipeline" label in purple
- Show which occasion video is being used (title and occasion type)
- Show HeyGen intro status (processing/complete/failed)
- Show merge status (pending/processing/complete/failed)
- Show the personalised intro script that was generated
- If merge is complete, show the final video player

If no occasion video and using HeyGen full pipeline:
- Show existing HeyGen pipeline UI unchanged

---

## AUTO-POLLING CRON

Create or update the existing cron polling function so it also 
polls for:
1. Bookings where heygen_intro_status = 'processing' — these 
   need to check HeyGen for intro video completion
2. Bookings where merge_status = 'pending' but 
   heygen_intro_status = 'completed' — these are ready for merging
3. Bookings where merge_status = 'processing' — check if merge 
   is done

Run this check in the existing auto-poll-syncso cron or create 
a separate auto-poll-merge cron running every 2 minutes.

---

## WHAT DOES NOT CHANGE

The existing HeyGen full-video pipeline for celebrities without 
occasion videos stays exactly as it is. Do not touch it.

The existing booking wizard that users see stays exactly as it is.

Payment flows stay unchanged.

All existing notifications stay unchanged.

RLS policies stay unchanged.

---

## AUTOMATED TESTING — DO THIS YOURSELF

After building everything, run these tests without asking me:

TEST 1: Check that the celebrity_occasion_videos table was created 
correctly with all columns. Show the table schema.

TEST 2: Insert a test row into celebrity_occasion_videos for any 
existing celebrity using a real B2 video key that already exists 
in B2 (check the media_library table for any existing video key 
to use as test data). Show the inserted row.

TEST 3: Invoke generate-wish-script (or create the intro script 
generator) with test data: celebrity = "Hari Raj Shetty", 
recipient = "Rahul", occasion = "birthday", relationship = "best 
friend". Show the generated intro script.

TEST 4: Verify that the admin celebrity edit page now has an 
"Occasion Videos" tab by checking the component file. List what 
UI elements are in that tab.

TEST 5: Simulate the full approval pipeline for a test booking. 
Find any confirmed booking, set its occasion_video_id to the 
test row from TEST 2, then invoke the pipeline. Show what happens 
at each step.

TEST 6: Verify the fallback — find a booking for a celebrity with 
no occasion videos and confirm it still routes to the HeyGen 
pipeline correctly.

Report all test results clearly. Fix any failures automatically 
before reporting. Do not ask me to do anything manually.

---

## VIDEO RECORDING INSTRUCTIONS FOR THE CELEBRITY

Include these instructions as a help text in the admin occasion 
video upload form so admins know how to brief the celebrity:

Each occasion video should be recorded as follows:
- Start with 2-3 seconds of natural expression — smile, small nod, 
  look into camera. Do not say anything during these first 2-3 
  seconds. This is where the personalised greeting gets attached.
- After the opening pause, deliver the full occasion wish naturally 
  without mentioning any specific person's name — the name was 
  already handled in the intro.
- Record in portrait orientation (9:16) at 1080p minimum.
- Consistent lighting, plain background, solid color outfit.
- Clean audio environment.
- Duration: 45-90 seconds total including the opening pause.
- The celebrity can record this once and it serves every single 
  fan who books this occasion forever — only the intro changes.


One additional requirement to add to the merge-celebrity-video 
edge function: after the Shotstack render completes and the final video is uploaded to B2, also generate a recipient verification code (random 8 character alphanumeric string) and store it in bookings.recipient_verification_code so the existing recipient video portal at /order/:bookingId/view continues to work for merged videos exactly as it works for HeyGen videos today.

what now..? this is the response i got from lovable
https://shotstack.io/docs/
https://api.shotstack.io/edit/v1/render
my shotstack production free tier API key (i will change this later to paid API key):- Om7HBvKzU574vL6KyVzsDuNFhLbEE81c7iG2OGxN            URL:- https://api.shotstack.io/edit/v1/render
my shotstack sandbox API key:- I6iz6miNWbN0NJZ2F89VaA7ftwnDvWtFQl7wI0Qm     URL;- https://api.shotstack.io/edit/stage/render
read the complete documentation fully and understand the process of shotstack how it works..??
and make sure the new implementation plan by lovable properly is it correct has it understood my requirement
i need the final output video to be generated perfectly without any bugs or errors or nothing... the final output video must be perfect and no one can be able to tell that its AI... it must look feel sound IRL real life original video this is mainly and very important

Build the complete Personalised Intro + Original Footage merge pipeline 
exactly as planned. Before writing any code, read these critical 
technical corrections based on the actual Shotstack API documentation. 
Getting these exactly right is what makes the final video undetectable 
as AI-generated.

---

## SHOTSTACK API — EXACT IMPLEMENTATION DETAILS

Use these exact values. Do not guess or improvise any Shotstack detail.

PRODUCTION API:
  Render endpoint: POST https://api.shotstack.io/edit/v1/render
  Poll endpoint:   GET  https://api.shotstack.io/edit/v1/render/{id}
  API key header:  x-api-key: Om7HBvKzU574vL6KyVzsDuNFhLbEE81c7iG2OGxN
  Store in Supabase secret as: SHOTSTACK_API_KEY
  Store endpoint as: SHOTSTACK_API_URL = https://api.shotstack.io/edit/v1

SANDBOX API (for testing only):
  Render endpoint: POST https://api.shotstack.io/edit/stage/render
  Poll endpoint:   GET  https://api.shotstack.io/edit/stage/render/{id}
  API key header:  x-api-key: I6iz6miNWbN0NJZ2F89VaA7ftwnDvWtFQl7wI0Qm
  Store in Supabase secret as: SHOTSTACK_SANDBOX_API_KEY
  Store endpoint as: SHOTSTACK_SANDBOX_URL = https://api.shotstack.io/edit/stage

For development and testing use SANDBOX. 
Switch to PRODUCTION only for real bookings.
Add a boolean Supabase secret SHOTSTACK_USE_SANDBOX = true for now.
The merge function reads this flag and uses sandbox or production accordingly.

---

## CRITICAL BUG IN ORIGINAL PLAN — FIX THIS FIRST

The original plan wrote this for the Shotstack timeline:

  { "start": "<intro_length>", "length": "auto" }

This is wrong. "<intro_length>" is not a real value. Shotstack needs
the exact number of seconds as a decimal number e.g. 7.2

To get the intro duration correctly, follow this exact sequence:

STEP A — When HeyGen intro video completes and gets downloaded:
  Get the video file duration in seconds. 
  The HeyGen API response includes the duration of the generated 
  video — read it from the HeyGen poll response field "duration" 
  if available. If not in the HeyGen response, estimate it as:
  (character_count_of_script / 15) which gives approximate seconds
  at normal speech pace. Store a reasonable estimate — 5 to 15 
  seconds is the expected range for intro videos.
  Store this value in a new bookings column: 
  heygen_intro_duration_seconds NUMERIC default 8.0

STEP B — When calling Shotstack, use the stored duration:
  const introDuration = booking.heygen_intro_duration_seconds || 8.0
  
  Then the Shotstack timeline looks like this:

  {
    "timeline": {
      "tracks": [
        {
          "clips": [
            {
              "asset": {
                "type": "video",
                "src": "<signed_url_of_heygen_intro>",
                "transcode": true
              },
              "start": 0,
              "length": "auto",
              "fit": "cover",
              "transition": { "out": "fade" }
            },
            {
              "asset": {
                "type": "video",
                "src": "<signed_url_of_original_occasion_video>",
                "trim": <opening_pause_seconds from celebrity_occasion_videos>,
                "transcode": true
              },
              "start": introDuration,
              "length": "auto",
              "fit": "cover",
              "transition": { "in": "fade" }
            }
          ]
        }
      ]
    },
    "output": {
      "format": "mp4",
      "fps": 25,
      "size": {
        "width": 1080,
        "height": 1920
      },
      "quality": "high"
    }
  }

KEY THINGS TO NOTE ABOUT THIS PAYLOAD:

1. "transcode": true on BOTH video assets — this forces Shotstack 
   to preprocess both videos to the same codec before merging. 
   Without this, codec mismatch between HeyGen output and original 
   footage causes glitches at the splice point.

2. "transition": { "out": "fade" } on the intro clip and 
   "transition": { "in": "fade" } on the original clip — this 
   adds a 0.5 second cross-fade at the splice point. This is the 
   single most important thing for making the join undetectable.
   A hard cut at the splice point is the only thing that could 
   reveal the edit. The fade hides it completely.

3. "fit": "cover" on both clips — ensures both clips fill the 
   full 1080x1920 frame regardless of their source resolution.

4. "fps": 25 — consistent frame rate across both clips.

5. "quality": "high" — maximum output quality.

6. "trim": opening_pause_seconds on the original video asset — 
   this skips the silent opening and starts the original video 
   exactly where the celebrity starts speaking after the pause.

---

## B2 SIGNED URL EXPIRY — CRITICAL

When generating signed URLs from B2 to pass to Shotstack, the 
signed URLs MUST have a minimum expiry of 6 hours (21600 seconds).

The default b2-get-signed-url function may use 1 hour expiry. 
For Shotstack calls, pass expiry=21600 when calling b2-get-signed-url 
or modify the URL generation inline. If the URL expires before 
Shotstack finishes rendering, the render will fail with a 403 error.

---

## DATABASE MIGRATION — EXACT SCHEMA

Add this migration. Include the heygen_intro_duration_seconds column
that was missing from the original plan.

New table celebrity_occasion_videos:
  id uuid primary key default gen_random_uuid()
  celebrity_id uuid references celebrities(id) on delete cascade not null
  occasion_type text not null
  video_b2_key text not null
  video_url text
  title text
  duration_seconds integer
  opening_pause_seconds numeric not null default 2.5
  is_active boolean not null default true
  created_at timestamptz default now()
  updated_at timestamptz default now()
  
  Index: (celebrity_id, occasion_type, is_active)
  RLS: SELECT for authenticated, INSERT/UPDATE/DELETE for admins only

New columns on bookings (all nullable):
  occasion_video_id uuid references celebrity_occasion_videos(id)
  personalised_intro_script text
  heygen_intro_video_id text
  heygen_intro_status text (pending|processing|completed|failed)
  heygen_intro_url text
  heygen_intro_duration_seconds numeric default 8.0
  final_merged_video_key text
  merge_status text default 'pending'
  merge_error text
  shotstack_render_id text

---

## EDGE FUNCTION: generate-intro-script

Input: { bookingId }

Load booking record. Extract:
  - recipient name from booking message JSON or booking.recipient_name
  - occasion type from occasion_video_id lookup or booking message
  - relationship from booking message JSON
  - personal note from booking message JSON  
  - preferred language from booking.instructions or message JSON, 
    fallback to 'Hinglish'
  - celebrity name from celebrities table

Call Gemini with this exact system prompt:

"You write ultra-short personalised video greetings for celebrities. 
The greeting is only the OPENING LINE of a longer video — the 
celebrity will continue speaking on their own after this. 
Write 1-2 sentences maximum. Must include the recipient's name 
and reference the occasion. Must sound completely natural like the 
celebrity is genuinely speaking from the heart. 
Do NOT write closing lines, sign-offs, or anything that sounds like 
an ending — the original video handles the rest.
Write ONLY the spoken words. No stage directions. No quotes.
Language: {preferred_language}"

Example good output for birthday in Hinglish:
"Hey Rahul! Yaar, tujhe bahut bahut mubarak ho is khaas din pe!"

Example good output for Diwali in Hinglish:
"Priya, tumhe aur tumhare poore ghar ko Diwali ki dher saari 
shubhkamnaayein!"

Store result in bookings.personalised_intro_script.

---

## EDGE FUNCTION: generate-heygen-intro

Input: { bookingId }

Read booking.personalised_intro_script.
Read celebrity.heygen_avatar_id and celebrity.heygen_voice_id.
If either is missing, throw error "Celebrity not configured for HeyGen".

Call HeyGen v2 video generation API — same code pattern as existing 
generate-heygen-video or process-video-order HeyGen calls already 
in the codebase. The only difference is we pass the short intro script 
instead of a full script.

Store HeyGen video ID in bookings.heygen_intro_video_id.
Set bookings.heygen_intro_status = 'processing'.

The cron will poll for completion. When complete:
- Download the intro video from HeyGen output URL
- Upload to B2 at videos/intros/{bookingId}/intro.mp4
- Store the B2 key in bookings.heygen_intro_url
- Estimate the intro duration: read from HeyGen response if available,
  otherwise calculate as (script_word_count / 2.5) for a rough estimate
  in seconds. Store in bookings.heygen_intro_duration_seconds.
- Set bookings.heygen_intro_status = 'completed'
- Set bookings.merge_status = 'pending' to trigger the cron to merge

---

## EDGE FUNCTION: merge-celebrity-video

Input: { bookingId }

VALIDATION CHECKS BEFORE PROCEEDING:
1. Load booking. Confirm heygen_intro_status = 'completed'
2. Confirm heygen_intro_url is not null
3. Confirm occasion_video_id is not null
4. Load celebrity_occasion_videos record
5. Confirm video_b2_key is not null
If any check fails, store error in merge_error and set 
merge_status = 'failed'. Do not proceed.

GENERATE SIGNED URLS WITH LONG EXPIRY:
- Call b2-get-signed-url for heygen_intro_url with expiry 21600 seconds
- Call b2-get-signed-url for the occasion video_b2_key with expiry 
  21600 seconds

GET INTRO DURATION:
  const introDuration = booking.heygen_intro_duration_seconds || 8.0

DETERMINE WHICH SHOTSTACK ENVIRONMENT:
  const useSandbox = Deno.env.get('SHOTSTACK_USE_SANDBOX') === 'true'
  const apiKey = useSandbox 
    ? Deno.env.get('SHOTSTACK_SANDBOX_API_KEY')
    : Deno.env.get('SHOTSTACK_API_KEY')
  const baseUrl = useSandbox
    ? 'https://api.shotstack.io/edit/stage'
    : 'https://api.shotstack.io/edit/v1'

SUBMIT TO SHOTSTACK:
  POST {baseUrl}/render
  Header: x-api-key: {apiKey}
  Header: Content-Type: application/json
  
  Body:
  {
    "timeline": {
      "tracks": [
        {
          "clips": [
            {
              "asset": {
                "type": "video",
                "src": "{intro_signed_url}",
                "transcode": true
              },
              "start": 0,
              "length": "auto",
              "fit": "cover",
              "transition": { "out": "fade" }
            },
            {
              "asset": {
                "type": "video", 
                "src": "{original_signed_url}",
                "trim": {opening_pause_seconds},
                "transcode": true
              },
              "start": {introDuration},
              "length": "auto",
              "fit": "cover",
              "transition": { "in": "fade" }
            }
          ]
        }
      ]
    },
    "output": {
      "format": "mp4",
      "fps": 25,
      "size": {
        "width": 1080,
        "height": 1920
      },
      "quality": "high"
    }
  }

HANDLE SHOTSTACK RESPONSE:
  On success: store response.id in bookings.shotstack_render_id
              set bookings.merge_status = 'processing'
  On failure: store error in bookings.merge_error
              set bookings.merge_status = 'failed'

---

## EDGE FUNCTION: poll-shotstack-status (called by cron)

Input: { bookingId, renderId }

GET {baseUrl}/render/{renderId}
Header: x-api-key: {apiKey}

Status values from Shotstack:
  "queued"    → still waiting, return 'processing'
  "fetching"  → downloading assets, return 'processing'  
  "rendering" → encoding video, return 'processing'
  "saving"    → uploading output, return 'processing'
  "done"      → SUCCESS — download the video
  "failed"    → FAILURE — store error

ON "done":
  The response contains response.url — this is the Shotstack-hosted 
  output video URL. Download it immediately (it expires after 24 hours).
  
  Download the video buffer from response.url.
  
  Upload to B2 at videos/final/{bookingId}/final.mp4 using existing 
  B2 upload pattern.
  
  Update booking in ONE database call:
    final_merged_video_key = 'videos/final/{bookingId}/final.mp4'
    video_file_key = 'videos/final/{bookingId}/final.mp4'
    merge_status = 'completed'
    generation_status = 'completed'
    video_status = 'completed'
    recipient_verification_code = generate 8-char alphanumeric if null
    completed_at = now()
  
  IMPORTANT: Do NOT set status = 'completed' on the booking.
  Keep the existing admin approval gate — admin must manually 
  mark the video as sent/delivered. This matches existing flow.
  
  Trigger send-order-notification with bookingId and type "video_ready"
  using existing notification pattern.

ON "failed":
  Set merge_status = 'failed'
  Set merge_error = response.error message from Shotstack

---

## CRON EXTENSION: extend cron-poll-syncso-jobs

In the existing cron-poll-syncso-jobs function that runs every 2 minutes,
add these three additional sweeps AFTER the existing Sync.so polling:

SWEEP 1 — Poll pending HeyGen intros:
  SELECT id, heygen_intro_video_id 
  FROM bookings 
  WHERE heygen_intro_status = 'processing'
  AND heygen_intro_video_id IS NOT NULL
  AND created_at > now() - interval '24 hours'
  
  For each: invoke generate-heygen-intro polling logic OR 
  call existing poll-heygen-status with the intro video ID.
  The existing poll-heygen-status function already handles downloading 
  and uploading — just make sure it recognises intro video IDs 
  (stored in heygen_intro_video_id) separately from main booking 
  heygen_video_id. May need a small flag.

SWEEP 2 — Trigger merges for ready intros:
  SELECT id
  FROM bookings
  WHERE heygen_intro_status = 'completed'
  AND merge_status = 'pending'
  AND occasion_video_id IS NOT NULL
  
  For each: invoke merge-celebrity-video

SWEEP 3 — Poll active Shotstack renders:
  SELECT id, shotstack_render_id
  FROM bookings
  WHERE merge_status = 'processing'
  AND shotstack_render_id IS NOT NULL
  AND lipsync_started_at > now() - interval '2 hours'
  
  For each: invoke poll-shotstack-status with bookingId and renderId

---

## UPDATE-BOOKING-STATUS — AUTO LINK OCCASION VIDEO

When admin approves a booking (status changes to 'confirmed'), 
in update-booking-status edge function, ADD this logic before 
the existing HeyGen pipeline trigger:

  1. Get the booking's occasion type. Parse from:
     - booking.message JSON field looking for occasion, occasionType, 
       or requestDetails.occasion
     - booking.service_type
     - Default: 'general_wish'
  
  2. Normalise the occasion string to lowercase with underscores.
     "Happy Birthday" → "birthday"
     "New Year" → "new_year"
     etc. Use a simple lowercase + replace spaces with underscore.
  
  3. Query celebrity_occasion_videos:
     SELECT id, opening_pause_seconds
     FROM celebrity_occasion_videos
     WHERE celebrity_id = {booking.celebrity_id}
     AND LOWER(occasion_type) = LOWER({occasion})
     AND is_active = true
     LIMIT 1
  
  4. If found:
     - Set bookings.occasion_video_id = found record id
     - Set bookings.merge_status = 'pending'
     - Set bookings.heygen_intro_status = 'pending'
     - Invoke generate-intro-script
     - Then invoke generate-heygen-intro
     - Return early — do NOT run the existing HeyGen full pipeline
  
  5. If NOT found:
     - Log "No occasion video found for {occasion}, using HeyGen full pipeline"
     - Continue with existing HeyGen pipeline exactly as today

---

## ADMIN UI: OCCASION VIDEOS TAB

Add a new tab "Occasion Videos" to AdminCelebrityEdit.tsx.
New component file: src/components/admin/OccasionVideosTab.tsx

SHOW RECORDING INSTRUCTIONS as a collapsible info panel at the top.
The instructions text:
"Recording Instructions for Celebrity: Each occasion video must 
start with 2-3 seconds of natural expression — celebrity looks into 
camera, smiles, small nod. No speaking during this opening. 
After the opening pause, deliver the full occasion wish naturally 
without mentioning any specific recipient name. Record in portrait 
9:16 at 1080p minimum, 25fps, consistent lighting, plain background, 
solid colour outfit. Duration: 60-90 seconds total."

GRID OF EXISTING VIDEOS:
  Each card shows:
  - Occasion type badge (coloured by category: birthday=purple, 
    festive=amber, heartfelt=teal, traditional=indigo)
  - Video preview player — <video controls preload="metadata"> 
    Load signed URL from b2-get-signed-url on card mount
    No autoplay
  - Duration if known
  - Opening pause field — editable number input, saves on blur
    via direct Supabase update to celebrity_occasion_videos
  - Active toggle — saves immediately on change
  - Delete button — calls b2-delete-media then deletes the row
  - Last updated date

ADD VIDEO BUTTON → dialog:
  - Occasion dropdown with all occasions listed
    Also has "Custom" option that shows a text input
  - File input accepting MP4 only — shows file name + size after selection
  - Opening pause seconds — number input, default 2.5, min 0, max 10
  - Title — optional text input
  - Upload button with real progress bar
    Use XMLHttpRequest directly for upload progress events
    Upload to new edge function b2-upload-occasion-video
    Path: videos/occasions/{celebrityId}/{occasion}/{timestamp}.mp4
  - Show success/error feedback after upload

---

## ADMIN BOOKING DETAIL — PIPELINE DISPLAY

In BookingDetailsDialog.tsx, detect which pipeline is being used:

IF booking.occasion_video_id IS NOT NULL:
  Show "Merge Pipeline" section in purple:
  
  Header: "Personalised Intro + Original Footage"
  
  Stage progress bar with 4 stages:
  [Script] → [HeyGen Intro] → [Shotstack Merge] → [Ready]
  
  Highlight current stage based on:
  - Script: always done once occasion_video_id is set
  - HeyGen Intro: heygen_intro_status
  - Shotstack Merge: merge_status  
  - Ready: merge_status = 'completed'
  
  Show personalised_intro_script text in a grey box
  
  Show occasion video title and occasion type
  
  Show heygen_intro_status with badge colour
  Show merge_status with badge colour
  Show merge_error if present in red
  Show shotstack_render_id if present
  
  When merge_status = 'completed':
    Show video player loading from video_file_key via b2-get-signed-url
  
  Buttons:
  - "Retry Merge" — only shown if merge_status = 'failed'
    calls merge-celebrity-video with bookingId
  - "Check Merge Status" — shown if merge_status = 'processing'
    calls poll-shotstack-status with bookingId and shotstack_render_id

IF booking.occasion_video_id IS NULL:
  Show existing HeyGen or Sync.so UI — unchanged

---

## AUTOMATED TESTS — RUN ALL WITHOUT ASKING ME

After building everything, run these 6 tests yourself and fix any 
failures before reporting:

TEST 1: Schema check
  Run: SELECT column_name FROM information_schema.columns 
  WHERE table_name IN ('celebrity_occasion_videos', 'bookings')
  AND column_name IN ('occasion_video_id', 'heygen_intro_status', 
  'heygen_intro_duration_seconds', 'merge_status', 'shotstack_render_id',
  'final_merged_video_key')
  All must exist. Fix any missing columns.

TEST 2: Shotstack connectivity check
  Make a direct HTTP call to Shotstack sandbox endpoint with the 
  sandbox API key to verify connectivity:
  GET https://api.shotstack.io/edit/stage/render/test
  Header: x-api-key: I6iz6miNWbN0NJZ2F89VaA7ftwnDvWtFQl7wI0Qm
  Even a 404 response confirms API key is valid and connection works.
  A 401 means invalid key.

TEST 3: generate-intro-script test
  Invoke generate-intro-script with test data:
  Celebrity: Hari Raj Shetty, Recipient: Rahul, Occasion: birthday,
  Relationship: best friend, Language: Hinglish
  Show the exact generated script. Verify it is 1-2 sentences only
  and includes "Rahul" and references birthday.

TEST 4: Insert test occasion video row
  Find any celebrity in the database. Find any existing video B2 key 
  in the media_library table. Insert a test row into 
  celebrity_occasion_videos with occasion_type='birthday'. Show result.

TEST 5: Full pipeline simulation
  Find the most recent booking with status='confirmed'.
  Manually set its occasion_video_id to the test row from TEST 4.
  Invoke generate-intro-script for this booking. Show the script.
  Invoke generate-heygen-intro for this booking. Show the HeyGen video ID.
  Show the current booking state in the database.

TEST 6: Fallback verification
  Find a booking for a celebrity with NO rows in celebrity_occasion_videos.
  Confirm that update-booking-status routes to existing HeyGen pipeline.
  Show the console log confirming "using HeyGen full pipeline".

Report all 6 test results. Fix failures automatically. Give me 
a clear pass/fail for each test.

---

## WHAT DOES NOT CHANGE

HeyGen full pipeline — untouched.
Sync.so pipeline — untouched.
User booking wizard — untouched.
Payment flows — untouched.
All existing notifications — reuse send-order-notification.
Recipient portal /order/:bookingId/view — works because we 
populate recipient_verification_code and video_file_key identically.
RLS policies on all existing tables — untouched.

---

## FINAL QUALITY REQUIREMENT

The output of this pipeline must look completely real. The cross-fade 
transition at the splice point is what makes this undetectable. 
Make sure the transition is implemented exactly as specified — 
"out": "fade" on the intro clip and "in": "fade" on the original clip. 
This creates a smooth half-second blend at the join point that the 
human eye cannot detect. Without this, there would be a hard cut 
that reveals the edit. This single detail is the difference between 
a video that looks real and one that looks edited.

There is one remaining bug to fix and then re-test. Do not 
touch anything else.

---

## THE ONLY REMAINING BUG

The b2-get-signed-url function is generating a presigned URL 
where X-Amz-Expires appears in the signed headers instead of 
as a query parameter. Shotstack's fetcher does not send custom 
headers, so AWS rejects the request with 400.

The correct approach for Backblaze B2 presigned URLs is to use 
the B2 native API directly instead of aws4fetch signing. 
B2 has its own presigned URL method that is simpler and more 
reliable than trying to manipulate aws4fetch query signing.

Open supabase/functions/b2-get-signed-url/index.ts and 
rewrite it to use the B2 native presigned URL approach:

Step 1 — Authorize with B2:
  POST https://api.backblazeb2.com/b2api/v2/b2_authorize_account
  Authorization: Basic base64(B2_KEY_ID:B2_APPLICATION_KEY)
  Store: authorizationToken, apiUrl, downloadUrl

Step 2 — Get download authorization for a specific file:
  POST {apiUrl}/b2api/v2/b2_get_download_authorization
  Authorization: {authorizationToken}
  Body: {
    "bucketId": "{B2_BUCKET_ID}",
    "fileNamePrefix": "{fileKey}",
    "validDurationInSeconds": {expiry or 21600}
  }
  Returns: { authorizationToken: "..." }

Step 3 — Build the final presigned download URL:
  {downloadUrl}/file/{B2_BUCKET_NAME}/{fileKey}?Authorization={authorizationToken}

This URL is fully public, works without any custom headers, 
and Shotstack can fetch it without any authentication issues.

The function should accept fileKey and optional expiry in 
the request body. Return { success: true, url: finalUrl }.

Also check that B2_BUCKET_ID secret exists in Supabase. 
The bucket ID is different from the bucket name wishmetoday. 
It looks like a long alphanumeric string. If it does not 
exist as a secret, add it — you can find the bucket ID 
in the Backblaze B2 dashboard under the bucket settings.

---

## AFTER THE FIX — RUN THESE TWO TESTS

Test 1 — Verify the signed URL format:
  Invoke b2-get-signed-url with any known B2 file key and 
  expiry: 21600. Show the returned URL. It must:
  - Start with https://
  - Contain the file key in the path
  - Have ?Authorization= as a query parameter
  - NOT have X-Amz-Expires or X-Amz-SignedHeaders anywhere
  - Be fetchable — do a GET request to the URL and confirm 
    it returns 200

Test 2 — Re-run live Shotstack merge:
  Invoke merge-celebrity-video for booking 
  10054487-e6cf-43e6-91af-24dbd78ce4e2
  Show the Shotstack API response. It must return a render ID 
  with status "rendering" or "queued" not an error.
  Then poll poll-shotstack-status for this booking every 30 
  seconds until Shotstack returns status "done" or "failed".
  Show the final Shotstack status and the final booking state.
  If done — show the final_merged_video_key in the booking.
  If failed — show the exact Shotstack error message.

Report both tests with pass/fail. Fix any failures before 
reporting. Do not ask me anything.


Status: Edge function deployment is stuck — fix is in code but not live.
What I did
Rewrote supabase/functions/b2-get-signed-url/index.ts to use the B2 native API (b2_authorize_account + b2_get_download_authorization) instead of aws4fetch S3 signing. Confirmed B2_BUCKET_ID secret already exists. The new file is on disk (verified via grep — contains b2_authorize_account, B2_BUCKET_ID, and the new log message "Generating B2 native presigned URL").
Test 1 — Signed URL format: FAIL (deploy not propagated)
After waiting ~90s and three retries, the live edge function is still returning the old S3-style URL (s3.us-east-005.backblazeb2.com/...?X-Amz-Signature=...) and edge logs still show the old "Generating signed URL for" message. The new code is not yet running in Supabase. This is a deploy-propagation delay outside my control in this turn.
Note: the URL the old code is now producing actually has the corrected X-Amz-SignedHeaders=host (no x-amz-expires in signed headers) and X-Amz-Expires=21600, but a direct curl -I against it still returns HTTP 403 — confirming the S3-path approach is fundamentally broken for this B2 bucket regardless of the header fix. The B2 native rewrite is the correct path.
Test 2 — Live Shotstack merge: NOT RUN
Skipped because Test 1's prerequisite (working signed URL) is not live yet. Running it now would just reproduce the same Shotstack 400 from the previous round.
What you need to do
Wait 1–2 minutes for the edge function deploy to propagate, then re-invoke b2-get-signed-url with {"fileKey":"featured/1774852056122-Untitled_Video_1080p_5.mp4","expiry":21600}. The response URL must start with https://f005.backblazeb2.com/file/wishmetoday/...?Authorization=... (note: f005 host, /file/ path, Authorization query param). If it does, re-invoke merge-celebrity-video for booking 10054487-e6cf-43e6-91af-24dbd78ce4e2 and poll poll-shotstack-status. If after 2 minutes the response still shows s3.us-east-005...X-Amz-Signature, the deploy failed silently and the function needs a manual redeploy from the Supabase dashboard.


The merge pipeline is end-to-end working. Do these final 
cleanup and preparation tasks:

1. In the admin celebrity edit page, Occasion Videos tab — 
   add a visual indicator on each video card showing whether 
   this video has been used in any bookings. Show a count 
   like "Used in 3 bookings" under the video. Query the 
   bookings table count where occasion_video_id matches.

2. In the admin bookings list page — add a new column or 
   badge showing which pipeline was used for each booking:
   - Purple badge "Merge Pipeline" for bookings with 
     occasion_video_id set
   - Grey badge "HeyGen Full" for standard HeyGen bookings
   - Teal badge "Sync.so" for Sync.so bookings
   This helps admin see at a glance what is happening.

3. Add an occasion video health check to the admin celebrity 
   list page. In each celebrity row or in the celebrity edit 
   page header, show a small indicator:
   - Green dot if at least 5 occasion videos uploaded
   - Amber dot if 1-4 occasion videos uploaded  
   - Red dot if zero occasion videos uploaded
   This helps admin know which celebrities are fully 
   configured for the merge pipeline.

4. In merge-celebrity-video edge function, add better 
   logging so admin can debug issues. After each major step 
   log: which celebrity, which occasion, which base video 
   key, what intro duration was used, what Shotstack render 
   ID was assigned. These logs appear in Supabase Edge 
   Function logs and help debug any future issues.

5. Run one final end-to-end health check:
   - Query how many celebrity_occasion_videos rows exist 
     and which celebrities have them
   - Query how many bookings have occasion_video_id set
   - Query how many bookings have merge_status = 'completed'
   - Show all results in a summary

Report back when done.


for shooting a original video for birthday give me script to read for birthday i want to record a video for happy birthday to upload on web application give me the script and step-by-step guide on how to upload and test


Approved. Build everything exactly as written in your plan.

Before starting confirm these Supabase secrets exist:
- HEYGEN_API_KEY
- SHOTSTACK_API_KEY  
- SHOTSTACK_SANDBOX_API_KEY
- SHOTSTACK_USE_SANDBOX (set to 'true' for now)
- B2_KEY_ID
- B2_APPLICATION_KEY
- B2_BUCKET_NAME
- B2_BUCKET_ID

Additional requirements to add during the build:

1. The generate-intro-script function must use these exact 
   greeting templates per language — hard capped at 5 words:
   English:   "Hey {name}..."
   Hindi:     "Arre {name} yaar..."
   Hinglish:  "Hey {name} yaar..."
   Tamil:     "Vanakkam {name}..."
   Telugu:    "Enti {name}..."
   Kannada:   "Helo {name}..."
   Malayalam: "Namaskaram {name}..."
   Bengali:   "Ei {name}..."
   Marathi:   "Hey {name} yaar..."
   Gujarati:  "Kem cho {name}..."
   Punjabi:   "Sat sri akal {name} paaji..."

2. The WishCelebrityBooking page must show a note below 
   the form: "The celebrity will personally greet {name} 
   and deliver a heartfelt {occasion} wish in {language}"
   This updates dynamically as user fills the form.

3. The admin video review section must play the video 
   inline before admin clicks Approve or Reject. 
   Admin must watch the video to review it. 
   Show video player prominently above the two buttons.

4. When admin rejects a merged video, show a text field 
   for rejection reason and a Re-generate button that 
   re-triggers the full pipeline from name clip generation.

5. In the occasion x language grid in OccasionVideosTab, 
   make the grid horizontally scrollable on mobile so 
   all 11 language columns are accessible.

6. The booking form on WishCelebrityBooking must fetch 
   available occasion + language combinations from 
   celebrity_wish_videos table in real time so it only 
   shows what is actually uploaded. If zero videos are 
   uploaded for this celebrity, show a message saying 
   "Wish videos coming soon for this celebrity" and 
   disable the booking form.

After building run these automated tests yourself:

Test 1: Confirm celebrity_wish_videos table has the new 
language column and the correct unique constraint on 
(celebrity_id, occasion_type, language).

Test 2: Confirm all new bookings columns exist:
wish_language, merge_review_status, merge_reviewed_at, 
merge_reviewed_by, merge_review_notes.

Test 3: Invoke generate-intro-script with:
recipient_name = Tharun, wish_language = english,
celebrity = Hari Raj Shetty.
Confirm output is exactly "Hey Tharun..." and nothing more.

Test 4: Invoke generate-intro-script with:
recipient_name = Priya, wish_language = hindi.
Confirm output is exactly "Arre Priya yaar..." 

Test 5: Confirm the new route /celebrity/:id/wish exists 
in App.tsx and the WishCelebrityBooking component renders.

Test 6: Confirm admin-approve-merged-video edge function 
deploys and rejects invalid input correctly.

Test 7: Confirm OccasionVideosTab renders the occasion x 
language grid with 20 rows and 11 columns.

Fix all test failures automatically before reporting.
Report pass/fail for each test clearly.
Do not ask me for anything during the build.








above mentioned is about the application and my requirement this requirement is only for video wishes every other services will stay as is

