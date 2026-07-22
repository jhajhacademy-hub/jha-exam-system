import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";
import { formatDuration, POINTS_PER_QUESTION, PASS_SCORE } from "@/lib/exam-logic";
import { PassEffect } from "@/components/exam/PassEffect";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, student_id, status, total_score, passed, duration_seconds, question_ids")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== profile.id) notFound();
  if (session.status !== "completed") redirect(`/exam/${sessionId}/q/1`);

  const fullScore = session.question_ids.length * POINTS_PER_QUESTION;

  const { data: rawAnswers } = await supabase
    .from("exam_answers")
    .select("order_index, user_answer, is_correct, questions(question_text, explanation, answer)")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  const answers = (rawAnswers ?? []).map((a) => {
    const question = Array.isArray(a.questions) ? a.questions[0] : a.questions;
    return {
      orderIndex: a.order_index,
      userAnswer: a.user_answer,
      isCorrect: a.is_correct,
      questionText: question?.question_text ?? "",
      explanation: question?.explanation ?? "",
      correctAnswer: question?.answer ?? false,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      {session.passed && <PassEffect />}

      <p className="mb-3 text-xs tracking-[0.3em] text-ink-soft">RESULT</p>
      <h1
        className={`mb-10 text-4xl tracking-widest ${
          session.passed ? "text-khaki" : "text-alert"
        }`}
      >
        {session.passed ? "合格" : "不合格"}
      </h1>

      <div className="mb-12 grid w-full grid-cols-2 divide-x divide-line border-y border-line">
        <div className="px-6 py-8">
          <p className="font-num text-4xl">
            {session.total_score}
            <span className="ml-1 text-base text-ink-soft">/ {fullScore}</span>
          </p>
          <p className="mt-2 text-xs tracking-wide text-ink-soft">総合点数</p>
        </div>
        <div className="px-6 py-8">
          <p className="font-num text-4xl">
            {session.duration_seconds != null ? formatDuration(session.duration_seconds) : "-"}
          </p>
          <p className="mt-2 text-xs tracking-wide text-ink-soft">かかったタイム</p>
        </div>
      </div>

      <p className="mb-12 text-sm text-ink-soft">
        全{session.question_ids.length}問中 合格基準 {PASS_SCORE}点以上
        {session.passed ? "を上回りました。" : "に届きませんでした。"}
      </p>

      <LinkButton href="/mypage" size="lg" className="mb-12">
        マイページへ戻る
      </LinkButton>

      <details className="group w-full text-left">
        <summary className="inline-flex h-11 w-full cursor-pointer list-none items-center justify-center border border-khaki px-6 text-sm tracking-wide text-ink transition-colors duration-150 hover:bg-khaki hover:text-paper [&::-webkit-details-marker]:hidden">
          詳細
        </summary>

        <div className="mt-10 text-left">
          {answers.map((a) => (
            <div key={a.orderIndex} className="border-t border-line py-8 first:border-t-0">
              <div className="mb-4 flex items-center gap-4 text-xs tracking-wide text-ink-soft">
                <span className="font-num">問{a.orderIndex}</span>
                <span>
                  正答
                  <span className="ml-1 font-num text-info">{a.correctAnswer ? "◯" : "×"}</span>
                </span>
                <span className={a.isCorrect ? "text-info" : "text-alert"}>
                  あなたの回答
                  <span className="ml-1 font-num">{a.userAnswer ? "◯" : "×"}</span>
                </span>
              </div>
              <p className="mb-4 leading-loose tracking-wide">{a.questionText}</p>
              <div>
                <p className="mb-2 text-xs tracking-wide text-khaki">解説</p>
                <p className="leading-8 text-ink-soft">{a.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
