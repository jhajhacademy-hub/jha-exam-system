"use server";

import { redirect } from "next/navigation";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 10) + "A1!";
}

export async function createStaffAction(
  _prevState: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  await requireAdminProfile();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "").trim() || randomPassword();

  if (!name || !email || (role !== "admin" && role !== "operator")) {
    return { status: "error", message: "氏名・メールアドレス・権限は必須です。" };
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    return { status: "error", message: `作成に失敗しました: ${createError.message}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: role as "admin" | "operator",
    name,
    email,
    status: "active",
  });
  if (profileError) {
    return { status: "error", message: `プロフィール作成に失敗しました: ${profileError.message}` };
  }

  redirect("/admin/users");
}

export async function updateStaffAction(
  _prevState: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const currentProfile = await requireAdminProfile();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const statusRaw = String(formData.get("status") ?? "active");

  if (
    !id ||
    !name ||
    (role !== "admin" && role !== "operator") ||
    (statusRaw !== "active" && statusRaw !== "inactive")
  ) {
    return { status: "error", message: "氏名・権限は必須です。" };
  }

  const status = statusRaw as "active" | "inactive";

  if (id === currentProfile.id && (role !== "admin" || status !== "active")) {
    return {
      status: "error",
      message: "自分自身の権限を下げる・無効化することはできません。",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ name, role, status })
    .eq("id", id);

  if (error) {
    return { status: "error", message: `更新に失敗しました: ${error.message}` };
  }

  redirect("/admin/users");
}

export async function deleteStaffAction(formData: FormData) {
  const currentProfile = await requireAdminProfile();
  const id = String(formData.get("id") ?? "");

  if (id && id !== currentProfile.id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(id);
  }

  redirect("/admin/users");
}
