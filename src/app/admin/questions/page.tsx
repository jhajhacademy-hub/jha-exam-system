import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";
import { deleteQuestionAction } from "./actions";

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  await requireAdminProfile();
  const params = await searchParams;
  const categoryId = params.category ?? "";
  const q = (params.q ?? "").trim();

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");

  let query = supabase
    .from("questions")
    .select("id, question_no, question_text, answer, categories(name)")
    .order("question_no");

  if (categoryId) query = query.eq("category_id", categoryId);
  if (q) query = query.ilike("question_text", `%${q}%`);

  const { data: questions } = await query;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg tracking-wide">問題管理</h1>
        <LinkButton href="/admin/questions/new" variant="outline">
          問題を追加
        </LinkButton>
      </div>

      <form method="get" className="mb-10 flex flex-wrap items-end gap-6 border-b border-line pb-8">
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">キーワード検索</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="問題文"
            className="h-10 w-64 border border-line px-3 text-sm outline-none focus:border-khaki"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs text-ink-soft">カテゴリ</span>
          <select
            name="category"
            defaultValue={categoryId}
            className="h-10 w-56 border border-line px-3 text-sm outline-none focus:border-khaki"
          >
            <option value="">すべて</option>
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

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-soft">
            <th className="w-24 py-3 text-left font-normal">問題ID</th>
            <th className="w-40 py-3 text-left font-normal">カテゴリ</th>
            <th className="py-3 text-left font-normal">問題文</th>
            <th className="w-12 py-3 text-center font-normal">正解</th>
            <th className="w-32 py-3 text-right font-normal">操作</th>
          </tr>
        </thead>
        <tbody>
          {(questions ?? []).map((q2) => {
            const category = Array.isArray(q2.categories) ? q2.categories[0] : q2.categories;
            return (
              <tr key={q2.id} className="border-b border-line">
                <td className="py-3 font-num text-ink-soft">{q2.question_no}</td>
                <td className="py-3 text-xs text-ink-soft">{category?.name}</td>
                <td className="py-3">{q2.question_text.slice(0, 60)}</td>
                <td className="py-3 text-center">{q2.answer ? "◯" : "×"}</td>
                <td className="py-3 text-right">
                  <Link
                    href={`/admin/questions/${q2.id}`}
                    className="mr-4 text-xs text-ink-soft hover:text-khaki"
                  >
                    編集
                  </Link>
                  <form action={deleteQuestionAction} className="inline">
                    <input type="hidden" name="id" value={q2.id} />
                    <button type="submit" className="text-xs text-ink-soft hover:text-alert">
                      削除
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {(!questions || questions.length === 0) && (
        <p className="py-16 text-center text-sm text-ink-soft">該当する問題がありません。</p>
      )}
    </div>
  );
}
