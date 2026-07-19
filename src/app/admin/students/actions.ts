"use server";

import Papa from "papaparse";
import { requireStaffProfile, studentCodeToLoginEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StudentFormState = {
  status: "idle" | "success" | "error";
  message: string;
  detail?: string[];
};

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 10) + "A1!";
}

export async function createStudentAction(
  _prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  await requireStaffProfile();

  const studentCode = String(formData.get("studentCode") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim() || randomPassword();

  if (!studentCode || !name) {
    return { status: "error", message: "受講者IDと名前は必須です。" };
  }

  const admin = createAdminClient();
  const loginEmail = studentCodeToLoginEmail(studentCode);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
  });
  if (createError) {
    return { status: "error", message: `作成に失敗しました: ${createError.message}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "student",
    student_code: studentCode,
    name,
    age: ageRaw ? Number(ageRaw) : null,
    email: email || null,
  });
  if (profileError) {
    return { status: "error", message: `プロフィール作成に失敗しました: ${profileError.message}` };
  }

  return {
    status: "success",
    message: `受講者「${name}」(${studentCode}) を作成しました。初期パスワード: ${password}`,
  };
}

export async function importStudentsCsvAction(
  _prevState: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  await requireStaffProfile();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "CSVファイルを選択してください。" };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return {
      status: "error",
      message: "CSVの解析に失敗しました。",
      detail: parsed.errors.map((e) => `行${e.row}: ${e.message}`),
    };
  }

  const admin = createAdminClient();
  const errors: string[] = [];
  let successCount = 0;

  for (const [i, row] of parsed.data.entries()) {
    const studentCode = (row.student_code ?? row.id ?? "").trim();
    const name = (row.name ?? "").trim();
    const ageRaw = (row.age ?? "").trim();
    const email = (row.email ?? "").trim();
    const password = (row.password ?? "").trim() || randomPassword();

    if (!studentCode || !name) {
      errors.push(`${i + 2}行目: student_code / name は必須です。`);
      continue;
    }

    const loginEmail = studentCodeToLoginEmail(studentCode);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
    });

    if (createError) {
      errors.push(`${i + 2}行目 (${studentCode}): ${createError.message}`);
      continue;
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      role: "student",
      student_code: studentCode,
      name,
      age: ageRaw ? Number(ageRaw) : null,
      email: email || null,
    });

    if (profileError) {
      errors.push(`${i + 2}行目 (${studentCode}): ${profileError.message}`);
      continue;
    }

    successCount++;
  }

  return {
    status: errors.length > 0 && successCount === 0 ? "error" : "success",
    message: `${successCount}件を登録しました。(失敗 ${errors.length}件)`,
    detail: errors,
  };
}
