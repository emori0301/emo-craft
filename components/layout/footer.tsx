import Link from "next/link";

export function Footer() {
	return (
		<footer className="border-t bg-card mt-auto">
			<div className="container flex flex-col sm:flex-row items-center justify-between gap-3 py-6 px-4 md:py-8">
				<p className="text-xs sm:text-sm text-muted-foreground">
					© 2026 emoCraft. All rights reserved.
				</p>
				<nav className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
					<Link
						href="/editor"
						className="hover:text-foreground transition-colors"
					>
						エディター
					</Link>
					<Link
						href="/my-emojis"
						className="hover:text-foreground transition-colors"
					>
						マイ絵文字
					</Link>
				</nav>
			</div>
		</footer>
	);
}
