"use client";

import { api } from "@/lib/trpc/react";
import { authClient } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MyEmojisPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: emojis, isLoading } = api.emoji.listMine.useQuery(undefined, {
    enabled: !!session?.user,
  });

  if (sessionPending) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Emojis</h1>
          <p className="text-muted-foreground">
            Sign in to save and manage your emojis
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Button
              onClick={() => authClient.signIn.social({ provider: "google" })}
              size="lg"
            >
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Emojis</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Emojis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-12 text-center">
              Loading...
            </p>
          ) : !emojis?.length ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-muted-foreground">
                Create emojis to see them here
              </p>
              <Button asChild>
                <Link href="/editor">Create Emoji</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {emojis.map((emoji) => (
                <div
                  key={emoji.id}
                  className="flex flex-col items-center gap-2 p-2 rounded-lg border hover:bg-muted/50"
                >
                  {emoji.imageUrl && (
                    <img
                      src={emoji.imageUrl}
                      alt={emoji.name}
                      className="w-16 h-16 object-contain"
                    />
                  )}
                  <span className="text-sm font-medium truncate max-w-full">
                    :{emoji.name}:
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {emoji.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
