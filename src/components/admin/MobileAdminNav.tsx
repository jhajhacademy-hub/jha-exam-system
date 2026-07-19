"use client";

import { useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";

type NavItem = { href: string; label: string };

interface MobileAdminNavProps {
  navItems: NavItem[];
  name: string;
  roleLabel: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
}

export function MobileAdminNav({ navItems, name, roleLabel, logoutAction }: MobileAdminNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-xs tracking-[0.2em] text-khaki">JHA ADMIN</p>
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
        >
          <span className="h-px w-6 bg-ink" />
          <span className="h-px w-6 bg-ink" />
          <span className="h-px w-6 bg-ink" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-xs tracking-[0.2em] text-khaki">JHA ADMIN</p>
            <button
              type="button"
              aria-label="メニューを閉じる"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex flex-1 flex-col px-6 py-8">
            <p className="mb-1 text-sm text-ink-soft">{name}</p>
            <p className="mb-10 text-[11px] text-line">{roleLabel}</p>

            <nav className="flex flex-col gap-6 text-base">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-ink hover:text-khaki"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <form action={logoutAction} className="mt-auto">
              <SubmitButton variant="ghost" size="md" className="!px-0">
                ログアウト
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
