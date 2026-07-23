-- 再受験申請の通知メール宛先リストを site_settings に追加する(受験完了通知とは別リスト)。
alter table public.site_settings
  add column if not exists retake_notification_emails text[] not null default '{}';
