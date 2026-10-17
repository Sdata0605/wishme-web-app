-- Video Wish now comes with a signature card: a greeting card from the celebrity to the friend, signed with the
-- celebrity's name, made by AI from the celebrity's real photos (or uploaded by the admin). It is delivered with the
-- video, so a video wish can only be completed once its card is on the order (checked by upload-wish-friend-video).
alter table public.wish_friend_orders
  add column if not exists card_url text,
  add column if not exists card_text text,
  add column if not exists card_source text,
  add column if not exists card_updated_at timestamptz;

alter table public.wish_friend_orders drop constraint if exists wish_friend_orders_card_source_check;
alter table public.wish_friend_orders
  add constraint wish_friend_orders_card_source_check check (card_source is null or card_source in ('ai', 'upload'));
