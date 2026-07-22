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
        "flex h-20 w-full flex-col items-center justify-center gap-2 border transition-all duration-150 sm:h-32",
        "active:scale-[0.97] disabled:pointer-events-none",
        "sm:border-line sm:bg-transparent sm:text-ink",
        isMaru
          ? "border-alert bg-alert text-paper sm:hover:border-khaki sm:hover:bg-transparent sm:hover:text-khaki"
          : "border-info bg-info text-paper sm:hover:border-alert sm:hover:bg-transparent sm:hover:text-alert",
        pending &&
          (isMaru
            ? "sm:border-khaki sm:bg-khaki-pale sm:text-khaki"
            : "sm:border-alert sm:bg-alert/5 sm:text-alert")
      )}
    >
      <span className="text-4xl font-bold sm:text-5xl sm:font-light">{symbol}</span>
    </button>
  );
}
