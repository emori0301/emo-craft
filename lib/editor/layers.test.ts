import { describe, expect, it } from "vitest";
import {
	constrainPosition,
	createImageLayer,
	DEFAULT_TEXT_TRANSFORM,
	findTargetAt,
	handlePosition,
	hitTest,
	visibleHandlePosition,
	type ImageLayer,
	moveLayer,
	normalizeRotation,
	TEXT_TARGET,
} from "./layers";

const SIZE = 512;

function layer(overrides: Partial<ImageLayer> = {}): ImageLayer {
	return { ...createImageLayer("a", "data:", 100, 100), ...overrides };
}

describe("createImageLayer", () => {
	it("fits the longer side to 80% of the canvas", () => {
		const wide = createImageLayer("w", "data:", 200, 100);
		expect(wide.scale).toBeCloseTo(0.8);
		expect(wide.aspect).toBeCloseTo(0.5);

		const tall = createImageLayer("t", "data:", 100, 200);
		expect(tall.aspect).toBeCloseTo(2);
		// 高さ = scale * aspect = 0.8
		expect(tall.scale * tall.aspect).toBeCloseTo(0.8);
	});

	it("never starts below the minimum scale", () => {
		expect(createImageLayer("x", "data:", 10, 512).scale).toBe(0.05);
	});
});

describe("hitTest", () => {
	it("detects points inside an unrotated box", () => {
		const l = layer({ scale: 0.5 });
		expect(hitTest(l, 256, 256, SIZE)).toBe(true);
		expect(hitTest(l, 256 + 127, 256, SIZE)).toBe(true);
		expect(hitTest(l, 256 + 130, 256, SIZE)).toBe(false);
	});

	it("respects rotation", () => {
		// 横長 (0.5 x 0.1) を 90° 回すと縦長になる
		const l = layer({ scale: 0.5, aspect: 0.2, rotation: 90 });
		expect(hitTest(l, 256, 256 + 100, SIZE)).toBe(true);
		expect(hitTest(l, 256 + 100, 256, SIZE)).toBe(false);
	});
});

describe("handlePosition", () => {
	it("returns the bottom-right corner", () => {
		const p = handlePosition(layer({ scale: 0.5 }), SIZE);
		expect(p.x).toBeCloseTo(256 + 128);
		expect(p.y).toBeCloseTo(256 + 128);
	});

	it("rotates with the box", () => {
		const p = handlePosition(layer({ scale: 0.5, rotation: 90 }), SIZE);
		expect(p.x).toBeCloseTo(256 - 128);
		expect(p.y).toBeCloseTo(256 + 128);
	});
});

describe("visibleHandlePosition", () => {
	it("keeps the handle inside the canvas when the box overflows", () => {
		const p = visibleHandlePosition(layer({ scale: 2 }), SIZE, 10);
		expect(p).toEqual({ x: SIZE - 10, y: SIZE - 10 });
	});
});

describe("findTargetAt", () => {
	it("prefers front layers, then text, then back layers", () => {
		const front = layer({ id: "front", scale: 0.2 });
		const back = layer({ id: "back", scale: 1, behindText: true });
		const layers = [back, front];
		expect(findTargetAt(layers, DEFAULT_TEXT_TRANSFORM, 256, 256, SIZE)).toBe(
			"front",
		);
		expect(findTargetAt(layers, DEFAULT_TEXT_TRANSFORM, 20, 20, SIZE)).toBe(
			TEXT_TARGET,
		);
		expect(findTargetAt(layers, null, 20, 20, SIZE)).toBe("back");
		expect(findTargetAt([], null, 20, 20, SIZE)).toBeNull();
	});

	it("uses the text shape so images behind the text can be picked", () => {
		const back = layer({ id: "back", scale: 1, behindText: true });
		const onGlyph = (x: number) => x < 100;
		const opts = { textHit: (x: number) => onGlyph(x) };
		expect(
			findTargetAt([back], DEFAULT_TEXT_TRANSFORM, 50, 50, SIZE, opts),
		).toBe(TEXT_TARGET);
		expect(
			findTargetAt([back], DEFAULT_TEXT_TRANSFORM, 300, 300, SIZE, opts),
		).toBe("back");
		expect(findTargetAt([], DEFAULT_TEXT_TRANSFORM, 300, 300, SIZE, opts)).toBe(
			null,
		);
	});

	it("uses the whole text box while the text is selected", () => {
		const back = layer({ id: "back", scale: 1, behindText: true });
		const front = layer({ id: "front", scale: 0.2 });
		const textHit = () => false;
		// 選択中の文字は枠内ならどこでも掴めるが、前面の画像より優先はしない
		expect(
			findTargetAt([back, front], DEFAULT_TEXT_TRANSFORM, 20, 20, SIZE, {
				textHit,
				selectedId: TEXT_TARGET,
			}),
		).toBe(TEXT_TARGET);
		expect(
			findTargetAt([back, front], DEFAULT_TEXT_TRANSFORM, 256, 256, SIZE, {
				textHit,
				selectedId: TEXT_TARGET,
			}),
		).toBe("front");
		// 背面の画像を選択中でも、字面の上なら文字が選ばれる
		expect(
			findTargetAt([back], DEFAULT_TEXT_TRANSFORM, 20, 20, SIZE, {
				textHit: () => true,
				selectedId: "back",
			}),
		).toBe(TEXT_TARGET);
	});
});

describe("moveLayer", () => {
	it("moves a layer to the front or back", () => {
		const a = layer({ id: "a" });
		const b = layer({ id: "b" });
		const c = layer({ id: "c" });
		expect(moveLayer([a, b, c], "a", "front").map((l) => l.id)).toEqual([
			"b",
			"c",
			"a",
		]);
		expect(moveLayer([a, b, c], "c", "back").map((l) => l.id)).toEqual([
			"c",
			"a",
			"b",
		]);
		expect(moveLayer([a, b], "missing", "front")).toEqual([a, b]);
	});
});

describe("constrainPosition / normalizeRotation", () => {
	it("keeps the center inside the canvas and snaps to the middle", () => {
		expect(constrainPosition(-0.3, 1.4)).toEqual({ x: 0, y: 1 });
		expect(constrainPosition(0.51, 0.3)).toEqual({ x: 0.5, y: 0.3 });
		expect(constrainPosition(0.51, 0.3, false)).toEqual({ x: 0.51, y: 0.3 });
	});

	it("wraps angles into -180..180", () => {
		expect(normalizeRotation(190)).toBe(-170);
		expect(normalizeRotation(-190)).toBe(170);
		expect(normalizeRotation(540)).toBe(180);
		expect(normalizeRotation(45)).toBe(45);
	});
});
