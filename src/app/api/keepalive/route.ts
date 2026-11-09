import { createClient } from "@supabase/supabase-js";

// vercel.json の crons から毎日1回呼ばれ、Supabase無料プランの「1週間アクセスがないと休止」を防ぐ。
// 公開済みの設定(site_settings)を1件読むだけで、個人情報は返さない。
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from("site_settings").select("id").eq("id", 1).single();
  if (error) {
    console.error("keepalive: Supabaseへのアクセスに失敗しました:", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
