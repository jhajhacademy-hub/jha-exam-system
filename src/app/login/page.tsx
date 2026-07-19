import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { loginAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "受講者IDとパスワードを入力してください。",
  invalid: "IDまたはパスワードが正しくありません。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/mypage";
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("logo_url")
    .eq("id", 1)
    .single();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      <div className="mb-12">
        <Link href="/">
          <Logo logoUrl={settings?.logo_url} />
        </Link>
      </div>

      <form action={loginAction} className="w-full max-w-sm">
        <input type="hidden" name="next" value={next} />

        <h1 className="mb-8 text-center text-lg tracking-wide">受講者ログイン</h1>

        {errorMessage && (
          <p className="mb-6 border border-alert/40 bg-alert/5 px-4 py-3 text-center text-xs text-alert">
            {errorMessage}
          </p>
        )}

        <label className="mb-5 block">
          <span className="mb-2 block text-xs tracking-wide text-ink-soft">受講者ID</span>
          <input
            name="id"
            type="text"
            required
            autoComplete="username"
            className="h-12 w-full border border-line bg-paper px-4 text-sm outline-none focus:border-khaki"
            placeholder="JHA-0001"
          />
        </label>

        <label className="mb-8 block">
          <span className="mb-2 block text-xs tracking-wide text-ink-soft">パスワード</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-12 w-full border border-line bg-paper px-4 text-sm outline-none focus:border-khaki"
            placeholder="••••••••"
          />
        </label>

        <Button type="submit" className="w-full">
          ログイン
        </Button>
      </form>
    </div>
  );
}
