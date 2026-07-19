"use server";

import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type LogoFormState = {
  status: "idle" | "success" | "error";
  message: string;
};


export async function uploadLogoAction(
  _prevState: LogoFormState,
  formData: FormData
): Promise<LogoFormState> {
  await requireAdminProfile();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "PNG画像を選択してください。" };
  }
  if (file.type !== "image/png") {
    return { status: "error", message: "PNG形式の画像のみアップロードできます。" };
  }

  const admin = createAdminClient();
  const path = `logo-${Date.now()}.png`;

  const { error: uploadError } = await admin.storage
    .from("branding")
    .upload(path, await file.arrayBuffer(), { contentType: "image/png", upsert: true });

  if (uploadError) {
    return { status: "error", message: `アップロードに失敗しました: ${uploadError.message}` };
  }

  const { data: publicUrlData } = admin.storage.from("branding").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("site_settings")
    .update({ logo_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (updateError) {
    return { status: "error", message: `設定の保存に失敗しました: ${updateError.message}` };
  }

  return { status: "success", message: "ロゴを更新しました。" };
}
