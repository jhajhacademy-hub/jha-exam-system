import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { QuestionForm } from "@/components/admin/QuestionForms";

export default async function AdminEditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminProfile();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: categories }, { data: question }] = await Promise.all([
    supabase.from("categories").select("id, name, sort_order").order("sort_order"),
    supabase.from("questions").select("*").eq("id", id).single(),
  ]);

  if (!question) notFound();

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">
        問題を編集
        <span className="ml-3 font-num text-sm text-ink-soft">{question.question_no}</span>
      </h1>

      <div className="max-w-2xl">
        <QuestionForm categories={categories ?? []} question={question} />
      </div>
    </div>
  );
}
