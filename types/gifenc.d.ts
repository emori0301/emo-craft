declare module "gifenc" {
	export type GifPalette = number[][];

	export function GIFEncoder(): {
		writeFrame(
			index: Uint8Array,
			width: number,
			height: number,
			options?: {
				palette?: GifPalette;
				delay?: number;
				repeat?: number;
				transparent?: boolean;
				transparentIndex?: number;
				dispose?: number;
			},
		): void;
		finish(): void;
		bytes(): Uint8Array<ArrayBuffer>;
	};

	export function quantize(
		data: Uint8ClampedArray | Uint8Array,
		maxColors: number,
		options?: { format?: "rgb565" | "rgb444" | "rgba4444" },
	): GifPalette;

	export function applyPalette(
		data: Uint8ClampedArray | Uint8Array,
		palette: GifPalette,
		format?: "rgb565" | "rgb444" | "rgba4444",
	): Uint8Array;
}
