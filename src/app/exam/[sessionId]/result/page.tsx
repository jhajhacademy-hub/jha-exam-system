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

      <LinkButton href="/mypage" size="lg">
        マイページへ戻る
      </LinkButton>
    </div>
  );
}
