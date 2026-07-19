-- ロール拡張(運用担当者operatorの追加)と、アカウント有効/無効ステータスの追加
-- Supabase の SQL Editor で 0001_init.sql の後に実行してください。

-- ===== role_type に 'operator' を追加 =====
-- ALTER TYPE ... ADD VALUE は同一トランザクション内でその値を使えないため、
-- 新しい型を作って差し替える安全な方式で行う。
do $$ begin
  create type public.role_type_new as enum ('admin', 'operator', 'student');
exception when duplicate_object then null; end $$;

alter table public.profiles alter column role drop default;

alter table public.profiles
  alter column role type public.role_type_new
  using role::text::public.role_type_new;

drop type if exists public.role_type;
alter type public.role_type_new rename to role_type;

alter table public.profiles alter column role set default 'student'::public.role_type;

-- ===== profiles にアカウント有効/無効ステータスを追加 =====
do $$ begin
  create type public.account_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists status public.account_status not null default 'active';

comment on column public.profiles.status is 'active=有効 / inactive=無効(ログイン不可)';

-- ===== helper: is_operator_or_admin() =====
create or replace function public.is_operator_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'operator')
  );
$$;

-- ===== profiles の select ポリシーを更新(運用担当者は受験者一覧を閲覧可) =====
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (public.is_operator_or_admin() and role = 'student')
  );

-- profiles の書き込みは管理者(システム管理者)のみ。通常はservice roleで行うが念のため。
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ===== exam_sessions / exam_answers: 運用担当者も閲覧可能に =====
drop policy if exists exam_sessions_select on public.exam_sessions;
create policy exam_sessions_select on public.exam_sessions
  for select using (
    student_id = auth.uid()
    or public.is_operator_or_admin()
  );

drop policy if exists exam_answers_select on public.exam_answers;
create policy exam_answers_select on public.exam_answers
  for select using (
    public.is_operator_or_admin() or exists (
      select 1 from public.exam_sessions s
      where s.id = session_id and s.student_id = auth.uid()
    )
  );
