-- Durable build-log subscriber capture.
-- Public writes go through the server API using the service role. Direct table access stays locked down.

create table if not exists public.subscribers (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  first_name text,
  source text not null default 'start',
  subscribed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists subscribers_subscribed_at_idx on public.subscribers (subscribed_at desc);
create index if not exists subscribers_last_seen_at_idx on public.subscribers (last_seen_at desc);

alter table public.subscribers enable row level security;
