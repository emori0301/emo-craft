"use client";

import {
	LocateFixed,
	ArrowDownToLine,
	ArrowUpToLine,
	FlipHorizontal2,
	ImagePlus,
	Loader2,
	Trash2,
} from "lucide-react";
import { useRef } from "react";
import {
	CHECKER_SMALL_STYLE,
	SectionLabel,
	SegmentedControl,
} from "@/components/editor/editor-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
	type ImageLayer,
	MAX_IMAGE_LAYERS,
	SCALE_LIMITS,
} from "@/lib/editor/layers";
import { cn } from "@/lib/utils";

/** ラベル + スライダー + 値表示の1行 */
export function SliderRow({
	id,
	label,
	value,
	min,
	max,
	step = 1,
	unit,
	onChange,
}: {
	id: string;
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	unit: string;
	onChange: (value: number) => void;
}) {
	return (
		<div className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3">
			<Label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</Label>
			<Slider
				id={id}
				value={[value]}
				min={min}
				max={max}
				step={step}
				onValueChange={([v]) => onChange(v)}
				aria-label={label}
				className="py-2"
			/>
			<span className="text-right text-xs tabular-nums text-muted-foreground">
				{Math.round(value)}
				{unit}
			</span>
		</div>
	);
}

export function ImageLayersPanel({
	layers,
	selectedId,
	onSelect,
	onAddFiles,
	onUpdate,
	onRemove,
	onMove,
	isLoading,
}: {
	layers: ImageLayer[];
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onAddFiles: (files: File[]) => void;
	onUpdate: (id: string, patch: Partial<ImageLayer>) => void;
	onRemove: (id: string) => void;
	onMove: (id: string, to: "front" | "back") => void;
	isLoading: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const selected = layers.find((l) => l.id === selectedId) ?? null;
	const isFull = layers.length >= MAX_IMAGE_LAYERS;

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<SectionLabel>画像</SectionLabel>
				<span className="text-xs tabular-nums text-muted-foreground">
					{layers.length}/{MAX_IMAGE_LAYERS}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{layers.map((layer, i) => (
					<button
						key={layer.id}
						type="button"
						onClick={() => onSelect(layer.id === selectedId ? null : layer.id)}
						aria-pressed={layer.id === selectedId}
						aria-label={`画像 ${i + 1} を選択`}
						className={cn(
							"h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 p-1 transition",
							layer.id === selectedId
								? "border-primary ring-2 ring-primary/30"
								: "border-border hover:border-muted-foreground/60",
						)}
						style={CHECKER_SMALL_STYLE}
					>
						<img
							src={layer.src}
							alt=""
							className="h-full w-full object-contain"
							draggable={false}
						/>
					</button>
				))}
				<Button
					type="button"
					variant="outline"
					onClick={() => inputRef.current?.click()}
					disabled={isFull || isLoading}
					className={cn(
						"border-dashed",
						layers.length > 0 ? "h-14 px-4" : "h-14 w-full sm:w-auto",
					)}
				>
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<ImagePlus className="h-4 w-4" />
					)}
					{isFull ? "上限です" : "画像を追加"}
				</Button>
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					multiple
					className="hidden"
					onChange={(e) => {
						const files = Array.from(e.target.files ?? []);
						if (files.length > 0) onAddFiles(files);
						e.target.value = "";
					}}
				/>
			</div>

			{layers.length === 0 ? (
				<p className="text-xs leading-relaxed text-muted-foreground">
					写真やイラストを重ねられます。
					<span className="hidden sm:inline">
						ドラッグ&ドロップや貼り付け（⌘/Ctrl+V）でも追加できます。
					</span>
				</p>
			) : (
				<p className="text-xs leading-relaxed text-muted-foreground">
					プレビュー上でドラッグして移動、右下の ● で拡大・回転。
					<span className="sm:hidden">2本指のピンチでも操作できます。</span>
					<span className="hidden sm:inline">
						ホイールで拡大縮小、Shift+ホイールで回転。
					</span>
				</p>
			)}

			{selected && (
				<div className="space-y-2 rounded-lg border bg-muted/30 p-3">
					<SliderRow
						id="layer-scale"
						label="大きさ"
						value={selected.scale * 100}
						min={SCALE_LIMITS.min * 100}
						max={SCALE_LIMITS.max * 100}
						unit="%"
						onChange={(v) => onUpdate(selected.id, { scale: v / 100 })}
					/>
					<SliderRow
						id="layer-rotation"
						label="回転"
						value={selected.rotation}
						min={-180}
						max={180}
						unit="°"
						onChange={(v) => onUpdate(selected.id, { rotation: v })}
					/>
					<SliderRow
						id="layer-opacity"
						label="不透明度"
						value={selected.opacity * 100}
						min={10}
						max={100}
						unit="%"
						onChange={(v) => onUpdate(selected.id, { opacity: v / 100 })}
					/>

					<div className="flex flex-wrap items-center gap-2 pt-1">
						<SegmentedControl
							ariaLabel="文字との重なり順"
							value={selected.behindText ? "behind" : "front"}
							onChange={(v) =>
								onUpdate(selected.id, { behindText: v === "behind" })
							}
							options={[
								["front", "文字の前"],
								["behind", "文字の後ろ"],
							]}
						/>
						<div className="flex flex-wrap gap-1">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="px-2.5"
								title="左右反転"
								aria-label="左右反転"
								aria-pressed={selected.flipX}
								onClick={() =>
									onUpdate(selected.id, { flipX: !selected.flipX })
								}
							>
								<FlipHorizontal2 className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="px-2.5"
								title="中央に配置"
								aria-label="中央に配置"
								onClick={() => onUpdate(selected.id, { x: 0.5, y: 0.5 })}
							>
								<LocateFixed className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="px-2.5"
								title="最前面へ"
								aria-label="最前面へ"
								onClick={() => onMove(selected.id, "front")}
							>
								<ArrowUpToLine className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="px-2.5"
								title="最背面へ"
								aria-label="最背面へ"
								onClick={() => onMove(selected.id, "back")}
							>
								<ArrowDownToLine className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="px-2.5 text-red-500 hover:text-red-600"
								title="削除 (Delete)"
								aria-label="画像を削除"
								onClick={() => onRemove(selected.id)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
