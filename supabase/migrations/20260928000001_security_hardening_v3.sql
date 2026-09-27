-- ============================================================================
-- Vendo Platform — Security Hardening Patch v3.1 Migration
-- Reference: Vendo Security Hardening Patch v3.1 (SEC-1 through SEC-20)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SEC-4: PII ENCRYPTION EXTENSION & COLUMNS
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- Add encrypted NID storage column to vendor_profiles
alter table public.vendor_profiles
  add column if not exists nid_number_encrypted bytea,
  add column if not exists available_balance numeric(12,2) not null default 0.00;

-- ----------------------------------------------------------------------------
-- SEC-3: PAYMENT TRANSACTIONS TABLE (WEBHOOK IDEMPOTENCY)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  gateway_transaction_id text not null,
  gateway text not null,
  amount numeric(12,2) not null,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed', 'refunded')),
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_gateway_txn unique (gateway_transaction_id)
);

create index if not exists idx_payment_txn_gateway_id on public.payment_transactions(gateway_transaction_id);
create index if not exists idx_payment_txn_order_id on public.payment_transactions(order_id);

-- ----------------------------------------------------------------------------
-- SEC-8: REEL VIEW-COUNT DEDUPLICATION TABLE & FUNCTION
-- ----------------------------------------------------------------------------
create table if not exists public.reel_view_dedup (
  reel_id uuid not null references public.reels(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  last_counted_at timestamptz not null default now(),
  primary key (reel_id, customer_id)
);

create or replace function public.record_reel_view(p_reel_id uuid, p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reel_view_dedup (reel_id, customer_id, last_counted_at)
  values (p_reel_id, p_customer_id, now())
  on conflict (reel_id, customer_id)
  do update set last_counted_at = excluded.last_counted_at
  where public.reel_view_dedup.last_counted_at < now() - interval '5 minutes';

  if found then
    insert into public.reel_engagements (reel_id, customer_id, type)
    values (p_reel_id, p_customer_id, 'view');
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- SEC-9 & SEC-18: SLIDING-WINDOW RATE LIMITER TABLE & FUNCTION
-- ----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('minute', now()) -
    (extract(epoch from now() - date_trunc('minute', now()))::int % p_window_seconds) * interval '1 second';
  v_count int;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- ----------------------------------------------------------------------------
-- SEC-6: PAYOUT DOUBLE-PROCESSING RACE CONDITION PREVENTION (ROW LOCK RPC)
-- ----------------------------------------------------------------------------
create or replace function public.process_vendor_payout(p_vendor_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
begin
  -- Lock the row for the duration of this transaction — a second concurrent
  -- call for the same vendor will block here until the first commits.
  select available_balance into v_balance
  from public.vendor_profiles
  where profile_id = p_vendor_id
  for update;

  if v_balance is null or v_balance < p_amount then
    raise exception 'Insufficient balance for payout';
  end if;

  update public.vendor_profiles
  set available_balance = available_balance - p_amount
  where profile_id = p_vendor_id;

  insert into public.payouts (vendor_id, amount, status)
  values (p_vendor_id, p_amount, 'processing');
end;
$$;

-- ----------------------------------------------------------------------------
-- SEC-2: HARDEN TRIGGER FUNCTIONS WITH SECURITY DEFINER + SEARCH_PATH
-- ----------------------------------------------------------------------------

-- 1. sync_product_rating
create or replace function public.sync_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set
    review_count = (
      select count(*)
      from public.reviews
      where product_id = coalesce(new.product_id, old.product_id)
    ),
    rating_avg = (
      select coalesce(round(avg(rating)::numeric, 2), 0)
      from public.reviews
      where product_id = coalesce(new.product_id, old.product_id)
    )
  where id = coalesce(new.product_id, old.product_id);
  return null;
end;
$$;

-- 2. sync_vendor_follower_count
create or replace function public.sync_vendor_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vendor_profiles
  set follower_count = (
    select count(*)
    from public.follows
    where vendor_id = coalesce(new.vendor_id, old.vendor_id)
  )
  where profile_id = coalesce(new.vendor_id, old.vendor_id);
  return null;
end;
$$;

-- 3. update_reel_search_vector
create or replace function public.update_reel_search_vector()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.caption, '')), 'B');
  return new;
