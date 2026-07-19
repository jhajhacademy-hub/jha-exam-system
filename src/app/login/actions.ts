"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { studentCodeToLoginEmail } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const idOrEmail = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/mypage") || "/mypage";

  if (!idOrEmail || !password) {
    redirect(`/login?error=missing&next=${encodeURIComponent(next)}`);
  }

  const email = idOrEmail.includes("@") ? idOrEmail : studentCodeToLoginEmail(idOrEmail);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
