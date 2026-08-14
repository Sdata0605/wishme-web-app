import React from "react";
import { ClipboardList, Truck, Palette, PenTool, Eye, CreditCard, Heart, Sparkles, Send, Phone, Upload, Image, Download, Video, Star, Calendar, Music, Gift, Users, Mic, MessageSquare, CheckCircle } from "lucide-react";

export const bookingWizardGuide = {
  title: "How Celebrity Booking Works",
  description: "Book personalized celebrity content in 6 easy steps. From request details to checkout — we've made it seamless.",
  steps: [
    { icon: <ClipboardList className="w-4 h-4" />, title: "Request Details", desc: "Tell us who it's for and the occasion" },
    { icon: <Truck className="w-4 h-4" />, title: "Delivery Type", desc: "Choose video, digital card, or both" },
    { icon: <Palette className="w-4 h-4" />, title: "Guidelines", desc: "Set the creative tone and goal" },
    { icon: <PenTool className="w-4 h-4" />, title: "Script", desc: "Write your script or let AI generate one" },
    { icon: <Eye className="w-4 h-4" />, title: "Review", desc: "Review pricing and edit if needed" },
    { icon: <CreditCard className="w-4 h-4" />, title: "Checkout", desc: "Pay via wallet or Razorpay" },
  ],
  tips: [
    "AI-generated scripts save time — you can still edit them",
    "Plan subscribers get automatic discounts on all services",
    "Delivery typically completes within 24–48 hours",
  ],
  faqs: [
    { q: "How long does delivery take?", a: "Most orders are processed within 24–48 hours. Rush delivery may be available for select celebrities." },
    { q: "Can I cancel or modify my order?", a: "You can modify details before payment. After payment, cancellation depends on the order status." },
    { q: "What payment methods are accepted?", a: "We accept wallet balance and Razorpay (UPI, cards, net banking)." },
  ],
};

export const wishBookingGuide = {
  title: "How Wish Booking Works",
  description: "Send a personalized celebrity wish for birthdays, anniversaries, and more. Powered by AI for quick delivery.",
  steps: [
    { icon: <Star className="w-4 h-4" />, title: "Pick Celebrity", desc: "Choose from your subscribed celebrities" },
    { icon: <Calendar className="w-4 h-4" />, title: "Select Occasion", desc: "Birthday, anniversary, or custom event" },
    { icon: <MessageSquare className="w-4 h-4" />, title: "Write Message", desc: "Add a personal message or use AI suggestions" },
    { icon: <Sparkles className="w-4 h-4" />, title: "AI Enhancement", desc: "AI refines your prompt for best results" },
    { icon: <CreditCard className="w-4 h-4" />, title: "Pay & Submit", desc: "Wallet or Razorpay payment" },
  ],
  tips: [
    "Use AI-generated message suggestions for inspiration",
    "Voice input is available — speak your message instead of typing",
    "Wish price varies by celebrity — check pricing before booking",
  ],
  faqs: [
    { q: "Can I use voice to write my message?", a: "Yes! Tap the microphone icon to dictate your message." },
    { q: "How is the wish delivered?", a: "AI generates a video/card based on your message and the celebrity's avatar." },
  ],
};

export const wishCelebrityOccasionGuide = {
  title: "How Occasion Wishes Work",
  description: "Celebrate special occasions with AI-generated cards and videos featuring your favorite celebrity.",
  steps: [
    { icon: <Heart className="w-4 h-4" />, title: "Choose Celebrity", desc: "Select a verified celebrity" },
    { icon: <Calendar className="w-4 h-4" />, title: "Pick Occasion", desc: "Birthday, wedding, etc." },
    { icon: <MessageSquare className="w-4 h-4" />, title: "Add Message", desc: "Personalize with your words" },
    { icon: <Sparkles className="w-4 h-4" />, title: "AI Generates", desc: "Card or video is created by AI" },
    { icon: <Send className="w-4 h-4" />, title: "Send & Share", desc: "Download or share directly" },
  ],
  tips: [
    "Upload a reference image for a more personalized card",
    "You can choose between AI card, upload your own card, or upload a video",
    "Generated content can be downloaded instantly after creation",
  ],
  faqs: [
    { q: "Can I upload my own card or video?", a: "Yes — switch between AI-generated, upload card, or upload video modes." },
    { q: "What if I'm not happy with the result?", a: "You can regenerate or try different prompts for better results." },
  ],
};

