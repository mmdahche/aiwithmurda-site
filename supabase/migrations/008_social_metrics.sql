create table if not exists public.social_accounts (
  provider text primary key,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connecting', 'connected', 'stale', 'error')),
  provider_user_id text,
  username text,
  display_name text,
  profile_url text,
  follower_count bigint check (follower_count is null or follower_count >= 0),
  previous_follower_count bigint check (previous_follower_count is null or previous_follower_count >= 0),
  delta bigint not null default 0,
  metric_name text not null default 'followers',
  precision text not null default 'exact'
    check (precision in ('exact', 'rounded', 'estimated')),
  connected_at timestamptz,
  last_synced_at timestamptz,
  last_changed_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_accounts_status_idx
  on public.social_accounts (status, updated_at desc);

alter table public.social_accounts enable row level security;

drop trigger if exists social_accounts_set_updated_at on public.social_accounts;
create trigger social_accounts_set_updated_at
before update on public.social_accounts
for each row execute function public.set_updated_at();

create table if not exists public.social_metric_snapshots (
  id bigint generated always as identity primary key,
  provider text not null references public.social_accounts(provider) on delete cascade,
  follower_count bigint not null check (follower_count >= 0),
  delta bigint not null default 0,
  observed_at timestamptz not null default now(),
  source text not null default 'api-poll',
  metadata jsonb not null default '{}'
);

create index if not exists social_metric_snapshots_provider_observed_idx
  on public.social_metric_snapshots (provider, observed_at desc);

alter table public.social_metric_snapshots enable row level security;

insert into public.social_accounts (provider, metric_name, precision)
values
  ('twitch', 'followers', 'exact'),
  ('tiktok', 'followers', 'exact'),
  ('instagram', 'followers', 'exact'),
  ('youtube', 'subscribers', 'rounded'),
  ('x', 'followers', 'exact')
on conflict (provider) do nothing;
