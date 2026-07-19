import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { TOTAL_QUESTIONS, POINTS_PER_QUESTION, PASS_SCORE } from "@/lib/exam-logic";

export default async function TopPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("logo_url")
    .eq("id", 1)
    .single();

  const fullScore = TOTAL_QUESTIONS * POINTS_PER_QUESTION;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between bg-khaki px-8 py-6">
        <Logo logoUrl={settings?.logo_url} light />
        <LinkButton href="/login" variant="outlineLight" size="md">
          ログイン
        </LinkButton>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-8 py-24 text-center">
        <p className="mb-6 font-num text-xs tracking-[0.3em] text-khaki">
          JHA HOUSING DESIGN ACADEMY
        </p>
        <h1 className="mb-10 text-3xl font-medium leading-relaxed tracking-wide md:text-4xl">
          住宅・建築 実務資格
          <br />
          オンライン認定試験
        </h1>
        <p className="mb-16 max-w-xl leading-8 text-ink-soft">
          部材・法規・資金計画から接客心理学まで。
          <br />
          現場実務に直結する知識を、
          <br />
          ◯×形式で一問ずつ丁寧に確認します。
        </p>

        <div className="mb-16 grid w-full grid-cols-3 divide-x divide-line border-y border-line">
          <div className="px-6 py-6 text-center">
            <p className="font-num text-3xl text-ink">{TOTAL_QUESTIONS}</p>
            <p className="mt-2 text-xs tracking-wide text-ink-soft">出題数</p>
          </div>
          <div className="px-6 py-6 text-center">
            <p className="font-num text-3xl text-ink">{fullScore}</p>
            <p className="mt-2 text-xs tracking-wide text-ink-soft">満点</p>
          </div>
          <div className="px-6 py-6 text-center">
            <p className="font-num text-3xl font-bold text-alert">{PASS_SCORE}</p>
            <p className="mt-2 text-xs tracking-wide text-ink-soft">合格基準</p>
          </div>
        </div>

        <LinkButton href="/login" size="lg">
          受講者ログイン
        </LinkButton>
      </main>

      <footer className="bg-khaki px-8 py-6 text-center text-xs text-paper">
        &copy; JHA住宅設計協会
      </footer>
    </div>
  );
}
