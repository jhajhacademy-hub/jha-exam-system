"use server";

import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveRetakeAction(formData: FormData) {
  const profile = await requireStaffProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/retake-requests");

  const admin = createAdminClient();
  await admin
    .from("retake_requests")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: profile.id })
    .eq("id", id)
    .eq("status", "pending");

  redirect("/admin/retake-requests");
}

export async function denyRetakeAction(formData: FormData) {
  const profile = await requireStaffProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/retake-requests");

  const admin = createAdminClient();
  await admin
    .from("retake_requests")
    .update({ status: "denied", resolved_at: new Date().toISOString(), resolved_by: profile.id })
    .eq("id", id)
    .eq("status", "pending");

  redirect("/admin/retake-requests");
}
