"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error: err,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(err);
  }, [err]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-red-600">エラーが発生しました</h2>
      <p className="text-sm text-muted-foreground">{err.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        再試行
      </button>
    </div>
  );
}
