# Vendo — Backend Engineering Specification v3.1 (Production Master)

**Document Type:** Complete Backend & Database Specification  
**Version:** 3.1 (Security Hardening Patch v3.1 — SEC-1 through SEC-20 Applied)  
**Platform:** Supabase (Postgres 15+, Row Level Security, Edge Functions, Realtime, Storage)  
**Companion Documents:** `Vendo_Frontend_UIUX.md`, `Vendo_System_Architecture.md`, `Vendo_System_Structure.md`  

---

## Executive Summary & Changelog v1.0 &rarr; v2.0

All 12 critical patches identified in the Multi-Agent Architecture Review have been incorporated into this master specification and the underlying database migrations and Edge Functions:

| Patch | Target Section | Impact & Implementation |
|---|---|---|
| **Patch 1** | §2.16 `reel_engagements` | Partial unique indexes on `(reel_id, customer_id)` for `like` & `save`. Comments/views allowed multiple per user. 500-char comment check. |
| **Patch 2** | §2.19 `notifications` & §8.4 `process-reel-video` | Added `'reel_published'` and `'ai_tag_suggestion'` to type CHECK constraint. Followers get `reel_published` notifications, not `live_starting`. |
| **Patch 3** | §8.13 `broadcast-live-reaction` & §11 | Ephemeral WebRTC live stream reaction broadcast Edge Function (no per-emoji DB write). 10 reactions/sec rate limit. |
| **Patch 4** | §2.4 `products` & §3.8 `sync_product_rating` | Denormalized `rating_avg numeric(3,2)` and `review_count int` updated automatically via trigger on `reviews`. |
| **Patch 5** | §2.2 `vendor_profiles` & §3.9 `sync_vendor_follower_count` | Denormalized `follower_count int` updated automatically via trigger on `follows`. |
| **Patch 6** | §2.7 `reels` & §3.10 `update_reel_search_vector` | Full-text search `search_vector tsvector` on reels with GIN index and hybrid AI semantic search fallback. |
| **Patch 7** | Schema Naming Reconciliation | Standardized on `variant_label`, `timestamp_secs + position_x + position_y`, `source: direct/reel/live`, `clicked_product_id + clicked_at`, `kyc_document_urls jsonb`. |
| **Patch 8** | §6 Storage Buckets | Standardized bucket names: `products`, `reels-raw`, `reels-processed`, `vendor-kyc`, `dispute-evidence`, `review-images`, `reel-thumbnails`, `avatars`, `invoices`. |
| **Patch 9** | §8 Edge Functions | Explicit Edge Function grouping including `initiate-payment`, `get-live-token`, and `broadcast-live-reaction`. |
| **Patch 10** | §12 Frontend JS Architecture | Standardized on ES module pattern `src/js/modules/ai.js` with backward compatibility alias. |
| **Patch 11** | §2.10 & §5 Cron Jobs | `live_streams.total_reactions` aggregation counter updated at stream completion. |
| **Patch 12** | §2.20 `ai_chat_sessions` & §8.9 | Cumulative `total_tokens_used` and `estimated_cost_usd` tracked on every LLM assistant turn. |

---

## 1. Database Schema Specification (Supabase Postgres)

### 1.1 `public.profiles`
Base user identity linking to Supabase `auth.users`.
- `id uuid primary key references auth.users(id) on delete cascade`
- `role text not null check (role in ('customer', 'vendor', 'admin')) default 'customer'`
- `email text not null`
- `full_name text`
- `avatar_url text`
- `phone text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 1.2 `public.vendor_profiles` (Patches 5 & 7)
Store identity, compliance, and earnings routing.
- `profile_id uuid primary key references public.profiles(id) on delete cascade`
- `business_name text not null`
- `slug text not null unique`
- `bio text`
- `avatar_url text`
- `banner_url text`
- `location text default 'Dhaka, Bangladesh'`
- `rating_avg numeric(3,2) default 0.00`
- `commission_rate numeric(4,2) default 8.00`
- `follower_count int default 0` *(PATCH 5: Synced via trigger on `public.follows`)*
- `kyc_status text not null check (kyc_status in ('draft', 'pending', 'approved', 'rejected', 'suspended')) default 'draft'`
- `kyc_document_urls jsonb default '[]'::jsonb` *(PATCH 7: Array of verified legal documents)*
- `tin_bin text`
- `bank_routing jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 1.3 `public.categories`
Hierarchical taxonomy tree.
- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `slug text not null unique`
- `parent_id uuid references public.categories(id) on delete set null`
- `description text`
- `display_order int default 0`
- `is_active boolean default true`
- `created_at timestamptz default now()`

