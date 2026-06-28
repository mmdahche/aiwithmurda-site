-- Public 60-day scoreboard logs.
-- Reads are public by design. Writes go through the server admin API using the service role.

create table if not exists public.daily_logs (
  day integer primary key check (day between 1 and 60),
  date date not null,
  main_goal text not null,
  status text not null default 'planned',
  followers jsonb not null default '{}'::jsonb,
  email_subscribers integer not null default 0 check (email_subscribers >= 0),
  revenue_collected numeric(12,2) not null default 0 check (revenue_collected >= 0),
  revenue_pipeline numeric(12,2) not null default 0 check (revenue_pipeline >= 0),
  hours_streamed numeric(8,2) not null default 0 check (hours_streamed >= 0),
  clips_posted integer not null default 0 check (clips_posted >= 0),
  outreach_sent integer not null default 0 check (outreach_sent >= 0),
  calls_booked integer not null default 0 check (calls_booked >= 0),
  products_sold integer not null default 0 check (products_sold >= 0),
  builds_shipped integer not null default 0 check (builds_shipped >= 0),
  daily_lessons integer not null default 0 check (daily_lessons >= 0),
  shipped_items text[] not null default '{}',
  best_moment text not null default '',
  biggest_failure text not null default '',
  lesson_learned text not null default '',
  tomorrow_promise text not null default '',
  spike_cause text not null default '',
  proof_assets text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_logs_date_idx on public.daily_logs (date);
create index if not exists daily_logs_updated_at_idx on public.daily_logs (updated_at desc);

alter table public.daily_logs enable row level security;

drop policy if exists daily_logs_public_read on public.daily_logs;
create policy daily_logs_public_read on public.daily_logs
  for select
  to anon, authenticated
  using (true);

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at
before update on public.daily_logs
for each row execute function public.set_updated_at();
