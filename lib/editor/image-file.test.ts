import { describe, expect, it } from "vitest";
import { rgbaToGrid } from "./image-file";

describe("rgbaToGrid", () => {
	it("converts opaque pixels to hex and transparent pixels to background", () => {
		const data = new Uint8ClampedArray([
			255, 0, 0, 255, /**/ 0, 0, 0, 0,
			//
			0, 128, 255, 255, /**/ 0, 0, 0, 255,
		]);
		expect(rgbaToGrid(data, 2)).toEqual([
			["#ff0000", "#ffffff"],
			["#0080ff", "#000000"],
		]);
	});

	it("blends semi-transparent pixels with white", () => {
		const data = new Uint8ClampedArray([0, 0, 0, 128]);
		// 0 * 0.502 + 255 * 0.498 ≒ 127
		expect(rgbaToGrid(data, 1)).toEqual([["#7f7f7f"]]);
	});
});
