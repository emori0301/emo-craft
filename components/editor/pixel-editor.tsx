"use client";

import {
	Circle,
	Download,
	Eraser,
	Grid3X3,
	Minus,
	PaintBucket,
	Pause,
	Pencil,
	Pipette,
	Play,
	Plus,
	Redo2,
	Save,
	Square,
	Trash2,
	Triangle,
	Undo2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LoginDialog } from "@/components/editor/login-dialog";
import { SaveEmojiForm } from "@/components/editor/save-emoji-form";
import {
	ShortcutHelp,
	type ShortcutItem,
} from "@/components/editor/shortcut-help";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSaveEmoji } from "@/hooks/use-save-emoji";
import { EXPORT_SIZE } from "@/lib/editor/constants";
import { downloadDataUrl } from "@/lib/editor/download";
import {
	clearDraft,
	loadDraft,
	type PixelEditorDraft,
} from "@/lib/editor/draft";
import { encodeGifToDataUrl, type GifFrame } from "@/lib/editor/gif";
import {
	type Cell,
	createEmptyGrid,
	floodFill,
	plotCircle,
	plotLine,
	plotRect,
	plotTriangle,
} from "@/lib/pixel/shapes";
import { cn } from "@/lib/utils";

const FIXED_DISPLAY_SIZE = 512;
const MAX_FRAMES = 8;

/** キャンバスの表示基準サイズ（ズーム 100% 時） */
const BASE_DISPLAY_SIZE = 384;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

const DEFAULT_COLORS = [
	"#000000",
	"#ffffff",
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
	"#78716c",
];

type ToolType =
	| "pencil"
	| "eraser"
	| "bucket"
	| "eyedropper"
	| "line"
	| "rect"
	| "circle"
	| "triangle";

const TOOL_DEFS: {
	tool: ToolType;
	label: string;
	shortcut: string;
	icon: React.ReactNode;
}[] = [
	{
		tool: "pencil",
		label: "ペン",
		shortcut: "P",
		icon: <Pencil className="h-4 w-4" />,
	},
	{
		tool: "eraser",
		label: "消しゴム",
		shortcut: "E",
		icon: <Eraser className="h-4 w-4" />,
	},
	{
		tool: "bucket",
		label: "塗りつぶし",
		shortcut: "F",
		icon: <PaintBucket className="h-4 w-4" />,
	},
	{
		tool: "eyedropper",
		label: "スポイト",
		shortcut: "I",
		icon: <Pipette className="h-4 w-4" />,
	},
	{
		tool: "line",
		label: "直線",
		shortcut: "L",
		icon: <Minus className="h-4 w-4" />,
	},
	{
		tool: "rect",
		label: "四角形",
		shortcut: "R",
		icon: <Square className="h-4 w-4" />,
	},
	{
		tool: "circle",
		label: "円",
		shortcut: "C",
		icon: <Circle className="h-4 w-4" />,
	},
	{
		tool: "triangle",
		label: "三角形",
		shortcut: "T",
		icon: <Triangle className="h-4 w-4" />,
	},
];

const SHAPE_TOOLS: ToolType[] = ["line", "rect", "circle", "triangle"];

const PIXEL_SHORTCUTS: ShortcutItem[] = [
	{ keys: ["P"], description: "ペン" },
	{ keys: ["E"], description: "消しゴム" },
	{ keys: ["F"], description: "塗りつぶし" },
	{ keys: ["I"], description: "スポイト" },
	{ keys: ["L"], description: "直線" },
	{ keys: ["R"], description: "四角形" },
	{ keys: ["C"], description: "円" },
	{ keys: ["T"], description: "三角形" },
	{ keys: ["Alt", "クリック"], description: "その場でスポイト（色を拾う）" },
	{ keys: ["G"], description: "グリッド線の表示 / 非表示" },
	{ keys: ["+", "−"], description: "ズームイン / ズームアウト" },
	{ keys: ["⌘/Ctrl", "Z"], description: "元に戻す" },
	{ keys: ["⌘/Ctrl", "Shift", "Z"], description: "やり直す" },
	{ keys: ["Esc"], description: "図形の描画をキャンセル" },
	{ keys: ["1", "〜", "8"], description: "フレームを選択" },
	{ keys: ["Space"], description: "再生 / 停止（フレームが2つ以上のとき）" },
	{ keys: ["⌘/Ctrl", "S"], description: "保存ダイアログを開く" },
	{ keys: ["⌘/Ctrl", "Enter"], description: "ダウンロード" },
	{ keys: ["?"], description: "ショートカット一覧を表示" },
];

/** セクション見出し */
function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
			{children}
		</h3>
	);
}

