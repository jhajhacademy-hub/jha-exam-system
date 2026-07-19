import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";
import { deleteStaffAction } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  admin: "システム管理者",
  operator: "運用担当者",
};

type SortKey = "name" | "role" | "status" | "created_at";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string; q?: string; sort?: string; dir?: string }>;
}) {
  const currentProfile = await requireAdminProfile();
  const params = await searchParams;
  const roleFilter = params.role ?? "all";
  const statusFilter = params.status ?? "all";
  const q = (params.q ?? "").trim();
  const sort = (params.sort as SortKey) || "created_at";
  const dir = params.dir === "asc" ? "asc" : "desc";

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, name, email, role, status, created_at")
    .in("role", ["admin", "operator"]);

  let rows = staff ?? [];

  if (roleFilter !== "all") {
    rows = rows.filter((r) => r.role === roleFilter);
  }
  if (statusFilter !== "all") {
    rows = rows.filter((r) => r.status === statusFilter);
  }
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) || (r.email ?? "").toLowerCase().includes(lower)
    );
  }

  rows = [...rows].sort((a, b) => {
    let av: string = "";
    let bv: string = "";
    switch (sort) {
      case "name":
        av = a.name;
        bv = b.name;
        break;
      case "role":
        av = a.role;
        bv = b.role;
        break;
      case "status":
        av = a.status;
        bv = b.status;
        break;
      default:
        av = a.created_at;
        bv = b.created_at;
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });

  function sortHref(key: SortKey) {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    const sp = new URLSearchParams({
      sort: key,
      dir: nextDir,
      role: roleFilter,
      status: statusFilter,
      q,
    });
    return `/admin/users?${sp.toString()}`;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg tracking-wide">ユーザー管理</h1>
        <LinkButton href="/admin/users/new" variant="outline">
          スタッフを追加
        </LinkButton>
      </div>

      <form method="get" className="mb-10 flex flex-wrap items-end gap-6 border-b border-line pb-8">
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">キーワード検索</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="名前 / メールアドレス"
            className="h-10 w-64 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">権限</span>
          <select
            name="role"
            defaultValue={roleFilter}
            className="h-10 w-40 border border-line px-3 text-sm outline-none focus:border-khaki"
          >
            <option value="all">すべて</option>
            <option value="admin">システム管理者</option>
            <option value="operator">運用担当者</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">ステータス</span>
          <select
            name="status"
            defaultValue={statusFilter}
            className="h-10 w-32 border border-line px-3 text-sm outline-none focus:border-khaki"
          >
            <option value="all">すべて</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
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
            <th className="py-3 text-left font-normal">
              <Link href={sortHref("name")}>名前{sort === "name" ? (dir === "asc" ? " ▲" : " ▼") : ""}</Link>
            </th>
            <th className="py-3 text-left font-normal">メールアドレス</th>
            <th className="py-3 text-left font-normal">
              <Link href={sortHref("role")}>権限{sort === "role" ? (dir === "asc" ? " ▲" : " ▼") : ""}</Link>
            </th>
            <th className="py-3 text-left font-normal">
              <Link href={sortHref("status")}>
                ステータス{sort === "status" ? (dir === "asc" ? " ▲" : " ▼") : ""}
              </Link>
            </th>
            <th className="py-3 text-right font-normal">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line">
              <td className="py-4">
                {r.name}
                {r.id === currentProfile.id && (
                  <span className="ml-2 text-xs text-ink-soft">(自分)</span>
                )}
              </td>
              <td className="py-4 font-num text-ink-soft">{r.email}</td>
              <td className="py-4 text-xs">{ROLE_LABELS[r.role] ?? r.role}</td>
              <td className="py-4">
                <span className={r.status === "active" ? "text-khaki" : "text-alert"}>
                  {r.status === "active" ? "有効" : "無効"}
                </span>
              </td>
              <td className="py-4 text-right">
                <Link
                  href={`/admin/users/${r.id}`}
                  className="mr-4 text-xs text-ink-soft hover:text-khaki"
                >
                  編集
                </Link>
                {r.id !== currentProfile.id && (
                  <form action={deleteStaffAction} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-xs text-ink-soft hover:text-alert">
                      削除
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="py-16 text-center text-sm text-ink-soft">該当するユーザーがいません。</p>
      )}
    </div>
  );
}
