import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sunoApiKey = Deno.env.get('SUNO_API_KEY');

    if (!sunoApiKey) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { generation_id } = await req.json();

    // Get generation record
    const { data: generation, error: fetchError } = await supabase
      .from('music_generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (fetchError || !generation) {
      throw new Error('Generation not found');
    }

    // If already completed or failed, return current status
    if (generation.status === 'completed' || generation.status === 'failed') {
      return new Response(
        JSON.stringify({
          status: generation.status,
          song_url: generation.song_url,
          download_url: generation.download_url,
          error: generation.error_message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!generation.api_task_id) {
      throw new Error('No task ID found for this generation');
    }

    // Check elapsed time — timeout after 10 minutes (Suno often needs 2–3+ min)
    const createdAt = new Date(generation.created_at).getTime();
    const elapsedMinutes = (Date.now() - createdAt) / 1000 / 60;
    console.log('Checking Suno status for:', generation.api_task_id, 'elapsed:', elapsedMinutes.toFixed(1), 'min');

    if (elapsedMinutes > 10) {
      console.log('Generation timed out after 5 minutes');
      const refundAmount = generation.generation_type === 'with_lyrics' ? 150 : 100;

      await supabase.from('music_generations').update({
        status: 'failed',
        error_message: 'Generation timed out. Your wallet has been refunded.',
      }).eq('id', generation_id);

      await supabase.from('wallet_transactions').insert({
        user_id: generation.user_id, amount: refundAmount,
        transaction_type: 'refund', status: 'completed',
        transaction_details: { reason: 'music_generation_timeout', generation_id }
      });

      return new Response(
        JSON.stringify({ status: 'failed', error: 'Generation timed out. ₹' + refundAmount + ' refunded.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check Suno API status
    let statusResponse;
    try {
      statusResponse = await fetch(
        `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${generation.api_task_id}`,
        { headers: { 'Authorization': `Bearer ${sunoApiKey}`, 'Content-Type': 'application/json' } }
      );
    } catch (networkError) {
      console.error('Network error checking Suno status:', networkError);
      return new Response(
        JSON.stringify({ status: 'processing', message: 'Checking status...' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Suno status check error:', statusResponse.status, errorText);

      if (statusResponse.status === 404) {
        await supabase.from('music_generations').update({
          status: 'failed', error_message: 'Task not found. Please try again.'
        }).eq('id', generation_id);
        return new Response(
          JSON.stringify({ status: 'failed', error: 'Task not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ status: 'processing', message: 'Still generating...' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    console.log('Suno status response:', JSON.stringify(statusData));

    // Parse Suno response (record-info shapes vary slightly by model)
    const sunoStatus = statusData.data?.status;
    const sunoData =
      statusData.data?.response?.sunoData?.[0] ||
      statusData.data?.response?.data?.[0] ||
      statusData.data?.sunoData?.[0];
    const audioUrl = sunoData?.audioUrl || sunoData?.audio_url || sunoData?.streamAudioUrl;
    const imageUrl = sunoData?.imageUrl || sunoData?.image_url;
    const duration = sunoData?.duration;

    const isCompleted = sunoStatus === 'SUCCESS';
    const isFailed = sunoStatus === 'GENERATE_AUDIO_FAILED' || sunoStatus === 'CREATE_TASK_FAILED' || sunoStatus === 'CALLBACK_EXCEPTION';

    if (isCompleted && audioUrl) {
      console.log('Song completed! Uploading to B2...');

      let b2DownloadUrl = audioUrl;

      try {
        const audioResponse = await fetch(audioUrl);
        if (audioResponse.ok) {
          const audioBuffer = await audioResponse.arrayBuffer();

          const B2_KEY_ID = Deno.env.get('B2_KEY_ID');
          const B2_APPLICATION_KEY = Deno.env.get('B2_APPLICATION_KEY');

          if (B2_KEY_ID && B2_APPLICATION_KEY) {
            const aws = new AwsClient({
              accessKeyId: B2_KEY_ID,
              secretAccessKey: B2_APPLICATION_KEY,
              region: 'us-east-005',
            });

            const timestamp = Date.now();
            const safeTitle = (generation.song_title || 'song').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
            const b2FileKey = `music/songs/${generation.user_id}/${timestamp}-${safeTitle}.mp3`;
            const uploadUrl = `https://s3.us-east-005.backblazeb2.com/wishmetoday/${b2FileKey}`;

            const uploadResponse = await aws.fetch(uploadUrl, {
              method: 'PUT',
              body: new Uint8Array(audioBuffer),
              headers: { 'Content-Type': 'audio/mpeg', 'x-amz-acl': 'public-read' },
            });

            if (uploadResponse.ok) {
              b2DownloadUrl = `https://f005.backblazeb2.com/file/wishmetoday/${b2FileKey}`;
              console.log('Uploaded to B2:', b2DownloadUrl);
            } else {
              console.error('B2 upload failed:', await uploadResponse.text());
            }
          }
        }
      } catch (uploadError) {
        console.error('B2 upload error:', uploadError);
      }

      // Suno reports a fractional length (e.g. 191.44) but the column is an integer; saving it unrounded
      // made this update fail, so finished songs stayed "processing" and never reached Saved Songs.
      const { error: saveError } = await supabase.from('music_generations').update({
        status: 'completed',
        song_url: b2DownloadUrl,
        download_url: b2DownloadUrl,
        completed_at: new Date().toISOString(),
        duration: Number.isFinite(Number(duration)) ? Math.round(Number(duration)) : null,
      }).eq('id', generation_id);
      if (saveError) console.error('Could not save the finished song:', saveError.message);

      // Fire notification: music_generation_completed
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-wishme-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey },
          body: JSON.stringify({
            event_key: 'music_generation_completed',
            recipient_type: 'user',
            recipient_id: generation.user_id,
            data: { song_title: generation.song_title || 'Your Song', payment_id: generation.wishme_payment_id || '' }
          })
        });
      } catch (e) { console.warn('Notification error:', e); }

      return new Response(
        JSON.stringify({
          status: 'completed',
          song_url: b2DownloadUrl,
          download_url: b2DownloadUrl,
          cover_image_url: imageUrl,
          duration,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isFailed) {
      const refundAmount = generation.generation_type === 'with_lyrics' ? 150 : 100;
      const errorMsg = statusData.msg || 'Song generation failed';

      await supabase.from('music_generations').update({
        status: 'failed', error_message: errorMsg
      }).eq('id', generation_id);

      await supabase.from('wallet_transactions').insert({
        user_id: generation.user_id, amount: refundAmount,
        transaction_type: 'refund', status: 'completed',
        transaction_details: { reason: 'suno_generation_failed', generation_id }
      });

      return new Response(
        JSON.stringify({ status: 'failed', error: errorMsg + '. ₹' + refundAmount + ' refunded.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Still processing
    const progressMessages: Record<string, string> = {
      'PENDING': 'Starting composition...',
      'TEXT_SUCCESS': 'Creating melody...',
      'FIRST_SUCCESS': 'Adding vocals and mixing...',
    };

    return new Response(
      JSON.stringify({
        status: 'processing',
        message: progressMessages[sunoStatus] || 'Composing your song...',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error checking music status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
