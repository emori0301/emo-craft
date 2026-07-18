import { describe, expect, it } from "vitest";
import { ANIM_CONFIGS, trimToLimit } from "./text-config";

describe("trimToLimit", () => {
	it("keeps text within limits unchanged", () => {
		expect(trimToLimit("よろ\nしく")).toBe("よろ\nしく");
	});

	it("caps each line to 5 chars", () => {
		expect(trimToLimit("あいうえおかき")).toBe("あいうえお");
	});

	it("caps to 2 lines", () => {
		expect(trimToLimit("あ\nい\nう")).toBe("あ\nい");
	});

	it("caps total to 10 chars", () => {
		expect(trimToLimit("あいうえお\nかきくけこさ")).toBe(
			"あいうえお\nかきくけこ",
		);
	});

	it("drops empty lines after capping", () => {
		expect(trimToLimit("\nあい")).toBe("あい");
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
