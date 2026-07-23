import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { NotificationEmailForm } from "@/components/admin/NotificationEmailForm";
import {
  addNotificationEmailAction,
  removeNotificationEmailAction,
  addRetakeNotificationEmailAction,
  removeRetakeNotificationEmailAction,
} from "./actions";

export default async function AdminNotificationsPage() {
  await requireAdminProfile();

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("notification_emails, retake_notification_emails")
    .eq("id", 1)
    .single();

  const completionEmails = settings?.notification_emails ?? [];
  const retakeEmails = settings?.retake_notification_emails ?? [];

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">通知メール設定</h1>

      <section className="mb-16">
        <h2 className="mb-2 text-sm tracking-wide">受験完了通知</h2>
        <p className="mb-6 max-w-xl text-sm text-ink-soft">
          受験者が試験を完了するたびに、ここに登録したメールアドレス全員へ受験結果(日時・氏名・年齢・受験番号・メールアドレス・点数・合否)を自動送信します。
        </p>

        <EmailList emails={completionEmails} removeAction={removeNotificationEmailAction} />
        <NotificationEmailForm action={addNotificationEmailAction} />
      </section>

      <section>
        <h2 className="mb-2 text-sm tracking-wide">再受験申請通知</h2>
        <p className="mb-6 max-w-xl text-sm text-ink-soft">
          受験者が再受験を申請するたびに、ここに登録したメールアドレス全員へ申請内容(日時・氏名・年齢・受験番号・メールアドレス)を自動送信します。
        </p>

        <EmailList emails={retakeEmails} removeAction={removeRetakeNotificationEmailAction} />
        <NotificationEmailForm action={addRetakeNotificationEmailAction} />
      </section>
    </div>
  );
}

function EmailList({
  emails,
  removeAction,
}: {
  emails: string[];
  removeAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="mb-10 max-w-md border border-line">
      {emails.length === 0 ? (
        <p className="p-8 text-center text-sm text-ink-soft">登録された宛先はありません。</p>
      ) : (
        <ul>
          {emails.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between border-b border-line px-6 py-4 text-sm last:border-b-0"
            >
              <span>{email}</span>
              <form action={removeAction}>
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
  );
}
