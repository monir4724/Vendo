-- ============================================================================
-- Vendo Platform — Supabase Postgres Schema (v2.0 Patched)
-- Implements all 12 Patches from Vendo_Backend_Engineering_Spec v2.0
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. PROFILES & ROLES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer', 'vendor', 'admin')) default 'customer',
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. VENDOR PROFILES (Patch 5: follower_count, Patch 7: kyc_document_urls)
-- ----------------------------------------------------------------------------
create table if not exists public.vendor_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  bio text,
  avatar_url text,
  banner_url text,
  location text default 'Dhaka, Bangladesh',
  rating_avg numeric(3,2) default 0.00,
  commission_rate numeric(4,2) default 8.00,
  follower_count int default 0, -- PATCH 5: Denormalized follower count synced by trigger
  kyc_status text not null check (kyc_status in ('draft', 'pending', 'approved', 'rejected', 'suspended')) default 'draft',
  kyc_document_urls jsonb default '[]'::jsonb, -- PATCH 7: Typed array for multi-document KYC
  tin_bin text,
  bank_routing jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 3. CATEGORIES & TAXONOMY
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  description text,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS (Patch 4: rating_avg & review_count)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  cost_price numeric(12,2),
  sku text,
  inventory_count int not null default 0 check (inventory_count >= 0),
  is_active boolean default true,
  is_featured boolean default false,
  rating_avg numeric(3,2) default 0, -- PATCH 4: Denormalized average rating maintained by trigger
  review_count int default 0,       -- PATCH 4: Denormalized count maintained by trigger
  images jsonb default '[]'::jsonb,
  specs jsonb default '{}'::jsonb,
  tags text[] default array[]::text[],
  search_vector tsvector,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 5. PRODUCT VARIANTS (Patch 7: variant_label)
-- ----------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_label text not null, -- PATCH 7: Precise naming 'variant_label'
  sku text,
  price numeric(12,2),
  inventory_count int not null default 0 check (inventory_count >= 0),
  options jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 6. FOLLOWS
-- ----------------------------------------------------------------------------
create table if not exists public.follows (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade,
  created_at timestamptz default now(),
  primary key (customer_id, vendor_id)
);

-- ----------------------------------------------------------------------------
-- 7. REELS (Patch 6: search_vector)
-- ----------------------------------------------------------------------------
create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade,
  title text not null,
  caption text,
  video_url text not null,
  thumbnail_url text,
  duration_secs numeric(6,2),
  view_count int default 0,
  like_count int default 0,
  comment_count int default 0,
  share_count int default 0,
  search_vector tsvector, -- PATCH 6: Full-text search vector on title + caption
  status text not null check (status in ('processing', 'published', 'archived', 'flagged')) default 'published',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 8. REEL PRODUCTS (Patch 7: timestamp_secs, position_x, position_y)
-- ----------------------------------------------------------------------------
create table if not exists public.reel_products (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  timestamp_secs numeric(6,2) default 0.0, -- PATCH 7: Typed timestamp
  position_x numeric(5,2),                 -- PATCH 7: Percent X coord (0-100)
  position_y numeric(5,2),                 -- PATCH 7: Percent Y coord (0-100)
  is_pinned boolean default true,
  unique (reel_id, product_id)
);

-- ----------------------------------------------------------------------------
-- 9. REEL ENGAGEMENTS (Patch 1: Partial Unique Indexes & Comment Text Constraint)
-- ----------------------------------------------------------------------------
create table if not exists public.reel_engagements (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'save', 'comment', 'view', 'share')),
  comment_text text check (
    (type = 'comment' and comment_text is not null and char_length(comment_text) <= 500)
    or (type != 'comment' and comment_text is null)
  ), -- PATCH 1: Allows comments up to 500 chars, null for other types
  created_at timestamptz default now()
);

-- PATCH 1: Partial unique index for 'like' (1 per user per reel)
create unique index if not exists idx_reel_eng_like_unique
  on public.reel_engagements(reel_id, customer_id)
  where type = 'like';

-- PATCH 1: Partial unique index for 'save' (1 per user per reel)
create unique index if not exists idx_reel_eng_save_unique
  on public.reel_engagements(reel_id, customer_id)
  where type = 'save';

-- 'comment', 'view', 'share' have NO unique constraint — multiple allowed!

-- ----------------------------------------------------------------------------
-- 10. LIVE STREAMS (Patch 11: total_reactions)
-- ----------------------------------------------------------------------------
create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade,
  title text not null,
  category_id uuid references public.categories(id) on delete set null,
  status text not null check (status in ('scheduled', 'live', 'ended', 'interrupted')) default 'scheduled',
  pinned_product_id uuid references public.products(id) on delete set null,
  viewer_count int default 0,
  peak_viewers int default 0,
  total_reactions int default 0, -- PATCH 11: Accumulated stream reaction tally
  total_sales numeric(12,2) default 0.00,
  stream_channel text,
  playback_url text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 11. LIVE MESSAGES
