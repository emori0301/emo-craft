/**
 * テキストエディターのキャンバス上で動かせる要素（文字ボックス・画像レイヤー）の
 * 座標計算（純関数）。
 *
 * 座標系: x / y はキャンバスに対する中心位置の割合（0〜1）。
 * scale はキャンバス幅に対する要素の幅の割合。rotation は度。
 */

export type Transform = {
	x: number;
	y: number;
	scale: number;
	rotation: number;
};

export type ImageLayer = Transform & {
	id: string;
	/** 縮小済みの画像 data URL */
	src: string;
	/** 画像の縦横比（高さ / 幅） */
	aspect: number;
	flipX: boolean;
	opacity: number;
	/** true なら文字の後ろに描く */
	behindText: boolean;
};

/** キャンバス上で選択できる対象（文字ボックス or 画像レイヤー id） */
export const TEXT_TARGET = "text";

export const DEFAULT_TEXT_TRANSFORM: Transform = {
	x: 0.5,
	y: 0.5,
	scale: 1,
	rotation: 0,
};

export const SCALE_LIMITS = { min: 0.05, max: 3 } as const;
export const TEXT_SCALE_LIMITS = { min: 0.2, max: 1.5 } as const;
export const MAX_IMAGE_LAYERS = 6;

/** 中心付近に吸着させる距離（キャンバス比） */
const SNAP_DISTANCE = 0.02;

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** 角度を -180〜180 に正規化する */
export function normalizeRotation(deg: number): number {
	const r = ((((deg + 180) % 360) + 360) % 360) - 180;
	return r === -180 ? 180 : r;
}

/** 中心が必ずキャンバス内に残るよう位置を丸め、中央付近は吸着させる */
export function constrainPosition(
	x: number,
	y: number,
	snap = true,
): { x: number; y: number } {
	const snapAxis = (v: number) =>
		snap && Math.abs(v - 0.5) < SNAP_DISTANCE ? 0.5 : v;
	return { x: clamp(snapAxis(x), 0, 1), y: clamp(snapAxis(y), 0, 1) };
}

/** 画像の初期配置: 長辺がキャンバスの 80% に収まる中央配置 */
export function createImageLayer(
	id: string,
	src: string,
	width: number,
	height: number,
): ImageLayer {
	const aspect = height / Math.max(1, width);
	const fit = 0.8;
	return {
		id,
		src,
		aspect,
		x: 0.5,
		y: 0.5,
		// 極端に縦長な画像でもスライダーの下限を割らないようにする
		scale: Math.max(SCALE_LIMITS.min, aspect > 1 ? fit / aspect : fit),
		rotation: 0,
		flipX: false,
		opacity: 1,
		behindText: false,
	};
}

/** 要素のピクセルサイズ（文字ボックスは正方形） */
export function boxSize(
	target: Transform & { aspect?: number },
	size: number,
): { w: number; h: number } {
	const w = target.scale * size;
	return { w, h: w * (target.aspect ?? 1) };
}

/** キャンバス座標 (px, py) を要素のローカル座標（中心原点・回転解除）に変換 */
export function toLocal(
	target: Transform,
	px: number,
	py: number,
	size: number,
): { lx: number; ly: number } {
	const dx = px - target.x * size;
	const dy = py - target.y * size;
	const rad = (-target.rotation * Math.PI) / 180;
	return {
		lx: dx * Math.cos(rad) - dy * Math.sin(rad),
		ly: dx * Math.sin(rad) + dy * Math.cos(rad),
	};
}

export function hitTest(
	target: Transform & { aspect?: number },
	px: number,
	py: number,
	size: number,
	tolerance = 0,
): boolean {
	const { w, h } = boxSize(target, size);
	const { lx, ly } = toLocal(target, px, py, size);
	return Math.abs(lx) <= w / 2 + tolerance && Math.abs(ly) <= h / 2 + tolerance;
}

/** 要素の右下角（拡大・回転ハンドルの位置）をキャンバス座標で返す */
export function handlePosition(
	target: Transform & { aspect?: number },
	size: number,
): { x: number; y: number } {
	const { w, h } = boxSize(target, size);
	const rad = (target.rotation * Math.PI) / 180;
	const hx = w / 2;
	const hy = h / 2;
	return {
		x: target.x * size + hx * Math.cos(rad) - hy * Math.sin(rad),
		y: target.y * size + hx * Math.sin(rad) + hy * Math.cos(rad),
	};
}

/**
 * 画面上に表示するハンドル位置。要素がキャンバスからはみ出していても
 * 掴めるよう、キャンバスの内側（margin px）に収める。
 */
export function visibleHandlePosition(
	target: Transform & { aspect?: number },
	size: number,
	margin: number,
): { x: number; y: number } {
	const p = handlePosition(target, size);
	return {
		x: clamp(p.x, margin, size - margin),
		y: clamp(p.y, margin, size - margin),
	};
}

/** 描画順（後ろ → 前）: 文字の後ろのレイヤー、文字、文字の前のレイヤー */
export function layersInDrawOrder(layers: ImageLayer[]): {
	behind: ImageLayer[];
	front: ImageLayer[];
} {
	return {
		behind: layers.filter((l) => l.behindText),
		front: layers.filter((l) => !l.behindText),
	};
}

export type FindTargetOptions = {
	/**
	 * 文字の実際の形（字面）に当たっているか。文字ボックスは既定で全面を覆うため、
	 * 指定すると字の隙間から後ろの画像を選べるようになる。
	 */
	textHit?: (px: number, py: number) => boolean;
	/** 選択中の要素。ボックス内なら他の要素より優先する（重なっていても掴み直せる） */
	preferId?: string | null;
};

/**
 * 指定位置で一番手前にある要素を返す（前面の画像 → 文字 → 背面の画像の順に判定）。
 * 文字ボックスは textTransform が null（文字なし）のときは対象外。
 */
export function findTargetAt(
	layers: ImageLayer[],
	textTransform: Transform | null,
	px: number,
	py: number,
	size: number,
	{ textHit, preferId }: FindTargetOptions = {},
): string | null {
	const isTextAt = () =>
		!!textTransform &&
		hitTest(textTransform, px, py, size) &&
		(textHit ? textHit(px, py) : true);

	if (preferId === TEXT_TARGET && isTextAt()) return TEXT_TARGET;
	const preferred = layers.find((l) => l.id === preferId);
	if (preferred && hitTest(preferred, px, py, size)) return preferred.id;

	const { behind, front } = layersInDrawOrder(layers);
	for (const layer of [...front].reverse()) {
		if (hitTest(layer, px, py, size)) return layer.id;
	}
	if (isTextAt()) return TEXT_TARGET;
	for (const layer of [...behind].reverse()) {
		if (hitTest(layer, px, py, size)) return layer.id;
	}
	return null;
}

/** レイヤーを最前面 / 最背面へ移動する（同じグループ内の順序も変わる） */
export function moveLayer(
	layers: ImageLayer[],
	id: string,
	to: "front" | "back",
): ImageLayer[] {
	const target = layers.find((l) => l.id === id);
	if (!target) return layers;
	const rest = layers.filter((l) => l.id !== id);
	return to === "front" ? [...rest, target] : [target, ...rest];
}
