-- Add comprehensive plan data from pricing page
UPDATE public.plans 
SET 
  price = 50,
  original_price = 50,
  discount_percentage = 0,
  features = '[
    "Access to Create Wish",
    "Business Promotions", 
    "Create AI Music",
    "Basic customer support",
    "5% referral commission (Level 1 only)"
  ]',
  referral_commission_l1 = 5,
  referral_commission_l2 = 0,
  service_discount_percentage = 0,
  is_popular = false
WHERE name = 'basic';

UPDATE public.plans 
SET 
  price = 499,
  original_price = 555,
  discount_percentage = 10,
  features = '[
    "Everything in Basic",
    "10% discount on all services",
    "Priority customer support", 
    "Advanced analytics",
    "10% referral commission (Level 1)",
    "5% referral commission (Level 2)",
    "Exclusive celebrity access"
  ]',
  referral_commission_l1 = 10,
  referral_commission_l2 = 5,
  service_discount_percentage = 10,
  is_popular = true
WHERE name = 'premium';

UPDATE public.plans 
SET 
  price = 999,
  original_price = 999,
  discount_percentage = 15,
  features = '[
    "Everything in Premium",
    "15% discount on all services",
    "Dedicated account manager",
    "Custom celebrity requests",
    "Advanced referral tracking", 
    "Monthly strategy calls",
    "VIP celebrity events access"
  ]',
  referral_commission_l1 = 15,
  referral_commission_l2 = 10,
  service_discount_percentage = 15,
  is_popular = false
WHERE name = 'elite';

-- Insert plans if they don't exist
INSERT INTO public.plans (name, price, original_price, discount_percentage, features, referral_commission_l1, referral_commission_l2, service_discount_percentage, is_popular)
SELECT 'basic', 50, 50, 0, '[
  "Access to Create Wish",
  "Business Promotions", 
  "Create AI Music",
  "Basic customer support",
  "5% referral commission (Level 1 only)"
]', 5, 0, 0, false
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'basic');

INSERT INTO public.plans (name, price, original_price, discount_percentage, features, referral_commission_l1, referral_commission_l2, service_discount_percentage, is_popular)
SELECT 'premium', 499, 555, 10, '[
  "Everything in Basic",
  "10% discount on all services",
  "Priority customer support", 
  "Advanced analytics",
  "10% referral commission (Level 1)",
  "5% referral commission (Level 2)",
  "Exclusive celebrity access"
]', 10, 5, 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'premium');

INSERT INTO public.plans (name, price, original_price, discount_percentage, features, referral_commission_l1, referral_commission_l2, service_discount_percentage, is_popular)
SELECT 'elite', 999, 999, 15, '[
  "Everything in Premium",
  "15% discount on all services",
  "Dedicated account manager",
  "Custom celebrity requests",
  "Advanced referral tracking", 
  "Monthly strategy calls",
  "VIP celebrity events access"
]', 15, 10, 15, false
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'elite');