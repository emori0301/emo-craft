"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";

export function Header() {
	const { data: session, isPending } = authClient.useSession();
	const [menuOpen, setMenuOpen] = useState(false);
	const closeMenu = () => setMenuOpen(false);

	const authControls = session ? (
		<div className="flex items-center gap-2">
			<span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-24">
				{session.user.name ?? session.user.email}
			</span>
			<Button variant="outline" size="sm" onClick={() => authClient.signOut()}>
				ログアウト
			</Button>
		</div>
	) : isPending ? (
		<Skeleton className="h-9 w-36 rounded-md" />
	) : (
		<Button
			variant="outline"
			size="sm"
			onClick={() => authClient.signIn.social({ provider: "google" })}
		>
			Googleでログイン
		</Button>
	);

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
			<div className="container flex h-16 items-center justify-between px-4">
				<Link
					href="/"
					className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
				>
					{/* ピクセル調のロゴマーク */}
					<span
						aria-hidden="true"
						className="grid h-7 w-7 grid-cols-2 overflow-hidden rounded-lg rotate-3 shadow-sm"
					>
						<span className="bg-violet-500" />
						<span className="bg-pink-400" />
						<span className="bg-amber-400" />
						<span className="bg-emerald-400" />
					</span>
					<span
						className="text-xl font-bold text-foreground"
						style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
					>
						emoCraft
					</span>
				</Link>
				<nav
					className="flex items-center gap-2"
					aria-label="メインナビゲーション"
				>
					<Link href="/editor" className="hidden sm:block">
						<Button variant="ghost" size="sm">
							エディター
						</Button>
					</Link>
					<Link href="/my-emojis" className="hidden sm:block">
						<Button variant="ghost" size="sm">
							マイ絵文字
						</Button>
					</Link>
					{authControls}
					<ThemeToggle />
					<Button
						variant="ghost"
						size="sm"
						className="sm:hidden px-2"
						aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen((o) => !o)}
					>
						{menuOpen ? (
							<X className="h-5 w-5" />
						) : (
							<Menu className="h-5 w-5" />
						)}
					</Button>
				</nav>
			</div>

			{/* モバイルメニュー */}
			{menuOpen && (
				<nav
					className="sm:hidden border-t bg-background px-4 py-2 flex flex-col"
					aria-label="モバイルナビゲーション"
				>
					<Link
						href="/editor"
						onClick={closeMenu}
						className="py-2.5 text-sm font-medium hover:text-primary transition-colors"
					>
						エディター
					</Link>
					<Link
						href="/my-emojis"
						onClick={closeMenu}
						className="py-2.5 text-sm font-medium hover:text-primary transition-colors"
					>
						マイ絵文字
					</Link>
				</nav>
			)}
		</header>
	);
}
