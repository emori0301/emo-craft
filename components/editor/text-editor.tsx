"use client";

import { Download, Save } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LoginDialog } from "@/components/editor/login-dialog";
import { SaveEmojiForm } from "@/components/editor/save-emoji-form";
import {
	ShortcutHelp,
	type ShortcutItem,
} from "@/components/editor/shortcut-help";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
	ANIM_CONFIGS,
	type AnimConfig,
	type AnimParams,
	type AnimType,
	AP0,
	FONT_WEIGHTS,
	FONTS,
	TEXT_ALIGNS,
	type TextAlign,
	trimToLimit,
} from "@/lib/editor/text-config";
import { cn } from "@/lib/utils";

interface TextEditorInitialValues {
	text?: string;
	fontFamily?: string;
	fontWeight?: string;
	textColor?: string;
	backgroundColor?: string;
}

interface TextEditorProps {
	initialValues?: TextEditorInitialValues;
}

const RENDER_SCALE = 4;

/** 文字色・背景色のプリセットパレット */
const COLOR_PRESETS = [
	"#000000",
	"#ffffff",
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#0891b2",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
];

/** 透明背景を示す市松模様 */
const CHECKER_STYLE: React.CSSProperties = {
	backgroundImage:
		"linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%), linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%)",
	backgroundSize: "16px 16px",
	backgroundPosition: "0 0, 8px 8px",
	backgroundColor: "#f9fafb",
};

const CHECKER_SMALL_STYLE: React.CSSProperties = {
	...CHECKER_STYLE,
	backgroundSize: "8px 8px",
	backgroundPosition: "0 0, 4px 4px",
};

const TEXT_SHORTCUTS: ShortcutItem[] = [
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

/** 色スウォッチ（パレット + カスタム + 任意で透明チップ） */
function ColorPicker({
	value,
	onChange,
	allowTransparent = false,
	label,
}: {
	value: string;
	onChange: (color: string) => void;
	allowTransparent?: boolean;
	label: string;
}) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{allowTransparent && (
				<button
					type="button"
					onClick={() => onChange("")}
					aria-label="透明にする"
					aria-pressed={value === ""}
					title="透明"
					className={cn(
						"h-8 w-8 rounded-md border-2 transition",
						value === ""
							? "border-primary ring-2 ring-primary/30"
							: "border-border hover:border-muted-foreground/60",
					)}
					style={CHECKER_SMALL_STYLE}
				/>
			)}
			{COLOR_PRESETS.map((color) => (
				<button
					key={color}
					type="button"
					onClick={() => onChange(color)}
					aria-label={`${label}を ${color} にする`}
					aria-pressed={value === color}
					className={cn(
						"h-8 w-8 rounded-md border-2 transition",
						value === color
							? "border-primary ring-2 ring-primary/30 scale-110"
							: "border-border hover:border-muted-foreground/60",
					)}
					style={{ backgroundColor: color }}
				/>
			))}
			<label
				className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-md border-2 border-dashed border-border hover:border-muted-foreground/60 transition"
				title="カスタムカラー"
			>
				<span
					className="absolute inset-0"
					style={{
						background:
							"conic-gradient(#ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)",
					}}
				/>
				<input
					type="color"
					value={value || "#ffffff"}
					onChange={(e) => onChange(e.target.value)}
					aria-label={`${label}をカスタムカラーで選択`}
					className="absolute inset-0 opacity-0 cursor-pointer"
				/>
			</label>
		</div>
	);
}

