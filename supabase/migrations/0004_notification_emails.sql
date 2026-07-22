-- 受験完了通知メールの宛先リストを site_settings に追加する。
alter table public.site_settings
  add column if not exists notification_emails text[] not null default '{}';
