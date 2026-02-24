"use client";

import { api } from "@/lib/trpc/react";

export function PublicEmojis() {
  const { data: emojis, isLoading } = api.emoji.listPublic.useQuery(
    { limit: 12 },
    { staleTime: 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mt-12">
        <p className="text-sm text-muted-foreground text-center">
          Loading latest emojis...
        </p>
      </div>
    );
  }

  if (!emojis?.length) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mt-12">
      <h3 className="text-sm font-semibold text-muted-foreground text-center mb-4 uppercase tracking-wider">
        Latest Public Emojis
      </h3>
      <div className="flex flex-wrap justify-center gap-3">
        {emojis.map((emoji) => (
          <div
            key={emoji.id}
            className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-background/80 hover:bg-muted/50 transition-colors"
          >
            {emoji.imageUrl && (
              <img
                src={emoji.imageUrl}
                alt={emoji.name}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
              />
            )}
            <span className="text-xs text-muted-foreground">:{emoji.name}:</span>
          </div>
        ))}
      </div>
    </div>
  );
}
