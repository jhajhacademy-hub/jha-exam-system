import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaffProfile } from "@/lib/auth";
import { CategoryRadarChart } from "@/components/charts/CategoryRadarChart";

type SortKey = "accuracy" | "attempts" | "question_no";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; dir?: string }>;
}) {
  await requireStaffProfile();
  const params = await searchParams;
  const categoryFilter = params.category ?? "all";
  const sort = (params.sort as SortKey) || "accuracy";
  const dir = params.dir === "desc" ? "desc" : "asc";

  const supabase = await createClient();

  const [{ data: answers }, { data: questions }, { data: categories }] = await Promise.all([
    supabase.from("exam_answers").select("question_id, category_id, is_correct"),
    supabase.from("questions").select("id, question_no, question_text, category_id, deleted_at"),
    supabase.from("categories").select("id, name, sort_order").order("sort_order"),
  ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const questionStats = new Map<string, { total: number; correct: number }>();
  const categoryStats = new Map<string, { total: number; correct: number }>();

  for (const a of answers ?? []) {
    const qStat = questionStats.get(a.question_id) ?? { total: 0, correct: 0 };
    qStat.total += 1;
    if (a.is_correct) qStat.correct += 1;
    questionStats.set(a.question_id, qStat);

    const cStat = categoryStats.get(a.category_id) ?? { total: 0, correct: 0 };
    cStat.total += 1;
    if (a.is_correct) cStat.correct += 1;
    categoryStats.set(a.category_id, cStat);
  }

  const radarData = (categories ?? []).map((c) => {
    const stat = categoryStats.get(c.id) ?? { total: 0, correct: 0 };
    return {
      category: c.name,
      accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    };
  });

  type Row = {
    id: string;
    question_no: string;
    question_text: string;
    category_id: string;
    categoryName: string;
    total: number;
    correct: number;
    accuracy: number;
    deleted: boolean;
  };

  let rows: Row[] = (questions ?? []).map((q) => {
    const stat = questionStats.get(q.id) ?? { total: 0, correct: 0 };
    return {
      id: q.id,
      question_no: q.question_no,
      question_text: q.question_text,
      category_id: q.category_id,
      categoryName: categoryNameById.get(q.category_id) ?? "-",
      total: stat.total,
      correct: stat.correct,
      accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : -1,
      deleted: q.deleted_at != null,
    };
  });

  const activeQuestionCount = (questions ?? []).filter((q) => !q.deleted_at).length;

  if (categoryFilter !== "all") {
    rows = rows.filter((r) => r.category_id === categoryFilter);
  }

  rows.sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sort) {
      case "attempts":
        av = a.total;
        bv = b.total;
        break;
      case "question_no":
        av = a.question_no;
        bv = b.question_no;
        break;
      default:
        av = a.accuracy;
        bv = b.accuracy;
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  function sortHref(key: SortKey) {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    const sp = new URLSearchParams({ sort: key, dir: nextDir, category: categoryFilter });
    return `/admin/analytics?${sp.toString()}`;
  }

  const totalAnswers = (answers ?? []).length;
  const totalCorrect = (answers ?? []).filter((a) => a.is_correct).length;
  const overallAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">正答率分析</h1>

      <div className="mb-16 grid grid-cols-3 divide-x divide-line border-y border-line">
        <div className="px-6 py-6 text-center">
          <p className="font-num text-3xl text-ink">{totalAnswers}</p>
          <p className="mt-2 text-xs tracking-wide text-ink-soft">総回答数(全受験者)</p>
        </div>
        <div className="px-6 py-6 text-center">
          <p className="font-num text-3xl text-khaki">{overallAccuracy}%</p>
          <p className="mt-2 text-xs tracking-wide text-ink-soft">全体正答率</p>
        </div>
        <div className="px-6 py-6 text-center">
          <p className="font-num text-3xl text-ink">{activeQuestionCount}</p>
          <p className="mt-2 text-xs tracking-wide text-ink-soft">登録問題数</p>
        </div>
      </div>

      <h2 className="mb-4 text-sm tracking-wide text-ink-soft">カテゴリ別正答率</h2>
      <div className="mb-16 border border-line px-4 py-4">
        <CategoryRadarChart data={radarData} />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-sm tracking-wide text-ink-soft">問題別正答率(正答率が低い順)</h2>
        <form method="get" className="flex items-end gap-4">
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <label className="flex flex-col gap-2">
            <span className="text-xs text-ink-soft">カテゴリ</span>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="h-10 w-56 border border-line px-3 text-sm outline-none focus:border-khaki"
            >
              <option value="all">すべて</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 border border-ink px-6 text-sm hover:border-khaki hover:text-khaki"
          >
            絞り込む
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft">
              <th className="w-24 py-3 text-left font-normal">
                <Link href={sortHref("question_no")}>
                  問題ID{sort === "question_no" ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </Link>
              </th>
              <th className="w-40 py-3 text-left font-normal">カテゴリ</th>
              <th className="py-3 text-left font-normal">問題文</th>
              <th className="w-24 py-3 text-right font-normal">
                <Link href={sortHref("attempts")}>
                  出題回数{sort === "attempts" ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </Link>
              </th>
              <th className="w-24 py-3 text-right font-normal">
                <Link href={sortHref("accuracy")}>
                  正答率{sort === "accuracy" ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="py-3 font-num text-ink-soft">{r.question_no}</td>
                <td className="py-3 text-xs text-ink-soft">{r.categoryName}</td>
                <td className="py-3">
                  {r.question_text.slice(0, 50)}
                  {r.deleted && (
                    <span className="ml-2 text-xs text-ink-soft">(削除済み)</span>
                  )}
                </td>
                <td className="py-3 text-right font-num">{r.total}</td>
                <td
                  className={`py-3 text-right font-num ${
                    r.total === 0
                      ? "text-ink-soft"
                      : r.accuracy < 60
                        ? "text-alert"
                        : "text-khaki"
                  }`}
                >
                  {r.total === 0 ? "未出題" : `${r.accuracy}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="py-16 text-center text-sm text-ink-soft">データがありません。</p>
      )}
    </div>
  );
}
