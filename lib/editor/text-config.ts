/** テキストエディターの静的設定（フォント・アニメーション定義） */

export const FONTS = [
	{ value: "Noto Sans JP", label: "Noto Sans JP" },
	{ value: "Noto Serif JP", label: "Noto Serif JP" },
	{ value: "M PLUS Rounded 1c", label: "Mプラスラウンド1c" },
	{ value: "Kosugi Maru", label: "こすぎ丸" },
	{ value: "Zen Maru Gothic", label: "ゼン・マル・ゴシック" },
	{ value: "Zen Kaku Gothic New", label: "ゼン・カク・ゴシック New" },
	{ value: "BIZ UDPGothic", label: "BIZ UDPゴシック" },
	{ value: "DotGothic16", label: "ドットゴシック16" },
	{ value: "Dela Gothic One", label: "デラゴシック" },
	{ value: "Hachi Maru Pop", label: "はちまるポップ" },
	{ value: "Zen Antique", label: "ゼン・アンティーク" },
	{ value: "Kaisei Decol", label: "カイセイデコール" },
	{ value: "New Tegomin", label: "ニューテゴミン" },
	{ value: "Yomogi", label: "よもぎ" },
	{ value: "Reggae One", label: "レゲエ" },
	{ value: "RocknRoll One", label: "ロックンロール" },
];

export const FONT_WEIGHTS = [
	{ value: "400", label: "標準" },
	{ value: "700", label: "太字" },
	{ value: "900", label: "極太" },
];

export type TextAlign = "left" | "center" | "right";
export const TEXT_ALIGNS: { value: TextAlign; label: string }[] = [
	{ value: "left", label: "左揃え" },
	{ value: "center", label: "中央揃え" },
	{ value: "right", label: "右揃え" },
];

export type AnimType =
	| "fadeIn"
	| "blink"
	| "flash"
	| "scroll"
	| "slideUp"
	| "slideDown"
	| "zoomIn"
	| "zoomOut"
	| "pulse"
	| "bounce"
	| "shake"
	| "spin"
	| "rainbow"
	| "neon"
	| "glitch"
	| "typewriter";

export type AnimParams = {
	alpha: number;
	offsetX: number;
	offsetY: number;
	hueShift: number;
	scale: number;
	rotate: number;
	shadowBlur: number;
	shadowColor: string;
	clipReveal: number; // 0-1: typewriter left-to-right reveal
};

export const AP0: AnimParams = {
	alpha: 1,
	offsetX: 0,
	offsetY: 0,
	hueShift: 0,
	scale: 1,
	rotate: 0,
	shadowBlur: 0,
	shadowColor: "",
	clipReveal: 1,
};

export type AnimConfig = {
	label: string;
	frames: number;
	delay: number;
	getParams: (f: number, t: number, s: number) => AnimParams;
};

// biome-ignore format: 表形式を保つ
export const ANIM_CONFIGS: Record<AnimType, AnimConfig> = {
	fadeIn:     { label: "フェードイン",   frames: 10, delay: 80,  getParams: (f,t)   => ({ ...AP0, alpha: f / (t-1) }) },
	blink:      { label: "点滅",          frames: 6,  delay: 300, getParams: (f)     => ({ ...AP0, alpha: f%2===0 ? 1 : 0 }) },
	flash:      { label: "フラッシュ",     frames: 8,  delay: 60,  getParams: (f)     => ({ ...AP0, alpha: f%2===0 ? 1 : 0.05 }) },
	scroll:     { label: "スクロール",     frames: 14, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetX: Math.round(s*(1-f/(t-1))) }) },
	slideUp:    { label: "上スライド",     frames: 12, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetY: Math.round(s*(1-f/(t-1))) }) },
	slideDown:  { label: "下スライド",     frames: 12, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetY: Math.round(-s*(1-f/(t-1))) }) },
	zoomIn:     { label: "ズームイン",     frames: 10, delay: 80,  getParams: (f,t)   => ({ ...AP0, scale: 0.05 + 0.95*(f/(t-1)) }) },
	zoomOut:    { label: "ズームアウト",   frames: 10, delay: 80,  getParams: (f,t)   => ({ ...AP0, scale: 1 - 0.95*(f/(t-1)) }) },
	pulse:      { label: "ドキドキ",      frames: 14, delay: 70,  getParams: (f,t)   => ({ ...AP0, scale: 0.8 + 0.25*Math.abs(Math.sin(f/t*Math.PI*2)) }) },
	bounce:     { label: "バウンド",      frames: 14, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetY: Math.round(-Math.abs(Math.sin(f/t*Math.PI*2))*s*0.14) }) },
	shake:      { label: "ゆれる",        frames: 10, delay: 55,  getParams: (f,_,s) => ({ ...AP0, offsetX: Math.round(Math.sin(f*3.14)*s*0.05) }) },
	spin:       { label: "回転",          frames: 12, delay: 70,  getParams: (f,t)   => ({ ...AP0, rotate: 360*f/t, scale: 0.65 }) },
	rainbow:    { label: "虹色",          frames: 16, delay: 60,  getParams: (f,t)   => ({ ...AP0, hueShift: 360*f/t }) },
	neon:       { label: "ネオン",        frames: 14, delay: 75,  getParams: (f,t,s) => ({ ...AP0, shadowBlur: s*0.10*Math.abs(Math.sin(f/t*Math.PI*2)), shadowColor: "#ffffff" }) },
	glitch:     { label: "グリッチ",      frames: 8,  delay: 60,  getParams: (f,_,s) => ({ ...AP0, offsetX: Math.round(Math.sin(f*2.3)*s*0.025), hueShift: (f*87)%360 }) },
	typewriter: { label: "タイプ表示",     frames: 14, delay: 80,  getParams: (f,t)   => ({ ...AP0, clipReveal: f/(t-1) }) },
};

/**
 * テキストを行数・文字数制限（2行 / 各行5文字 / 計10文字）に収める
 */
export function trimToLimit(val: string): string {
	const { lines } = val
		.split("\n")
		.slice(0, 2)
		.reduce<{ lines: string[]; total: number }>(
			({ lines, total }, l) => {
				const remaining = 10 - total;
				if (remaining <= 0) return { lines, total };
				const capped = l.slice(0, Math.min(5, remaining));
				return capped
					? { lines: [...lines, capped], total: total + capped.length }
					: { lines, total };
			},
			{ lines: [], total: 0 },
		);
	return lines.join("\n");
}
