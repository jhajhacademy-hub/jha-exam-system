import { createClient } from "@/lib/supabase/server";
import {
  QuestionForm,
  CsvImportQuestionsForm,
  NewCategoryForm,
} from "@/components/admin/QuestionForms";

export default async function AdminNewQuestionPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order");

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">問題を追加</h1>

      <div className="mb-10">
        <NewCategoryForm />
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <QuestionForm categories={categories ?? []} />
        <CsvImportQuestionsForm />
      </div>
    </div>
  );
}
