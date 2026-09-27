"use client";

import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/trpc/react";

type Emoji = {
	id: string;
	name: string;
	imageMimeType: string;
};

function EmojiDialog({
	emoji,
	open,
	onClose,
}: {
	emoji: Emoji | null;
	open: boolean;
	onClose: () => void;
}) {
	const isGif = emoji?.imageMimeType === "image/gif";
	const imageUrl = emoji ? `/api/images/${emoji.id}` : "";

	const handleDownload = useCallback(async () => {
		if (!emoji) return;
		try {
			const res = await fetch(imageUrl);
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${emoji.name}.${isGif ? "gif" : "png"}`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			window.open(imageUrl, "_blank");
		}
	}, [emoji, imageUrl, isGif]);

	return (
		<Dialog open={open && !!emoji} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-xs">
				{emoji && (
					<div className="flex flex-col items-center gap-5 pt-2">
						<DialogHeader>
							<DialogTitle className="text-center">{emoji.name}</DialogTitle>
						</DialogHeader>
						<img
							src={imageUrl}
							alt={emoji.name}
							className="h-32 w-32 rounded-xl border bg-muted/20 object-contain"
						/>
						<Button onClick={handleDownload} className="w-full" size="lg">
							<Download className="h-4 w-4" />
							ダウンロード
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

export function PublicEmojis() {
	const { data, isLoading } = api.emoji.listPublic.useQuery(
		{ limit: 12 },
		{ staleTime: 60 * 1000 },
	);
	const emojis = data?.items;
	// 閉じるアニメーション中も中身を表示し続けるため、選択と開閉を分けて持つ
	const [selected, setSelected] = useState<Emoji | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="w-full max-w-4xl mt-12">
				<div className="flex flex-wrap justify-center gap-3">
					{Array.from({ length: 8 }, (_, i) => `sk-${i}`).map((key) => (
						<Skeleton key={key} className="w-20 h-24 rounded-lg" />
					))}
				</div>
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
				<div className="flex flex-wrap justify-center gap-2 sm:gap-3">
					{emojis.map((emoji) => (
						<button
							key={emoji.id}
							type="button"
							onClick={() => {
								setSelected(emoji);
								setDialogOpen(true);
							}}
							className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-background/80 hover:bg-muted/50 hover:border-primary/40 transition-all"
							title={emoji.name}
						>
							<img
								src={`/api/images/${emoji.id}`}
								alt={emoji.name}
								className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
							/>
							<span className="text-xs text-muted-foreground">
								{emoji.name}
							</span>
						</button>
					))}
				</div>
			</div>

			<EmojiDialog
				emoji={selected}
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
			/>
		</>
	);
}
