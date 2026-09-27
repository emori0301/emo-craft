/** アップロード画像の読み込み・縮小・ピクセル化 */

/** 受け付ける元ファイルの最大サイズ（縮小前） */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** 取り込み時に縮小する長辺の最大ピクセル数（書き出し 128px の 4 倍で十分） */
export const MAX_IMAGE_SIDE = 512;

export class ImageFileError extends Error {}

export type LoadedImage = {
	/** 縮小済み PNG の data URL（透過を保持） */
	src: string;
	width: number;
	height: number;
};

function decodeImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () =>
			reject(new ImageFileError("画像を読み込めませんでした"));
		img.src = src;
	});
}

/**
 * 画像ファイルを検証して読み込み、長辺 maxSide 以下に縮小した PNG data URL を返す。
 * （元画像をそのまま持つと下書き保存や描画が重くなるため）
 */
export async function loadImageFile(
	file: File,
	maxSide = MAX_IMAGE_SIDE,
): Promise<LoadedImage> {
	if (!file.type.startsWith("image/")) {
		throw new ImageFileError("画像ファイルを選択してください");
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new ImageFileError("画像サイズが大きすぎます（上限 15MB）");
	}

	const objectUrl = URL.createObjectURL(file);
	try {
		const img = await decodeImage(objectUrl);
		const w = img.naturalWidth;
		const h = img.naturalHeight;
		if (!w || !h) throw new ImageFileError("画像を読み込めませんでした");

		const ratio = Math.min(1, maxSide / Math.max(w, h));
		const width = Math.max(1, Math.round(w * ratio));
		const height = Math.max(1, Math.round(h * ratio));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new ImageFileError("画像を処理できませんでした");
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
		ctx.drawImage(img, 0, 0, width, height);
		return { src: canvas.toDataURL("image/png"), width, height };
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

/** data URL から描画用の画像要素を作る */
export function createImageElement(src: string): Promise<HTMLImageElement> {
	return decodeImage(src);
}

/** クリップボード / ドロップの DataTransfer から画像ファイルだけを取り出す */
export function imageFilesFrom(data: DataTransfer | null): File[] {
	if (!data) return [];
	return Array.from(data.files).filter((f) => f.type.startsWith("image/"));
}

const toHex = (n: number) => n.toString(16).padStart(2, "0");

/**
 * RGBA ピクセル列（gridSize × gridSize）をピクセルエディターのグリッドに変換する。
 * 透明に近いピクセルは背景色（白）として扱い、半透明は白と合成する。
 */
export function rgbaToGrid(
	data: Uint8ClampedArray,
	gridSize: number,
	background = "#ffffff",
): string[][] {
	const grid: string[][] = [];
	for (let row = 0; row < gridSize; row++) {
		const line: string[] = [];
		for (let col = 0; col < gridSize; col++) {
			const i = (row * gridSize + col) * 4;
			const a = data[i + 3] / 255;
			if (a < 0.1) {
				line.push(background);
				continue;
			}
			// 白背景とアルファ合成
			const blend = (c: number) => Math.round(c * a + 255 * (1 - a));
			line.push(
				`#${toHex(blend(data[i]))}${toHex(blend(data[i + 1]))}${toHex(blend(data[i + 2]))}`,
			);
		}
		grid.push(line);
	}
	return grid;
}

/** 画像をグリッドサイズに収まるよう縮小（中央・縦横比維持）してピクセル化する */
export function pixelateImage(
	img: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
	gridSize: number,
): string[][] {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = gridSize;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new ImageFileError("画像を処理できませんでした");
	const ratio = Math.min(
		gridSize / img.naturalWidth,
		gridSize / img.naturalHeight,
	);
	const w = img.naturalWidth * ratio;
	const h = img.naturalHeight * ratio;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(img, (gridSize - w) / 2, (gridSize - h) / 2, w, h);
	return rgbaToGrid(ctx.getImageData(0, 0, gridSize, gridSize).data, gridSize);
}
