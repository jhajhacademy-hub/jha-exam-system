"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { uploadLogoAction, type LogoFormState } from "@/app/admin/logo/actions";

const initialLogoFormState: LogoFormState = { status: "idle", message: "" };

export function LogoUploadForm() {
  const [state, formAction, pending] = useActionState(uploadLogoAction, initialLogoFormState);

  return (
    <form action={formAction} className="max-w-md border border-line p-8">
      <label className="mb-6 flex flex-col gap-2">
        <span className="text-xs text-ink-soft">ロゴ画像（PNG）</span>
        <input
          name="file"
          type="file"
          accept="image/png"
          required
          className="block w-full text-sm file:mr-4 file:h-10 file:border file:border-ink file:bg-paper file:px-4 file:text-sm"
        />
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "アップロード中..." : "アップロードして反映"}
      </Button>

      {state.status !== "idle" && (
        <p
          className={`mt-6 text-sm ${state.status === "error" ? "text-alert" : "text-khaki"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