export function TextEditor({ initialValues }: TextEditorProps = {}) {
	const [text, setText] = useState(initialValues?.text ?? "よろ\nしく");
	const [fontWeight, setFontWeight] = useState(
		initialValues?.fontWeight ?? "700",
	);
	const [fontFamily, setFontFamily] = useState(
		initialValues?.fontFamily ?? "Noto Sans JP",
	);
	const [textAlign, setTextAlign] = useState<TextAlign>("center");
	const [textColor, setTextColor] = useState(
		initialValues?.textColor ?? "#000000",
	);
	const [backgroundColor, setBackgroundColor] = useState(
		initialValues?.backgroundColor ?? "",
	);
	const [isComposing, setIsComposing] = useState(false);
	const [animationType, setAnimationType] = useState<AnimType | null>(null);
	const [isGeneratingGif, setIsGeneratingGif] = useState(false);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const miniCanvasRef = useRef<HTMLCanvasElement>(null);
	const animFrameRef = useRef<number | null>(null);

	const charCount = text.replace(/\n/g, "").length;
	const lineCount = text.split("\n").length;
	const isTransparent = !backgroundColor;
	// アニメーション選択時は GIF、未選択時は PNG で書き出す
	const outputFormat: "png" | "gif" = animationType ? "gif" : "png";

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

	const drawContent = useCallback(
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

			const trimmed = text.trim();
			if (!trimmed) return;

			const lines = trimmed
				.split("\n")
				.slice(0, 2)
				.map((l) => l.slice(0, 5))
				.filter((l) => l.length > 0);
			if (lines.length === 0) return;

			const PADDING = 4 * RENDER_SCALE;
			const CONTENT_W = SIZE - PADDING * 2;
			const CONTENT_H = SIZE - PADDING * 2;
			const SAFETY = 0.9;

			ctx.save();

			if (animParams.clipReveal < 1) {
				ctx.beginPath();
				ctx.rect(0, 0, SIZE * animParams.clipReveal, SIZE);
				ctx.clip();
			}

			if (animParams.scale !== 1 || animParams.rotate !== 0) {
				ctx.translate(SIZE / 2, SIZE / 2);
				if (animParams.rotate !== 0)
					ctx.rotate((animParams.rotate * Math.PI) / 180);
				if (animParams.scale !== 1)
					ctx.scale(animParams.scale, animParams.scale);
				ctx.translate(-SIZE / 2, -SIZE / 2);
			}

			if (animParams.offsetX !== 0 || animParams.offsetY !== 0) {
				ctx.translate(animParams.offsetX, animParams.offsetY);
			}

			ctx.globalAlpha = animParams.alpha;
			if (animParams.hueShift !== 0)
				ctx.filter = `hue-rotate(${animParams.hueShift}deg)`;
			if (animParams.shadowBlur > 0) {
				ctx.shadowBlur = animParams.shadowBlur;
				ctx.shadowColor = animParams.shadowColor || textColor;
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
				ctx.translate(drawX, drawY);
				ctx.scale(scaleX, scaleY);
				ctx.textAlign = textAlign;
				ctx.fillText(line, 0, 0);
				ctx.restore();
			}

			ctx.restore();
		},
		[text, fontWeight, fontFamily, textAlign, textColor, backgroundColor],
	);

	// アニメーションループが最新の描画関数を参照するための ref
	// （drawContent は編集のたびに変わるが、ループは再起動させない）
	const drawContentRef = useRef(drawContent);
	useEffect(() => {
		drawContentRef.current = drawContent;
	}, [drawContent]);

	/** メインプレビューを 128px 実寸プレビューへ転写 */
	const blitMini = useCallback(() => {
		const src = canvasRef.current;
		const dst = miniCanvasRef.current;
		if (!src || !dst) return;
		const ctx = dst.getContext("2d");
		if (!ctx) return;
		dst.width = dst.height = EXPORT_SIZE;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
		ctx.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
		ctx.drawImage(src, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
	}, []);

	const drawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const SIZE = EXPORT_SIZE * RENDER_SCALE;
		canvas.width = SIZE;
		canvas.height = SIZE;
		drawContent(ctx, SIZE);
		blitMini();
	}, [drawContent, blitMini]);

	useEffect(() => {
		if (typeof document === "undefined") return;
		const weights = ["400", "700", "900"];
		Promise.allSettled(
			weights.map((w) => document.fonts.load(`${w} 64px "${fontFamily}"`)),
		).then(() => drawCanvas());
		const t = setTimeout(drawCanvas, 400);
		return () => clearTimeout(t);
	}, [drawCanvas, fontFamily]);

	useEffect(() => {
		if (animFrameRef.current) {
			cancelAnimationFrame(animFrameRef.current);
			animFrameRef.current = null;
		}
		if (!animationType) return; // 静止画は上の effect が描画する

		const config = ANIM_CONFIGS[animationType];
		const SIZE = EXPORT_SIZE * RENDER_SCALE;
		const startTime = performance.now();
		const totalMs = config.frames * config.delay;

		const loop = (now: number) => {
			const frameIdx = Math.floor(((now - startTime) % totalMs) / config.delay);
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			canvas.width = SIZE;
			canvas.height = SIZE;
			drawContentRef.current(
				ctx,
				SIZE,
				config.getParams(frameIdx, config.frames, SIZE),
			);
			blitMini();
			animFrameRef.current = requestAnimationFrame(loop);
		};
		animFrameRef.current = requestAnimationFrame(loop);
		return () => {
			if (animFrameRef.current) {
				cancelAnimationFrame(animFrameRef.current);
				animFrameRef.current = null;
			}
		};
	}, [animationType, blitMini]);

	const buildGifDataUrl = useCallback(async (): Promise<string | null> => {
		if (!animationType) return null;
		const config = ANIM_CONFIGS[animationType];
		const renderSize = EXPORT_SIZE * RENDER_SCALE;

		const renderCanvas = document.createElement("canvas");
		renderCanvas.width = renderCanvas.height = renderSize;
		const renderCtx = renderCanvas.getContext("2d");
		if (!renderCtx) return null;

		const exportCanvas = document.createElement("canvas");
		exportCanvas.width = exportCanvas.height = EXPORT_SIZE;
		const exportCtx = exportCanvas.getContext("2d");
		if (!exportCtx) return null;
		exportCtx.imageSmoothingEnabled = true;
		exportCtx.imageSmoothingQuality = "high";

		const gifFrames: GifFrame[] = [];
		for (let f = 0; f < config.frames; f++) {
			renderCanvas.width = renderCanvas.height = renderSize;
			drawContent(
				renderCtx,
				renderSize,
				config.getParams(f, config.frames, renderSize),
			);

			exportCanvas.width = exportCanvas.height = EXPORT_SIZE;
			exportCtx.drawImage(renderCanvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

			gifFrames.push({
				imageData: exportCtx.getImageData(0, 0, EXPORT_SIZE, EXPORT_SIZE),
				delay: config.delay,
			});
		}

		return encodeGifToDataUrl(gifFrames, EXPORT_SIZE, EXPORT_SIZE, {
			transparent: isTransparent,
		});
	}, [animationType, drawContent, isTransparent]);

	const getImageData = useCallback(() => {
		const offscreen = document.createElement("canvas");
		offscreen.width = offscreen.height = EXPORT_SIZE * RENDER_SCALE;
		const renderCtx = offscreen.getContext("2d");
		if (!renderCtx) return null;
		// アニメーション中でも静止状態で書き出すため、プレビューではなく直接描画する
		drawContent(renderCtx, EXPORT_SIZE * RENDER_SCALE);

		const exportCanvas = document.createElement("canvas");
		exportCanvas.width = exportCanvas.height = EXPORT_SIZE;
		const ctx = exportCanvas.getContext("2d");
		if (!ctx) return null;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
		ctx.drawImage(offscreen, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
		return exportCanvas.toDataURL("image/png");
	}, [drawContent]);

	const handleDownload = async () => {
		if (animationType) {
			setIsGeneratingGif(true);
			try {
				const dataUrl = await buildGifDataUrl();
				if (!dataUrl) return;
				downloadDataUrl(dataUrl, `emoji_${Date.now()}.gif`);
			} finally {
				setIsGeneratingGif(false);
			}
		} else {
			const data = getImageData();
			if (!data) return;
			downloadDataUrl(data, `emoji_${Date.now()}.png`);
		}
	};

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
			type: "TEXT",
			text,
			fontWeight,
			fontFamily,
			textColor,
			backgroundColor,
			savedAt: Date.now(),
		}),
	});

	// ログイン往復後の下書き復元（編集モードでは提案しない）
	const [availableDraft, setAvailableDraft] = useState<TextEditorDraft | null>(
		null,
	);
	useEffect(() => {
		if (initialValues) return;
		const draft = loadDraft();
		if (draft?.type === "TEXT") setAvailableDraft(draft);
	}, [initialValues]);

	const restoreDraft = () => {
		if (!availableDraft) return;
		setText(availableDraft.text);
		setFontWeight(availableDraft.fontWeight);
		setFontFamily(availableDraft.fontFamily);
		setTextColor(availableDraft.textColor);
		setBackgroundColor(availableDraft.backgroundColor);
		clearDraft();
		setAvailableDraft(null);
		toast.success("編集内容を復元しました");
	};

	const discardDraft = () => {
		clearDraft();
		setAvailableDraft(null);
	};

	// キーボードショートカット（最新のハンドラを ref 経由で参照）
	const shortcutActionsRef = useRef({
		save: () => {},
		download: () => {},
	});
	shortcutActionsRef.current = { save: openSaveForm, download: handleDownload };

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey)) return;
			if (e.key.toLowerCase() === "s") {
				e.preventDefault();
				shortcutActionsRef.current.save();
			} else if (e.key === "Enter") {
				e.preventDefault();
				shortcutActionsRef.current.download();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const handleSaveSubmit = async () => {
		let imageData: string | null;
		if (animationType) {
			setIsGeneratingGif(true);
			try {
				imageData = await buildGifDataUrl();
			} finally {
				setIsGeneratingGif(false);
			}
		} else {
			imageData = getImageData();
		}
		if (!imageData) return;
		submitSave({
			editorType: "TEXT",
			imageData,
			text,
			fontWeight: Number.parseInt(fontWeight, 10),
			fontFamily,
			textColor,
			backgroundColor: backgroundColor || undefined,
		});
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

			<div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
				{/* ==== プレビュー（左・sticky） ==== */}
				<div className="lg:sticky lg:top-20 self-start">
					<div className="rounded-2xl border bg-card p-6 flex flex-col items-center gap-5">
						<div
							className="rounded-xl border overflow-hidden"
							style={isTransparent ? CHECKER_STYLE : undefined}
						>
							<canvas
								ref={canvasRef}
								role="img"
								aria-label="絵文字プレビュー"
								className="block w-64 h-64 sm:w-72 sm:h-72"
							/>
						</div>

						{/* 実寸プレビュー */}
						<div className="flex items-center gap-3">
							<div
								className="rounded-md border overflow-hidden"
								style={isTransparent ? CHECKER_SMALL_STYLE : undefined}
							>
								<canvas
									ref={miniCanvasRef}
									role="img"
									aria-label="実寸プレビュー（128px）"
									className="block w-[64px] h-[64px]"
								/>
							</div>
							<div className="text-xs text-muted-foreground leading-relaxed">
								Slack 上での見え方
								<br />
								128×128px で書き出し
							</div>
						</div>
					</div>
				</div>

				{/* ==== 設定（右） ==== */}
				<div className="space-y-7 pb-4">
					{/* テキスト */}
					<section className="space-y-2">
						<div className="flex items-center justify-between">
							<SectionLabel>テキスト</SectionLabel>
							<span
								className={cn(
									"text-xs tabular-nums",
									charCount >= 10
										? "text-red-400 font-semibold"
										: "text-muted-foreground",
								)}
							>
								{charCount}/10文字 · {lineCount}/2行
							</span>
						</div>
						<textarea
							value={text}
							onChange={handleTextChange}
							onCompositionStart={handleCompositionStart}
							onCompositionEnd={handleCompositionEnd}
							placeholder={"テキストを入力\n（2行・各行5文字まで）"}
							rows={2}
							aria-label="絵文字のテキスト"
							className={cn(
								"w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-lg leading-relaxed",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								"placeholder:text-muted-foreground placeholder:text-sm",
							)}
						/>
					</section>

					{/* フォント */}
					<section className="space-y-2.5">
						<SectionLabel>フォント</SectionLabel>
						<div className="grid grid-cols-2 min-[480px]:grid-cols-3 xl:grid-cols-4 gap-2">
							{FONTS.map((font) => (
								<button
									key={font.value}
									type="button"
									onClick={() => setFontFamily(font.value)}
									aria-pressed={fontFamily === font.value}
									className={cn(
										"flex flex-col items-center gap-0.5 rounded-lg border-2 px-2 py-2 transition",
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
									<span className="text-[10px] text-muted-foreground truncate max-w-full">
										{font.label}
									</span>
								</button>
							))}
						</div>

						<div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground">太さ</Label>
								<div className="flex rounded-lg border p-0.5">
									{FONT_WEIGHTS.map((fw) => (
										<button
											key={fw.value}
											type="button"
											onClick={() => setFontWeight(fw.value)}
											aria-pressed={fontWeight === fw.value}
											className={cn(
												"rounded-md px-3 py-1 text-xs font-medium transition",
												fontWeight === fw.value
													? "bg-primary text-primary-foreground"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											{fw.label}
										</button>
									))}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground">揃え</Label>
								<div className="flex rounded-lg border p-0.5">
									{TEXT_ALIGNS.map((a) => (
										<button
											key={a.value}
											type="button"
											onClick={() => setTextAlign(a.value)}
											aria-pressed={textAlign === a.value}
											className={cn(
												"rounded-md px-3 py-1 text-xs font-medium transition",
												textAlign === a.value
													? "bg-primary text-primary-foreground"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											{a.label.replace("揃え", "")}
										</button>
									))}
								</div>
							</div>
						</div>
					</section>

					{/* カラー */}
					<section className="space-y-3">
						<SectionLabel>カラー</SectionLabel>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">文字色</Label>
							<ColorPicker
								value={textColor}
								onChange={setTextColor}
								label="文字色"
							/>
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

					{/* アニメーション */}
					<section className="space-y-2.5">
						<div className="flex items-center justify-between">
							<SectionLabel>アニメーション</SectionLabel>
							<span className="text-xs text-muted-foreground">
								選ぶと GIF で書き出されます
							</span>
						</div>
						<div className="grid grid-cols-3 min-[480px]:grid-cols-4 gap-1.5">
							<button
								type="button"
								onClick={() => setAnimationType(null)}
								aria-pressed={animationType === null}
								className={cn(
									"flex items-center justify-center gap-1 rounded-lg border-2 px-2 py-2 text-xs font-medium transition",
									animationType === null
										? "border-primary bg-primary/5"
										: "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
								)}
							>
								なし
							</button>
							{(Object.entries(ANIM_CONFIGS) as [AnimType, AnimConfig][]).map(
								([key, cfg]) => (
									<button
										key={key}
										type="button"
										onClick={() => setAnimationType(key)}
										aria-pressed={animationType === key}
										className={cn(
											"flex items-center justify-center gap-1 rounded-lg border-2 px-2 py-2 text-xs font-medium transition",
											animationType === key
												? "border-primary bg-primary/5"
												: "border-border hover:border-muted-foreground/50 hover:bg-muted/50",
										)}
									>
										<span className="truncate">{cfg.label}</span>
									</button>
								),
							)}
						</div>
					</section>
				</div>
			</div>

			{/* ==== 操作バー（常時表示） ==== */}
			<div className="sticky bottom-0 z-40 mt-6 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
				<div className="flex items-center justify-end gap-2">
					<div className="mr-auto flex items-center gap-1.5">
						<ShortcutHelp shortcuts={TEXT_SHORTCUTS} />
						<span className="text-xs text-muted-foreground hidden sm:block">
							{outputFormat === "gif"
								? `GIF · ${animationType ? ANIM_CONFIGS[animationType].label : ""}`
								: "PNG · 静止画"}
						</span>
					</div>
					<Button
						onClick={handleDownload}
						size="lg"
						disabled={isGeneratingGif}
						className="flex-1 sm:flex-none"
					>
						<Download className="mr-2 h-4 w-4" />
						{isGeneratingGif
							? "生成中..."
							: `${outputFormat.toUpperCase()} ダウンロード`}
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
						busyLabel={isGeneratingGif ? "GIF生成中..." : undefined}
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
