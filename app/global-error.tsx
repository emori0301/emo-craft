"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-xl font-bold text-red-600">予期せぬエラー</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          再読み込み
        </button>
      </body>
    </html>
  );
}
