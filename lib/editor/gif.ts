import { blobToDataUrl } from "./download";

export type GifFrame = {
	imageData: ImageData;
	/** フレーム表示時間 (ms) */
	delay: number;
};

export type EncodeGifOptions = {
	/** 透過 GIF として書き出す（アルファ < 128 のピクセルを透明にする） */
	transparent?: boolean;
	/** パレットの色数（少ないほどファイルが小さくなる） */
	maxColors?: number;
};

type ExactPalette = {
	palette: number[][];
	index: Uint8Array;
	transparentIndex: number;
};

/**
 * 色数が maxColors 以下なら、減色せずにそのままのパレットを作る（ドット絵向け）。
 * 減色（量子化）すると近い色がまとまってしまうため、使えるときはこちらを優先する。
 * transparent のときはアルファ < 128 を1つの透明色にまとめる。
 */
export function exactPalette(
	data: Uint8ClampedArray,
	transparent: boolean,
	maxColors = 256,
): ExactPalette | null {
	const lookup = new Map<number, number>();
	const palette: number[][] = [];
	const index = new Uint8Array(data.length / 4);
	let transparentIndex = -1;
	for (let p = 0; p < index.length; p++) {
		const i = p * 4;
		let key: number;
		if (transparent && data[i + 3] < 128) {
			key = -1;
		} else {
			key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
		}
		let idx = lookup.get(key);
		if (idx === undefined) {
			if (palette.length >= maxColors) return null;
			idx = palette.length;
			lookup.set(key, idx);
			if (key === -1) {
				palette.push([0, 0, 0, 0]);
				transparentIndex = idx;
			} else {
				palette.push(
					transparent
						? [data[i], data[i + 1], data[i + 2], 255]
						: [data[i], data[i + 1], data[i + 2]],
				);
			}
		}
		index[p] = idx;
	}
	return { palette, index, transparentIndex };
}

/** フレーム全体で使われている色の数（cap を超えたら打ち切る） */
export function countColors(frames: GifFrame[], cap = 257): number {
	const seen = new Set<number>();
	for (const { imageData } of frames) {
		const d = imageData.data;
		for (let i = 0; i < d.length; i += 4) {
			seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
			if (seen.size >= cap) return seen.size;
		}
	}
	return seen.size;
}

/**
 * フレーム列をアニメーション GIF にエンコードして data URL を返す。
 * gifenc は必要時に動的インポートする（初期バンドルに含めない）。
 */
export async function encodeGifToDataUrl(
	frames: GifFrame[],
	width: number,
	height: number,
	options: EncodeGifOptions = {},
): Promise<string> {
	const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
	const gif = GIFEncoder();
	const maxColors = options.maxColors ?? 256;

	for (const { imageData, delay } of frames) {
		const exact = exactPalette(
			imageData.data,
			!!options.transparent,
			maxColors,
		);
		// 透過 GIF では全フレームで「次のフレームの前に消す」(dispose: 2) を指定する。
		// 指定しないと、透明なセルから前のフレームの絵が透けて残像になる
		const disposal = options.transparent ? { dispose: 2 } : {};
		if (exact) {
			gif.writeFrame(exact.index, width, height, {
				palette: exact.palette,
				delay,
				...disposal,
				...(exact.transparentIndex >= 0
					? { transparent: true, transparentIndex: exact.transparentIndex }
					: {}),
			});
		} else if (options.transparent) {
			// GIF の透過は 1bit なのでアルファを二値化する
			const data = new Uint8ClampedArray(imageData.data);
			for (let i = 3; i < data.length; i += 4) {
				data[i] = data[i] < 128 ? 0 : 255;
			}
			const palette = quantize(data, maxColors, { format: "rgba4444" });
			const index = applyPalette(data, palette, "rgba4444");
			const transparentIndex = palette.findIndex((color) => color[3] === 0);
			gif.writeFrame(index, width, height, {
				palette,
				delay,
				...disposal,
				...(transparentIndex >= 0
					? { transparent: true, transparentIndex }
					: {}),
			});
		} else {
			const palette = quantize(imageData.data, maxColors);
			const index = applyPalette(imageData.data, palette);
			gif.writeFrame(index, width, height, { palette, delay });
		}
	}

	gif.finish();
	return blobToDataUrl(new Blob([gif.bytes()], { type: "image/gif" }));
}

/** data URL のデコード後のバイト数 */
export function dataUrlByteSize(dataUrl: string): number {
	const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
	return Math.floor((base64.length * 3) / 4) - padding;
}

/** フレームを1つおきに間引き、表示時間を足して全体の長さを保つ */
export function thinFrames(frames: GifFrame[]): GifFrame[] {
	if (frames.length <= 1) return frames;
	const result: GifFrame[] = [];
	for (let i = 0; i < frames.length; i += 2) {
		const next = frames[i + 1];
		result.push({
			imageData: frames[i].imageData,
			delay: frames[i].delay + (next?.delay ?? 0),
		});
	}
	return result;
}

export type FittedGif = {
	dataUrl: string;
	bytes: number;
	/** 上限に収めるために色数やフレーム数を減らした */
	reduced: boolean;
	/** 減らしても上限を超えている */
	overLimit: boolean;
};

/** 色数を減らす段階 */
const COLOR_STEPS = [256, 128, 64, 32];

/**
 * 上限サイズに収まるまで色数 → フレーム数の順に減らして GIF を作る。
 * 最初の試行で収まれば元の品質のまま返す。
 */
export async function encodeGifWithinLimit(
	frames: GifFrame[],
	width: number,
	height: number,
	limitBytes: number,
	options: Omit<EncodeGifOptions, "maxColors"> = {},
): Promise<FittedGif> {
	if (frames.length === 0) throw new Error("GIF のフレームがありません");
	// 元の色数より多い段階で減色しても小さくならないので飛ばす
	const colors = countColors(frames);
	const steps = COLOR_STEPS.filter((c, i) => i === 0 || c < colors);
	let current = frames;
	let last = { dataUrl: "", bytes: Number.POSITIVE_INFINITY };
	for (;;) {
		for (const maxColors of steps) {
			const dataUrl = await encodeGifToDataUrl(current, width, height, {
				...options,
				maxColors,
			});
			const bytes = dataUrlByteSize(dataUrl);
			last = { dataUrl, bytes };
			if (bytes <= limitBytes) {
				return {
					dataUrl,
					bytes,
					reduced: current !== frames || maxColors !== steps[0],
					overLimit: false,
				};
			}
		}
		if (current.length <= 1) break;
		current = thinFrames(current);
	}
	return { ...last, reduced: true, overLimit: true };
}
