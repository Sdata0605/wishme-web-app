# WishMe — Claude Code Agent System & Production Readiness Master Plan

> **Purpose:** Complete guide to set up Claude Code sub-agents and run a phased audit, debug,
> and production-hardening process for WishMe (wishme.today).
> **Approach:** Slow, methodical, deep — one phase at a time. Each agent is a specialist. Nothing is skipped.

---

## HOW THIS WORKS

You create **10 specialist agents** inside Claude Code. Each agent has its own system prompt,
tool access, and domain expertise. You then run them in sequence through **6 phases**.
Each phase has a ready-to-paste prompt you give to Claude Code.

Complete each phase fully before moving to the next. Each phase ends with a written report.

---

## PART 1 — THE 10 AGENTS

Agent files live in `.claude/agents/`. See that directory for the full system prompts.

| # | Agent Name | Domain | Color |
|---|-----------|--------|-------|
| 1 | `database-architect` | PostgreSQL, RLS, triggers, migrations | Blue |
| 2 | `edge-function-engineer` | All 82 Deno edge functions | Purple |
| 3 | `frontend-security-auditor` | React/TS security, XSS, auth | Red |
| 4 | `payment-auditor` | Razorpay, wallet, TDS, commissions | Green |
| 5 | `pipeline-engineer` | HeyGen + Shotstack video pipeline | Amber |
| 6 | `performance-engineer` | Bundle, queries, Core Web Vitals | Teal |
| 7 | `notification-auditor` | 53+ events, email/SMS/WhatsApp | Pink |
| 8 | `api-health-checker` | All external API integrations | Orange |
| 9 | `ux-auditor` | Admin UI, user flows, completeness | Indigo |
| 10 | `production-officer` | Final pre-launch checklist | Gray |

---

## PART 2 — THE 6 PHASES

### PHASE 1 — Database Audit
**Agent:** `database-architect` | **Output:** `PHASE1_DATABASE_REPORT.md`

Paste into Claude Code:
```
Use agent database-architect.

Phase 1: Complete database audit. Work autonomously without asking me anything.

STEP 1 — SCHEMA INVENTORY
List all public tables with column counts.

STEP 2 — RLS AUDIT
Find every table with rls_enabled=false that contains user data. Flag as CRITICAL.

STEP 3 — POLICY AUDIT
List all RLS policies. Verify no policy uses auth.uid() directly (must use get_my_profile_id()).
Verify admins checked via is_admin_by_auth_uid().

STEP 4 — TRIGGER AUDIT
List all triggers. Verify critical chains:
- wallet_transactions INSERT/UPDATE completed/approved → update_wallet_balance
- bookings status=confirmed → calculate_booking_commission
- bookings status=completed → process_referral_commissions
- messages INSERT → handle_auto_reply_on_message

STEP 5 — INDEX AUDIT
Check indexes exist on: bookings(celebrity_id, user_id, status, merge_status, heygen_intro_status),
celebrity_occasion_videos(celebrity_id, occasion_type, language, is_active),
wallet_transactions(user_id, status), messages(conversation_id).

STEP 6 — FINANCIAL INTEGRITY
Check wallet balance consistency: stored balance vs sum of transactions for all users.
Any discrepancy = CRITICAL.

STEP 7 — COLUMN AUDIT
Check bookings has: wish_language, merge_review_status, merge_reviewed_at, merge_reviewed_by, merge_review_notes.
Check celebrity_occasion_videos has: language column.
Missing columns = HIGH severity.

STEP 8 — WRITE REPORT
Create PHASE1_DATABASE_REPORT.md with executive summary, every CRITICAL/HIGH issue with exact SQL fix.
Tell me Phase 1 is complete.
```

---

### PHASE 2 — Edge Function Deep Audit
**Agent:** `edge-function-engineer` | **Output:** `PHASE2_EDGE_FUNCTIONS_REPORT.md`

