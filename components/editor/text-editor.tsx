"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/trpc/react";
import { authClient } from "@/lib/auth/client";
import type { EditorMode } from "@/lib/stores/editor-store";

const FONTS = [
  { value: "Noto Sans JP",          label: "ノトサン JP" },
  { value: "Noto Serif JP",         label: "ノトセリフ JP" },
  { value: "M PLUS Rounded 1c",     label: "Mプラスラウンド1c" },
  { value: "Kosugi Maru",           label: "こすぎ丸" },
  { value: "Zen Maru Gothic",       label: "ゼン・マル・ゴシック" },
  { value: "Zen Kaku Gothic New",   label: "ゼン・カク・ゴシック New" },
  { value: "BIZ UDPGothic",         label: "BIZ UDPゴシック" },
  { value: "DotGothic16",           label: "ドットゴシック16" },
  { value: "Dela Gothic One",       label: "デラゴシック" },
  { value: "Hachi Maru Pop",        label: "はちまるポップ" },
  { value: "Zen Antique",           label: "ゼン・アンティーク" },
  { value: "Kaisei Decol",          label: "楷書でこる" },
  { value: "New Tegomin",           label: "新でこみん" },
  { value: "Yomogi",                label: "よもぎ" },
  { value: "Reggae One",            label: "レゲエ" },
  { value: "RocknRoll One",         label: "ロックンロール" },
];

const FONT_WEIGHTS = [
  { value: "400", label: "標準" },
  { value: "700", label: "太字" },
  { value: "900", label: "極太" },
];

type TextAlign = "left" | "center" | "right";
const TEXT_ALIGNS: { value: TextAlign; label: string }[] = [
  { value: "left",   label: "Left" },
  { value: "center", label: "Center" },
  { value: "right",  label: "Right" },
];

type AnimType =
  | "fadeIn" | "blink" | "flash"
  | "scroll" | "slideUp" | "slideDown"
  | "zoomIn" | "zoomOut" | "pulse"
  | "bounce" | "shake" | "spin"
  | "rainbow" | "neon" | "glitch" | "typewriter";

type AnimParams = {
  alpha: number;
  offsetX: number;
  offsetY: number;
  hueShift: number;
  scale: number;
  rotate: number;
  shadowBlur: number;
  shadowColor: string;
  clipReveal: number; // 0-1: typewriter left-to-right reveal
};

const AP0: AnimParams = {
  alpha: 1, offsetX: 0, offsetY: 0, hueShift: 0,
  scale: 1, rotate: 0, shadowBlur: 0, shadowColor: "", clipReveal: 1,
};

type AnimConfig = {
  label: string;
  icon: string;
  frames: number;
  delay: number;
  getParams: (f: number, t: number, s: number) => AnimParams;
};

