-- Durable campaign automation for rehearsal-safe stream telemetry and clip intake.

create table if not exists public.stream_sessions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_session_id text not null,
  provider_user_id text,
  title text,
  started_at timestamptz not null,
  last_seen_at timestamptz not null,
  ended_at timestamptz,
  counts_toward_campaign boolean not null default false,
  counted_seconds bigint not null default 0 check (counted_seconds >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_session_id)
);

create index if not exists stream_sessions_provider_active_idx
  on public.stream_sessions (provider, ended_at, last_seen_at desc);

alter table public.stream_sessions enable row level security;

drop trigger if exists stream_sessions_set_updated_at on public.stream_sessions;
create trigger stream_sessions_set_updated_at
before update on public.stream_sessions
for each row execute function public.set_updated_at();

create table if not exists public.clip_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  platform text not null,
  title text not null,
  url text,
  posted_at timestamptz not null,
  campaign_day integer check (campaign_day is null or campaign_day between 1 and 60),
  clip_count integer not null default 1 check (clip_count between 1 and 20),
  counts_toward_campaign boolean not null default false,
  proof_asset text,
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clip_events_campaign_idx
  on public.clip_events (counts_toward_campaign, campaign_day, posted_at desc);

alter table public.clip_events enable row level security;

drop trigger if exists clip_events_set_updated_at on public.clip_events;
create trigger clip_events_set_updated_at
before update on public.clip_events
for each row execute function public.set_updated_at();

create or replace function public.record_campaign_clip_event(
  p_event_id text,
  p_platform text,
  p_title text,
  p_url text,
  p_posted_at timestamptz,
  p_campaign_day integer,
  p_count integer,
  p_counts_toward_campaign boolean,
  p_proof_asset text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_id uuid;
  v_event public.clip_events%rowtype;
  v_updated_rows integer := 0;
begin
  if nullif(trim(p_event_id), '') is null then
    raise exception 'clip_event_id_required';
  end if;

  if p_count < 1 or p_count > 20 then
    raise exception 'invalid_clip_count';
  end if;

  if p_counts_toward_campaign and (p_campaign_day is null or p_campaign_day < 1 or p_campaign_day > 60) then
    raise exception 'valid_campaign_day_required';
  end if;

  insert into public.clip_events (
    event_id,
    platform,
    title,
    url,
    posted_at,
    campaign_day,
    clip_count,
    counts_toward_campaign,
    proof_asset,
    payload
  )
  values (
    p_event_id,
    p_platform,
    p_title,
    nullif(p_url, ''),
    p_posted_at,
    p_campaign_day,
    p_count,
    p_counts_toward_campaign,
    nullif(p_proof_asset, ''),
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    select * into v_event from public.clip_events where event_id = p_event_id;
    return jsonb_build_object(
      'duplicate', true,
      'eventId', v_event.event_id,
      'campaignDay', v_event.campaign_day,
      'counted', v_event.counts_toward_campaign,
      'updatedRows', 0
    );
  end if;

  if p_counts_toward_campaign then
    update public.daily_logs
    set
      clips_posted = clips_posted + p_count,
      proof_assets = case
        when nullif(trim(p_proof_asset), '') is null or p_proof_asset = any(proof_assets)
          then proof_assets
        else array_append(proof_assets, p_proof_asset)
      end,
      updated_at = now()
    where day >= p_campaign_day;

    get diagnostics v_updated_rows = row_count;

    update public.clip_events
    set processed_at = now()
    where id = v_inserted_id;
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'eventId', p_event_id,
    'campaignDay', p_campaign_day,
    'counted', p_counts_toward_campaign,
    'updatedRows', v_updated_rows
  );
end;
$$;

revoke all on function public.record_campaign_clip_event(text, text, text, text, timestamptz, integer, integer, boolean, text, jsonb) from public;
grant execute on function public.record_campaign_clip_event(text, text, text, text, timestamptz, integer, integer, boolean, text, jsonb) to service_role;

