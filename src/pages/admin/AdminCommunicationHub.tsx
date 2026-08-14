import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  Mail, MessageSquare, Smartphone, Search, Save, Eye, ChevronDown, ChevronRight,
  AlertTriangle, Loader2, Circle, Plus, Activity, Send, RefreshCw, Newspaper,
  CheckCircle2, XCircle, Trash2, Settings
} from "lucide-react";
import InternalAlertRecipientsPanel from "@/components/admin/InternalAlertRecipientsPanel";
import { format } from "date-fns";

// ─── EVENT DEFINITIONS (COMPREHENSIVE) ──────────────────────────────

type CommEvent = {
  id: string;
  category: string;
  label: string;
  description: string;
  recipient: "user" | "celebrity" | "admin" | "referrer" | "both" | "recipient";
  defaultVars: string[];
};

const COMM_EVENTS: CommEvent[] = [
  // 👤 USER AUTH & REGISTRATION
  { id: "user_registered", category: "User Auth & Registration", label: "User Registered", description: "When a new user completes signup", recipient: "user", defaultVars: ["first_name", "email", "referral_code", "platform_url"] },
  { id: "admin_new_user_alert", category: "User Auth & Registration", label: "New User Alert (Admin)", description: "Notify admin when a new user registers", recipient: "admin", defaultVars: ["full_name", "email", "phone", "plan", "timestamp"] },
  { id: "celebrity_registered", category: "User Auth & Registration", label: "Celebrity Application Received", description: "When a celebrity submits their application", recipient: "celebrity", defaultVars: ["first_name", "celebrity_name"] },
  { id: "admin_new_celebrity_alert", category: "User Auth & Registration", label: "New Celebrity Alert (Admin)", description: "Notify admin of new celebrity application", recipient: "admin", defaultVars: ["celebrity_name", "category"] },
  { id: "user_login", category: "User Auth & Registration", label: "Login Notification", description: "New login detected (once per day)", recipient: "user", defaultVars: ["first_name", "time"] },
  { id: "email_otp_sent", category: "User Auth & Registration", label: "OTP Verification", description: "When OTP is sent during signup or login", recipient: "user", defaultVars: ["first_name", "otp_code", "expires_in"] },
  { id: "password_reset_requested", category: "User Auth & Registration", label: "Password Reset Requested", description: "When user requests password reset", recipient: "user", defaultVars: ["first_name", "reset_link"] },
  { id: "password_changed", category: "User Auth & Registration", label: "Password Changed", description: "When password is successfully changed", recipient: "user", defaultVars: ["first_name", "email"] },
  { id: "welcome_onboarding", category: "User Auth & Registration", label: "Welcome / Onboarding", description: "Sent after email is verified", recipient: "user", defaultVars: ["first_name", "platform_url"] },

  // 🤝 REFERRAL SYSTEM
  { id: "referral_friend_joined", category: "Referral System", label: "Referral Friend Joined", description: "Notify referrer when someone joins via their link", recipient: "referrer", defaultVars: ["first_name", "friend_name", "friend_email"] },
  { id: "referral_welcome_to_referred_user", category: "Referral System", label: "Welcome (Referred User)", description: "Welcome message to user who joined via referral", recipient: "user", defaultVars: ["first_name", "referrer_name"] },
  { id: "referral_commission_earned_l1", category: "Referral System", label: "L1 Commission Earned", description: "When L1 referrer earns commission", recipient: "referrer", defaultVars: ["first_name", "amount", "friend_name", "total_earnings"] },
  { id: "referral_commission_earned_l2", category: "Referral System", label: "L2 Commission Earned", description: "When L2 referrer earns commission", recipient: "referrer", defaultVars: ["first_name", "amount"] },
  { id: "referral_4day_no_purchase_to_user", category: "Referral System", label: "4-Day No Purchase (User)", description: "Remind referred user who hasn't purchased in 4 days", recipient: "user", defaultVars: ["first_name", "referrer_name"] },
  { id: "referral_4day_reminder_to_referrer", category: "Referral System", label: "4-Day Reminder (Referrer)", description: "Remind referrer about inactive referred user", recipient: "referrer", defaultVars: ["first_name", "friend_name"] },
  { id: "referral_milestone", category: "Referral System", label: "Referral Milestone", description: "When referrer hits 5, 10, 25 referrals", recipient: "referrer", defaultVars: ["first_name", "count", "total_earnings"] },

  // 🎬 BOOKINGS
  { id: "booking_placed_user", category: "Bookings", label: "Booking Placed (User)", description: "Confirm booking to the user who placed it", recipient: "user", defaultVars: ["first_name", "celebrity_name", "payment_id", "amount", "service_type", "delivery_days"] },
  { id: "booking_placed_celebrity", category: "Bookings", label: "Booking Placed (Celebrity)", description: "Notify celebrity of new booking", recipient: "celebrity", defaultVars: ["celebrity_name", "fan_name", "service_type", "occasion", "celebrity_earning"] },
  { id: "booking_placed_admin", category: "Bookings", label: "Booking Placed (Admin)", description: "Notify admin of new booking", recipient: "admin", defaultVars: ["payment_id", "amount", "user_name", "celebrity_name", "service_type"] },
  { id: "booking_confirmed", category: "Bookings", label: "Booking Confirmed", description: "When admin approves/confirms booking", recipient: "user", defaultVars: ["first_name", "celebrity_name", "delivery_date"] },
  { id: "booking_rejected", category: "Bookings", label: "Booking Rejected", description: "When admin rejects/cancels booking", recipient: "user", defaultVars: ["first_name", "celebrity_name", "amount"] },
  { id: "booking_completed_user", category: "Bookings", label: "Booking Completed (User)", description: "Video/content ready for the user", recipient: "user", defaultVars: ["first_name", "celebrity_name", "video_url", "verification_code", "payment_id"] },
  { id: "booking_completed_recipient", category: "Bookings", label: "Booking Completed (Recipient)", description: "Gift video sent to the recipient", recipient: "recipient", defaultVars: ["sender_name", "celebrity_name", "video_url", "verification_code"] },
  { id: "booking_reminder_celebrity", category: "Bookings", label: "Booking Reminder (Celebrity)", description: "Remind celebrity 24h before deadline", recipient: "celebrity", defaultVars: ["celebrity_name", "fan_name", "occasion"] },

  // 💳 PAYMENTS & WALLET
  { id: "payment_successful", category: "Payments & Wallet", label: "Payment Successful", description: "After any successful payment", recipient: "user", defaultVars: ["first_name", "payment_id", "amount", "payment_method", "service_name"] },
  { id: "payment_failed", category: "Payments & Wallet", label: "Payment Failed", description: "When Razorpay payment fails", recipient: "user", defaultVars: ["first_name", "amount"] },
  { id: "wallet_topped_up", category: "Payments & Wallet", label: "Wallet Topped Up", description: "When user adds money to wallet", recipient: "user", defaultVars: ["first_name", "amount", "payment_id", "new_balance"] },
  { id: "wallet_refunded", category: "Payments & Wallet", label: "Wallet Refunded", description: "When refund is credited", recipient: "user", defaultVars: ["first_name", "amount", "reason", "new_balance"] },
  { id: "wallet_low_balance", category: "Payments & Wallet", label: "Low Wallet Balance", description: "When balance drops below ₹200 (once/week)", recipient: "user", defaultVars: ["first_name", "balance"] },
  { id: "wallet_deducted", category: "Payments & Wallet", label: "Wallet Deducted", description: "When wallet is debited for a service", recipient: "user", defaultVars: ["first_name", "amount", "service_name", "payment_id", "new_balance"] },
  { id: "abandoned_cart", category: "Payments & Wallet", label: "Abandoned Cart", description: "User started booking but didn't pay", recipient: "user", defaultVars: ["first_name", "celebrity_name", "service_type"] },

  // ⭐ CELEBRITY EVENTS
  { id: "celebrity_application_approved", category: "Celebrity Events", label: "Application Approved", description: "When admin approves celebrity application", recipient: "celebrity", defaultVars: ["celebrity_name"] },
  { id: "celebrity_application_rejected", category: "Celebrity Events", label: "Application Rejected", description: "When admin rejects application", recipient: "celebrity", defaultVars: ["celebrity_name"] },
  { id: "celebrity_payout_requested_admin", category: "Celebrity Events", label: "Payout Requested (Admin)", description: "Notify admin of payout request", recipient: "admin", defaultVars: ["celebrity_name", "amount"] },
  { id: "celebrity_payout_processed", category: "Celebrity Events", label: "Payout Processed", description: "When withdrawal is processed", recipient: "celebrity", defaultVars: ["celebrity_name", "amount"] },
  { id: "celebrity_new_subscriber", category: "Celebrity Events", label: "New Subscriber", description: "When a fan subscribes to celebrity", recipient: "celebrity", defaultVars: ["celebrity_name", "fan_name", "amount", "total_subscribers"] },
  { id: "celebrity_commission_credited", category: "Celebrity Events", label: "Commission Credited", description: "After booking completes and commission is calculated", recipient: "celebrity", defaultVars: ["celebrity_name", "gross_amount", "tds_amount", "net_amount", "order_id"] },
  { id: "celebrity_low_balance", category: "Celebrity Events", label: "Low Balance Alert", description: "When celebrity balance drops below ₹500", recipient: "celebrity", defaultVars: ["celebrity_name", "balance"] },
  { id: "celebrity_tds_report_ready", category: "Celebrity Events", label: "TDS Report Ready", description: "Monthly TDS report for celebrity", recipient: "celebrity", defaultVars: ["celebrity_name", "month", "year", "gross", "tds", "net"] },

  // 🎵 AI SERVICES
  { id: "music_generation_completed", category: "AI Services", label: "Music Generation Completed", description: "When AI music is ready", recipient: "user", defaultVars: ["first_name", "song_title", "payment_id"] },
  { id: "music_generation_failed", category: "AI Services", label: "Music Generation Failed", description: "When music generation fails", recipient: "user", defaultVars: ["first_name", "amount"] },
  { id: "greeting_card_ready", category: "AI Services", label: "Greeting Card Ready", description: "When AI greeting card is generated", recipient: "user", defaultVars: ["first_name", "payment_id"] },
  { id: "photo_wish_completed", category: "AI Services", label: "Photo Wish Completed", description: "When photo wish is ready", recipient: "user", defaultVars: ["first_name", "payment_id"] },
  { id: "voice_call_scheduled", category: "AI Services", label: "Voice Call Scheduled", description: "Confirmation of voice call", recipient: "user", defaultVars: ["first_name", "celebrity_name", "scheduled_time", "phone_number", "payment_id"] },
  { id: "voice_call_completed", category: "AI Services", label: "Voice Call Completed", description: "After voice call is completed", recipient: "user", defaultVars: ["first_name", "celebrity_name"] },
  { id: "voice_call_reminder", category: "AI Services", label: "Voice Call Reminder", description: "30 min before scheduled call", recipient: "user", defaultVars: ["first_name", "phone_number"] },

  // 📋 SUBSCRIPTIONS & PLANS
  { id: "celebrity_subscription_confirmed", category: "Subscriptions & Plans", label: "Subscription Confirmed", description: "When user subscribes to celebrity", recipient: "user", defaultVars: ["first_name", "celebrity_name", "payment_id", "amount"] },
  { id: "celebrity_subscription_expiring", category: "Subscriptions & Plans", label: "Subscription Expiring", description: "3 days before subscription expiry", recipient: "user", defaultVars: ["first_name", "celebrity_name"] },
  { id: "celebrity_subscription_expired", category: "Subscriptions & Plans", label: "Subscription Expired", description: "When subscription has expired", recipient: "user", defaultVars: ["first_name", "celebrity_name"] },
  { id: "plan_upgraded", category: "Subscriptions & Plans", label: "Plan Upgraded", description: "When user upgrades their plan", recipient: "user", defaultVars: ["first_name", "plan_name", "payment_id"] },
  { id: "plan_expiring", category: "Subscriptions & Plans", label: "Plan Expiring Soon", description: "5 days before plan expires", recipient: "user", defaultVars: ["first_name", "plan_name"] },
  { id: "plan_expired", category: "Subscriptions & Plans", label: "Plan Expired", description: "When plan has expired", recipient: "user", defaultVars: ["first_name", "plan_name"] },

  // 🔔 OCCASIONS & REMINDERS
  { id: "occasion_reminder", category: "Occasions & Reminders", label: "Occasion Reminder", description: "Remind user of upcoming occasion", recipient: "user", defaultVars: ["first_name", "occasion_name", "person_name", "days"] },

  // 📬 NEWSLETTER & UPDATES
  { id: "newsletter_welcome", category: "Newsletter & Updates", label: "Newsletter Welcome", description: "When someone subscribes to newsletter", recipient: "user", defaultVars: ["first_name", "email"] },
  { id: "newsletter_new_celebrity", category: "Newsletter & Updates", label: "New Celebrity Announcement", description: "Notify subscribers of new celebrity", recipient: "user", defaultVars: ["celebrity_name", "category"] },
  { id: "newsletter_new_feature", category: "Newsletter & Updates", label: "New Feature Announcement", description: "Admin-triggered feature announcement", recipient: "user", defaultVars: ["feature_name", "description"] },
];

