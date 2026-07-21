import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDuration } from "@/lib/exam-logic";
import {
  startExamAction,
  discardAndRestartExamAction,
  requestRetakeAction,
} from "@/app/exam/actions";
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

  const { data: inProgressSession } = await supabase
    .from("exam_sessions")
    .select("id, question_ids")
    .eq("student_id", profile.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let resumeInfo: { sessionId: string; resumeIndex: number; total: number } | null = null;
  if (inProgressSession) {
    const total = inProgressSession.question_ids.length;
    const { count: answeredCount } = await supabase
      .from("exam_answers")
      .select("id", { count: "exact", head: true })
      .eq("session_id", inProgressSession.id);
    const resumeIndex = Math.min((answeredCount ?? 0) + 1, total);
    resumeInfo = { sessionId: inProgressSession.id, resumeIndex, total };
  }

  const hasCompletedBefore = (sessions ?? []).length > 0;

  const { data: latestRetakeRequest } = await supabase
    .from("retake_requests")
    .select("status")
    .eq("student_id", profile.id)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

      {resumeInfo ? (
        <div className="mb-20 border border-khaki bg-khaki-pale p-8 text-center">
          <p className="mb-2 text-sm">前回の続きがあります</p>
          <p className="mb-6 text-xs text-ink-soft">
            {resumeInfo.resumeIndex} / {resumeInfo.total}問目まで進んでいます。回答は自動的に保存されているので、途中から再開できます。
          </p>
          <LinkButton href={`/exam/${resumeInfo.sessionId}/q/${resumeInfo.resumeIndex}`} size="lg">
            続きから再開する
          </LinkButton>
          <form action={discardAndRestartExamAction} className="mt-4">
            <input type="hidden" name="sessionId" value={resumeInfo.sessionId} />
            <SubmitButton
              variant="ghost"
              size="md"
              className="!h-auto text-xs text-ink-soft underline"
            >
              破棄して最初からやり直す
            </SubmitButton>
          </form>
        </div>
      ) : !hasCompletedBefore ? (
        <form action={startExamAction} className="mb-20 border border-line p-8 text-center">
          <p className="mb-6 text-sm text-ink-soft">全50問・100点満点・80点以上で合格</p>
          <SubmitButton size="lg">テストを受験する</SubmitButton>
        </form>
      ) : latestRetakeRequest?.status === "approved" ? (
        <form action={startExamAction} className="mb-20 border border-khaki bg-khaki-pale p-8 text-center">
          <p className="mb-6 text-sm">再受験が承認されました。全50問・100点満点・80点以上で合格</p>
          <SubmitButton size="lg">テストを受験する</SubmitButton>
        </form>
      ) : latestRetakeRequest?.status === "pending" ? (
        <div className="mb-20 border border-line p-8 text-center">
          <p className="text-sm text-ink-soft">
            再受験申請中です。管理者の承認をお待ちください。
          </p>
        </div>
      ) : (
        <form action={requestRetakeAction} className="mb-20 border border-line p-8 text-center">
          <p className="mb-6 text-sm text-ink-soft">
            再受験には管理者の承認が必要です。申請すると管理画面に通知されます。
          </p>
          <SubmitButton size="lg">再受験申請をする</SubmitButton>
        </form>
      )}

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
