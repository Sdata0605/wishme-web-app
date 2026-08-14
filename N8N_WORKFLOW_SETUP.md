# N8N Workflow Setup Guide

## Complete Video Generation Workflow for Wishme Platform

### 📋 Prerequisites
1. Active n8n Cloud account (or self-hosted n8n instance)
2. HeyGen API key with video generation permissions
3. Access to Supabase edge function: `update-booking-video`

---

## 🚀 Step 1: Import the Workflow

1. **Download the workflow file:** `n8n-workflow-corrected.json`
2. **Open n8n** and go to **Workflows**
3. Click **"Import from File"**
4. Select the downloaded JSON file
5. Click **"Import"**

---

## 🔧 Step 2: Configure Environment Variables

In n8n, go to **Settings → Environment Variables** and add:

```
HEYGEN_API_KEY=sk_V2_hgu_kLi0AdJfabv_XkQG2RQHZjuKBqpBDlaB0sMviJ4jDQxO
```

---

## 📊 Step 3: Understanding the Workflow

### Workflow Flow:
```
1. Webhook Trigger (POST /start1)
   ↓
2. Generate Video with HeyGen API
   ↓
3. Wait 2 Minutes (for video processing)
   ↓
4. Check Video Status
   ↓
5. Is Video Completed? (Conditional)
   ├─ YES → Send Completed Update (with video URL)
   └─ NO  → Send Processing Status (video still generating)
```

### Key Improvements in This Workflow:

#### ✅ 1. **Dynamic Booking ID**
- **OLD:** Hardcoded booking_id
- **NEW:** `$node['Webhook'].json.body.booking_id` - Captures from webhook payload

#### ✅ 2. **Dynamic Video ID** 
- **OLD:** Hardcoded video_id in status check
- **NEW:** `$node['Generate Video with HeyGen'].json.data.video_id` - Uses generated video ID

#### ✅ 3. **Proper JSON Body Format**
- **OLD:** Body parameters with `=` prefix causing parse errors
- **NEW:** Clean JSON using `JSON.stringify()` for proper structure

#### ✅ 4. **Better Error Handling**
- Includes fallback for processing status
- Handles both completed and pending video states

---

## 🧪 Step 4: Testing the Workflow

### Test Webhook Payload:
```json
{
  "booking_id": "0968a3ca-e0c3-41fb-996e-feb1b20527fa",
  "customer_name": "Test User",
  "script": {
    "talking_points": "Hello! This is a test video message from your favorite celebrity. Thank you for your support!"
  },
  "celebrity": {
    "name": "Celebrity Name"
  }
}
```

### How to Test:
1. **Go to the Webhook node** in n8n
2. Click **"Listen for Test Event"**
3. **Copy the webhook URL** (e.g., `https://yourn8n.app.n8n.cloud/webhook-test/start1`)
4. **Use a tool like Postman** or curl to send a POST request:

```bash
curl -X POST 'https://yourn8n.app.n8n.cloud/webhook-test/start1' \
  -H 'Content-Type: application/json' \
  -d '{
    "booking_id": "0968a3ca-e0c3-41fb-996e-feb1b20527fa",
    "customer_name": "Test User",
    "script": {
      "talking_points": "Hello! This is a test video message."
    }
  }'
```

5. **Check n8n execution logs** to see each step
6. **Verify in Supabase** that booking video_file_key and video_status updated

---

## ✅ Step 5: Activate the Workflow

1. **Save the workflow** after configuration
2. **Toggle "Active" switch** in the top-right corner
3. **Production webhook URL:** `https://sdata0605.app.n8n.cloud/webhook/start1`

**CRITICAL:** Workflow must be **Active** for production webhook to work!

---

## 🔍 Step 6: Verify End-to-End Flow

### In Admin Dashboard:
1. Go to **Bookings** section
2. Find a booking with status = 'pending'
3. Click **"View Details"**
4. Click **"Confirm Order"**
5. **Monitor the workflow execution** in n8n
6. **Wait 2-3 minutes** for video generation
7. **Refresh the booking** - video should appear with playback

