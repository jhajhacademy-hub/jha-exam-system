import { createClient } from "@/lib/supabase/server";
import { requireStaffProfile } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { approveRetakeAction, denyRetakeAction } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み(未消化)",
  denied: "却下",
  used: "受験済み",
};

export default async function AdminRetakeRequestsPage() {
  await requireStaffProfile();

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("retake_requests")
    .select(
      "id, status, requested_at, resolved_at, profiles!retake_requests_student_id_fkey(name, student_code)"
    )
    .order("requested_at", { ascending: false });

  type Row = {
    id: string;
    status: string;
    requested_at: string;
    resolved_at: string | null;
    name: string;
    student_code: string | null;
  };

  const rows: Row[] = (requests ?? []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      status: r.status,
      requested_at: r.requested_at,
      resolved_at: r.resolved_at,
      name: profile?.name ?? "(不明)",
      student_code: profile?.student_code ?? null,
    };
  });

  const pending = rows.filter((r) => r.status === "pending");
  const resolved = rows.filter((r) => r.status !== "pending");

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">再受験申請</h1>

      <h2 className="mb-4 text-sm tracking-wide text-ink-soft">
        承認待ち({pending.length}件)
      </h2>

      {pending.length === 0 ? (
        <p className="mb-16 border-t border-line py-10 text-center text-sm text-ink-soft">
          承認待ちの申請はありません。
        </p>
      ) : (
        <table className="mb-16 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft">
              <th className="py-3 text-left font-normal">受講者</th>
              <th className="py-3 text-left font-normal">申請日時</th>
              <th className="py-3 text-right font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="py-4">
                  {r.name}
                  <span className="ml-2 font-num text-xs text-ink-soft">{r.student_code}</span>
                </td>
                <td className="py-4 font-num text-ink-soft">
                  {new Date(r.requested_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                </td>
                <td className="py-4 text-right">
                  <form action={approveRetakeAction} className="mr-3 inline-block">
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton size="md" className="!h-9 !px-4 text-xs">
                      許可する
                    </SubmitButton>
                  </form>
                  <form action={denyRetakeAction} className="inline-block">
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton variant="ghost" size="md" className="!h-9 !px-2 text-xs">
                      却下する
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="mb-4 text-sm tracking-wide text-ink-soft">履歴</h2>
      {resolved.length === 0 ? (
        <p className="border-t border-line py-10 text-center text-sm text-ink-soft">
          履歴はありません。
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft">
              <th className="py-3 text-left font-normal">受講者</th>
              <th className="py-3 text-left font-normal">申請日時</th>
              <th className="py-3 text-left font-normal">ステータス</th>
              <th className="py-3 text-right font-normal">対応日時</th>
            </tr>
          </thead>
          <tbody>
            {resolved.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="py-4">
                  {r.name}
                  <span className="ml-2 font-num text-xs text-ink-soft">{r.student_code}</span>
                </td>
                <td className="py-4 font-num text-ink-soft">
                  {new Date(r.requested_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                </td>
                <td className="py-4 text-xs">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="py-4 text-right font-num text-ink-soft">
                  {r.resolved_at
                    ? new Date(r.resolved_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
