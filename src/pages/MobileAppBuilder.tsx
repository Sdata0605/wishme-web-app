import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const prompts = [
  {
    id: 1,
    title: "Home Page - Hero Section & Dashboard",
    category: "Core",
    prompt: `Build the Home Page with Hero Section matching the web app design.

**DESIGN SYSTEM (USE THROUGHOUT APP):**

Colors (HSL format):
- Primary: hsl(15, 100%, 60%) // Orange #FF6B35
- Secondary: hsl(333, 100%, 50%) // Pink #FF006E  
- Accent: hsl(264, 80%, 57%) // Purple #8338EC
- Background: hsl(216, 59%, 11%) // Deep Navy #0A1628
- Background Secondary: hsl(214, 34%, 16%) // #1A2332
- Foreground: hsl(0, 0%, 100%) // White
- Muted: hsl(215, 15%, 65%) // #A0AEC0

Gradients:
- Primary Gradient: linear-gradient(135deg, #FF6B35 0%, #FF006E 50%, #8338EC 100%)
- Hero Gradient: linear-gradient(180deg, rgba(10,22,40,0.9) 0%, rgba(10,22,40,0.7) 50%, rgba(10,22,40,1) 100%)
- Background Gradient: linear-gradient(135deg, #0A1628 0%, #0D1B2A 50%, #0A1628 100%)

Typography:
- Headings: Bold weight, tight tracking
- Body: Regular weight  
- Stats: Bold, text-3xl
- Captions: text-sm, muted color

Spacing & Layout:
- Container padding: 16px (mobile), max-width 1200px (desktop)
- Card padding: 16-24px
- Gap between elements: 12-32px
- Border radius: 12px cards, 24px buttons (full rounded)

Animations:
- Fade in on mount
- Scale on press: active:scale-95
- Stagger delays: 0.1s, 0.2s, 0.3s


**DESKTOP VERSION (Screens > 768px):**

Component: Hero.tsx

Structure:
- Full-screen hero section (min-height: 600px)
- Background image with gradient overlay
- Centered content container (max-width: 1200px)

Elements:
1. Badge (top):
   - Text: "Personalized Celebrity Wishes"
   - Icon: Sparkles (lucide-react)
   - Background: Primary color with 10% opacity
   - Border: Primary with 20% opacity
   - Backdrop blur effect

2. Main Heading:
   - Text: "Make Every Moment "
   - Gradient text: "Unforgettable"
   - Font: text-4xl sm:text-5xl md:text-6xl lg:text-7xl
   - Font weight: bold
   - Gradient: Use primary gradient on "Unforgettable"

3. Subheading:
   - Text: "Book personalized video wishes from your favorite celebrities. Perfect for birthdays, anniversaries, and special occasions."
   - Font: text-lg sm:text-xl
   - Color: Muted foreground
   - Max width: 800px

4. Search Bar:
   - Input with left icon (Search from lucide-react)
   - Placeholder: "Search for celebrities, categories, or occasions..."
   - Height: 56px (h-14)
   - Border radius: 12px (rounded-xl)
   - Background: Semi-transparent white with backdrop blur
   - Embedded button on right:
     - Text: "Search"
     - Variant: gradient background
     - Size: lg
     - Position: absolute right-1.5

5. CTA Buttons Row:
   - Two buttons side by side (responsive: stack on mobile)
   - Button 1: "Browse Celebrities" (variant: gradient)
   - Button 2: "How It Works" (variant: outline with semi-transparent background)
   - Size: xl (h-14)
   - Min width: 200px

6. Stats Grid (3 columns):
   - Stat 1: "500+" / "Celebrities"
   - Stat 2: "50K+" / "Happy Customers"  
   - Stat 3: "4.9" / "Average Rating"
   - Number: text-3xl, bold, gradient text
   - Label: text-sm, muted color
   - Spacing: gap-8, padding-top-8


**MOBILE VERSION (Screens ≤ 768px):**

Component: MobileHeroSection.tsx

Structure:
- Gradient background (from-background via-background-secondary to-background)
- Padding: px-4 py-8
- Min height: 100vh

Elements:
1. Badge (top):
   - Text: "Trending Now"
   - Icon: TrendingUp (lucide-react)
   - Gradient background
   - Pulse animation

2. Main Heading (3 lines):
   - Line 1: "Get"
   - Line 2: "Personalized"  
   - Line 3: "AI Videos" (gradient)
   - Font: text-4xl, bold
   - Gradient only on line 3

3. Subheading:
   - Text: "From your favorite celebrities. Book now and make moments unforgettable."
   - Font: text-base
   - Color: Muted
   - Margin: 16px top

4. CTA Button:
   - Text: "Explore Celebrities"
   - Full width
   - Size: lg
   - Gradient background
   - Margin: 24px top

5. Featured Stars Section:
   - Heading: "Featured Stars" (text-xl, bold)
   - Horizontal scroll container (no scrollbar)
   - Display: 6 celebrity cards max
   - Card dimensions: 140x200px
   - Gap: 12px

Celebrity Card Structure:
- Thumbnail image (aspect ratio 3:4)
- Play button overlay (center, semi-transparent)
- Rating badge (top-right):
  - Star icon + rating number (e.g., "4.8")
  - Background: semi-transparent dark
- Category badge (bottom-left):
  - Text: Celebrity category
  - Background: primary gradient
  - Font: text-xs
- Delivery time badge (bottom-right):
  - Clock icon + "7 days"
  - Background: semi-transparent
- Name label (below card):
  - Font: text-sm, bold
  - Color: Foreground
- Link: Navigate to /celebrities/[id]

6. Quick Stats (3 column grid):
   - Same stats as desktop
   - Smaller font: text-2xl for numbers
   - Card background with border
   - Padding: 16px
   - Border radius: 12px


**COMPONENT FILES TO CREATE:**

1. components/Hero.tsx (Desktop)
2. components/home/MobileHeroSection.tsx (Mobile)  
3. components/CelebrityCard.tsx (Reusable card)
4. components/home/SearchBar.tsx (Reusable search)
5. components/home/StatsGrid.tsx (Reusable stats)


**API INTEGRATION (ALL DYNAMIC DATA FROM DATABASE):**

Endpoint 1: Fetch Featured Celebrities (Top 6 by Rating)
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrities?is_active=eq.true&is_verified=eq.true&select=id,name,category,image_url,video_thumbnail_url,rating,review_count,delivery_time&order=rating.desc&limit=6

Headers:
- apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y
- Authorization: Bearer [same as apikey]

Response:
[
  {
    "id": "uuid",
    "name": "Celebrity Name",
    "category": "Actor",
    "image_url": "https://...",
    "video_thumbnail_url": "https://...",
    "rating": 4.8,
    "review_count": 120,
    "delivery_time": "7 days"
  }
]

Endpoint 2: Fetch Celebrity Video Media (Actual Video Thumbnails)
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrity_media?celebrity_id=in.(id1,id2,id3)&is_public=eq.true&media_type=eq.video&select=celebrity_id,thumbnail_url,file_url

Response:
[
  {
    "celebrity_id": "uuid",
    "thumbnail_url": "https://...",
    "file_url": "https://..."
  }
]

Endpoint 3: Get Total Active Celebrities Count
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrities?is_active=eq.true&is_verified=eq.true&select=id

Headers: [Prefer: count=exact]

Response Headers: [Content-Range: 0-499/500] (500 total)

Endpoint 4: Get Total Users Count
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/profiles?select=id

Headers: [Prefer: count=exact]

Response Headers: [Content-Range: 0-49999/50000] (50000 total)

Endpoint 5: Get All Celebrity Ratings (to Calculate Average)
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrities?is_active=eq.true&select=rating

Response:
[
  { "rating": 4.8 },
  { "rating": 4.9 },
  { "rating": 4.7 }
]

Calculate Average: sum(ratings) / count(ratings)


**IMPLEMENTATION EXAMPLE:**

\`\`\`typescript
import { useState, useEffect } from 'react';
import { View, ScrollView, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createClient } from '@supabase/supabase-js';
import { Star, Clock, Play, TrendingUp } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

const supabase = createClient(
  'https://eqikeuqwbphwongtfzhe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y'
);

// Helper component for dynamic stat cards
function DynamicStatCard({ label, endpoint, filters = {}, formatValue = (v) => \`\${v}+\` }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchCount();
  }, []);

  const fetchCount = async () => {
    const query = supabase.from(endpoint).select('id', { count: 'exact', head: true });
    Object.keys(filters).forEach(key => query.eq(key, filters[key]));
    const { count } = await query;
    setCount(count || 0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1A2332', borderRadius: 12, padding: 16, marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)' }}>
      <LinearGradient colors={['#FF6B35', '#FF006E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'transparent' }}>{formatValue(count)}</Text>
      </LinearGradient>
      <Text style={{ marginTop: 4, fontSize: 12, color: '#A0AEC0' }}>{label}</Text>
    </View>
  );
}

// Helper component for average rating
function DynamicAvgRatingCard({ label }) {
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    fetchAvgRating();
  }, []);

  const fetchAvgRating = async () => {
    const { data } = await supabase.from('celebrities').select('rating').eq('is_active', true);
    if (data && data.length > 0) {
      const avg = data.reduce((sum, c) => sum + (c.rating || 0), 0) / data.length;
      setAvgRating(parseFloat(avg.toFixed(1)));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1A2332', borderRadius: 12, padding: 16, marginLeft: 8, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)' }}>
      <LinearGradient colors={['#FF6B35', '#FF006E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ alignSelf: 'flex-start' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'transparent' }}>{avgRating}</Text>
      </LinearGradient>
      <Text style={{ marginTop: 4, fontSize: 12, color: '#A0AEC0' }}>{label}</Text>
    </View>
  );
}

export default function MobileHeroSection() {
  const [celebrities, setCelebrities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchFeaturedCelebrities();
  }, []);

  const fetchFeaturedCelebrities = async () => {
    // Fetch top 6 celebrities by rating
    const { data: celebData, error } = await supabase
      .from('celebrities')
      .select('id, name, category, image_url, video_thumbnail_url, rating, review_count, delivery_time')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('rating', { ascending: false })
      .limit(6);

    if (celebData) {
      // Fetch actual video media for each celebrity
      const celebIds = celebData.map(c => c.id);
      const { data: mediaData } = await supabase
        .from('celebrity_media')
        .select('celebrity_id, thumbnail_url, file_url')
        .in('celebrity_id', celebIds)
        .eq('is_public', true)
        .eq('media_type', 'video');

      // Map celebrities with their actual video thumbnails
      const enrichedCelebrities = celebData.map(celeb => ({
        ...celeb,
        thumbnail: mediaData?.find(m => m.celebrity_id === celeb.id)?.thumbnail_url || 
                   celeb.video_thumbnail_url || 
                   celeb.image_url
      }));

      setCelebrities(enrichedCelebrities);
    }
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={['#0A1628', '#1A2332', '#0A1628']}
      style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 32 }}
    >
      {/* Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 107, 53, 0.1)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' }}>
        <TrendingUp size={16} color="#FF6B35" />
        <Text style={{ marginLeft: 8, color: '#FF6B35', fontWeight: '600' }}>Trending Now</Text>
      </View>

      {/* Heading */}
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#FFFFFF' }}>Get</Text>
        <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#FFFFFF' }}>Personalized</Text>
        <LinearGradient
          colors={['#FF6B35', '#FF006E', '#8338EC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ alignSelf: 'flex-start' }}
        >
          <Text style={{ fontSize: 40, fontWeight: 'bold', color: 'transparent' }}>AI Videos</Text>
        </LinearGradient>
      </View>

      {/* Subheading */}
      <Text style={{ marginTop: 16, fontSize: 16, color: '#A0AEC0' }}>
        From your favorite celebrities. Book now and make moments unforgettable.
      </Text>

      {/* CTA Button */}
      <TouchableOpacity style={{ marginTop: 24 }}>
        <LinearGradient
          colors={['#FF6B35', '#FF006E', '#8338EC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 24, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>Explore Celebrities</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Featured Stars */}
      <View style={{ marginTop: 40 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 }}>Featured Stars</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {celebrities.map((celebrity) => (
            <TouchableOpacity
              key={celebrity.id}
              onPress={() => navigation.navigate('CelebrityProfile', { id: celebrity.id })}
              style={{ marginRight: 12, width: 140 }}
            >
              <View style={{ position: 'relative', height: 200, borderRadius: 12, overflow: 'hidden' }}>
                <Image source={{ uri: celebrity.image_url }} style={{ width: '100%', height: '100%' }} />
                
                {/* Play Overlay */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 50, padding: 12 }}>
                    <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                </View>

                {/* Rating Badge */}
                <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Star size={12} color="#FFD700" fill="#FFD700" />
                  <Text style={{ marginLeft: 4, color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>{celebrity.rating}</Text>
                </View>

                {/* Category Badge */}
                <LinearGradient
                  colors={['#FF6B35', '#FF006E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', bottom: 8, left: 8, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>{celebrity.category}</Text>
                </LinearGradient>

                {/* Delivery Badge */}
                <View style={{ position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 }}>
                  <Clock size={10} color="#FFFFFF" />
                  <Text style={{ marginLeft: 4, color: '#FFFFFF', fontSize: 10 }}>{celebrity.delivery_time}</Text>
                </View>
              </View>

              {/* Name */}
              <Text style={{ marginTop: 8, fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' }}>
                {celebrity.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Quick Stats - DYNAMIC FROM DATABASE */}
      <View style={{ marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' }}>
        <DynamicStatCard 
          label="Celebrities" 
          endpoint="celebrities" 
          filters={{ is_active: true, is_verified: true }}
        />
        <DynamicStatCard 
          label="Happy Users" 
          endpoint="profiles" 
          formatValue={(count) => count >= 1000 ? \`\${Math.floor(count / 1000)}K+\` : \`\${count}+\`}
        />
        <DynamicAvgRatingCard label="Avg Rating" />
      </View>
    </LinearGradient>
  );
}
\`\`\`


**DEPENDENCIES:**
- react-native
- @react-navigation/native
- @react-navigation/native-stack
- @supabase/supabase-js
- lucide-react-native
- react-native-linear-gradient
- react-native-fast-image (for optimized images)


**RESPONSIVE BEHAVIOR:**
Use useWindowDimensions() to detect screen width:
- width > 768px: Show Hero.tsx (desktop version)
- width ≤ 768px: Show MobileHeroSection.tsx (mobile version)


**TESTING CHECKLIST:**
✓ Featured celebrities load correctly
✓ Celebrity cards display ratings, categories, delivery time
✓ Tap celebrity card navigates to profile page
✓ Stats display correct numbers
✓ Gradient backgrounds render properly
✓ Icons render from lucide-react-native
✓ Responsive switching between desktop/mobile versions
✓ Search bar input works (search functionality in next prompt)
✓ CTA buttons navigate correctly`,
    dependencies: [
      "@react-navigation/native",
      "@react-navigation/native-stack",
      "@supabase/supabase-js",
      "lucide-react-native",
      "react-native-linear-gradient",
      "react-native-fast-image"
    ]
  },
  {
    id: 2,
    title: "Bottom Navigation & User Dashboard",
    category: "Navigation",
    prompt: `Build the bottom tab navigation and user dashboard.

**BOTTOM TAB NAVIGATOR (5 TABS):**

Tab Structure:
1. 🏠 Home - Main dashboard
2. ⭐ Celebrities - Browse all celebrities
3. 💼 Business - UGC ads & promotions
4. 🎵 Music - AI Music Studio
5. 👤 Profile / 🔑 Sign In - **CONDITIONAL** based on authentication state
   - If user is logged in: Show "Profile" with User icon
   - If user is NOT logged in: Show "Sign In" with LogIn icon

Design:
- Background: Semi-transparent blur effect (#1A2332 with 90% opacity)
- Height: 64px
- Active tab: 
  - Icon color: Primary gradient
  - Label color: Foreground (white)
  - Orange indicator dot above icon
  - Scale animation (1.1x)
- Inactive tab:
  - Icon color: Muted (#A0AEC0)
  - Label color: Muted
  - Scale: 1x
- Border top: 1px, color: rgba(255, 255, 255, 0.1)


**HOME/DASHBOARD SCREEN:**

1. Header Section:
   - Gradient background (#FF6B35 to #FF006E)
   - Greeting: "Hello, [First Name]!"
   - Font: text-2xl, bold, white
   - Avatar (right): User profile image, 48x48px, rounded-full
   - Notification bell icon (top-right): Badge if unread notifications

2. Wallet Balance Card:
   - Prominent gradient card (#8338EC to #FF006E)
   - Current balance: "₹X,XXX" (text-3xl, bold, white)
   - Label: "Wallet Balance" (text-sm, white with 80% opacity)
   - "Add Money" button:
     - White background
     - Primary text color
     - Size: sm
     - Border radius: 24px
     - OnPress: Navigate to /wallet
   - Last transaction preview:
     - Amount + description
     - Font: text-xs, white with 70% opacity
     - Example: "₹500 - Booking #12345"

3. Quick Actions Grid (2x2):
   - Card background: Background Secondary (#1A2332)
   - Border: 1px, rgba(255, 107, 53, 0.2)
   - Border radius: 16px
   - Padding: 20px
   - Gap: 16px

   Action 1: "Wish a Celebrity"
   - Icon: Star (lucide-react-native, gradient)
   - Title: "Wish a Celebrity"
   - Subtitle: "Book personalized videos"
   - OnPress: Navigate to /celebrities

   Action 2: "Wish Loved Ones"
   - Icon: Heart (lucide-react-native, gradient)
   - Title: "Wish Loved Ones"
   - Subtitle: "FREE occasion wishes"
   - Badge: "FREE" (green background)
   - OnPress: Navigate to /occasions

   Action 3: "Create UGC Ad"
   - Icon: Briefcase (lucide-react-native, gradient)
   - Title: "Create UGC Ad"
   - Subtitle: "Celebrity promotions"
   - OnPress: Navigate to /business

   Action 4: "Generate Music"
   - Icon: Music (lucide-react-native, gradient)
   - Title: "Generate Music"
   - Subtitle: "AI Music Studio"
   - OnPress: Navigate to /music

4. Featured Celebrities Carousel:
   - Heading: "Featured Celebrities" (text-xl, bold)
   - "View All" link (right, text-sm, primary color)
   - Horizontal scroll (5 celebrities max)
   - Celebrity card:
     - Image: 120x160px, rounded-xl
     - Name: text-sm, bold
     - Category badge: text-xs, gradient background
     - Rating: Star icon + number
     - Starting price: "From ₹X,XXX"
     - OnPress: Navigate to /celebrities/[id]

5. Upcoming Occasions Alert:
   - Show if loved ones have birthdays/anniversaries in next 7 days
   - Card background: Orange gradient with 10% opacity
   - Icon: Bell (lucide-react-native, orange)
   - Text: "X upcoming occasions in next 7 days"
   - "Set Reminder" CTA button
   - OnPress: Navigate to /occasions


**API INTEGRATION:**

Endpoint 1: Fetch User Dashboard Data
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/profiles?user_id=eq.[user_id]&select=first_name,last_name,avatar_url

Endpoint 2: Fetch Wallet Balance
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/wallets?user_id=eq.[user_id]&select=balance

Endpoint 3: Fetch Last Transaction
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/wallet_transactions?user_id=eq.[user_id]&select=amount,type,description,created_at&order=created_at.desc&limit=1

Endpoint 4: Fetch Unread Notifications Count
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/notifications?user_id=eq.[user_id]&is_read=eq.false&select=count

Endpoint 5: Fetch Upcoming Occasions
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/loved_ones?user_id=eq.[user_id]&select=id,first_name,date_of_birth
(Filter client-side for birthdays in next 7 days)


**IMPLEMENTATION EXAMPLE:**

\`\`\`typescript
import { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Star, Briefcase, Music, User, LogIn, Bell, Plus } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createClient } from '@supabase/supabase-js';

const Tab = createBottomTabNavigator();

const supabase = createClient(
  'https://eqikeuqwbphwongtfzhe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y'
);

function DashboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('user_id', user.id)
      .single();
    setProfile(profileData);

    // Fetch wallet balance
    const { data: walletData } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    setBalance(walletData?.balance || 0);

    // Fetch last transaction
    const { data: transactionData } = await supabase
      .from('wallet_transactions')
      .select('amount, type, description')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setLastTransaction(transactionData);

    // Fetch unread notifications
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A1628' }}>
      {/* Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF006E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }}>
            Hello, {profile?.first_name || 'User'}!
          </Text>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Bell size={24} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF006E', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Wallet Balance Card */}
      <View style={{ paddingHorizontal: 20, marginTop: -32 }}>
        <LinearGradient
          colors={['#8338EC', '#FF006E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: 16, padding: 20 }}
        >
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Wallet Balance</Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 }}>
            ₹{balance.toLocaleString('en-IN')}
          </Text>
          {lastTransaction && (
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
              {lastTransaction.type === 'credit' ? '+' : '-'}₹{lastTransaction.amount} - {lastTransaction.description}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('Wallet')}
            style={{ marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' }}
          >
            <Text style={{ color: '#8338EC', fontWeight: 'bold' }}>Add Money</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Quick Actions Grid */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* Action 1 */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Celebrities')}
            style={{ width: '48%', backgroundColor: '#1A2332', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)' }}
          >
            <Star size={32} color="#FF6B35" />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12 }}>Wish a Celebrity</Text>
            <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 4 }}>Book personalized videos</Text>
          </TouchableOpacity>

          {/* Action 2 */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Occasions')}
            style={{ width: '48%', backgroundColor: '#1A2332', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)', position: 'relative' }}
          >
            <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' }}>FREE</Text>
            </View>
            <Heart size={32} color="#FF006E" />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12 }}>Wish Loved Ones</Text>
            <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 4 }}>FREE occasion wishes</Text>
          </TouchableOpacity>

          {/* Action 3 */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Business')}
            style={{ width: '48%', backgroundColor: '#1A2332', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)' }}
          >
            <Briefcase size={32} color="#8338EC" />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12 }}>Create UGC Ad</Text>
            <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 4 }}>Celebrity promotions</Text>
          </TouchableOpacity>

          {/* Action 4 */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Music')}
            style={{ width: '48%', backgroundColor: '#1A2332', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)' }}
          >
            <Music size={32} color="#FF6B35" />
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12 }}>Generate Music</Text>
            <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 4 }}>AI Music Studio</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

export default function MainNavigator() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth state
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(26, 35, 50, 0.9)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;
          
          if (route.name === 'Home') IconComponent = Home;
          else if (route.name === 'Celebrities') IconComponent = Star;
          else if (route.name === 'Business') IconComponent = Briefcase;
          else if (route.name === 'Music') IconComponent = Music;
          else if (route.name === 'Profile' || route.name === 'SignIn') {
            // CONDITIONAL: Show User icon if logged in, LogIn icon if not
            IconComponent = user ? User : LogIn;
          }

          return (
            <View style={{ alignItems: 'center' }}>
              {focused && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B35', marginBottom: 4 }} />}
              <IconComponent size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Celebrities" component={CelebritiesScreen} />
      <Tab.Screen name="Business" component={BusinessScreen} />
      <Tab.Screen name="Music" component={MusicScreen} />
      
      {/* CONDITIONAL TAB: Profile if logged in, Sign In if not */}
      {user ? (
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ tabBarLabel: 'Profile' }}
        />
      ) : (
        <Tab.Screen 
          name="SignIn" 
          component={AuthScreen}
          options={{ tabBarLabel: 'Sign In' }}
        />
      )}
    </Tab.Navigator>
  );
}
\`\`\`


**DEPENDENCIES:**
- @react-navigation/bottom-tabs
- react-native-blur (for tab bar blur effect)
- lucide-react-native


**TESTING CHECKLIST:**
✓ User greeting displays correct first name
✓ Wallet balance loads and formats correctly
✓ Last transaction displays properly
✓ Unread notification badge shows correct count
✓ Quick actions navigate to correct screens
✓ Tab bar active/inactive states work correctly
✓ Tab bar blur effect renders
✓ Orange indicator dot shows on active tab`,
    dependencies: [
      "@react-navigation/bottom-tabs",
      "react-native-blur",
      "lucide-react-native"
    ]
  },
  {
    id: 3,
    title: "Celebrity Browse, Search & Filter",
    category: "Celebrities",
    prompt: `Build the celebrity browsing experience with search and filters.

**CELEBRITY BROWSE SCREEN:**

1. Header:
   - Title: "Browse Celebrities"
   - Font: text-2xl, bold
   - Back button (if navigated from elsewhere)

2. Search Bar (sticky at top):
   - Icon: Search (lucide-react-native, left side)
   - Placeholder: "Search by name..."
   - Height: 48px
   - Border radius: 24px (full rounded)
   - Background: Background Secondary (#1A2332)
   - Border: 1px, rgba(255, 107, 53, 0.2)
   - OnChange: Debounce 300ms, then filter results

3. Filter Chips (horizontal scroll):
   - Categories: All, Actors, Musicians, Athletes, Influencers, Authors, Comedians
   - Chip design:
     - Active: Gradient background (#FF6B35 to #FF006E), white text
     - Inactive: Transparent background, border, muted text
     - Border radius: 24px
     - Padding: 8px 16px
   - Multi-select enabled (tap to toggle)
   - Gap: 8px

4. Sort & Filter Row:
   - Sort dropdown:
     - Options: Rating (High to Low), Price (Low to High), Price (High to Low), Newest First
     - Default: Rating (High to Low)
   - Price range slider (modal):
     - Min: ₹0
     - Max: ₹200,000
     - Step: ₹1,000
     - Display: "₹X,XXX - ₹X,XXX"
   - "Filters" button: Opens filter modal

5. Results Grid (2 columns):
   - Celebrity Card:
     - Image: Aspect ratio 3:4, rounded-xl
     - Verified checkmark badge (top-left if verified)
     - Favorite heart icon (top-right):
       - Outline if not favorited
       - Filled with gradient if favorited
       - OnPress: Toggle favorite
     - Name: text-base, bold
     - Category badge: text-xs, gradient background
     - Rating: Star icon + number (e.g., "4.8 ⭐ (120)")
     - Starting price: "From ₹X,XXX"
     - OnPress: Navigate to /celebrities/[id]
   - Gap: 16px
   - Padding: 20px

6. Pagination:
   - Load 20 celebrities per page
   - "Load More" button at bottom
   - Or implement infinite scroll with FlatList onEndReached
   - Show loading skeleton while fetching

7. Empty State:
   - Icon: SearchX (lucide-react-native, large, muted)
   - Text: "No celebrities found"
   - Subtext: "Try adjusting your filters or search query"
   - "Clear Filters" button


**API INTEGRATION:**

Endpoint 1: Fetch All Celebrities (with filters)
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrities?is_active=eq.true&is_verified=eq.true&select=id,name,category,image_url,rating,review_count,service_prices&order=rating.desc&limit=20&offset=0

Filters (append to URL):
- Search by name: &name=ilike.%{query}%
- Filter by category: &category=in.(Actor,Musician)
- Filter by price range: &service_prices->general_wish.gte.{min}&service_prices->general_wish.lte.{max}
- Sort by price: &order=service_prices->general_wish.asc (or .desc)

Response:
[
  {
    "id": "uuid",
    "name": "Celebrity Name",
    "category": "Actor",
    "image_url": "https://...",
    "rating": 4.8,
    "review_count": 120,
    "service_prices": {
      "general_wish": 5000,
      "text_message": 2000,
      "image_promotion": 25000,
      "video_promotion": 50000
    }
  }
]

Endpoint 2: Toggle Favorite
POST https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrity_favorites

Headers:
- Authorization: Bearer [user_token]

Body (to add):
{
  "user_id": "uuid",
  "celebrity_id": "uuid"
}

To remove:
DELETE https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrity_favorites?user_id=eq.[user_id]&celebrity_id=eq.[celebrity_id]

Endpoint 3: Fetch User Favorites
GET https://eqikeuqwbphwongtfzhe.supabase.co/rest/v1/celebrity_favorites?user_id=eq.[user_id]&select=celebrity_id

Response:
[
  { "celebrity_id": "uuid" }
]


**IMPLEMENTATION EXAMPLE:**

\`\`\`typescript
import { useState, useEffect } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, FlatList, Image, Text } from 'react-native';
import { Search, Star, Heart, CheckCircle, SearchX } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eqikeuqwbphwongtfzhe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y'
);

const categories = ['All', 'Actors', 'Musicians', 'Athletes', 'Influencers', 'Authors', 'Comedians'];

export default function CelebritiesScreen({ navigation }) {
  const [celebrities, setCelebrities] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['All']);
  const [sortBy, setSortBy] = useState('rating_desc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchCelebrities();
    fetchFavorites();
  }, [searchQuery, selectedCategories, sortBy, page]);

  const fetchCelebrities = async () => {
    setLoading(true);
    
    let query = supabase
      .from('celebrities')
      .select('id, name, category, image_url, rating, review_count, service_prices')
      .eq('is_active', true)
      .eq('is_verified', true);

    // Apply search filter
    if (searchQuery) {
      query = query.ilike('name', \`%\${searchQuery}%\`);
    }

    // Apply category filter
    if (!selectedCategories.includes('All')) {
      query = query.in('category', selectedCategories);
    }

    // Apply sort
    if (sortBy === 'rating_desc') {
      query = query.order('rating', { ascending: false });
    } else if (sortBy === 'price_asc') {
      query = query.order('service_prices->general_wish', { ascending: true });
    } else if (sortBy === 'price_desc') {
      query = query.order('service_prices->general_wish', { ascending: false });
    }

    query = query.range(page * 20, (page + 1) * 20 - 1);

    const { data, error } = await query;
    
    if (data) {
      setCelebrities(page === 0 ? data : [...celebrities, ...data]);
    }
    setLoading(false);
  };

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('celebrity_favorites')
      .select('celebrity_id')
      .eq('user_id', user.id);
    
    if (data) {
      setFavorites(data.map(f => f.celebrity_id));
    }
  };

  const toggleFavorite = async (celebrityId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const isFavorited = favorites.includes(celebrityId);

    if (isFavorited) {
      await supabase
        .from('celebrity_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('celebrity_id', celebrityId);
      setFavorites(favorites.filter(id => id !== celebrityId));
    } else {
      await supabase
        .from('celebrity_favorites')
        .insert({ user_id: user.id, celebrity_id: celebrityId });
      setFavorites([...favorites, celebrityId]);
    }
  };

  const toggleCategory = (category) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
    } else {
      const newCategories = selectedCategories.includes(category)
        ? selectedCategories.filter(c => c !== category)
        : [...selectedCategories.filter(c => c !== 'All'), category];
      setSelectedCategories(newCategories.length === 0 ? ['All'] : newCategories);
    }
    setPage(0);
  };

  const renderCelebrityCard = ({ item }) => {
    const isFavorited = favorites.includes(item.id);
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('CelebrityProfile', { id: item.id })}
        style={{ width: '48%', marginBottom: 16 }}
      >
        <View style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
          <Image
            source={{ uri: item.image_url }}
            style={{ width: '100%', aspectRatio: 3/4 }}
          />
          
          {/* Verified Badge */}
          {item.is_verified && (
            <View style={{ position: 'absolute', top: 8, left: 8 }}>
              <CheckCircle size={20} color="#10B981" fill="#10B981" />
            </View>
          )}

          {/* Favorite Icon */}
          <TouchableOpacity
            onPress={() => toggleFavorite(item.id)}
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            {isFavorited ? (
              <LinearGradient
                colors={['#FF6B35', '#FF006E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 20, padding: 6 }}
              >
                <Heart size={16} color="#FFFFFF" fill="#FFFFFF" />
              </LinearGradient>
            ) : (
              <Heart size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Name */}
        <Text style={{ marginTop: 8, fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' }}>
          {item.name}
        </Text>

        {/* Category Badge */}
        <LinearGradient
          colors={['#FF6B35', '#FF006E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ marginTop: 4, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF' }}>{item.category}</Text>
        </LinearGradient>

        {/* Rating */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Star size={12} color="#FFD700" fill="#FFD700" />
          <Text style={{ marginLeft: 4, fontSize: 12, color: '#FFFFFF' }}>
            {item.rating} ({item.review_count})
          </Text>
        </View>

        {/* Price */}
        <Text style={{ marginTop: 4, fontSize: 12, color: '#A0AEC0' }}>
          From ₹{item.service_prices.general_wish.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A1628' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' }}>Browse Celebrities</Text>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2332', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 107, 53, 0.2)', paddingHorizontal: 16, height: 48 }}>
          <Search size={20} color="#A0AEC0" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name..."
            placeholderTextColor="#A0AEC0"
            style={{ flex: 1, marginLeft: 12, color: '#FFFFFF' }}
          />
        </View>
      </View>

      {/* Category Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20, marginBottom: 16 }}>
        {categories.map(category => {
          const isSelected = selectedCategories.includes(category);
          
          return (
            <TouchableOpacity
              key={category}
              onPress={() => toggleCategory(category)}
              style={{ marginRight: 8 }}
            >
              {isSelected ? (
                <LinearGradient
                  colors={['#FF6B35', '#FF006E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{category}</Text>
                </LinearGradient>
              ) : (
                <View style={{ borderRadius: 24, borderWidth: 1, borderColor: '#A0AEC0', paddingHorizontal: 16, paddingVertical: 8 }}>
                  <Text style={{ color: '#A0AEC0' }}>{category}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results Grid */}
      <FlatList
        data={celebrities}
        renderItem={renderCelebrityCard}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
        onEndReached={() => setPage(page + 1)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <SearchX size={64} color="#A0AEC0" />
              <Text style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                No celebrities found
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: '#A0AEC0', textAlign: 'center' }}>
                Try adjusting your filters or search query
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
\`\`\`


**DEPENDENCIES:**
- lucide-react-native
- react-native-linear-gradient


**TESTING CHECKLIST:**
✓ Search filters celebrities by name correctly
✓ Category chips filter results properly
✓ Multi-select categories work
✓ Favorite icon toggles state
✓ Favorites persist after app restart
✓ Pagination loads more results
✓ Empty state displays when no results
✓ Celebrity card navigates to profile`,
    dependencies: [
      "lucide-react-native",
      "react-native-linear-gradient"
    ]
  }
];