export const celebrityVoiceCallGuide = {
  title: "How Celebrity Voice Calls Work",
  description: "Send a personalized AI voice call in your favorite celebrity's voice for any occasion.",
  steps: [
    { icon: <Star className="w-4 h-4" />, title: "Select Celebrity", desc: "Browse voice-enabled celebrities" },
    { icon: <Calendar className="w-4 h-4" />, title: "Choose Occasion", desc: "Pick the event type" },
    { icon: <Phone className="w-4 h-4" />, title: "Enter Details", desc: "Recipient's phone and message" },
    { icon: <CreditCard className="w-4 h-4" />, title: "Pay", desc: "Wallet or online payment" },
    { icon: <Send className="w-4 h-4" />, title: "Call Delivered", desc: "AI places the call at scheduled time" },
  ],
  tips: [
    "Ensure the recipient's phone number is correct and reachable",
    "You must be subscribed to the celebrity to book a call",
    "Schedule calls for the perfect timing — like midnight birthdays!",
  ],
  faqs: [
    { q: "What if the call is not answered?", a: "The system will retry. If still unanswered, you'll be notified with options." },
    { q: "Can I schedule a specific time?", a: "Yes — use the date and time picker to schedule your call." },
  ],
};

export const voiceCallWishGuide = {
  title: "How AI Voice Calls Work",
  description: "Create and send AI-powered voice calls using custom or pre-built voices for special occasions.",
  steps: [
    { icon: <Mic className="w-4 h-4" />, title: "Choose Voice", desc: "Pick a voice or upload your own" },
    { icon: <Calendar className="w-4 h-4" />, title: "Set Occasion", desc: "Select the type of wish" },
    { icon: <Phone className="w-4 h-4" />, title: "Enter Number", desc: "Recipient's phone number" },
    { icon: <MessageSquare className="w-4 h-4" />, title: "Write Script", desc: "What should the call say?" },
    { icon: <Send className="w-4 h-4" />, title: "Send Call", desc: "AI delivers the voice call" },
  ],
  tips: [
    "Upload your own voice to create personalized AI calls",
    "Supported audio formats: MP3, WAV, M4A",
    "Calls cost ₹100 per call from your wallet balance",
  ],
  faqs: [
    { q: "Can I clone my own voice?", a: "Yes — go to the 'Upload Voice' tab and record or upload a sample." },
    { q: "How long is each call?", a: "Calls are typically 30–60 seconds depending on the script length." },
  ],
};

export const greetingCardsGuide = {
  title: "How AI Greeting Cards Work",
  description: "Generate beautiful, AI-powered greeting cards for any occasion. Download or save to your library.",
  steps: [
    { icon: <Calendar className="w-4 h-4" />, title: "Pick Occasion", desc: "Birthday, wedding, Diwali, etc." },
    { icon: <MessageSquare className="w-4 h-4" />, title: "Add Details", desc: "Recipient name and your greeting" },
    { icon: <Sparkles className="w-4 h-4" />, title: "AI Generates", desc: "Stunning card created instantly" },
    { icon: <Download className="w-4 h-4" />, title: "Download", desc: "Save or share your card" },
  ],
  tips: [
    "Upload a reference image for personalized results",
    "Save cards to your library for future reference",
    "Each card costs a small amount from your wallet balance",
  ],
  faqs: [
    { q: "Can I customize the text style?", a: "The AI handles styling, but you can describe your preferred style in the prompt." },
    { q: "What resolution are the cards?", a: "Cards are generated in high resolution suitable for printing and digital sharing." },
  ],
};

