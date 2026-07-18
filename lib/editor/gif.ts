import { blobToDataUrl } from "./download";

export type GifFrame = {
	imageData: ImageData;
	/** フレーム表示時間 (ms) */
	delay: number;
};

export type EncodeGifOptions = {
	/** 透過 GIF として書き出す（アルファ < 128 のピクセルを透明にする） */
	transparent?: boolean;
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

	for (const { imageData, delay } of frames) {
		if (options.transparent) {
			// GIF の透過は 1bit なのでアルファを二値化する
			const data = new Uint8ClampedArray(imageData.data);
			for (let i = 3; i < data.length; i += 4) {
				data[i] = data[i] < 128 ? 0 : 255;
			}
			const palette = quantize(data, 256, { format: "rgba4444" });
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
			const palette = quantize(imageData.data, 256);
			const index = applyPalette(imageData.data, palette);
			gif.writeFrame(index, width, height, { palette, delay });
		}
	}

	gif.finish();
	return blobToDataUrl(new Blob([gif.bytes()], { type: "image/gif" }));
}