const apiSections = [
  {
    title: "Authentication",
    endpoints: [
      {
        method: "POST",
        path: "/auth/v1/signup",
        description: "Create a new user account",
        body: {
          email: "user@example.com",
          password: "password123",
          data: {
            first_name: "John",
            last_name: "Doe",
            phone: "+91XXXXXXXXXX",
            referral_code: "REF123"
          }
        }
      },
      {
        method: "POST",
        path: "/auth/v1/token?grant_type=password",
        description: "Sign in with email and password",
        body: {
          email: "user@example.com",
          password: "password123"
        }
      },
      {
        method: "POST",
        path: "/auth/v1/signout",
        description: "Sign out current user"
      },
      {
        method: "GET",
        path: "/auth/v1/user",
        description: "Get current user details",
        headers: {
          Authorization: "Bearer [user_token]"
        }
      }
    ]
  },
  {
    title: "Celebrities",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/celebrities?is_active=eq.true&is_verified=eq.true&select=*&order=rating.desc",
        description: "Fetch all active and verified celebrities"
      },
      {
        method: "GET",
        path: "/rest/v1/celebrities?id=eq.[id]&select=*,celebrity_media(*),celebrity_reviews(*)",
        description: "Get celebrity details with media and reviews"
      },
      {
        method: "GET",
        path: "/rest/v1/celebrities?name=ilike.%[query]%",
        description: "Search celebrities by name"
      },
      {
        method: "GET",
        path: "/rest/v1/celebrities?category=in.(Actor,Musician)",
        description: "Filter celebrities by categories"
      },
      {
        method: "POST",
        path: "/rest/v1/celebrity_favorites",
        description: "Add celebrity to favorites",
        body: {
          user_id: "uuid",
          celebrity_id: "uuid"
        }
      },
      {
        method: "DELETE",
        path: "/rest/v1/celebrity_favorites?user_id=eq.[user_id]&celebrity_id=eq.[celebrity_id]",
        description: "Remove celebrity from favorites"
      }
    ]
  },
  {
    title: "Bookings",
    endpoints: [
      {
        method: "POST",
        path: "/rest/v1/bookings",
        description: "Create a new booking",
        body: {
          user_id: "uuid",
          celebrity_id: "uuid",
          service_type: "general_wish",
          occasion: "birthday",
          recipient_name: "Jane Doe",
          recipient_relationship: "friend",
          instructions: "Make it funny and emotional",
          script: "Happy birthday Jane! Wishing you...",
          price: 5000,
          status: "pending"
        }
      },
      {
        method: "GET",
        path: "/rest/v1/bookings?user_id=eq.[user_id]&select=*,celebrity:celebrities(*)",
        description: "Get user's bookings with celebrity details"
      },
      {
        method: "PATCH",
        path: "/rest/v1/bookings?id=eq.[booking_id]",
        description: "Update booking status",
        body: {
          status: "completed"
        }
      }
    ]
  },
  {
    title: "Wallet & Payments",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/wallets?user_id=eq.[user_id]",
        description: "Get user wallet balance"
      },
      {
        method: "GET",
        path: "/rest/v1/wallet_transactions?user_id=eq.[user_id]&order=created_at.desc",
        description: "Get wallet transaction history"
      },
      {
        method: "POST",
        path: "/functions/v1/create-razorpay-order",
        description: "Create Razorpay payment order",
        body: {
          amount: 1000,
          currency: "INR",
          receipt: "wallet_topup_123"
        }
      },
      {
        method: "POST",
        path: "/functions/v1/verify-razorpay-payment",
        description: "Verify Razorpay payment",
        body: {
          razorpay_order_id: "order_xxx",
          razorpay_payment_id: "pay_xxx",
          razorpay_signature: "signature_xxx",
          user_id: "uuid",
          amount: 1000,
          purpose: "wallet_topup"
        }
      }
    ]
  },
  {
    title: "AI Music",
    endpoints: [
      {
        method: "POST",
        path: "/functions/v1/generate-lyrics",
        description: "Generate AI lyrics",
        body: {
          theme: "love and hope",
          genre: "pop",
          mood: "romantic",
          style: "modern"
        }
      },
      {
        method: "POST",
        path: "/functions/v1/generate-music",
        description: "Generate AI music",
        body: {
          title: "My Song",
          genre: "pop",
          mood: "happy",
          lyrics: "Verse 1: ...",
          prompt: "Upbeat pop song with guitar",
          user_id: "uuid"
        }
      },
      {
        method: "POST",
        path: "/functions/v1/check-music-status",
        description: "Check music generation status",
        body: {
          generation_id: "uuid"
        }
      },
      {
        method: "GET",
        path: "/rest/v1/music_generations?user_id=eq.[user_id]&select=*&order=created_at.desc",
        description: "Get user's music generations"
      }
    ]
  }
];

