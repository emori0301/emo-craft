import { describe, expect, it } from "vitest";
import {
	countColors,
	dataUrlByteSize,
	exactPalette,
	type GifFrame,
	thinFrames,
} from "./gif";

describe("dataUrlByteSize", () => {
	it("computes decoded size from base64", () => {
		// "abc" → YWJj, "ab" → YWI=, "a" → YQ==
		expect(dataUrlByteSize("data:x;base64,YWJj")).toBe(3);
		expect(dataUrlByteSize("data:x;base64,YWI=")).toBe(2);
		expect(dataUrlByteSize("data:x;base64,YQ==")).toBe(1);
	});
});

describe("thinFrames", () => {
	const frame = (delay: number) =>
		({ imageData: {} as ImageData, delay }) satisfies GifFrame;

	it("halves the frames while keeping the total duration", () => {
		const thinned = thinFrames([frame(100), frame(100), frame(50)]);
		expect(thinned.map((f) => f.delay)).toEqual([200, 50]);
	});

	it("keeps a single frame as is", () => {
		expect(thinFrames([frame(80)])).toHaveLength(1);
	});
});

describe("exactPalette", () => {
	const px = (...v: number[]) => new Uint8ClampedArray(v);

	it("keeps exact colors without quantizing", () => {
		const data = px(58, 123, 213, 255, 59, 124, 214, 255, 58, 123, 213, 255);
		const result = exactPalette(data, false);
		expect(result?.palette).toEqual([
			[58, 123, 213],
			[59, 124, 214],
		]);
		expect(Array.from(result?.index ?? [])).toEqual([0, 1, 0]);
		expect(result?.transparentIndex).toBe(-1);
	});

	it("maps transparent pixels to one transparent entry", () => {
		const data = px(0, 0, 0, 0, 255, 0, 0, 255, 9, 9, 9, 10);
		const result = exactPalette(data, true);
		expect(result?.transparentIndex).toBe(0);
		expect(Array.from(result?.index ?? [])).toEqual([0, 1, 0]);
		expect(result?.palette[1]).toEqual([255, 0, 0, 255]);
	});

	it("gives up when there are more colors than allowed", () => {
		const data = px(1, 0, 0, 255, 2, 0, 0, 255, 3, 0, 0, 255);
		expect(exactPalette(data, false, 2)).toBeNull();
	});
});

describe("countColors", () => {
	it("counts distinct colors across frames", () => {
		const frame = (...v: number[]) =>
			({
				imageData: { data: new Uint8ClampedArray(v) } as ImageData,
				delay: 100,
			}) satisfies GifFrame;
		expect(
			countColors([frame(0, 0, 0, 255, 255, 0, 0, 255), frame(0, 0, 0, 255)]),
		).toBe(2);
	});
});
