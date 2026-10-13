import { describe, expect, it } from "vitest";
import { dataUrlByteSize, type GifFrame, thinFrames } from "./gif";

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