/** フレームのサムネイル（グリッド線なしの縮小プレビュー） */
function FrameThumb({
	frame,
	gridSize,
	selected,
	index,
	onClick,
}: {
	frame: string[][];
	gridSize: number;
	selected: boolean;
	index: number;
	onClick: () => void;
}) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const T = 64;
		canvas.width = canvas.height = T;
		const cs = T / gridSize;
		for (let row = 0; row < gridSize; row++) {
			for (let col = 0; col < gridSize; col++) {
				ctx.fillStyle = frame[row][col];
				ctx.fillRect(col * cs, row * cs, cs, cs);
			}
		}
	}, [frame, gridSize]);

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`フレーム ${index + 1} を選択`}
			aria-pressed={selected}
			className={cn(
				"relative shrink-0 rounded-lg border-2 overflow-hidden transition",
				selected
					? "border-primary ring-2 ring-primary/30"
					: "border-border hover:border-muted-foreground/60",
			)}
		>
			<canvas
				ref={ref}
				className="block h-14 w-14"
				style={{ imageRendering: "pixelated" }}
			/>
			<span className="absolute bottom-0 right-0 rounded-tl bg-background/80 px-1 text-[10px] font-medium tabular-nums">
				{index + 1}
			</span>
		</button>
	);
}

interface PixelEditorInitialValues {
	pixelData?: string[][];
	pixelCanvasSize?: number;
}

