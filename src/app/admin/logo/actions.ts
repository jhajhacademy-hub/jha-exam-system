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
    return { status: "error", message: "PNGまたはJPEG画像を選択してください。" };
  }

  const extensionByType: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
  };
  const extension = extensionByType[file.type];
  if (!extension) {
    return { status: "error", message: "PNGまたはJPEG形式の画像のみアップロードできます。" };
  }

  const admin = createAdminClient();
  const path = `logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("branding")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

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
