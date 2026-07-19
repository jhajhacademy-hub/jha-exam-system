interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-baseline justify-between font-num text-ink-soft">
        <span className="text-xs tracking-wide">
          <span className="text-lg text-ink">{current}</span> / {total}問
        </span>
        <span className="text-xs tracking-wide">{percent}%</span>
      </div>
      <div className="h-px w-full bg-line">
        <div
          className="h-px bg-khaki transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
