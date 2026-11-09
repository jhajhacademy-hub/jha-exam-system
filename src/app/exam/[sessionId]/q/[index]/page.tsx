import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Timer } from "@/components/exam/Timer";
import { OxSubmitButton } from "@/components/exam/OxSubmitButton";
import { submitAnswerAction } from "@/app/exam/actions";

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
  // 受験セッションと「この番号に回答済みか」は互いに依存しないので、同時に問い合わせて待ち時間を減らす。
  const [{ data: session }, { data: existingAnswer }] = await Promise.all([
    supabase
      .from("exam_sessions")
      .select("id, student_id, question_ids, started_at, status")
      .eq("id", sessionId)
      .single(),
    supabase
      .from("exam_answers")
      .select("id")
      .eq("session_id", sessionId)
      .eq("order_index", index)
      .maybeSingle(),
  ]);

  if (!session || session.student_id !== userId) notFound();
  if (session.status === "completed") redirect(`/exam/${sessionId}/result`);

  const total = session.question_ids.length;
  if (index > total) notFound();

  if (existingAnswer) {
    redirect(index >= total ? `/exam/${sessionId}/result` : `/exam/${sessionId}/q/${index + 1}`);
  }

  const questionId = session.question_ids[index - 1];

  const { data: question } = await supabase
    .from("questions")
    .select("question_text")
    .eq("id", questionId)
    .single();

  if (!question) notFound();

  return (
    <ExamShell sessionId={sessionId} index={index} total={total} startedAt={session.started_at}>
      <QuestionView sessionId={sessionId} index={index} questionText={question.question_text} />
    </ExamShell>
  );
}

function ExamShell({
  sessionId,
  index,
  total,
  startedAt,
  children,
}: {
  sessionId: string;
  index: number;
  total: number;
  startedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-8 pb-28 pt-12 sm:pb-12">
      <div className="mb-16 flex items-center justify-between gap-8">
        <div className="flex-1">
          <ProgressBar current={index} total={total} />
        </div>
        <Timer startedAt={startedAt} />
      </div>
      {children}
      <p className="mt-auto pt-16 text-center font-num text-[10px] text-line">
        SESSION {sessionId.slice(0, 8)}
      </p>
    </div>
  );
}

function QuestionView({
  sessionId,
  index,
  questionText,
}: {
  sessionId: string;
  index: number;
  questionText: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <p className="mb-16 text-center text-lg leading-loose tracking-wide">{questionText}</p>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-paper sm:static sm:z-auto sm:gap-6 sm:border-0 sm:bg-transparent">
        <form action={submitAnswerAction} className="contents">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="index" value={index} />
          <input type="hidden" name="answer" value="false" />
          <OxSubmitButton symbol="×" />
        </form>

        <form action={submitAnswerAction} className="contents">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="index" value={index} />
          <input type="hidden" name="answer" value="true" />
          <OxSubmitButton symbol="◯" />
        </form>
      </div>
    </div>
  );
}
