import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/Logo";
import { LogoUploadForm } from "@/components/admin/LogoUploadForm";

export default async function AdminLogoPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("logo_url")
    .eq("id", 1)
    .single();

  return (
    <div>
      <h1 className="mb-10 text-lg tracking-wide">ロゴ管理</h1>

      <div className="mb-10">
        <p className="mb-3 text-xs text-ink-soft">現在のロゴ</p>
        <div className="border border-line p-8">
          <Logo logoUrl={settings?.logo_url} size={48} />
        </div>
      </div>

      <LogoUploadForm />
    </div>
  );
}
