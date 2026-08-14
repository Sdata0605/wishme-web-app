import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoMessageScenario {
  recipientName: string;
  occasion: string;
  greeting: string;
  description: string;
  prompt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching Indian celebrities...');

    // Fetch active verified Indian celebrities
    const { data: celebrities, error: celebError } = await supabase
      .from('celebrities')
      .select('id, name, category')
      .eq('is_active', true)
      .eq('is_verified', true)
      .limit(10);

    if (celebError) {
      console.error('Error fetching celebrities:', celebError);
      throw celebError;
    }

    if (!celebrities || celebrities.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No celebrities found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${celebrities.length} celebrities`);

    // Define scenarios for each celebrity
    const scenarios: Record<string, VideoMessageScenario> = {
      'Shah Rukh Khan': {
        recipientName: 'Rahul Kumar',
        occasion: 'Birthday',
        greeting: 'Happy Birthday Rahul Kumar!',
        description: 'Wishing you a year filled with success, happiness, and memorable moments. May all your dreams come true!',
        prompt: 'Create a vibrant, professional video message thumbnail showing Shah Rukh Khan smiling warmly in signature pose with arms spread wide, wearing elegant casual attire. Include visible glowing text overlay with "Happy Birthday Rahul!" Background should be festive with golden balloons and warm lights. Photorealistic, 4K quality, bright and inviting atmosphere.'
      },
      'Deepika Padukone': {
        recipientName: 'Priya & Arjun Sharma',
        occasion: 'Anniversary',
        greeting: 'Happy Anniversary Priya & Arjun!',
        description: 'Congratulations on your beautiful journey together! May your love continue to grow stronger with each passing year.',
        prompt: 'Create an elegant video message thumbnail showing Deepika Padukone in a beautiful saree, smiling warmly with hands in namaste gesture. Include golden text overlay with "Happy Anniversary". Background should be romantic with rose petals and soft pink lighting. Photorealistic, professional quality, warm romantic atmosphere.'
      },
      'Virat Kohli': {
        recipientName: 'Amit Patel',
        occasion: 'New Job',
        greeting: 'Congratulations Amit!',
        description: 'Congratulations on your new job! Your hard work and dedication have paid off. Wishing you great success ahead!',
        prompt: 'Create a motivational video message thumbnail showing Virat Kohli in Team India jersey, giving thumbs up with confident smile. Include bold text overlay with "Congrats Amit on New Job!". Background should be energetic with blue and green lighting, confetti. Photorealistic, 4K quality, inspiring atmosphere.'
      },
      'Priyanka Chopra': {
        recipientName: 'Neha Singh',
        occasion: 'Graduation',
        greeting: 'Congratulations on Your Graduation Neha!',
        description: 'You did it! Your graduation is just the beginning of an amazing journey. Go chase your dreams!',
        prompt: 'Create a celebratory video message thumbnail showing Priyanka Chopra in elegant western attire, smiling with applause gesture. Include graduation cap graphics and text overlay with "Congrats Graduate Neha!". Background should be festive with gold and black graduation theme. Photorealistic, professional quality, celebratory atmosphere.'
      },
      'Ranveer Singh': {
        recipientName: 'Rohan Mehta',
        occasion: 'Diwali',
        greeting: 'Happy Diwali Rohan!',
        description: 'Wishing you and your family a Diwali filled with joy, prosperity, and beautiful moments. Have a sparkling celebration!',
        prompt: 'Create a festive video message thumbnail showing Ranveer Singh in colorful traditional kurta, holding diya lamp with big energetic smile. Include glowing text overlay with "Happy Diwali Rohan!". Background should be vibrant with diyas, rangoli patterns, and orange-yellow festival lights. Photorealistic, 4K quality, festive Indian atmosphere.'
      },
      'Alia Bhatt': {
        recipientName: 'Kavya Reddy',
        occasion: 'Baby Shower',
        greeting: 'Best Wishes Kavya!',
        description: 'Congratulations on your upcoming bundle of joy! Wishing you a healthy pregnancy and beautiful motherhood journey.',
        prompt: 'Create a warm video message thumbnail showing Alia Bhatt in pastel floral dress, smiling sweetly with hands on heart. Include soft text overlay with "Baby Shower Blessings Kavya". Background should be gentle with baby blue and pink balloons, flowers. Photorealistic, professional quality, tender loving atmosphere.'
      },
      'MS Dhoni': {
        recipientName: 'Vikram Iyer',
        occasion: 'Housewarming',
        greeting: 'Congratulations on Your New Home Vikram!',
        description: 'Congratulations on your new home! May it be filled with happiness, laughter, and wonderful memories.',
        prompt: 'Create a warm video message thumbnail showing MS Dhoni in casual comfortable attire, smiling with welcoming gesture. Include text overlay with "Housewarming Wishes Vikram". Background should be homely with warm lighting, house plants, and keys. Photorealistic, 4K quality, welcoming homely atmosphere.'
      },
      'Katrina Kaif': {
        recipientName: 'Sneha & Karan Gupta',
        occasion: 'Engagement',
        greeting: 'Congratulations Sneha & Karan!',
        description: 'Congratulations on your engagement! Wishing you a lifetime of love, laughter, and togetherness.',
        prompt: 'Create a romantic video message thumbnail showing Katrina Kaif in elegant Indian fusion wear, smiling warmly with joined hands gesture. Include text overlay with "Engagement Wishes". Background should be romantic with red roses, fairy lights, and ring graphics. Photorealistic, professional quality, romantic celebration atmosphere.'
      },
      'Ranbir Kapoor': {
        recipientName: 'Rajesh Verma',
        occasion: "Father's Day",
        greeting: "Happy Father's Day Rajesh!",
        description: "Happy Father's Day! Thank you for being an amazing dad. Your love and guidance mean everything.",
        prompt: 'Create a heartfelt video message thumbnail showing Ranbir Kapoor in smart casual wear, smiling warmly with respectful hand gesture. Include text overlay with "Happy Father\'s Day Rajesh". Background should be warm with blue and brown tones, father-son graphics. Photorealistic, 4K quality, emotional heartwarming atmosphere.'
      },
      'Kareena Kapoor Khan': {
        recipientName: 'Anjali Desai',
        occasion: "Mother's Day",
        greeting: "Happy Mother's Day Anjali!",
        description: "Happy Mother's Day! Thank you for your unconditional love and endless sacrifices. You are truly special!",
        prompt: 'Create a loving video message thumbnail showing Kareena Kapoor Khan in elegant saree, smiling with loving expression and namaste gesture. Include floral text overlay with "Happy Mother\'s Day Anjali". Background should be soft with pink flowers, hearts, and warm maternal lighting. Photorealistic, professional quality, loving tender atmosphere.'
      }
    };

    const generatedMessages = [];

    // Generate video messages for each celebrity
    for (const celebrity of celebrities) {
      const scenario = scenarios[celebrity.name];
      
      if (!scenario) {
        console.log(`No scenario defined for ${celebrity.name}, skipping...`);
        continue;
      }

      console.log(`Generating video message for ${celebrity.name}...`);

      try {
        // Generate image using Lovable AI
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: scenario.prompt
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI generation failed for ${celebrity.name}:`, errorText);
          continue;
        }

        const aiData = await aiResponse.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          console.error(`No image generated for ${celebrity.name}`);
          continue;
        }

        // Convert base64 to blob and upload to Supabase Storage
        const base64Data = imageUrl.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const fileName = `${celebrity.id}-${scenario.occasion.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.png`;
        const filePath = `video-messages/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('celebrity-avatars')
          .upload(filePath, binaryData, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error(`Upload error for ${celebrity.name}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('celebrity-avatars')
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Insert into celebrity_media table
        const { data: mediaData, error: mediaError } = await supabase
          .from('celebrity_media')
          .insert({
            celebrity_id: celebrity.id,
            media_type: 'video',
            title: `${scenario.occasion} Wish for ${scenario.recipientName}`,
            description: scenario.description,
            file_url: publicUrl,
            thumbnail_url: publicUrl,
            is_public: true,
            is_promotional: true
          })
          .select()
          .single();

        if (mediaError) {
          console.error(`Database insert error for ${celebrity.name}:`, mediaError);
          continue;
        }

        generatedMessages.push({
          celebrity: celebrity.name,
          recipient: scenario.recipientName,
          occasion: scenario.occasion,
          mediaId: mediaData.id,
          thumbnailUrl: publicUrl
        });

        console.log(`✓ Generated video message for ${celebrity.name}`);

      } catch (error) {
        console.error(`Error processing ${celebrity.name}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${generatedMessages.length} video messages`,
        data: generatedMessages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-celebrity-video-messages:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});