export default function MobileAppBuilder() {
  const [copiedItems, setCopiedItems] = useState<{ [key: string]: boolean }>({});
  const [openPrompts, setOpenPrompts] = useState<{ [key: number]: boolean }>({});
  const { toast } = useToast();

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems({ ...copiedItems, [id]: true });
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied successfully.",
      });
      setTimeout(() => {
        setCopiedItems({ ...copiedItems, [id]: false });
      }, 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const togglePrompt = (id: number) => {
    setOpenPrompts({ ...openPrompts, [id]: !openPrompts[id] });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Mobile App Builder
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Complete prompts and API documentation for building the StarConnect mobile app
              </p>
            </div>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => window.open('https://rocket.new', '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open rocket.new
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="prompts">Build Prompts</TabsTrigger>
            <TabsTrigger value="api">API Documentation</TabsTrigger>
          </TabsList>

          {/* Build Prompts Tab */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Follow these prompts sequentially to build the complete mobile app. Each prompt includes
                  detailed design specifications, API integration, and implementation examples.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-2 text-sm">
                    <div className="mt-0.5">📱</div>
                    <p>
                      Start with <strong>Prompt #1 (Home Page)</strong> to create the foundation with Hero Section
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 text-sm">
                    <div className="mt-0.5">🎨</div>
                    <p>
                      All prompts include complete <strong>design system</strong> with colors, gradients, typography
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 text-sm">
                    <div className="mt-0.5">🔌</div>
                    <p>
                      Each prompt has <strong>real API integration</strong> with Supabase endpoints
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 text-sm">
                    <div className="mt-0.5">📦</div>
                    <p>
                      <strong>Dependencies</strong> are listed for each feature - install as needed
                    </p>
                  </div>
                  <div className="flex items-start space-x-2 text-sm">
                    <div className="mt-0.5">✅</div>
                    <p>
                      Use the <strong>Testing Checklist</strong> at the end of each prompt to verify implementation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prompts List */}
            <div className="space-y-4">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className="overflow-hidden">
                  <Collapsible
                    open={openPrompts[prompt.id]}
                    onOpenChange={() => togglePrompt(prompt.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-primary text-white font-bold text-sm">
                              {prompt.id}
                            </div>
                            <div>
                              <CardTitle className="text-xl">{prompt.title}</CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="secondary">{prompt.category}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {prompt.dependencies.length} dependencies
                                </span>
                              </div>
                            </div>
                          </div>
                          {openPrompts[prompt.id] ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Prompt Content */}
                          <div className="relative">
                            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                              {prompt.prompt}
                            </pre>
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => copyToClipboard(prompt.prompt, `prompt-${prompt.id}`)}
                            >
                              {copiedItems[`prompt-${prompt.id}`] ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* Dependencies */}
                          <div>
                            <h4 className="font-semibold mb-2 text-sm">Required Dependencies:</h4>
                            <div className="flex flex-wrap gap-2">
                              {prompt.dependencies.map((dep) => (
                                <Badge key={dep} variant="outline" className="font-mono text-xs">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* API Documentation Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supabase Configuration</CardTitle>
                <CardDescription>
                  Initialize Supabase client with these credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Base URL</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                        https://eqikeuqwbphwongtfzhe.supabase.co
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('https://eqikeuqwbphwongtfzhe.supabase.co', 'url')}
                      >
                        {copiedItems['url'] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Anon Key</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-sm truncate">
                        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y', 'key')}
                      >
                        {copiedItems['key'] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Endpoints */}
            {apiSections.map((section) => (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {section.endpoints.map((endpoint, idx) => (
                      <div key={idx} className="border-b border-border last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={endpoint.method === 'GET' ? 'default' : endpoint.method === 'POST' ? 'secondary' : 'destructive'}
                            >
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm">{endpoint.path}</code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(endpoint.path, `endpoint-${section.title}-${idx}`)}
                          >
                            {copiedItems[`endpoint-${section.title}-${idx}`] ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{endpoint.description}</p>
                        {endpoint.body && (
                          <div className="mt-2">
                            <label className="text-xs font-medium text-muted-foreground">Request Body:</label>
                            <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-x-auto">
                              {JSON.stringify(endpoint.body, null, 2)}
                            </pre>
                          </div>
                        )}
                        {endpoint.headers && (
                          <div className="mt-2">
                            <label className="text-xs font-medium text-muted-foreground">Headers:</label>
                            <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-x-auto">
                              {JSON.stringify(endpoint.headers, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}