import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdminProfile } from "@/lib/auth";
import { StaffForm } from "@/components/admin/StaffForms";

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await requireAdminProfile();
  const { id } = await params;

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .in("role", ["admin", "operator"])
    .single();

  if (!staff) notFound();

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">
        スタッフを編集
        <span className="ml-3 font-num text-sm text-ink-soft">{staff.name}</span>
      </h1>
      <div className="max-w-xl">
        <StaffForm staff={staff} isSelf={staff.id === currentProfile.id} />
      </div>
    </div>
  );
}
