import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process UGC Video by HeyGen Video ID
 * 
 * Admin provides the HeyGen video ID after manually generating the video.
 * This function:
 * 1. Fetches the video from HeyGen using the video ID
 * 2. Downloads and uploads to Backblaze B2 (if configured)
 * 3. Updates the UGC ad record with the video URL
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ugc_ad_id, heygen_video_id } = await req.json();

    console.log('=== PROCESSING UGC VIDEO FROM HEYGEN ===');
    console.log('UGC Ad ID:', ugc_ad_id);
    console.log('HeyGen Video ID:', heygen_video_id);

    if (!ugc_ad_id || !heygen_video_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: ugc_ad_id, heygen_video_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the UGC ad exists
    const { data: ugcAd, error: ugcError } = await supabase
      .from('ugc_ads')
      .select('*')
      .eq('id', ugc_ad_id)
      .single();

    if (ugcError || !ugcAd) {
      return new Response(
        JSON.stringify({ error: 'UGC Ad not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('ugc_ads')
      .update({ 
        status: 'processing',
        heygen_video_id: heygen_video_id
      })
      .eq('id', ugc_ad_id);

    // Get HeyGen API key
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    
    if (!HEYGEN_API_KEY) {
      await supabase
        .from('ugc_ads')
        .update({ 
          status: 'failed',
          generation_error: 'HEYGEN_API_KEY not configured'
        })
        .eq('id', ugc_ad_id);

      return new Response(
        JSON.stringify({ error: 'HEYGEN_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch video status from HeyGen
    console.log('Fetching video status from HeyGen...');
    const statusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${heygen_video_id}`, {
      headers: { 'X-Api-Key': HEYGEN_API_KEY }
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('HeyGen status error:', errorText);
      
      await supabase
        .from('ugc_ads')
        .update({ 
          status: 'failed',
          generation_error: `HeyGen error: ${errorText}`
        })
        .eq('id', ugc_ad_id);

      return new Response(
        JSON.stringify({ error: 'Failed to fetch video from HeyGen', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    console.log('HeyGen video status:', JSON.stringify(statusData, null, 2));

    const videoStatus = statusData.data?.status;
    const videoUrl = statusData.data?.video_url;

    if (videoStatus === 'failed') {
      await supabase
        .from('ugc_ads')
        .update({ 
          status: 'failed',
          generation_error: 'Video generation failed in HeyGen'
        })
        .eq('id', ugc_ad_id);

      return new Response(
        JSON.stringify({ error: 'Video generation failed in HeyGen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (videoStatus === 'processing' || videoStatus === 'pending') {
      await supabase
        .from('ugc_ads')
        .update({ 
          status: 'video_processing',
          heygen_video_id: heygen_video_id
        })
        .eq('id', ugc_ad_id);

      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'processing',
          message: 'Video is still processing in HeyGen. Check back in a few minutes.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (videoStatus === 'completed' && videoUrl) {
      console.log('Video completed! URL:', videoUrl);
      
      let finalVideoUrl = videoUrl;
      
      // Try to upload to Backblaze B2 for permanent storage
      const B2_KEY_ID = Deno.env.get('B2_KEY_ID');
      const B2_APPLICATION_KEY = Deno.env.get('B2_APPLICATION_KEY');
      const B2_BUCKET_NAME = Deno.env.get('B2_BUCKET_NAME');
      const B2_ENDPOINT = Deno.env.get('B2_ENDPOINT');

      if (B2_KEY_ID && B2_APPLICATION_KEY && B2_BUCKET_NAME && B2_ENDPOINT) {
        try {
          console.log('Downloading video from HeyGen...');
          const videoResponse = await fetch(videoUrl);
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();

          console.log('Uploading to Backblaze B2...');
          const fileName = `ugc-ads/${ugc_ad_id}/${Date.now()}.mp4`;
          
          // Import aws4fetch for S3-compatible uploads
          const { AwsClient } = await import('https://esm.sh/aws4fetch@1.0.17');
          
          const client = new AwsClient({
            accessKeyId: B2_KEY_ID,
            secretAccessKey: B2_APPLICATION_KEY,
            service: 's3',
            region: 'auto'
          });

          const uploadUrl = `${B2_ENDPOINT}/${B2_BUCKET_NAME}/${fileName}`;
          const uploadResponse = await client.fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'video/mp4' },
            body: videoBuffer
          });

          if (uploadResponse.ok) {
            // Construct public URL
            const bucketDomain = B2_ENDPOINT!.replace('https://', '').replace('/s3', '');
            finalVideoUrl = `https://${B2_BUCKET_NAME}.${bucketDomain}/${fileName}`;
            console.log('Uploaded to B2:', finalVideoUrl);
          } else {
            console.log('B2 upload failed, using HeyGen URL');
          }
        } catch (b2Error) {
          console.error('B2 upload error:', b2Error);
          console.log('Using HeyGen URL as fallback');
        }
      }

      // Update with completed status and video URL
      await supabase
        .from('ugc_ads')
        .update({ 
          status: 'completed',
          video_url: finalVideoUrl,
          heygen_video_id: heygen_video_id,
          completed_at: new Date().toISOString()
        })
        .eq('id', ugc_ad_id);

      console.log('=== UGC AD COMPLETED ===');

      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          video_url: finalVideoUrl,
          message: 'Video has been processed and is now available for the user!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown status
    return new Response(
      JSON.stringify({ 
        success: false,
        status: videoStatus,
        message: `Unexpected video status: ${videoStatus}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-ugc-video-id:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
