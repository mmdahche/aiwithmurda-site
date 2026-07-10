-- Permanent Operator Toolkit access plus a separately revocable monthly update entitlement.

insert into public.products (key, name, subtitle, price_cents, currency, active)
values
  (
    'operator_toolkit',
    'The Operator Toolkit',
    'Customer-safe Claude Code + Codex operating system.',
    29700,
    'usd',
    true
  ),
  (
    'operator_updates',
    'Operator System Updates',
    'New skills, revised workflows, compatibility fixes, and monthly releases.',
    3000,
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

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null references public.products(key),
  stripe_subscription_id text not null unique,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_key),
  check (status <> '')
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_product_key_idx on public.subscriptions (product_key);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();