### In User Dashboard:
1. User navigates to **"My Bookings"**
2. **Confirmed bookings** show "Video is being created..."
3. After n8n completes, **video player appears automatically** with B2 signed URL

---

## 🐛 Troubleshooting

### Issue: "Booking not found" Error

**Cause:** booking_id not properly passed from webhook

**Fix:** 
- Check webhook payload includes `booking_id` field
- Verify n8n expression: `$node['Webhook'].json.body.booking_id`

### Issue: "Video ID hardcoded" Error

**Cause:** Check Video Status node using wrong video_id reference

**Fix:**
- Update query parameter to: `$node['Generate Video with HeyGen'].json.data.video_id`

### Issue: Video Stays in "pending" Forever

**Possible Causes:**
1. n8n workflow not Active
2. Webhook URL mismatch in admin dashboard
3. HeyGen API key invalid or rate limited
4. Video generation failed (check HeyGen logs)

**Fix:**
- Activate workflow in n8n
- Use correct production webhook URL
- Check edge function logs: `supabase functions logs update-booking-video`
- Verify HeyGen API quota

---

## 📝 Database Schema Reference

### bookings table (relevant fields):
```sql
- id: UUID (primary key) 
- video_file_key: TEXT (B2 storage path)
- video_status: TEXT ('pending' | 'ready')
- video_url: TEXT (temporary HeyGen URL for reference)
- heygen_video_id: TEXT
- status: TEXT ('pending' | 'confirmed' | 'completed')
```

---

## 🎬 Expected Timeline

1. **Admin confirms booking:** Instant webhook trigger
2. **HeyGen generates video:** 30-90 seconds
3. **n8n waits:** 2 minutes (configurable)
4. **Status check:** 5 seconds
5. **Download & upload to B2:** 10-30 seconds
6. **Database update:** 1-2 seconds
7. **User sees video:** Real-time via subscription

**Total time:** ~3-4 minutes from confirmation to video playback

---

## 🔗 Integration Points

### Admin Confirmation (update-booking-status):
```typescript
// Triggers n8n webhook when admin confirms
const webhookUrl = "https://sdata0605.app.n8n.cloud/webhook/start1";
const payload = {
  booking_id: booking.id,
  customer_name: customer.name,
  script: { talking_points: parsed.script }
};
```

### Edge Function (update-booking-video):
```typescript
// Receives callback from n8n after video generation
POST /update-booking-video
Body: {
  booking_id: "uuid",
  video_url: "heygen_temporary_url",
  heygen_video_id: "heygen_id"
}
```

### Frontend (B2VideoPlayer):
```tsx
// Displays video using B2 signed URLs
{booking.video_file_key && booking.video_status === 'ready' && (
  <B2VideoPlayer fileKey={booking.video_file_key} />
)}
```

---

## 📊 Monitoring & Logs

### Check n8n Execution Logs:
- Go to **Executions** tab in n8n
- Filter by workflow name
- View detailed step-by-step execution
- Check for errors in any node

### Check Supabase Edge Function Logs:
```bash
supabase functions logs update-booking-video
```

### Check Database Video Status:
```sql
SELECT id, status, video_status, video_file_key, heygen_video_id
FROM bookings 
WHERE id = 'booking_id_here';
```

---

## 🎯 Success Criteria

✅ Admin confirms booking → n8n triggered  
✅ HeyGen generates video successfully  
✅ Video uploaded to Backblaze B2  
✅ Database updated with video_file_key  
✅ User sees video player with B2 signed URL  
✅ Video plays without errors  

---

## 📞 Support

If issues persist:
1. Check all logs (n8n, Supabase, browser console)
2. Verify API keys and credentials
3. Test with a fresh booking
4. Review edge function code for recent changes

**Workflow Version:** 2.0 (Corrected)  
**Last Updated:** 2025-11-29
