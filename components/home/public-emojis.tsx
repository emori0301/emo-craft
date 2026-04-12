"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download } from "lucide-react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";

type Emoji = {
  id: string;
  name: string;
  imageUrl: string | null;
};

function EmojiModal({ emoji, onClose }: { emoji: Emoji; onClose: () => void }) {
  const isGif = emoji.imageUrl?.endsWith(".gif");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDownload = useCallback(async () => {
    if (!emoji.imageUrl) return;
    try {
      const res = await fetch(emoji.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${emoji.name}.${isGif ? "gif" : "png"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(emoji.imageUrl, "_blank");
    }
  }, [emoji, isGif]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* backdrop — ダイアログの外側クリックで閉じる */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        aria-label="モーダルを閉じる"
      />

      {/* dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 bg-background rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 w-[280px] mx-4"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="閉じる"
        >
          <X className="h-5 w-5" />
        </button>

        {emoji.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={emoji.imageUrl}
            alt={emoji.name}
            className="w-32 h-32 object-contain rounded-xl border bg-muted/20"
          />
        )}

        <p className="font-semibold text-lg text-center">{emoji.name}</p>

        <Button onClick={handleDownload} className="w-full" size="lg">
          <Download className="mr-2 h-4 w-4" />
          ダウンロード
        </Button>
      </div>
    </div>
  );
}

export function PublicEmojis() {
  const { data: emojis, isLoading } = api.emoji.listPublic.useQuery(
    { limit: 12 },
    { staleTime: 60 * 1000 }
  );
  const [selected, setSelected] = useState<Emoji | null>(null);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mt-12">
        <p className="text-sm text-muted-foreground text-center">読み込み中...</p>
      </div>
    );
  }

  if (!emojis?.length) return null;

  return (
    <>
      <div className="w-full max-w-4xl mt-12">
        <h3 className="text-sm font-semibold text-muted-foreground text-center mb-4 uppercase tracking-wider">
          みんなの絵文字
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {emojis.map((emoji) => (
            <button
              key={emoji.id}
              type="button"
              onClick={() => emoji.imageUrl && setSelected(emoji as Emoji)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-background/80 hover:bg-muted/50 hover:border-primary/40 transition-all"
              title={emoji.name}
            >
              {emoji.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={emoji.imageUrl}
                  alt={emoji.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                />
              )}
              <span className="text-xs text-muted-foreground">{emoji.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <EmojiModal emoji={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
