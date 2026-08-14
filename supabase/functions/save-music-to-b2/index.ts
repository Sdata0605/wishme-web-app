import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const b2KeyId = Deno.env.get('B2_KEY_ID')!;
    const b2ApplicationKey = Deno.env.get('B2_APPLICATION_KEY')!;
    const b2BucketName = Deno.env.get('B2_BUCKET_NAME') || 'wishmetoday';
    const b2Endpoint = Deno.env.get('B2_ENDPOINT') || 's3.us-east-005.backblazeb2.com';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { generation_id, audio_url } = await req.json();

    if (!generation_id || !audio_url) {
      throw new Error('generation_id and audio_url are required');
    }

    console.log('Saving music to B2 for generation:', generation_id);

    // Get generation record
    const { data: generation, error: fetchError } = await supabase
      .from('music_generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (fetchError || !generation) {
      throw new Error('Generation not found');
    }

    // Download audio from URL
    console.log('Downloading audio from:', audio_url);
    const audioResponse = await fetch(audio_url);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file');
    }

    const audioBlob = await audioResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();
    
    // Create B2 file key
    const timestamp = Date.now();
    const sanitizedTitle = generation.song_title.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileKey = `music/orders/${generation_id}/${timestamp}-${sanitizedTitle}.mp3`;

    console.log('Uploading to B2:', fileKey);

    // Initialize AWS S3 client for B2
    const aws = new AwsClient({
      accessKeyId: b2KeyId,
      secretAccessKey: b2ApplicationKey,
      service: 's3',
      region: 'us-east-005',
    });

    // Upload to B2
    const uploadUrl = `https://${b2Endpoint}/${b2BucketName}/${fileKey}`;
    const uploadResponse = await aws.fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/mpeg',
        'x-amz-acl': 'public-read',
      },
      body: audioBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('B2 upload failed:', uploadResponse.status, errorText);
      throw new Error(`Failed to upload to B2: ${uploadResponse.status}`);
    }

    console.log('Successfully uploaded to B2:', fileKey);

    // Update generation record with B2 file key
    const { error: updateError } = await supabase
      .from('music_generations')
      .update({
        song_url: `https://f005.backblazeb2.com/file/${b2BucketName}/${fileKey}`,
        download_url: `https://f005.backblazeb2.com/file/${b2BucketName}/${fileKey}`,
      })
      .eq('id', generation_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        file_key: fileKey,
        url: `https://f005.backblazeb2.com/file/${b2BucketName}/${fileKey}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error saving music to B2:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});