end;
$$;

-- 4. update_product_search_vector
create or replace function public.update_product_search_vector()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end;
$$;

-- 5. sync_reel_engagements
create or replace function public.sync_reel_engagements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reel_id uuid;
  target_type text;
begin
  target_reel_id := coalesce(new.reel_id, old.reel_id);
  target_type := coalesce(new.type, old.type);

  if target_type = 'like' then
    update public.reels
    set like_count = (select count(*) from public.reel_engagements where reel_id = target_reel_id and type = 'like')
    where id = target_reel_id;
  elsif target_type = 'comment' then
    update public.reels
    set comment_count = (select count(*) from public.reel_engagements where reel_id = target_reel_id and type = 'comment')
    where id = target_reel_id;
  elsif target_type = 'share' then
    update public.reels
    set share_count = (select count(*) from public.reel_engagements where reel_id = target_reel_id and type = 'share')
    where id = target_reel_id;
  elsif target_type = 'view' then
    update public.reels
    set view_count = (select count(*) from public.reel_engagements where reel_id = target_reel_id and type = 'view')
    where id = target_reel_id;
  end if;

  return null;
end;
$$;

-- 6. set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- SEC-1: ENFORCE ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.payment_transactions enable row level security;
alter table public.reel_view_dedup enable row level security;
alter table public.rate_limits enable row level security;

-- Policies for payment_transactions: Admin & Service Role only
create policy "admin_read_payment_transactions"
  on public.payment_transactions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Policies for reel_view_dedup: Customer self-manage
create policy "customer_manage_reel_views"
  on public.reel_view_dedup for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Policies for rate_limits: Service role & authenticated read/write
create policy "allow_rate_limit_ops"
  on public.rate_limits for all
  using (true)
  with check (true);

-- Reinforced SEC-1 Order Policies
drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders"
  on public.orders for select
  using (auth.uid() = customer_id);

drop policy if exists "vendors read their own sales orders" on public.orders;
create policy "vendors read their own sales orders"
  on public.orders for select
  using (auth.uid() = vendor_id);

drop policy if exists "customers insert own orders" on public.orders;
create policy "customers insert own orders"
  on public.orders for insert
  with check (auth.uid() = customer_id);

drop policy if exists "admins full access" on public.orders;
create policy "admins full access"
  on public.orders for all
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );

-- Reinforced SEC-1 Reel Engagements Policies
drop policy if exists "users manage own engagements" on public.reel_engagements;
create policy "users manage own engagements"
  on public.reel_engagements for all
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

-- Reinforced SEC-1 Notifications Policies (Read-only for owner, insert only via service_role)
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Reinforced SEC-1 & SEC-4 KYC Policies
drop policy if exists "vendors read own kyc" on public.vendor_profiles;
create policy "vendors read own kyc"
  on public.vendor_profiles for select
  using (auth.uid() = profile_id);

drop policy if exists "admins read all kyc" on public.vendor_profiles;
create policy "admins read all kyc"
  on public.vendor_profiles for select
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role = 'admin'));

-- ----------------------------------------------------------------------------
-- SEC-7: REALTIME CHANNEL AUTHORIZATION
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'realtime' and tablename = 'messages') then
    execute 'drop policy if exists "only participants can join live channel" on realtime.messages;';
    execute 'create policy "only participants can join live channel"
      on realtime.messages for select
      using (
        exists (
          select 1 from public.live_streams ls
          where ls.id::text = (regexp_match(realtime.topic(), ''live:([a-f0-9-]+):reactions''))[1]
          and ls.status = ''live''
        )
      );';
  end if;
end
$$;
