"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/trpc/react";
import { authClient } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MyEmojisPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: emojis, isLoading, refetch } = api.emoji.listMine.useQuery(
    undefined,
    { enabled: !!session?.user }
  );
  const deleteEmoji = api.emoji.delete.useMutation({ onSuccess: () => refetch() });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("この絵文字を削除しますか？")) return;
    setDeletingId(id);
    try {
      await deleteEmoji.mutateAsync({ id });
    } finally {
      setDeletingId(null);
    }
  };

  if (sessionPending) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">マイ絵文字</h1>
          <p className="text-muted-foreground">
            ログインして絵文字を保存・管理しましょう
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Button
              onClick={() => authClient.signIn.social({ provider: "google" })}
              size="lg"
            >
              Googleでログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">マイ絵文字</h1>
        <Button asChild>
          <Link href="/editor">+ 新規作成</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>保存済み絵文字</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-12 text-center">
              読み込み中...
            </p>
          ) : !emojis?.length ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-muted-foreground">
                絵文字を作成するとここに表示されます
              </p>
              <Button asChild>
                <Link href="/editor">絵文字を作成</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {emojis.map((emoji) => {
                const isGif = emoji.imageUrl?.endsWith(".gif");
                return (
                  <div
                    key={emoji.id}
                    className="group relative flex flex-col items-center gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors"
                  >
                    {emoji.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={emoji.imageUrl}
                        alt={emoji.name}
                        className="w-16 h-16 object-contain rounded"
                      />
                    )}
                    <span className="text-sm font-medium truncate max-w-full text-center">
                      {emoji.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      emoji.isPublic
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {emoji.isPublic ? "公開" : "非公開"}
                    </span>

                    {/* アクションボタン */}
                    <div className="flex gap-1 mt-1">
                      {emoji.imageUrl && (
                        <a
                          href={emoji.imageUrl}
                          download={`${emoji.name}.${isGif ? "gif" : "png"}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="ダウンロード"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                      <Link href={`/editor?edit=${emoji.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="編集"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:border-red-300"
                        title="削除"
                        onClick={() => handleDelete(emoji.id)}
                        disabled={deletingId === emoji.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
