-- Member course task progress.
-- One row per user/product/module/task. The server writes through the service role;
-- RLS keeps direct Supabase reads and writes scoped to the logged-in owner.

create table if not exists public.member_task_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null references public.products(key) on delete cascade,
  module_key text not null,
  task_key text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_key, module_key, task_key),
  check (module_key <> ''),
  check (task_key <> '')
);

create index if not exists member_task_progress_user_product_idx
  on public.member_task_progress (user_id, product_key);

create index if not exists member_task_progress_user_completed_idx
  on public.member_task_progress (user_id, product_key, completed);

alter table public.member_task_progress enable row level security;

drop policy if exists member_task_progress_select_own on public.member_task_progress;
create policy member_task_progress_select_own on public.member_task_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists member_task_progress_insert_own on public.member_task_progress;
create policy member_task_progress_insert_own on public.member_task_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists member_task_progress_update_own on public.member_task_progress;
create policy member_task_progress_update_own on public.member_task_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists member_task_progress_delete_own on public.member_task_progress;
create policy member_task_progress_delete_own on public.member_task_progress
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists member_task_progress_set_updated_at on public.member_task_progress;
create trigger member_task_progress_set_updated_at
before update on public.member_task_progress
for each row execute function public.set_updated_at();
