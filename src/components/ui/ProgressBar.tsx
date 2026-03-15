'use client';

interface ProgressBarProps {
  value: number;    // 0〜100
  label?: string;
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
          <span className="text-xs font-bold text-[var(--color-text-primary)]">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
