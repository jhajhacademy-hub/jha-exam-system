import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Timer } from "@/components/exam/Timer";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { OxSubmitButton } from "@/components/exam/OxSubmitButton";
import { submitAnswerAction, advanceExamAction } from "@/app/exam/actions";

export default async function ExamQuestionPage({
  params,
}: {
  params: Promise<{ sessionId: string; index: string }>;
}) {
  const { sessionId, index: indexParam } = await params;
  const index = Number(indexParam);

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, student_id, question_ids, started_at, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== profile.id) notFound();
  if (session.status === "completed") redirect(`/exam/${sessionId}/result`);

  const total = session.question_ids.length;
  if (!Number.isInteger(index) || index < 1 || index > total) notFound();

  const questionId = session.question_ids[index - 1];

  const { data: existingAnswer } = await supabase
    .from("exam_answers")
    .select("user_answer, is_correct")
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existingAnswer) {
    const { data: question } = await supabase
      .from("questions")
      .select("question_text, answer, explanation, trap_note")
      .eq("id", questionId)
      .single();

    if (!question) notFound();

    return (
      <ExamShell sessionId={sessionId} index={index} total={total} startedAt={session.started_at}>
        <ResultView
          sessionId={sessionId}
          index={index}
          total={total}
          questionText={question.question_text}
          correctAnswer={question.answer}
          isCorrect={existingAnswer.is_correct}
          explanation={question.explanation}
          trapNote={question.trap_note}
        />
      </ExamShell>
    );
  }

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

function ResultView({
  sessionId,
  index,
  total,
  questionText,
  correctAnswer,
  isCorrect,
  explanation,
  trapNote,
}: {
  sessionId: string;
  index: number;
  total: number;
  questionText: string;
  correctAnswer: boolean;
  isCorrect: boolean;
  explanation: string;
  trapNote: string;
}) {
  const isLast = index >= total;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-10 text-center">
        <span
          className={`inline-flex h-20 w-20 items-center justify-center border text-3xl font-light ${
            isCorrect ? "border-khaki text-khaki" : "border-alert text-alert"
          }`}
        >
          {correctAnswer ? "◯" : "×"}
        </span>
        <p className={`mt-4 text-sm tracking-widest ${isCorrect ? "text-khaki" : "text-alert"}`}>
          {isCorrect ? "正解" : "不正解"}
        </p>
      </div>

      <p className="mb-10 text-center leading-loose tracking-wide text-ink-soft">{questionText}</p>

      <div className="mb-6 border-t border-line pt-6">
        <p className="mb-2 text-xs tracking-wide text-khaki">解説</p>
        <p className="leading-8">{explanation}</p>
      </div>

      {trapNote && (
        <div className="mb-10 border-t border-line pt-6">
          <p className="mb-2 text-xs tracking-wide text-ink-soft">ひっかけのポイント・補足</p>
          <p className="leading-8 text-ink-soft">{trapNote}</p>
        </div>
      )}

      <form
        action={advanceExamAction}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper p-4 sm:static sm:z-auto sm:mt-auto sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:pt-6"
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="index" value={index} />
        <SubmitButton size="lg" className="w-full sm:w-auto">
          {isLast ? "結果を見る" : "次の問題へ"}
        </SubmitButton>
      </form>
    </div>
  );
}
