import Image from "next/image";
import { clsx } from "clsx";

interface LogoProps {
  logoUrl?: string | null;
  className?: string;
  size?: number;
  light?: boolean;
}

export function Logo({ logoUrl, className, size = 40, light = false }: LogoProps) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt="JHA住宅設計協会"
        width={size * 4}
        height={size}
        className={clsx("h-auto w-auto object-contain", className)}
        style={{ height: size }}
        unoptimized
      />
    );
  }

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span
        className={clsx(
          "flex items-center justify-center border font-num text-xs tracking-[0.2em]",
          light ? "border-paper text-paper" : "border-ink text-ink"
        )}
        style={{ height: size, width: size }}
      >
        JHA
      </span>
      <span className={clsx("text-xs tracking-[0.15em]", light ? "text-paper" : "text-ink-soft")}>
        住宅設計協会
      </span>
    </div>
  );
}
