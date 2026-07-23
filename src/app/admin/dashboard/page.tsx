import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/exam-logic";

type SortKey = "started_at" | "name" | "age" | "total_score" | "duration_seconds" | "passed";

const AGE_BANDS: { key: string; label: string; test: (age: number | null) => boolean }[] = [
  { key: "all", label: "すべて", test: () => true },
  { key: "u30", label: "〜29歳", test: (a) => a != null && a < 30 },
  { key: "30s", label: "30〜39歳", test: (a) => a != null && a >= 30 && a < 40 },
  { key: "40s", label: "40〜49歳", test: (a) => a != null && a >= 40 && a < 50 },
  { key: "50p", label: "50歳〜", test: (a) => a != null && a >= 50 },
];

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "started_at", label: "受験日" },
  { key: "name", label: "名前" },
  { key: "age", label: "年齢" },
  { key: "total_score", label: "点数" },
  { key: "duration_seconds", label: "タイム" },
  { key: "passed", label: "合否" },
];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    dir?: string;
    passed?: string;
    age?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const sort = (params.sort as SortKey) || "started_at";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const passedFilter = params.passed ?? "all";
  const ageBandKey = params.age ?? "all";
  const q = (params.q ?? "").trim();

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("id, started_at, total_score, passed, duration_seconds, profiles(name, age, student_code)")
    .eq("status", "completed");

  type Row = {
    id: string;
    started_at: string;
    total_score: number | null;
    passed: boolean | null;
    duration_seconds: number | null;
    name: string;
    age: number | null;
    student_code: string | null;
  };

  const ageBand = AGE_BANDS.find((b) => b.key === ageBandKey) ?? AGE_BANDS[0];

  let rows: Row[] = (sessions ?? []).map((s) => {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return {
      id: s.id,
      started_at: s.started_at,
      total_score: s.total_score,
      passed: s.passed,
      duration_seconds: s.duration_seconds,
      name: profile?.name ?? "(不明)",
      age: profile?.age ?? null,
      student_code: profile?.student_code ?? null,
    };
  });

  if (passedFilter !== "all") {
    rows = rows.filter((r) => (passedFilter === "pass" ? r.passed : !r.passed));
  }
  rows = rows.filter((r) => ageBand.test(r.age));
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        (r.student_code ?? "").toLowerCase().includes(lower)
    );
  }

  rows.sort((a, b) => {
    let av: string | number = 0;
    let bv: string | number = 0;
    switch (sort) {
      case "name":
        av = a.name;
        bv = b.name;
        break;
      case "age":
        av = a.age ?? -1;
        bv = b.age ?? -1;
        break;
      case "total_score":
        av = a.total_score ?? -1;
        bv = b.total_score ?? -1;
        break;
      case "duration_seconds":
        av = a.duration_seconds ?? -1;
        bv = b.duration_seconds ?? -1;
        break;
      case "passed":
        av = a.passed ? 1 : 0;
        bv = b.passed ? 1 : 0;
        break;
      default:
        av = a.started_at;
        bv = b.started_at;
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  function sortHref(key: SortKey) {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    const sp = new URLSearchParams({
      sort: key,
      dir: nextDir,
      passed: passedFilter,
      age: ageBandKey,
      q,
    });
    return `/admin/dashboard?${sp.toString()}`;
  }

  return (
    <div>
      <h1 className="mb-8 text-lg tracking-wide">受験者ダッシュボード</h1>

      <form method="get" className="mb-8 flex flex-wrap items-end gap-6 border-b border-line pb-8">
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">キーワード検索</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="名前 / 受講者ID"
            className="h-10 w-56 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">合否</span>
          <select
            name="passed"
            defaultValue={passedFilter}
            className="h-10 w-32 border border-line px-3 text-sm outline-none focus:border-khaki"
          >
            <option value="all">すべて</option>
            <option value="pass">合格</option>
            <option value="fail">不合格</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">年齢層</span>
          <select
            name="age"
            defaultValue={ageBandKey}
            className="h-10 w-32 border border-line px-3 text-sm outline-none focus:border-khaki"
          >
            {AGE_BANDS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />

        <button
          type="submit"
          className="h-10 border border-ink px-6 text-sm hover:border-khaki hover:text-khaki"
        >
          絞り込む
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-soft">
            {SORT_LABELS.map((s) => (
              <th key={s.key} className="py-3 text-left font-normal">
                <Link href={sortHref(s.key)} className="hover:text-ink">
                  {s.label}
                  {sort === s.key ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line">
              <td className="py-4 font-num">
                {new Date(r.started_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
              </td>
              <td className="py-4">
                <Link href={`/admin/dashboard/${r.id}`} className="hover:text-khaki">
                  {r.name}
                </Link>
                <span className="ml-2 font-num text-xs text-ink-soft">{r.student_code}</span>
              </td>
              <td className="py-4 font-num">{r.age ?? "-"}</td>
              <td className="py-4 font-num">{r.total_score}点</td>
              <td className="py-4 font-num text-ink-soft">
                {r.duration_seconds != null ? formatDuration(r.duration_seconds) : "-"}
              </td>
              <td className={r.passed ? "text-khaki" : "text-alert"}>
                {r.passed ? "合格" : "不合格"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="py-16 text-center text-sm text-ink-soft">該当する受験者がいません。</p>
      )}
    </div>
  );
}