Paste into Claude Code:
```
Use agent edge-function-engineer.

Phase 2: Complete audit of all 82 edge functions. Work autonomously.

STEP 1 — INVENTORY: List all functions. Categorize by type.

STEP 2 — CONFIG: Read supabase/config.toml. verify_jwt=false ONLY on heygen-webhook, vapi-webhook,
process-scheduled-*. Any others = CRITICAL.

STEP 3 — MERGE PIPELINE: Read generate-intro-script, generate-heygen-intro, merge-celebrity-video,
poll-shotstack-status, archive-shotstack-to-b2, admin-approve-merged-video.
Verify: B2 signed URLs use b2_authorize_account NOT aws4fetch. Shotstack has transcode:true + fade transitions.
admin-approve does NOT auto-deliver (requires admin review). recipient_verification_code generated post-merge.

STEP 4 — CRON: Read auto-poll-syncso. Verify 3 sweeps: intro polling, merge trigger, shotstack polling.

STEP 5 — PAYMENT: Read verify-razorpay-payment. Verify HMAC-SHA256. No double-processing.

STEP 6 — B2 SIGNED URL: Read b2-get-signed-url. Must use b2_authorize_account + b2_get_download_authorization.
If still uses aws4fetch = CRITICAL.

STEP 7 — ERROR HANDLING: Every function has try/catch? Returns correct HTTP codes? Logs before returning?

STEP 8 — WRITE REPORT: PHASE2_EDGE_FUNCTIONS_REPORT.md. Per-function: OK / WARNING / BROKEN.
Tell me Phase 2 is complete.
```

---

### PHASE 3 — Frontend & Security Audit
**Agents:** `frontend-security-auditor` then `ux-auditor`
**Outputs:** `PHASE3A_SECURITY_REPORT.md`, `PHASE3B_UX_REPORT.md`

Phase 3A paste:
```
Use agent frontend-security-auditor.

Phase 3a: Frontend security audit. Work autonomously.

STEP 1 — SCAN: Search src/ for dangerouslySetInnerHTML, eval(, hardcoded non-public keys, console.log with PII.

STEP 2 — DEV TOOLS: Check App.tsx — /populate-celebrities, /populate-indian-celebrities,
/generate-video-messages behind AdminLayout? If not: CRITICAL.

STEP 3 — AUTH: Read useAuth.tsx + ProtectedRoute.tsx. No flash of protected content. Clean session handling.

STEP 4 — PAYMENT CLIENT-SIDE: Is final_price validated server-side or client-only? Can user manipulate price?

STEP 5 — INPUT VALIDATION: Check all forms for max length, file type/size limits, recipient name validation.

STEP 6 — ERROR BOUNDARY: Verify ErrorBoundary at app root (App.tsx). Correct if incomplete.

STEP 7 — BUILD: Check vite.config.ts for source maps in production.

STEP 8 — REPORT: PHASE3A_SECURITY_REPORT.md. Apply all CRITICAL fixes. Tell me 3a is complete.
```

Phase 3B paste:
```
Use agent ux-auditor.

Phase 3b: Admin and user flow UX audit. Work autonomously.

STEP 1 — /celebrity/:id/wish: Read WishCelebrityBooking.tsx. Verify real-time occasion/language fetch,
dynamic filtering, zero-state graceful message, price display, route in App.tsx.

STEP 2 — ADMIN BOOKING DETAIL: Read BookingDetailsDialog. occasion_video_id → Merge Pipeline purple badge
+ 4-stage progress. lipsync_provider=syncso → Sync.so section. Default → HeyGen.

STEP 3 — VIDEO REVIEW: Find VideoPipelineTab. Verify: merge_status=completed + merge_review_status=pending list,
video player shown before buttons, approve/reject with notes, re-generate after rejection.

STEP 4 — OCCASION VIDEOS TAB: Read OccasionVideosTab. 20x11 grid, green/grey cells, upload progress,
"X of 220 uploaded" header, mobile scrollable.

STEP 5 — BOOKING LIST BADGES: Purple/Grey/Teal pipeline badges in admin bookings list.

STEP 6 — CELEBRITY PROFILE: "Book a Wish" button links to /celebrity/:id/wish.

STEP 7 — REPORT: PHASE3B_UX_REPORT.md. Implement every gap found. Tell me 3b is complete.
```

---

