"use client";

import { ImagePlus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	CHECKER_SMALL_STYLE,
	CHECKER_STYLE,
	ColorPicker,
	DraftBanner,
	EditorActionBar,
	isTypingTarget,
	SaveDialogs,
	SectionLabel,
	SegmentedControl,
} from "@/components/editor/editor-ui";
import {
	ImageLayersPanel,
	SliderRow,
} from "@/components/editor/image-layers-panel";
import {
	ShortcutHelp,
	type ShortcutItem,
} from "@/components/editor/shortcut-help";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HANDLE_MARGIN, useCanvasGestures } from "@/hooks/use-canvas-gestures";
import { useSaveEmoji } from "@/hooks/use-save-emoji";
import { EXPORT_SIZE } from "@/lib/editor/constants";
import { downloadDataUrl } from "@/lib/editor/download";
import {
	clearDraft,
	loadDraft,
	type TextEditorDraft,
} from "@/lib/editor/draft";
import { encodeGifToDataUrl, type GifFrame } from "@/lib/editor/gif";
import {
	createImageElement,
	ImageFileError,
	imageFilesFrom,
	loadImageFile,
} from "@/lib/editor/image-file";
import {
	boxSize,
	constrainPosition,
	createImageLayer,
	DEFAULT_TEXT_TRANSFORM,
	findTargetAt,
	type ImageLayer,
	layersInDrawOrder,
	MAX_IMAGE_LAYERS,
	moveLayer,
	SCALE_LIMITS,
	TEXT_SCALE_LIMITS,
	TEXT_TARGET,
	type Transform,
	visibleHandlePosition,
} from "@/lib/editor/layers";
import {
	ANIM_CONFIGS,
	type AnimConfig,
	type AnimParams,
	type AnimType,
	AP0,
	FONT_WEIGHTS,
	FONTS,
	type GradientDirection,
	parseTextColor,
	serializeTextColor,
	TEXT_ALIGNS,
	TEXT_LIMITS,
	type TextAlign,
	trimToLimit,
} from "@/lib/editor/text-config";
import { cn, createId } from "@/lib/utils";

interface TextEditorInitialValues {
	text?: string;
	fontFamily?: string;
	fontWeight?: string;
	textColor?: string;
	backgroundColor?: string;
}

interface TextEditorProps {
	initialValues?: TextEditorInitialValues;
	/** タブが表示中かどうか（非表示中はショートカットを無効化） */
	active?: boolean;
}

const RENDER_SCALE = 4;
/** プレビュー・書き出し前の描画解像度 */
const RENDER_SIZE = EXPORT_SIZE * RENDER_SCALE;
/** 選択枠の色（ブランドのバイオレット） */
const SELECTION_COLOR = "#8b5cf6";

const TEXT_SHORTCUTS: ShortcutItem[] = [
	{ keys: ["⌘/Ctrl", "S"], description: "保存ダイアログを開く" },
	{ keys: ["⌘/Ctrl", "Enter"], description: "ダウンロード" },
	{ keys: ["⌘/Ctrl", "V"], description: "画像を貼り付けて追加" },
	{
		keys: ["←", "↑", "→", "↓"],
		description: "選択中の要素を移動（Shift で大きく）",
	},
	{ keys: ["Delete"], description: "選択中の画像を削除" },
	{ keys: ["Esc"], description: "選択を解除" },
	{ keys: ["?"], description: "ショートカット一覧を表示" },
];

/** モバイルで1つずつ表示する設定セクション */
type SettingsSection = "text" | "font" | "color" | "image" | "anim";
const SETTINGS_SECTIONS: { key: SettingsSection; label: string }[] = [
	{ key: "text", label: "文字" },
	{ key: "font", label: "フォント" },
	{ key: "color", label: "カラー" },
	{ key: "image", label: "画像" },
	{ key: "anim", label: "動き" },
];

/** アニメーションの移動・拡大・回転・透明度・色相を適用して fn を描く */
function withAnimation(
	ctx: CanvasRenderingContext2D,
	size: number,
	p: AnimParams,
	fn: () => void,
) {
	ctx.save();
	if (p.scale !== 1 || p.rotate !== 0) {
		ctx.translate(size / 2, size / 2);
		if (p.rotate !== 0) ctx.rotate((p.rotate * Math.PI) / 180);
		if (p.scale !== 1) ctx.scale(p.scale, p.scale);
		ctx.translate(-size / 2, -size / 2);
	}
	if (p.offsetX !== 0 || p.offsetY !== 0) ctx.translate(p.offsetX, p.offsetY);
	ctx.globalAlpha = p.alpha;
	if (p.hueShift !== 0) ctx.filter = `hue-rotate(${p.hueShift}deg)`;
	fn();
	ctx.restore();
}

/** 要素の中心へ移動して回転した座標系で fn を描く */
function withTransform(
	ctx: CanvasRenderingContext2D,
	size: number,
	t: Transform,
	fn: () => void,
) {
	ctx.save();
	ctx.translate(t.x * size, t.y * size);
	if (t.rotation !== 0) ctx.rotate((t.rotation * Math.PI) / 180);
	fn();
	ctx.restore();
}

