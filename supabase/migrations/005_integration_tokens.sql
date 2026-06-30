create table if not exists public.integration_tokens (
  provider text primary key,
  access_token text not null,
  refresh_token text,
  token_type text not null default 'bearer',
  scope text[] not null default '{}',
  expires_at timestamptz,
  provider_user_id text,
  provider_user_login text,
  provider_user_name text,
  broadcaster_user_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_tokens_updated_at_idx
  on public.integration_tokens (updated_at desc);

alter table public.integration_tokens enable row level security;

drop trigger if exists integration_tokens_set_updated_at on public.integration_tokens;
create trigger integration_tokens_set_updated_at
before update on public.integration_tokens
for each row execute function public.set_updated_at();

create table if not exists public.integration_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create index if not exists integration_events_processed_at_idx
  on public.integration_events (processed_at desc);

alter table public.integration_events enable row level security;
