"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl } from "@/components/editor/editor-ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	DEFAULT_PIXELATE_OPTIONS,
	type PixelateMode,
	pixelateRgba,
	SAMPLES_PER_CELL,
	sampleImage,
} from "@/lib/editor/pixelate";

const COLOR_OPTIONS = [
	["2", "2"],
	["4", "4"],
	["8", "8"],
	["16", "16"],
	["all", "無制限"],
] as const;

type ColorOption = (typeof COLOR_OPTIONS)[number][0];

/** 変換結果のプレビュー（グリッド線なし） */
function GridPreview({ grid }: { grid: string[][] }) {
	const ref = useRef<HTMLCanvasElement>(null);
	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;
		const n = grid.length;
		canvas.width = canvas.height = n;
		for (let row = 0; row < n; row++) {
			for (let col = 0; col < n; col++) {
				ctx.fillStyle = grid[row][col];
				ctx.fillRect(col, row, 1, 1);
			}
		}
	}, [grid]);
	return (
		<canvas
			ref={ref}
			role="img"
			aria-label="変換結果のプレビュー"
			className="block h-48 w-48 rounded-lg border sm:h-56 sm:w-56"
			style={{ imageRendering: "pixelated" }}
		/>
	);
}

/**
 * 画像をドット絵に変換して取り込むダイアログ。
 * 変換方法と色数を選び、結果をプレビューしてから取り込む。
 */
export function PixelImportDialog({
	image,
	gridSize,
	onCancel,
	onConfirm,
}: {
	/** 取り込む画像。null のときは閉じている */
	image: HTMLImageElement | null;
	gridSize: number;
	onCancel: () => void;
	onConfirm: (grid: string[][]) => void;
}) {
	const [mode, setMode] = useState<PixelateMode>(DEFAULT_PIXELATE_OPTIONS.mode);
	const [colors, setColors] = useState<ColorOption>(
		String(DEFAULT_PIXELATE_OPTIONS.colors) as ColorOption,
	);

	// サンプリング（重い）は画像とサイズが変わったときだけ行う
	const samples = useMemo(
		() => (image ? sampleImage(image, gridSize) : null),
		[image, gridSize],
	);
	const grid = useMemo(
		() =>
			samples
				? pixelateRgba(samples, gridSize, SAMPLES_PER_CELL, {
						mode,
						colors: colors === "all" ? null : Number(colors),
					})
				: null,
		[samples, gridSize, mode, colors],
	);

	return (
		<Dialog open={!!image} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>画像をドット絵にする</DialogTitle>
					<DialogDescription>
						{gridSize}×{gridSize}
						のキャンバスに変換して、いま選んでいるフレームに取り込みます。
					</DialogDescription>
				</DialogHeader>

				<div className="flex justify-center">
					{grid && <GridPreview grid={grid} />}
				</div>

				<div className="space-y-3">
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">変換方法</Label>
						<SegmentedControl
							ariaLabel="変換方法"
							value={mode}
							onChange={setMode}
							className="flex w-full [&>button]:flex-1"
							options={[
								["crisp", "くっきり（線画）"],
								["smooth", "なめらか（写真）"],
							]}
						/>
					</div>
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">色の数</Label>
						<SegmentedControl
							ariaLabel="色の数"
							value={colors}
							onChange={setColors}
							className="flex w-full [&>button]:flex-1"
							options={COLOR_OPTIONS}
						/>
						<p className="text-xs text-muted-foreground">
							色を減らすほど、輪郭の中間色（にじみ）が消えてくっきりします
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={onCancel}>
						キャンセル
					</Button>
					<Button onClick={() => grid && onConfirm(grid)} disabled={!grid}>
						取り込む
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
