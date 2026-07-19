import Link from "next/link";
import { requireAdminProfile } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "受験者ダッシュボード" },
  { href: "/admin/students/new", label: "受験者ID作成" },
  { href: "/admin/questions", label: "問題管理" },
  { href: "/admin/logo", label: "ロゴ管理" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdminProfile();

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 border-r border-line px-6 py-8 md:block">
        <p className="mb-1 text-xs tracking-[0.2em] text-khaki">JHA ADMIN</p>
        <p className="mb-10 text-sm text-ink-soft">{profile.name}</p>
        <nav className="flex flex-col gap-4 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink-soft hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-16">
          <Button type="submit" variant="ghost" size="md" className="!h-9 !px-0 text-xs">
            ログアウト
          </Button>
        </form>
      </aside>
      <div className="flex-1 px-8 py-10 md:px-12">{children}</div>
    </div>
  );
}