### 1.4 `public.products` (Patch 4)
Artisan catalog items.
- `id uuid primary key default gen_random_uuid()`
- `vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade`
- `category_id uuid references public.categories(id) on delete set null`
- `title text not null`
- `description text`
- `price numeric(12,2) not null check (price >= 0)`
- `compare_at_price numeric(12,2)`
- `cost_price numeric(12,2)`
- `sku text`
- `inventory_count int not null default 0 check (inventory_count >= 0)`
- `is_active boolean default true`
- `is_featured boolean default false`
- `rating_avg numeric(3,2) default 0` *(PATCH 4: Denormalized rating maintained by trigger)*
- `review_count int default 0` *(PATCH 4: Denormalized count maintained by trigger)*
- `images jsonb default '[]'::jsonb`
- `specs jsonb default '{}'::jsonb`
- `tags text[] default array[]::text[]`
- `search_vector tsvector`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 1.5 `public.product_variants` (Patch 7)
SKU size/color options.
- `id uuid primary key default gen_random_uuid()`
- `product_id uuid not null references public.products(id) on delete cascade`
- `variant_label text not null` *(PATCH 7)*
- `sku text`
- `price numeric(12,2)`
- `inventory_count int not null default 0 check (inventory_count >= 0)`
- `options jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`

### 1.6 `public.follows`
- `customer_id uuid not null references public.profiles(id) on delete cascade`
- `vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade`
- `created_at timestamptz default now()`
- `primary key (customer_id, vendor_id)`

### 1.7 `public.reels` (Patch 6)
Vertical 9:16 shoppable video.
- `id uuid primary key default gen_random_uuid()`
- `vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade`
- `title text not null`
- `caption text`
- `video_url text not null`
- `thumbnail_url text`
- `duration_secs numeric(6,2)`
- `view_count int default 0`
- `like_count int default 0`
- `comment_count int default 0`
- `share_count int default 0`
- `search_vector tsvector` *(PATCH 6: Full-text search vector)*
- `status text not null check (status in ('processing', 'published', 'archived', 'flagged')) default 'published'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 1.8 `public.reel_products` (Patch 7)
Hot-spot pins on vertical video.
- `id uuid primary key default gen_random_uuid()`
- `reel_id uuid not null references public.reels(id) on delete cascade`
- `product_id uuid not null references public.products(id) on delete cascade`
- `timestamp_secs numeric(6,2) default 0.0` *(PATCH 7)*
- `position_x numeric(5,2)` *(PATCH 7: 0–100%)*
- `position_y numeric(5,2)` *(PATCH 7: 0–100%)*
- `is_pinned boolean default true`
- `unique (reel_id, product_id)`

### 1.9 `public.reel_engagements` (Patch 1)
- `id uuid primary key default gen_random_uuid()`
- `reel_id uuid not null references public.reels(id) on delete cascade`
- `customer_id uuid not null references public.profiles(id) on delete cascade`
- `type text not null check (type in ('like', 'save', 'comment', 'view', 'share'))`
- `comment_text text check ((type = 'comment' and comment_text is not null and char_length(comment_text) <= 500) or (type != 'comment' and comment_text is null))` *(PATCH 1)*
- `created_at timestamptz default now()`

Partial unique indexes:
```sql
create unique index idx_reel_eng_like_unique on public.reel_engagements(reel_id, customer_id) where type = 'like';
create unique index idx_reel_eng_save_unique on public.reel_engagements(reel_id, customer_id) where type = 'save';
```

### 1.10 `public.live_streams` (Patch 11)
Interactive WebRTC broadcast rooms.
- `id uuid primary key default gen_random_uuid()`
- `vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade`
- `title text not null`
- `category_id uuid references public.categories(id) on delete set null`
- `status text not null check (status in ('scheduled', 'live', 'ended', 'interrupted')) default 'scheduled'`
- `pinned_product_id uuid references public.products(id) on delete set null`
- `viewer_count int default 0`
- `peak_viewers int default 0`
- `total_reactions int default 0` *(PATCH 11: Realtime emoji tally)*
- `total_sales numeric(12,2) default 0.00`
- `stream_channel text`
- `playback_url text`
- `started_at timestamptz`
- `ended_at timestamptz`
- `created_at timestamptz default now()`

### 1.11 `public.orders` (Patch 7)
- `id uuid primary key default gen_random_uuid()`
- `order_number text not null unique`
- `customer_id uuid not null references public.profiles(id) on delete cascade`
- `vendor_id uuid not null references public.vendor_profiles(profile_id) on delete cascade`
- `source text not null check (source in ('direct', 'reel', 'live')) default 'direct'` *(PATCH 7)*
- `source_ref_id uuid`
- `subtotal numeric(12,2) not null check (subtotal >= 0)`
- `tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0)`
- `shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0)`
- `discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0)`
- `total_amount numeric(12,2) not null check (total_amount >= 0)`
- `status text not null check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')) default 'pending'`
- `payment_method text not null`
- `payment_status text not null check (payment_status in ('pending', 'authorized', 'captured', 'failed', 'refunded')) default 'pending'`
- `payment_gateway_ref text`
- `shipping_address jsonb not null`
- `tracking_number text`
- `carrier text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 1.12 `public.order_items` (Patch 7)
- `id uuid primary key default gen_random_uuid()`
- `order_id uuid not null references public.orders(id) on delete cascade`
- `product_id uuid not null references public.products(id) on delete cascade`
- `variant_id uuid references public.product_variants(id) on delete set null`
- `product_name text not null`
- `variant_label text` *(PATCH 7)*
- `unit_price numeric(12,2) not null check (unit_price >= 0)`
- `quantity int not null check (quantity > 0)`
- `total_price numeric(12,2) not null check (total_price >= 0)`
- `clicked_product_id uuid` *(PATCH 7: Tag click attribution)*
- `clicked_at timestamptz` *(PATCH 7: Conversion timing)*
- `created_at timestamptz default now()`

### 1.13 `public.notifications` (Patch 2)
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `type text not null check (type in (`
  `'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',`
  `'payment_success', 'payment_failed',`
  `'payout_processed', 'payout_failed',`
  `'kyc_approved', 'kyc_rejected',`
  `'new_review', 'new_follower',`
  `'dispute_opened', 'dispute_resolved',`
  `'content_removed', 'live_starting',`
  `'new_message', 'system',`
  `'reel_published',` *(PATCH 2)*
  `'ai_tag_suggestion'` *(PATCH 2)*
  `))`
- `title text not null`
- `message text not null`
- `payload jsonb default '{}'::jsonb`
- `is_read boolean default false`
- `read_at timestamptz`
- `created_at timestamptz default now()`

### 1.14 `public.ai_chat_sessions` (Patch 12)
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references public.profiles(id) on delete set null`
- `session_type text default 'support'`
- `messages jsonb default '[]'::jsonb`
- `status text not null check (status in ('active', 'escalated', 'closed')) default 'active'`
- `escalated_to_human boolean default false`
- `total_tokens_used int default 0` *(PATCH 12)*
- `estimated_cost_usd numeric(8,6) default 0.000000` *(PATCH 12)*
- `last_message_at timestamptz default now()`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

