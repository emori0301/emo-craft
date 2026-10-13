import { describe, expect, it } from "vitest";
import { pixelateRgba, quantize } from "./pixelate";

/** 一辺 size の RGBA 画像を (x, y) => [r,g,b,a] から作る */
function image(
	size: number,
	pixel: (x: number, y: number) => [number, number, number, number],
) {
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			data.set(pixel(x, y), (y * size + x) * 4);
		}
	}
	return data;
}

const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];

describe("pixelateRgba", () => {
	it("keeps a thin dark line pure black instead of a blurred gray (crisp)", () => {
		// 2x2 グリッド・1セル 4px。左列のセルに幅 1px の黒線（セルの 25%）
		const data = image(8, (x) => (x === 1 ? BLACK : WHITE));
		const crisp = pixelateRgba(data, 2, 4, { mode: "crisp", colors: null });
		expect(crisp).toEqual([
			["#000000", "#ffffff"],
			["#000000", "#ffffff"],
		]);
		// なめらかは平均なので灰色になる
		const smooth = pixelateRgba(data, 2, 4, { mode: "smooth", colors: null });
		expect(smooth[0][0]).toBe("#bfbfbf");
	});

	it("ignores tiny specks below the ink ratio", () => {
		// 16px 中 1px だけ黒 → 白
		const data = image(4, (x, y) => (x === 0 && y === 0 ? BLACK : WHITE));
		expect(pixelateRgba(data, 1, 4, { mode: "crisp", colors: null })).toEqual([
			["#ffffff"],
		]);
	});

	it("treats transparent pixels as white background", () => {
		const data = image(2, () => [0, 0, 0, 0]);
		expect(pixelateRgba(data, 1, 2, { mode: "crisp", colors: null })).toEqual([
			["#ffffff"],
		]);
		expect(pixelateRgba(data, 1, 2, { mode: "smooth", colors: null })).toEqual([
			["#ffffff"],
		]);
	});

	it("limits the number of colors", () => {
		// 4x4 セルに 4 段階の灰色（列ごと） → 2 色（白 + 黒寄り）にまとめる
		const shades = [0, 40, 80, 255];
		const data = image(4, (x) => {
			const v = shades[x];
			return [v, v, v, 255];
		});
		const colors = new Set(
			pixelateRgba(data, 4, 1, { mode: "smooth", colors: 2 }).flat(),
		);
		expect(colors.size).toBe(2);
		expect(colors.has("#ffffff")).toBe(true);
	});
});

describe("quantize", () => {
	it("always keeps white and returns at most k colors", () => {
		const palette = quantize(
			[
				[0, 0, 0],
				[10, 10, 10],
				[250, 0, 0],
				[255, 255, 255],
			],
			3,
		);
		expect(palette).toHaveLength(3);
		expect(palette[0]).toEqual([255, 255, 255]);
	});

	it("stops early when there are fewer distinct colors than k", () => {
		expect(quantize([[255, 255, 255]], 8)).toHaveLength(1);
	});
});
