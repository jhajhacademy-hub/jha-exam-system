import { requireAdminProfile } from "@/lib/auth";
import { StaffForm } from "@/components/admin/StaffForms";

export default async function AdminNewUserPage() {
  await requireAdminProfile();

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">スタッフを追加</h1>
      <div className="max-w-xl">
        <StaffForm />
      </div>
    </div>
  );
}
