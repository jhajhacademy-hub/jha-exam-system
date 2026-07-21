-- 再受験申請(承認制)のためのテーブル
-- 1回目の受験は無条件、2回目以降は運用担当者/システム管理者の承認が必要になる。

do $$ begin
  create type public.retake_status as enum ('pending', 'approved', 'denied', 'used');
exception when duplicate_object then null; end $$;

create table if not exists public.retake_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.retake_status not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);

create index if not exists retake_requests_student_id_idx on public.retake_requests (student_id);

alter table public.retake_requests enable row level security;

drop policy if exists retake_requests_select on public.retake_requests;
create policy retake_requests_select on public.retake_requests
  for select using (
    student_id = auth.uid() or public.is_operator_or_admin()
  );

drop policy if exists retake_requests_insert on public.retake_requests;
create policy retake_requests_insert on public.retake_requests
  for insert with check (student_id = auth.uid());

-- 承認/却下/消費(used)の更新は運用担当者・システム管理者、
-- もしくはサーバー側(service role)でのみ行う。
drop policy if exists retake_requests_update on public.retake_requests;
create policy retake_requests_update on public.retake_requests
  for update using (public.is_operator_or_admin()) with check (public.is_operator_or_admin());
