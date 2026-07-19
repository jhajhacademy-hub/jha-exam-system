"use server";

import Papa from "papaparse";
import { redirect } from "next/navigation";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type QuestionFormState = {
  status: "idle" | "success" | "error";
  message: string;
  detail?: string[];
};

function parseAnswer(raw: string): boolean {
  const v = raw.trim();
  return v === "◯" || v === "○" || v.toLowerCase() === "true" || v === "1";
}

export async function createQuestionAction(
  _prevState: QuestionFormState,
  formData: FormData
): Promise<QuestionFormState> {
  await requireAdminProfile();
  const admin = createAdminClient();

  const categoryId = String(formData.get("category_id") ?? "");
  const questionNo = String(formData.get("question_no") ?? "").trim();
  const questionText = String(formData.get("question_text") ?? "").trim();
  const answer = String(formData.get("answer") ?? "") === "true";
  const explanation = String(formData.get("explanation") ?? "").trim();
  const trapNote = String(formData.get("trap_note") ?? "").trim();

  if (!categoryId || !questionNo || !questionText) {
    return { status: "error", message: "カテゴリ・問題ID・問題文は必須です。" };
  }

  const { error } = await admin.from("questions").insert({
    category_id: categoryId,
    question_no: questionNo,
    question_text: questionText,
    answer,
    explanation,
    trap_note: trapNote,
  });

  if (error) {
    return { status: "error", message: `登録に失敗しました: ${error.message}` };
  }

  redirect("/admin/questions");
}

export async function updateQuestionAction(
  _prevState: QuestionFormState,
  formData: FormData
): Promise<QuestionFormState> {
  await requireAdminProfile();
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const questionNo = String(formData.get("question_no") ?? "").trim();
  const questionText = String(formData.get("question_text") ?? "").trim();
  const answer = String(formData.get("answer") ?? "") === "true";
  const explanation = String(formData.get("explanation") ?? "").trim();
  const trapNote = String(formData.get("trap_note") ?? "").trim();

  if (!id || !categoryId || !questionNo || !questionText) {
    return { status: "error", message: "カテゴリ・問題ID・問題文は必須です。" };
  }

  const { error } = await admin
    .from("questions")
    .update({
      category_id: categoryId,
      question_no: questionNo,
      question_text: questionText,
      answer,
      explanation,
      trap_note: trapNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { status: "error", message: `更新に失敗しました: ${error.message}` };
  }

  redirect("/admin/questions");
}

export async function deleteQuestionAction(formData: FormData) {
  await requireAdminProfile();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await admin.from("questions").delete().eq("id", id);
  }
  redirect("/admin/questions");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdminProfile();
  const admin = createAdminClient();
  const name = String(formData.get("name") ?? "").trim();
  if (name) {
    const { count } = await admin.from("categories").select("id", { count: "exact", head: true });
    await admin.from("categories").insert({ name, sort_order: (count ?? 0) + 1 });
  }
  redirect("/admin/questions");
}

export async function importQuestionsCsvAction(
  _prevState: QuestionFormState,
  formData: FormData
): Promise<QuestionFormState> {
  await requireAdminProfile();
  const admin = createAdminClient();

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

  const { data: categories } = await admin.from("categories").select("id, name");
  const categoryIdByName = new Map((categories ?? []).map((c) => [c.name, c.id]));

  const errors: string[] = [];
  const rowsToInsert: {
    category_id: string;
    question_no: string;
    question_text: string;
    answer: boolean;
    explanation: string;
    trap_note: string;
  }[] = [];

  for (const [i, row] of parsed.data.entries()) {
    const categoryName = (row.category ?? "").trim();
    const categoryId = categoryIdByName.get(categoryName);
    const questionNo = (row.question_no ?? row.id ?? "").trim();
    const questionText = (row.question_text ?? row.question ?? "").trim();

    if (!categoryId) {
      errors.push(`${i + 2}行目: カテゴリ「${categoryName}」が見つかりません。`);
      continue;
    }
    if (!questionNo || !questionText) {
      errors.push(`${i + 2}行目: question_no / question_text は必須です。`);
      continue;
    }

    rowsToInsert.push({
      category_id: categoryId,
      question_no: questionNo,
      question_text: questionText,
      answer: parseAnswer(row.answer ?? row["正解"] ?? ""),
      explanation: (row.explanation ?? row["解説"] ?? "").trim(),
      trap_note: (row.trap_note ?? row["ひっかけのポイント・補足"] ?? "").trim(),
    });
  }

  if (rowsToInsert.length > 0) {
    const { error, count } = await admin
      .from("questions")
      .upsert(rowsToInsert, { onConflict: "question_no", count: "exact" });
    if (error) {
      return { status: "error", message: `取り込みに失敗しました: ${error.message}` };
    }
    return {
      status: "success",
      message: `${count ?? rowsToInsert.length}問を取り込みました。(失敗 ${errors.length}件)`,
      detail: errors,
    };
  }

  return { status: "error", message: "取り込める行がありませんでした。", detail: errors };
}
