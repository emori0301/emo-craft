/**
 * 画像をドット絵のグリッドに変換する。
 *
 * 単純に縮小すると、セルより細い線や輪郭がまわりの白と平均されて灰色の中間色になり、
 * にじんだ見た目になる。そこで1セルあたり複数ピクセルをサンプリングし、
 * - くっきり: セル内に「インク」（背景の白から離れた色）が一定以上あればその色だけを平均する
 * - なめらか: セル内の全ピクセルを平均する（写真向け）
 * で色を決め、さらに色数を絞って中間色を減らす。
 * 元画像の透明部分は透明のまま、縁からつながる白い背景も（指定すれば）透明にする。
 */

import { TRANSPARENT } from "../pixel/pixel-data";

export type PixelateMode = "crisp" | "smooth";

export type PixelateOptions = {
	mode: PixelateMode;
	/** 使う色の最大数。null なら制限しない */
	colors: number | null;
	/** 白い背景を透明にする（Slack のダークモードで白い四角にならないように） */
	transparentBackground: boolean;
};

export const DEFAULT_PIXELATE_OPTIONS: PixelateOptions = {
	mode: "crisp",
	colors: 8,
	transparentBackground: true,
};

/** 1セルあたりのサンプリング数（一辺） */
export const SAMPLES_PER_CELL = 8;

/** 白からこれ以上離れた色をインクとみなす（各チャンネルの差の最大値） */
const INK_THRESHOLD = 48;
/** セル内のインクの割合がこれ以上ならインクの色で塗る（細い線を残すため低め） */
const INK_RATIO = 0.15;
/** なめらか変換で、これ以上白に近いセルを背景（透明）とみなす */
const NEAR_WHITE = 245;

type RGB = [number, number, number];

const BACKGROUND: RGB = [255, 255, 255];

const toHex = (n: number) => n.toString(16).padStart(2, "0");
const rgbToHex = ([r, g, b]: RGB) =>
	`#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`;

const distanceSq = (a: RGB, b: RGB) =>
	(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** セルの判定結果 */
type CellInfo =
	| { kind: "clear" } // 元画像で透明
	| { kind: "background"; color: RGB } // 白い背景の候補
	| { kind: "color"; color: RGB };

/**
 * RGBA ピクセル列（一辺 gridSize * scale）を gridSize × gridSize の色に変換する。
 * 元画像の透明部分は透明のまま。transparentBackground なら、画像の縁から
 * つながっている白い部分だけを透明にする（内側の白目やパンダの白は残す）。
 */
export function pixelateRgba(
	data: Uint8ClampedArray,
	gridSize: number,
	scale: number,
	options: PixelateOptions = DEFAULT_PIXELATE_OPTIONS,
): string[][] {
	const width = gridSize * scale;
	const n = scale * scale;
	const cells: CellInfo[] = [];

	for (let row = 0; row < gridSize; row++) {
		for (let col = 0; col < gridSize; col++) {
			// アルファで重み付けした平均（白と混ぜないので、半透明の縁が白っぽくならない）
			const weighted: RGB = [0, 0, 0];
			const ink: RGB = [0, 0, 0];
			let inkCount = 0;
			let alphaSum = 0;
			for (let y = 0; y < scale; y++) {
				for (let x = 0; x < scale; x++) {
					const i = ((row * scale + y) * width + col * scale + x) * 4;
					const a = data[i + 3] / 255;
					alphaSum += a;
					weighted[0] += data[i] * a;
					weighted[1] += data[i + 1] * a;
					weighted[2] += data[i + 2] * a;
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

			if (alphaSum / n < 0.5) {
				cells.push({ kind: "clear" });
			} else if (options.mode === "crisp") {
				cells.push(
					inkCount / n >= INK_RATIO
						? {
								kind: "color",
								color: [
									ink[0] / inkCount,
									ink[1] / inkCount,
									ink[2] / inkCount,
								],
							}
						: { kind: "background", color: [...BACKGROUND] },
				);
			} else {
				const avg: RGB = [
					weighted[0] / alphaSum,
					weighted[1] / alphaSum,
					weighted[2] / alphaSum,
				];
				cells.push(
					Math.min(...avg) >= NEAR_WHITE
						? { kind: "background", color: avg }
						: { kind: "color", color: avg },
				);
			}
		}
	}

	const transparent = options.transparentBackground
		? backgroundConnectedToEdge(cells, gridSize)
		: new Set<number>();
	const colorOf = (index: number): RGB | null => {
		const cell = cells[index];
		if (cell.kind === "clear" || transparent.has(index)) return null;
		return cell.color;
	};

	const opaque: RGB[] = [];
	for (let i = 0; i < cells.length; i++) {
		const c = colorOf(i);
		if (c) opaque.push(c);
	}
	const palette = options.colors ? quantize(opaque, options.colors) : null;

	const grid: string[][] = [];
	for (let row = 0; row < gridSize; row++) {
		const line: string[] = [];
		for (let col = 0; col < gridSize; col++) {
			const c = colorOf(row * gridSize + col);
			if (!c) line.push(TRANSPARENT);
			else line.push(rgbToHex(palette ? nearest(palette, c) : c));
		}
		grid.push(line);
	}
	return grid;
}

/**
 * 画像の縁（または元から透明な部分）から、背景候補のセルだけを伝ってたどれるセルを返す。
 * 輪郭線で囲まれた内側の白は含まれない。
 */
function backgroundConnectedToEdge(
	cells: CellInfo[],
	gridSize: number,
): Set<number> {
	const result = new Set<number>();
	const stack: number[] = [];
	const passable = (i: number) => cells[i].kind !== "color";
	for (let i = 0; i < cells.length; i++) {
		const row = Math.floor(i / gridSize);
		const col = i % gridSize;
		const onEdge =
			row === 0 || col === 0 || row === gridSize - 1 || col === gridSize - 1;
		if (passable(i) && (onEdge || cells[i].kind === "clear")) stack.push(i);
	}
	while (stack.length > 0) {
		const i = stack.pop() as number;
		if (result.has(i)) continue;
		result.add(i);
		const row = Math.floor(i / gridSize);
		const col = i % gridSize;
		const neighbors = [
			row > 0 ? i - gridSize : -1,
			row < gridSize - 1 ? i + gridSize : -1,
			col > 0 ? i - 1 : -1,
			col < gridSize - 1 ? i + 1 : -1,
		];
		for (const nb of neighbors) {
			if (nb >= 0 && !result.has(nb) && passable(nb)) stack.push(nb);
		}
	}
	return result;
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
 * 初期値は「最初の色」から始め、既存の中心から最も遠い色を順に足していく。
 */
export function quantize(colors: RGB[], k: number): RGB[] {
	if (colors.length === 0) return [];
	const centers: RGB[] = [[...colors[0]]];
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
		for (let i = 0; i < centers.length; i++) {
			const [r, g, b, count] = sums[i];
			if (count > 0) centers[i] = [r / count, g / count, b / count];
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
