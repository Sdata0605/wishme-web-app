import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { concept, celebrity_id, user_id, generation_id } = await req.json();

    console.log('Generating UGC script:', { concept, celebrity_id, user_id, generation_id });

    if (!concept || !celebrity_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: concept, celebrity_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get celebrity details
    const { data: celebrity, error: celebError } = await supabase
      .from('celebrities')
      .select('name, category, bio, image_url')
      .eq('id', celebrity_id)
      .single();

    if (celebError || !celebrity) {
      console.error('Celebrity not found:', celebError);
      return new Response(
        JSON.stringify({ error: 'Celebrity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate script using Lovable AI (Gemini)
    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a professional UGC (User Generated Content) video script writer. 
Your task is to create engaging, authentic, and conversational video scripts that feel natural and personal.

Guidelines:
- Write in first person as if the celebrity is speaking directly to the viewer
- Keep it conversational and authentic, not overly promotional
- Include natural pauses and emphasis points (marked with [pause] and [emphasis])
- Length: 30-60 seconds when spoken naturally
- Include a strong hook at the beginning
- End with a clear call-to-action
- Use simple, relatable language
- Add emotional connection and personality`;

    const userPrompt = `Create a UGC video script for ${celebrity.name} (${celebrity.category}) based on this concept:

"${concept}"

Celebrity Background: ${celebrity.bio || 'A well-known personality'}

Script Requirements:
1. Start with an attention-grabbing hook
2. Make it feel authentic and personal
3. Naturally incorporate the concept
4. Include ${celebrity.name}'s personality
5. End with a compelling call-to-action
6. Format: Include [pause] and [emphasis] markers for natural delivery

Generate only the script text, no additional commentary.`;

    console.log('Calling Lovable AI for script generation...');

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Lovable AI error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const script = aiData.choices[0]?.message?.content || '';

    console.log('Script generated successfully');

    // Generate AI thumbnail using Gemini Image Preview
    let aiThumbnailUrl = null;
    try {
      console.log('Generating AI thumbnail with Gemini...');
      const thumbnailPrompt = `Create a professional UGC-style thumbnail image for ${celebrity.name}. 
Style: Modern, authentic, high-quality portrait suitable for social media content.
Concept: ${concept}
The image should look like a frame from a genuine user-generated content video.`;

      const imageResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: thumbnailPrompt
            }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (base64Image) {
          console.log('AI thumbnail generated successfully');
          // Upload to Supabase Storage
          const fileName = `ugc_${generation_id}_${Date.now()}.png`;
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('promotional-content')
            .upload(fileName, buffer, {
              contentType: 'image/png',
              upsert: false
            });

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('promotional-content')
              .getPublicUrl(fileName);
            aiThumbnailUrl = publicUrl;
            console.log('Thumbnail uploaded to storage:', aiThumbnailUrl);
          }
        }
      }
    } catch (thumbnailError: any) {
      console.error('Error generating AI thumbnail:', thumbnailError);
      // Continue with celebrity image as fallback
    }

    // Try to generate video with HeyGen if API key is available
    let videoUrl = null;
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY');
    
    if (HEYGEN_API_KEY) {
      try {
        console.log('Calling HeyGen API to generate avatar video...');
        
        // Create HeyGen video generation request
        const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
          method: 'POST',
          headers: {
            'X-Api-Key': HEYGEN_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_inputs: [{
              character: {
                type: 'avatar',
                avatar_id: 'default_avatar', // Will be replaced with custom avatar when trained
                avatar_style: 'normal'
              },
              voice: {
                type: 'text',
                input_text: script,
                voice_id: 'en-US-Neural2-A'
              },
              background: {
                type: 'color',
                value: '#ffffff'
              }
            }],
            dimension: {
              width: 1080,
              height: 1920
            },
            aspect_ratio: '9:16',
            test: true // Set to false in production
          }),
        });

        if (heygenResponse.ok) {
          const heygenData = await heygenResponse.json();
          console.log('HeyGen video generation initiated:', heygenData);
          
          // Store the video ID for polling later
          if (heygenData.data?.video_id) {
            const { error: updateError } = await supabase
              .from('ugc_video_generations')
              .update({
                heygen_video_id: heygenData.data.video_id,
                status: 'processing'
              })
              .eq('id', generation_id);

            if (updateError) {
              console.error('Error updating HeyGen video ID:', updateError);
            }
          }
        } else {
          const errorText = await heygenResponse.text();
          console.error('HeyGen API error:', heygenResponse.status, errorText);
        }
      } catch (heygenError: any) {
        console.error('Error calling HeyGen API:', heygenError);
        // Don't fail the whole request if HeyGen fails
      }
    } else {
      console.log('HEYGEN_API_KEY not configured, skipping video generation');
    }

    // Update generation record with script
    if (generation_id) {
      const updateData: any = {
        script: script,
        status: 'completed', // Always mark as completed once script is generated
        completed_at: new Date().toISOString(),
        thumbnail_url: aiThumbnailUrl || celebrity.image_url,
        thumbnail_generated_by_ai: !!aiThumbnailUrl,
        ai_model: 'gemini-2.5-flash'
      };

      // If HeyGen video is being processed, add metadata for tracking
      if (HEYGEN_API_KEY) {
        updateData.generation_metadata = {
          video_generation_status: 'processing',
          video_initiated_at: new Date().toISOString()
        };
      }

      const { error: updateError } = await supabase
        .from('ugc_video_generations')
        .update(updateData)
        .eq('id', generation_id);

      if (updateError) {
        console.error('Error updating generation:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        script,
        celebrity_name: celebrity.name,
        celebrity_image: celebrity.image_url,
        message: HEYGEN_API_KEY 
          ? 'UGC video script generated! Video is being created with AI avatar...' 
          : 'UGC video script generated! (Configure HEYGEN_API_KEY in admin settings for video generation)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-ugc-video:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
