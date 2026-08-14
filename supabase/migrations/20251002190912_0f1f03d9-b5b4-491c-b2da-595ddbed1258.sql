-- Create storage buckets and RLS policies for uploads

-- 1) Buckets (idempotent)
insert into storage.buckets (id, name, public)
values
  ('celebrity-avatars', 'celebrity-avatars', true),
  ('promotional-content', 'promotional-content', true),
  ('verification-docs', 'verification-docs', true)
on conflict (id) do nothing;

-- Helper condition reused in policies: user can access paths that start with their celebrity_id or profile_id
-- Note: We inline this condition in each policy since Postgres policies don't support variables

-- 2) celebrity-avatars policies
create policy "Public read - celebrity-avatars"
  on storage.objects for select
  using (bucket_id = 'celebrity-avatars');

create policy "Upload own - celebrity-avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'celebrity-avatars'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

create policy "Update own - celebrity-avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'celebrity-avatars'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  )
  with check (
    bucket_id = 'celebrity-avatars'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

create policy "Delete own - celebrity-avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'celebrity-avatars'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

-- 3) promotional-content policies
create policy "Public read - promotional-content"
  on storage.objects for select
  using (bucket_id = 'promotional-content');

create policy "Upload own - promotional-content"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'promotional-content'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

create policy "Update own - promotional-content"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'promotional-content'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  )
  with check (
    bucket_id = 'promotional-content'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

create policy "Delete own - promotional-content"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'promotional-content'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

-- 4) verification-docs policies
-- Note: Bucket is public for now to align with current getPublicUrl() usage in UI.
-- We can tighten this later to owner-only reads and signed URLs.
create policy "Public read - verification-docs"
  on storage.objects for select
  using (bucket_id = 'verification-docs');

create policy "Upload own - verification-docs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

create policy "Update own - verification-docs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'verification-docs'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  )
  with check (
    bucket_id = 'verification-docs'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );

create policy "Delete own - verification-docs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and exists (
      select 1
      from public.profiles p
      left join public.celebrities c on c.profile_id = p.id
      where p.user_id = auth.uid()
        and (
          (storage.foldername(name))[1] = c.id::text
          or (storage.foldername(name))[1] = p.id::text
        )
    )
  );