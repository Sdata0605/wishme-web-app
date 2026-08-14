import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified single-check function — no recursive polling.
// Used by admin "Force Check Video Status" button only.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
  const b2KeyId = Deno.env.get('B2_KEY_ID');
  const b2AppKey = Deno.env.get('B2_APPLICATION_KEY');
  const b2BucketName = Deno.env.get('B2_BUCKET_NAME') || 'wishmetoday';
  const b2Endpoint = Deno.env.get('B2_ENDPOINT') || 's3.us-east-005.backblazeb2.com';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { bookingId, videoId } = await req.json();

    if (!bookingId || !videoId) {
      throw new Error('Missing required fields: bookingId and videoId');
    }
    if (!heygenApiKey) {
      throw new Error('HEYGEN_API_KEY not configured');
    }

    console.log(`Single check — Booking: ${bookingId}, Video: ${videoId}`);

    // One-shot status check
    const heygenResponse = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      { headers: { 'X-Api-Key': heygenApiKey, 'Accept': 'application/json' } }
    );

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      throw new Error(`HeyGen API error: ${errorText}`);
    }

    const heygenData = await heygenResponse.json();
    const status = heygenData.data?.status;
    const videoUrl = heygenData.data?.video_url;

    console.log('HeyGen status:', status);

    if (status === 'completed' && videoUrl) {
      // Download and upload to B2
      await supabase.from('bookings').update({ generation_status: 'downloading' }).eq('id', bookingId);

      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) throw new Error('Failed to download video from HeyGen');
      const videoBuffer = await videoResponse.arrayBuffer();

      await supabase.from('bookings').update({ generation_status: 'uploading' }).eq('id', bookingId);

      if (!b2KeyId || !b2AppKey) throw new Error('B2 credentials not configured');

      const aws = new AwsClient({
        accessKeyId: b2KeyId,
        secretAccessKey: b2AppKey,
        service: 's3',
        region: 'us-east-005',
      });

      const timestamp = Date.now();
      const fileKey = `orders/video_wish/${bookingId}/${timestamp}-celebrity-video.mp4`;
      const uploadUrl = `https://${b2Endpoint}/${b2BucketName}/${fileKey}`;

      const uploadResponse = await aws.fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'x-amz-acl': 'public-read' },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error(`B2 upload failed: ${await uploadResponse.text()}`);
      }

      // Generate verification code
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      let isUnique = false;
      while (!isUnique) {
        const bytes = new Uint8Array(8);
        crypto.getRandomValues(bytes);
        code = Array.from(bytes).map(b => charset[b % charset.length]).join('').slice(0, 8);
        const { data: existing } = await supabase
          .from('bookings').select('id').eq('recipient_verification_code', code).maybeSingle();
        if (!existing) isUnique = true;
      }

      await supabase.from('bookings').update({
        video_file_key: fileKey,
        video_status: 'ready',
        generation_status: 'completed',
        generation_error: null,
        status: 'confirmed' as any,
        recipient_verification_code: code,
      }).eq('id', bookingId);

      return new Response(
        JSON.stringify({ success: true, status: 'completed', videoFileKey: fileKey, message: 'Video retrieved and stored successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (status === 'failed') {
      await supabase.from('bookings').update({
        generation_status: 'failed',
        generation_error: 'HeyGen video generation failed',
        video_status: 'failed',
      }).eq('id', bookingId);

      return new Response(
        JSON.stringify({ success: false, status: 'failed', message: 'Video generation failed on HeyGen' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      // Still processing — just report status, no recursive polling
      return new Response(
        JSON.stringify({ success: true, status: status || 'unknown', message: `Video is still ${status || 'processing'}. It will be retrieved automatically via webhook or cron fallback.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error: any) {
    console.error('Error in poll-heygen-status:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
