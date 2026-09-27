-- ============================================================================
-- Vendo Platform — Functions & Triggers (v2.0 Patched)
-- Implements Patches 4, 5, 6 and system automations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers
create or replace trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace trigger trg_vendor_profiles_updated_at
  before update on public.vendor_profiles
  for each row execute function public.set_updated_at();

create or replace trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create or replace trigger trg_reels_updated_at
  before update on public.reels
  for each row execute function public.set_updated_at();

create or replace trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create or replace trigger trg_ai_chat_updated_at
  before update on public.ai_chat_sessions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. AUTH NEW USER HOOK
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_role text;
  business_name text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
  business_name := new.raw_user_meta_data->>'business_name';

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    user_role
  )
  on conflict (id) do nothing;

  if user_role = 'vendor' then
    insert into public.vendor_profiles (
      profile_id,
      business_name,
      slug,
      kyc_status
    )
    values (
      new.id,
      coalesce(business_name, 'Artisan Studio ' || substr(new.id::text, 1, 6)),
      lower(regexp_replace(coalesce(business_name, 'studio-' || substr(new.id::text, 1, 6)), '[^a-zA-Z0-9]+', '-', 'g')),
      'draft'
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

-- Trigger on auth.users (enabled when run in Supabase)
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. PATCH 4: PRODUCT RATING COUNTER SYNC (§3.8)
-- ----------------------------------------------------------------------------
create or replace function public.sync_product_rating()
returns trigger language plpgsql as $$
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

drop trigger if exists on_review_change on public.reviews;
create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute function public.sync_product_rating();

-- ----------------------------------------------------------------------------
-- 4. PATCH 5: VENDOR FOLLOWER COUNT SYNC (§3.9)
-- ----------------------------------------------------------------------------
create or replace function public.sync_vendor_follower_count()
returns trigger language plpgsql as $$
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

drop trigger if exists on_follow_change on public.follows;
create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.sync_vendor_follower_count();

-- ----------------------------------------------------------------------------
-- 5. PATCH 6: REEL SEARCH VECTOR UPDATE (§3.10)
-- ----------------------------------------------------------------------------
create or replace function public.update_reel_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.caption, '')), 'B');
  return new;
end;
$$;

drop trigger if exists on_reel_content_change on public.reels;
create trigger on_reel_content_change
  before insert or update of title, caption on public.reels
  for each row execute function public.update_reel_search_vector();

-- ----------------------------------------------------------------------------
-- 6. PRODUCT SEARCH VECTOR UPDATE
-- ----------------------------------------------------------------------------
create or replace function public.update_product_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end;
$$;

drop trigger if exists on_product_content_change on public.products;
create trigger on_product_content_change
  before insert or update of title, description, tags on public.products
  for each row execute function public.update_product_search_vector();

-- ----------------------------------------------------------------------------
-- 7. REEL ENGAGEMENT COUNTER SYNC
-- ----------------------------------------------------------------------------
create or replace function public.sync_reel_engagements()
returns trigger language plpgsql as $$
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

drop trigger if exists on_reel_engagement_change on public.reel_engagements;
create trigger on_reel_engagement_change
  after insert or delete on public.reel_engagements
  for each row execute function public.sync_reel_engagements();