export function PixelEditor({
	initialValues,
	active = true,
}: {
	initialValues?: PixelEditorInitialValues;
	/** タブが表示中かどうか（非表示中はショートカットを無効化） */
	active?: boolean;
} = {}) {
	const initSize = initialValues?.pixelCanvasSize ?? 32;
	const initGrid = initialValues?.pixelData ?? createEmptyGrid(initSize);

	const [canvasSize, setCanvasSize] = useState(String(initSize));
	const [frames, setFrames] = useState<string[][][]>(() => [
		initGrid.map((r) => [...r]),
	]);
	const [frameIds, setFrameIds] = useState<string[]>(() => [
		crypto.randomUUID(),
	]);
	const [currentFrame, setCurrentFrame] = useState(0);
	// stack と index を1つの state にまとめ、非同期更新での不整合を防ぐ
	const [history, setHistory] = useState<{
		stack: string[][][][];
		index: number;
	}>(() => ({
		stack: [[initGrid.map((r) => [...r])]],
		index: 0,
	}));
	const [drawColor, setDrawColor] = useState("#000000");
	const [customColor, setCustomColor] = useState("#000000");
	const [activeTool, setActiveTool] = useState<ToolType>("pencil");
	const [isFilled, setIsFilled] = useState(true);
	const [isDrawing, setIsDrawing] = useState(false);
	const [shapeAnchor, setShapeAnchor] = useState<Cell | null>(null);
	const [previewCells, setPreviewCells] = useState<Cell[]>([]);
	const [frameDelay, setFrameDelay] = useState(200);
	const [isPlaying, setIsPlaying] = useState(false);
	const [outputFormat, setOutputFormat] = useState<"png" | "gif">("png");
	const [isSavingGif, setIsSavingGif] = useState(false);
	const [zoom, setZoom] = useState(1);
	const [showGrid, setShowGrid] = useState(true);
	const [hoverCell, setHoverCell] = useState<Cell | null>(null);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const miniCanvasRef = useRef<HTMLCanvasElement>(null);

	const size = Number.parseInt(canvasSize, 10);
	const cellSize = FIXED_DISPLAY_SIZE / size;

	// ---- History ----

	const saveToHistory = useCallback((snapshot: string[][][]) => {
		const copy = snapshot.map((f) => f.map((row) => [...row]));
		setHistory((h) => {
			const stack = [...h.stack.slice(0, h.index + 1), copy].slice(-50);
			return { stack, index: stack.length - 1 };
		});
	}, []);

	const undo = useCallback(() => {
		if (history.index <= 0) return;
		const snap = history.stack[history.index - 1];
		setFrames(snap.map((f) => f.map((row) => [...row])));
		setCurrentFrame((cf) => Math.min(cf, snap.length - 1));
		setHistory((h) => ({ ...h, index: h.index - 1 }));
	}, [history]);

	const redo = useCallback(() => {
		if (history.index >= history.stack.length - 1) return;
		const snap = history.stack[history.index + 1];
		setFrames(snap.map((f) => f.map((row) => [...row])));
		setCurrentFrame((cf) => Math.min(cf, snap.length - 1));
		setHistory((h) => ({ ...h, index: h.index + 1 }));
	}, [history]);

	// ---- Canvas size ----

	const handleCanvasSizeChange = (newSize: string) => {
		const n = Number.parseInt(newSize, 10);
		const newFrames = [createEmptyGrid(n)];
		setCanvasSize(newSize);
		setFrames(newFrames);
		setFrameIds([crypto.randomUUID()]);
		setCurrentFrame(0);
		setHistory({
			stack: [newFrames.map((f) => f.map((row) => [...row]))],
			index: 0,
		});
	};

	// ---- Clear ----

	const clearCanvas = useCallback(() => {
		const newFrames = frames.map((f, i) =>
			i === currentFrame ? createEmptyGrid(size) : f,
		);
		setFrames(newFrames);
		saveToHistory(newFrames);
	}, [size, frames, currentFrame, saveToHistory]);

	// ---- Pencil drawing ----

	// ストロークで実際にセルが変化したかどうか（no-op を履歴に積まないため）
	const strokeDirtyRef = useRef(false);

	const drawCell = useCallback(
		(row: number, col: number) => {
			if (row < 0 || row >= size || col < 0 || col >= size) return;
			const color = activeTool === "eraser" ? "#ffffff" : drawColor;
			setFrames((prev) => {
				const frame = prev[currentFrame];
				if (!frame || frame[row][col] === color) return prev;
				strokeDirtyRef.current = true;
				return prev.map((f, i) => {
					if (i !== currentFrame) return f;
					return f.map((r, ri) => {
						if (ri !== row) return r;
						const next = [...r];
						next[col] = color;
						return next;
					});
				});
			});
		},
		[size, activeTool, drawColor, currentFrame],
	);

	// ---- Shape tools ----

	const computeShapeCells = useCallback(
		(r0: number, c0: number, r1: number, c1: number): Cell[] => {
			switch (activeTool) {
				case "line":
					return plotLine(r0, c0, r1, c1);
				case "rect":
					return plotRect(r0, c0, r1, c1, isFilled);
				case "circle":
					return plotCircle(r0, c0, r1, c1, isFilled);
				case "triangle":
					return plotTriangle(r0, c0, r1, c1, isFilled);
				default:
					return [];
			}
		},
		[activeTool, isFilled],
	);

	const getGridPos = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>): Cell => {
			const canvas = canvasRef.current;
			if (!canvas) return [-1, -1];
			const rect = canvas.getBoundingClientRect();
			return [
				Math.floor(((e.clientY - rect.top) / rect.height) * size),
				Math.floor(((e.clientX - rect.left) / rect.width) * size),
			];
		},
		[size],
	);

	/** クリック位置の色を拾って描画色にする（スポイト / Alt+クリック） */
	const pickColorAt = useCallback(
		(row: number, col: number) => {
			const picked = frames[currentFrame]?.[row]?.[col];
			if (!picked) return;
			setDrawColor(picked);
			setCustomColor(picked);
		},
		[frames, currentFrame],
	);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			e.preventDefault();
			// キャンバス外までドラッグしてもイベントを受け続ける（タッチ操作の安定化）
			e.currentTarget.setPointerCapture(e.pointerId);
			const [row, col] = getGridPos(e);
			if (row < 0 || row >= size || col < 0 || col >= size) return;

			// Alt+クリックはツールに関わらずその場でスポイト
			if (e.altKey || activeTool === "eyedropper") {
				pickColorAt(row, col);
				// スポイトツールで拾ったらペンに戻す（すぐ描ける）
				if (activeTool === "eyedropper") setActiveTool("pencil");
				return;
			}

			if (activeTool === "bucket") {
				const cells = floodFill(frames[currentFrame], row, col, drawColor);
				if (cells.length > 0) {
					const newFrames = frames.map((f, fi) => {
						if (fi !== currentFrame) return f;
						const g = f.map((r) => [...r]);
						for (const [cr, cc] of cells) g[cr][cc] = drawColor;
						return g;
					});
					setFrames(newFrames);
					saveToHistory(newFrames);
				}
				return;
			}

			if (SHAPE_TOOLS.includes(activeTool)) {
				setShapeAnchor([row, col]);
				setPreviewCells([[row, col]]);
				return;
			}
			strokeDirtyRef.current = false;
			setIsDrawing(true);
			drawCell(row, col);
		},
		[
			getGridPos,
			size,
			activeTool,
			drawCell,
			pickColorAt,
			frames,
			currentFrame,
			drawColor,
			saveToHistory,
		],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const [row, col] = getGridPos(e);
			// ホバー中のセルをハイライト（描画精度の向上）
			setHoverCell(
				row >= 0 && row < size && col >= 0 && col < size ? [row, col] : null,
			);
			if (shapeAnchor) {
				setPreviewCells(
					computeShapeCells(shapeAnchor[0], shapeAnchor[1], row, col).filter(
						([r, c]) => r >= 0 && r < size && c >= 0 && c < size,
					),
				);
				return;
			}
			if (isDrawing && row >= 0 && row < size && col >= 0 && col < size) {
				drawCell(row, col);
			}
		},
		[shapeAnchor, computeShapeCells, size, isDrawing, drawCell, getGridPos],
	);

	const commitShape = useCallback(() => {
		if (!shapeAnchor || previewCells.length === 0) {
			setShapeAnchor(null);
			setPreviewCells([]);
			return;
		}
		const color = activeTool === "eraser" ? "#ffffff" : drawColor;
		const newFrames = frames.map((f, fi) => {
			if (fi !== currentFrame) return f;
			const g = f.map((row) => [...row]);
			for (const [r, c] of previewCells) g[r][c] = color;
			return g;
		});
		setFrames(newFrames);
		saveToHistory(newFrames);
		setShapeAnchor(null);
		setPreviewCells([]);
	}, [
		shapeAnchor,
		previewCells,
		activeTool,
		drawColor,
		frames,
		currentFrame,
		saveToHistory,
	]);

	const handlePointerLeaveCanvas = useCallback(() => {
		setHoverCell(null);
	}, []);

	const handlePointerUpOrLeave = useCallback(() => {
		if (shapeAnchor) {
			commitShape();
			return;
		}
		if (!isDrawing) return;
		// 何も変わらなかったストロークは履歴に積まない
		if (strokeDirtyRef.current) {
			setFrames((current) => {
				saveToHistory(current);
				return current;
			});
			strokeDirtyRef.current = false;
		}
		setIsDrawing(false);
	}, [shapeAnchor, commitShape, isDrawing, saveToHistory]);

	// ---- Keyboard shortcuts ----
	// 最新の状態・ハンドラを ref 経由で参照し、リスナーは一度だけ張る
	const shortcutRef = useRef({
		undo: () => {},
		redo: () => {},
		save: () => {},
		download: () => {},
		togglePlay: () => {},
		selectFrame: (_i: number) => {},
		frameCount: 1,
		active: true,
	});

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!shortcutRef.current.active) return;
			const target = e.target as HTMLElement | null;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable
			) {
				return;
			}
			const actions = shortcutRef.current;

			if (e.metaKey || e.ctrlKey) {
				const key = e.key.toLowerCase();
				if (key === "z") {
					e.preventDefault();
					if (e.shiftKey) actions.redo();
					else actions.undo();
				} else if (key === "y") {
					e.preventDefault();
					actions.redo();
				} else if (key === "s") {
					e.preventDefault();
					actions.save();
				} else if (e.key === "Enter") {
					e.preventDefault();
					actions.download();
				}
				return;
			}

			if (e.key === "Escape") {
				// 描画中の図形をキャンセル
				setShapeAnchor(null);
				setPreviewCells([]);
				return;
			}
			if (e.key === " ") {
				if (actions.frameCount > 1) {
					e.preventDefault();
					actions.togglePlay();
				}
				return;
			}

			// ズーム / グリッド表示
			if (e.key === "+" || e.key === "=") {
				setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
				return;
			}
			if (e.key === "-") {
				setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
				return;
			}
			if (e.key.toLowerCase() === "g") {
				setShowGrid((v) => !v);
				return;
			}

			// ツール切替
			const toolByKey: Record<string, ToolType> = {
				p: "pencil",
				e: "eraser",
				f: "bucket",
				i: "eyedropper",
				l: "line",
				r: "rect",
				c: "circle",
				t: "triangle",
			};
			const tool = toolByKey[e.key.toLowerCase()];
			if (tool) {
				setActiveTool(tool);
				return;
			}

			// 数字キーでフレーム選択
			const num = Number.parseInt(e.key, 10);
			if (num >= 1 && num <= actions.frameCount) {
				actions.selectFrame(num - 1);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// Ctrl/⌘ + ホイールでズーム（ブラウザのページズームは抑止）
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const onWheel = (e: WheelEvent) => {
			if (!(e.ctrlKey || e.metaKey)) return;
			e.preventDefault();
			setZoom((z) =>
				Math.min(
					ZOOM_MAX,
					Math.max(ZOOM_MIN, z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)),
				),
			);
		};
		canvas.addEventListener("wheel", onWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", onWheel);
	}, []);

	// ---- Frame management ----

	const addFrame = useCallback(() => {
		if (frames.length >= MAX_FRAMES) return;
		const duplicate = frames[currentFrame].map((row) => [...row]);
		const newFrames = [
			...frames.slice(0, currentFrame + 1),
			duplicate,
			...frames.slice(currentFrame + 1),
		];
		const newIds = [
			...frameIds.slice(0, currentFrame + 1),
			crypto.randomUUID(),
			...frameIds.slice(currentFrame + 1),
		];
		setFrames(newFrames);
		setFrameIds(newIds);
		setCurrentFrame(currentFrame + 1);
		saveToHistory(newFrames);
	}, [frames, frameIds, currentFrame, saveToHistory]);

	const deleteFrame = useCallback(() => {
		if (frames.length <= 1) return;
		const newFrames = frames.filter((_, i) => i !== currentFrame);
		const newIds = frameIds.filter((_, i) => i !== currentFrame);
		setFrames(newFrames);
		setFrameIds(newIds);
		setCurrentFrame(Math.min(currentFrame, newFrames.length - 1));
		saveToHistory(newFrames);
	}, [frames, frameIds, currentFrame, saveToHistory]);

	// ---- Animation playback ----

	useEffect(() => {
		if (!isPlaying || frames.length <= 1) return;
		const id = setInterval(
			() => setCurrentFrame((f) => (f + 1) % frames.length),
			frameDelay,
		);
		return () => clearInterval(id);
	}, [isPlaying, frames.length, frameDelay]);

	useEffect(() => {
		if (frames.length <= 1) setIsPlaying(false);
	}, [frames.length]);

	// ---- Canvas rendering ----
	// コミット済みセルとグリッド線をオフスクリーンにキャッシュし、
	// ドラッグ中のプレビュー更新では合成のみ行う（64×64 で全セル再描画しない）。

	const baseLayerRef = useRef<HTMLCanvasElement | null>(null);
	const baseLayerKeyRef = useRef<{
		frame: string[][] | undefined;
		size: number;
	} | null>(null);
	const gridLayerRef = useRef<HTMLCanvasElement | null>(null);
	const gridLayerSizeRef = useRef<number | null>(null);

	const renderCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// base layer: フレーム内容が変わったときだけ再描画（frames は不変更新なので同一性比較で足りる）
		const frame = frames[currentFrame];
		if (
			!baseLayerRef.current ||
			baseLayerKeyRef.current?.frame !== frame ||
			baseLayerKeyRef.current?.size !== size
		) {
			const base = baseLayerRef.current ?? document.createElement("canvas");
			base.width = base.height = FIXED_DISPLAY_SIZE;
			const baseCtx = base.getContext("2d");
			if (!baseCtx) return;
			const cells = frame ?? createEmptyGrid(size);
			for (let row = 0; row < size; row++) {
				for (let col = 0; col < size; col++) {
					baseCtx.fillStyle = cells[row][col];
					baseCtx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
				}
			}
			baseLayerRef.current = base;
			baseLayerKeyRef.current = { frame, size };
		}

		// grid layer: サイズが変わったときだけ再描画
		if (!gridLayerRef.current || gridLayerSizeRef.current !== size) {
			const grid = gridLayerRef.current ?? document.createElement("canvas");
			grid.width = grid.height = FIXED_DISPLAY_SIZE;
			const gridCtx = grid.getContext("2d");
			if (!gridCtx) return;
			gridCtx.strokeStyle = "#e5e7eb";
			gridCtx.lineWidth = 0.5;
			gridCtx.beginPath();
			for (let i = 0; i <= size; i++) {
				const p = i * cellSize;
				gridCtx.moveTo(p, 0);
				gridCtx.lineTo(p, FIXED_DISPLAY_SIZE);
				gridCtx.moveTo(0, p);
				gridCtx.lineTo(FIXED_DISPLAY_SIZE, p);
			}
			gridCtx.stroke();
			gridLayerRef.current = grid;
			gridLayerSizeRef.current = size;
		}

		// 合成
		if (
			canvas.width !== FIXED_DISPLAY_SIZE ||
			canvas.height !== FIXED_DISPLAY_SIZE
		) {
			canvas.width = FIXED_DISPLAY_SIZE;
			canvas.height = FIXED_DISPLAY_SIZE;
		} else {
			ctx.clearRect(0, 0, FIXED_DISPLAY_SIZE, FIXED_DISPLAY_SIZE);
		}
		ctx.drawImage(baseLayerRef.current, 0, 0);

		if (previewCells.length > 0) {
			ctx.globalAlpha = 0.65;
			ctx.fillStyle = activeTool === "eraser" ? "#ffffff" : drawColor;
			for (const [r, c] of previewCells) {
				ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
			}
			ctx.globalAlpha = 1;
		}

		if (showGrid) {
			ctx.drawImage(gridLayerRef.current, 0, 0);
		}

		// ホバー中のセルを枠でハイライト
		if (hoverCell && !isPlaying) {
			const [hr, hc] = hoverCell;
			ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
			ctx.lineWidth = 2;
			ctx.strokeRect(
				hc * cellSize + 1,
				hr * cellSize + 1,
				cellSize - 2,
				cellSize - 2,
			);
		}
	}, [
		frames,
		currentFrame,
		previewCells,
		drawColor,
		activeTool,
		size,
		cellSize,
		showGrid,
		hoverCell,
		isPlaying,
	]);

	useEffect(() => {
		renderCanvas();
	}, [renderCanvas]);

	// 実寸プレビュー（グリッド線なし・128px）
	useEffect(() => {
		const canvas = miniCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		canvas.width = canvas.height = EXPORT_SIZE;
		const frame = frames[currentFrame];
		if (!frame) return;
		const cs = EXPORT_SIZE / size;
		for (let row = 0; row < size; row++) {
			for (let col = 0; col < size; col++) {
				ctx.fillStyle = frame[row][col];
				ctx.fillRect(col * cs, row * cs, cs, cs);
			}
		}
	}, [frames, currentFrame, size]);

	// ---- Export ----

	const renderFrameToCanvas = useCallback(
		(frame: string[][]): HTMLCanvasElement => {
			const canvas = document.createElement("canvas");
			canvas.width = EXPORT_SIZE;
			canvas.height = EXPORT_SIZE;
			const ctx = canvas.getContext("2d");
			if (!ctx) return canvas;
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
			const cs = EXPORT_SIZE / size;
			for (let row = 0; row < size; row++) {
				for (let col = 0; col < size; col++) {
					ctx.fillStyle = frame[row][col];
					ctx.fillRect(col * cs, row * cs, cs, cs);
				}
			}
			return canvas;
		},
		[size],
	);

	const getImageData = useCallback(
		() => renderFrameToCanvas(frames[currentFrame]).toDataURL("image/png"),
		[frames, currentFrame, renderFrameToCanvas],
	);

	const downloadPng = useCallback(() => {
		downloadDataUrl(getImageData(), `emoji_pixel_${Date.now()}.png`);
	}, [getImageData]);

	const buildGifDataUrl = useCallback(async (): Promise<string> => {
		const gifFrames: GifFrame[] = [];
		for (const frame of frames) {
			const canvas = renderFrameToCanvas(frame);
			const ctx = canvas.getContext("2d");
			if (!ctx) continue;
			gifFrames.push({
				imageData: ctx.getImageData(0, 0, EXPORT_SIZE, EXPORT_SIZE),
				delay: frameDelay,
			});
		}
		return encodeGifToDataUrl(gifFrames, EXPORT_SIZE, EXPORT_SIZE);
	}, [frames, renderFrameToCanvas, frameDelay]);

	const [isDownloading, setIsDownloading] = useState(false);

	const downloadGif = useCallback(async () => {
		setIsDownloading(true);
		try {
			const dataUrl = await buildGifDataUrl();
			downloadDataUrl(dataUrl, `emoji_pixel_${Date.now()}.gif`);
		} finally {
			setIsDownloading(false);
		}
	}, [buildGifDataUrl]);

	const handleDownload = useCallback(() => {
		if (isDownloading) return;
		if (outputFormat === "gif" && frames.length > 1) downloadGif();
		else downloadPng();
	}, [isDownloading, outputFormat, frames.length, downloadGif, downloadPng]);

	// ---- Save ----

	const {
		saveName,
		setSaveName,
		savePublic,
		setSavePublic,
		showSaveForm,
		setShowSaveForm,
		showLoginDialog,
		setShowLoginDialog,
		openSaveForm,
		loginAndContinue,
		submitSave,
		isSaving,
	} = useSaveEmoji({
		collectDraft: () => ({
			type: "PIXEL",
			frames,
			canvasSize: size,
			frameDelay,
			savedAt: Date.now(),
		}),
	});

	// ログイン往復後の下書き復元（編集モードでは提案しない）
	const [availableDraft, setAvailableDraft] = useState<PixelEditorDraft | null>(
		null,
	);
	useEffect(() => {
		if (initialValues) return;
		const draft = loadDraft();
		if (draft?.type === "PIXEL") setAvailableDraft(draft);
	}, [initialValues]);

	const restoreDraft = () => {
		if (!availableDraft) return;
		const restored = availableDraft.frames.map((f) => f.map((row) => [...row]));
		setCanvasSize(String(availableDraft.canvasSize));
		setFrames(restored);
		setFrameIds(restored.map(() => crypto.randomUUID()));
		setCurrentFrame(0);
		setFrameDelay(availableDraft.frameDelay);
		setHistory({
			stack: [restored.map((f) => f.map((row) => [...row]))],
			index: 0,
		});
		clearDraft();
		setAvailableDraft(null);
		toast.success("編集内容を復元しました");
	};

	const discardDraft = () => {
		clearDraft();
		setAvailableDraft(null);
	};

	const handleSaveSubmit = async () => {
		let imageData: string;
		if (outputFormat === "gif" && frames.length > 1) {
			setIsSavingGif(true);
			try {
				imageData = await buildGifDataUrl();
			} finally {
				setIsSavingGif(false);
			}
		} else {
			imageData = getImageData();
		}
		submitSave({
			editorType: "PIXEL",
			imageData,
			pixelData: frames[currentFrame],
			pixelCanvasSize: size,
		});
	};

	const isShapeTool = SHAPE_TOOLS.includes(activeTool);
	const isAnimated = frames.length > 1;

	// ショートカットから最新のハンドラを呼べるように毎レンダー更新
	shortcutRef.current = {
		undo,
		redo,
		save: openSaveForm,
		download: handleDownload,
		togglePlay: () => setIsPlaying((p) => !p),
		selectFrame: (i: number) => setCurrentFrame(i),
		frameCount: frames.length,
		active,
	};

	return (
		<div>
			{availableDraft && (
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
					<p className="text-sm">
						ログイン前の編集内容があります。復元しますか？
					</p>
					<div className="flex gap-2">
						<Button size="sm" onClick={restoreDraft}>
							復元する
						</Button>
						<Button size="sm" variant="ghost" onClick={discardDraft}>
							破棄
						</Button>
					</div>
				</div>
			)}

			<div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
				{/* ==== ワークスペース（左） ==== */}
				<div className="space-y-3">
					{/* ツールバー */}
					<div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card p-2">
						<div className="flex gap-1">
							{TOOL_DEFS.map(({ tool, label, shortcut, icon }) => (
								<Button
									key={tool}
									variant={activeTool === tool ? "default" : "ghost"}
									size="sm"
									onClick={() => setActiveTool(tool)}
									title={`${label} (${shortcut})`}
									aria-label={label}
									aria-pressed={activeTool === tool}
									className="px-2.5"
								>
									{icon}
								</Button>
							))}
						</div>
						{isShapeTool && (
							<div className="flex items-center gap-1.5 pl-1">
								<Switch
									checked={isFilled}
									onCheckedChange={setIsFilled}
									id="fill-toggle"
								/>
								<Label
									htmlFor="fill-toggle"
									className="text-xs cursor-pointer whitespace-nowrap"
								>
									塗り
								</Label>
							</div>
						)}
						<div className="mx-1 h-6 w-px bg-border" />
						<Button
							variant="ghost"
							size="sm"
							onClick={undo}
							disabled={history.index <= 0}
							title="元に戻す (Ctrl+Z)"
							aria-label="元に戻す"
							className="px-2.5"
						>
							<Undo2 className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={redo}
							disabled={history.index >= history.stack.length - 1}
							title="やり直す (Ctrl+Shift+Z)"
							aria-label="やり直す"
							className="px-2.5"
						>
							<Redo2 className="h-4 w-4" />
						</Button>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									title="クリア"
									aria-label="キャンバスをクリア"
									className="px-2.5 text-red-500 hover:text-red-600"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										キャンバスをクリアしますか？
									</AlertDialogTitle>
									<AlertDialogDescription>
										現在のフレームの内容がすべて消去されます（元に戻すで復元できます）。
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>キャンセル</AlertDialogCancel>
									<AlertDialogAction onClick={clearCanvas}>
										クリアする
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
						<div className="mx-1 h-6 w-px bg-border" />
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowGrid((v) => !v)}
							title={`グリッド線 ${showGrid ? "非表示" : "表示"} (G)`}
							aria-label="グリッド線の表示切替"
							aria-pressed={showGrid}
							className={cn("px-2.5", !showGrid && "text-muted-foreground/50")}
						>
							<Grid3X3 className="h-4 w-4" />
						</Button>
						<div className="flex items-center gap-0.5">
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))
								}
								disabled={zoom <= ZOOM_MIN}
								title="ズームアウト (−)"
								aria-label="ズームアウト"
								className="px-2"
							>
								<ZoomOut className="h-4 w-4" />
							</Button>
							<button
								type="button"
								onClick={() => setZoom(1)}
								title="クリックで 100% に戻す"
								className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground hover:text-foreground transition"
							>
								{Math.round(zoom * 100)}%
							</button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))
								}
								disabled={zoom >= ZOOM_MAX}
								title="ズームイン (+)"
								aria-label="ズームイン"
								className="px-2"
							>
								<ZoomIn className="h-4 w-4" />
							</Button>
						</div>
						<div className="ml-auto">
							<ShortcutHelp shortcuts={PIXEL_SHORTCUTS} enabled={active} />
						</div>
					</div>

					{/* キャンバス（ズーム時はスクロールでパン） */}
					<div
						className="rounded-xl border bg-muted p-2 sm:p-3 w-full overflow-auto"
						style={{ maxHeight: "min(72vh, 640px)" }}
					>
						<canvas
							ref={canvasRef}
							aria-label="ピクセル描画キャンバス"
							width={FIXED_DISPLAY_SIZE}
							height={FIXED_DISPLAY_SIZE}
							className={`block touch-none select-none rounded-lg mx-auto ${isPlaying ? "cursor-default" : "cursor-crosshair"}`}
							style={{
								imageRendering: "pixelated",
								width: Math.round(BASE_DISPLAY_SIZE * zoom),
								height: Math.round(BASE_DISPLAY_SIZE * zoom),
								maxWidth: zoom <= 1 ? "100%" : undefined,
							}}
							onPointerDown={isPlaying ? undefined : handlePointerDown}
							onPointerMove={isPlaying ? undefined : handlePointerMove}
							onPointerUp={isPlaying ? undefined : handlePointerUpOrLeave}
							onPointerLeave={() => {
								handlePointerLeaveCanvas();
								if (!isPlaying) handlePointerUpOrLeave();
							}}
							onContextMenu={(e) => e.preventDefault()}
						/>
					</div>

					{/* フレーム（フィルムストリップ） */}
					<div className="rounded-xl border bg-card p-3 space-y-2.5">
						<div className="flex items-center justify-between">
							<SectionLabel>アニメーションフレーム</SectionLabel>
							<span className="text-xs text-muted-foreground tabular-nums">
								{currentFrame + 1} / {frames.length}
							</span>
						</div>

						<div className="flex items-center gap-2 overflow-x-auto pb-1">
							{frameIds.map((fid, i) => (
								<FrameThumb
									key={fid}
									frame={frames[i]}
									gridSize={size}
									selected={currentFrame === i}
									index={i}
									onClick={() => setCurrentFrame(i)}
								/>
							))}
							{frames.length < MAX_FRAMES && (
								<button
									type="button"
									onClick={addFrame}
									aria-label="フレームを追加（現在のフレームを複製）"
									title="フレームを追加"
									className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-muted-foreground/60 hover:text-foreground"
								>
									<Plus className="h-5 w-5" />
								</button>
							)}
						</div>

						{isAnimated && (
							<div className="flex flex-wrap items-center gap-3 pt-1">
								<Button
									variant={isPlaying ? "default" : "outline"}
									size="sm"
									onClick={() => setIsPlaying((p) => !p)}
								>
									{isPlaying ? (
										<Pause className="h-4 w-4 mr-1.5" />
									) : (
										<Play className="h-4 w-4 mr-1.5" />
									)}
									{isPlaying ? "停止" : "再生"}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={deleteFrame}
									className="text-red-500 hover:text-red-600"
								>
									フレーム削除
								</Button>
								<div className="flex items-center gap-2 flex-1 min-w-[160px]">
									<span className="text-xs text-muted-foreground whitespace-nowrap">
										速度
									</span>
									<input
										type="range"
										min={50}
										max={1000}
										step={50}
										value={frameDelay}
										onChange={(e) => setFrameDelay(Number(e.target.value))}
										aria-label="フレーム速度"
										className="w-full accent-primary"
									/>
									<span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
										{frameDelay}ms
									</span>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* ==== 設定（右） ==== */}
				<div className="space-y-6">
					{/* カラー */}
					<section className="space-y-2.5">
						<SectionLabel>カラー</SectionLabel>
						<div className="flex flex-wrap gap-1.5">
							{DEFAULT_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => {
										setActiveTool((t) => (t === "eraser" ? "pencil" : t));
										setDrawColor(color);
										setCustomColor(color);
									}}
									aria-label={`色 ${color} を選択`}
									aria-pressed={drawColor === color && activeTool !== "eraser"}
									className={cn(
										"h-9 w-9 rounded-md border-2 transition",
										drawColor === color && activeTool !== "eraser"
											? "border-primary ring-2 ring-primary/30 scale-110"
											: "border-border hover:border-muted-foreground/60",
									)}
									style={{ backgroundColor: color }}
								/>
							))}
						</div>
						<div className="flex gap-2 items-center">
							<input
								type="color"
								value={customColor}
								onChange={(e) => {
									setActiveTool((t) => (t === "eraser" ? "pencil" : t));
									setDrawColor(e.target.value);
									setCustomColor(e.target.value);
								}}
								aria-label="カスタムカラーを選択"
								className="h-9 w-10 cursor-pointer rounded border flex-shrink-0"
							/>
							<input
								type="text"
								value={customColor}
								onChange={(e) => {
									setCustomColor(e.target.value);
									if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
										setDrawColor(e.target.value);
								}}
								aria-label="カラーコード"
								className="flex-1 rounded-md border px-3 py-2 text-sm bg-background"
								placeholder="#000000"
							/>
						</div>
					</section>

					{/* キャンバス設定 */}
					<section className="space-y-2">
						<SectionLabel>キャンバスサイズ</SectionLabel>
						<Select value={canvasSize} onValueChange={handleCanvasSizeChange}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="16">16×16（ドット太め）</SelectItem>
								<SelectItem value="32">32×32（標準）</SelectItem>
								<SelectItem value="64">64×64（細かい）</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							変更するとキャンバスはリセットされます
						</p>
					</section>

					{/* 実寸プレビュー */}
					<section className="space-y-2">
						<SectionLabel>実寸プレビュー</SectionLabel>
						<div className="flex items-center gap-3">
							<div className="rounded-md border overflow-hidden">
								<canvas
									ref={miniCanvasRef}
									role="img"
									aria-label="実寸プレビュー（128px）"
									className="block w-[64px] h-[64px]"
									style={{ imageRendering: "pixelated" }}
								/>
							</div>
							<div className="text-xs text-muted-foreground leading-relaxed">
								Slack 上での見え方
								<br />
								128×128px で書き出し
							</div>
						</div>
					</section>
				</div>
			</div>

			{/* ==== 操作バー（常時表示） ==== */}
			<div className="sticky bottom-0 z-40 mt-6 -mx-4 border-t bg-card/95 px-4 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
				<div className="flex items-center justify-end gap-2">
					{isAnimated && (
						<div className="mr-auto flex rounded-lg border p-0.5">
							{(["png", "gif"] as const).map((fmt) => (
								<button
									key={fmt}
									type="button"
									onClick={() => setOutputFormat(fmt)}
									aria-pressed={outputFormat === fmt}
									className={cn(
										"rounded-md px-3 py-1 text-xs font-medium transition",
										outputFormat === fmt
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{fmt.toUpperCase()}
								</button>
							))}
						</div>
					)}
					<Button
						onClick={handleDownload}
						size="lg"
						disabled={isDownloading}
						className="flex-1 sm:flex-none"
					>
						<Download className="mr-2 h-4 w-4" />
						{isDownloading
							? "生成中..."
							: `${isAnimated ? outputFormat.toUpperCase() : "PNG"} ダウンロード`}
					</Button>
					<Button
						onClick={openSaveForm}
						variant="outline"
						size="lg"
						className="flex-1 sm:flex-none"
					>
						<Save className="mr-2 h-4 w-4" />
						保存
					</Button>
				</div>
			</div>

			{/* 保存ダイアログ */}
			<Dialog open={showSaveForm} onOpenChange={setShowSaveForm}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>マイ絵文字に保存</DialogTitle>
					</DialogHeader>
					<SaveEmojiForm
						saveName={saveName}
						onSaveNameChange={setSaveName}
						savePublic={savePublic}
						onSavePublicChange={setSavePublic}
						onSubmit={handleSaveSubmit}
						onCancel={() => setShowSaveForm(false)}
						isSaving={isSaving}
						busyLabel={isSavingGif ? "GIF生成中..." : undefined}
					/>
				</DialogContent>
			</Dialog>

			<LoginDialog
				open={showLoginDialog}
				onOpenChange={setShowLoginDialog}
				onLogin={loginAndContinue}
			/>
		</div>
	);
}
