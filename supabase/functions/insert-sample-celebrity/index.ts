import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Sample Indian celebrities with diverse professions and realistic data
    const celebrities = [
      {
        name: "Shah Rukh Khan",
        category: "Actor",
        bio: "Bollywood's King Khan with 30+ years of iconic performances. Winner of 14 Filmfare Awards and global icon.",
        location: "Mumbai, Maharashtra",
        followers: "42M+",
        rating: 4.9,
        review_count: 2834,
        service_prices: { general_wish: 50000, text_message: 20000, image_promotion: 250000, video_promotion: 500000 },
        image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&q=80",
        dob: "1965-11-02",
        anniversary: "1991-10-25",
        occasions: ["Birthday", "Anniversary", "Diwali", "New Year"],
        events: [
          { title: "Pathaan Movie Release", date: "2024-01-25", type: "movie_release", location: "Mumbai" },
          { title: "KKR Season Opening", date: "2024-04-15", type: "sports_event", location: "Kolkata" }
        ]
      },
      {
        name: "Priyanka Chopra",
        category: "Actress",
        bio: "Global icon, actress, and producer. Former Miss World 2000 and UNICEF Goodwill Ambassador.",
        location: "Mumbai, Maharashtra",
        followers: "85M+",
        rating: 4.8,
        review_count: 2145,
        service_prices: { general_wish: 60000, text_message: 25000, image_promotion: 300000, video_promotion: 600000 },
        image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop&q=80",
        dob: "1982-07-18",
        anniversary: "2018-12-01",
        occasions: ["Birthday", "Anniversary", "International Women's Day"],
        events: [
          { title: "Citadel Season 2 Premiere", date: "2024-05-10", type: "premiere", location: "Los Angeles" },
          { title: "Mumbai Fashion Week", date: "2024-03-20", type: "fashion", location: "Mumbai" }
        ]
      },
      {
        name: "Virat Kohli",
        category: "Cricketer",
        bio: "Former Indian cricket captain and batting legend. Highest run-scorer in T20I cricket history.",
        location: "Delhi",
        followers: "250M+",
        rating: 4.9,
        review_count: 3245,
        service_prices: { general_wish: 100000, text_message: 40000, image_promotion: 500000, video_promotion: 1000000 },
        image_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop&q=80",
        dob: "1988-11-05",
        anniversary: "2017-12-11",
        occasions: ["Birthday", "Anniversary", "Cricket World Cup", "IPL"],
        events: [
          { title: "IPL 2024 Opening Match", date: "2024-03-22", type: "sports", location: "Bangalore" },
          { title: "WROGN Brand Launch Delhi", date: "2024-06-01", type: "brand_launch", location: "Delhi" }
        ]
      },
      {
        name: "Deepika Padukone",
        category: "Actress",
        bio: "Award-winning actress and mental health advocate. Winner of 3 Filmfare Awards and Padma Shri awardee.",
        location: "Bangalore, Karnataka",
        followers: "70M+",
        rating: 4.9,
        review_count: 1987,
        service_prices: { general_wish: 55000, text_message: 22000, image_promotion: 275000, video_promotion: 550000 },
        image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=800&fit=crop&q=80",
        dob: "1986-01-05",
        anniversary: "2018-11-14",
        occasions: ["Birthday", "Anniversary", "Mental Health Day", "Diwali"],
        events: [
          { title: "Fighter Movie Premiere", date: "2024-01-25", type: "premiere", location: "Mumbai" },
          { title: "Cannes Film Festival", date: "2024-05-14", type: "festival", location: "Cannes, France" }
        ]
      },
      {
        name: "A.R. Rahman",
        category: "Music Composer",
        bio: "Oscar-winning composer, the Mozart of Madras. Won 2 Academy Awards, 2 Grammy Awards, and Padma Bhushan.",
        location: "Chennai, Tamil Nadu",
        followers: "35M+",
        rating: 5.0,
        review_count: 1456,
        service_prices: { general_wish: 70000, text_message: 30000, image_promotion: 350000, video_promotion: 700000 },
        image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80",
        dob: "1967-01-06",
        anniversary: "1995-03-12",
        occasions: ["Birthday", "Anniversary", "World Music Day"],
        events: [
          { title: "AR Rahman Live in Concert", date: "2024-08-15", type: "concert", location: "Chennai" },
          { title: "Maidaan Music Launch", date: "2024-04-10", type: "music_launch", location: "Mumbai" }
        ]
      },
      {
        name: "Alia Bhatt",
        category: "Actress",
        bio: "National Award-winning actress and producer. Known for versatile roles and powerful performances.",
        location: "Mumbai, Maharashtra",
        followers: "78M+",
        rating: 4.8,
        review_count: 1876,
        service_prices: { general_wish: 48000, text_message: 19000, image_promotion: 225000, video_promotion: 475000 },
        image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop&q=80",
        dob: "1993-03-15",
        anniversary: "2022-04-14",
        occasions: ["Birthday", "Anniversary", "Children's Day", "New Year"],
        events: [
          { title: "Jigra Movie Release", date: "2024-10-11", type: "movie_release", location: "Mumbai" },
          { title: "Ed-a-Mamma Store Launch", date: "2024-07-20", type: "brand_launch", location: "Delhi" }
        ]
      },
      {
        name: "Ranveer Singh",
        category: "Actor",
        bio: "Energetic actor known for versatile performances and bold fashion. Winner of 4 Filmfare Awards.",
        location: "Mumbai, Maharashtra",
        followers: "45M+",
        rating: 4.7,
        review_count: 1654,
        service_prices: { general_wish: 52000, text_message: 21000, image_promotion: 260000, video_promotion: 520000 },
        image_url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&h=800&fit=crop&q=80",
        dob: "1985-07-06",
        anniversary: "2018-11-14",
        occasions: ["Birthday", "Anniversary", "Diwali", "Holi"],
        events: [
          { title: "Rocky aur Rani Promotions", date: "2024-07-28", type: "promotion", location: "Delhi" },
          { title: "GQ Style Awards", date: "2024-09-15", type: "award", location: "Mumbai" }
        ]
      },
      {
        name: "Kareena Kapoor Khan",
        category: "Actress",
        bio: "Bollywood royalty with 2+ decades of iconic performances. Known as Bebo, winner of 6 Filmfare Awards.",
        location: "Mumbai, Maharashtra",
        followers: "55M+",
        rating: 4.8,
        review_count: 1789,
        service_prices: { general_wish: 50000, text_message: 20000, image_promotion: 250000, video_promotion: 500000 },
        image_url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=800&fit=crop&q=80",
        dob: "1980-09-21",
        anniversary: "2012-10-16",
        occasions: ["Birthday", "Anniversary", "Fashion Week"],
        events: [
          { title: "Jaane Jaan Premiere", date: "2024-09-21", type: "premiere", location: "Mumbai" },
          { title: "Lakme Fashion Week", date: "2024-10-10", type: "fashion", location: "Mumbai" }
        ]
      },
      {
        name: "MS Dhoni",
        category: "Cricketer",
        bio: "Captain Cool, former Indian cricket captain. Led India to 2011 World Cup victory and multiple IPL titles.",
        location: "Ranchi, Jharkhand",
        followers: "45M+",
        rating: 5.0,
        review_count: 2567,
        service_prices: { general_wish: 80000, text_message: 35000, image_promotion: 400000, video_promotion: 800000 },
        image_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=800&fit=crop&q=80",
        dob: "1981-07-07",
        anniversary: "2010-07-04",
        occasions: ["Birthday", "Anniversary", "Independence Day", "Republic Day"],
        events: [
          { title: "CSK Training Camp", date: "2024-03-10", type: "sports", location: "Chennai" },
          { title: "Dhoni & Friends Charity Match", date: "2024-12-07", type: "charity", location: "Ranchi" }
        ]
      },
      {
        name: "Shreya Ghoshal",
        category: "Singer",
        bio: "Playback singing sensation with 4 National Film Awards and multiple international accolades.",
        location: "Mumbai, Maharashtra",
        followers: "28M+",
        rating: 4.9,
        review_count: 1234,
        service_prices: { general_wish: 35000, text_message: 15000, image_promotion: 150000, video_promotion: 300000 },
        image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop&q=80",
        dob: "1984-03-12",
        anniversary: "2015-02-05",
        occasions: ["Birthday", "Anniversary", "World Music Day"],
        events: [
          { title: "Shreya Ghoshal Live Concert", date: "2024-06-21", type: "concert", location: "Delhi" },
          { title: "All Hearts Tour USA", date: "2024-11-01", type: "tour", location: "New York" }
        ]
      },
      {
        name: "Pankaj Tripathi",
        category: "Actor",
        bio: "National Award-winning character actor known for authentic performances in films and web series.",
        location: "Mumbai, Maharashtra",
        followers: "8M+",
        rating: 4.9,
        review_count: 876,
        service_prices: { general_wish: 25000, text_message: 10000, image_promotion: 100000, video_promotion: 200000 },
        image_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=800&h=800&fit=crop&q=80",
        dob: "1976-09-05",
        anniversary: "2004-01-15",
        occasions: ["Birthday", "Anniversary", "Teachers' Day"],
        events: [
          { title: "Mirzapur Season 3 Launch", date: "2024-07-05", type: "premiere", location: "Mumbai" },
          { title: "Main Atal Hoon Promotions", date: "2024-01-19", type: "promotion", location: "Delhi" }
        ]
      },
      {
        name: "Katrina Kaif",
        category: "Actress",
        bio: "Bollywood superstar and entrepreneur. Founder of Kay Beauty cosmetics and fitness icon.",
        location: "Mumbai, Maharashtra",
        followers: "75M+",
        rating: 4.8,
        review_count: 2198,
        service_prices: { general_wish: 55000, text_message: 23000, image_promotion: 280000, video_promotion: 560000 },
        image_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=800&fit=crop&q=80",
        dob: "1983-07-16",
        anniversary: "2021-12-09",
        occasions: ["Birthday", "Anniversary", "New Year", "Valentine's Day"],
        events: [
          { title: "Tiger 3 World Premiere", date: "2024-11-12", type: "premiere", location: "Dubai" },
          { title: "Kay Beauty Launch Event", date: "2024-08-25", type: "brand_launch", location: "Mumbai" }
        ]
      },
      {
        name: "Zakir Khan",
        category: "Comedian",
        bio: "Stand-up comedian, writer, and poet. Known for 'Sakht Launda' character and relatable comedy.",
        location: "Indore, Madhya Pradesh",
        followers: "12M+",
        rating: 4.7,
        review_count: 543,
        service_prices: { general_wish: 18000, text_message: 7000, image_promotion: 75000, video_promotion: 150000 },
        image_url: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800&h=800&fit=crop&q=80",
        dob: "1987-08-20",
        occasions: ["Birthday", "Friendship Day", "Comedy Night"],
        events: [
          { title: "Tathastu Tour Delhi", date: "2024-09-15", type: "show", location: "Delhi" },
          { title: "Amazon Prime Special", date: "2024-12-01", type: "premiere", location: "Mumbai" }
        ]
      },
      {
        name: "Sania Mirza",
        category: "Tennis Player",
        bio: "Former World No. 1 in doubles, 6-time Grand Slam champion. Padma Bhushan awardee and sports icon.",
        location: "Hyderabad, Telangana",
        followers: "14M+",
        rating: 4.8,
        review_count: 456,
        service_prices: { general_wish: 40000, text_message: 16000, image_promotion: 180000, video_promotion: 360000 },
        image_url: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=800&fit=crop&q=80",
        dob: "1986-11-15",
        anniversary: "2010-04-12",
        occasions: ["Birthday", "Sports Day", "Women's Day"],
        events: [
          { title: "Sania Mirza Tennis Academy Day", date: "2024-11-15", type: "sports", location: "Hyderabad" },
          { title: "Grand Slam Charity Match", date: "2024-06-30", type: "charity", location: "Mumbai" }
        ]
      },
      {
        name: "Vicky Kaushal",
        category: "Actor",
        bio: "National Award-winning actor known for powerful performances. Rising star of Bollywood.",
        location: "Mumbai, Maharashtra",
        followers: "18M+",
        rating: 4.8,
        review_count: 789,
        service_prices: { general_wish: 38000, text_message: 15000, image_promotion: 170000, video_promotion: 340000 },
        image_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&h=800&fit=crop&q=80",
        dob: "1988-05-16",
        anniversary: "2021-12-09",
        occasions: ["Birthday", "Anniversary", "Army Day", "Republic Day"],
        events: [
          { title: "Sam Bahadur Premiere", date: "2024-12-01", type: "premiere", location: "Mumbai" },
          { title: "Dunki Promotions", date: "2024-12-21", type: "promotion", location: "Delhi" }
        ]
      }
    ];

    const insertedCelebrities = [];

    // Build email list and clean up existing auth users in one pass
    const celebrityEmails = celebrities.map(c => `${c.name.toLowerCase().replace(/\s+/g, '.')}@example.com`);
    const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (existingUsers?.users) {
      for (const user of existingUsers.users) {
        if (user.email && celebrityEmails.includes(user.email)) {
          await supabase.auth.admin.deleteUser(user.id);
          console.log('Deleted existing auth user');
        }
      }
    }
    await new Promise(r => setTimeout(r, 500));

    for (const celeb of celebrities) {
      const emailAddress = `${celeb.name.toLowerCase().replace(/\s+/g, '.')}@example.com`;

      // Create real auth user so this account can log in
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: emailAddress,
        password: 'Common213!!',
        email_confirm: true,
        user_metadata: {
          first_name: celeb.name.split(' ')[0],
          last_name: celeb.name.split(' ').slice(1).join(' '),
        }
      });

      if (authError) {
        console.error('Auth user creation error for', celeb.name, ':', authError);
        continue;
      }

      // Check if profile was auto-created by trigger, update it; otherwise insert
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.user.id)
        .single();

      let profileData;
      if (existingProfile) {
        // Update the auto-created profile with celebrity role
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({
            email: emailAddress,
            first_name: celeb.name.split(' ')[0],
            last_name: celeb.name.split(' ').slice(1).join(' '),
            role: 'celebrity',
            referral_code: `CELEB${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          })
          .eq('user_id', authUser.user.id)
          .select()
          .single();
        if (updateError) { console.error('Profile update error:', updateError); continue; }
        profileData = updated;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            email: emailAddress,
            first_name: celeb.name.split(' ')[0],
            last_name: celeb.name.split(' ').slice(1).join(' '),
            role: 'celebrity',
            referral_code: `CELEB${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          })
          .select()
          .single();
        if (insertError) { console.error('Profile insert error:', insertError); continue; }
        profileData = inserted;
      }

      // Insert celebrity data with all details
      const { data: celebrityData, error: celebrityError } = await supabase
        .from('celebrities')
        .insert({
          profile_id: profileData.id,
          name: celeb.name,
          category: celeb.category,
          bio: celeb.bio,
          location: celeb.location,
          followers: celeb.followers,
          image_url: celeb.image_url,
          rating: celeb.rating,
          review_count: celeb.review_count,
          is_verified: true,
          is_active: true,
          verification_status: 'approved',
          service_prices: celeb.service_prices,
          delivery_time: '24-48 hours',
          date_of_birth: celeb.dob || null,
          anniversary_date: celeb.anniversary || null
        })
        .select()
        .single();

      if (celebrityError) {
        console.error('Celebrity creation error:', celebrityError);
        continue;
      }

      insertedCelebrities.push(celebrityData);

      // Insert celebrity occasions
      if (celeb.occasions && celeb.occasions.length > 0) {
        for (const occasion of celeb.occasions) {
          const occasionDate = new Date();
          occasionDate.setMonth(Math.floor(Math.random() * 12));
          occasionDate.setDate(Math.floor(Math.random() * 28) + 1);
          
          await supabase.from('celebrity_occasions').insert({
            celebrity_id: celebrityData.id,
            occasion_name: occasion,
            occasion_type: occasion.toLowerCase().replace(/\s+/g, '_'),
            occasion_date: occasionDate.toISOString().split('T')[0],
            auto_reply_enabled: true,
            auto_reply_template: `Thank you for your warm wishes on ${occasion}! Your love and support mean the world to me. - ${celeb.name}`,
            is_public: true
          });
        }
      }

      // Insert celebrity events
      if (celeb.events && celeb.events.length > 0) {
        for (const event of celeb.events) {
          await supabase.from('celebrity_events').insert({
            celebrity_id: celebrityData.id,
            title: event.title,
            event_type: event.type,
            event_date: event.date,
            location: event.location || celeb.location,
            description: `${celeb.name} will be attending ${event.title}`,
            is_public: true
          });
        }
      }

      // Add sample video media
      const videoSamples = [
        { type: 'birthday', title: `${celeb.name} - Birthday Wish Sample`, isPromotional: false },
        { type: 'anniversary', title: `${celeb.name} - Anniversary Wish Sample`, isPromotional: false },
        { type: 'promotional', title: `${celeb.name} - Brand Promotion Sample`, isPromotional: true }
      ];

      for (const sample of videoSamples) {
        await supabase.from('celebrity_media').insert({
          celebrity_id: celebrityData.id,
          title: sample.title,
          media_type: 'video',
          file_url: `https://sample-videos.com/${celeb.name.toLowerCase().replace(/\s+/g, '-')}/${sample.type}.mp4`,
          thumbnail_url: celeb.image_url,
          is_promotional: sample.isPromotional,
          is_public: true,
          description: `Sample ${sample.type} video from ${celeb.name}`
        });
      }

      console.log(`Successfully inserted celebrity: ${celeb.name}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully inserted ${insertedCelebrities.length} celebrities with occasions, events and sample videos`,
        celebrities: insertedCelebrities.map(c => ({ id: c.id, name: c.name }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
