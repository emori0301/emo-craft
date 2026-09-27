"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ href: "/editor", label: "エディター" },
	{ href: "/my-emojis", label: "マイ絵文字" },
];

export function Header() {
	const { data: session, isPending } = authClient.useSession();
	const pathname = usePathname();
	const [menuOpen, setMenuOpen] = useState(false);

	// ページ遷移したらモバイルメニューを閉じる
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname の変化をトリガーにする
	useEffect(() => {
		setMenuOpen(false);
	}, [pathname]);

	const isActive = (href: string) => pathname?.startsWith(href) ?? false;

	const authControls = session ? (
		<div className="flex items-center gap-2">
			<span className="hidden max-w-24 truncate text-sm text-muted-foreground md:inline">
				{session.user.name ?? session.user.email}
			</span>
			<Button
				variant="outline"
				size="sm"
				className="hidden sm:inline-flex"
				onClick={() => authClient.signOut()}
			>
				ログアウト
			</Button>
		</div>
	) : isPending ? (
		<Skeleton className="h-9 w-20 rounded-md sm:w-36" />
	) : (
		<Button
			variant="outline"
			size="sm"
			onClick={() => authClient.signIn.social({ provider: "google" })}
		>
			<span className="sm:hidden">ログイン</span>
			<span className="hidden sm:inline">Googleでログイン</span>
		</Button>
	);

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-card/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
			<div className="container flex h-16 items-center justify-between gap-2 px-4">
				<Link
					href="/"
					className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
				>
					{/* ピクセル調のロゴマーク */}
					<span
						aria-hidden="true"
						className="grid h-7 w-7 rotate-3 grid-cols-2 overflow-hidden rounded-lg shadow-sm"
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
					className="flex items-center gap-1 sm:gap-2"
					aria-label="メインナビゲーション"
				>
					{NAV_ITEMS.map(({ href, label }) => (
						<Button
							key={href}
							asChild
							variant="ghost"
							size="sm"
							className={cn(
								"hidden sm:inline-flex",
								isActive(href) && "bg-accent text-foreground",
							)}
						>
							<Link
								href={href}
								aria-current={isActive(href) ? "page" : undefined}
							>
								{label}
							</Link>
						</Button>
					))}
					{authControls}
					<ThemeToggle />
					<Button
						variant="ghost"
						size="sm"
						className="px-2 sm:hidden"
						aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
						aria-expanded={menuOpen}
						aria-controls="mobile-menu"
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
					id="mobile-menu"
					className="flex flex-col border-t bg-card px-4 py-2 sm:hidden"
					aria-label="モバイルナビゲーション"
				>
					{NAV_ITEMS.map(({ href, label }) => (
						<Link
							key={href}
							href={href}
							aria-current={isActive(href) ? "page" : undefined}
							className={cn(
								"rounded-md px-2 py-3 text-base font-medium transition-colors hover:bg-accent",
								isActive(href) && "text-primary",
							)}
						>
							{label}
						</Link>
					))}
					{session && (
						<div className="mt-1 flex items-center justify-between gap-3 border-t px-2 pt-3 pb-1">
							<span className="truncate text-sm text-muted-foreground">
								{session.user.name ?? session.user.email}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setMenuOpen(false);
									authClient.signOut();
								}}
							>
								ログアウト
							</Button>
						</div>
					)}
				</nav>
			)}
		</header>
	);
}
