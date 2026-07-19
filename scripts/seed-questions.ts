/**
 * data/questions_seed.json (Excelから抽出した113問) を Supabase の questions テーブルへ投入する。
 * 実行前に .env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定し、
 * supabase/migrations/0001_init.sql を適用しておくこと。
 *
 * 実行: npx tsx scripts/seed-questions.ts
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

type SeedQuestion = {
  id: string;
  category: string;
  question: string;
  answer: "◯" | "×";
  explanation: string;
  trap_note: string;
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const seedPath = path.join(process.cwd(), "data", "questions_seed.json");
  const questions: SeedQuestion[] = JSON.parse(readFileSync(seedPath, "utf-8"));

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name");
  if (catError) throw catError;

  const categoryIdByName = new Map(categories!.map((c) => [c.name, c.id]));

  const rows = questions.map((q) => {
    const categoryId = categoryIdByName.get(q.category);
    if (!categoryId) {
      throw new Error(`カテゴリが見つかりません: ${q.category} (question_no=${q.id})`);
    }
    return {
      category_id: categoryId,
      question_no: q.id,
      question_text: q.question,
      answer: q.answer === "◯",
      explanation: q.explanation,
      trap_note: q.trap_note,
    };
  });

  const { error: upsertError, count } = await supabase
    .from("questions")
    .upsert(rows, { onConflict: "question_no", count: "exact" });

  if (upsertError) throw upsertError;

  console.log(`${count ?? rows.length}問を投入/更新しました。(合計 ${rows.length}問)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
