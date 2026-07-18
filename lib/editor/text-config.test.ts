import { describe, expect, it } from "vitest";
import { ANIM_CONFIGS, trimToLimit } from "./text-config";

describe("trimToLimit", () => {
	it("keeps text within limits unchanged", () => {
		expect(trimToLimit("よろ\nしく")).toBe("よろ\nしく");
		expect(trimToLimit("あ\nい\nう")).toBe("あ\nい\nう");
	});

	it("caps each line to 6 chars", () => {
		expect(trimToLimit("あいうえおかき")).toBe("あいうえおか");
	});

	it("caps to 3 lines", () => {
		expect(trimToLimit("あ\nい\nう\nえ")).toBe("あ\nい\nう");
	});

	it("caps total to 18 chars", () => {
		expect(trimToLimit("あいうえおか\nきくけこさし\nすせそたちつて")).toBe(
			"あいうえおか\nきくけこさし\nすせそたちつ",
		);
	});

	it("preserves empty lines while editing (trailing Enter)", () => {
		expect(trimToLimit("あい\n")).toBe("あい\n");
		expect(trimToLimit("あ\nい\n")).toBe("あ\nい\n");
		expect(trimToLimit("\nあい")).toBe("\nあい");
	});

	it("handles empty string", () => {
		expect(trimToLimit("")).toBe("");
	});
});

describe("ANIM_CONFIGS", () => {
	it("every animation produces finite params for all frames", () => {
		const SIZE = 512;
		for (const [name, cfg] of Object.entries(ANIM_CONFIGS)) {
			for (let f = 0; f < cfg.frames; f++) {
				const p = cfg.getParams(f, cfg.frames, SIZE);
				for (const [key, v] of Object.entries(p)) {
					if (typeof v === "number") {
						expect(Number.isFinite(v), `${name} frame ${f} ${key}`).toBe(true);
					}
				}
				expect(p.alpha).toBeGreaterThanOrEqual(0);
				expect(p.alpha).toBeLessThanOrEqual(1);
			}
		}
	});
});
