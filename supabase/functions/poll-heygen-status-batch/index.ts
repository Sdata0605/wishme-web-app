import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_BOOKINGS_PER_RUN = 10;

async function processBooking(
  booking: any,
  heygenApiKey: string,
  supabase: any,
  aws: any,
  b2BucketName: string,
  b2Endpoint: string
): Promise<{ id: string; result: string }> {
  try {
    console.log(`Checking booking ${booking.id}, HeyGen ID: ${booking.heygen_video_id}`);

    const heygenRes = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${booking.heygen_video_id}`,
      { headers: { 'X-Api-Key': heygenApiKey, 'Accept': 'application/json' } }
    );

    if (!heygenRes.ok) {
      console.error(`HeyGen API error for ${booking.id}:`, await heygenRes.text());
      return { id: booking.id, result: 'api_error' };
    }

    const heygenData = await heygenRes.json();
    const status = heygenData.data?.status;
    const videoUrl = heygenData.data?.video_url;

    console.log(`Booking ${booking.id}: HeyGen status = ${status}`);

    if (status === 'completed' && videoUrl) {
      // Download video
      await supabase.from('bookings').update({ generation_status: 'downloading' }).eq('id', booking.id);
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) throw new Error('Failed to download video');
      const videoBuffer = await videoResponse.arrayBuffer();

      // Upload to B2
      await supabase.from('bookings').update({ generation_status: 'uploading' }).eq('id', booking.id);
      const timestamp = Date.now();
      const fileKey = `orders/video_wish/${booking.id}/${timestamp}-celebrity-video.mp4`;
      const uploadUrl = `https://${b2Endpoint}/${b2BucketName}/${fileKey}`;

      const uploadResponse = await aws.fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'x-amz-acl': 'public-read' },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) throw new Error(`B2 upload failed: ${await uploadResponse.text()}`);

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
        recipient_verification_code: code,
        completed_at: new Date().toISOString(),
      }).eq('id', booking.id);

      console.log(`Booking ${booking.id}: Video retrieved and stored successfully`);
      return { id: booking.id, result: 'completed' };

    } else if (status === 'failed') {
      await supabase.from('bookings').update({
        generation_status: 'failed',
        generation_error: 'HeyGen video generation failed',
        video_status: 'failed',
      }).eq('id', booking.id);
      return { id: booking.id, result: 'failed' };

    } else {
      return { id: booking.id, result: `still_${status || 'unknown'}` };
    }
  } catch (err: any) {
    console.error(`Error processing booking ${booking.id}:`, err.message);
    return { id: booking.id, result: `error: ${err.message}` };
  }
}

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
    if (!heygenApiKey) throw new Error('HEYGEN_API_KEY not configured');
    if (!b2KeyId || !b2AppKey) throw new Error('B2 credentials not configured');

    const aws = new AwsClient({
      accessKeyId: b2KeyId,
      secretAccessKey: b2AppKey,
      service: 's3',
      region: 'us-east-005',
    });

    // Find pending video bookings (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingBookings, error: queryError } = await supabase
      .from('bookings')
      .select('id, heygen_video_id, generation_status, video_status')
      .in('generation_status', ['video_generating', 'processing', 'downloading', 'uploading'])
      .not('heygen_video_id', 'is', null)
      .neq('video_status', 'ready')
      .gte('created_at', twentyFourHoursAgo)
      .limit(MAX_BOOKINGS_PER_RUN);

    if (queryError) throw queryError;

    if (!pendingBookings || pendingBookings.length === 0) {
      console.log('No pending video bookings to process');
      return new Response(JSON.stringify({ processed: 0, message: 'No pending bookings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Processing ${pendingBookings.length} pending bookings`);

    const results = [];
    for (const booking of pendingBookings) {
      const result = await processBooking(booking, heygenApiKey, supabase, aws, b2BucketName, b2Endpoint);
      results.push(result);
    }

    console.log('Batch results:', JSON.stringify(results));

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Batch poll error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
