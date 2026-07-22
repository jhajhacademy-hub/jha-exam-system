"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addNotificationEmailAction(
  _prevState: NotificationFormState,
  formData: FormData
): Promise<NotificationFormState> {
  await requireAdminProfile();

  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "正しいメールアドレスを入力してください。" };
  }

  const admin = createAdminClient();
  const { data: settings, error: fetchError } = await admin
    .from("site_settings")
    .select("notification_emails")
    .eq("id", 1)
    .single();
  if (fetchError) {
    return { status: "error", message: `取得に失敗しました: ${fetchError.message}` };
  }

  const current = settings?.notification_emails ?? [];
  if (current.includes(email)) {
    return { status: "error", message: "そのメールアドレスは既に登録されています。" };
  }

  const { error: updateError } = await admin
    .from("site_settings")
    .update({ notification_emails: [...current, email], updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (updateError) {
    return { status: "error", message: `保存に失敗しました: ${updateError.message}` };
  }

  revalidatePath("/admin/notifications");
  return { status: "success", message: `${email} を追加しました。` };
}

export async function removeNotificationEmailAction(formData: FormData) {
  await requireAdminProfile();

  const email = String(formData.get("email") ?? "");
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("site_settings")
    .select("notification_emails")
    .eq("id", 1)
    .single();

  const current = settings?.notification_emails ?? [];
  await admin
    .from("site_settings")
    .update({
      notification_emails: current.filter((e) => e !== email),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  revalidatePath("/admin/notifications");
}
