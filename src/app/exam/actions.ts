"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickBalancedQuestions, scoreExam, TOTAL_QUESTIONS } from "@/lib/exam-logic";
import type { Database } from "@/types/database.types";

async function createNewExamSession(
  supabase: SupabaseClient<Database>,
  studentId: string
): Promise<string> {
  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, category_id");
  if (qError) throw qError;
  if (!questions || questions.length === 0) {
    throw new Error("出題可能な問題が登録されていません。管理者にお問い合わせください。");
  }

  const byCategory = new Map<string, { id: string }[]>();
  for (const q of questions) {
    const list = byCategory.get(q.category_id) ?? [];
    list.push({ id: q.id });
    byCategory.set(q.category_id, list);
  }

  const total = Math.min(TOTAL_QUESTIONS, questions.length);
  const picked = pickBalancedQuestions(byCategory, total);
  const questionIds = picked.map((q) => q.id);

  const { data: session, error } = await supabase
    .from("exam_sessions")
    .insert({
      student_id: studentId,
      question_ids: questionIds,
      current_index: 0,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) throw error;

  return session.id;
}

export async function startExamAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: completedCount } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("status", "completed");

  // 1回目は無条件。2回目以降は承認済みの再受験申請が必要。
  if ((completedCount ?? 0) > 0) {
    const { data: approvedRequest } = await supabase
      .from("retake_requests")
      .select("id")
      .eq("student_id", user.id)
      .eq("status", "approved")
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!approvedRequest) {
      redirect("/mypage");
    }

    const admin = createAdminClient();
    await admin
      .from("retake_requests")
      .update({ status: "used", resolved_at: new Date().toISOString() })
      .eq("id", approvedRequest.id);
  }

  const sessionId = await createNewExamSession(supabase, user.id);

  redirect(`/exam/${sessionId}/q/1`);
}

export async function requestRetakeAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("retake_requests")
    .select("id, status")
    .eq("student_id", user.id)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    redirect("/mypage");
  }

  const { error } = await supabase.from("retake_requests").insert({
    student_id: user.id,
    status: "pending",
  });
  if (error) throw error;

  redirect("/mypage");
}

export async function discardAndRestartExamAction(formData: FormData) {
  const staleSessionId = String(formData.get("sessionId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (staleSessionId) {
    const admin = createAdminClient();
    await admin
      .from("exam_sessions")
      .delete()
      .eq("id", staleSessionId)
      .eq("student_id", user.id)
      .eq("status", "in_progress");
  }

  const sessionId = await createNewExamSession(supabase, user.id);

  redirect(`/exam/${sessionId}/q/1`);
}

export async function submitAnswerAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId"));
  const index = Number(formData.get("index"));
  const userAnswer = formData.get("answer") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session, error: sessionError } = await supabase
    .from("exam_sessions")
    .select("id, student_id, question_ids, status")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session || session.student_id !== user.id) {
    redirect("/mypage");
  }

  const questionId = session.question_ids[index - 1];
  if (!questionId) redirect(`/exam/${sessionId}/q/1`);

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, category_id, answer")
    .eq("id", questionId)
    .single();
  if (questionError || !question) throw questionError;

  const isCorrect = question.answer === userAnswer;

  const { error: insertError } = await supabase.from("exam_answers").insert({
    session_id: sessionId,
    question_id: questionId,
    category_id: question.category_id,
    order_index: index,
    user_answer: userAnswer,
    is_correct: isCorrect,
  });
  if (insertError && insertError.code !== "23505") {
    // 23505 = unique_violation (二重送信などによる重複回答は無視して再表示する)
    throw insertError;
  }

  redirect(`/exam/${sessionId}/q/${index}`);
}

export async function advanceExamAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId"));
  const index = Number(formData.get("index"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, student_id, question_ids, started_at")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) redirect("/mypage");

  const total = session.question_ids.length;

  if (index >= total) {
    const { data: answers, error: answersError } = await supabase
      .from("exam_answers")
      .select("is_correct")
      .eq("session_id", sessionId);
    if (answersError) throw answersError;

    const correctCount = (answers ?? []).filter((a) => a.is_correct).length;
    const { score, passed } = scoreExam(correctCount);
    const finishedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((finishedAt.getTime() - new Date(session.started_at).getTime()) / 1000)
    );

    const { error: updateError } = await supabase
      .from("exam_sessions")
      .update({
        status: "completed",
        finished_at: finishedAt.toISOString(),
        duration_seconds: durationSeconds,
        total_score: score,
        passed,
        current_index: total,
      })
      .eq("id", sessionId);
    if (updateError) throw updateError;

    redirect(`/exam/${sessionId}/result`);
  }

  await supabase
    .from("exam_sessions")
    .update({ current_index: index })
    .eq("id", sessionId);

  redirect(`/exam/${sessionId}/q/${index + 1}`);
}
