"use client";

import { clsx } from "clsx";

interface OxButtonProps {
  symbol: "◯" | "×";
  onClick: () => void;
  disabled?: boolean;
}

export function OxButton({ symbol, onClick, disabled }: OxButtonProps) {
  const isMaru = symbol === "◯";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex h-20 w-full touch-manipulation flex-col items-center justify-center gap-2 border transition-all duration-150 sm:h-32",
        "active:scale-[0.97] disabled:pointer-events-none",
        "sm:border-line sm:bg-transparent sm:text-ink",
        isMaru
          ? "border-alert bg-alert text-paper sm:hover:border-khaki sm:hover:bg-transparent sm:hover:text-khaki"
          : "border-info bg-info text-paper sm:hover:border-alert sm:hover:bg-transparent sm:hover:text-alert"
      )}
    >
      <span className="text-4xl font-bold sm:text-5xl sm:font-light">{symbol}</span>
    </button>
  );
}
