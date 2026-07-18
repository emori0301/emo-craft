import Link from "next/link";
import { PublicEmojis } from "@/components/home/public-emojis";
import { TemplateGallery } from "@/components/home/template-gallery";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function Home() {
	return (
		<div className="container py-8 px-4">
			<section className="flex flex-col items-center justify-center space-y-6 py-16 sm:py-24">
				<div className="space-y-4 text-center max-w-2xl">
					<h1
						className="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground"
						style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
					>
						emoCraft
					</h1>
					<p className="mx-auto text-base text-muted-foreground sm:text-lg">
						テキストやピクセルアートでSlack絵文字を作ろう
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-4">
					<Link href="/editor">
						<Button size="lg" className="text-base sm:text-lg px-8 py-6">
							はじめる
						</Button>
					</Link>
				</div>

				<PublicEmojis />
			</section>

			<TemplateGallery />

			<section className="py-12 sm:py-16">
				<h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
					機能
				</h2>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader>
							<CardTitle className="text-xl">テキストエディタ</CardTitle>
							<CardDescription>
								フォントや色をカスタムしてテキストから絵文字を作成
							</CardDescription>
						</CardHeader>
					</Card>

					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader>
							<CardTitle className="text-xl">ピクセルエディタ</CardTitle>
							<CardDescription>
								ピクセルアートを一から描いて絵文字を作成
							</CardDescription>
						</CardHeader>
					</Card>

					<Card className="hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
						<CardHeader>
							<CardTitle className="text-xl">保存・管理</CardTitle>
							<CardDescription>作った絵文字を保存して管理</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</section>
		</div>
	);
}
