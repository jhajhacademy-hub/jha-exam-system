"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/auth";
import { pickBalancedQuestions, scoreExam, TOTAL_QUESTIONS } from "@/lib/exam-logic";
import { sendExamCompletionEmail, sendRetakeRequestEmail } from "@/lib/mailer";
import type { Database } from "@/types/database.types";

async function createNewExamSession(
  supabase: SupabaseClient<Database>,
  studentId: string
): Promise<string> {
  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, category_id")
    .is("deleted_at", null);
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
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();

  const { count: completedCount } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", userId)
    .eq("status", "completed");

  // 1回目は無条件。2回目以降は承認済みの再受験申請が必要。
  if ((completedCount ?? 0) > 0) {
    const { data: approvedRequest } = await supabase
      .from("retake_requests")
      .select("id")
      .eq("student_id", userId)
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

  const sessionId = await createNewExamSession(supabase, userId);

  redirect(`/exam/${sessionId}/q/1`);
}

export async function requestRetakeAction() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("retake_requests")
    .select("id, status")
    .eq("student_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    redirect("/mypage");
  }

  const requestedAt = new Date();
  const { error } = await supabase.from("retake_requests").insert({
    student_id: userId,
    status: "pending",
    requested_at: requestedAt.toISOString(),
  });
  if (error) throw error;

  const [{ data: studentProfile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("name, age, student_code, email").eq("id", userId).single(),
    supabase.from("site_settings").select("retake_notification_emails").eq("id", 1).single(),
  ]);

  if (studentProfile && settings?.retake_notification_emails?.length) {
    await sendRetakeRequestEmail(settings.retake_notification_emails, {
      name: studentProfile.name,
      age: studentProfile.age,
      studentCode: studentProfile.student_code,
      email: studentProfile.email,
      requestedAt,
    });
  }

  redirect("/mypage");
}

export async function discardAndRestartExamAction(formData: FormData) {
  const staleSessionId = String(formData.get("sessionId") ?? "");

  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();

  if (staleSessionId) {
    const admin = createAdminClient();
    await admin
      .from("exam_sessions")
      .delete()
      .eq("id", staleSessionId)
      .eq("student_id", userId)
      .eq("status", "in_progress");
  }

  const sessionId = await createNewExamSession(supabase, userId);

  redirect(`/exam/${sessionId}/q/1`);
}

export type ExamActionResult =
  | { ok: true }
  | { ok: false; retryable: boolean; message: string };

const SESSION_GONE_MESSAGE =
  "受験情報が見つかりませんでした。お手数ですが、マイページから受験をやり直してください。";
const LOGIN_EXPIRED_MESSAGE =
  "ログインの有効期限が切れました。再度ログインし、マイページから受験を再開してください(回答済みの分は保存されています)。";

/**
 * 1問分の回答を保存する(画面は先に次の問題へ進み、この処理は裏で順番に呼ばれる)。
 * 正解の判定はここ(サーバー)だけで行う。
 */
