import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const b2KeyId = Deno.env.get('B2_KEY_ID');
  const b2AppKey = Deno.env.get('B2_APPLICATION_KEY');
  const b2BucketName = Deno.env.get('B2_BUCKET_NAME') || 'wishmetoday';
  const b2Endpoint = Deno.env.get('B2_ENDPOINT') || 's3.us-east-005.backblazeb2.com';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();
    console.log('HeyGen webhook received:', JSON.stringify(payload));

    const eventType = payload.event_type;
    const eventData = payload.event_data || {};
    const callbackId = payload.callback_id; // This is our bookingId

    if (!eventType) {
      console.log('No event_type in payload, ignoring');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const videoId = eventData.video_id;

    // Find booking by callback_id (bookingId) or heygen_video_id
    let bookingQuery = supabase
      .from('bookings')
      .select('id, heygen_video_id, video_status, generation_status, video_file_key');

    if (callbackId) {
      bookingQuery = bookingQuery.eq('id', callbackId);
    } else if (videoId) {
      bookingQuery = bookingQuery.eq('heygen_video_id', videoId);
    } else {
      console.log('No callback_id or video_id found, cannot match booking');
      return new Response(JSON.stringify({ received: true, matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: booking, error: bookingError } = await bookingQuery.maybeSingle();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError?.message || 'No match');
      return new Response(JSON.stringify({ received: true, matched: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Matched booking:', booking.id, 'Current status:', booking.generation_status);

    // Skip if already completed
    if (booking.video_status === 'ready' && booking.video_file_key) {
      console.log('Booking already has video ready, skipping');
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (eventType === 'avatar_video.success') {
      const videoUrl = eventData.url;
      if (!videoUrl) {
        console.error('No video URL in success event');
        return new Response(JSON.stringify({ received: true, error: 'no_url' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      console.log('Video completed! Downloading from:', videoUrl);

      // Update status to downloading
      await supabase.from('bookings').update({ generation_status: 'downloading' }).eq('id', booking.id);

      // Download video
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }
      const videoBuffer = await videoResponse.arrayBuffer();
      console.log('Downloaded video, size:', videoBuffer.byteLength, 'bytes');

      // Upload to B2
      await supabase.from('bookings').update({ generation_status: 'uploading' }).eq('id', booking.id);

      if (!b2KeyId || !b2AppKey) {
        throw new Error('B2 credentials not configured');
      }

      const aws = new AwsClient({
        accessKeyId: b2KeyId,
        secretAccessKey: b2AppKey,
        service: 's3',
        region: 'us-east-005',
      });

      const timestamp = Date.now();
      const fileKey = `orders/video_wish/${booking.id}/${timestamp}-celebrity-video.mp4`;
      const uploadUrl = `https://${b2Endpoint}/${b2BucketName}/${fileKey}`;

      const uploadResponse = await aws.fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'x-amz-acl': 'public-read' },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        throw new Error(`B2 upload failed: ${uploadError}`);
      }

      console.log('Uploaded to B2:', fileKey);

      // Generate verification code
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      let isUnique = false;
      while (!isUnique) {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        code = Array.from(bytes).map(b => charset[b % charset.length]).join('').slice(0, 8);
        const { data: existing } = await supabase
          .from('bookings')
          .select('id')
          .eq('recipient_verification_code', code)
          .maybeSingle();
        if (!existing) isUnique = true;
      }

      // Update booking
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          video_file_key: fileKey,
          video_status: 'ready',
          generation_status: 'completed',
          generation_error: null,
          recipient_verification_code: code,
          completed_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Error updating booking:', updateError);
      }

      console.log('Booking updated. Video ready. Verification code:', code);

      // NOTE: Do NOT send notification here. Video delivery is gated by admin approval.
      // Admin must click "Send Video" to trigger send-order-notification.
      console.log('Video ready for admin review. No auto-notification sent.');

      return new Response(JSON.stringify({ received: true, status: 'completed', bookingId: booking.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else if (eventType === 'avatar_video.fail') {
      const errorMsg = eventData.error || eventData.message || 'HeyGen video generation failed';
      console.error('Video generation failed:', errorMsg);

      await supabase
        .from('bookings')
        .update({
          generation_status: 'failed',
          generation_error: errorMsg,
          video_status: 'failed',
        })
        .eq('id', booking.id);

      return new Response(JSON.stringify({ received: true, status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } else {
      console.log('Unhandled event type:', eventType);
      return new Response(JSON.stringify({ received: true, unhandled: eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    // Always return 200 to prevent HeyGen retries
    return new Response(JSON.stringify({ received: true, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
