import Link from "next/link";
import { EMOJI_TEMPLATES } from "@/lib/templates";

/**
 * ホームのプリセットギャラリー。
 * クリックでテンプレートをエディターに流し込む（/editor?preset=<id>）。
 */
export function TemplateGallery() {
	return (
		<section className="py-12 sm:py-16">
			<h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
				テンプレートからすぐ作る
			</h2>
			<p className="text-sm text-muted-foreground text-center mb-8">
				クリックするとエディターで色やフォントを調整できます
			</p>
			<div className="flex flex-wrap justify-center gap-3">
				{EMOJI_TEMPLATES.map((template) => (
					<Link
						key={template.id}
						href={`/editor?preset=${template.id}`}
						className="group flex flex-col items-center gap-1.5"
						title={`「${template.label}」をエディターで開く`}
					>
						<span
							className="flex h-20 w-20 items-center justify-center rounded-xl border text-center leading-tight whitespace-pre-line transition group-hover:scale-105 group-hover:border-primary/50 group-hover:shadow"
							style={{
								fontFamily: `'${template.fontFamily}', sans-serif`,
								fontWeight: Number(template.fontWeight),
								color: template.textColor,
								backgroundColor: template.backgroundColor || undefined,
								fontSize: template.text.includes("\n")
									? "1.1rem"
									: template.text.length > 2
										? "1.2rem"
										: "2rem",
							}}
						>
							{template.text}
						</span>
						<span className="text-xs text-muted-foreground">
							{template.label}
						</span>
					</Link>
				))}
			</div>
		</section>
	);
}
