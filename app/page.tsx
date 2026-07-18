import { FolderHeart, Grid3X3, Type } from "lucide-react";
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

const FEATURES = [
	{
		icon: Type,
		title: "テキストエディタ",
		description:
			"フォント・色・グラデーション・アニメーションで文字絵文字を作成",
	},
	{
		icon: Grid3X3,
		title: "ピクセルエディタ",
		description: "ドット絵を一から描いてアニメーション GIF 絵文字も作れる",
	},
	{
		icon: FolderHeart,
		title: "保存・共有",
		description: "作った絵文字を保存して管理、公開ギャラリーでシェアも",
	},
];

export default function Home() {
	return (
		<div className="container py-8 px-4">
			<section className="flex flex-col items-center justify-center space-y-6 py-16 sm:py-24">
				<div className="space-y-4 text-center max-w-2xl">
					<h1
						className="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground pb-1"
						style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
					>
						emoCraft
					</h1>
					<p className="mx-auto text-base text-muted-foreground sm:text-lg">
						テキストやピクセルアートでSlack絵文字を作ろう
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-3">
					<Link href="/editor">
						<Button
							size="lg"
							className="text-base sm:text-lg px-8 py-6 shadow-md shadow-primary/25"
						>
							はじめる
						</Button>
					</Link>
					<Link href="#templates">
						<Button
							variant="outline"
							size="lg"
							className="text-base sm:text-lg px-8 py-6"
						>
							テンプレートを見る
						</Button>
					</Link>
				</div>

				<PublicEmojis />
			</section>

			<div id="templates" className="scroll-mt-20">
				<TemplateGallery />
			</div>

			<section className="py-12 sm:py-16">
				<h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
					機能
				</h2>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURES.map(({ icon: Icon, title, description }) => (
						<Card
							key={title}
							className="hover:shadow-lg hover:-translate-y-0.5 transition-all last:sm:col-span-2 last:lg:col-span-1"
						>
							<CardHeader>
								<div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Icon className="h-5 w-5" />
								</div>
								<CardTitle className="text-xl">{title}</CardTitle>
								<CardDescription>{description}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</section>
		</div>
	);
}
