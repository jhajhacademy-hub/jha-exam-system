import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDuration } from "@/lib/exam-logic";
import { startExamAction } from "@/app/exam/actions";
import { logoutAction } from "@/app/login/actions";

export default async function MyPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("id, started_at, total_score, passed, duration_seconds, status")
    .eq("student_id", profile.id)
    .eq("status", "completed")
    .order("started_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-8 py-16">
      <div className="mb-16 flex items-start justify-between">
        <div>
          <p className="mb-2 text-xs tracking-wide text-ink-soft">マイページ</p>
          <h1 className="text-2xl tracking-wide">{profile.name} 様</h1>
        </div>
        <form action={logoutAction}>
          <SubmitButton variant="ghost" size="md">
            ログアウト
          </SubmitButton>
        </form>
      </div>

      <form action={startExamAction} className="mb-20 border border-line p-8 text-center">
        <p className="mb-6 text-sm text-ink-soft">全50問・100点満点・80点以上で合格</p>
        <SubmitButton size="lg">テストを受験する</SubmitButton>
      </form>

      <h2 className="mb-6 text-sm tracking-wide text-ink-soft">受験履歴</h2>

      {!sessions || sessions.length === 0 ? (
        <p className="border-t border-line py-10 text-center text-sm text-ink-soft">
          受験履歴はまだありません。
        </p>
      ) : (
        <table className="w-full border-t border-line text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft">
              <th className="py-3 text-left font-normal">受験日</th>
              <th className="py-3 text-right font-normal">点数</th>
              <th className="py-3 text-right font-normal">合否</th>
              <th className="py-3 text-right font-normal">タイム</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-line">
                <td className="py-4 font-num">
                  {new Date(s.started_at).toLocaleDateString("ja-JP")}
                </td>
                <td className="py-4 text-right font-num">{s.total_score}点</td>
                <td className="py-4 text-right">
                  <span className={s.passed ? "text-khaki" : "text-alert"}>
                    {s.passed ? "合格" : "不合格"}
                  </span>
                </td>
                <td className="py-4 text-right font-num text-ink-soft">
                  {s.duration_seconds != null ? formatDuration(s.duration_seconds) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
