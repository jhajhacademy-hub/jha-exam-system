import "server-only";
import { cache } from "react";
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

/**
 * ログイン中のユーザーID。トークンの署名をその場で検証するため、Supabaseへの通信が要らない
 * (署名鍵は一度取得すると使い回される)。無効化などの状態確認は profiles.status 側で行う。
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
});

// cache() により、同じ画面の表示中(layout と page など)に何度呼んでも通信は1回で済む。
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
});

export function isStaffRole(role: Profile["role"]): boolean {
  return role === "admin" || role === "operator";
}

/**
 * システム管理者(Administrator)のみ許可。問題管理・ロゴ管理・ユーザー管理など
 * 破壊的/機微な操作のガードに使う。
 */
export async function requireAdminProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active") redirect("/login");
  if (profile.role !== "admin") redirect("/admin/dashboard");
  return profile;
}

/**
 * システム管理者 または 運用担当者(Operator) を許可。
 * 受験者ダッシュボード閲覧・受験者ID発行など、運用担当者にも開放する画面のガードに使う。
 */
export async function requireStaffProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active") redirect("/login");
  if (!isStaffRole(profile.role)) redirect("/mypage");
  return profile;
}
