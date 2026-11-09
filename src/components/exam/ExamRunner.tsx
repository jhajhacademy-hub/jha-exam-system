"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Timer } from "@/components/exam/Timer";
import { OxButton } from "@/components/exam/OxButton";
import { finishExamAction, saveAnswerAction } from "@/app/exam/actions";

export interface ExamQuestion {
  id: string;
  text: string;
}

interface ExamRunnerProps {
  sessionId: string;
  startedAt: string;
  questions: ExamQuestion[];
  /** すでに回答済みの問題数(0始まりの「次に出す問題の位置」)。 */
  initialIndex: number;
}

// 連打で2問分を押してしまわないよう、押した直後はこの時間だけ次の入力を無視する。
const TAP_GUARD_MS = 400;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 受験画面。問題文は最初にまとめて受け取り済みなので、◯×を押したら待たずに次の問題へ進む。
 * 回答の保存は裏で順番に行い、通信が切れた場合は回答を保持したまま自動で再送する。
 * 正解の判定・採点は従来どおりサーバー側のみで行う(正解はこの画面に送られない)。
 */
export function ExamRunner({ sessionId, startedAt, questions, initialIndex }: ExamRunnerProps) {
  const router = useRouter();
  const total = questions.length;

  const [current, setCurrent] = useState(Math.min(initialIndex, total - 1));
  const [finishing, setFinishing] = useState(initialIndex >= total);
  const [retrying, setRetrying] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  // 保存の順番待ちの列。前の保存が終わってから次を送ることで、回答の順序を守る。
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const pendingRef = useRef(0);
  const lastTapRef = useRef(0);
  const finishStartedRef = useRef(false);

  async function saveUntilDone(input: {
    index: number;
    questionId: string;
    answer: boolean;
  }): Promise<boolean> {
    let attempt = 0;
    for (;;) {
      try {
        const res = await saveAnswerAction({ sessionId, ...input });
        if (res.ok) {
          setRetrying(false);
          return true;
        }
        if (!res.retryable) {
          setFatal(res.message);
          return false;
        }
      } catch {
        // 通信が切れた場合など。回答はこの画面に保持したまま、少し待って再送する。
      }
      setRetrying(true);
      attempt += 1;
      await sleep(Math.min(1000 * attempt, 5000));
    }
  }

  async function finishUntilDone(): Promise<boolean> {
    let attempt = 0;
    for (;;) {
      try {
        const res = await finishExamAction(sessionId);
        if (res.ok) {
          setRetrying(false);
          router.replace(`/exam/${sessionId}/result`);
          return true;
        }
        if (!res.retryable) {
          setFatal(res.message);
          return false;
        }
      } catch {
        // 通信が切れた場合など。少し待って再試行する。
      }
      setRetrying(true);
      attempt += 1;
      await sleep(Math.min(1000 * attempt, 5000));
    }
  }

  function enqueue(task: () => Promise<boolean>) {
    pendingRef.current += 1;
    queueRef.current = queueRef.current.then(async (okSoFar) => {
      try {
        // 前の保存が回復不能で止まっている場合は、後続も送らない。
        return okSoFar ? await task() : false;
      } finally {
        pendingRef.current -= 1;
      }
    });
  }

  function startFinish() {
    if (finishStartedRef.current) return;
    finishStartedRef.current = true;
    enqueue(finishUntilDone);
  }

  function answer(value: boolean) {
    const now = Date.now();
    if (finishing || fatal || now - lastTapRef.current < TAP_GUARD_MS) return;
    lastTapRef.current = now;

    const position = current;
    const question = questions[position];
    enqueue(() =>
      saveUntilDone({ index: position + 1, questionId: question.id, answer: value })
    );

    if (position + 1 >= total) {
      setFinishing(true);
      startFinish();
    } else {
      setCurrent(position + 1);
    }
  }

  // 全問回答済みなのに採点が終わっていない状態で開いた場合は、そのまま採点を進める。
  useEffect(() => {
    if (initialIndex >= total) startFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存が終わる前にページを閉じようとしたら確認を出す。
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingRef.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const question = questions[current];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-8 pb-28 pt-12 sm:pb-12">
      <div className="mb-16 flex items-center justify-between gap-8">
        <div className="flex-1">
          <ProgressBar current={Math.min(current + 1, total)} total={total} />
        </div>
        <Timer startedAt={startedAt} />
      </div>

      {fatal ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="text-sm leading-loose text-alert">{fatal}</p>
          <Link href="/mypage" className="text-sm text-ink-soft underline hover:text-khaki">
            マイページへ戻る
          </Link>
        </div>
      ) : finishing ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm tracking-wide text-ink-soft">採点しています…</p>
          {retrying && (
            <p className="text-xs leading-loose text-alert">
              通信が不安定です。回答は保持しています。自動で再送していますので、このままお待ちください。
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          {retrying && (
            <p className="mb-8 text-center text-xs leading-loose text-alert">
              通信が不安定です。回答は保持しています。自動で再送していますので、このまま続けて回答できます。
            </p>
          )}
          <p className="mb-16 text-center text-lg leading-loose tracking-wide">{question.text}</p>

          <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-paper sm:static sm:z-auto sm:gap-6 sm:border-0 sm:bg-transparent">
            <OxButton symbol="×" onClick={() => answer(false)} />
            <OxButton symbol="◯" onClick={() => answer(true)} />
          </div>
        </div>
      )}

      <p className="mt-auto pt-16 text-center font-num text-[10px] text-line">
        SESSION {sessionId.slice(0, 8)}
      </p>
    </div>
  );
}
