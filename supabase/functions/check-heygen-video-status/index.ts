import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, bookingId } = await req.json();

    if (!videoId || !bookingId) {
      throw new Error('Missing videoId or bookingId');
    }

    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
    if (!heygenApiKey) {
      throw new Error('HEYGEN_API_KEY not configured');
    }

    console.log('Checking HeyGen video status:', videoId);

    // Check video status from HeyGen API
    const heygenResponse = await fetch(`https://api.heygen.com/v2/video/${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error('HeyGen API error:', errorText);
      throw new Error(`HeyGen API error: ${errorText}`);
    }

    const heygenData = await heygenResponse.json();
    const status = heygenData.data?.status;
    const videoUrl = heygenData.data?.video_url;

    console.log('HeyGen video status:', status);

    // If completed, update booking with video URL
    if (status === 'completed' && videoUrl) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          video_url: videoUrl,
          status: 'pending'
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Error updating booking:', updateError);
        throw updateError;
      }

      console.log('Booking updated with video URL');
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        videoUrl: status === 'completed' ? videoUrl : null,
        message: status === 'completed' 
          ? 'Video generation completed' 
          : `Video is ${status}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in check-heygen-video-status:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to check video status'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
