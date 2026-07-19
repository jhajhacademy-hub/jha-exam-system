"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

interface OxSubmitButtonProps {
  symbol: "◯" | "×";
}

export function OxSubmitButton({ symbol }: OxSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isMaru = symbol === "◯";

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "flex h-20 w-full flex-col items-center justify-center gap-2 border border-line transition-all duration-150 sm:h-32",
        "active:scale-[0.97] disabled:pointer-events-none",
        isMaru ? "hover:border-khaki hover:text-khaki" : "hover:border-alert hover:text-alert",
        pending && (isMaru ? "border-khaki bg-khaki-pale text-khaki" : "border-alert bg-alert/5 text-alert")
      )}
    >
      <span className="text-4xl font-light sm:text-5xl">{symbol}</span>
    </button>
  );
}
