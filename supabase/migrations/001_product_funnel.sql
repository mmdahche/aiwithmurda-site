-- AI with Murda product funnel.
-- Profiles and product entitlements are Supabase Auth-backed from day one.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  key text primary key,
  name text not null,
  subtitle text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null references public.products(key),
  stripe_checkout_session_id text not null unique,
  stripe_customer_id text,
  amount_total integer not null check (amount_total >= 0),
  currency text not null default 'usd',
  status text not null check (status in ('paid', 'refunded', 'disputed', 'void')),
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null references public.products(key),
  source_purchase_id uuid references public.purchases(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, product_key)
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists purchases_user_id_idx on public.purchases (user_id);
create index if not exists purchases_product_key_idx on public.purchases (product_key);
create index if not exists entitlements_user_id_idx on public.entitlements (user_id);
create index if not exists entitlements_product_key_idx on public.entitlements (product_key);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists products_select_active on public.products;
create policy products_select_active on public.products
  for select
  to anon, authenticated
  using (active = true);

drop policy if exists purchases_select_own on public.purchases;
create policy purchases_select_own on public.purchases
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own on public.entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_aiwithmurda on auth.users;
create trigger on_auth_user_created_aiwithmurda
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.products (key, name, subtitle, price_cents, currency, active)
values (
  'future_proof_method',
  'The Future Proof Method',
  'New Wave Operator Kit',
  4700,
  'usd',
  true
)
on conflict (key) do update
  set name = excluded.name,
      subtitle = excluded.subtitle,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      active = excluded.active,
      updated_at = now();