const CATEGORIES = [...new Set(COMM_EVENTS.map(e => e.category))];

const CATEGORY_ICONS: Record<string, string> = {
  "User Auth & Registration": "👤",
  "Referral System": "🤝",
  "Bookings": "🎬",
  "Payments & Wallet": "💳",
  "Celebrity Events": "🌟",
  "AI Services": "🎵",
  "Subscriptions & Plans": "📋",
  "Occasions & Reminders": "🔔",
  "Newsletter & Updates": "📬",
};

const RECIPIENT_LABELS: Record<string, string> = {
  user: "User",
  celebrity: "Celebrity",
  admin: "Admin Team",
  referrer: "Referrer",
  both: "User & Celebrity",
  recipient: "Gift Recipient",
};

const DUMMY_VARS: Record<string, string> = {
  first_name: "John", full_name: "John Doe", email: "john@example.com", referral_code: "REF12345",
  otp_code: "482901", expires_in: "10 minutes", reset_link: "https://wishme.today/reset?token=xxx",
  platform_url: "https://wishme.today", friend_name: "Mike Smith", friend_email: "mike@example.com",
  referrer_name: "Jane Doe", amount: "₹2,999", total_earnings: "₹15,000", count: "10",
  celebrity_name: "Shah Rukh Khan", payment_id: "WM2503A7K3P", service_type: "Video Wish",
  delivery_days: "3", fan_name: "Priya Sharma", occasion: "Birthday", celebrity_earning: "₹2,100",
  user_name: "John Doe", delivery_date: "March 30, 2026", video_url: "https://wishme.today/video/xxx",
  verification_code: "XK7B3", sender_name: "John", payment_method: "Wallet", service_name: "Video Wish",
  new_balance: "₹5,000", balance: "₹150", reason: "Booking cancelled", phone: "+91 98765 43210",
  timestamp: "March 27, 2026 3:00 PM", category: "Actor", total_subscribers: "125",
  gross_amount: "₹7,000", tds_amount: "₹700", net_amount: "₹6,300", order_id: "WM2503A7K3P",
  month: "March", year: "2026", gross: "₹50,000", tds: "₹5,000", net: "₹45,000",
  song_title: "My Birthday Song", scheduled_time: "March 30 3:00 PM", phone_number: "+91 98765 43210",
  plan_name: "Premium", person_name: "Mom", days: "7", feature_name: "AI Photo Wish",
  description: "Create stunning AI-generated photos", time: "March 27, 2026 3:00 PM IST",
};

