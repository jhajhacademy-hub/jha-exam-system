import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";

const LOGIN_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN ?? "login.jha-exam.internal";

/**
 * 受講者ID(例: JHA-0001) を Supabase Auth 用の合成メールアドレスに変換する。
 * 将来、受講者が実メールアドレスを登録した場合はそちらでの認証に切り替える設計余地を残す。
 */
export function studentCodeToLoginEmail(studentCode: string): string {
  return `${studentCode.trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
}

export async function requireAdminProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");
  return profile;
}
