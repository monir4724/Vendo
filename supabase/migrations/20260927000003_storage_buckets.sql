-- ============================================================================
-- Vendo Platform — Storage Buckets & Policies (v2.0 Patched)
-- Implements Patch 8 (Bucket Naming Reconciliation)
-- ============================================================================

-- Insert storage buckets into storage.buckets table
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('products', 'products', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('reels-raw', 'reels-raw', false, 209715200, array['video/mp4', 'video/quicktime']),
  ('reels-processed', 'reels-processed', true, 104857600, array['video/mp4', 'video/webm']),
  ('vendor-kyc', 'vendor-kyc', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png']),
  ('dispute-evidence', 'dispute-evidence', false, 15728640, array['image/jpeg', 'image/png', 'application/pdf']),
  ('review-images', 'review-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('reel-thumbnails', 'reel-thumbnails', true, 10485760, array['image/jpeg', 'image/webp', 'image/png']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('invoices', 'invoices', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- STORAGE POLICIES
-- ----------------------------------------------------------------------------

-- 1. Products Bucket: Public Read, Vendors upload to own folder
create policy "Products Public Read"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "Vendors Upload Products"
  on storage.objects for insert
  with check (
    bucket_id = 'products'
    and auth.role() = 'authenticated'
  );

-- 2. Reels-Raw Bucket: Vendor Upload Only
create policy "Vendors Upload Raw Reels"
  on storage.objects for insert
  with check (
    bucket_id = 'reels-raw'
    and auth.role() = 'authenticated'
  );

-- 3. Reels-Processed: Public Read
create policy "Public Read Processed Reels"
  on storage.objects for select
  using (bucket_id = 'reels-processed');

-- 4. Vendor-KYC: Vendor upload & read own, Admin full access
create policy "Vendor Read Own KYC"
  on storage.objects for select
  using (
    bucket_id = 'vendor-kyc'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

create policy "Vendor Upload Own KYC"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-kyc'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Avatars: Public Read, User upload own
create policy "Avatars Public Read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users Upload Own Avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Invoices: Customer, Vendor, or Admin Access
create policy "Authorized Invoices Read"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('admin', 'vendor')
      )
    )
  );