// ─── DEFAULT TEMPLATES ──────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<string, { email_subject: string; email_body: string; sms_body: string; whatsapp_body: string }> = {
  user_registered: {
    email_subject: "Welcome to WishMe, {{first_name}}! 🎉",
    email_body: "Hi {{first_name}},\n\nWelcome to WishMe! You're now part of India's biggest celebrity wishes platform.\n\nStart exploring celebrities and book your first personalized wish today.\n\n👉 {{platform_url}}\n\nYour referral code: {{referral_code}}\nShare it and earn commissions on every booking your friends make!\n\nWarm regards,\nTeam WishMe",
    sms_body: "Welcome to WishMe {{first_name}}! Book celebrity wishes at wishme.today. Referral code: {{referral_code}}",
    whatsapp_body: "🎉 *Welcome to WishMe, {{first_name}}!*\n\nYou're now part of India's favourite celebrity wishes platform.\n\n👉 Start exploring: {{platform_url}}\n\nYour referral code: *{{referral_code}}*\nShare & earn commissions!",
  },
  admin_new_user_alert: {
    email_subject: "New user registered: {{email}}",
    email_body: "New user registered on WishMe.\n\nName: {{full_name}}\nEmail: {{email}}\nPhone: {{phone}}\nPlan: {{plan}}\nJoined: {{timestamp}}",
    sms_body: "WishMe Admin: New user {{full_name}} ({{email}}) registered.",
    whatsapp_body: "👤 *New User Registered*\n\nName: {{full_name}}\nEmail: {{email}}\nPhone: {{phone}}\nPlan: {{plan}}",
  },
  celebrity_registered: {
    email_subject: "Application received — WishMe ✅",
    email_body: "Hi {{first_name}},\n\nWe received your celebrity application on WishMe. Our team will review it within 2-3 business days.\n\nTeam WishMe",
    sms_body: "WishMe: Celebrity application received. Review in 2-3 business days.",
    whatsapp_body: "✅ *Application Received*\n\nHi {{first_name}}, your WishMe celebrity application is under review.\n\nExpect a response within 2-3 business days.",
  },
  admin_new_celebrity_alert: {
    email_subject: "New celebrity application: {{celebrity_name}}",
    email_body: "New celebrity application from {{celebrity_name}}, Category: {{category}}.\n\nReview at wishme.today/admin/celebrities",
    sms_body: "WishMe Admin: New celebrity application from {{celebrity_name}} ({{category}}).",
    whatsapp_body: "🌟 *New Celebrity Application*\n\n{{celebrity_name}} ({{category}})\nReview at admin panel.",
  },
  user_login: {
    email_subject: "New login to your WishMe account",
    email_body: "Hi {{first_name}},\n\nNew login detected at {{time}}. If this wasn't you, secure your account immediately.\n\nTeam WishMe",
    sms_body: "WishMe: New login detected at {{time}}. Not you? Secure your account.",
    whatsapp_body: "🔐 *Login Detected*\n\nHi {{first_name}}, new login at {{time}}.\n\nIf this wasn't you, secure your account immediately.",
  },
  email_otp_sent: {
    email_subject: "Your WishMe OTP: {{otp_code}}",
    email_body: "Hi {{first_name}},\n\nYour OTP for WishMe verification is:\n\n🔐 {{otp_code}}\n\nThis code expires in {{expires_in}}. Do not share this with anyone.\n\nTeam WishMe",
    sms_body: "Your WishMe OTP is {{otp_code}}. Valid for {{expires_in}}. Do not share.",
    whatsapp_body: "🔐 *Your WishMe OTP*\n\nCode: *{{otp_code}}*\nExpires in: {{expires_in}}\n\nDo not share this with anyone.",
  },
  password_reset_requested: {
    email_subject: "Reset your WishMe password",
    email_body: "Hi {{first_name}},\n\nClick the link to reset your password:\n👉 {{reset_link}}\n\nLink expires in 30 minutes. If you didn't request this, ignore this message.\n\nTeam WishMe",
    sms_body: "WishMe password reset: {{reset_link}} — expires in 30 mins.",
    whatsapp_body: "🔒 *Password Reset*\n\nHi {{first_name}}, reset your password:\n{{reset_link}}\n\n_Link expires in 30 minutes._",
  },
  password_changed: {
    email_subject: "Your WishMe password was changed",
    email_body: "Hi {{first_name}},\n\nYour WishMe password was successfully changed.\n\nIf this wasn't you, contact support immediately.\n\nTeam WishMe",
    sms_body: "WishMe: Your password was changed. Not you? Contact support.",
    whatsapp_body: "✅ *Password Changed*\n\nHi {{first_name}}, your WishMe password was updated.\n\nIf you didn't do this, contact support immediately.",
  },
  welcome_onboarding: {
    email_subject: "You're all set, {{first_name}}! Here's how WishMe works 🌟",
    email_body: "Hi {{first_name}},\n\nYour email is verified and your account is ready!\n\nHere's what you can do:\n🎬 Celebrity video wishes\n🎵 AI music generation\n📸 AI photo wishes\n📞 Celebrity voice calls\n\nStart: {{platform_url}}\n\nTeam WishMe",
    sms_body: "Hi {{first_name}}, your WishMe account is ready! Start at {{platform_url}}",
    whatsapp_body: "🌟 *Welcome to WishMe!*\n\nHi {{first_name}}, your account is ready.\n\n🎬 Celebrity video wishes\n🎵 AI music\n📞 Voice calls\n\n👉 {{platform_url}}",
  },
  referral_friend_joined: {
    email_subject: "{{friend_name}} just joined WishMe using your referral! 🎉",
    email_body: "Hi {{first_name}},\n\nGreat news! {{friend_name}} just joined WishMe using your referral link.\n\nYou'll earn commission when they make their first purchase!\n\nTeam WishMe",
    sms_body: "WishMe: {{friend_name}} joined using your referral! Earn commission on their bookings.",
    whatsapp_body: "🎉 *New Referral!*\n\nHi {{first_name}}, *{{friend_name}}* joined WishMe via your link!\n\nYou'll earn commission on their purchases.",
  },
  referral_welcome_to_referred_user: {
    email_subject: "Welcome to WishMe! You were invited by {{referrer_name}}",
    email_body: "Hi {{first_name}},\n\nWelcome! You joined WishMe through {{referrer_name}}'s invitation.\n\nStart exploring celebrities at wishme.today\n\nTeam WishMe",
    sms_body: "Welcome to WishMe {{first_name}}! You joined via {{referrer_name}}. Explore at wishme.today",
    whatsapp_body: "🎉 *Welcome, {{first_name}}!*\n\nYou joined WishMe through *{{referrer_name}}*'s invitation.\n\n👉 Start exploring: wishme.today",
  },
  referral_commission_earned_l1: {
    email_subject: "You earned ₹{{amount}} commission on WishMe! 💰",
    email_body: "Hi {{first_name}},\n\nYou earned ₹{{amount}} commission! Your referred user {{friend_name}} made a purchase.\n\nAmount credited to your wallet. Total earnings: ₹{{total_earnings}}\n\nTeam WishMe",
    sms_body: "WishMe: You earned ₹{{amount}} L1 commission! Credited to wallet. Total: ₹{{total_earnings}}",
    whatsapp_body: "💰 *Commission Earned!*\n\nHi {{first_name}}, you earned *₹{{amount}}* L1 commission!\n\nFrom: {{friend_name}}\nTotal: ₹{{total_earnings}}\nCredited to wallet ✅",
  },
  referral_commission_earned_l2: {
    email_subject: "You earned ₹{{amount}} Level 2 commission! 💰",
    email_body: "Hi {{first_name}},\n\nYou earned ₹{{amount}} Level 2 referral commission! Credited to your WishMe wallet.\n\nTeam WishMe",
    sms_body: "WishMe: L2 commission ₹{{amount}} earned! Credited to wallet.",
    whatsapp_body: "💰 *L2 Commission Earned!*\n\n₹{{amount}} credited to your wallet ✅",
  },
  referral_4day_no_purchase_to_user: {
    email_subject: "Hi {{first_name}}, explore WishMe celebrities! 🌟",
    email_body: "Hi {{first_name}},\n\nYou joined WishMe 4 days ago but haven't explored yet! Your friend {{referrer_name}} is waiting.\n\nBrowse celebrities and make someone's day special at wishme.today\n\nTeam WishMe",
    sms_body: "WishMe: Hi {{first_name}}, explore celebrities at wishme.today! {{referrer_name}} referred you.",
    whatsapp_body: "🌟 *Explore WishMe!*\n\nHi {{first_name}}, {{referrer_name}} invited you 4 days ago.\n\nBrowse celebrities & book your first wish!\n👉 wishme.today",
  },
  referral_4day_reminder_to_referrer: {
    email_subject: "Reminder: {{friend_name}} hasn't made a purchase yet",
    email_body: "Hi {{first_name}},\n\nYour friend {{friend_name}} joined WishMe 4 days ago but hasn't purchased yet. Share a reminder!\n\nTeam WishMe",
    sms_body: "WishMe: {{friend_name}} joined 4 days ago but hasn't purchased. Send them a reminder!",
    whatsapp_body: "⏰ *Referral Reminder*\n\nHi {{first_name}}, {{friend_name}} hasn't purchased yet.\n\nShare a reminder to start earning commissions!",
  },
  referral_milestone: {
    email_subject: "🏆 You've referred {{count}} people on WishMe!",
    email_body: "Hi {{first_name}},\n\nCongratulations! You've referred {{count}} friends to WishMe. Total earnings: ₹{{total_earnings}}. Keep sharing!\n\nTeam WishMe",
    sms_body: "WishMe: Amazing! {{count}} referrals! Total earnings: ₹{{total_earnings}}",
    whatsapp_body: "🏆 *Milestone!*\n\n{{count}} referrals! Total: ₹{{total_earnings}}\n\nKeep sharing! 🚀",
  },
  booking_placed_user: {
    email_subject: "Booking confirmed — {{payment_id}} 🎬",
    email_body: "Hi {{first_name}},\n\nYour booking with {{celebrity_name}} is confirmed!\n\nPayment ID: {{payment_id}}\nAmount: ₹{{amount}}\nService: {{service_type}}\nExpected delivery: {{delivery_days}} days\n\nTrack at wishme.today/bookings\n\nTeam WishMe",
    sms_body: "WishMe: Booking confirmed! ID: {{payment_id}}. {{celebrity_name}} - ₹{{amount}}. Track at wishme.today/bookings",
    whatsapp_body: "✅ *Booking Confirmed!*\n\nHi {{first_name}},\n\n📋 ID: *{{payment_id}}*\n⭐ {{celebrity_name}}\n💰 ₹{{amount}}\n🎬 {{service_type}}\n📅 Delivery: {{delivery_days}} days",
  },
  booking_placed_celebrity: {
    email_subject: "New booking from {{fan_name}}! 🎬",
    email_body: "Hi {{celebrity_name}},\n\nYou have a new booking!\n\nFan: {{fan_name}}\nOccasion: {{occasion}}\nService: {{service_type}}\nYou will earn: ₹{{celebrity_earning}}\n\nReview at wishme.today/celebrity-dashboard\n\nTeam WishMe",
    sms_body: "WishMe: New booking from {{fan_name}}! {{service_type}}. Earn ₹{{celebrity_earning}}.",
    whatsapp_body: "📬 *New Booking!*\n\nHi {{celebrity_name}},\n\n👤 {{fan_name}}\n🎬 {{service_type}}\n💰 Earn: ₹{{celebrity_earning}}",
  },
  booking_placed_admin: {
    email_subject: "New booking — {{payment_id}} — ₹{{amount}}",
    email_body: "New booking received.\n\nPayment ID: {{payment_id}}\nAmount: ₹{{amount}}\nUser: {{user_name}}\nCelebrity: {{celebrity_name}}\nService: {{service_type}}",
    sms_body: "WishMe Admin: New booking {{payment_id}} — ₹{{amount}}.",
    whatsapp_body: "📋 *New Booking*\n\n{{payment_id}} — ₹{{amount}}\n{{user_name}} → {{celebrity_name}}",
  },
  booking_confirmed: {
    email_subject: "Your booking with {{celebrity_name}} is confirmed! ✅",
    email_body: "Hi {{first_name}},\n\nYour booking with {{celebrity_name}} has been confirmed and is being processed!\n\nExpected by {{delivery_date}}.\nTrack at wishme.today/bookings\n\nTeam WishMe",
    sms_body: "WishMe: Booking with {{celebrity_name}} confirmed! Ready by {{delivery_date}}.",
    whatsapp_body: "✅ *Booking Confirmed!*\n\nHi {{first_name}}, your order with *{{celebrity_name}}* is confirmed!\n\n📅 Expected: {{delivery_date}}",
  },
  booking_rejected: {
    email_subject: "Booking with {{celebrity_name}} cancelled",
    email_body: "Hi {{first_name}},\n\nUnfortunately we could not fulfill your booking with {{celebrity_name}}.\n\nFull refund of ₹{{amount}} has been credited to your wallet immediately.\n\nTeam WishMe",
    sms_body: "WishMe: Booking with {{celebrity_name}} cancelled. ₹{{amount}} refunded to wallet.",
    whatsapp_body: "❌ *Booking Cancelled*\n\nHi {{first_name}}, booking with {{celebrity_name}} cancelled.\n\n💰 ₹{{amount}} refunded to wallet.",
  },
  booking_completed_user: {
    email_subject: "Your video from {{celebrity_name}} is ready! 🎉",
    email_body: "Hi {{first_name}},\n\nYour video from {{celebrity_name}} is ready!\n\nWatch: {{video_url}}\nUnlock code: {{verification_code}}\nPayment ID: {{payment_id}}\n\nTeam WishMe",
    sms_body: "WishMe: Video from {{celebrity_name}} ready! Watch: {{video_url}} Code: {{verification_code}}",
    whatsapp_body: "🎉 *Video Ready!*\n\nHi {{first_name}}, your video from *{{celebrity_name}}* is ready!\n\n▶ {{video_url}}\n🔑 Code: {{verification_code}}\n📋 ID: {{payment_id}}",
  },
  booking_completed_recipient: {
    email_subject: "You've received a celebrity video gift! 🎁",
    email_body: "Hey there!\n\n{{sender_name}} sent you a surprise celebrity video from {{celebrity_name}}!\n\nWatch: {{video_url}}\nUnlock code: {{verification_code}}\n\nEnjoy! 💝",
    sms_body: "{{sender_name}} sent you a celebrity video from {{celebrity_name}}! Watch: {{video_url}} Code: {{verification_code}}",
    whatsapp_body: "🎁 *Video Gift!*\n\n{{sender_name}} sent you a video from *{{celebrity_name}}*!\n\n▶ {{video_url}}\n🔑 Code: {{verification_code}}",
  },
  booking_reminder_celebrity: {
    email_subject: "Reminder: Booking from {{fan_name}} due soon",
    email_body: "Hi {{celebrity_name}},\n\nReminder: You have a booking from {{fan_name}} due in 24 hours.\nOccasion: {{occasion}}\n\nPlease complete at wishme.today/celebrity-dashboard\n\nTeam WishMe",
    sms_body: "WishMe: Booking from {{fan_name}} due in 24h. Complete at your dashboard.",
    whatsapp_body: "⏰ *Booking Reminder*\n\nHi {{celebrity_name}}, booking from *{{fan_name}}* due in 24h.\n\nOccasion: {{occasion}}\nComplete ASAP!",
  },
  payment_successful: {
    email_subject: "Payment confirmed — {{payment_id}} ✅",
    email_body: "Hi {{first_name}},\n\nPayment confirmed!\n\nPayment ID: {{payment_id}}\nAmount: ₹{{amount}}\nMethod: {{payment_method}}\nService: {{service_name}}\n\nView receipt: wishme.today/payment/{{payment_id}}\n\nTeam WishMe",
    sms_body: "WishMe: Payment ₹{{amount}} confirmed. ID: {{payment_id}}. Receipt: wishme.today/payment/{{payment_id}}",
    whatsapp_body: "✅ *Payment Confirmed!*\n\n📋 ID: *{{payment_id}}*\n💰 ₹{{amount}}\n💳 {{payment_method}}\n🎬 {{service_name}}\n\nReceipt: wishme.today/payment/{{payment_id}}",
  },
  payment_failed: {
    email_subject: "Payment failed — WishMe",
    email_body: "Hi {{first_name}},\n\nYour payment of ₹{{amount}} failed. No money was deducted.\n\nPlease try again at wishme.today/wallet\n\nTeam WishMe",
    sms_body: "WishMe: Payment of ₹{{amount}} failed. No deduction. Try again at wishme.today/wallet",
    whatsapp_body: "❌ *Payment Failed*\n\nHi {{first_name}}, ₹{{amount}} payment failed.\n\nNo money deducted. Try again:\n👉 wishme.today/wallet",
  },
  wallet_topped_up: {
    email_subject: "₹{{amount}} added to your WishMe wallet! 💰",
    email_body: "Hi {{first_name}},\n\n₹{{amount}} added to your wallet!\n\nPayment ID: {{payment_id}}\nNew balance: ₹{{new_balance}}\n\nStart booking celebrities!\n\nTeam WishMe",
    sms_body: "WishMe: ₹{{amount}} added to wallet. ID: {{payment_id}}. Balance: ₹{{new_balance}}",
    whatsapp_body: "💰 *Wallet Topped Up!*\n\n✅ ₹{{amount}} added\n📋 ID: {{payment_id}}\n💳 Balance: ₹{{new_balance}}",
  },
  wallet_refunded: {
    email_subject: "₹{{amount}} refunded to your WishMe wallet",
    email_body: "Hi {{first_name}},\n\n₹{{amount}} refunded to your WishMe wallet.\nReason: {{reason}}\nNew balance: ₹{{new_balance}}\n\nTeam WishMe",
    sms_body: "WishMe: ₹{{amount}} refunded to wallet. Reason: {{reason}}. Balance: ₹{{new_balance}}",
    whatsapp_body: "💰 *Wallet Refunded*\n\n✅ ₹{{amount}} refunded\nReason: {{reason}}\nBalance: ₹{{new_balance}}",
  },
  wallet_low_balance: {
    email_subject: "Your WishMe wallet balance is low",
    email_body: "Hi {{first_name}},\n\nYour WishMe wallet balance is low (₹{{balance}}).\n\nAdd money to continue booking celebrities at wishme.today/wallet\n\nTeam WishMe",
    sms_body: "WishMe: Wallet balance low (₹{{balance}}). Add funds at wishme.today/wallet",
    whatsapp_body: "⚠️ *Low Balance*\n\nHi {{first_name}}, wallet balance: ₹{{balance}}\n\nAdd funds: wishme.today/wallet",
  },
  wallet_deducted: {
    email_subject: "₹{{amount}} deducted from your WishMe wallet",
    email_body: "Hi {{first_name}},\n\n₹{{amount}} deducted for {{service_name}}.\nPayment ID: {{payment_id}}\nRemaining balance: ₹{{new_balance}}\n\nTeam WishMe",
    sms_body: "WishMe: ₹{{amount}} deducted for {{service_name}}. ID: {{payment_id}}. Balance: ₹{{new_balance}}",
    whatsapp_body: "💳 *Wallet Deducted*\n\n₹{{amount}} for {{service_name}}\nID: {{payment_id}}\nBalance: ₹{{new_balance}}",
  },
  abandoned_cart: {
    email_subject: "You left something behind on WishMe 👀",
    email_body: "Hi {{first_name}},\n\nYou started a booking for {{celebrity_name}} ({{service_type}}) but didn't complete it.\n\nComplete your booking at wishme.today\n\nTeam WishMe",
    sms_body: "WishMe: You left a {{celebrity_name}} booking incomplete. Complete at wishme.today",
    whatsapp_body: "👀 *Complete Your Booking!*\n\nHi {{first_name}}, you started booking *{{celebrity_name}}* but didn't finish.\n\nSlots fill up fast!",
  },
  celebrity_application_approved: {
    email_subject: "Congratulations! Your WishMe profile is approved 🎉",
    email_body: "Congratulations {{celebrity_name}}!\n\nYour WishMe profile is approved and live! Set your prices and start earning at wishme.today/celebrity-dashboard\n\nTeam WishMe",
    sms_body: "WishMe: Congrats {{celebrity_name}}! Profile approved. Start at wishme.today/celebrity-dashboard",
    whatsapp_body: "🎉 *Profile Approved!*\n\n{{celebrity_name}}, your WishMe profile is live!\n\n🚀 wishme.today/celebrity-dashboard",
  },
  celebrity_application_rejected: {
    email_subject: "Update on your WishMe application",
    email_body: "Hi {{celebrity_name}},\n\nWe reviewed your application. Unfortunately we cannot approve it at this time.\n\nYou may reapply after 30 days.\n\nTeam WishMe",
    sms_body: "WishMe: Celebrity application not approved at this time. You may reapply after 30 days.",
    whatsapp_body: "📋 *Application Update*\n\n{{celebrity_name}}, your application was not approved.\n\nYou may reapply after 30 days.",
  },
  celebrity_payout_requested_admin: {
    email_subject: "Payout request from {{celebrity_name}} — ₹{{amount}}",
    email_body: "Payout request from {{celebrity_name}} for ₹{{amount}}.\n\nReview and approve at wishme.today/admin/wallet",
    sms_body: "WishMe Admin: Payout request {{celebrity_name}} ₹{{amount}}.",
    whatsapp_body: "🏦 *Payout Request*\n\n{{celebrity_name}} — ₹{{amount}}\nReview at admin panel.",
  },
  celebrity_payout_processed: {
    email_subject: "Payout of ₹{{amount}} processed — WishMe",
    email_body: "Hi {{celebrity_name}},\n\nYour payout of ₹{{amount}} has been processed!\n\nIt will reflect in your bank account within 2-3 business days.\n\nTeam WishMe",
    sms_body: "WishMe: Payout ₹{{amount}} processed. Reflects in 2-3 days.",
    whatsapp_body: "🏦 *Payout Processed!*\n\n✅ ₹{{amount}} sent to your bank.\n\nAllow 2-3 business days.",
  },
  celebrity_new_subscriber: {
    email_subject: "{{fan_name}} subscribed to you on WishMe! ⭐",
    email_body: "Hi {{celebrity_name}},\n\n{{fan_name}} just subscribed to you!\n\nAmount: ₹{{amount}}\nTotal subscribers: {{total_subscribers}}\n\nTeam WishMe",
    sms_body: "WishMe: {{fan_name}} subscribed! ₹{{amount}}. Total: {{total_subscribers}}.",
    whatsapp_body: "⭐ *New Subscriber!*\n\n*{{fan_name}}* subscribed!\n\n💰 ₹{{amount}}\n👥 Total: {{total_subscribers}}",
  },
  celebrity_commission_credited: {
    email_subject: "Commission ₹{{net_amount}} credited — {{order_id}}",
    email_body: "Hi {{celebrity_name}},\n\nCommission credited for {{order_id}}.\n\nGross: ₹{{gross_amount}}\nTDS: ₹{{tds_amount}}\nNet credited: ₹{{net_amount}}\n\nTeam WishMe",
    sms_body: "WishMe: Commission ₹{{net_amount}} credited for {{order_id}}.",
    whatsapp_body: "💰 *Commission Credited!*\n\nGross: ₹{{gross_amount}}\nTDS: ₹{{tds_amount}}\nNet: *₹{{net_amount}}*\nOrder: {{order_id}}",
  },
  celebrity_low_balance: {
    email_subject: "Your WishMe earnings balance is low",
    email_body: "Hi {{celebrity_name}},\n\nYour WishMe earnings balance is low (₹{{balance}}).\n\nComplete more bookings to earn more!\n\nTeam WishMe",
    sms_body: "WishMe: Celebrity balance low (₹{{balance}}). Complete bookings to earn.",
    whatsapp_body: "⚠️ *Low Balance*\n\n{{celebrity_name}}, balance: ₹{{balance}}\n\nComplete bookings to earn more!",
  },
  celebrity_tds_report_ready: {
    email_subject: "TDS Report for {{month}} {{year}} ready",
    email_body: "Hi {{celebrity_name}},\n\nYour TDS report for {{month}} {{year}} is ready.\n\nTotal earnings: ₹{{gross}}\nTDS deducted: ₹{{tds}}\nNet: ₹{{net}}\n\nDownload at wishme.today/celebrity-dashboard\n\nTeam WishMe",
    sms_body: "WishMe: TDS report {{month}} {{year}} ready. Gross: ₹{{gross}}, TDS: ₹{{tds}}.",
    whatsapp_body: "📊 *TDS Report Ready*\n\n{{month}} {{year}}\nGross: ₹{{gross}}\nTDS: ₹{{tds}}\nNet: ₹{{net}}",
  },
  music_generation_completed: {
    email_subject: "Your AI song '{{song_title}}' is ready! 🎵",
    email_body: "Hi {{first_name}},\n\nYour AI song '{{song_title}}' is ready!\nPayment ID: {{payment_id}}\n\nListen and download at wishme.today/my-music\n\nTeam WishMe",
    sms_body: "WishMe: Song '{{song_title}}' ready! ID: {{payment_id}}. Listen at wishme.today/my-music",
    whatsapp_body: "🎵 *Song Ready!*\n\n*{{song_title}}* is ready!\nID: {{payment_id}}\n\n🎶 wishme.today/my-music",
  },
  music_generation_failed: {
    email_subject: "Song generation failed — refund issued",
    email_body: "Hi {{first_name}},\n\nYour song generation failed. ₹{{amount}} has been refunded to your wallet.\n\nPlease try again.\n\nTeam WishMe",
    sms_body: "WishMe: Song generation failed. ₹{{amount}} refunded to wallet.",
    whatsapp_body: "❌ *Generation Failed*\n\n₹{{amount}} refunded to wallet.\n\nPlease try again.",
  },
  greeting_card_ready: {
    email_subject: "Your greeting card is ready! 🎨",
    email_body: "Hi {{first_name}},\n\nYour greeting card is ready!\nPayment ID: {{payment_id}}\n\nView and download at wishme.today/greeting-cards\n\nTeam WishMe",
    sms_body: "WishMe: Greeting card ready! ID: {{payment_id}}. View at wishme.today/greeting-cards",
    whatsapp_body: "🎨 *Card Ready!*\n\nID: {{payment_id}}\n\n👉 wishme.today/greeting-cards",
  },
  photo_wish_completed: {
    email_subject: "Your photo wish is ready! 📸",
    email_body: "Hi {{first_name}},\n\nYour photo wish is ready!\nPayment ID: {{payment_id}}\n\nView at wishme.today/bookings\n\nTeam WishMe",
    sms_body: "WishMe: Photo wish ready! ID: {{payment_id}}. View at wishme.today/bookings",
    whatsapp_body: "📸 *Photo Wish Ready!*\n\nID: {{payment_id}}\n\n👉 wishme.today/bookings",
  },
  voice_call_scheduled: {
    email_subject: "Voice call confirmed — {{payment_id}} 📞",
    email_body: "Hi {{first_name}},\n\nYour celebrity voice call is confirmed!\n\nScheduled: {{scheduled_time}}\nPhone: {{phone_number}}\nPayment ID: {{payment_id}}\n\nMake sure you're available!\n\nTeam WishMe",
    sms_body: "WishMe: Voice call confirmed at {{scheduled_time}} to {{phone_number}}. ID: {{payment_id}}",
    whatsapp_body: "📞 *Call Confirmed!*\n\n🕐 {{scheduled_time}}\n📱 {{phone_number}}\n📋 ID: {{payment_id}}\n\nBe available!",
  },
  voice_call_completed: {
    email_subject: "Celebrity voice call completed! ✅",
    email_body: "Hi {{first_name}},\n\nYour celebrity voice call with {{celebrity_name}} is completed.\n\nThank you for using WishMe!\n\nTeam WishMe",
    sms_body: "WishMe: Voice call with {{celebrity_name}} completed!",
    whatsapp_body: "✅ *Call Completed!*\n\nVoice call with *{{celebrity_name}}* is done.\n\nHope you loved it! 🎉",
  },
  voice_call_reminder: {
    email_subject: "Voice call starts in 30 minutes!",
    email_body: "Hi {{first_name}},\n\nYour celebrity call starts in 30 minutes!\n\nMake sure you are available at {{phone_number}}.\n\nTeam WishMe",
    sms_body: "WishMe: Celebrity call in 30 mins! Be available at {{phone_number}}.",
    whatsapp_body: "⏰ *Call in 30 mins!*\n\nBe available at {{phone_number}}.",
  },
  celebrity_subscription_confirmed: {
    email_subject: "Subscribed to {{celebrity_name}}! ⭐",
    email_body: "Hi {{first_name}},\n\nYou're now subscribed to {{celebrity_name}}!\n\nPayment ID: {{payment_id}}\nAmount: ₹{{amount}}\n\nView at wishme.today/following\n\nTeam WishMe",
    sms_body: "WishMe: Subscribed to {{celebrity_name}}! ID: {{payment_id}}. ₹{{amount}}",
    whatsapp_body: "⭐ *Subscribed!*\n\n{{celebrity_name}}\nID: {{payment_id}}\n₹{{amount}}",
  },
  celebrity_subscription_expiring: {
    email_subject: "{{celebrity_name}} subscription expires in 3 days",
    email_body: "Hi {{first_name}},\n\nYour subscription to {{celebrity_name}} expires in 3 days!\n\nRenew to keep access.\n\nTeam WishMe",
    sms_body: "WishMe: {{celebrity_name}} subscription expires in 3 days. Renew now!",
    whatsapp_body: "⚠️ *Expiring Soon*\n\n{{celebrity_name}} subscription expires in 3 days.\n\nRenew now!",
  },
  celebrity_subscription_expired: {
    email_subject: "{{celebrity_name}} subscription expired",
    email_body: "Hi {{first_name}},\n\nYour subscription to {{celebrity_name}} has expired.\n\nRenew to keep booking them.\n\nTeam WishMe",
    sms_body: "WishMe: {{celebrity_name}} subscription expired. Renew now.",
    whatsapp_body: "❌ *Subscription Expired*\n\n{{celebrity_name}} subscription expired.\n\nRenew to keep access.",
  },
  plan_upgraded: {
    email_subject: "Welcome to {{plan_name}} plan! 🚀",
    email_body: "Hi {{first_name}},\n\nWelcome to {{plan_name}} plan!\nPayment ID: {{payment_id}}\n\nHigher commissions and exclusive access are now unlocked!\n\nTeam WishMe",
    sms_body: "WishMe: Upgraded to {{plan_name}}! ID: {{payment_id}}. Enjoy premium benefits!",
    whatsapp_body: "🚀 *Plan Upgraded!*\n\n*{{plan_name}}* plan active!\nID: {{payment_id}}\n\nEnjoy premium benefits!",
  },
  plan_expiring: {
    email_subject: "Your {{plan_name}} plan expires in 5 days",
    email_body: "Hi {{first_name}},\n\nYour {{plan_name}} plan expires in 5 days.\n\nRenew to keep your benefits and referral rates.\n\nTeam WishMe",
    sms_body: "WishMe: {{plan_name}} expires in 5 days. Renew now!",
    whatsapp_body: "⚠️ *Plan Expiring*\n\n{{plan_name}} plan expires in 5 days.\n\nRenew to keep benefits!",
  },
  plan_expired: {
    email_subject: "Your {{plan_name}} plan has expired",
    email_body: "Hi {{first_name}},\n\nYour {{plan_name}} plan has expired.\n\nRenew to restore your benefits.\n\nTeam WishMe",
    sms_body: "WishMe: {{plan_name}} plan expired. Renew to restore benefits.",
    whatsapp_body: "❌ *Plan Expired*\n\n{{plan_name}} plan expired. Renew now.",
  },
  occasion_reminder: {
    email_subject: "{{occasion_name}} for {{person_name}} is in {{days}} days! 🎉",
    email_body: "Hi {{first_name}},\n\n{{occasion_name}} for {{person_name}} is in {{days}} days!\n\nBook a celebrity wish now at wishme.today/celebrities\n\nTeam WishMe",
    sms_body: "WishMe: {{occasion_name}} for {{person_name}} in {{days}} days! Book at wishme.today",
    whatsapp_body: "🎉 *Occasion Alert!*\n\n{{occasion_name}} for *{{person_name}}* in {{days}} days!\n\nBook a celebrity wish now!\n👉 wishme.today/celebrities",
  },
  newsletter_welcome: {
    email_subject: "Welcome to WishMe updates! 📬",
    email_body: "Hi there!\n\nWelcome to WishMe updates! You'll receive news about new celebrities, features, and exclusive offers.\n\nTeam WishMe",
    sms_body: "Welcome to WishMe newsletter! Stay tuned for updates.",
    whatsapp_body: "📬 *Newsletter Subscribed!*\n\nYou'll receive updates on celebrities, offers & features.",
  },
  newsletter_new_celebrity: {
    email_subject: "New celebrity on WishMe: {{celebrity_name}}! 🌟",
    email_body: "New celebrity on WishMe: {{celebrity_name}} ({{category}}) is now available!\n\nBook now at wishme.today",
    sms_body: "WishMe: New celebrity {{celebrity_name}} ({{category}}) available! Book at wishme.today",
    whatsapp_body: "🌟 *New Celebrity!*\n\n*{{celebrity_name}}* ({{category}}) is now on WishMe!\n\n👉 Book now at wishme.today",
  },
  newsletter_new_feature: {
    email_subject: "New on WishMe: {{feature_name}}! ✨",
    email_body: "Exciting news! WishMe now has {{feature_name}}.\n\n{{description}}\n\nTry it at wishme.today",
    sms_body: "WishMe: New feature — {{feature_name}}! Try at wishme.today",
    whatsapp_body: "✨ *New Feature!*\n\n*{{feature_name}}*\n\n{{description}}\n\n👉 wishme.today",
  },
};