const ANIM_CONFIGS: Record<AnimType, AnimConfig> = {
  fadeIn:     { label: "Fade In",    icon: "✨", frames: 10, delay: 80,  getParams: (f,t)   => ({ ...AP0, alpha: f / (t-1) }) },
  blink:      { label: "Blink",      icon: "💫", frames: 6,  delay: 300, getParams: (f)     => ({ ...AP0, alpha: f%2===0 ? 1 : 0 }) },
  flash:      { label: "Flash",      icon: "⚡", frames: 8,  delay: 60,  getParams: (f)     => ({ ...AP0, alpha: f%2===0 ? 1 : 0.05 }) },
  scroll:     { label: "Scroll →",   icon: "▶️", frames: 14, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetX: Math.round(s*(1-f/(t-1))) }) },
  slideUp:    { label: "Slide Up",   icon: "⬆️", frames: 12, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetY: Math.round(s*(1-f/(t-1))) }) },
  slideDown:  { label: "Slide Down", icon: "⬇️", frames: 12, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetY: Math.round(-s*(1-f/(t-1))) }) },
  zoomIn:     { label: "Zoom In",    icon: "🔍", frames: 10, delay: 80,  getParams: (f,t)   => ({ ...AP0, scale: 0.05 + 0.95*(f/(t-1)) }) },
  zoomOut:    { label: "Zoom Out",   icon: "🔎", frames: 10, delay: 80,  getParams: (f,t)   => ({ ...AP0, scale: 1 - 0.95*(f/(t-1)) }) },
  pulse:      { label: "Pulse",      icon: "💗", frames: 14, delay: 70,  getParams: (f,t)   => ({ ...AP0, scale: 0.8 + 0.25*Math.abs(Math.sin(f/t*Math.PI*2)) }) },
  bounce:     { label: "Bounce",     icon: "🏀", frames: 14, delay: 70,  getParams: (f,t,s) => ({ ...AP0, offsetY: Math.round(-Math.abs(Math.sin(f/t*Math.PI*2))*s*0.14) }) },
  shake:      { label: "Shake",      icon: "📳", frames: 10, delay: 55,  getParams: (f,_,s) => ({ ...AP0, offsetX: Math.round(Math.sin(f*3.14)*s*0.05) }) },
  spin:       { label: "Spin",       icon: "🌀", frames: 12, delay: 70,  getParams: (f,t)   => ({ ...AP0, rotate: 360*f/t, scale: 0.65 }) },
  rainbow:    { label: "Rainbow",    icon: "🌈", frames: 16, delay: 60,  getParams: (f,t)   => ({ ...AP0, hueShift: 360*f/t }) },
  neon:       { label: "Neon",       icon: "💡", frames: 14, delay: 75,  getParams: (f,t,s) => ({ ...AP0, shadowBlur: s*0.10*Math.abs(Math.sin(f/t*Math.PI*2)), shadowColor: "#ffffff" }) },
  glitch:     { label: "Glitch",     icon: "👾", frames: 8,  delay: 60,  getParams: (f,_,s) => ({ ...AP0, offsetX: Math.round(Math.sin(f*2.3)*s*0.025), hueShift: (f*87)%360 }) },
  typewriter: { label: "Typewriter", icon: "⌨️", frames: 14, delay: 80,  getParams: (f,t)   => ({ ...AP0, clipReveal: f/(t-1) }) },
};

const CARD_STYLES: Record<EditorMode, string> = {
  normal: "",
  fancy:  "border-pink-200 bg-white/80 backdrop-blur-sm",
  retro:  "bg-[#0a0a0a] border-white/30 text-white",
  space:  "bg-[#050e1f] border-blue-900 text-blue-100",
};

const LABEL_STYLES: Record<EditorMode, string> = {
  normal: "",
  fancy:  "text-pink-800",
  retro:  "text-white",
  space:  "text-blue-200",
};

const INPUT_STYLES: Record<EditorMode, string> = {
  normal: "bg-background border-input",
  fancy:  "bg-pink-50/50 border-pink-200 focus:border-pink-400",
  retro:  "bg-[#1a1a1a] border-white/30 text-white placeholder:text-white/40",
  space:  "bg-[#050e1f] border-blue-900 text-blue-100 placeholder:text-blue-900",
};

const HINT_STYLES: Record<EditorMode, string> = {
  normal: "text-muted-foreground",
  fancy:  "text-pink-400",
  retro:  "text-white/60",
  space:  "text-blue-700",
};

const UI_FONT_STYLES: Record<EditorMode, string> = {
  normal: "",
  fancy:  "font-['Pacifico']",
  retro:  "font-['DotGothic16']",
  space:  "font-['Zen Kaku Gothic New']",
};

type FrameConfig = {
  areaClass: string;
  wrapperClass: string;
  wrapperStyle: React.CSSProperties;
  innerClass?: string;
  defaultCanvasBg: string;
  decoration?: React.ReactNode;
};

