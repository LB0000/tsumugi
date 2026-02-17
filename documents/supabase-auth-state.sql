create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state disable row level security;

create table if not exists public.auth_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_salt text not null,
  password_hash text not null,
  auth_provider text not null check (auth_provider in ('email', 'google')),
  email_verified boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.auth_sessions (
  token text primary key,
  user_id text not null references public.auth_users(id) on delete cascade,
  expires_at bigint not null
);

create table if not exists public.auth_reset_tokens (
  token text primary key,
  user_id text not null references public.auth_users(id) on delete cascade,
  expires_at bigint not null
);

create table if not exists public.auth_verification_tokens (
  token text primary key,
  user_id text not null references public.auth_users(id) on delete cascade,
  expires_at bigint not null
);

create table if not exists public.auth_saved_addresses (
  id text primary key,
  user_id text not null references public.auth_users(id) on delete cascade,
  label text not null,
  last_name text not null,
  first_name text not null,
  email text not null,
  phone text not null,
  postal_code text not null,
  prefecture text not null,
  city text not null,
  address_line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null
);

create index if not exists idx_auth_sessions_user_id on public.auth_sessions(user_id);
create index if not exists idx_auth_reset_tokens_user_id on public.auth_reset_tokens(user_id);
create index if not exists idx_auth_verification_tokens_user_id on public.auth_verification_tokens(user_id);
create index if not exists idx_auth_saved_addresses_user_id on public.auth_saved_addresses(user_id);

alter table public.auth_users disable row level security;
alter table public.auth_sessions disable row level security;
alter table public.auth_reset_tokens disable row level security;
alter table public.auth_verification_tokens disable row level security;
alter table public.auth_saved_addresses disable row level security;

-- ================================
-- Checkout / Order tables
-- ================================

create table if not exists public.checkout_orders (
  order_id text primary key,
  payment_id text not null default '',
  status text not null default 'pending',
  user_id text,
  total_amount integer,
  items jsonb not null default '[]'::jsonb,
  shipping_address jsonb,
  gift_info jsonb,
  receipt_url text,
  coupon_code text,
  coupon_used boolean not null default false,
  created_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.checkout_webhook_events (
  event_id text primary key,
  event_type text not null,
  order_id text,
  payment_id text,
  status text,
  received_at timestamptz not null default now()
);

create index if not exists idx_checkout_orders_user_id on public.checkout_orders(user_id);
create index if not exists idx_checkout_orders_status on public.checkout_orders(status);
create index if not exists idx_checkout_webhook_events_order_id on public.checkout_webhook_events(order_id);

alter table public.checkout_orders disable row level security;
alter table public.checkout_webhook_events disable row level security;

-- ================================
-- Style Analytics tables
-- ================================

create table if not exists public.style_analytics (
  analytic_key text primary key,
  style_id text not null,
  category text not null,
  style_name text not null,
  count integer not null default 0,
  last_used_at timestamptz not null default now(),
  unique (style_id, category)
);

alter table public.style_analytics disable row level security;

-- ================================
-- Gallery tables
-- ================================

create table if not exists public.gallery_items (
  id text primary key,
  user_id text not null references public.auth_users(id) on delete cascade,
  image_file_name text not null,
  thumbnail_file_name text not null,
  art_style_id text not null,
  art_style_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gallery_items_user_id on public.gallery_items(user_id);

alter table public.gallery_items disable row level security;

-- ================================
-- Cart abandonment tables
-- ================================

create table if not exists public.saved_carts (
  user_id text primary key,
  email text not null,
  items jsonb not null default '[]'::jsonb,
  saved_at timestamptz not null default now(),
  email_sent boolean not null default false
);

alter table public.saved_carts disable row level security;

-- ================================
-- Scheduled emails tables
-- ================================

create table if not exists public.scheduled_emails (
  id text primary key,
  type text not null,
  to_address text not null,
  order_id text not null,
  user_name text not null,
  scheduled_at timestamptz not null,
  sent boolean not null default false
);

alter table public.scheduled_emails disable row level security;
