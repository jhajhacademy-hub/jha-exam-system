import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { NotificationEmailForm } from "@/components/admin/NotificationEmailForm";
import { removeNotificationEmailAction } from "./actions";

export default async function AdminNotificationsPage() {
  await requireAdminProfile();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("notification_emails")
    .eq("id", 1)
    .single();

  const emails = settings?.notification_emails ?? [];

  return (
    <div>
      <h1 className="mb-4 text-lg tracking-wide">通知メール設定</h1>
      <p className="mb-10 max-w-xl text-sm text-ink-soft">
        受験者が試験を完了するたびに、ここに登録したメールアドレス全員へ受験結果(日時・氏名・年齢・受験番号・メールアドレス・点数・合否)を自動送信します。
      </p>

      <div className="mb-10 max-w-md border border-line">
        {emails.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            登録された宛先はありません。
          </p>
        ) : (
          <ul>
            {emails.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between border-b border-line px-6 py-4 text-sm last:border-b-0"
              >
                <span>{email}</span>
                <form action={removeNotificationEmailAction}>
                  <input type="hidden" name="email" value={email} />
                  <SubmitButton variant="ghost" size="md" className="!h-8 !px-2 text-xs">
                    削除
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotificationEmailForm />
    </div>
  );
}