const FRAME_CONFIGS: Record<EditorMode, FrameConfig> = {
  normal: {
    areaClass:      "bg-gray-50 rounded-xl",
    wrapperClass:   "rounded-xl border-4 border-gray-300 overflow-hidden shadow",
    wrapperStyle:   {},
    defaultCanvasBg: "#ffffff",
  },
  fancy: {
    areaClass:    "bg-gradient-to-br from-pink-100 via-purple-50 to-yellow-100 rounded-2xl",
    wrapperClass: "rounded-2xl overflow-hidden",
    wrapperStyle: {
      padding: "3px",
      background: "linear-gradient(135deg, #ec4899, #a855f7, #f59e0b, #ec4899)",
      boxShadow: "0 0 0 2px white, 0 0 20px rgba(236,72,153,0.5), 0 4px 20px rgba(168,85,247,0.3)",
    },
    innerClass:      "rounded-[10px] overflow-hidden bg-white",
    defaultCanvasBg: "#ffffff",
  },
  retro: {
    areaClass:    "bg-gray-50 rounded-lg",
    wrapperClass: "overflow-hidden",
    wrapperStyle: { boxShadow: "0 0 0 3px #000000", imageRendering: "pixelated" },
    defaultCanvasBg: "#ffffff",
    decoration: (
      <p className="font-['DotGothic16'] text-gray-800 text-xs tracking-[0.3em] mt-3 animate-pulse">
        ▶ PRESS ANY KEY ◀
      </p>
    ),
  },
  space: {
    areaClass:    "bg-[#020817] rounded-xl",
    wrapperClass: "rounded-lg overflow-hidden",
    wrapperStyle: {
      boxShadow: "0 0 0 2px #38bdf8, 0 0 20px rgba(56,189,248,0.6), 0 0 40px rgba(14,165,233,0.2)",
    },
    defaultCanvasBg: "#ffffff",
    decoration: (
      <p className="font-['Zen Kaku Gothic New'] text-blue-400 text-xs tracking-[0.3em] mt-3">
        ◈ SIGNAL ACQUIRED ◈
      </p>
    ),
  },
};

interface TextEditorProps {
  mode: EditorMode;
}

const RENDER_SCALE = 4;
const EXPORT_SIZE = 128;