export async function saveAnswerAction(input: {
  sessionId: string;
  index: number;
  questionId: string;
  answer: boolean;
}): Promise<ExamActionResult> {
  try {
    const { sessionId, index, questionId, answer } = input;
    if (!Number.isInteger(index) || index < 1) {
      return { ok: false, retryable: false, message: SESSION_GONE_MESSAGE };
    }

    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, retryable: false, message: LOGIN_EXPIRED_MESSAGE };
    const supabase = await createClient();

    // 受験セッションと問題は互いに依存しないので同時に取得する。
    const [sessionRes, questionRes] = await Promise.all([
      supabase
        .from("exam_sessions")
        .select("id, student_id, question_ids, status")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase.from("questions").select("id, category_id, answer").eq("id", questionId).maybeSingle(),
    ]);

    // 通信やDBの一時的な不調は、呼び出し側が自動で再送する。
    if (sessionRes.error || questionRes.error) {
      return { ok: false, retryable: true, message: "一時的に保存できませんでした。" };
    }

    const session = sessionRes.data;
    const question = questionRes.data;
    if (!session || session.student_id !== userId || !question) {
      return { ok: false, retryable: false, message: SESSION_GONE_MESSAGE };
    }
    // すでに採点済み(別の画面で終了した等)なら、保存は不要。
    if (session.status === "completed") return { ok: true };

    // 画面から送られた問題IDが、この受験セッションのこの番号の問題と一致することを確認する。
    if (session.question_ids[index - 1] !== questionId) {
      return { ok: false, retryable: false, message: SESSION_GONE_MESSAGE };
    }

    const total = session.question_ids.length;
    const isLast = index >= total;

    // 回答の保存と「どこまで進んだか」の更新は互いに依存しないので同時に行う。
    const [{ error: insertError }] = await Promise.all([
      supabase.from("exam_answers").insert({
        session_id: sessionId,
        question_id: questionId,
        category_id: question.category_id,
        order_index: index,
        user_answer: answer,
        is_correct: question.answer === answer,
      }),
      isLast
        ? null
        : supabase.from("exam_sessions").update({ current_index: index }).eq("id", sessionId),
    ]);

    // 23505 = unique_violation(再送などによる重複は、保存済みとして扱う)
    if (insertError && insertError.code !== "23505") {
      return { ok: false, retryable: true, message: "一時的に保存できませんでした。" };
    }

    return { ok: true };
  } catch {
    return { ok: false, retryable: true, message: "一時的に保存できませんでした。" };
  }
}

/**
 * 全問の回答が保存されたあとに呼ぶ。採点して結果を確定し、通知メールを送る。
 * 何度呼ばれても結果とメールは1回だけ(すでに確定済みなら何もしない)。
 */
export async function finishExamAction(sessionId: string): Promise<ExamActionResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, retryable: false, message: LOGIN_EXPIRED_MESSAGE };
    const supabase = await createClient();

    const [sessionRes, answersRes] = await Promise.all([
      supabase
        .from("exam_sessions")
        .select("id, student_id, question_ids, status, started_at")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase.from("exam_answers").select("is_correct").eq("session_id", sessionId),
    ]);

    if (sessionRes.error || answersRes.error) {
      return { ok: false, retryable: true, message: "一時的に採点できませんでした。" };
    }

    const session = sessionRes.data;
    if (!session || session.student_id !== userId) {
      return { ok: false, retryable: false, message: SESSION_GONE_MESSAGE };
    }
    if (session.status === "completed") return { ok: true };

    const total = session.question_ids.length;
    const answers = answersRes.data ?? [];
    if (answers.length < total) {
      return {
        ok: false,
        retryable: false,
        message:
          "保存できていない回答があります。ページを再読み込みして、続きから回答してください。",
      };
    }

    const correctCount = answers.filter((a) => a.is_correct).length;
    const { score, passed } = scoreExam(correctCount);
    const finishedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((finishedAt.getTime() - new Date(session.started_at).getTime()) / 1000)
    );

    // まだ「受験中」のものだけを確定する。同時に2回呼ばれても、確定できるのは片方だけ。
    const { data: updated, error: updateError } = await supabase
      .from("exam_sessions")
      .update({
        status: "completed",
        finished_at: finishedAt.toISOString(),
        duration_seconds: durationSeconds,
        total_score: score,
        passed,
        current_index: total,
      })
      .eq("id", sessionId)
      .eq("status", "in_progress")
      .select("id");
    if (updateError) {
      return { ok: false, retryable: true, message: "一時的に採点できませんでした。" };
    }

    // 確定したのが自分のときだけ、通知メールを送る。
    if (updated && updated.length > 0) {
      const [{ data: studentProfile }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("name, age, student_code, email").eq("id", userId).single(),
        supabase.from("site_settings").select("notification_emails").eq("id", 1).single(),
      ]);

      if (studentProfile && settings?.notification_emails?.length) {
        await sendExamCompletionEmail(settings.notification_emails, {
          name: studentProfile.name,
          age: studentProfile.age,
          studentCode: studentProfile.student_code,
          email: studentProfile.email,
          finishedAt,
          score,
          passed,
        });
      }
    }

    return { ok: true };
  } catch {
    return { ok: false, retryable: true, message: "一時的に採点できませんでした。" };
  }
}
