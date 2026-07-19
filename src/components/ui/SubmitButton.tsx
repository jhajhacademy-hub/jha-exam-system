"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";
import { Button } from "./Button";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * Server Action を積むフォーム専用の送信ボタン。
 * useFormStatus で送信中(pending)を検知し、押した瞬間に見た目を変えて
 * ネットワーク往復中も「反応している」ことが分かるようにする。
 */
export function SubmitButton({ className, children, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className={clsx(pending && "opacity-60", className)}
      {...props}
    >
      {pending ? "送信中…" : children}
    </Button>
  );
}
