-- Insert sample occasions for testing
INSERT INTO public.occasions (name, description, date, image_url, is_active, is_featured) VALUES
('Birthday Celebration', 'Make birthdays extra special with personalized celebrity wishes', '2025-10-15', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&h=600&fit=crop', true, true),
('Anniversary Wishes', 'Celebrate love and milestones with heartfelt messages', '2025-10-20', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop', true, true),
('New Year 2026', 'Ring in the new year with celebrity greetings', '2026-01-01', 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&h=600&fit=crop', true, true),
('Valentine''s Day', 'Express your love with celebrity video messages', '2026-02-14', 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=600&fit=crop', true, false),
('Mother''s Day', 'Honor mom with a special celebrity greeting', '2026-05-10', 'https://images.unsplash.com/photo-1529217127233-8d60de97bb49?w=800&h=600&fit=crop', true, false),
('Father''s Day', 'Celebrate dad with personalized wishes', '2026-06-21', 'https://images.unsplash.com/photo-1531983412165-cf7e4caae1e1?w=800&h=600&fit=crop', true, false),
('Graduation', 'Congratulate achievements with celebrity messages', '2026-06-30', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop', true, false),
('Wedding Anniversary', 'Mark special years together with celebrity greetings', '2025-11-15', 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800&h=600&fit=crop', true, false),
('Diwali', 'Festival of lights celebration wishes', '2025-10-24', 'https://images.unsplash.com/photo-1605481832990-a9c774b45d16?w=800&h=600&fit=crop', true, true),
('Christmas', 'Spread holiday cheer with celebrity greetings', '2025-12-25', 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&h=600&fit=crop', true, false)
ON CONFLICT (id) DO NOTHING;