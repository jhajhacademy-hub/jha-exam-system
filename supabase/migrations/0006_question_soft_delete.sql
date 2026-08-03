-- 問題の論理削除(過去の受験記録から参照され続けるため物理削除はしない)。
alter table public.questions
  add column if not exists deleted_at timestamptz;
