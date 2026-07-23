import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaffProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";

type SortKey = "student_code" | "name" | "age" | "created_at";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  await requireStaffProfile();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sort = (params.sort as SortKey) || "student_code";
  const dir = params.dir === "desc" ? "desc" : "asc";

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("profiles")
    .select("id, student_code, name, age, created_at")
    .eq("role", "student");

  const studentIds = (students ?? []).map((s) => s.id);

  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("student_id, started_at, passed")
    .eq("status", "completed")
    .in("student_id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"])
    .order("started_at", { ascending: true });

  const sessionsByStudent = new Map<string, { started_at: string; passed: boolean | null }[]>();
  for (const s of sessions ?? []) {
    const list = sessionsByStudent.get(s.student_id) ?? [];
    list.push({ started_at: s.started_at, passed: s.passed });
    sessionsByStudent.set(s.student_id, list);
  }

  type Row = {
    id: string;
    student_code: string | null;
    name: string;
    age: number | null;
    created_at: string;
    attempt1: string | null;
    attempt2: string | null;
    attempt3: string | null;
    latestPassed: boolean | null;
    attemptCount: number;
  };

  let rows: Row[] = (students ?? []).map((s) => {
    const attempts = sessionsByStudent.get(s.id) ?? [];
    return {
      id: s.id,
      student_code: s.student_code,
      name: s.name,
      age: s.age,
      created_at: s.created_at,
      attempt1: attempts[0]?.started_at ?? null,
      attempt2: attempts[1]?.started_at ?? null,
      attempt3: attempts[2]?.started_at ?? null,
      latestPassed: attempts.length > 0 ? attempts[attempts.length - 1].passed : null,
      attemptCount: attempts.length,
    };
  });

  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        (r.student_code ?? "").toLowerCase().includes(lower)
    );
  }

  rows.sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    switch (sort) {
      case "name":
        av = a.name;
        bv = b.name;
        break;
      case "age":
        av = a.age ?? -1;
        bv = b.age ?? -1;
        break;
      case "created_at":
        av = a.created_at;
        bv = b.created_at;
        break;
      default:
        av = a.student_code ?? "";
        bv = b.student_code ?? "";
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  function sortHref(key: SortKey) {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    const sp = new URLSearchParams({ sort: key, dir: nextDir, q });
    return `/admin/students?${sp.toString()}`;
  }

  function fmt(dateStr: string | null) {
    return dateStr
      ? new Date(dateStr).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
      : "-";
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg tracking-wide">受験者一覧</h1>
        <LinkButton href="/admin/students/new" variant="outline">
          受験者ID作成
        </LinkButton>
      </div>

      <form method="get" className="mb-10 flex flex-wrap items-end gap-6 border-b border-line pb-8">
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">キーワード検索</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="名前 / 受験番号"
            className="h-10 w-64 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button
          type="submit"
          className="h-10 border border-ink px-6 text-sm hover:border-khaki hover:text-khaki"
        >
          検索する
        </button>
      </form>

      <p className="mb-4 text-xs text-ink-soft">全{rows.length}名</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft">
              <th className="py-3 text-left font-normal">
                <Link href={sortHref("student_code")}>
                  受験番号{sort === "student_code" ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </Link>
              </th>
              <th className="py-3 text-left font-normal">
                <Link href={sortHref("name")}>名前{sort === "name" ? (dir === "asc" ? " ▲" : " ▼") : ""}</Link>
              </th>
              <th className="py-3 text-left font-normal">
                <Link href={sortHref("age")}>年齢{sort === "age" ? (dir === "asc" ? " ▲" : " ▼") : ""}</Link>
              </th>
              <th className="py-3 text-left font-normal">
                <Link href={sortHref("created_at")}>
                  登録日{sort === "created_at" ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </Link>
              </th>
              <th className="py-3 text-left font-normal">1回目受験日</th>
              <th className="py-3 text-left font-normal">2回目受験日</th>
              <th className="py-3 text-left font-normal">3回目受験日</th>
              <th className="py-3 text-left font-normal">合否</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="py-4 font-num">{r.student_code}</td>
                <td className="py-4">{r.name}</td>
                <td className="py-4 font-num">{r.age ?? "-"}</td>
                <td className="py-4 font-num text-ink-soft">{fmt(r.created_at)}</td>
                <td className="py-4 font-num text-ink-soft">{fmt(r.attempt1)}</td>
                <td className="py-4 font-num text-ink-soft">{fmt(r.attempt2)}</td>
                <td className="py-4 font-num text-ink-soft">{fmt(r.attempt3)}</td>
                <td className="py-4">
                  {r.attemptCount === 0 ? (
                    <span className="text-ink-soft">未受験</span>
                  ) : (
                    <span className={r.latestPassed ? "text-khaki" : "text-alert"}>
                      {r.latestPassed ? "合格" : "不合格"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="py-16 text-center text-sm text-ink-soft">該当する受験者がいません。</p>
      )}
    </div>
  );
}