### PHASE 4 — Payment & Pipeline Integrity
**Agents:** `payment-auditor` then `pipeline-engineer`
**Outputs:** `PHASE4A_PAYMENT_REPORT.md`, `PHASE4B_PIPELINE_REPORT.md`

Phase 4A paste:
```
Use agent payment-auditor.

Phase 4a: Financial integrity audit. Work autonomously.

STEP 1 — TRACE REAL BOOKING: Find most recent completed booking. Verify math:
final_price = celebrity_commission + platform_fee. TDS 10% (PAN) or 20% (no PAN). L1+L2 commissions correct.

STEP 2 — WALLET DOUBLE-SPEND: Row-level lock on debit? Atomic debit + booking creation? Crash safety?

STEP 3 — RAZORPAY HMAC: Verify signature check = hmac_sha256(order_id+|+payment_id, KEY_SECRET). Duplicate guard?

STEP 4 — MANUAL APPROVAL: Can admin approve same wallet transaction twice? Status guard in place?

STEP 5 — PAYOUT: TDS deducted before payout? available_balance decremented on approval?

STEP 6 — REPORT: PHASE4A_PAYMENT_REPORT.md. Every inconsistency with exact fix. Tell me 4a is complete.
```

Phase 4B paste:
```
Use agent pipeline-engineer.

Phase 4b: Video pipeline reliability audit. Work autonomously.

STEP 1 — STATE INVENTORY: Query all bookings in active pipeline states grouped by pipeline type and status.

STEP 2 — STUCK BOOKINGS: Find heygen_intro_status=processing or merge_status=processing older than 2 hours.
Determine root cause. Fix or flag for manual intervention.

STEP 3 — CRON SWEEPS: Read auto-poll-syncso. All 3 sweeps present? If missing, implement.

STEP 4 — SHOTSTACK CALL: For most recent booking with shotstack_render_id, invoke poll-shotstack-status. Show response.

STEP 5 — REVIEW GATE: poll-shotstack-status must NOT set video_status=completed. Must set merge_review_status=pending.

STEP 6 — FALLBACK: Celebrity with no occasion videos → confirm routes to HeyGen full pipeline.

STEP 7 — REPORT: PHASE4B_PIPELINE_REPORT.md. All stuck bookings resolved. Tell me 4b is complete.
```

---

### PHASE 5 — Performance & API Health
**Agents:** `performance-engineer` then `api-health-checker`
**Outputs:** `PHASE5A_PERFORMANCE_REPORT.md`, `PHASE5B_API_HEALTH_REPORT.md`

Phase 5A paste:
```
Use agent performance-engineer.

Phase 5a: Performance audit. Work autonomously.

STEP 1 — BUILD: Run npm run build. Flag chunks >500KB.

STEP 2 — QUERIES: EXPLAIN ANALYZE on top 3 admin queries. Identify missing indexes.

STEP 3 — REACT QUERY: Find useQuery hooks missing staleTime. Every query needs appropriate config.

STEP 4 — SEQ SCANS: Find tables with high seq_scan in pg_stat_user_tables. Add missing indexes.

STEP 5 — CRITICAL INDEX: Ensure idx_celebrity_occasion_videos_lookup exists on
celebrity_occasion_videos(celebrity_id, occasion_type, language, is_active) WHERE is_active=true.

STEP 6 — REPORT: PHASE5A_PERFORMANCE_REPORT.md. Bundle sizes, indexes added, estimated improvements.
Tell me 5a is complete.
```

Phase 5B paste:
```
Use agent api-health-checker.

Phase 5b: API integrations health check. Work autonomously.

STEP 1 — SECRETS: Run supabase secrets list. Verify all 15 required secrets present. Missing = CRITICAL.
Required: HEYGEN_API_KEY, ELEVENLABS_API_KEY, VAPI_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
RESEND_API_KEY, MSG91_AUTH_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID,
B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_BUCKET_ID,
SHOTSTACK_API_KEY, SHOTSTACK_SANDBOX_API_KEY, SHOTSTACK_USE_SANDBOX.

STEP 2 — B2 TEST: Invoke b2-get-signed-url with a known file key and expiry=21600.
Verify URL format. curl -I to confirm HTTP 200.

STEP 3 — HEYGEN: Check recent logs for error patterns.

STEP 4 — SHOTSTACK: Test sandbox API key connectivity. 404 on test ID = key valid. 401 = invalid.

STEP 5 — NOTIFICATIONS: Query message_logs last 24h grouped by channel+status. High failure = investigate.

STEP 6 — REPORT: PHASE5B_API_HEALTH_REPORT.md. All test results. Tell me 5b is complete.
```

