import {
	FolderHeart,
	Grid3X3,
	ImagePlus,
	Smartphone,
	Type,
} from "lucide-react";
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
		icon: ImagePlus,
		title: "好きな画像を重ねる",
		description:
			"写真やイラストをアップロードして、ドラッグで移動・ピンチで拡大・回転",
	},
	{
		icon: Grid3X3,
		title: "ドット絵エディタ",
		description:
			"ドット絵を一から描いたり、画像をドット絵に変換してアニメーション GIF に",
	},
	{
		icon: FolderHeart,
		title: "保存・共有",
		description: "作った絵文字を保存して管理、公開ギャラリーでシェアも",
	},
	{
		icon: Smartphone,
		title: "スマホでも快適",
		description: "タッチ操作に最適化。カメラロールの写真からもすぐ作れる",
	},
];

export default function Home() {
	return (
		<div className="container px-4 py-6 sm:py-8">
			<section className="flex flex-col items-center justify-center space-y-6 py-10 sm:py-24">
				<div className="space-y-4 text-center max-w-2xl">
					<h1
						className="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground pb-1"
						style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
					>
						emoCraft
					</h1>
					<p className="mx-auto text-base text-muted-foreground sm:text-lg">
						テキスト・画像・ドット絵で Slack 絵文字を作ろう
					</p>
				</div>
				<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
					<Button
						asChild
						size="lg"
						className="px-8 py-6 text-base shadow-md shadow-primary/25 sm:text-lg"
					>
						<Link href="/editor">はじめる</Link>
					</Button>
					<Button
						asChild
						variant="outline"
						size="lg"
						className="px-8 py-6 text-base sm:text-lg"
					>
						<Link href="#templates">テンプレートを見る</Link>
					</Button>
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
				<div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{FEATURES.map(({ icon: Icon, title, description }) => (
						<Card
							key={title}
							className="transition-all hover:-translate-y-0.5 hover:shadow-lg"
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