---

## 2. Storage Buckets Architecture (Patch 8)

| Bucket Name | Access | Max Size | Allowed MIME Types |
|---|---|---|---|
| `products` | Public Read / Vendor Write | 10 MB | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |
| `reels-raw` | Private / Vendor Write | 200 MB | `video/mp4`, `video/quicktime` |
| `reels-processed` | Public Read / Service Write | 100 MB | `video/mp4`, `video/webm` (HLS manifest) |
| `vendor-kyc` | Private / Vendor Write & Admin Read | 20 MB | `application/pdf`, `image/jpeg`, `image/png` |
| `dispute-evidence` | Private / Authenticated Access | 15 MB | `image/jpeg`, `image/png`, `application/pdf` |
| `review-images` | Public Read / Customer Write | 10 MB | `image/jpeg`, `image/png`, `image/webp` |
| `reel-thumbnails` | Public Read / Service Write | 10 MB | `image/jpeg`, `image/webp`, `image/png` |
| `avatars` | Public Read / User Write | 5 MB | `image/jpeg`, `image/png`, `image/webp` |
| `invoices` | Private / Authorized Access | 10 MB | `application/pdf` |

---

## 3. Supabase Edge Functions Architecture (Patches 2, 3, 9, 12)

```
supabase/functions/
├── _shared/
│   ├── cors.ts                  -- Universal CORS handler
│   └── supabaseClient.ts        -- Authenticated Service & User clients
├── payment/
│   ├── initiate-payment/        -- Checkout session creation (bKash, Card, COD)
│   ├── handle-payment-webhook/  -- Gateway verification, order capture, inventory decrement
│   └── process-payout/          -- Idempotent vendor payout authorization
├── video/
│   └── get-live-token/          -- WebRTC publisher/subscriber JWT generator
├── live/
│   └── broadcast-live-reaction/ -- PATCH 3: Ephemeral reaction broadcaster (10/sec rate limit)
├── media/
│   └── process-reel-video/      -- PATCH 2: HLS transcode & reel_published follower alerts
├── notification/
│   └── send-notification/       -- DB notification insert & realtime channel dispatch
└── ai/
    ├── ai-chat-support/         -- PATCH 12: Token tracking, product cards & escalation
    └── ai-semantic-search/      -- PATCH 6: Hybrid FTS across products and reels
```

---

## 4. Frontend Integration & Client Modules (Patch 10)

