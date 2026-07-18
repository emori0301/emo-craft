"use client";

import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export type ShortcutItem = {
	/** 表示するキー（["Ctrl", "Z"] のように分割して渡す） */
	keys: string[];
	description: string;
};

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="inline-flex min-w-[1.6rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">
			{children}
		</kbd>
	);
}

/**
 * キーボードショートカット一覧ダイアログ。
 * ツールバーのボタン、または「?」キーで開く。
 */
export function ShortcutHelp({
	shortcuts,
	enabled = true,
}: {
	shortcuts: ShortcutItem[];
	/** false のとき「?」キーでの起動を無効化（非表示タブ用） */
	enabled?: boolean;
}) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!enabled) return;
		const onKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable
			) {
				return;
			}
			if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [enabled]);

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				className="px-2.5 text-muted-foreground"
				title="キーボードショートカット (?)"
				aria-label="キーボードショートカット一覧を開く"
				onClick={() => setOpen(true)}
			>
				<Keyboard className="h-4 w-4" />
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>キーボードショートカット</DialogTitle>
						<DialogDescription>
							<Kbd>?</Kbd> キーでいつでもこの一覧を開けます
						</DialogDescription>
					</DialogHeader>
					<ul className="space-y-2.5">
						{shortcuts.map((item) => (
							<li
								key={item.description}
								className="flex items-center justify-between gap-4"
							>
								<span className="text-sm">{item.description}</span>
								<span className="flex items-center gap-1 shrink-0">
									{item.keys.map((key, i) => (
										<span key={key} className="flex items-center gap-1">
											{i > 0 && (
												<span className="text-[10px] text-muted-foreground">
													+
												</span>
											)}
											<Kbd>{key}</Kbd>
										</span>
									))}
								</span>
							</li>
						))}
					</ul>
				</DialogContent>
			</Dialog>
		</>
	);
}
