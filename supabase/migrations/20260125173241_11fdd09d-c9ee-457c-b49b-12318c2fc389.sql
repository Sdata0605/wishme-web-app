-- Insert new message templates for additional automation scenarios
INSERT INTO message_templates (name, channel, subject, content, variables, is_active) VALUES
-- BOOKING_CONFIRMED templates
('Booking Confirmed Email', 'email', 'Your Booking is Confirmed! 🎉', '<h1>Great News, {{first_name}}!</h1><p>Your booking with {{celebrity_name}} has been confirmed.</p><p>Order ID: {{order_id}}</p><p><a href="{{order_url}}">View Your Booking</a></p>', '["{{first_name}}", "{{celebrity_name}}", "{{order_id}}", "{{order_url}}"]', true),
('Booking Confirmed WhatsApp', 'whatsapp', NULL, '🎉 Hi {{first_name}}! Your booking with {{celebrity_name}} is confirmed! Order: {{order_id}}. View: {{order_url}}', '["{{first_name}}", "{{celebrity_name}}", "{{order_id}}", "{{order_url}}"]', true),

-- CELEBRITY_WELCOME templates
('Celebrity Welcome Email', 'email', 'Welcome to Wish Me, {{first_name}}! 🌟', '<h1>Welcome to Wish Me!</h1><p>Hi {{first_name}},</p><p>We''re thrilled to have you join our platform as a creator. Start connecting with your fans today!</p><p><a href="{{platform_url}}/celebrity-dashboard">Go to Your Dashboard</a></p>', '["{{first_name}}", "{{platform_url}}"]', true),
('Celebrity Welcome WhatsApp', 'whatsapp', NULL, '🌟 Welcome to Wish Me, {{first_name}}! You''re now part of our creator community. Access your dashboard: {{platform_url}}/celebrity-dashboard', '["{{first_name}}", "{{platform_url}}"]', true),

-- WALLET_CREDITED templates
('Wallet Credited Email', 'email', 'Your Wallet Has Been Credited! 💰', '<h1>Money Added!</h1><p>Hi {{first_name}},</p><p>₹{{order_amount}} has been added to your wallet.</p><p><a href="{{platform_url}}/wallet">Check Your Balance</a></p>', '["{{first_name}}", "{{order_amount}}", "{{platform_url}}"]', true),
('Wallet Credited WhatsApp', 'whatsapp', NULL, '💰 Hi {{first_name}}! ₹{{order_amount}} credited to your wallet. Check balance: {{platform_url}}/wallet', '["{{first_name}}", "{{order_amount}}", "{{platform_url}}"]', true),

-- VIDEO_READY templates
('Video Ready Email', 'email', 'Your Video Message is Ready! 🎬', '<h1>Your Video is Here!</h1><p>Hi {{first_name}},</p><p>{{celebrity_name}} has created your personalized video message!</p><p><a href="{{video_url}}">Watch Now</a></p>', '["{{first_name}}", "{{celebrity_name}}", "{{video_url}}"]', true),
('Video Ready WhatsApp', 'whatsapp', NULL, '🎬 Hi {{first_name}}! Your video from {{celebrity_name}} is ready! Watch: {{video_url}}', '["{{first_name}}", "{{celebrity_name}}", "{{video_url}}"]', true),

-- REVIEW_REQUEST templates
('Review Request Email', 'email', 'How was your experience? ⭐', '<h1>We''d Love Your Feedback!</h1><p>Hi {{first_name}},</p><p>How was your experience with {{celebrity_name}}? Your review helps others discover great creators.</p><p><a href="{{order_url}}">Leave a Review</a></p>', '["{{first_name}}", "{{celebrity_name}}", "{{order_url}}"]', true),
('Review Request WhatsApp', 'whatsapp', NULL, '⭐ Hi {{first_name}}! How was your experience with {{celebrity_name}}? Leave a review: {{order_url}}', '["{{first_name}}", "{{celebrity_name}}", "{{order_url}}"]', true),

-- BIRTHDAY_REMINDER templates
('Birthday Reminder Email', 'email', 'Don''t Forget! 🎂 Special Day Coming Up', '<h1>Reminder!</h1><p>Hi {{first_name}},</p><p>A special occasion is coming up on {{scheduled_date}}. Book a personalized wish from their favorite celebrity!</p><p><a href="{{platform_url}}/celebrities">Browse Celebrities</a></p>', '["{{first_name}}", "{{scheduled_date}}", "{{platform_url}}"]', true),
('Birthday Reminder WhatsApp', 'whatsapp', NULL, '🎂 Hi {{first_name}}! Reminder: Special day on {{scheduled_date}}. Book a celebrity wish: {{platform_url}}/celebrities', '["{{first_name}}", "{{scheduled_date}}", "{{platform_url}}"]', true),

-- SUBSCRIPTION_RENEWED templates
('Subscription Renewed Email', 'email', 'Your Subscription is Active! 🎯', '<h1>Subscription Renewed!</h1><p>Hi {{first_name}},</p><p>Your premium subscription is now active. Enjoy exclusive benefits!</p><p><a href="{{platform_url}}/dashboard">Go to Dashboard</a></p>', '["{{first_name}}", "{{platform_url}}"]', true),
('Subscription Renewed WhatsApp', 'whatsapp', NULL, '🎯 Hi {{first_name}}! Your premium subscription is active. Enjoy! {{platform_url}}/dashboard', '["{{first_name}}", "{{platform_url}}"]', true),

-- INACTIVITY_REMINDER templates
('Inactivity Reminder Email', 'email', 'We Miss You! 💫', '<h1>Come Back!</h1><p>Hi {{first_name}},</p><p>We haven''t seen you in a while! Check out what''s new on Wish Me.</p><p><a href="{{platform_url}}">Explore Now</a></p>', '["{{first_name}}", "{{platform_url}}"]', true),
('Inactivity Reminder WhatsApp', 'whatsapp', NULL, '💫 Hi {{first_name}}! We miss you! Check what''s new: {{platform_url}}', '["{{first_name}}", "{{platform_url}}"]', true);

-- Insert new message events for additional automation scenarios
INSERT INTO message_events (event_key, description, delay_minutes, is_enabled) VALUES
('BOOKING_CONFIRMED', 'When a booking is confirmed by celebrity', 0, true),
('CELEBRITY_WELCOME', 'When a new celebrity joins the platform', 0, true),
('WALLET_CREDITED', 'When user''s wallet is credited', 0, true),
('VIDEO_READY', 'When celebrity uploads video response', 0, true),
('REVIEW_REQUEST', 'Request review after order completion', 1440, true),
('BIRTHDAY_REMINDER', 'Reminder before loved one''s birthday', 0, true),
('SUBSCRIPTION_RENEWED', 'When user renews premium plan', 0, true),
('INACTIVITY_REMINDER', 'Remind inactive users', 0, false);