/**
 * 画像をドット絵のグリッドに変換する。
 *
 * 単純に縮小すると、セルより細い線や輪郭がまわりの白と平均されて灰色の中間色になり、
 * にじんだ見た目になる。そこで1セルあたり複数ピクセルをサンプリングし、
 * - くっきり: セル内に「インク」（背景の白から離れた色）が一定以上あればその色だけを平均する
 * - なめらか: セル内の全ピクセルを平均する（写真向け）
 * で色を決め、さらに色数を絞って中間色を減らす。
 */

export type PixelateMode = "crisp" | "smooth";

export type PixelateOptions = {
	mode: PixelateMode;
	/** 使う色の最大数。null なら制限しない */
	colors: number | null;
};

export const DEFAULT_PIXELATE_OPTIONS: PixelateOptions = {
	mode: "crisp",
	colors: 8,
};

/** 1セルあたりのサンプリング数（一辺） */
export const SAMPLES_PER_CELL = 8;

/** 白からこれ以上離れた色をインクとみなす（各チャンネルの差の最大値） */
const INK_THRESHOLD = 48;
/** セル内のインクの割合がこれ以上ならインクの色で塗る（細い線を残すため低め） */
const INK_RATIO = 0.15;

type RGB = [number, number, number];

const BACKGROUND: RGB = [255, 255, 255];

const toHex = (n: number) => n.toString(16).padStart(2, "0");
const rgbToHex = ([r, g, b]: RGB) =>
	`#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`;

const distanceSq = (a: RGB, b: RGB) =>
	(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * RGBA ピクセル列（一辺 gridSize * scale）を gridSize × gridSize の色に変換する。
 * 透明は背景（白）として扱う。
 */
export function pixelateRgba(
	data: Uint8ClampedArray,
	gridSize: number,
	scale: number,
	options: PixelateOptions = DEFAULT_PIXELATE_OPTIONS,
): string[][] {
	const width = gridSize * scale;
	const cells: RGB[] = [];

	for (let row = 0; row < gridSize; row++) {
		for (let col = 0; col < gridSize; col++) {
			const all: RGB = [0, 0, 0];
			const ink: RGB = [0, 0, 0];
			let inkCount = 0;
			for (let y = 0; y < scale; y++) {
				for (let x = 0; x < scale; x++) {
					const i = ((row * scale + y) * width + col * scale + x) * 4;
					const a = data[i + 3] / 255;
					// 白背景と合成した色
					const c: RGB = [
						data[i] * a + 255 * (1 - a),
						data[i + 1] * a + 255 * (1 - a),
						data[i + 2] * a + 255 * (1 - a),
					];
					all[0] += c[0];
					all[1] += c[1];
					all[2] += c[2];
					const isInk =
						a >= 0.5 &&
						Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) >=
							INK_THRESHOLD;
					if (isInk) {
						// インクは背景と混ぜずに元の色で平均する（輪郭のにじみを防ぐ）
						ink[0] += data[i];
						ink[1] += data[i + 1];
						ink[2] += data[i + 2];
						inkCount++;
					}
				}
			}
			const n = scale * scale;
			if (options.mode === "crisp") {
				cells.push(
					inkCount / n >= INK_RATIO
						? [ink[0] / inkCount, ink[1] / inkCount, ink[2] / inkCount]
						: [...BACKGROUND],
				);
			} else {
				cells.push([all[0] / n, all[1] / n, all[2] / n]);
			}
		}
	}

	const palette = options.colors ? quantize(cells, options.colors) : null;
	const grid: string[][] = [];
	for (let row = 0; row < gridSize; row++) {
		const line: string[] = [];
		for (let col = 0; col < gridSize; col++) {
			const c = cells[row * gridSize + col];
			line.push(rgbToHex(palette ? nearest(palette, c) : c));
		}
		grid.push(line);
	}
	return grid;
}

function nearest(palette: RGB[], c: RGB): RGB {
	let best = palette[0];
	let bestD = Number.POSITIVE_INFINITY;
	for (const p of palette) {
		const d = distanceSq(p, c);
		if (d < bestD) {
			bestD = d;
			best = p;
		}
	}
	return best;
}

/**
 * k-means で色を最大 k 色に減らしたパレットを返す（決定的: 乱数を使わない）。
 * 背景の白は常にパレットに含め、余白が別の色に寄らないようにする。
 */
export function quantize(colors: RGB[], k: number): RGB[] {
	if (colors.length === 0) return [[...BACKGROUND]];
	// 初期値: 白 + 既存の中心から最も遠い色を順に選ぶ（farthest-point）
	const centers: RGB[] = [[...BACKGROUND]];
	while (centers.length < k) {
		let far: RGB | null = null;
		let farD = 0;
		for (const c of colors) {
			const d = distanceSq(nearest(centers, c), c);
			if (d > farD) {
				farD = d;
				far = c;
			}
		}
		if (!far || farD < 1) break; // 異なる色がもう無い
		centers.push([...far]);
	}

	for (let iter = 0; iter < 8; iter++) {
		const sums = centers.map(() => [0, 0, 0, 0]);
		for (const c of colors) {
			let bi = 0;
			let bd = Number.POSITIVE_INFINITY;
			for (let i = 0; i < centers.length; i++) {
				const d = distanceSq(centers[i], c);
				if (d < bd) {
					bd = d;
					bi = i;
				}
			}
			sums[bi][0] += c[0];
			sums[bi][1] += c[1];
			sums[bi][2] += c[2];
			sums[bi][3]++;
		}
		// 白（index 0）は固定し、他の中心だけ動かす
		for (let i = 1; i < centers.length; i++) {
			const [r, g, b, n] = sums[i];
			if (n > 0) centers[i] = [r / n, g / n, b / n];
		}
	}
	return centers;
}

/** 画像をグリッドに収まるよう（中央・縦横比維持）高解像度でサンプリングする */
export function sampleImage(
	img: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
	gridSize: number,
	scale = SAMPLES_PER_CELL,
): Uint8ClampedArray {
	const size = gridSize * scale;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("画像を処理できませんでした");
	const ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight);
	const w = img.naturalWidth * ratio;
	const h = img.naturalHeight * ratio;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
	return ctx.getImageData(0, 0, size, size).data;
}
