import { describe, expect, it } from "vitest";
import { TRANSPARENT } from "../pixel/pixel-data";
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
		const crisp = pixelateRgba(data, 2, 4, {
			mode: "crisp",
			colors: null,
			transparentBackground: false,
		});
		expect(crisp).toEqual([
			["#000000", "#ffffff"],
			["#000000", "#ffffff"],
		]);
		// なめらかは平均なので灰色になる
		const smooth = pixelateRgba(data, 2, 4, {
			mode: "smooth",
			colors: null,
			transparentBackground: false,
		});
		expect(smooth[0][0]).toBe("#bfbfbf");
	});

	it("ignores tiny specks below the ink ratio", () => {
		// 16px 中 1px だけ黒 → 白
		const data = image(4, (x, y) => (x === 0 && y === 0 ? BLACK : WHITE));
		expect(
			pixelateRgba(data, 1, 4, {
				mode: "crisp",
				colors: null,
				transparentBackground: false,
			}),
		).toEqual([["#ffffff"]]);
	});

	it("keeps transparent source pixels transparent", () => {
		const data = image(2, () => [0, 0, 0, 0]);
		for (const mode of ["crisp", "smooth"] as const) {
			expect(
				pixelateRgba(data, 1, 2, {
					mode,
					colors: null,
					transparentBackground: false,
				}),
			).toEqual([[TRANSPARENT]]);
		}
	});

	it("turns the white background transparent when requested", () => {
		// 左のセルに黒線、右のセルは白
		const data = image(8, (x) => (x === 1 ? BLACK : WHITE));
		for (const mode of ["crisp", "smooth"] as const) {
			const grid = pixelateRgba(data, 2, 4, {
				mode,
				colors: null,
				transparentBackground: true,
			});
			expect(grid[0][1]).toBe(TRANSPARENT);
			expect(grid[0][0]).not.toBe(TRANSPARENT);
		}
		// 指定しなければ白のまま
		expect(
			pixelateRgba(data, 2, 4, {
				mode: "crisp",
				colors: null,
				transparentBackground: false,
			})[0][1],
		).toBe("#ffffff");
	});

	it("limits the number of colors", () => {
		// 4x4 セルに 4 段階の灰色（列ごと） → 2 色（白 + 黒寄り）にまとめる
		const shades = [0, 40, 80, 255];
		const data = image(4, (x) => {
			const v = shades[x];
			return [v, v, v, 255];
		});
		const colors = new Set(
			pixelateRgba(data, 4, 1, {
				mode: "smooth",
				colors: 2,
				transparentBackground: false,
			}).flat(),
		);
		expect(colors.size).toBe(2);
		expect(colors.has("#ffffff")).toBe(true);
	});
});

describe("quantize", () => {
	it("returns at most k colors", () => {
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
	});

	it("stops early when there are fewer distinct colors than k", () => {
		expect(quantize([[255, 255, 255]], 8)).toHaveLength(1);
		expect(quantize([], 8)).toEqual([]);
	});
});

describe("pixelateRgba background removal", () => {
	const opts = {
		mode: "crisp" as const,
		colors: null,
		transparentBackground: true,
	};

	it("keeps white enclosed by an outline (only edge-connected white is removed)", () => {
		// 5x5 セル（1セル1px）: 外周は白、その内側に黒い枠、中心は白
		const data = image(5, (x, y) => {
			const ring = Math.max(Math.abs(x - 2), Math.abs(y - 2));
			return ring === 1 ? BLACK : WHITE;
		});
		const grid = pixelateRgba(data, 5, 1, opts);
		expect(grid[0][0]).toBe(TRANSPARENT);
		expect(grid[1][1]).toBe("#000000");
		expect(grid[2][2]).toBe("#ffffff");
	});

	it("does not snap light ink colors to white when colors are limited", () => {
		// 黒と黄色の2色 + 透明背景 → 黄色は白に寄らない
		const YELLOW: [number, number, number, number] = [255, 255, 0, 255];
		const data = image(3, (x) => (x === 0 ? BLACK : x === 1 ? YELLOW : WHITE));
		const grid = pixelateRgba(data, 3, 1, { ...opts, colors: 2 });
		expect(grid[1][1]).toBe("#ffff00");
		expect(grid[1][0]).toBe("#000000");
		expect(grid[1][2]).toBe(TRANSPARENT);
	});

	it("does not lighten semi-transparent edges toward white", () => {
		// 半透明の赤（alpha 0.6）は白と混ぜずに赤のまま
		const data = image(1, () => [200, 0, 0, 153]);
		expect(
			pixelateRgba(data, 1, 1, {
				mode: "smooth",
				colors: null,
				transparentBackground: false,
			}),
		).toEqual([["#c80000"]]);
	});
});
