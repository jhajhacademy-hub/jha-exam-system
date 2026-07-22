"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  addNotificationEmailAction,
  type NotificationFormState,
} from "@/app/admin/notifications/actions";

const initialState: NotificationFormState = { status: "idle", message: "" };

export function NotificationEmailForm() {
  const [state, formAction, pending] = useActionState(addNotificationEmailAction, initialState);

  return (
    <form action={formAction} className="max-w-md border border-line p-8">
      <label className="mb-6 flex flex-col gap-2">
        <span className="text-xs text-ink-soft">追加するメールアドレス</span>
        <input
          name="email"
          type="email"
          required
          placeholder="info@jha-academy.jp"
          className="h-11 border border-line px-4 text-sm"
        />
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "追加中..." : "追加する"}
      </Button>

      {state.status !== "idle" && (
        <p className={`mt-6 text-sm ${state.status === "error" ? "text-alert" : "text-khaki"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