// ─── TYPES ──────────────────────────────────────────────────────────

type ChannelKey = "email" | "sms" | "whatsapp";

type EventState = {
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_subject: string;
  email_body: string;
  sms_body: string;
  whatsapp_body: string;
  email_template_id: string | null;
  sms_template_id: string | null;
  whatsapp_template_id: string | null;
  recipient_type: string;
  db_id: string | null;
};

const defaultEventState = (evt: CommEvent): EventState => ({
  email_enabled: false,
  sms_enabled: false,
  whatsapp_enabled: false,
  email_subject: DEFAULT_TEMPLATES[evt.id]?.email_subject || "",
  email_body: DEFAULT_TEMPLATES[evt.id]?.email_body || "",
  sms_body: DEFAULT_TEMPLATES[evt.id]?.sms_body || "",
  whatsapp_body: DEFAULT_TEMPLATES[evt.id]?.whatsapp_body || "",
  email_template_id: null,
  sms_template_id: null,
  whatsapp_template_id: null,
  recipient_type: evt.recipient,
  db_id: null,
});

// ─── MAIN COMPONENT ────────────────────────────────────────────────

export default function AdminCommunicationHub() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>(COMM_EVENTS[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [eventStates, setEventStates] = useState<Record<string, EventState>>({});
  const [dirtyEvents, setDirtyEvents] = useState<Set<string>>(new Set());
  const [masterToggles, setMasterToggles] = useState({ email: true, sms: false, whatsapp: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewChannel, setPreviewChannel] = useState<ChannelKey>("email");
  const [activeTab, setActiveTab] = useState<ChannelKey>("email");
  const [mainView, setMainView] = useState<"events" | "logs" | "newsletter" | "settings">("events");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // API status
  const [resendStatus, setResendStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [checkingResend, setCheckingResend] = useState(false);
  const [checkingWhatsapp, setCheckingWhatsapp] = useState(false);

  // Bulk email
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);
  const [bulkEmailForm, setBulkEmailForm] = useState({ subject: "", content: "" });
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);

  const selectedEvent = COMM_EVENTS.find(e => e.id === selectedEventId)!;

  // ─── QUERIES ──────────────────────────────────────────────────────

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["message-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("message_logs").select("*").order("sent_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: subscribers = [], isLoading: subscribersLoading, refetch: refetchSubscribers } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("newsletter_subscriptions").select("*").order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["messaging-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("messaging_settings").select("*").order("setting_key");
      if (error) throw error;
      return data;
    },
  });

  // ─── LOAD DATA ────────────────────────────────────────────────────

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: platformSettings } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["email_global_enabled", "sms_global_enabled", "whatsapp_global_enabled"]);

      if (platformSettings) {
        const m = { ...masterToggles };
        platformSettings.forEach(s => {
          if (s.setting_key === "email_global_enabled") m.email = s.setting_value === "true";
          if (s.setting_key === "sms_global_enabled") m.sms = s.setting_value === "true";
          if (s.setting_key === "whatsapp_global_enabled") m.whatsapp = s.setting_value === "true";
        });
        setMasterToggles(m);
      }

      const { data: dbEvents } = await supabase.from("message_events").select("*");
      const { data: templates } = await supabase.from("message_templates").select("*");

      const states: Record<string, EventState> = {};
      for (const evt of COMM_EVENTS) {
        const dbEvt = dbEvents?.find((d: any) => d.event_key === evt.id);
        const state = defaultEventState(evt);

        if (dbEvt) {
          state.db_id = dbEvt.id;
          state.email_enabled = (dbEvt as any).email_enabled ?? false;
          state.sms_enabled = (dbEvt as any).sms_enabled ?? false;
          state.whatsapp_enabled = (dbEvt as any).whatsapp_enabled ?? false;
          state.email_template_id = dbEvt.email_template_id;
          state.sms_template_id = (dbEvt as any).sms_template_id;
          state.whatsapp_template_id = dbEvt.whatsapp_template_id;
          state.recipient_type = (dbEvt as any).recipient_type ?? evt.recipient;

          const defaults = DEFAULT_TEMPLATES[evt.id];
          if (dbEvt.email_template_id && templates) {
            const t = templates.find((tpl: any) => tpl.id === dbEvt.email_template_id);
            if (t) { state.email_subject = t.subject || defaults?.email_subject || ""; state.email_body = t.content || defaults?.email_body || ""; }
          }
          if ((dbEvt as any).sms_template_id && templates) {
            const t = templates.find((tpl: any) => tpl.id === (dbEvt as any).sms_template_id);
            if (t) { state.sms_body = t.content || defaults?.sms_body || ""; }
          }
          if (dbEvt.whatsapp_template_id && templates) {
            const t = templates.find((tpl: any) => tpl.id === dbEvt.whatsapp_template_id);
            if (t) { state.whatsapp_body = t.content || defaults?.whatsapp_body || ""; }
          }
        }
        states[evt.id] = state;
      }
      setEventStates(states);
    } catch (err) {
      console.error("Failed to load:", err);
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ─── SAVE ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const state = eventStates[selectedEventId];
      if (!state) return;

      // Upsert templates for each channel
      let emailTemplateId = state.email_template_id;
      if (state.email_body || state.email_subject) {
        if (emailTemplateId) {
          await supabase.from("message_templates").update({ subject: state.email_subject, content: state.email_body, updated_at: new Date().toISOString() }).eq("id", emailTemplateId);
        } else {
          const { data } = await supabase.from("message_templates").insert({ name: selectedEventId + "_email", channel: "email", subject: state.email_subject, content: state.email_body }).select("id").single();
          emailTemplateId = data?.id || null;
        }
      }

      let smsTemplateId = state.sms_template_id;
      if (state.sms_body) {
        if (smsTemplateId) {
          await supabase.from("message_templates").update({ content: state.sms_body, updated_at: new Date().toISOString() }).eq("id", smsTemplateId);
        } else {
          const { data } = await supabase.from("message_templates").insert({ name: selectedEventId + "_sms", channel: "sms", content: state.sms_body }).select("id").single();
          smsTemplateId = data?.id || null;
        }
      }

      let whatsappTemplateId = state.whatsapp_template_id;
      if (state.whatsapp_body) {
        if (whatsappTemplateId) {
          await supabase.from("message_templates").update({ content: state.whatsapp_body, updated_at: new Date().toISOString() }).eq("id", whatsappTemplateId);
        } else {
          const { data } = await supabase.from("message_templates").insert({ name: selectedEventId + "_whatsapp", channel: "whatsapp", content: state.whatsapp_body }).select("id").single();
          whatsappTemplateId = data?.id || null;
        }
      }

      const eventPayload: any = {
        event_key: selectedEventId,
        description: selectedEvent.description,
        email_enabled: state.email_enabled,
        sms_enabled: state.sms_enabled,
        whatsapp_enabled: state.whatsapp_enabled,
        email_template_id: emailTemplateId,
        sms_template_id: smsTemplateId,
        whatsapp_template_id: whatsappTemplateId,
        recipient_type: state.recipient_type,
        category: selectedEvent.category,
        label: selectedEvent.label,
        is_enabled: state.email_enabled || state.sms_enabled || state.whatsapp_enabled,
        updated_at: new Date().toISOString(),
      };

      if (state.db_id) {
        await supabase.from("message_events").update(eventPayload).eq("id", state.db_id);
      } else {
        const { data } = await supabase.from("message_events").insert(eventPayload).select("id").single();
        if (data) {
          setEventStates(prev => ({
            ...prev,
            [selectedEventId]: { ...prev[selectedEventId], db_id: data.id, email_template_id: emailTemplateId, sms_template_id: smsTemplateId, whatsapp_template_id: whatsappTemplateId },
          }));
        }
      }

      setDirtyEvents(prev => { const next = new Set(prev); next.delete(selectedEventId); return next; });
      toast({ title: "Saved", description: `${selectedEvent.label} settings saved.` });
    } catch (err) {
      console.error("Save failed:", err);
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Save all events at once
  const handleSaveAll = async () => {
    setSaving(true);
    let count = 0;
    try {
      for (const evtId of dirtyEvents) {
        const state = eventStates[evtId];
        const evt = COMM_EVENTS.find(e => e.id === evtId);
        if (!state || !evt) continue;

        let emailTemplateId = state.email_template_id;
        if (state.email_body || state.email_subject) {
          if (emailTemplateId) {
            await supabase.from("message_templates").update({ subject: state.email_subject, content: state.email_body }).eq("id", emailTemplateId);
          } else {
            const { data } = await supabase.from("message_templates").insert({ name: evtId + "_email", channel: "email", subject: state.email_subject, content: state.email_body }).select("id").single();
            emailTemplateId = data?.id || null;
          }
        }

        let smsTemplateId = state.sms_template_id;
        if (state.sms_body) {
          if (smsTemplateId) {
            await supabase.from("message_templates").update({ content: state.sms_body }).eq("id", smsTemplateId);
          } else {
            const { data } = await supabase.from("message_templates").insert({ name: evtId + "_sms", channel: "sms", content: state.sms_body }).select("id").single();
            smsTemplateId = data?.id || null;
          }
        }

        let whatsappTemplateId = state.whatsapp_template_id;
        if (state.whatsapp_body) {
          if (whatsappTemplateId) {
            await supabase.from("message_templates").update({ content: state.whatsapp_body }).eq("id", whatsappTemplateId);
          } else {
            const { data } = await supabase.from("message_templates").insert({ name: evtId + "_whatsapp", channel: "whatsapp", content: state.whatsapp_body }).select("id").single();
            whatsappTemplateId = data?.id || null;
          }
        }

        const payload: any = {
          event_key: evtId, description: evt.description,
          email_enabled: state.email_enabled, sms_enabled: state.sms_enabled, whatsapp_enabled: state.whatsapp_enabled,
          email_template_id: emailTemplateId, sms_template_id: smsTemplateId, whatsapp_template_id: whatsappTemplateId,
          recipient_type: state.recipient_type, category: evt.category, label: evt.label,
          is_enabled: state.email_enabled || state.sms_enabled || state.whatsapp_enabled,
        };

        if (state.db_id) {
          await supabase.from("message_events").update(payload).eq("id", state.db_id);
        } else {
          const { data } = await supabase.from("message_events").insert(payload).select("id").single();
          if (data) {
            setEventStates(prev => ({ ...prev, [evtId]: { ...prev[evtId], db_id: data.id, email_template_id: emailTemplateId, sms_template_id: smsTemplateId, whatsapp_template_id: whatsappTemplateId } }));
          }
        }
        count++;
      }
      setDirtyEvents(new Set());
      toast({ title: "All Saved", description: `${count} event(s) saved.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save all.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── MASTER TOGGLE ────────────────────────────────────────────────

  const toggleMaster = async (channel: ChannelKey, value: boolean) => {
    setMasterToggles(prev => ({ ...prev, [channel]: value }));
    await supabase.from("platform_settings").update({ setting_value: String(value) }).eq("setting_key", `${channel}_global_enabled`);
    toast({ title: `${channel.charAt(0).toUpperCase() + channel.slice(1)} ${value ? "enabled" : "disabled"} globally` });
  };

  // ─── HELPERS ──────────────────────────────────────────────────────

  const updateField = (eventId: string, field: keyof EventState, value: any) => {
    setEventStates(prev => ({ ...prev, [eventId]: { ...prev[eventId], [field]: value } }));
    setDirtyEvents(prev => new Set(prev).add(eventId));
  };

  const insertVariable = (varName: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const fieldKey = activeTab === "email" ? "email_body" : activeTab === "sms" ? "sms_body" : "whatsapp_body";
    const current = eventStates[selectedEventId]?.[fieldKey] as string || "";
    const insertion = `{{${varName}}}`;
    const newVal = current.substring(0, start) + insertion + current.substring(end);
    updateField(selectedEventId, fieldKey, newVal);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + insertion.length, start + insertion.length); }, 0);
  };

  const renderPreview = (channel: ChannelKey) => {
    const state = eventStates[selectedEventId];
    if (!state) return "";
    let text = channel === "email" ? state.email_body : channel === "sms" ? state.sms_body : state.whatsapp_body;
    for (const [key, val] of Object.entries(DUMMY_VARS)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
    }
    return text;
  };

  const filteredEvents = COMM_EVENTS.filter(e =>
    e.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next; });
  };

  const checkApiStatus = async (service: 'resend' | 'whatsapp') => {
    service === 'resend' ? setCheckingResend(true) : setCheckingWhatsapp(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-messaging-status', { body: { service } });
      if (error) throw error;
      if (service === 'resend' && data.resend) { setResendStatus(data.resend); sonnerToast[data.resend.connected ? 'success' : 'error'](data.resend.message); }
      else if (service === 'whatsapp' && data.whatsapp) { setWhatsappStatus(data.whatsapp); sonnerToast[data.whatsapp.connected ? 'success' : 'error'](data.whatsapp.message); }
    } catch (error: any) {
      sonnerToast.error(`Failed to check ${service}: ${error.message}`);
    } finally {
      service === 'resend' ? setCheckingResend(false) : setCheckingWhatsapp(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!bulkEmailForm.subject || !bulkEmailForm.content) { sonnerToast.error("Fill in subject and content"); return; }
    setSendingBulkEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-newsletter', {
        body: { subject: bulkEmailForm.subject, content: bulkEmailForm.content, filter: 'active' },
      });
      if (error) throw error;
      sonnerToast.success(`Bulk email: ${data.sent} sent, ${data.failed} failed`);
      setBulkEmailDialogOpen(false);
      setBulkEmailForm({ subject: "", content: "" });
      refetchLogs();
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to send");
    } finally {
      setSendingBulkEmail(false);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    const { error } = await supabase.from("newsletter_subscriptions").delete().eq("id", id);
    error ? sonnerToast.error("Failed to remove") : (sonnerToast.success("Removed"), refetchSubscribers());
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase.from("messaging_settings").update({ setting_value: value }).eq("setting_key", key);
    if (error) sonnerToast.error(error.message);
    else { queryClient.invalidateQueries({ queryKey: ["messaging-settings"] }); sonnerToast.success("Setting updated"); }
  };

  const getStatusIndicator = (status: { connected: boolean; message: string } | null) => {
    if (!status) return <span className="w-3 h-3 rounded-full bg-muted" />;
    return status.connected ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-destructive" />;
  };

  const getChannelBadge = (ch: string) => {
    if (ch === "email") return <Badge variant="default"><Mail className="w-3 h-3 mr-1" />Email</Badge>;
    if (ch === "whatsapp") return <Badge variant="secondary"><MessageSquare className="w-3 h-3 mr-1" />WhatsApp</Badge>;
    if (ch === "sms") return <Badge variant="outline"><Smartphone className="w-3 h-3 mr-1" />SMS</Badge>;
    return <Badge>{ch}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "sent") return <Badge variant="default">Sent</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currentState = eventStates[selectedEventId] || defaultEventState(selectedEvent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Communication Hub</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Control every notification across Email, SMS & WhatsApp — {COMM_EVENTS.length} events</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {(["email", "sms", "whatsapp"] as ChannelKey[]).map(ch => (
              <div key={ch} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-card shrink-0">
                {ch === "email" ? <Mail className="h-3.5 w-3.5" /> : ch === "sms" ? <Smartphone className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                <span className="text-xs font-medium capitalize">{ch}</span>
                <Switch checked={masterToggles[ch]} onCheckedChange={v => toggleMaster(ch, v)} className="scale-75" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar scroll-touch">
        <div className="inline-flex gap-2 w-max">
          {([
            { key: "events", label: "Events", icon: Mail },
            { key: "logs", label: "Logs", icon: Activity },
            { key: "newsletter", label: "Newsletter", icon: Newspaper },
            { key: "settings", label: "API Settings", icon: Settings },
          ] as { key: typeof mainView; label: string; icon: any }[]).map(tab => (
            <Button key={tab.key} variant={mainView === tab.key ? "default" : "outline"} size="sm" onClick={() => setMainView(tab.key)} className="shrink-0">
              <tab.icon className="h-4 w-4 mr-1.5" /> <span className="whitespace-nowrap">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* ─── EVENTS VIEW ────────────────────────────────────────────── */}
      {mainView === "events" && (
        <>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 md:min-h-[70vh]">
            {/* Left Panel */}
            <Card className="w-full md:w-[340px] md:shrink-0">
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search events..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[40vh] md:h-[calc(70vh-80px)]">
                  {CATEGORIES.map(cat => {
                    const catEvents = filteredEvents.filter(e => e.category === cat);
                    if (catEvents.length === 0) return null;
                    return (
                      <Collapsible key={cat} open={expandedCategories.has(cat)} onOpenChange={() => toggleCategory(cat)}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 transition-colors">
                          {expandedCategories.has(cat) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <span>{CATEGORY_ICONS[cat]} {cat}</span>
                          <Badge variant="secondary" className="ml-auto text-[10px]">{catEvents.length}</Badge>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {catEvents.map(evt => {
                            const st = eventStates[evt.id];
                            const isSelected = selectedEventId === evt.id;
                            const isDirty = dirtyEvents.has(evt.id);
                            return (
                              <button key={evt.id} onClick={() => setSelectedEventId(evt.id)}
                                className={`w-full text-left px-4 py-2.5 border-l-2 transition-colors ${isSelected ? "border-l-primary bg-primary/5" : "border-l-transparent hover:bg-accent/30"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground truncate pr-2">{evt.label}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isDirty && <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500" />}
                                    <Circle className={`h-2.5 w-2.5 ${st?.email_enabled ? "fill-green-500 text-green-500" : "fill-muted text-muted"}`} />
                                    <Circle className={`h-2.5 w-2.5 ${st?.sms_enabled ? "fill-blue-500 text-blue-500" : "fill-muted text-muted"}`} />
                                    <Circle className={`h-2.5 w-2.5 ${st?.whatsapp_enabled ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted"}`} />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Panel */}
            <div className="flex-1 space-y-4">
              {dirtyEvents.size > 0 && (
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm">
                  <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {dirtyEvents.size} unsaved change(s)</div>
                  {dirtyEvents.size > 1 && <Button size="sm" variant="outline" onClick={handleSaveAll} disabled={saving}>Save All</Button>}
                </div>
              )}

              {/* Event Info */}
              <Card>
                <CardContent className="pt-4 pb-3 flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold text-foreground">{selectedEvent.label}</h2>
                  <Badge variant="outline" className="text-xs">{selectedEvent.category}</Badge>
                  <Badge variant="secondary" className="text-xs">To: {RECIPIENT_LABELS[selectedEvent.recipient]}</Badge>
                  <p className="w-full text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                </CardContent>
              </Card>

              {/* Channel Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["email", "sms", "whatsapp"] as ChannelKey[]).map(ch => {
                  const Icon = ch === "email" ? Mail : ch === "sms" ? Smartphone : MessageSquare;
                  const enabledKey = `${ch}_enabled` as keyof EventState;
                  const isEnabled = currentState[enabledKey] as boolean;
                  const masterOff = !masterToggles[ch];
                  return (
                    <Card key={ch} className={masterOff ? "opacity-60" : ""}>
                      <CardContent className="pt-4 pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="text-sm font-medium capitalize">{ch}</span></div>
                          <Switch checked={isEnabled && !masterOff} disabled={masterOff} onCheckedChange={v => updateField(selectedEventId, enabledKey, v)} />
                        </div>
                        <p className="text-xs text-muted-foreground">Sends to: {RECIPIENT_LABELS[selectedEvent.recipient]}</p>
                        {masterOff && <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-[11px]"><AlertTriangle className="h-3 w-3" />Global {ch} disabled</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Template Editor */}
              <Card>
                <CardContent className="pt-4">
                  <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ChannelKey)}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
                      <TabsTrigger value="sms" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" /> SMS</TabsTrigger>
                      <TabsTrigger value="whatsapp" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-3">
                      <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                        <Input value={currentState.email_subject} onChange={e => updateField(selectedEventId, "email_subject", e.target.value)} placeholder="e.g. Welcome to WishMe, {{first_name}}!" /></div>
                      <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
                        <Textarea ref={textareaRef} value={currentState.email_body} onChange={e => updateField(selectedEventId, "email_body", e.target.value)} placeholder="Write your email template..." className="font-mono min-h-[200px] text-sm" /></div>
                    </TabsContent>

                    <TabsContent value="sms" className="space-y-3">
                      <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                        <Textarea ref={textareaRef} value={currentState.sms_body} onChange={e => updateField(selectedEventId, "sms_body", e.target.value)} placeholder="SMS message (max 160 chars)" className="font-mono min-h-[120px] text-sm" maxLength={480} />
                        <div className="flex justify-between mt-1"><span className="text-xs text-muted-foreground">{currentState.sms_body.length} chars</span><span className="text-xs text-muted-foreground">{Math.ceil((currentState.sms_body.length || 1) / 160)} segment(s)</span></div></div>
                    </TabsContent>

                    <TabsContent value="whatsapp" className="space-y-3">
                      <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                        <Textarea ref={textareaRef} value={currentState.whatsapp_body} onChange={e => updateField(selectedEventId, "whatsapp_body", e.target.value)} placeholder="WhatsApp message. *bold*, _italic_" className="font-mono min-h-[200px] text-sm" />
                        <p className="text-[11px] text-muted-foreground mt-1">Formatting: *bold*, _italic_, ~strikethrough~</p></div>
                    </TabsContent>

                    <div className="pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Variables — click to insert</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEvent.defaultVars.map(v => (
                          <button key={v} onClick={() => insertVariable(v)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                            <Plus className="h-3 w-3" />{`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-3">
                      <Button variant="outline" size="sm" onClick={() => { setPreviewChannel(activeTab); setPreviewOpen(true); }}>
                        <Eye className="h-4 w-4 mr-1.5" /> Preview
                      </Button>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Changes
              </Button>
            </div>
          </div>

          <InternalAlertRecipientsPanel />
        </>
      )}

      {/* ─── LOGS VIEW ──────────────────────────────────────────────── */}
      {mainView === "logs" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle>Message Logs</CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetchLogs()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? <div className="text-center py-8">Loading...</div> : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Activity className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No logs yet</p></div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="block md:hidden space-y-3">
                  {logs.map((log: any) => (
                    <div key={log.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="text-xs text-muted-foreground">{format(new Date(log.sent_at), "MMM d, HH:mm")}</span>
                        {getStatusBadge(log.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {getChannelBadge(log.channel)}
                        <span className="text-xs font-mono truncate flex-1">{log.event_key || "-"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{log.recipient}</p>
                      {log.error_message && <p className="text-xs text-destructive truncate">{log.error_message}</p>}
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <Table className="hidden md:table">
                  <TableHeader><TableRow>
                    <TableHead>Time</TableHead><TableHead>Channel</TableHead><TableHead>Recipient</TableHead>
                    <TableHead>Event</TableHead><TableHead>Status</TableHead><TableHead>Error</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{format(new Date(log.sent_at), "MMM d, HH:mm")}</TableCell>
                        <TableCell>{getChannelBadge(log.channel)}</TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">{log.recipient}</TableCell>
                        <TableCell className="font-mono text-xs">{log.event_key || "-"}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm text-destructive max-w-[200px] truncate">{log.error_message || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── NEWSLETTER VIEW ────────────────────────────────────────── */}
      {mainView === "newsletter" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <CardTitle>Newsletter Subscribers</CardTitle>
                <CardDescription>{subscribers.filter((s: any) => s.status === 'active').length} active</CardDescription>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => refetchSubscribers()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
                <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><Send className="w-4 h-4 mr-2" />Bulk Email</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Send Bulk Email</DialogTitle>
                      <DialogDescription>Send to {subscribers.filter((s: any) => s.status === 'active').length} active subscribers</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Subject</Label><Input value={bulkEmailForm.subject} onChange={e => setBulkEmailForm({ ...bulkEmailForm, subject: e.target.value })} placeholder="📣 Exciting News!" /></div>
                      <div className="space-y-2"><Label>Content (HTML)</Label><Textarea value={bulkEmailForm.content} onChange={e => setBulkEmailForm({ ...bulkEmailForm, content: e.target.value })} rows={10} className="font-mono text-sm" placeholder="<h2>Hello!</h2>" /></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkEmailDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSendBulkEmail} disabled={sendingBulkEmail}>{sendingBulkEmail ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send</>}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {subscribersLoading ? <div className="text-center py-8">Loading...</div> : subscribers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No subscribers yet</p></div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="block md:hidden space-y-3">
                  {subscribers.map((sub: any) => (
                    <div key={sub.id} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{sub.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{sub.status}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(sub.subscribed_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSubscriber(sub.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <Table className="hidden md:table">
                  <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Subscribed</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {subscribers.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.email}</TableCell>
                        <TableCell><Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>{sub.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(sub.subscribed_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleDeleteSubscriber(sub.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── SETTINGS VIEW ──────────────────────────────────────────── */}
      {mainView === "settings" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" />Email (Resend){getStatusIndicator(resendStatus)}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => checkApiStatus('resend')} disabled={checkingResend}>
                  {checkingResend ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
                </Button>
              </div>
              <CardDescription>noreply@wishme.today via Resend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.filter((s: any) => s.setting_key.includes('resend') || s.setting_key.includes('email')).map((setting: any) => (
                <div key={setting.id} className="space-y-2">
                  <Label>{setting.description || setting.setting_key}</Label>
                  <Input type={setting.is_encrypted ? "password" : "text"} value={setting.setting_value} onChange={e => updateSetting(setting.setting_key, e.target.value)} />
                </div>
              ))}
              {resendStatus && <p className={`text-sm ${resendStatus.connected ? 'text-green-600' : 'text-destructive'}`}>{resendStatus.message}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />WhatsApp (Meta){getStatusIndicator(whatsappStatus)}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => checkApiStatus('whatsapp')} disabled={checkingWhatsapp}>
                  {checkingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
                </Button>
              </div>
              <CardDescription>Meta WhatsApp Business API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.filter((s: any) => s.setting_key.includes('whatsapp')).map((setting: any) => (
                <div key={setting.id} className="space-y-2">
                  <Label>{setting.description || setting.setting_key}</Label>
                  <Input type={setting.is_encrypted ? "password" : "text"} value={setting.setting_value} onChange={e => updateSetting(setting.setting_key, e.target.value)} />
                </div>
              ))}
              {whatsappStatus && <p className={`text-sm ${whatsappStatus.connected ? 'text-green-600' : 'text-destructive'}`}>{whatsappStatus.message}</p>}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" />SMS (MSG91)</CardTitle>
              <CardDescription>Configure MSG91 for SMS. Add MSG91_AUTH_KEY and MSG91_SENDER_ID in Supabase Edge Function secrets.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">SMS templates require DLT verification. After enabling SMS for events, use the SMS template list below to register templates with your DLT provider.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewChannel === "email" ? <Mail className="h-4 w-4" /> : previewChannel === "sms" ? <Smartphone className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              {previewChannel.toUpperCase()} Preview — {selectedEvent.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {previewChannel === "email" && (
              <div className="p-3 rounded bg-muted"><p className="text-xs font-medium text-muted-foreground mb-1">Subject:</p>
                <p className="text-sm font-medium">{(currentState.email_subject || "").replace(/\{\{(\w+)\}\}/g, (_, k) => DUMMY_VARS[k] || `{{${k}}}`)}</p></div>
            )}
            <div className="p-4 rounded border border-border bg-card whitespace-pre-wrap text-sm leading-relaxed">
              {renderPreview(previewChannel) || <span className="text-muted-foreground italic">No template content yet</span>}
            </div>
            {previewChannel === "sms" && <p className="text-xs text-muted-foreground">Length: {renderPreview("sms").length} chars ({Math.ceil((renderPreview("sms").length || 1) / 160)} segment)</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
