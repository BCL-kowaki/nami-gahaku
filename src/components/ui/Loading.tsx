'use client';

export default function Loading({ text = '読み込み中' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="flex gap-1.5">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">{text}</p>
    </div>
  );
}
