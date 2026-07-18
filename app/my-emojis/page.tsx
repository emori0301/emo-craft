"use client";

import { Download, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/trpc/react";

export default function MyEmojisPage() {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const {
		data,
		isLoading,
		refetch,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = api.emoji.listMine.useInfiniteQuery(
		{ limit: 30 },
		{
			enabled: !!session?.user,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
		},
	);
	const emojis = data?.pages.flatMap((page) => page.items);
	const deleteEmoji = api.emoji.delete.useMutation({
		onSuccess: () => refetch(),
	});
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);

	const handleDeleteConfirmed = async () => {
		if (!deleteTarget) return;
		const { id, name } = deleteTarget;
		setDeleteTarget(null);
		setDeletingId(id);
		try {
			await deleteEmoji.mutateAsync({ id });
			toast.success(`「${name}」を削除しました`);
		} catch (error) {
			toast.error(
				`削除に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
			);
		} finally {
			setDeletingId(null);
		}
	};

	if (sessionPending) {
		return (
			<div className="container py-8 px-4">
				<Skeleton className="h-10 w-48 mb-8" />
				<Skeleton className="h-64 w-full rounded-xl" />
			</div>
		);
	}

	if (!session?.user) {
		return (
			<div className="container py-8 px-4">
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
		<div className="container py-8 px-4">
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
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
							{Array.from({ length: 10 }, (_, i) => `sk-${i}`).map((key) => (
								<Skeleton key={key} className="h-40 rounded-xl" />
							))}
						</div>
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
								const isGif = emoji.imageMimeType === "image/gif";
								const imageUrl = `/api/images/${emoji.id}`;
								return (
									<div
										key={emoji.id}
										className="group relative flex flex-col items-center gap-2 p-3 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors"
									>
										<img
											src={imageUrl}
											alt={emoji.name}
											className="w-16 h-16 object-contain rounded"
										/>

										<span className="text-sm font-medium truncate max-w-full text-center">
											{emoji.name}
										</span>
										<span
											className={`text-xs px-2 py-0.5 rounded-full ${
												emoji.isPublic
													? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
													: "bg-muted text-muted-foreground"
											}`}
										>
											{emoji.isPublic ? "公開" : "非公開"}
										</span>

										{/* アクションボタン */}
										<div className="flex gap-1 mt-1">
											<a
												href={imageUrl}
												download={`${emoji.name}.${isGif ? "gif" : "png"}`}
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
												aria-label={`「${emoji.name}」を削除`}
												onClick={() =>
													setDeleteTarget({ id: emoji.id, name: emoji.name })
												}
												disabled={deletingId === emoji.id}
											>
												{deletingId === emoji.id ? (
													<Loader2 className="h-3.5 w-3.5 animate-spin" />
												) : (
													<Trash2 className="h-3.5 w-3.5" />
												)}
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}
					{hasNextPage && (
						<div className="flex justify-center mt-6">
							<Button
								variant="outline"
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
							>
								{isFetchingNextPage ? "読み込み中..." : "もっと見る"}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>絵文字を削除しますか？</AlertDialogTitle>
						<AlertDialogDescription>
							「{deleteTarget?.name}」を削除します。この操作は元に戻せません。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>キャンセル</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirmed}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							削除する
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
