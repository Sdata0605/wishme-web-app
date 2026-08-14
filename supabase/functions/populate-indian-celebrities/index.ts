import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Celebrity {
  name: string;
  category: string;
  bio: string;
  photoPrompt: string;
  occasion: string;
  recipientName: string;
  wishMessage: string;
}

const celebrities: Celebrity[] = [
  {
    name: "Shah Rukh Khan",
    category: "Actor",
    bio: "Bollywood's King of Romance, known for iconic roles in DDLJ, Kuch Kuch Hota Hai, and Pathaan.",
    photoPrompt: "Professional headshot photo of Shah Rukh Khan, Indian Bollywood actor, warm smile, wearing elegant black suit, studio lighting, high quality portrait photography, 4k resolution",
    occasion: "Birthday",
    recipientName: "Rahul",
    wishMessage: "Happy Birthday Rahul! May this year bring you immense joy, success, and all the happiness you deserve. Keep shining bright!"
  },
  {
    name: "Deepika Padukone",
    category: "Actress",
    bio: "Leading Bollywood actress known for Padmaavat, Chennai Express, and international projects.",
    photoPrompt: "Professional portrait photo of Deepika Padukone, Indian Bollywood actress, elegant pose, wearing traditional Indian saree, soft studio lighting, graceful expression, 4k resolution",
    occasion: "Wedding Anniversary",
    recipientName: "Priya and Arjun",
    wishMessage: "Happy Anniversary Priya and Arjun! Wishing you both a lifetime of love, laughter, and beautiful memories together. May your bond grow stronger each day!"
  },
  {
    name: "Virat Kohli",
    category: "Cricketer",
    bio: "Former Indian cricket captain, one of the greatest batsmen in modern cricket.",
    photoPrompt: "Professional photo of Virat Kohli, Indian cricket captain, confident pose, wearing Indian cricket team jersey, stadium background, dynamic lighting, 4k resolution",
    occasion: "New Job",
    recipientName: "Amit",
    wishMessage: "Congratulations Amit on your new job! Chase your dreams with the same passion you put into everything. Success is yours for the taking!"
  },
  {
    name: "Priyanka Chopra",
    category: "Actress",
    bio: "Global icon, actress, and producer known for Bollywood films and international projects.",
    photoPrompt: "Professional portrait of Priyanka Chopra, Indian actress and global icon, confident smile, wearing elegant designer outfit, glamorous makeup, studio lighting, 4k resolution",
    occasion: "Graduation",
    recipientName: "Neha",
    wishMessage: "Congratulations Neha on your graduation! This is just the beginning of an amazing journey. Dream big and make it happen!"
  },
  {
    name: "Ranveer Singh",
    category: "Actor",
    bio: "Dynamic Bollywood actor known for his energetic performances and versatile roles.",
    photoPrompt: "Professional photo of Ranveer Singh, Bollywood actor, energetic expression, wearing stylish colorful outfit, vibrant studio lighting, charismatic pose, 4k resolution",
    occasion: "Diwali",
    recipientName: "Rohan",
    wishMessage: "Happy Diwali Rohan! May this festival of lights bring prosperity, happiness, and success into your life. Have a blessed celebration!"
  },
  {
    name: "Alia Bhatt",
    category: "Actress",
    bio: "Talented actress known for powerful performances in Raazi, Gangubai Kathiawadi, and more.",
    photoPrompt: "Professional portrait of Alia Bhatt, Bollywood actress, sweet smile, wearing contemporary Indian outfit, soft natural lighting, elegant pose, 4k resolution",
    occasion: "Baby Shower",
    recipientName: "Kavya",
    wishMessage: "Congratulations Kavya! Wishing you and your little one all the love and blessings. May this new chapter be filled with endless joy!"
  },
  {
    name: "MS Dhoni",
    category: "Cricketer",
    bio: "Legendary Indian cricket captain, known for his cool demeanor and match-winning abilities.",
    photoPrompt: "Professional photo of MS Dhoni, Indian cricket legend, calm confident expression, wearing Indian cricket jersey, outdoor cricket ground setting, natural lighting, 4k resolution",
    occasion: "Housewarming",
    recipientName: "Vikram",
    wishMessage: "Congratulations Vikram on your new home! May it be filled with love, laughter, and countless happy memories. Best wishes!"
  },
  {
    name: "Katrina Kaif",
    category: "Actress",
    bio: "Popular Bollywood actress known for her dancing prowess and versatile performances.",
    photoPrompt: "Professional portrait of Katrina Kaif, Bollywood actress, radiant smile, wearing elegant Indian ethnic wear, soft glamorous lighting, graceful pose, 4k resolution",
    occasion: "Engagement",
    recipientName: "Sneha and Karan",
    wishMessage: "Congratulations Sneha and Karan on your engagement! Wishing you both a beautiful journey together filled with love and happiness!"
  },
  {
    name: "Ranbir Kapoor",
    category: "Actor",
    bio: "Versatile actor from the Kapoor family, known for diverse and challenging roles.",
    photoPrompt: "Professional headshot of Ranbir Kapoor, Bollywood actor, thoughtful expression, wearing casual smart outfit, natural studio lighting, artistic pose, 4k resolution",
    occasion: "Father's Day",
    recipientName: "Rajesh",
    wishMessage: "Happy Father's Day Rajesh! Thank you for being an amazing dad and role model. You're truly the best!"
  },
  {
    name: "Kareena Kapoor Khan",
    category: "Actress",
    bio: "Bollywood royalty known for iconic performances and timeless style.",
    photoPrompt: "Professional portrait of Kareena Kapoor Khan, Bollywood actress, elegant confident smile, wearing designer Indian outfit, sophisticated lighting, glamorous pose, 4k resolution",
    occasion: "Mother's Day",
    recipientName: "Anjali",
    wishMessage: "Happy Mother's Day Anjali! You're the most amazing mom and your love makes everything beautiful. Thank you for everything!"
  },
  {
    name: "Hrithik Roshan",
    category: "Actor",
    bio: "Bollywood superstar known for his dancing skills and action-packed performances.",
    photoPrompt: "Professional photo of Hrithik Roshan, Bollywood actor, confident charismatic pose, wearing fitted black shirt, dramatic studio lighting, strong features, 4k resolution",
    occasion: "Fitness Achievement",
    recipientName: "Aditya",
    wishMessage: "Congratulations Aditya on your fitness milestone! Your dedication and hard work are truly inspiring. Keep pushing your limits!"
  },
  {
    name: "Anushka Sharma",
    category: "Actress",
    bio: "Actress and producer known for powerful roles and her production ventures.",
    photoPrompt: "Professional portrait of Anushka Sharma, Bollywood actress, warm genuine smile, wearing modern Indian fusion wear, soft natural lighting, elegant composition, 4k resolution",
    occasion: "Business Launch",
    recipientName: "Meera",
    wishMessage: "Congratulations Meera on launching your business! Wishing you tremendous success and growth. You're going to do amazing things!"
  },
  {
    name: "Shreya Ghoshal",
    category: "Singer",
    bio: "Legendary playback singer with the most melodious voice in Indian cinema.",
    photoPrompt: "Professional portrait of Shreya Ghoshal, Indian playback singer, graceful smile, wearing traditional silk saree, elegant jewelry, soft studio lighting, serene expression, 4k resolution",
    occasion: "Music Concert",
    recipientName: "Ravi",
    wishMessage: "Hello Ravi! Thank you for your love and support for music. May your life be filled with melodies and harmony. Stay blessed!"
  },
  {
    name: "Shahid Kapoor",
    category: "Actor",
    bio: "Versatile actor known for intense performances and impressive dancing.",
    photoPrompt: "Professional photo of Shahid Kapoor, Bollywood actor, intense focused expression, wearing stylish casual outfit, moody studio lighting, strong pose, 4k resolution",
    occasion: "Promotion",
    recipientName: "Sanjay",
    wishMessage: "Congratulations Sanjay on your well-deserved promotion! Your hard work has paid off. Here's to even greater success ahead!"
  },
  {
    name: "Madhuri Dixit",
    category: "Actress",
    bio: "Legendary actress and dancer, known as the queen of Bollywood dance.",
    photoPrompt: "Professional portrait of Madhuri Dixit, legendary Bollywood actress, radiant classical smile, wearing elegant traditional Indian saree, graceful dance pose, soft glamorous lighting, 4k resolution",
    occasion: "Dance Competition",
    recipientName: "Ishita",
    wishMessage: "Congratulations Ishita on winning the dance competition! Your passion and dedication shine through every move. Keep dancing!"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting to populate Indian celebrities with realistic photos and videos...');

    // Clear existing data
    await supabase.from('celebrity_media').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('celebrity_occasions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('celebrity_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('celebrities').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const results = [];

    for (const celeb of celebrities) {
      console.log(`Processing ${celeb.name}...`);

      // Generate realistic celebrity photo
      console.log(`Generating photo for ${celeb.name}...`);
      const photoResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
              content: celeb.photoPrompt
            }
          ],
          modalities: ['image', 'text']
        })
      });

      if (!photoResponse.ok) {
        console.error(`Failed to generate photo for ${celeb.name}`);
        continue;
      }

      const photoData = await photoResponse.json();
      const photoBase64 = photoData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!photoBase64) {
        console.error(`No photo generated for ${celeb.name}`);
        continue;
      }

      // Upload photo to Supabase Storage
      const photoBuffer = Uint8Array.from(atob(photoBase64.split(',')[1]), c => c.charCodeAt(0));
      const photoFileName = `${celeb.name.toLowerCase().replace(/\s+/g, '-')}-photo.png`;
      
      const { data: photoUpload, error: photoUploadError } = await supabase.storage
        .from('celebrity-avatars')
        .upload(photoFileName, photoBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (photoUploadError) {
        console.error(`Failed to upload photo for ${celeb.name}:`, photoUploadError);
        continue;
      }

      const { data: { publicUrl: photoUrl } } = supabase.storage
        .from('celebrity-avatars')
        .getPublicUrl(photoFileName);

      // Generate AI video wish
      console.log(`Generating video wish for ${celeb.name}...`);
      const videoPrompt = `Create a warm, personalized video message from ${celeb.name} wishing ${celeb.recipientName} for their ${celeb.occasion}. The message should be: "${celeb.wishMessage}". Make it feel genuine, bright, and celebratory with colorful background elements related to ${celeb.occasion}. The celebrity should be front and center, smiling warmly.`;
      
      const videoResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
              content: videoPrompt
            }
          ],
          modalities: ['image', 'text']
        })
      });

      if (!videoResponse.ok) {
        console.error(`Failed to generate video for ${celeb.name}`);
        continue;
      }

      const videoData = await videoResponse.json();
      const videoBase64 = videoData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      let videoUrl = photoUrl; // Fallback to photo

      if (videoBase64) {
        // Upload video thumbnail to Supabase Storage
        const videoBuffer = Uint8Array.from(atob(videoBase64.split(',')[1]), c => c.charCodeAt(0));
        const videoFileName = `${celeb.name.toLowerCase().replace(/\s+/g, '-')}-wish-${celeb.occasion.toLowerCase().replace(/\s+/g, '-')}.png`;
        
        const { data: videoUpload, error: videoUploadError } = await supabase.storage
          .from('celebrity-avatars')
          .upload(videoFileName, videoBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (!videoUploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('celebrity-avatars')
            .getPublicUrl(videoFileName);
          videoUrl = publicUrl;
        }
      }

      // Insert celebrity into database
      const { data: celebrity, error: celebError } = await supabase
        .from('celebrities')
        .insert({
          name: celeb.name,
          category: celeb.category,
          bio: celeb.bio,
          image_url: photoUrl,
          is_verified: true,
          is_active: true,
          rating: 4.5 + Math.random() * 0.5,
          review_count: Math.floor(Math.random() * 500) + 100,
          followers: `${Math.floor(Math.random() * 50) + 10}M`,
          location: 'Mumbai, India',
          delivery_time: '24-48 hours',
          service_prices: {
            general_wish: Math.floor(Math.random() * 8000) + 5000,
            text_message: Math.floor(Math.random() * 3000) + 2000,
            image_promotion: Math.floor(Math.random() * 30000) + 25000,
            video_promotion: Math.floor(Math.random() * 50000) + 50000
          }
        })
        .select()
        .single();

      if (celebError) {
        console.error(`Failed to insert celebrity ${celeb.name}:`, celebError);
        continue;
      }

      // Insert celebrity media (wish video)
      await supabase.from('celebrity_media').insert({
        celebrity_id: celebrity.id,
        media_type: 'video',
        title: `${celeb.occasion} Wish for ${celeb.recipientName}`,
        description: celeb.wishMessage,
        file_url: videoUrl,
        thumbnail_url: videoUrl,
        is_public: true,
        is_promotional: false
      });

      // Insert celebrity occasion
      await supabase.from('celebrity_occasions').insert({
        celebrity_id: celebrity.id,
        occasion_name: celeb.occasion,
        occasion_type: celeb.occasion.toLowerCase().includes('birthday') ? 'birthday' : 'anniversary',
        occasion_date: new Date().toISOString().split('T')[0],
        is_public: true,
        auto_reply_enabled: true
      });

      results.push({
        name: celeb.name,
        photoUrl,
        videoUrl,
        occasion: celeb.occasion
      });

      console.log(`✓ Completed ${celeb.name}`);
    }

    console.log('Successfully populated all celebrities!');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Successfully populated Indian celebrities with realistic photos and videos',
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in populate-indian-celebrities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});