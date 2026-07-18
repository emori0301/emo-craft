import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/lib/trpc/react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
	metadataBase: new URL(appUrl),
	title: {
		default: "emoCraft — Slack絵文字メーカー",
		template: "%s | emoCraft",
	},
	description:
		"テキストやピクセルアートから Slack 用のカスタム絵文字を簡単に作成。アニメーション GIF にも対応。",
	openGraph: {
		title: "emoCraft — Slack絵文字メーカー",
		description:
			"テキストやピクセルアートから Slack 用のカスタム絵文字を簡単に作成。アニメーション GIF にも対応。",
		url: appUrl,
		siteName: "emoCraft",
		locale: "ja_JP",
		type: "website",
	},
	twitter: {
		card: "summary",
		title: "emoCraft — Slack絵文字メーカー",
		description:
			"テキストやピクセルアートから Slack 用のカスタム絵文字を簡単に作成。",
	},
};

// ブランドロゴ用フォントのみグローバルに読み込む。
// エディター用の16フォントは app/editor/layout.tsx でのみ読み込む。
const BRAND_FONT_URL =
	"https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;900&display=swap";

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="ja" suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin=""
				/>
				<link href={BRAND_FONT_URL} rel="stylesheet" />
			</head>
			<body className={`${inter.variable} font-sans`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<TRPCReactProvider>
						<div className="flex min-h-screen flex-col">
							<Header />
							<main className="flex-1">{children}</main>
							<Footer />
						</div>
						<Toaster />
					</TRPCReactProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