---

### PHASE 6 — Production Readiness Final Check
**Agent:** `production-officer`
**Outputs:** `PRODUCTION_LAUNCH_CHECKLIST.md`, `FINAL_PRODUCTION_READINESS_REPORT.md`

Paste:
```
Use agent production-officer.

Phase 6: Final production readiness gate. Work autonomously.

STEP 1 — REVIEW ALL REPORTS: Read PHASE1 through PHASE5 reports. List every unresolved issue.

STEP 2 — DEV TOOLS: Wrap /populate-celebrities, /populate-indian-celebrities, /generate-video-messages
in AdminLayout in App.tsx if not already done.

STEP 3 — HOMEPAGE SEED: Read Index.tsx. Remove or gate any call to insert-sample-celebrity.

STEP 4 — CONSOLE.LOG: Find in supabase/functions/ any log outputting emails, amounts, keys, or PII. Remove.

STEP 5 — SHOTSTACK PRODUCTION: Check SHOTSTACK_USE_SANDBOX. If true, note manual action required to switch.

STEP 6 — E2E TRACE: Find celebrity with heygen_avatar_id, heygen_voice_id, active celebrity_occasion_videos.
Trace most recent booking through full pipeline. Verify final video accessible.

STEP 7 — CONSENT: SELECT id, name, consent_status FROM celebrities WHERE is_active=true AND consent_status!='approved'.
Any result = LEGAL RISK.

STEP 8 — SUPABASE PLAN: Verify paid plan (free tier pauses — fatal for production).

STEP 9 — CREATE PRODUCTION_LAUNCH_CHECKLIST.md

STEP 10 — CREATE FINAL_PRODUCTION_READINESS_REPORT.md with READY / NOT READY verdict,
CRITICAL/HIGH/MEDIUM/LOW counts, what was auto-fixed, what requires manual action.
Tell me Phase 6 is complete and whether the platform is READY or NOT READY.
```

---

## PART 3 — QUICK REFERENCE

### Which agent for specific issues

| Symptom | Agent |
|---------|-------|
| Wallet balance wrong | `payment-auditor` |
| Pipeline stuck / video not generating | `pipeline-engineer` |
| Edge function errors | `edge-function-engineer` |
| Admin UI broken | `ux-auditor` |
| Slow page load | `performance-engineer` |
| B2 signed URL failing | `api-health-checker` |
| RLS / data exposure | `database-architect` |
| Notification not sending | `notification-auditor` |
| Security vulnerability | `frontend-security-auditor` |
| Pre-launch sign-off | `production-officer` |

### Targeted fix template

```
Use agent pipeline-engineer.
Booking ID: {booking-id}
Find out exactly why it is stuck. Query the booking state. Determine which step failed.
Fix it and get the pipeline moving again. Report what happened and how you fixed it.
```

---

## PART 4 — TIMELINE

| Phase | Agent(s) | Est. Time | Deliverable |
|-------|----------|-----------|-------------|
| Phase 1 | database-architect | 2-4h | PHASE1_DATABASE_REPORT.md |
| Phase 2 | edge-function-engineer | 3-5h | PHASE2_EDGE_FUNCTIONS_REPORT.md |
| Phase 3 | frontend-security-auditor + ux-auditor | 3-4h | PHASE3A + 3B reports |
| Phase 4 | payment-auditor + pipeline-engineer | 3-5h | PHASE4A + 4B reports |
| Phase 5 | performance-engineer + api-health-checker | 2-3h | PHASE5A + 5B reports |
| Phase 6 | production-officer | 2-3h | Launch checklist + final report |
| **Total** | | **15-24h** | **Production Ready** |

---

*One phase per session. Agents read actual code — never guess. Auto-fix CRITICAL issues.
Manual steps: Supabase secrets, Shotstack production key, celebrity consents.*
