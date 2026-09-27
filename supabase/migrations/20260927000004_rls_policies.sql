-- ============================================================================
-- Vendo Platform — Row Level Security (RLS) Policies (v2.0)
-- Strict Multi-Tenant Isolation for Customer, Vendor, and Admin
-- ============================================================================

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.follows enable row level security;
alter table public.reels enable row level security;
alter table public.reel_products enable row level security;
alter table public.reel_engagements enable row level security;
alter table public.live_streams enable row level security;
alter table public.live_messages enable row level security;
alter table public.live_reactions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_chat_sessions enable row level security;

-- Helper functions for role verification
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_vendor()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'vendor'
  );
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
create policy "Public Profiles Read"
  on public.profiles for select
  using (true);

create policy "Users Update Own Profile"
  on public.profiles for update
  using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. VENDOR PROFILES
-- ----------------------------------------------------------------------------
create policy "Public Vendor Profiles Read"
  on public.vendor_profiles for select
  using (kyc_status != 'suspended' or public.is_admin());

create policy "Vendors Update Own Profile"
  on public.vendor_profiles for update
  using (profile_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. CATEGORIES
-- ----------------------------------------------------------------------------
create policy "Public Read Active Categories"
  on public.categories for select
  using (is_active = true or public.is_admin());

create policy "Admin Manage Categories"
  on public.categories for all
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS & VARIANTS
-- ----------------------------------------------------------------------------
create policy "Public Read Active Products"
  on public.products for select
  using (is_active = true or vendor_id = auth.uid() or public.is_admin());

create policy "Vendors Manage Own Products"
  on public.products for all
  using (vendor_id = auth.uid() or public.is_admin())
  with check (vendor_id = auth.uid() or public.is_admin());

create policy "Public Read Product Variants"
  on public.product_variants for select
  using (true);

create policy "Vendors Manage Own Variants"
  on public.product_variants for all
  using (
    exists (
      select 1 from public.products
      where id = product_variants.product_id and (vendor_id = auth.uid() or public.is_admin())
    )
  );

-- ----------------------------------------------------------------------------
-- 5. FOLLOWS
-- ----------------------------------------------------------------------------
create policy "Public Read Follows"
  on public.follows for select
  using (true);

create policy "Customers Manage Own Follows"
  on public.follows for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. REELS & ENGAGEMENTS
-- ----------------------------------------------------------------------------
create policy "Public Read Published Reels"
  on public.reels for select
  using (status = 'published' or vendor_id = auth.uid() or public.is_admin());

create policy "Vendors Manage Own Reels"
  on public.reels for all
  using (vendor_id = auth.uid() or public.is_admin())
  with check (vendor_id = auth.uid() or public.is_admin());

create policy "Public Read Reel Products"
  on public.reel_products for select
  using (true);

create policy "Vendors Manage Reel Products"
  on public.reel_products for all
  using (
    exists (
      select 1 from public.reels
      where id = reel_products.reel_id and (vendor_id = auth.uid() or public.is_admin())
    )
  );

create policy "Public Read Reel Engagements"
  on public.reel_engagements for select
  using (true);

create policy "Customers Insert Reel Engagements"
  on public.reel_engagements for insert
  with check (customer_id = auth.uid());

create policy "Customers Delete Own Engagements"
  on public.reel_engagements for delete
  using (customer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 7. LIVE COMMERCE
-- ----------------------------------------------------------------------------
create policy "Public Read Live Streams"
  on public.live_streams for select
  using (status != 'interrupted' or vendor_id = auth.uid() or public.is_admin());

create policy "Vendors Manage Own Live Streams"
  on public.live_streams for all
  using (vendor_id = auth.uid() or public.is_admin())
  with check (vendor_id = auth.uid() or public.is_admin());

create policy "Public Read Live Messages"
  on public.live_messages for select
  using (true);

create policy "Authenticated Send Live Messages"
  on public.live_messages for insert
  with check (sender_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. ORDERS & ITEMS
-- ----------------------------------------------------------------------------
create policy "Customers & Vendors Read Orders"
  on public.orders for select
  using (
    customer_id = auth.uid()
    or vendor_id = auth.uid()
    or public.is_admin()
  );

create policy "Customers Create Orders"
  on public.orders for insert
  with check (customer_id = auth.uid());

create policy "Vendors & Admins Update Orders"
  on public.orders for update
  using (vendor_id = auth.uid() or public.is_admin());

create policy "Read Order Items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where id = order_items.order_id
      and (customer_id = auth.uid() or vendor_id = auth.uid() or public.is_admin())
    )
  );

create policy "Insert Order Items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where id = order_items.order_id and customer_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 9. REVIEWS
-- ----------------------------------------------------------------------------
create policy "Public Read Reviews"
  on public.reviews for select
  using (true);

create policy "Customers Create Own Reviews"
  on public.reviews for insert
  with check (customer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 10. DISPUTES
-- ----------------------------------------------------------------------------
create policy "View Disputes"
  on public.disputes for select
  using (
    customer_id = auth.uid()
    or vendor_id = auth.uid()
    or public.is_admin()
  );

create policy "Customers Open Disputes"
  on public.disputes for insert
  with check (customer_id = auth.uid());

create policy "Admins Mediate Disputes"
  on public.disputes for update
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 11. PAYOUTS
-- ----------------------------------------------------------------------------
create policy "Vendors View Own Payouts"
  on public.payouts for select
  using (vendor_id = auth.uid() or public.is_admin());

create policy "Vendors Request Payouts"
  on public.payouts for insert
  with check (vendor_id = auth.uid() or public.is_admin());

create policy "Admins Authorize Payouts"
  on public.payouts for update
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 12. AUDIT LOGS
-- ----------------------------------------------------------------------------
create policy "Admins View Audit Logs"
  on public.audit_logs for select
  using (public.is_admin());

create policy "System Insert Audit Logs"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- ----------------------------------------------------------------------------
create policy "Users View Own Notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users Update Own Notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 14. AI CHAT SESSIONS
-- ----------------------------------------------------------------------------
create policy "Users Manage Own Chat Sessions"
  on public.ai_chat_sessions for all
  using (user_id = auth.uid() or user_id is null or public.is_admin())
  with check (user_id = auth.uid() or user_id is null or public.is_admin());
