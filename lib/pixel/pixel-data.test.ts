import { describe, expect, it } from "vitest";
import {
	DEFAULT_FRAME_DELAY,
	hasTransparentCell,
	parsePixelData,
	serializePixelData,
	TRANSPARENT,
} from "./pixel-data";

const grid = (c: string) => [
	[c, c],
	[c, c],
];

describe("parsePixelData", () => {
	it("reads the legacy single-frame format", () => {
		expect(parsePixelData(grid("#000000"))).toEqual({
			frames: [grid("#000000")],
			frameDelay: DEFAULT_FRAME_DELAY,
		});
	});

	it("reads all frames and the frame delay", () => {
		const raw = { frames: [grid("#000000"), grid("#ff0000")], frameDelay: 120 };
		expect(parsePixelData(raw)).toEqual(raw);
	});

	it("round-trips through serializePixelData", () => {
		const doc = {
			frames: [grid("#111111"), grid(TRANSPARENT)],
			frameDelay: 300,
		};
		expect(parsePixelData(serializePixelData(doc))).toEqual(doc);
	});

	it("rejects broken data", () => {
		expect(parsePixelData(null)).toBeNull();
		expect(parsePixelData([])).toBeNull();
		expect(parsePixelData({ frames: [] })).toBeNull();
		expect(parsePixelData({ frames: [grid("#000"), [["#000"]]] })).toBeNull();
		expect(parsePixelData([[1, 2]])).toBeNull();
	});

	it("falls back to the default delay", () => {
		expect(parsePixelData({ frames: [grid("#000000")] })?.frameDelay).toBe(
			DEFAULT_FRAME_DELAY,
		);
	});
});

describe("hasTransparentCell", () => {
	it("detects transparent cells in any frame", () => {
		expect(hasTransparentCell([grid("#000000")])).toBe(false);
		expect(hasTransparentCell([grid("#000000"), grid(TRANSPARENT)])).toBe(true);
	});
});
