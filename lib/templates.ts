/**
 * テキスト絵文字のプリセットテンプレート。
 * ホームのギャラリーから 1 クリックでエディターに流し込む。
 * （MVP はハードコード。DB の EmojiTemplate 活用は将来対応）
 */

export type EmojiTextTemplate = {
	id: string;
	/** 一覧に表示する名前 */
	label: string;
	text: string;
	fontFamily: string;
	fontWeight: string;
	textColor: string;
	/** 空文字は透明背景 */
	backgroundColor: string;
};

export const EMOJI_TEMPLATES: EmojiTextTemplate[] = [
	{
		id: "kusa",
		label: "草",
		text: "草",
		fontFamily: "Dela Gothic One",
		fontWeight: "700",
		textColor: "#16a34a",
		backgroundColor: "",
	},
	{
		id: "kami",
		label: "神",
		text: "神",
		fontFamily: "Zen Antique",
		fontWeight: "900",
		textColor: "#f59e0b",
		backgroundColor: "",
	},
	{
		id: "otsukare",
		label: "おつかれさま",
		text: "おつ\nかれ",
		fontFamily: "Hachi Maru Pop",
		fontWeight: "700",
		textColor: "#db2777",
		backgroundColor: "",
	},
	{
		id: "ryokai",
		label: "了解",
		text: "了解",
		fontFamily: "Noto Sans JP",
		fontWeight: "900",
		textColor: "#ffffff",
		backgroundColor: "#2563eb",
	},
	{
		id: "kansha",
		label: "感謝",
		text: "感謝",
		fontFamily: "Noto Serif JP",
		fontWeight: "700",
		textColor: "#dc2626",
		backgroundColor: "",
	},
	{
		id: "iwai",
		label: "祝",
		text: "祝",
		fontFamily: "Zen Antique",
		fontWeight: "900",
		textColor: "#ffffff",
		backgroundColor: "#dc2626",
	},
	{
		id: "saikou",
		label: "最高",
		text: "最高",
		fontFamily: "RocknRoll One",
		fontWeight: "700",
		textColor: "#7c3aed",
		backgroundColor: "",
	},
	{
		id: "tasukaru",
		label: "助かる",
		text: "助か\nる",
		fontFamily: "Kosugi Maru",
		fontWeight: "700",
		textColor: "#0891b2",
		backgroundColor: "",
	},
	{
		id: "sasuga",
		label: "さすが",
		text: "さす\nが",
		fontFamily: "M PLUS Rounded 1c",
		fontWeight: "900",
		textColor: "#ea580c",
		backgroundColor: "",
	},
	{
		id: "naruhodo",
		label: "なるほど",
		text: "なる\nほど",
		fontFamily: "Zen Maru Gothic",
		fontWeight: "700",
		textColor: "#059669",
		backgroundColor: "",
	},
];

export function findTemplate(id: string): EmojiTextTemplate | undefined {
	return EMOJI_TEMPLATES.find((t) => t.id === id);
}
