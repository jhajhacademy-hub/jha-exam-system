-- JHA住宅設計協会 資格認定オンライン試験システム 初期スキーマ
-- Supabase の SQL Editor で実行するか、`supabase db push` で適用してください。

create extension if not exists "pgcrypto";

-- ===== enums =====
do $$ begin
  create type public.role_type as enum ('admin', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_status as enum ('in_progress', 'completed');
exception when duplicate_object then null; end $$;

-- ===== profiles =====
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.role_type not null default 'student',
  student_code text unique,
  name text not null,
  age int,
  email text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is '受講者・管理者のプロフィール。auth.usersと1:1。';

-- ===== categories =====
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order int not null default 0
);

-- ===== questions =====
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  question_no text unique not null,
  question_text text not null,
  answer boolean not null,
  explanation text not null default '',
  trap_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_category_id_idx on public.questions (category_id);

-- ===== exam_sessions =====
create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.session_status not null default 'in_progress',
  question_ids uuid[] not null,
  current_index int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds int,
  total_score int,
  passed boolean
);

create index if not exists exam_sessions_student_id_idx on public.exam_sessions (student_id);

-- ===== exam_answers =====
create table if not exists public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.exam_sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  order_index int not null,
  user_answer boolean not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index if not exists exam_answers_session_id_idx on public.exam_answers (session_id);
create index if not exists exam_answers_category_id_idx on public.exam_answers (category_id);

-- ===== site_settings (singleton) =====
create table if not exists public.site_settings (
  id smallint primary key default 1,
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ===== helper: is_admin() =====
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_answers enable row level security;
alter table public.site_settings enable row level security;

-- profiles: 本人 or 管理者が閲覧可能。書き込みはサーバー(service role)経由のみ。
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- categories / questions: 認証済みユーザーは閲覧可、書き込みは管理者のみ。
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (auth.role() = 'authenticated');

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions
  for select using (auth.role() = 'authenticated');

drop policy if exists questions_write on public.questions;
create policy questions_write on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- exam_sessions: 本人のみ読み書き、管理者は閲覧のみ。
drop policy if exists exam_sessions_select on public.exam_sessions;
create policy exam_sessions_select on public.exam_sessions
  for select using (student_id = auth.uid() or public.is_admin());

drop policy if exists exam_sessions_insert on public.exam_sessions;
create policy exam_sessions_insert on public.exam_sessions
  for insert with check (student_id = auth.uid());

drop policy if exists exam_sessions_update on public.exam_sessions;
create policy exam_sessions_update on public.exam_sessions
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- exam_answers: セッションの持ち主のみ読み書き、管理者は閲覧のみ。
drop policy if exists exam_answers_select on public.exam_answers;
create policy exam_answers_select on public.exam_answers
  for select using (
    public.is_admin() or exists (
      select 1 from public.exam_sessions s
      where s.id = session_id and s.student_id = auth.uid()
    )
  );

drop policy if exists exam_answers_insert on public.exam_answers;
create policy exam_answers_insert on public.exam_answers
  for insert with check (
    exists (
      select 1 from public.exam_sessions s
      where s.id = session_id and s.student_id = auth.uid()
    )
  );

-- site_settings: 誰でも閲覧可(ロゴ表示のため)、書き込みは管理者のみ。
drop policy if exists site_settings_select on public.site_settings;
create policy site_settings_select on public.site_settings
  for select using (true);

drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ===== categories 初期データ =====
insert into public.categories (name, sort_order) values
  ('部材・寸法・木材', 1),
  ('住宅ローン・資金計画', 2),
  ('登記・保険・保証', 3),
  ('建築法規・都市計画', 4),
  ('断熱・換気・構造・現場', 5),
  ('接客心理学', 6),
  ('施工管理', 7)
on conflict (name) do nothing;

-- ===== storage bucket (ロゴ用) =====
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects
  for select using (bucket_id = 'branding');

drop policy if exists branding_admin_write on storage.objects;
create policy branding_admin_write on storage.objects
  for all using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());