export function TextEditor({ mode }: TextEditorProps) {
  const [text, setText] = useState("よろ\nしく");
  const [fontWeight, setFontWeight] = useState("700");
  const [fontFamily, setFontFamily] = useState("Noto Sans JP");
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [textColor, setTextColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [outputFormat, setOutputFormat] = useState<"png" | "gif">("png");
  const [animationType, setAnimationType] = useState<AnimType | null>(null);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const charCount = text.replace(/\n/g, "").length;
  const lineCount = text.split("\n").length;

  // let を排除: reduce で累積カウントを管理
  const trimToLimit = useCallback((val: string): string => {
    const { lines } = val
      .split("\n")
      .slice(0, 2)
      .reduce<{ lines: string[]; total: number }>(
        ({ lines, total }, l) => {
          const remaining = 10 - total;
          if (remaining <= 0) return { lines, total };
          const capped = l.slice(0, Math.min(5, remaining));
          return capped
            ? { lines: [...lines, capped], total: total + capped.length }
            : { lines, total };
        },
        { lines: [], total: 0 }
      );
    return lines.join("\n");
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (isComposing) { setText(val); return; }
    const lines = val.split("\n");
    if (lines.length > 2) return;
    if (lines.some((l) => l.length > 5)) return;
    if (val.replace(/\n/g, "").length > 10) return;
    setText(val);
  };

  const handleCompositionStart = () => setIsComposing(true);

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    const { value } = e.target as HTMLTextAreaElement;
    setTimeout(() => setText(trimToLimit(value)), 0);
  };

  // measureText をキャッシュして呼び出しを半減
  const drawContent = useCallback((
    ctx: CanvasRenderingContext2D,
    SIZE: number,
    animParams: AnimParams = AP0,
  ) => {
    const frameConfig = FRAME_CONFIGS[mode];
    ctx.fillStyle = backgroundColor || frameConfig.defaultCanvasBg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const trimmed = text.trim();
    if (!trimmed) return;

    const lines = trimmed
      .split("\n")
      .slice(0, 2)
      .map((l) => l.slice(0, 5))
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const PADDING   = 4 * RENDER_SCALE;
    const CONTENT_W = SIZE - PADDING * 2;
    const CONTENT_H = SIZE - PADDING * 2;
    const SAFETY    = 0.90;

    ctx.save();

    if (animParams.clipReveal < 1) {
      ctx.beginPath();
      ctx.rect(0, 0, SIZE * animParams.clipReveal, SIZE);
      ctx.clip();
    }

    if (animParams.scale !== 1 || animParams.rotate !== 0) {
      ctx.translate(SIZE / 2, SIZE / 2);
      if (animParams.rotate !== 0) ctx.rotate(animParams.rotate * Math.PI / 180);
      if (animParams.scale  !== 1) ctx.scale(animParams.scale, animParams.scale);
      ctx.translate(-SIZE / 2, -SIZE / 2);
    }

    if (animParams.offsetX !== 0 || animParams.offsetY !== 0) {
      ctx.translate(animParams.offsetX, animParams.offsetY);
    }

    ctx.globalAlpha = animParams.alpha;
    if (animParams.hueShift  !== 0) ctx.filter = `hue-rotate(${animParams.hueShift}deg)`;
    if (animParams.shadowBlur > 0) {
      ctx.shadowBlur  = animParams.shadowBlur;
      ctx.shadowColor = animParams.shadowColor || textColor;
    }

    ctx.font         = `${fontWeight} 100px "${fontFamily}", sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle    = textColor;

    // measureText を一度だけ呼んでキャッシュ
    const allMetrics = lines.map((l) => ctx.measureText(l));
    const maxNatW    = Math.max(...allMetrics.map((m) => m.width || 1));
    const numLines   = lines.length;
    const slotH      = CONTENT_H / numLines;

    for (const [i, line] of lines.entries()) {
      const m    = allMetrics[i];
      const natW = m.width || 1;
      const asc  = m.actualBoundingBoxAscent  ?? 90;
      const des  = m.actualBoundingBoxDescent ?? 15;

      const scaleX = textAlign === "center" ? CONTENT_W / natW : CONTENT_W / maxNatW;
      const scaleY = (slotH / (asc + des)) * SAFETY;
      const drawY  = PADDING + slotH * i + slotH / 2 + (asc - des) * scaleY / 2;
      const drawX  =
        textAlign === "left"  ? PADDING :
        textAlign === "right" ? PADDING + CONTENT_W :
                                PADDING + CONTENT_W / 2;

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(scaleX, scaleY);
      ctx.textAlign = textAlign;
      ctx.fillText(line, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }, [text, fontWeight, fontFamily, textAlign, textColor, backgroundColor, mode]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SIZE = EXPORT_SIZE * RENDER_SCALE;
    canvas.width  = SIZE;
    canvas.height = SIZE;
    drawContent(ctx, SIZE);
  }, [drawContent]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const weights = ["400", "700", "900"];
    Promise.allSettled(
      weights.map((w) => document.fonts.load(`${w} 64px "${fontFamily}"`))
    ).then(() => drawCanvas());
    const t = setTimeout(drawCanvas, 400);
    return () => clearTimeout(t);
  }, [drawCanvas, fontFamily]);

  // アニメーションプレビューループ
  useEffect(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (!animationType) { drawCanvas(); return; }

    const config    = ANIM_CONFIGS[animationType];
    const SIZE      = EXPORT_SIZE * RENDER_SCALE;
    const startTime = performance.now();
    const totalMs   = config.frames * config.delay;

    const loop = (now: number) => {
      const frameIdx = Math.floor(((now - startTime) % totalMs) / config.delay);
      const canvas   = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width  = SIZE;
      canvas.height = SIZE;
      drawContent(ctx, SIZE, config.getParams(frameIdx, config.frames, SIZE));
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animationType, drawContent, drawCanvas]);

  const downloadGif = async () => {
    if (!animationType) return;
    setIsGeneratingGif(true);
    try {
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
      const config     = ANIM_CONFIGS[animationType];
      const gif        = GIFEncoder();
      const renderSize = EXPORT_SIZE * RENDER_SCALE;

      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = renderCanvas.height = renderSize;
      const renderCtx = renderCanvas.getContext("2d");
      if (!renderCtx) return;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = exportCanvas.height = EXPORT_SIZE;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) return;
      exportCtx.imageSmoothingEnabled = true;
      exportCtx.imageSmoothingQuality = "high";

      for (let f = 0; f < config.frames; f++) {
        renderCanvas.width = renderCanvas.height = renderSize;
        drawContent(renderCtx, renderSize, config.getParams(f, config.frames, renderSize));

        exportCanvas.width = exportCanvas.height = EXPORT_SIZE;
        exportCtx.drawImage(renderCanvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

        const imgData = exportCtx.getImageData(0, 0, EXPORT_SIZE, EXPORT_SIZE);
        const palette = quantize(imgData.data, 256);
        const index   = applyPalette(imgData.data, palette);
        gif.writeFrame(index, EXPORT_SIZE, EXPORT_SIZE, { palette, delay: config.delay });
      }

      gif.finish();
      const url = URL.createObjectURL(new Blob([gif.bytes()], { type: "image/gif" }));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `emoji_${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGeneratingGif(false);
    }
  };

  const getImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const offscreen = document.createElement("canvas");
    offscreen.width = offscreen.height = EXPORT_SIZE;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
    return offscreen.toDataURL("image/png");
  }, []);

  const downloadImage = () => {
    const data = getImageData();
    if (!data) return;
    const link      = document.createElement("a");
    link.download   = `emoji_${Date.now()}.png`;
    link.href       = data;
    link.click();
  };

  const { data: session } = authClient.useSession();
  const createEmoji = api.emoji.create.useMutation();
  const [saveName, setSaveName] = useState("");
  const [savePublic, setSavePublic] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);

  const handleSave = () => {
    if (!session?.user) {
      authClient.signIn.social({ provider: "google" });
      return;
    }
    setShowSaveForm(true);
  };

  const handleSaveSubmit = () => {
    const imageData = getImageData();
    if (!imageData || !saveName.trim()) return;
    createEmoji.mutate(
      {
        name:            saveName.trim(),
        editorType:      "TEXT",
        imageData,
        isPublic:        savePublic,
        text,
        fontSize:        Number.parseInt(fontWeight, 10),
        fontFamily,
        textColor,
        backgroundColor: backgroundColor || undefined,
      },
      {
        onSuccess: () => {
          setShowSaveForm(false);
          setSaveName("");
          window.location.href = "/my-emojis";
        },
      }
    );
  };

  const frameConfig  = FRAME_CONFIGS[mode];
  const cardStyle    = CARD_STYLES[mode];
  const labelStyle   = LABEL_STYLES[mode];
  const inputStyle   = INPUT_STYLES[mode];
  const hintStyle    = HINT_STYLES[mode];
  const uiFontStyle  = UI_FONT_STYLES[mode];

  return (
    <div className={cn("grid gap-4 sm:gap-6 lg:grid-cols-3", uiFontStyle)}>
      {/* 設定パネル */}
      <div className="lg:col-span-1">
        <Card className={cardStyle}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* 文字入力 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className={labelStyle}>Text</Label>
                <span className={cn(
                  "text-xs tabular-nums",
                  charCount >= 10 ? "text-red-400 font-semibold" : hintStyle
                )}>
                  {charCount}/10 · {lineCount}/2 lines (max 5/line)
                </span>
              </div>
              <textarea
                value={text}
                onChange={handleTextChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="Text"
                rows={2}
                className={cn(
                  "w-full resize-none rounded-md border px-3 py-2 text-base leading-relaxed",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "placeholder:text-muted-foreground",
                  inputStyle
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={labelStyle}>Weight</Label>
              <Select value={fontWeight} onValueChange={setFontWeight}>
                <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((fw) => (
                    <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelStyle}>Font</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[220px]">
                  {FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelStyle}>Alignment</Label>
              <Select value={textAlign} onValueChange={(v) => setTextAlign(v as TextAlign)}>
                <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEXT_ALIGNS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={labelStyle}>Text color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-input flex-shrink-0"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className={cn("flex-1 rounded-md border px-3 py-2 text-sm", inputStyle)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={labelStyle}>Background</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={backgroundColor || "#ffffff"}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-input flex-shrink-0"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className={cn("flex-1 rounded-md border px-3 py-2 text-sm", inputStyle)}
                  placeholder="Transparent"
                />
                {backgroundColor && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setBackgroundColor("")}
                    className="flex-shrink-0 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-1.5">
              <Label className={labelStyle}>Format</Label>
              <div className="flex gap-2">
                {(["png", "gif"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      setOutputFormat(fmt);
                      if (fmt === "png") setAnimationType(null);
                    }}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition",
                      outputFormat === fmt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:border-gray-400"
                    )}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation (GIF only) */}
            {outputFormat === "gif" && (
              <div className="space-y-1.5">
                <Label className={labelStyle}>Animation</Label>
                <Select
                  value={animationType ?? ""}
                  onValueChange={(v) => setAnimationType(v ? (v as AnimType) : null)}
                >
                  <SelectTrigger className={inputStyle}>
                    <SelectValue placeholder="— Select animation —" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ANIM_CONFIGS) as [AnimType, AnimConfig][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="mr-2">{cfg.icon}</span>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {outputFormat === "png" ? (
              <Button onClick={downloadImage} className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
            ) : (
              <Button
                onClick={downloadGif}
                className="w-full"
                size="lg"
                disabled={!animationType || isGeneratingGif}
              >
                <Download className="mr-2 h-4 w-4" />
                {isGeneratingGif ? "Generating..." : animationType ? "Download GIF" : "Select Animation"}
              </Button>
            )}

            <Button onClick={handleSave} variant="outline" className="w-full" size="lg">
              <Save className="mr-2 h-4 w-4" />
              Save to My Emojis
            </Button>

            {showSaveForm && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
                <div className="space-y-1.5">
                  <Label className={labelStyle}>Name</Label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="emoji_name"
                    className={cn("w-full rounded-md border px-3 py-2 text-sm", inputStyle)}
                    maxLength={50}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className={labelStyle}>Public</Label>
                  <Switch checked={savePublic} onCheckedChange={setSavePublic} />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveSubmit}
                    disabled={!saveName.trim() || createEmoji.isPending}
                    className="flex-1"
                  >
                    {createEmoji.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowSaveForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* プレビュー */}
      <div className="lg:col-span-2">
        <Card className={cardStyle}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "flex flex-col items-center justify-center gap-4 p-8 sm:p-12 min-h-64",
              frameConfig.areaClass
            )}>
              <div className={frameConfig.wrapperClass} style={frameConfig.wrapperStyle}>
                {frameConfig.innerClass ? (
                  <div className={frameConfig.innerClass}>
                    <canvas ref={canvasRef} className="block w-48 h-48 sm:w-56 sm:h-56" style={{ imageRendering: "auto" }} />
                  </div>
                ) : (
                  <canvas ref={canvasRef} className="block w-48 h-48 sm:w-56 sm:h-56" style={{ imageRendering: "auto" }} />
                )}
              </div>
              {frameConfig.decoration}
              <p className={cn("text-xs", hintStyle)}>128×128px (Slack standard)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
