"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function Header() {
	const { data: session, isPending } = authClient.useSession();
	const [allowClick, setAllowClick] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setAllowClick(true), 1500);
		return () => clearTimeout(t);
	}, []);

	const showLoginButton = !isPending || allowClick;

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-16 items-center justify-between px-4">
				<Link
					href="/"
					className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
				>
					<span
						className="text-xl font-bold text-foreground"
						style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
					>
						emoCraft
					</span>
				</Link>
				<nav className="flex items-center gap-2">
					<Link href="/editor">
						<Button variant="ghost" size="sm" className="hidden sm:flex">
							編集
						</Button>
					</Link>
					<Link href="/my-emojis">
						<Button variant="ghost" size="sm" className="hidden sm:flex">
							マイ絵文字
						</Button>
					</Link>
					{session ? (
						<div className="flex items-center gap-2">
							<span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-24">
								{session.user.name ?? session.user.email}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => authClient.signOut()}
							>
								ログアウト
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={() => authClient.signIn.social({ provider: "google" })}
							disabled={!showLoginButton}
						>
							{showLoginButton ? "Googleでログイン" : "..."}
						</Button>
					)}
				</nav>
			</div>
		</header>
	);
}
