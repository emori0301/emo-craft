import { describe, expect, it } from "vitest";
import {
	createEmptyGrid,
	floodFill,
	plotCircle,
	plotLine,
	plotRect,
	plotTriangle,
} from "./shapes";

const has = (cells: [number, number][], r: number, c: number) =>
	cells.some(([cr, cc]) => cr === r && cc === c);

describe("plotLine", () => {
	it("draws a single point when start == end", () => {
		expect(plotLine(3, 3, 3, 3)).toEqual([[3, 3]]);
	});

	it("draws a horizontal line", () => {
		const cells = plotLine(2, 0, 2, 4);
		expect(cells).toHaveLength(5);
		for (let c = 0; c <= 4; c++) expect(has(cells, 2, c)).toBe(true);
	});

	it("draws a vertical line", () => {
		const cells = plotLine(0, 1, 4, 1);
		expect(cells).toHaveLength(5);
		for (let r = 0; r <= 4; r++) expect(has(cells, r, 1)).toBe(true);
	});

	it("draws a diagonal line including both endpoints", () => {
		const cells = plotLine(0, 0, 3, 3);
		expect(has(cells, 0, 0)).toBe(true);
		expect(has(cells, 3, 3)).toBe(true);
		expect(cells).toHaveLength(4);
	});

	it("is direction-independent in cell coverage for straight lines", () => {
		const fwd = plotLine(1, 0, 1, 5);
		const bwd = plotLine(1, 5, 1, 0);
		expect(fwd.length).toBe(bwd.length);
		for (const [r, c] of fwd) expect(has(bwd, r, c)).toBe(true);
	});
});

describe("plotRect", () => {
	it("fills the full rectangle when filled", () => {
		const cells = plotRect(1, 1, 3, 4, true);
		expect(cells).toHaveLength(3 * 4); // rows 1-3 × cols 1-4
	});

	it("draws only the border when unfilled", () => {
		const cells = plotRect(0, 0, 3, 3, false);
		expect(cells).toHaveLength(12); // 4x4 outline = 16 - 4 inner
		expect(has(cells, 1, 1)).toBe(false);
		expect(has(cells, 0, 0)).toBe(true);
	});

	it("handles reversed corners", () => {
		expect(plotRect(3, 4, 1, 1, true)).toHaveLength(12);
	});

	it("handles a degenerate 1-cell rect", () => {
		expect(plotRect(2, 2, 2, 2, true)).toEqual([[2, 2]]);
	});
});

describe("plotCircle", () => {
	it("filled circle contains its center", () => {
		const cells = plotCircle(0, 0, 8, 8, true);
		expect(has(cells, 4, 4)).toBe(true);
	});

	it("radius 0 yields the center cell", () => {
		const filled = plotCircle(2, 2, 2, 2, true);
		expect(filled).toEqual([[2, 2]]);
	});

	it("outline circle does not contain the center", () => {
		const cells = plotCircle(0, 0, 8, 8, false);
		expect(has(cells, 4, 4)).toBe(false);
	});

	it("filled circle stays within the bounding box", () => {
		const cells = plotCircle(0, 0, 8, 8, true);
		for (const [r, c] of cells) {
			expect(r).toBeGreaterThanOrEqual(0);
			expect(r).toBeLessThanOrEqual(8);
			expect(c).toBeGreaterThanOrEqual(0);
			expect(c).toBeLessThanOrEqual(8);
		}
	});
});

describe("plotTriangle", () => {
	it("filled triangle includes apex and both base corners", () => {
		const cells = plotTriangle(0, 0, 4, 8, true);
		expect(has(cells, 0, 4)).toBe(true); // apex (top middle)
		expect(has(cells, 4, 0)).toBe(true); // bottom-left
		expect(has(cells, 4, 8)).toBe(true); // bottom-right
	});

	it("outline triangle includes the three vertices", () => {
		const cells = plotTriangle(0, 0, 4, 8, false);
		expect(has(cells, 0, 4)).toBe(true);
		expect(has(cells, 4, 0)).toBe(true);
		expect(has(cells, 4, 8)).toBe(true);
	});

	it("degenerate (single-row) triangle spans the base", () => {
		const cells = plotTriangle(2, 0, 2, 4, true);
		for (let c = 0; c <= 4; c++) expect(has(cells, 2, c)).toBe(true);
	});
});

describe("floodFill", () => {
	it("fills the whole empty grid from any cell", () => {
		const grid = createEmptyGrid(4);
		expect(floodFill(grid, 1, 1, "#000000")).toHaveLength(16);
	});

	it("respects boundaries of other colors", () => {
		const grid = createEmptyGrid(4);
		// 縦の壁で左右を分断
		for (let r = 0; r < 4; r++) grid[r][2] = "#000000";
		const cells = floodFill(grid, 0, 0, "#ff0000");
		expect(cells).toHaveLength(8); // 左側 4×2 のみ
		expect(cells.some(([, c]) => c > 1)).toBe(false);
	});

	it("returns empty when target already has the color", () => {
		const grid = createEmptyGrid(4);
		expect(floodFill(grid, 0, 0, "#ffffff")).toHaveLength(0);
	});

	it("returns empty for out-of-bounds start", () => {
		const grid = createEmptyGrid(4);
		expect(floodFill(grid, -1, 0, "#000000")).toHaveLength(0);
		expect(floodFill(grid, 0, 4, "#000000")).toHaveLength(0);
	});

	it("does not fill diagonally", () => {
		const grid = createEmptyGrid(3);
		// 対角の壁: (0,1),(1,0) を黒にすると (0,0) は孤立
		grid[0][1] = "#000000";
		grid[1][0] = "#000000";
		expect(floodFill(grid, 0, 0, "#ff0000")).toHaveLength(1);
	});
});

describe("createEmptyGrid", () => {
	it("creates a size×size grid of white cells with independent rows", () => {
		const grid = createEmptyGrid(4);
		expect(grid).toHaveLength(4);
		for (const row of grid) {
			expect(row).toHaveLength(4);
			for (const cell of row) expect(cell).toBe("#ffffff");
		}
		grid[0][0] = "#000000";
		expect(grid[1][0]).toBe("#ffffff");
	});
});