Per Patch 10 reconciliation, modular client features reside under `src/js/modules/`:
- `src/js/modules/ai.js`: High-performance AI assistant module handling streaming responses, Edge Function fallbacks, and backward-compatible `window.VendoChat` alias.
- `src/js/data.js`: Reactive persistent stores (`VendoCart`, `VendoWish`, `VendoOrders`, `VendoKYC`) ready to bind to Supabase Client SDK.

---

## 5. Security Hardening Specification v3.1 (SEC-1 through SEC-20)

### 5.1 Critical Security Controls (Deploy Gates)

| ID | Control | Category | Severity | Technical Implementation |
|---|---|---|---|---|
| **SEC-1** | Row Level Security on Every Table | Access Control | Critical | RLS enabled on all 20 tables with granular `select`, `insert`, `update`, `delete` policies per role (Customer, Vendor, Admin). |
| **SEC-2** | Trigger Functions under RLS | Access Control | Critical | Defined with `security definer` and `set search_path = public` on all sync functions (`sync_product_rating`, `sync_vendor_follower_count`, `update_reel_search_vector`, `sync_reel_engagements`, `set_updated_at`). |
| **SEC-3** | Payment Webhook Verification | Fraud Prevention | Critical | Constant-time HMAC SHA-256 signature verification (`timingSafeEqual`) and `payment_transactions` unique constraint idempotency. |
| **SEC-4** | KYC/Dispute Evidence Privacy | PII & Compliance | Critical | Storage buckets `vendor-kyc` and `dispute-evidence` set to private (`public = false`). Short-lived 5-minute signed URLs. `pgcrypto` encrypted NID storage. |
| **SEC-5** | Live Stream RTC Token Protection | Authorization | Critical | JWT session validation and vendor ownership verification (`stream.vendor_id === user.id`) before issuing publisher tokens. |
| **SEC-6** | Payout Double-Processing Defense | Financial Integrity | Critical | Atomic row-level lock `select ... for update` inside `public.process_vendor_payout()` stored procedure. |
| **SEC-7** | Realtime Channel Authorization | Authorization | High | RLS policy on `realtime.messages` with private channel configuration (`config: { private: true }`). |
| **SEC-8** | Reel View-Count Anti-Spam | Fraud Prevention | Medium | 5-minute sliding-window view deduplication table `public.reel_view_dedup` and `public.record_reel_view()`. |
| **SEC-9** | Distributed Sliding-Window Rate Limiter | Cost & Abuse Defense | High | Database table `public.rate_limits` and `public.check_rate_limit()` RPC function enforcing request caps on LLM, payments, and reactions. |
| **SEC-10** | AI Chat Markdown XSS Sanitization | Frontend Security | Medium | Strict tag escaping and safe markdown rendering in `src/js/modules/ai.js` and `src/js/chat.js` preventing injection attacks. |
| **SEC-11** | Strict CORS & Token Storage | Infrastructure | Medium | Explicit origin allowlist in `_shared/cors.ts` (`https://vendo.app`, `https://admin.vendo.app`, localhost). |
| **SEC-12** | SQL Injection Elimination | Application Security | Critical | 100% parameterized queries via Supabase query builder and PL/pgSQL parameters; zero raw query string concatenation. |
| **SEC-13** | CSRF Protection for State-Changing Requests | Application Security | Critical | Double-submit CSRF cookie token helper in `_shared/csrf.ts` and `SameSite=Strict/Lax` headers. |
| **SEC-14** | Malicious File Upload Defense | Application Security | Critical | Magic-bytes content validation, 200MB size caps, quarantine-to-processed bucket lifecycle, and `X-Content-Type-Options: nosniff`. |
| **SEC-15** | Server-Side Request Forgery (SSRF) Defense | Application Security | Critical | Safe fetch helper `_shared/safeFetch.ts` blocking loopback, link-local, RFC 1918 private IP ranges, and cloud metadata services. |
| **SEC-16** | Video Transcoder Command Injection Defense | Application Security | Critical | FFmpeg execution via array argument spawn with `{ shell: false }` and server-generated UUID filenames. |
| **SEC-17** | Checkout Price/Quantity Tamper Defense | Business Logic | Critical | Line-item prices, active status, inventory, and totals resolved and verified exclusively against Postgres records in `initiate-payment`. |
| **SEC-18** | Authentication Brute-Force Defense | Authentication | High | Auth endpoint rate limiter (`login:${ip}:${email}`) max 5 attempts per 5-minute window via `_shared/authRateLimit.ts`. |
| **SEC-19** | Secrets & Key Leakage Prevention | Infrastructure | High | Strict `.gitignore` blocking `.env*`, client bundle isolated to `anon` key, `service_role` key restricted to Edge Functions. |
| **SEC-20** | Dependency Supply Chain Defense | Supply Chain | Medium | Pinned exact package versions in `package.json`, automated `npm audit --audit-level=high` script, and `npm ci` enforcement. |