export const photoWishGuide = {
  title: "How Photo Wishes Work",
  description: "Upload a photo and add beautiful AI-styled text overlays to create unique, personalized greetings.",
  steps: [
    { icon: <Upload className="w-4 h-4" />, title: "Upload Photo", desc: "Choose a photo of your loved one" },
    { icon: <Calendar className="w-4 h-4" />, title: "Select Occasion", desc: "Pick the celebration type" },
    { icon: <PenTool className="w-4 h-4" />, title: "Add Text", desc: "Write your wish message" },
    { icon: <Sparkles className="w-4 h-4" />, title: "AI Styles It", desc: "Beautiful text overlay applied" },
    { icon: <Download className="w-4 h-4" />, title: "Download", desc: "Get your photo wish" },
  ],
  tips: [
    "Use high-quality photos for best results",
    "Choose from multiple text styles: elegant, playful, modern, and more",
    "Generated images can be downloaded and shared on social media",
  ],
  faqs: [
    { q: "What image formats are supported?", a: "JPEG, PNG, and WebP formats are supported." },
    { q: "Can I preview before paying?", a: "You'll see a preview of the generated photo wish before downloading." },
  ],
};

export const imagePromotionsGuide = {
  title: "How Image Promotions Work",
  description: "Create AI-powered promotional images featuring your subscribed celebrities for brand marketing.",
  steps: [
    { icon: <Star className="w-4 h-4" />, title: "Pick Celebrity", desc: "Choose from your subscriptions" },
    { icon: <Image className="w-4 h-4" />, title: "Describe Concept", desc: "What should the ad look like?" },
    { icon: <Palette className="w-4 h-4" />, title: "Add Branding", desc: "Include your brand details" },
    { icon: <Sparkles className="w-4 h-4" />, title: "AI Generates", desc: "Professional ad created" },
    { icon: <Download className="w-4 h-4" />, title: "Download", desc: "Use in your marketing" },
  ],
  tips: [
    "Be specific in your concept — mention colors, mood, and setting",
    "Upload a reference image for more accurate results",
    "Celebrity must have avatar training enabled for this feature",
  ],
  faqs: [
    { q: "Do I need permission to use these in ads?", a: "Your subscription grants usage rights for the generated promotional content." },
    { q: "Can I upload a reference image?", a: "Yes — you can upload a reference image or use the celebrity's existing promo image." },
  ],
};

export const ugcAdsGuide = {
  title: "How UGC Ad Creation Works",
  description: "Generate viral-ready UGC video ads featuring AI celebrity avatars for your products and brands.",
  steps: [
    { icon: <Star className="w-4 h-4" />, title: "Select Celebrity", desc: "Choose an AI avatar" },
    { icon: <ClipboardList className="w-4 h-4" />, title: "Product Details", desc: "Name, description, and image" },
    { icon: <PenTool className="w-4 h-4" />, title: "Write Script", desc: "AI helps craft the perfect script" },
    { icon: <Video className="w-4 h-4" />, title: "Generate Video", desc: "AI creates your UGC ad" },
    { icon: <Download className="w-4 h-4" />, title: "Download & Use", desc: "Ready for social media" },
  ],
  tips: [
    "Upload a clear product image for best results",
    "Choose hook styles like 'Problem-Solution' or 'Testimonial' for engagement",
    "Videos are generated in HD quality suitable for all social platforms",
  ],
  faqs: [
    { q: "How long does video generation take?", a: "Typically 3–10 minutes depending on complexity." },
    { q: "Can I edit the script before generating?", a: "Yes — you can fully edit the AI-generated script." },
  ],
};

export const ugcVideosGuide = {
  title: "How UGC Video Generation Works",
  description: "Create AI-powered video scripts featuring your subscribed celebrities. Phase 1 includes script + avatar image.",
  steps: [
    { icon: <Star className="w-4 h-4" />, title: "Pick Celebrity", desc: "Select from your favorites" },
    { icon: <MessageSquare className="w-4 h-4" />, title: "Enter Concept", desc: "Describe your video idea" },
    { icon: <Sparkles className="w-4 h-4" />, title: "AI Script", desc: "Script is auto-generated" },
    { icon: <CreditCard className="w-4 h-4" />, title: "Pay", desc: "Wallet or online payment" },
    { icon: <Video className="w-4 h-4" />, title: "Get Video", desc: "Download the final output" },
  ],
  tips: [
    "Be detailed in your concept for better script quality",
    "You must be subscribed to the celebrity to use their avatar",
    "Video generation is in Phase 1 — more features coming soon!",
  ],
  faqs: [
    { q: "What's included in Phase 1?", a: "Script generation and celebrity avatar image. Full video generation is coming in Phase 2." },
    { q: "Can I use the output commercially?", a: "Yes — your subscription grants commercial usage rights." },
  ],
};

