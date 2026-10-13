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
		if (options.transparent) {
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
				...(transparentIndex >= 0
					? { transparent: true, transparentIndex, dispose: 2 }
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
	let current = frames;
	let last: { dataUrl: string; bytes: number } | null = null;
	for (;;) {
		for (const maxColors of COLOR_STEPS) {
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
					reduced: current !== frames || maxColors !== COLOR_STEPS[0],
					overLimit: false,
				};
			}
		}
		if (current.length <= 1) break;
		current = thinFrames(current);
	}
	return { ...last, reduced: true, overLimit: true } as FittedGif;
}
