import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * UGC Ad Order Creation (Manual Admin Workflow)
 * 
 * This function ONLY creates the order record. Admin will:
 * 1. Review the order in admin dashboard
 * 2. Manually generate video in HeyGen dashboard
 * 3. Paste the HeyGen video ID in admin panel
 * 4. System fetches and delivers video to user
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      ugc_ad_id,
      product_name,
      product_description,
      product_image_url,
      prompt,
      hook_style,
      call_to_action,
      avatar_id,
      voice_id,
      aspect_ratio = '9:16',
      celebrity_id
    } = await req.json();

    console.log('=== CREATING UGC AD ORDER (Manual Admin Workflow) ===');
    console.log('UGC Ad ID:', ugc_ad_id);
    console.log('Product:', product_name);
    console.log('Hook Style:', hook_style);
    console.log('Celebrity ID:', celebrity_id);
    console.log('Product Image URL:', product_image_url);

    // Validate required fields
    if (!ugc_ad_id || !product_name || !product_image_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: ugc_ad_id, product_name, product_image_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch celebrity info for admin reference
    let celebrityName = null;
    let celebrityAvatarId = avatar_id;
    let celebrityVoiceId = voice_id;
    
    if (celebrity_id) {
      console.log('Fetching celebrity info for:', celebrity_id);
      const { data: celebrityData, error: celebError } = await supabase
        .from('celebrities')
        .select('heygen_avatar_id, heygen_voice_id, name')
        .eq('id', celebrity_id)
        .single();
      
      if (!celebError && celebrityData) {
        celebrityName = celebrityData.name;
        if (celebrityData.heygen_avatar_id) {
          celebrityAvatarId = celebrityData.heygen_avatar_id;
        }
        if (celebrityData.heygen_voice_id) {
          celebrityVoiceId = celebrityData.heygen_voice_id;
        }
        console.log('Celebrity found:', celebrityName);
      }
    }

    // Build admin notes with all details for manual generation
    const adminNotes = JSON.stringify({
      product_name,
      product_description: product_description || '',
      product_image_url,
      prompt: prompt || '',
      hook_style: hook_style || 'question',
      call_to_action: call_to_action || 'Check the link!',
      aspect_ratio,
      suggested_avatar_id: celebrityAvatarId || 'Angela-inblackskirt-20220820',
      suggested_voice_id: celebrityVoiceId || '1bd001e7e50f421d891986aad5158bc8',
      celebrity_name: celebrityName,
    }, null, 2);

    // Update order status to pending_approval (waiting for admin)
    const { error: updateError } = await supabase
      .from('ugc_ads')
      .update({ 
        status: 'pending_approval',
        admin_notes: adminNotes
      })
      .eq('id', ugc_ad_id);

    if (updateError) {
      console.error('Error updating UGC ad:', updateError);
      throw updateError;
    }

    console.log('=== UGC AD ORDER CREATED ===');
    console.log('Order is now awaiting admin review and manual video generation');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your UGC Ad order has been placed! Our team will create your professional video and deliver it within 24-48 hours.',
        order_id: ugc_ad_id,
        status: 'pending_approval'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-ugc-ad:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
