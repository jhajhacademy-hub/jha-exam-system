import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth";
import { ExamRunner, type ExamQuestion } from "@/components/exam/ExamRunner";

// 受験画面の入口。問題文は最初に全問まとめて取得し、以降の画面切り替えは端末内で行う
// (回答のたびにサーバーへ問題を取りに行かないため、切り替えが一瞬で済む)。
// URLの番号は入口としてのみ使い、実際の開始位置は「まだ回答していない最初の問題」から決める。
export default async function ExamQuestionPage({
  params,
}: {
  params: Promise<{ sessionId: string; index: string }>;
}) {
  const { sessionId, index: indexParam } = await params;
  const index = Number(indexParam);
  if (!Number.isInteger(index) || index < 1) notFound();

  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  // 受験セッションと回答済みの一覧は互いに依存しないので、同時に問い合わせて待ち時間を減らす。
  const [{ data: session }, { data: answers }] = await Promise.all([
    supabase
      .from("exam_sessions")
      .select("id, student_id, question_ids, started_at, status")
      .eq("id", sessionId)
      .single(),
    supabase.from("exam_answers").select("order_index").eq("session_id", sessionId),
  ]);

  if (!session || session.student_id !== userId) notFound();
  if (session.status === "completed") redirect(`/exam/${sessionId}/result`);

  const total = session.question_ids.length;
  if (total === 0) notFound();

  // 問題文は正解を含まない列だけを取得する(正解は端末に送らない)。
  const { data: rows } = await supabase
    .from("questions")
    .select("id, question_text")
    .in("id", session.question_ids);

  const textById = new Map((rows ?? []).map((r) => [r.id, r.question_text]));
  const questions: ExamQuestion[] = [];
  for (const id of session.question_ids) {
    const text = textById.get(id);
    if (text === undefined) notFound();
    questions.push({ id, text });
  }

  const answered = new Set((answers ?? []).map((a) => a.order_index));
  let initialIndex = 0;
  while (initialIndex < total && answered.has(initialIndex + 1)) initialIndex += 1;

  return (
    <ExamRunner
      sessionId={sessionId}
      startedAt={session.started_at}
      questions={questions}
      initialIndex={initialIndex}
    />
  );
}