export const occasionBookingGuide = {
  title: "How Occasion Booking Works",
  description: "Book AI-generated video or card content for special occasions through your favorite celebrities.",
  steps: [
    { icon: <Calendar className="w-4 h-4" />, title: "Choose Occasion", desc: "Birthday, wedding, or event" },
    { icon: <Star className="w-4 h-4" />, title: "Select Celebrity", desc: "Pick a verified celebrity" },
    { icon: <MessageSquare className="w-4 h-4" />, title: "Add Message", desc: "Personal touch for the recipient" },
    { icon: <Video className="w-4 h-4" />, title: "Choose Format", desc: "AI video or greeting card" },
    { icon: <Send className="w-4 h-4" />, title: "Submit Order", desc: "Your order is processed" },
  ],
  tips: [
    "Select 'AI Video' for a personalized video message",
    "Select 'AI Card' for a beautifully designed greeting card",
    "Celebrity availability may vary — check their profile first",
  ],
  faqs: [
    { q: "What's the difference between video and card?", a: "Videos feature the celebrity's AI avatar speaking. Cards are beautifully designed static images." },
    { q: "Can I choose delivery date?", a: "Yes — you can set a preferred delivery date for the order." },
  ],
};

export const followingGuide = {
  title: "How Celebrity Subscriptions Work",
  description: "Subscribe to your favorite celebrities for lifetime access to UGC videos, wishes, promotions, and more.",
  steps: [
    { icon: <Users className="w-4 h-4" />, title: "Browse", desc: "Discover verified celebrities" },
    { icon: <Heart className="w-4 h-4" />, title: "Subscribe", desc: "One-time subscription fee" },
    { icon: <CreditCard className="w-4 h-4" />, title: "Pay", desc: "Wallet or online payment" },
    { icon: <CheckCircle className="w-4 h-4" />, title: "Unlocked!", desc: "Lifetime access to all services" },
  ],
  tips: [
    "Subscriptions are one-time — pay once, access forever",
    "Each celebrity sets their own subscription price",
    "Subscribing unlocks wishes, voice calls, UGC videos, and promotions",
  ],
  faqs: [
    { q: "Is the subscription recurring?", a: "No — it's a one-time payment for lifetime access to that celebrity's services." },
    { q: "What do I get with a subscription?", a: "Access to personalized wishes, AI voice calls, UGC video ads, and image promotions." },
  ],
};

export const bookingDetailGuide = {
  title: "How to Book a Service",
  description: "Choose from video wishes, image promotions, or video promos — each tailored to your needs.",
  steps: [
    { icon: <Star className="w-4 h-4" />, title: "View Celebrity", desc: "Check their profile and pricing" },
    { icon: <Gift className="w-4 h-4" />, title: "Pick Service", desc: "Video wish, ad, or promo" },
    { icon: <MessageSquare className="w-4 h-4" />, title: "Add Details", desc: "Message and instructions" },
    { icon: <CreditCard className="w-4 h-4" />, title: "Confirm & Pay", desc: "Complete your booking" },
  ],
  tips: [
    "Plan subscribers get automatic discounts on all services",
    "Video wishes are great for personal celebrations",
    "Image promotions are perfect for brand marketing",
  ],
  faqs: [
    { q: "What services are available?", a: "Personal Video Wish, Image Promotion (Make an Ad), and Video Promotion." },
    { q: "How are prices determined?", a: "Each celebrity sets their own prices. Plan discounts are applied automatically." },
  ],
};
