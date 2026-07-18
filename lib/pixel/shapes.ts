/**
 * ピクセルエディターの図形描画アルゴリズム（純関数）。
 * 座標は [row, col]。グリッド境界のクリップは呼び出し側で行う。
 */

export type Cell = [row: number, col: number];

/** Bresenham の直線 */
export function plotLine(
	r0: number,
	c0: number,
	r1: number,
	c1: number,
): Cell[] {
	const cells: Cell[] = [];
	const dr = Math.abs(r1 - r0);
	const dc = Math.abs(c1 - c0);
	const sr = r0 < r1 ? 1 : -1;
	const sc = c0 < c1 ? 1 : -1;
	let err = dc - dr;
	let r = r0;
	let c = c0;
	for (;;) {
		cells.push([r, c]);
		if (r === r1 && c === c1) break;
		const e2 = 2 * err;
		if (e2 > -dr) {
			err -= dr;
			c += sc;
		}
		if (e2 < dc) {
			err += dc;
			r += sr;
		}
	}
	return cells;
}

/** 円（filled は中心距離判定、輪郭は中点円アルゴリズム） */
export function plotCircle(
	r0: number,
	c0: number,
	r1: number,
	c1: number,
	filled: boolean,
): Cell[] {
	const cr = Math.round((r0 + r1) / 2);
	const cc = Math.round((c0 + c1) / 2);
	const radius = Math.round(Math.min(Math.abs(r1 - r0), Math.abs(c1 - c0)) / 2);
	const cells: Cell[] = [];
	if (filled) {
		for (let dr = -radius; dr <= radius; dr++) {
			for (let dc = -radius; dc <= radius; dc++) {
				if (dr * dr + dc * dc <= radius * radius)
					cells.push([cr + dr, cc + dc]);
			}
		}
		return cells;
	}
	let x = radius;
	let y = 0;
	let err2 = 0;
	while (x >= y) {
		const pts: Cell[] = [
			[cr + y, cc + x],
			[cr + x, cc + y],
			[cr + x, cc - y],
			[cr + y, cc - x],
			[cr - y, cc - x],
			[cr - x, cc - y],
			[cr - x, cc + y],
			[cr - y, cc + x],
		];
		for (const pt of pts) cells.push(pt);
		y++;
		err2 += 2 * y + 1;
		if (2 * (err2 - x) + 1 > 0) {
			x--;
			err2 += 2 * (1 - x);
		}
	}
	return cells;
}

/** 矩形 */
export function plotRect(
	r0: number,
	c0: number,
	r1: number,
	c1: number,
	filled: boolean,
): Cell[] {
	const minR = Math.min(r0, r1);
	const maxR = Math.max(r0, r1);
	const minC = Math.min(c0, c1);
	const maxC = Math.max(c0, c1);
	const cells: Cell[] = [];
	for (let r = minR; r <= maxR; r++) {
		for (let c = minC; c <= maxC; c++) {
			if (filled || r === minR || r === maxR || c === minC || c === maxC)
				cells.push([r, c]);
		}
	}
	return cells;
}

/** 三角形（頂点は上辺中央 + 下辺両端） */
export function plotTriangle(
	r0: number,
	c0: number,
	r1: number,
	c1: number,
	filled: boolean,
): Cell[] {
	const minR = Math.min(r0, r1);
	const maxR = Math.max(r0, r1);
	const minC = Math.min(c0, c1);
	const maxC = Math.max(c0, c1);
	const midC = Math.round((minC + maxC) / 2);
	const va: Cell = [minR, midC];
	const vb: Cell = [maxR, minC];
	const vc: Cell = [maxR, maxC];
	if (filled) {
		const cells: Cell[] = [];
		const h = maxR - minR;
		for (let r = minR; r <= maxR; r++) {
			const t = h === 0 ? 1 : (r - minR) / h;
			const lc = Math.round(midC + (minC - midC) * t);
			const rc = Math.round(midC + (maxC - midC) * t);
			for (let c = lc; c <= rc; c++) cells.push([r, c]);
		}
		return cells;
	}
	return [
		...plotLine(va[0], va[1], vb[0], vb[1]),
		...plotLine(vb[0], vb[1], vc[0], vc[1]),
		...plotLine(vc[0], vc[1], va[0], va[1]),
	];
}

/**
 * 塗りつぶし（flood fill）。
 * (row, col) と同色で連結しているセル群を返す。境界チェック済み。
 */
export function floodFill(
	grid: string[][],
	row: number,
	col: number,
	color: string,
): Cell[] {
	const size = grid.length;
	if (row < 0 || row >= size || col < 0 || col >= size) return [];
	const target = grid[row][col];
	if (target === color) return [];
	const cells: Cell[] = [];
	const visited = new Set<number>();
	const stack: Cell[] = [[row, col]];
	while (stack.length > 0) {
		const cell = stack.pop();
		if (!cell) break;
		const [r, c] = cell;
		if (r < 0 || r >= size || c < 0 || c >= size) continue;
		const key = r * size + c;
		if (visited.has(key)) continue;
		visited.add(key);
		if (grid[r][c] !== target) continue;
		cells.push([r, c]);
		stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
	}
	return cells;
}

/** size×size の白紙グリッドを作る */
export function createEmptyGrid(size: number): string[][] {
	return Array(size)
		.fill(null)
		.map(() => Array(size).fill("#ffffff"));
}