-- ----------------------------------------------------------------------------
create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  live_stream_id uuid not null references public.live_streams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_role text default 'customer',
  message text not null check (char_length(message) <= 300),
  is_pinned boolean default false,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 12. LIVE REACTIONS (Batch Analytics Table - Patch 3 & 11)
-- ----------------------------------------------------------------------------
create table if not exists public.live_reactions (
  id uuid primary key default gen_random_uuid(),
  live_stream_id uuid not null references public.live_streams(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart', 'fire', 'clap', 'wow')),
  burst_count int not null default 1,
  recorded_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 13. ORDERS (Patch 7: source: direct/reel/live)
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade,
  source text not null check (source in ('direct', 'reel', 'live')) default 'direct', -- PATCH 7: 'direct' clearer than 'normal'
  source_ref_id uuid, -- Reference to reel_id or live_stream_id
  subtotal numeric(12,2) not null check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status text not null check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')) default 'pending',
  payment_method text not null,
  payment_status text not null check (payment_status in ('pending', 'authorized', 'captured', 'failed', 'refunded')) default 'pending',
  payment_gateway_ref text,
  shipping_address jsonb not null,
  tracking_number text,
  carrier text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 14. ORDER ITEMS (Patch 7: variant_label, clicked_product_id, clicked_at)
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text, -- PATCH 7: 'variant_label'
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  clicked_product_id uuid,     -- PATCH 7: Attribution tracking
  clicked_at timestamptz,       -- PATCH 7: Conversion analytics
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 15. REVIEWS
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  title text,
  comment text,
  images jsonb default '[]'::jsonb,
  is_verified_purchase boolean default false,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 16. DISPUTES & ESCROW
-- ----------------------------------------------------------------------------
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  dispute_number text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade,
  amount numeric(12,2) not null,
  reason text not null,
  evidence_text text,
  evidence_urls jsonb default '[]'::jsonb,
  status text not null check (status in ('open', 'under_review', 'resolved')) default 'open',
  resolution text check (resolution in ('refund_full', 'release_vendor', 'split_50_50')),
  resolution_note text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 17. PAYOUTS
-- ----------------------------------------------------------------------------
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payout_number text not null unique,
  vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade,
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  platform_fee numeric(12,2) not null check (platform_fee >= 0),
  net_amount numeric(12,2) not null check (net_amount >= 0),
  payout_method text not null,
  destination_account jsonb not null,
  status text not null check (status in ('pending', 'processing', 'paid', 'rejected')) default 'pending',
  idempotency_key text not null unique,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 18. AUDIT LOGS
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  target_resource text not null,
  payload jsonb default '{}'::jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 19. NOTIFICATIONS (Patch 2: Added 'reel_published' & 'ai_tag_suggestion')
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',
    'payment_success', 'payment_failed',
    'payout_processed', 'payout_failed',
    'kyc_approved', 'kyc_rejected',
    'new_review', 'new_follower',
    'dispute_opened', 'dispute_resolved',
    'content_removed', 'live_starting',
    'new_message', 'system',
    'reel_published',         -- PATCH 2: Sent to vendor followers on reel publish
    'ai_tag_suggestion'       -- PATCH 2: Sent when AI detects products in reels
  )),
  title text not null,
  message text not null,
  payload jsonb default '{}'::jsonb,
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 20. AI CHAT SESSIONS (Patch 12: total_tokens_used & estimated_cost_usd)
-- ----------------------------------------------------------------------------
create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_type text default 'support',
  messages jsonb default '[]'::jsonb,
  status text not null check (status in ('active', 'escalated', 'closed')) default 'active',
  escalated_to_human boolean default false,
  total_tokens_used int default 0,          -- PATCH 12: Cumulative token usage
  estimated_cost_usd numeric(8,6) default 0, -- PATCH 12: Estimated LLM cost
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR HIGH-TRAFFIC SCALE
-- ----------------------------------------------------------------------------
create index if not exists idx_products_vendor on public.products(vendor_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active_featured on public.products(is_active, is_featured);
create index if not exists idx_products_search on public.products using gin(search_vector);

-- PATCH 6: GIN index for reel full-text search
create index if not exists idx_reels_search_vector on public.reels using gin(search_vector);
create index if not exists idx_reels_vendor on public.reels(vendor_id);
create index if not exists idx_reels_status_created on public.reels(status, created_at desc);

create index if not exists idx_live_vendor on public.live_streams(vendor_id);
create index if not exists idx_live_status on public.live_streams(status);

create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_vendor on public.orders(vendor_id);
create index if not exists idx_orders_status on public.orders(status);

create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);
