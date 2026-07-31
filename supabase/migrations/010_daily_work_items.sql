-- Same-day operating queue for the private control room and public day receipt.
-- Metrics remain in their existing automation-owned columns; this ledger only
-- stores the work Murad plans, starts, completes, and documents during the day.

alter table public.daily_logs
  add column if not exists work_items jsonb not null default '[]'::jsonb;

do $$
begin
  alter table public.daily_logs
    add constraint daily_logs_work_items_array
    check (jsonb_typeof(work_items) = 'array');
exception
  when duplicate_object then null;
end
$$;
