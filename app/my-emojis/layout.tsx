import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "マイ絵文字",
	description: "保存した絵文字の一覧・ダウンロード・編集・削除。",
};

export default function MyEmojisLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return children;
}
