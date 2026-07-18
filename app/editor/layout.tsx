import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "エディター",
	description:
		"テキストまたはピクセルアートで Slack 用カスタム絵文字を作成。PNG / アニメーション GIF で書き出せます。",
};

// テキストエディターのフォントピッカーで使う日本語フォント。
// 重いのでエディタールートでのみ読み込む。
const EDITOR_FONT_URL_1 =
	"https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Noto+Serif+JP:wght@400;700;900&family=M+PLUS+Rounded+1c:wght@400;700;900&family=Kosugi+Maru&family=Zen+Maru+Gothic:wght@400;700;900&family=Zen+Kaku+Gothic+New:wght@400;700;900&family=BIZ+UDPGothic:wght@400;700&display=swap";

const EDITOR_FONT_URL_2 =
	"https://fonts.googleapis.com/css2?family=DotGothic16&family=Dela+Gothic+One&family=Hachi+Maru+Pop&family=Zen+Antique:wght@400;700&family=Kaisei+Decol:wght@400;700&family=New+Tegomin&family=Yomogi&family=Reggae+One&family=RocknRoll+One&display=swap";

export default function EditorLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<>
			{/* React 19 が <head> へ巻き上げてくれる */}
			<link href={EDITOR_FONT_URL_1} rel="stylesheet" precedence="default" />
			<link href={EDITOR_FONT_URL_2} rel="stylesheet" precedence="default" />
			{children}
		</>
	);
}