export function TextEditor({
	initialValues,
	active = true,
}: TextEditorProps = {}) {
	const initColor = parseTextColor(initialValues?.textColor);

	const [text, setText] = useState(initialValues?.text ?? "よろ\nしく");
	const [fontWeight, setFontWeight] = useState(
		initialValues?.fontWeight ?? "700",
	);
	const [fontFamily, setFontFamily] = useState(
		initialValues?.fontFamily ?? "Noto Sans JP",
	);
	const [textAlign, setTextAlign] = useState<TextAlign>("center");
	const [textColor, setTextColor] = useState(
		initColor.type === "solid" ? initColor.color : "#000000",
	);
	const [colorMode, setColorMode] = useState<"solid" | "gradient">(
		initColor.type,
	);
	const [gradientFrom, setGradientFrom] = useState(
		initColor.type === "gradient" ? initColor.from : "#ef4444",
	);
	const [gradientTo, setGradientTo] = useState(
		initColor.type === "gradient" ? initColor.to : "#3b82f6",
	);
	const [gradientDirection, setGradientDirection] = useState<GradientDirection>(
		initColor.type === "gradient" ? initColor.direction : "vertical",
	);
	const [backgroundColor, setBackgroundColor] = useState(
		initialValues?.backgroundColor ?? "",
	);
	const [textTransform, setTextTransform] = useState<Transform>(
		DEFAULT_TEXT_TRANSFORM,
	);
	const [layers, setLayers] = useState<ImageLayer[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [animateImages, setAnimateImages] = useState(true);
	const [isAddingImages, setIsAddingImages] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [mobileSection, setMobileSection] = useState<SettingsSection>("text");
	/** Web フォントの読み込み完了で再描画するためのカウンタ */
	const [fontsVersion, setFontsVersion] = useState(0);

	/** 現在の文字色設定（保存・下書き用のシリアライズ値） */
	const serializedTextColor = serializeTextColor(
		colorMode === "gradient"
			? {
					type: "gradient",
					direction: gradientDirection,
					from: gradientFrom,
					to: gradientTo,
				}
			: { type: "solid", color: textColor },
	);
	const [isComposing, setIsComposing] = useState(false);
	const [animationType, setAnimationType] = useState<AnimType | null>(null);
	const [isGeneratingGif, setIsGeneratingGif] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const miniCanvasRef = useRef<HTMLCanvasElement>(null);
	const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const animFrameRef = useRef<number | null>(null);
	/** レイヤー id → 描画用の画像要素 */
	const imagesRef = useRef(new Map<string, HTMLImageElement>());
	/** ドラッグ中はアニメーションを止めて静止状態で操作させる */
	const interactingRef = useRef(false);

	const charCount = text.replace(/\n/g, "").length;
	const lineCount = text.split("\n").length;
	const hasText = text.trim().length > 0;
	const isTransparent = !backgroundColor;
	// アニメーション選択時は GIF、未選択時は PNG で書き出す
	const outputFormat: "png" | "gif" = animationType ? "gif" : "png";
	const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;
	const isTextSelected = selectedId === TEXT_TARGET;

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		// IME 変換中は確定まで制限しない（確定時に trim する）
		setText(isComposing ? val : trimToLimit(val));
	};

	const handleCompositionStart = () => setIsComposing(true);

	const handleCompositionEnd = (
		e: React.CompositionEvent<HTMLTextAreaElement>,
	) => {
		setIsComposing(false);
		const { value } = e.target as HTMLTextAreaElement;
		setTimeout(() => setText(trimToLimit(value)), 0);
	};

	// ---- 描画 ----

	/** 文字を SIZE×SIZE のボックスに収めて描く（座標系は呼び出し側で設定済み） */
	const drawText = useCallback(
		(ctx: CanvasRenderingContext2D, SIZE: number, animParams: AnimParams) => {
			const lines = text
				.trim()
				.split("\n")
				.slice(0, TEXT_LIMITS.maxLines)
				.map((l) => l.slice(0, TEXT_LIMITS.maxCharsPerLine))
				.filter((l) => l.length > 0);
			if (lines.length === 0) return;

			const PADDING = 4 * RENDER_SCALE;
			const CONTENT_W = SIZE - PADDING * 2;
			const CONTENT_H = SIZE - PADDING * 2;
			const SAFETY = 0.9;

			if (animParams.shadowBlur > 0) {
				ctx.shadowBlur = animParams.shadowBlur;
				ctx.shadowColor =
					animParams.shadowColor ||
					(colorMode === "gradient" ? gradientFrom : textColor);
			}

			ctx.font = `${fontWeight} 100px "${fontFamily}", sans-serif`;
			ctx.textBaseline = "alphabetic";
			ctx.fillStyle = textColor;

			// measureText を一度だけ呼んでキャッシュ
			const allMetrics = lines.map((l) => ctx.measureText(l));
			const maxNatW = Math.max(...allMetrics.map((m) => m.width || 1));
			const numLines = lines.length;
			const slotH = CONTENT_H / numLines;

			for (const [i, line] of lines.entries()) {
				// タイプライター: 全体の進捗 (clipReveal) を行数で分割し、
				// 1行目 → 2行目 の順に左から表示する
				const lineProgress =
					animParams.clipReveal >= 1
						? 1
						: Math.max(0, Math.min(1, animParams.clipReveal * numLines - i));
				if (lineProgress <= 0) continue;

				const m = allMetrics[i];
				const natW = m.width || 1;
				const asc = m.actualBoundingBoxAscent ?? 90;
				const des = m.actualBoundingBoxDescent ?? 15;

				const scaleX =
					textAlign === "center" ? CONTENT_W / natW : CONTENT_W / maxNatW;
				const scaleY = (slotH / (asc + des)) * SAFETY;
				const drawY =
					PADDING + slotH * i + slotH / 2 + ((asc - des) * scaleY) / 2;
				const drawX =
					textAlign === "left"
						? PADDING
						: textAlign === "right"
							? PADDING + CONTENT_W
							: PADDING + CONTENT_W / 2;

				ctx.save();
				if (lineProgress < 1) {
					ctx.beginPath();
					ctx.rect(0, 0, SIZE * lineProgress, SIZE);
					ctx.clip();
				}
				ctx.translate(drawX, drawY);
				ctx.scale(scaleX, scaleY);
				ctx.textAlign = textAlign;

				if (colorMode === "gradient") {
					// ボックス全体で連続するグラデーションになるよう、
					// 行ごとの transform (translate + scale) を逆算した座標で作る
					let gradient: CanvasGradient;
					if (gradientDirection === "vertical") {
						const y0 = (PADDING - drawY) / scaleY;
						const y1 = (PADDING + CONTENT_H - drawY) / scaleY;
						gradient = ctx.createLinearGradient(0, y0, 0, y1);
					} else {
						const x0 = (PADDING - drawX) / scaleX;
						const x1 = (PADDING + CONTENT_W - drawX) / scaleX;
						gradient = ctx.createLinearGradient(x0, 0, x1, 0);
					}
					gradient.addColorStop(0, gradientFrom);
					gradient.addColorStop(1, gradientTo);
					ctx.fillStyle = gradient;
				}

				ctx.fillText(line, 0, 0);
				ctx.restore();
			}
		},
		[
			text,
			fontWeight,
			fontFamily,
			textAlign,
			textColor,
			colorMode,
			gradientFrom,
			gradientTo,
			gradientDirection,
		],
	);

	/** 背景 → 背面の画像 → 文字 → 前面の画像 の順に絵文字全体を描く */
	// biome-ignore lint/correctness/useExhaustiveDependencies: fontsVersion はフォント読み込み完了後に描き直すための依存
	const drawScene = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			SIZE: number,
			animParams: AnimParams = AP0,
		) => {
			ctx.clearRect(0, 0, SIZE, SIZE);
			if (backgroundColor) {
				ctx.fillStyle = backgroundColor;
				ctx.fillRect(0, 0, SIZE, SIZE);
			}
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";

			const drawLayers = (group: ImageLayer[]) => {
				const paint = () => {
					for (const layer of group) {
						const img = imagesRef.current.get(layer.id);
						if (!img) continue;
						const { w, h } = boxSize(layer, SIZE);
						withTransform(ctx, SIZE, layer, () => {
							if (layer.flipX) ctx.scale(-1, 1);
							ctx.globalAlpha *= layer.opacity;
							ctx.drawImage(img, -w / 2, -h / 2, w, h);
						});
					}
				};
				if (group.length === 0) return;
				if (animateImages) withAnimation(ctx, SIZE, animParams, paint);
				else paint();
			};

			const { behind, front } = layersInDrawOrder(layers);
			drawLayers(behind);
			withAnimation(ctx, SIZE, animParams, () => {
				withTransform(ctx, SIZE, textTransform, () => {
					ctx.scale(textTransform.scale, textTransform.scale);
					ctx.translate(-SIZE / 2, -SIZE / 2);
					drawText(ctx, SIZE, animParams);
				});
			});
			drawLayers(front);
		},
		[
			backgroundColor,
			layers,
			animateImages,
			textTransform,
			drawText,
			fontsVersion,
		],
	);

	/** 選択中の要素の枠と拡大・回転ハンドルを描く（プレビューのみ） */
	const drawSelection = useCallback(
		(ctx: CanvasRenderingContext2D, SIZE: number, animParams: AnimParams) => {
			const target: (Transform & { aspect?: number }) | null = isTextSelected
				? textTransform
				: selectedLayer;
			if (!target) return;
			const canvas = canvasRef.current;
			// 表示サイズに関わらず線やハンドルが同じ太さに見えるよう換算する
			const ratio = SIZE / (canvas?.getBoundingClientRect().width || SIZE);
			const { w, h } = boxSize(target, SIZE);
			const animated = isTextSelected || animateImages;
			const paintFrame = () =>
				withTransform(ctx, SIZE, target, () => {
					ctx.globalAlpha = 1;
					ctx.filter = "none";
					ctx.lineWidth = 1.5 * ratio;
					ctx.strokeStyle = "rgba(255,255,255,0.9)";
					ctx.strokeRect(-w / 2, -h / 2, w, h);
					ctx.setLineDash([5 * ratio, 4 * ratio]);
					ctx.strokeStyle = SELECTION_COLOR;
					ctx.strokeRect(-w / 2, -h / 2, w, h);
				});
			if (animated) withAnimation(ctx, SIZE, animParams, paintFrame);
			else paintFrame();

			// 拡大・回転ハンドル（はみ出していても掴めるようキャンバス内に表示）
			const handle = visibleHandlePosition(target, SIZE, HANDLE_MARGIN * ratio);
			ctx.save();
			ctx.beginPath();
			ctx.arc(handle.x, handle.y, 8 * ratio, 0, Math.PI * 2);
			ctx.fillStyle = "#ffffff";
			ctx.fill();
			ctx.lineWidth = 2.5 * ratio;
			ctx.strokeStyle = SELECTION_COLOR;
			ctx.stroke();
			ctx.restore();
		},
		[isTextSelected, textTransform, selectedLayer, animateImages],
	);

	/** プレビュー（選択枠つき）と実寸プレビュー（枠なし）を描く */
	const renderPreview = useCallback(
		(animParams: AnimParams = AP0) => {
			const canvas = canvasRef.current;
			const ctx = canvas?.getContext("2d");
			if (!canvas || !ctx) return;

			const scene = sceneCanvasRef.current ?? document.createElement("canvas");
			sceneCanvasRef.current = scene;
			if (scene.width !== RENDER_SIZE) scene.width = scene.height = RENDER_SIZE;
			const sceneCtx = scene.getContext("2d");
			if (!sceneCtx) return;
			drawScene(sceneCtx, RENDER_SIZE, animParams);

			if (canvas.width !== RENDER_SIZE) {
				canvas.width = canvas.height = RENDER_SIZE;
			}
			ctx.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE);
			ctx.drawImage(scene, 0, 0);
			drawSelection(ctx, RENDER_SIZE, animParams);

			const mini = miniCanvasRef.current;
			const miniCtx = mini?.getContext("2d");
			if (!mini || !miniCtx) return;
			if (mini.width !== EXPORT_SIZE) mini.width = mini.height = EXPORT_SIZE;
			miniCtx.imageSmoothingEnabled = true;
			miniCtx.imageSmoothingQuality = "high";
			miniCtx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
			miniCtx.drawImage(scene, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
		},
		[drawScene, drawSelection],
	);

	// アニメーションループが最新の描画関数を参照するための ref
	// （renderPreview は編集のたびに変わるが、ループは再起動させない）
	const renderPreviewRef = useRef(renderPreview);
	useEffect(() => {
		renderPreviewRef.current = renderPreview;
	}, [renderPreview]);

	// Web フォントの読み込みを待って描き直す
	useEffect(() => {
		if (typeof document === "undefined") return;
		let cancelled = false;
		const bump = () => {
			if (!cancelled) setFontsVersion((v) => v + 1);
		};
		Promise.allSettled(
			["400", "700", "900"].map((w) =>
				document.fonts.load(`${w} 64px "${fontFamily}"`),
			),
		).then(bump);
		const t = setTimeout(bump, 400);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [fontFamily]);

	// 静止画のときは状態が変わるたびに描く（アニメーション中はループが描く）
	useEffect(() => {
		if (!animationType) renderPreview();
	}, [animationType, renderPreview]);

	// 表示サイズが変わったら選択枠の太さを合わせて描き直す
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => renderPreviewRef.current());
		observer.observe(canvas);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!animationType) return;
		const config = ANIM_CONFIGS[animationType];
		const startTime = performance.now();
		const totalMs = config.frames * config.delay;

		const loop = (now: number) => {
			const frameIdx = Math.floor(((now - startTime) % totalMs) / config.delay);
			renderPreviewRef.current(
				interactingRef.current
					? AP0
					: config.getParams(frameIdx, config.frames, RENDER_SIZE),
			);
			animFrameRef.current = requestAnimationFrame(loop);
		};
		animFrameRef.current = requestAnimationFrame(loop);
		return () => {
			if (animFrameRef.current) {
				cancelAnimationFrame(animFrameRef.current);
				animFrameRef.current = null;
			}
		};
	}, [animationType]);

	// ---- 書き出し ----

	/** 1フレームを 128px で描いた canvas を返す */
	const renderExportFrame = useCallback(
		(animParams: AnimParams = AP0): HTMLCanvasElement | null => {
			const renderCanvas = document.createElement("canvas");
			renderCanvas.width = renderCanvas.height = RENDER_SIZE;
			const renderCtx = renderCanvas.getContext("2d");
			if (!renderCtx) return null;
			drawScene(renderCtx, RENDER_SIZE, animParams);

			const exportCanvas = document.createElement("canvas");
			exportCanvas.width = exportCanvas.height = EXPORT_SIZE;
			const exportCtx = exportCanvas.getContext("2d");
			if (!exportCtx) return null;
			exportCtx.imageSmoothingEnabled = true;
			exportCtx.imageSmoothingQuality = "high";
			exportCtx.drawImage(renderCanvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
			return exportCanvas;
		},
		[drawScene],
	);

	const buildGifDataUrl = useCallback(async (): Promise<string | null> => {
		if (!animationType) return null;
		const config = ANIM_CONFIGS[animationType];
		const gifFrames: GifFrame[] = [];
		for (let f = 0; f < config.frames; f++) {
			const frame = renderExportFrame(
				config.getParams(f, config.frames, RENDER_SIZE),
			);
			const ctx = frame?.getContext("2d");
			if (!ctx) return null;
			gifFrames.push({
				imageData: ctx.getImageData(0, 0, EXPORT_SIZE, EXPORT_SIZE),
				delay: config.delay,
			});
		}
		return encodeGifToDataUrl(gifFrames, EXPORT_SIZE, EXPORT_SIZE, {
			transparent: isTransparent,
		});
	}, [animationType, renderExportFrame, isTransparent]);

	// アニメーション中でも静止状態で書き出すため、プレビューではなく直接描画する
	const getImageData = useCallback(
		() => renderExportFrame()?.toDataURL("image/png") ?? null,
		[renderExportFrame],
	);

	/** 書き出し用の画像（アニメーションありなら GIF）を作る */
	const buildImage = async (): Promise<string | null> => {
		if (!animationType) return getImageData();
		setIsGeneratingGif(true);
		try {
			return await buildGifDataUrl();
		} catch {
			toast.error("GIF の生成に失敗しました");
			return null;
		} finally {
			setIsGeneratingGif(false);
		}
	};

	const handleDownload = async () => {
		if (isGeneratingGif) return;
		const dataUrl = await buildImage();
		if (!dataUrl) return;
		downloadDataUrl(dataUrl, `emoji_${Date.now()}.${outputFormat}`);
	};

	// ---- 画像レイヤー ----

	const layersRef = useRef(layers);
	layersRef.current = layers;

	const addImageFiles = async (files: File[]) => {
		const room = MAX_IMAGE_LAYERS - layersRef.current.length;
		if (room <= 0) {
			toast.error(`画像は ${MAX_IMAGE_LAYERS} 枚まで追加できます`);
			return;
		}
		if (files.length > room) {
			toast.info(`画像は ${MAX_IMAGE_LAYERS} 枚までのため、一部のみ追加します`);
		}
		setIsAddingImages(true);
		const added: ImageLayer[] = [];
		try {
			for (const file of files.slice(0, room)) {
				try {
					const loaded = await loadImageFile(file);
					const img = await createImageElement(loaded.src);
					const id = createId();
					imagesRef.current.set(id, img);
					added.push(
						createImageLayer(id, loaded.src, loaded.width, loaded.height),
					);
				} catch (error) {
					toast.error(
						error instanceof ImageFileError
							? error.message
							: "画像を読み込めませんでした",
					);
				}
			}
		} finally {
			setIsAddingImages(false);
		}
		if (added.length === 0) return;
		setLayers((prev) => [...prev, ...added]);
		setSelectedId(added[added.length - 1].id);
		setMobileSection("image");
	};

	const updateLayer = useCallback(
		(id: string, patch: Partial<ImageLayer>) =>
			setLayers((prev) =>
				prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
			),
		[],
	);

	const removeLayer = (id: string) => {
		const index = layers.findIndex((l) => l.id === id);
		const removed = layers[index];
		if (!removed) return;
		setLayers((prev) => prev.filter((l) => l.id !== id));
		setSelectedId((s) => (s === id ? null : s));
		toast("画像を削除しました", {
			action: {
				label: "元に戻す",
				onClick: () =>
					setLayers((prev) =>
						prev.some((l) => l.id === id)
							? prev
							: [...prev.slice(0, index), removed, ...prev.slice(index)],
					),
			},
		});
	};

	/** 選択中の要素（文字 or 画像）の変形を更新する */
	const transformTarget = useCallback(
		(id: string, patch: Partial<Transform>) => {
			if (id === TEXT_TARGET) setTextTransform((t) => ({ ...t, ...patch }));
			else updateLayer(id, patch);
		},
		[updateLayer],
	);

	const selectTarget = useCallback((id: string | null) => {
		setSelectedId(id);
		if (id) setMobileSection(id === TEXT_TARGET ? "text" : "image");
	}, []);

	const textHitTransform = hasText ? textTransform : null;
	const gestures = useCanvasGestures({
		canvasRef,
		size: RENDER_SIZE,
		selectedId,
		getTarget: (id) =>
			id === TEXT_TARGET
				? textTransform
				: (layers.find((l) => l.id === id) ?? null),
		findAt: (x, y) => findTargetAt(layers, textHitTransform, x, y, RENDER_SIZE),
		getScaleLimits: (id) =>
			id === TEXT_TARGET ? TEXT_SCALE_LIMITS : SCALE_LIMITS,
		onSelect: selectTarget,
		onTransform: transformTarget,
		onInteractionChange: (active) => {
			interactingRef.current = active;
		},
	});

	// 選択中の画像が消えたら選択を外す（Undo 削除や下書き復元のため）
	useEffect(() => {
		if (
			selectedId &&
			selectedId !== TEXT_TARGET &&
			!layers.some((l) => l.id === selectedId)
		) {
			setSelectedId(null);
		}
	}, [layers, selectedId]);

	// ---- 保存 ----

	const save = useSaveEmoji({
		collectDraft: () => ({
			type: "TEXT",
			text,
			fontWeight,
			fontFamily,
			textColor: serializedTextColor,
			backgroundColor,
			textAlign,
			animationType,
			animateImages,
			textTransform,
			layers,
			savedAt: Date.now(),
		}),
	});

	/** シリアライズ済みの文字色を各 state に展開する */
	const applyColorValue = (raw: string) => {
		const parsed = parseTextColor(raw);
		setColorMode(parsed.type);
		if (parsed.type === "solid") {
			setTextColor(parsed.color);
		} else {
			setGradientFrom(parsed.from);
			setGradientTo(parsed.to);
			setGradientDirection(parsed.direction);
		}
	};

	// ログイン往復後の下書き復元（編集モードでは提案しない）
	const [availableDraft, setAvailableDraft] = useState<TextEditorDraft | null>(
		null,
	);
	useEffect(() => {
		if (initialValues) return;
		const draft = loadDraft();
		if (draft?.type === "TEXT") setAvailableDraft(draft);
	}, [initialValues]);

	const restoreDraft = async () => {
		if (!availableDraft) return;
		const draft = availableDraft;
		setAvailableDraft(null);
		setText(draft.text);
		setFontWeight(draft.fontWeight);
		setFontFamily(draft.fontFamily);
		applyColorValue(draft.textColor);
		setBackgroundColor(draft.backgroundColor);
		if (draft.textAlign) setTextAlign(draft.textAlign);
		if (draft.animationType !== undefined)
			setAnimationType(draft.animationType);
		if (draft.animateImages !== undefined)
			setAnimateImages(draft.animateImages);
		if (draft.textTransform) setTextTransform(draft.textTransform);
		clearDraft();

		const restored: ImageLayer[] = [];
		for (const layer of draft.layers ?? []) {
			try {
				imagesRef.current.set(layer.id, await createImageElement(layer.src));
				restored.push(layer);
			} catch {
				// 壊れた画像は捨てる
			}
		}
		setLayers(restored);
		toast.success("編集内容を復元しました");
	};

	const discardDraft = () => {
		clearDraft();
		setAvailableDraft(null);
	};

	const handleSaveSubmit = async () => {
		const imageData = await buildImage();
		if (!imageData) return;
		save.submitSave({
			editorType: "TEXT",
			imageData,
			text,
			fontWeight: Number.parseInt(fontWeight, 10),
			fontFamily,
			textColor: serializedTextColor,
			backgroundColor: backgroundColor || undefined,
		});
	};

	// ---- キーボード / クリップボード ----

	// 最新のハンドラを ref 経由で参照し、リスナーは一度だけ張る
	const shortcutActionsRef = useRef({
		save: () => {},
		download: () => {},
		remove: (_id: string) => {},
		nudge: (_dx: number, _dy: number) => {},
		addFiles: (_files: File[]) => {},
		deselect: () => {},
		selectedId: null as string | null,
		active: true,
	});
	shortcutActionsRef.current = {
		save: save.openSaveForm,
		download: handleDownload,
		remove: removeLayer,
		nudge: (dx, dy) => {
			if (!selectedId) return;
			const target = selectedId === TEXT_TARGET ? textTransform : selectedLayer;
			if (!target) return;
			transformTarget(
				selectedId,
				constrainPosition(target.x + dx, target.y + dy, false),
			);
		},
		addFiles: addImageFiles,
		deselect: () => setSelectedId(null),
		selectedId,
		active,
	};

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const actions = shortcutActionsRef.current;
			if (!actions.active) return;
			if (e.metaKey || e.ctrlKey) {
				if (e.key.toLowerCase() === "s") {
					e.preventDefault();
					actions.save();
				} else if (e.key === "Enter") {
					e.preventDefault();
					actions.download();
				}
				return;
			}
			if (!actions.selectedId || isTypingTarget(e.target)) return;
			// スライダー操作中の矢印キーはスライダーに任せる
			if (
				e.target instanceof HTMLElement &&
				e.target.closest("[role=slider]")
			) {
				return;
			}
			// ダイアログなどが開いているときはページ側の操作をしない
			if (document.querySelector("[role=dialog]")) return;
			const step = (e.shiftKey ? 8 : 1) / EXPORT_SIZE;
			const arrows: Record<string, [number, number]> = {
				ArrowLeft: [-step, 0],
				ArrowRight: [step, 0],
				ArrowUp: [0, -step],
				ArrowDown: [0, step],
			};
			if (arrows[e.key]) {
				e.preventDefault();
				actions.nudge(...arrows[e.key]);
			} else if (
				(e.key === "Delete" || e.key === "Backspace") &&
				actions.selectedId !== TEXT_TARGET
			) {
				e.preventDefault();
				actions.remove(actions.selectedId);
			} else if (e.key === "Escape") {
				actions.deselect();
			}
		};
		const onPaste = (e: ClipboardEvent) => {
			if (!shortcutActionsRef.current.active) return;
			const files = imageFilesFrom(e.clipboardData);
			if (files.length === 0) return;
			e.preventDefault();
			shortcutActionsRef.current.addFiles(files);
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("paste", onPaste);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("paste", onPaste);
		};
	}, []);

	const dropHandlers = {
		onDragOver: (e: React.DragEvent) => {
			if (!Array.from(e.dataTransfer.types).includes("Files")) return;
			e.preventDefault();
			setIsDragOver(true);
		},
		onDragLeave: (e: React.DragEvent) => {
			if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
				setIsDragOver(false);
			}
		},
		onDrop: (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);
			const files = imageFilesFrom(e.dataTransfer);
			if (files.length > 0) addImageFiles(files);
		},
	};

	/** モバイルでは選択中のセクションだけ表示し、PC では全部並べる */
	const sectionClass = (key: SettingsSection) =>
		cn(mobileSection !== key && "hidden lg:block");

	const selectionLabel = isTextSelected
		? "文字を選択中"
		: selectedLayer
			? `画像 ${layers.indexOf(selectedLayer) + 1} を選択中`
			: null;

	return (
		<div>
			{availableDraft && (
				<DraftBanner onRestore={restoreDraft} onDiscard={discardDraft} />
			)}

			<div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
				{/* ==== プレビュー（モバイルは上部に固定、PC は左に固定） ==== */}
				<div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-4 self-start bg-background/95 px-4 pb-2 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:top-20 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
					<div
						className="relative flex items-center justify-center gap-4 rounded-2xl border bg-card p-2.5 sm:p-5 lg:flex-col lg:gap-5 lg:p-6"
						{...dropHandlers}
					>
						<div
							className="shrink-0 overflow-hidden rounded-xl border"
							style={isTransparent ? CHECKER_STYLE : undefined}
						>
							<canvas
								ref={canvasRef}
								role="img"
								aria-label="絵文字プレビュー（ドラッグで文字や画像を移動）"
								className="block h-[min(48vw,12.5rem)] w-[min(48vw,12.5rem)] touch-none select-none sm:h-64 sm:w-64 lg:h-72 lg:w-72"
								{...gestures}
								onContextMenu={(e) => e.preventDefault()}
							/>
						</div>

						<div className="flex min-w-0 flex-col gap-3 lg:w-full lg:flex-row lg:items-center lg:justify-center">
							{/* 実寸プレビュー */}
							<div className="flex items-center gap-3">
								<div
									className="shrink-0 overflow-hidden rounded-md border"
									style={isTransparent ? CHECKER_SMALL_STYLE : undefined}
								>
									<canvas
										ref={miniCanvasRef}
										role="img"
										aria-label="実寸プレビュー（128px）"
										className="block h-10 w-10 sm:h-16 sm:w-16"
									/>
								</div>
								<div className="text-xs leading-relaxed text-muted-foreground">
									<span className="hidden sm:inline">Slack 上での</span>
									見え方
									<br />
									<span className="tabular-nums">
										{outputFormat.toUpperCase()} · 128px
									</span>
								</div>
							</div>
							{selectionLabel ? (
								<button
									type="button"
									onClick={() => setSelectedId(null)}
									aria-label={`選択を解除（${selectionLabel}）`}
									className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/20 lg:self-center"
								>
									{selectionLabel} ✕
								</button>
							) : (
								<p className="text-xs text-muted-foreground lg:hidden">
									タップで選んでドラッグで移動
								</p>
							)}
						</div>

						{isDragOver && (
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-primary backdrop-blur-[1px]">
								<ImagePlus className="mr-2 h-5 w-5" />
								ドロップして画像を追加
							</div>
						)}
					</div>

					{/* モバイル用の設定セクション切り替え */}
					<nav
						aria-label="設定の切り替え"
						className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] lg:hidden"
					>
						{SETTINGS_SECTIONS.map(({ key, label }) => (
							<button
								key={key}
								type="button"
								onClick={() => setMobileSection(key)}
								aria-pressed={mobileSection === key}
								className={cn(
									"flex-auto shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition",
									mobileSection === key
										? "border-primary bg-primary text-primary-foreground"
										: "bg-card text-muted-foreground hover:text-foreground",
								)}
							>
								{label}
								{key === "image" && layers.length > 0 && (
									<span className="ml-1 tabular-nums opacity-80">
										{layers.length}
									</span>
								)}
							</button>
						))}
					</nav>
				</div>

				{/* ==== 設定 ==== */}
				<div className="space-y-7 pb-4">
					{/* テキスト */}
					<section className={cn("space-y-2", sectionClass("text"))}>
						<div className="flex items-center justify-between">
							<SectionLabel>テキスト</SectionLabel>
							<span
								className={cn(
									"text-xs tabular-nums",
									charCount >= TEXT_LIMITS.maxTotalChars
										? "text-red-400 font-semibold"
										: "text-muted-foreground",
								)}
							>
								{charCount}/{TEXT_LIMITS.maxTotalChars}文字 · {lineCount}/
								{TEXT_LIMITS.maxLines}行
							</span>
						</div>
						<textarea
							value={text}
							onChange={handleTextChange}
							onCompositionStart={handleCompositionStart}
							onCompositionEnd={handleCompositionEnd}
							placeholder={
								"テキストを入力\n（3行・各行6文字まで。空欄なら画像だけ）"
							}
							rows={3}
							aria-label="絵文字のテキスト"
							className={cn(
								"w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-base leading-relaxed sm:text-lg",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								"placeholder:text-muted-foreground placeholder:text-sm",
							)}
						/>
						<div className="space-y-1 pt-1">
							<SliderRow
								id="text-scale"
								label="文字の大きさ"
								value={textTransform.scale * 100}
								min={TEXT_SCALE_LIMITS.min * 100}
								max={TEXT_SCALE_LIMITS.max * 100}
								unit="%"
								onChange={(v) =>
									setTextTransform((t) => ({ ...t, scale: v / 100 }))
								}
							/>
							<SliderRow
								id="text-rotation"
								label="文字の回転"
								value={textTransform.rotation}
								min={-180}
								max={180}
								unit="°"
								onChange={(v) =>
									setTextTransform((t) => ({ ...t, rotation: v }))
								}
							/>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-xs text-muted-foreground">
									プレビュー上で文字をドラッグして移動できます
								</p>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setTextTransform(DEFAULT_TEXT_TRANSFORM)}
									disabled={
										textTransform.x === DEFAULT_TEXT_TRANSFORM.x &&
										textTransform.y === DEFAULT_TEXT_TRANSFORM.y &&
										textTransform.scale === DEFAULT_TEXT_TRANSFORM.scale &&
										textTransform.rotation === DEFAULT_TEXT_TRANSFORM.rotation
									}
								>
									<RotateCcw className="h-3.5 w-3.5" />
									位置・大きさをリセット
								</Button>
							</div>
						</div>
					</section>

					{/* フォント */}
					<section className={cn("space-y-2.5", sectionClass("font"))}>
						<SectionLabel>フォント</SectionLabel>
						<div className="grid grid-cols-3 gap-2 xl:grid-cols-4">
							{FONTS.map((font) => (
								<button
									key={font.value}
									type="button"
									onClick={() => setFontFamily(font.value)}
									aria-pressed={fontFamily === font.value}
									className={cn(
										"flex flex-col items-center gap-0.5 rounded-lg border-2 px-1.5 py-2 transition",
										fontFamily === font.value
											? "border-primary bg-primary/5"
											: "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
									)}
								>
									<span
										className="text-xl leading-none"
										style={{ fontFamily: `'${font.value}', sans-serif` }}
									>
										あア
									</span>
									<span className="max-w-full truncate text-[10px] text-muted-foreground">
										{font.label}
									</span>
								</button>
							))}
						</div>

						<div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground">太さ</Label>
								<SegmentedControl
									ariaLabel="文字の太さ"
									value={fontWeight}
									onChange={setFontWeight}
									options={FONT_WEIGHTS.map((fw) => [fw.value, fw.label])}
								/>
							</div>
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground">揃え</Label>
								<SegmentedControl
									ariaLabel="文字揃え"
									value={textAlign}
									onChange={setTextAlign}
									options={TEXT_ALIGNS.map((a) => [
										a.value,
										a.label.replace("揃え", ""),
									])}
								/>
							</div>
						</div>
					</section>

					{/* カラー */}
					<section className={cn("space-y-3", sectionClass("color"))}>
						<SectionLabel>カラー</SectionLabel>
						<div className="space-y-1.5">
							<div className="flex items-center gap-3">
								<Label className="text-xs text-muted-foreground">文字色</Label>
								<SegmentedControl
									ariaLabel="文字色の種類"
									value={colorMode}
									onChange={setColorMode}
									options={[
										["solid", "単色"],
										["gradient", "グラデーション"],
									]}
								/>
							</div>
							{colorMode === "solid" ? (
								<ColorPicker
									value={textColor}
									onChange={setTextColor}
									label="文字色"
								/>
							) : (
								<div className="space-y-2.5 rounded-lg border p-3">
									<div className="flex items-center gap-3">
										<Label className="text-xs text-muted-foreground">
											向き
										</Label>
										<SegmentedControl
											ariaLabel="グラデーションの向き"
											value={gradientDirection}
											onChange={setGradientDirection}
											options={[
												["vertical", "上 → 下"],
												["horizontal", "左 → 右"],
											]}
										/>
										{/* グラデーションのプレビュー */}
										<span
											aria-hidden="true"
											className="ml-auto h-7 w-14 rounded-md border"
											style={{
												background: `linear-gradient(${
													gradientDirection === "vertical"
														? "to bottom"
														: "to right"
												}, ${gradientFrom}, ${gradientTo})`,
											}}
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">
											開始色
											{gradientDirection === "vertical" ? "（上）" : "（左）"}
										</Label>
										<ColorPicker
											value={gradientFrom}
											onChange={setGradientFrom}
											label="開始色"
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-xs text-muted-foreground">
											終了色
											{gradientDirection === "vertical" ? "（下）" : "（右）"}
										</Label>
										<ColorPicker
											value={gradientTo}
											onChange={setGradientTo}
											label="終了色"
										/>
									</div>
								</div>
							)}
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								背景色
								{isTransparent && (
									<span className="ml-2 text-muted-foreground/70">
										（透明で書き出されます）
									</span>
								)}
							</Label>
							<ColorPicker
								value={backgroundColor}
								onChange={setBackgroundColor}
								allowTransparent
								label="背景色"
							/>
						</div>
					</section>

					{/* 画像 */}
					<div className={sectionClass("image")}>
						<ImageLayersPanel
							layers={layers}
							selectedId={selectedLayer?.id ?? null}
							onSelect={selectTarget}
							onAddFiles={addImageFiles}
							onUpdate={updateLayer}
							onRemove={removeLayer}
							onMove={(id, to) => setLayers((prev) => moveLayer(prev, id, to))}
							isLoading={isAddingImages}
						/>
					</div>

					{/* アニメーション */}
					<section className={cn("space-y-2.5", sectionClass("anim"))}>
						<div className="flex items-center justify-between">
							<SectionLabel>アニメーション</SectionLabel>
							<span className="text-xs text-muted-foreground">
								選ぶと GIF で書き出されます
							</span>
						</div>
						<div className="grid grid-cols-3 gap-1.5 min-[480px]:grid-cols-4">
							{(
								[
									[null, "なし"],
									...(
										Object.entries(ANIM_CONFIGS) as [AnimType, AnimConfig][]
									).map(([key, cfg]) => [key, cfg.label] as const),
								] as const
							).map(([key, label]) => (
								<button
									key={key ?? "none"}
									type="button"
									onClick={() => setAnimationType(key)}
									aria-pressed={animationType === key}
									className={cn(
										"flex min-h-10 items-center justify-center rounded-lg border-2 px-2 py-2 text-xs font-medium transition",
										animationType === key
											? "border-primary bg-primary/5"
											: "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
									)}
								>
									<span className="truncate">{label}</span>
								</button>
							))}
						</div>
						{layers.length > 0 && (
							<div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
								<Label
									htmlFor="animate-images"
									className="cursor-pointer text-sm"
								>
									画像も一緒に動かす
								</Label>
								<Switch
									id="animate-images"
									checked={animateImages}
									onCheckedChange={setAnimateImages}
								/>
							</div>
						)}
					</section>
				</div>
			</div>

			<EditorActionBar
				leading={
					<>
						<span className="hidden sm:inline-flex">
							<ShortcutHelp shortcuts={TEXT_SHORTCUTS} enabled={active} />
						</span>
						<span className="hidden truncate text-xs text-muted-foreground sm:block">
							{animationType
								? `GIF · ${ANIM_CONFIGS[animationType].label}`
								: "PNG · 静止画"}
						</span>
					</>
				}
				downloadLabel={`${outputFormat.toUpperCase()} ダウンロード`}
				onDownload={handleDownload}
				isBusy={isGeneratingGif}
				onSave={save.openSaveForm}
			/>

			<SaveDialogs
				save={save}
				onSubmit={handleSaveSubmit}
				busyLabel={isGeneratingGif ? "GIF生成中..." : undefined}
			/>
		</div>
	);
}
