import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, POINTS_PER_QUESTION } from "@/lib/exam-logic";
import { CategoryRadarChart } from "@/components/charts/CategoryRadarChart";

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("exam_sessions")
    .select(
      "id, started_at, total_score, passed, duration_seconds, question_ids, profiles(name, age, student_code, email)"
    )
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  const profile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles;

  const { data: answers } = await supabase
    .from("exam_answers")
    .select(
      "order_index, user_answer, is_correct, questions(question_text, answer), categories(name)"
    )
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  const rows = (answers ?? []).map((a) => {
    const question = Array.isArray(a.questions) ? a.questions[0] : a.questions;
    const category = Array.isArray(a.categories) ? a.categories[0] : a.categories;
    return {
      order_index: a.order_index,
      user_answer: a.user_answer,
      is_correct: a.is_correct,
      question_text: question?.question_text ?? "",
      correct_answer: question?.answer ?? false,
      category_name: category?.name ?? "-",
    };
  });

  const byCategory = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    const entry = byCategory.get(r.category_name) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (r.is_correct) entry.correct += 1;
    byCategory.set(r.category_name, entry);
  }
  const radarData = Array.from(byCategory.entries()).map(([category, v]) => ({
    category,
    accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  const fullScore = session.question_ids.length * POINTS_PER_QUESTION;

  return (
    <div>
      <p className="mb-2 text-xs tracking-wide text-ink-soft">受験者詳細</p>
      <h1 className="mb-10 text-lg tracking-wide">
        {profile?.name}
        <span className="ml-3 font-num text-sm text-ink-soft">{profile?.student_code}</span>
      </h1>

      <div className="mb-12 grid grid-cols-4 divide-x divide-line border-y border-line">
        <div className="px-4 py-6 text-center">
          <p className="font-num text-2xl">{profile?.age ?? "-"}</p>
          <p className="mt-2 text-xs text-ink-soft">年齢</p>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="font-num text-2xl">
            {session.total_score}
            <span className="text-sm text-ink-soft">/{fullScore}</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">点数</p>
        </div>
        <div className="px-4 py-6 text-center">
          <p className={`font-num text-2xl ${session.passed ? "text-khaki" : "text-alert"}`}>
            {session.passed ? "合格" : "不合格"}
          </p>
          <p className="mt-2 text-xs text-ink-soft">判定</p>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="font-num text-2xl">
            {session.duration_seconds != null ? formatDuration(session.duration_seconds) : "-"}
          </p>
          <p className="mt-2 text-xs text-ink-soft">タイム</p>
        </div>
      </div>

      <h2 className="mb-4 text-sm tracking-wide text-ink-soft">カテゴリ別正答率</h2>
      <div className="mb-16 border border-line px-4 py-4">
        <CategoryRadarChart data={radarData} />
      </div>

      <h2 className="mb-4 text-sm tracking-wide text-ink-soft">回答ログ（全{rows.length}問）</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-soft">
            <th className="w-12 py-3 text-left font-normal">No.</th>
            <th className="w-32 py-3 text-left font-normal">カテゴリ</th>
            <th className="py-3 text-left font-normal">問題文</th>
            <th className="w-16 py-3 text-center font-normal">回答</th>
            <th className="w-16 py-3 text-center font-normal">正解</th>
            <th className="w-16 py-3 text-center font-normal">判定</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.order_index} className="border-b border-line">
              <td className="py-3 font-num text-ink-soft">{r.order_index}</td>
              <td className="py-3 text-xs text-ink-soft">{r.category_name}</td>
              <td className="py-3">{r.question_text}</td>
              <td className="py-3 text-center">{r.user_answer ? "◯" : "×"}</td>
              <td className="py-3 text-center">{r.correct_answer ? "◯" : "×"}</td>
              <td className={`py-3 text-center ${r.is_correct ? "text-khaki" : "text-alert"}`}>
                {r.is_correct ? "正解" : "不正解"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
