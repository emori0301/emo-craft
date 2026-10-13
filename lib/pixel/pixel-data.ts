/**
 * ドット絵のセル色と、DB の pixelData 列（Json）に保存する形式。
 */

/** 透明なセル（CSS の色名としても有効なので fillStyle にそのまま渡せる） */
export const TRANSPARENT = "transparent";

export const isTransparent = (color: string) => color === TRANSPARENT;

export const MAX_PIXEL_FRAMES = 8;
export const MAX_PIXEL_GRID = 64;
export const DEFAULT_FRAME_DELAY = 200;

/**
 * DB の pixelData に保存する形（全フレームとコマ送りの間隔）。
 * 旧形式の1フレームのグリッド（string[][]）も parsePixelData で読める。
 */
export type PixelDocument = { frames: string[][][]; frameDelay: number };

const isGrid = (v: unknown): v is string[][] =>
	Array.isArray(v) &&
	v.length > 0 &&
	v.every(
		(row) => Array.isArray(row) && row.every((c) => typeof c === "string"),
	);

/** DB から読んだ pixelData を全フレームの形にそろえる（壊れていたら null） */
export function parsePixelData(raw: unknown): PixelDocument | null {
	if (isGrid(raw)) return { frames: [raw], frameDelay: DEFAULT_FRAME_DELAY };
	if (raw && typeof raw === "object" && "frames" in raw) {
		const { frames, frameDelay } = raw as {
			frames: unknown;
			frameDelay: unknown;
		};
		if (
			Array.isArray(frames) &&
			frames.length > 0 &&
			frames.every(isGrid) &&
			frames.every((f) => f.length === frames[0].length)
		) {
			return {
				frames: frames as string[][][],
				frameDelay:
					typeof frameDelay === "number" && frameDelay > 0
						? frameDelay
						: DEFAULT_FRAME_DELAY,
			};
		}
	}
	return null;
}

/** グリッドに透明なセルがあるか */
export function hasTransparentCell(frames: string[][][]): boolean {
	return frames.some((f) => f.some((row) => row.some(isTransparent)));
}
