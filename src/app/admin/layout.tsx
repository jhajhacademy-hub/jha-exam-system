import Link from "next/link";
import { requireStaffProfile } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { MobileAdminNav } from "@/components/admin/MobileAdminNav";

const ROLE_LABELS: Record<string, string> = {
  admin: "システム管理者",
  operator: "運用担当者",
};

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "受験者ダッシュボード", roles: ["admin", "operator"] },
  { href: "/admin/students", label: "受験者一覧", roles: ["admin", "operator"] },
  { href: "/admin/students/new", label: "受験者ID作成", roles: ["admin", "operator"] },
  { href: "/admin/retake-requests", label: "再受験申請", roles: ["admin", "operator"] },
  { href: "/admin/analytics", label: "正答率分析", roles: ["admin", "operator"] },
  { href: "/admin/questions", label: "問題管理", roles: ["admin"] },
  { href: "/admin/logo", label: "ロゴ管理", roles: ["admin"] },
  { href: "/admin/notifications", label: "通知メール設定", roles: ["admin"] },
  { href: "/admin/users", label: "ユーザー管理", roles: ["admin"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaffProfile();
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <MobileAdminNav
        navItems={visibleNav}
        name={profile.name}
        roleLabel={ROLE_LABELS[profile.role]}
        logoutAction={logoutAction}
      />
      <aside className="hidden w-56 shrink-0 border-r border-line px-6 py-8 md:block">
        <p className="mb-1 text-xs tracking-[0.2em] text-khaki">JHA ADMIN</p>
        <p className="mb-1 text-sm text-ink-soft">{profile.name}</p>
        <p className="mb-10 text-[11px] text-line">{ROLE_LABELS[profile.role]}</p>
        <nav className="flex flex-col gap-4 text-sm">
          {visibleNav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink-soft hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-16">
          <SubmitButton variant="ghost" size="md" className="!h-9 !px-0 text-xs">
            ログアウト
          </SubmitButton>
        </form>
      </aside>
      <div className="flex-1 px-8 py-10 md:px-12">{children}</div>
    </div>
  );
}
