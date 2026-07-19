/**
 * 初回管理者アカウントを作成する。
 * 実行: npx tsx scripts/create-admin.ts <email> <password> <表示名>
 * 例  : npx tsx scripts/create-admin.ts admin@jha-academy.jp "StrongPass123!" "運営管理者"
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password || !name) {
    console.error("使い方: npx tsx scripts/create-admin.ts <email> <password> <表示名>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    role: "admin",
    name,
    email,
  });
  if (profileError) throw profileError;

  console.log(`管理者アカウントを作成しました: ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
