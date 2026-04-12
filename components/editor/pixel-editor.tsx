"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Undo2,
  Redo2,
  Eraser,
  Save,
  Pencil,
  Minus,
  Square,
  Circle,
  Triangle,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/trpc/react";
import { authClient } from "@/lib/auth/client";
import { Switch } from "@/components/ui/switch";

const EXPORT_SIZE = 128;
const FIXED_DISPLAY_SIZE = 512;
const MAX_FRAMES = 8;

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

type ToolType = "pencil" | "eraser" | "line" | "rect" | "circle" | "triangle";

// ---- Shape pixel algorithms (pure, outside component) ----

function plotLine(
  r0: number,
  c0: number,
  r1: number,
  c1: number
): [number, number][] {
  const cells: [number, number][] = [];
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
    if (e2 > -dr) { err -= dr; c += sc; }
    if (e2 < dc)  { err += dc; r += sr; }
  }
  return cells;
}

function plotCircle(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  filled: boolean
): [number, number][] {
  const cr = Math.round((r0 + r1) / 2);
  const cc = Math.round((c0 + c1) / 2);
  const radius = Math.round(Math.min(Math.abs(r1 - r0), Math.abs(c1 - c0)) / 2);
  const cells: [number, number][] = [];
  if (filled) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr * dr + dc * dc <= radius * radius) cells.push([cr + dr, cc + dc]);
      }
    }
    return cells;
  }
  let x = radius;
  let y = 0;
  let err2 = 0;
  while (x >= y) {
    const pts: [number, number][] = [
      [cr + y, cc + x], [cr + x, cc + y],
      [cr + x, cc - y], [cr + y, cc - x],
      [cr - y, cc - x], [cr - x, cc - y],
      [cr - x, cc + y], [cr - y, cc + x],
    ];
    for (const pt of pts) cells.push(pt);
    y++;
    err2 += 2 * y + 1;
    if (2 * (err2 - x) + 1 > 0) { x--; err2 += 2 * (1 - x); }
  }
  return cells;
}

function plotRect(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  filled: boolean
): [number, number][] {
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const cells: [number, number][] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (filled || r === minR || r === maxR || c === minC || c === maxC)
        cells.push([r, c]);
    }
  }
  return cells;
}

function plotTriangle(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  filled: boolean
): [number, number][] {
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  const midC = Math.round((minC + maxC) / 2);
  const va: [number, number] = [minR, midC];
  const vb: [number, number] = [maxR, minC];
  const vc: [number, number] = [maxR, maxC];
  if (filled) {
    const cells: [number, number][] = [];
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

function createEmptyGrid(size: number): string[][] {
  return Array(size).fill(null).map(() => Array(size).fill("#ffffff"));
}

// ---- Component ----

const TOOL_DEFS: { tool: ToolType; label: string; icon: React.ReactNode }[] = [
  { tool: "pencil",   label: "ペン",      icon: <Pencil   className="h-4 w-4" /> },
  { tool: "eraser",   label: "消しゴム",  icon: <Eraser   className="h-4 w-4" /> },
  { tool: "line",     label: "直線",      icon: <Minus    className="h-4 w-4" /> },
  { tool: "rect",     label: "四角形",    icon: <Square   className="h-4 w-4" /> },
  { tool: "circle",   label: "円",        icon: <Circle   className="h-4 w-4" /> },
  { tool: "triangle", label: "三角形",    icon: <Triangle className="h-4 w-4" /> },
];

const SHAPE_TOOLS: ToolType[] = ["line", "rect", "circle", "triangle"];

interface PixelEditorInitialValues {
  pixelData?: string[][];
  pixelCanvasSize?: number;
}

export function PixelEditor({ initialValues }: { initialValues?: PixelEditorInitialValues } = {}) {
  const initSize = initialValues?.pixelCanvasSize ?? 32;
  const initGrid = initialValues?.pixelData ?? createEmptyGrid(initSize);

  const [canvasSize, setCanvasSize] = useState(String(initSize));
  const [frames, setFrames] = useState<string[][][]>(() => [initGrid.map((r) => [...r])]);
  const [frameIds, setFrameIds] = useState<string[]>(() => [crypto.randomUUID()]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [history, setHistory] = useState<string[][][][]>(() => [[initGrid.map((r) => [...r])]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [drawColor, setDrawColor] = useState("#000000");
  const [customColor, setCustomColor] = useState("#000000");
  const [activeTool, setActiveTool] = useState<ToolType>("pencil");
  const [isFilled, setIsFilled] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapeAnchor, setShapeAnchor] = useState<[number, number] | null>(null);
  const [previewCells, setPreviewCells] = useState<[number, number][]>([]);
  const [frameDelay, setFrameDelay] = useState(200);
  const [isPlaying, setIsPlaying] = useState(false);
  const [outputFormat, setOutputFormat] = useState<"png" | "gif">("png");

  const [saveName, setSaveName] = useState("");
  const [savePublic, setSavePublic] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [isSavingGif, setIsSavingGif] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const size = Number.parseInt(canvasSize, 10);
  const cellSize = FIXED_DISPLAY_SIZE / size;

  // ---- History ----

  const saveToHistory = useCallback(
    (snapshot: string[][][]) => {
      const copy = snapshot.map((f) => f.map((row) => [...row]));
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), copy].slice(-50));
      setHistoryIndex((idx) => Math.min(idx + 1, 49));
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const snap = history[historyIndex - 1];
    setFrames(snap.map((f) => f.map((row) => [...row])));
    setCurrentFrame((cf) => Math.min(cf, snap.length - 1));
    setHistoryIndex((idx) => idx - 1);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const snap = history[historyIndex + 1];
    setFrames(snap.map((f) => f.map((row) => [...row])));
    setCurrentFrame((cf) => Math.min(cf, snap.length - 1));
    setHistoryIndex((idx) => idx + 1);
  }, [history, historyIndex]);

  // ---- Canvas size ----

  const handleCanvasSizeChange = (newSize: string) => {
    const n = Number.parseInt(newSize, 10);
    const newFrames = [createEmptyGrid(n)];
    setCanvasSize(newSize);
    setFrames(newFrames);
    setFrameIds([crypto.randomUUID()]);
    setCurrentFrame(0);
    setHistory([newFrames]);
    setHistoryIndex(0);
  };

  // ---- Clear ----

  const clearCanvas = useCallback(() => {
    const newFrames = frames.map((f, i) => (i === currentFrame ? createEmptyGrid(size) : f));
    setFrames(newFrames);
    saveToHistory(newFrames);
  }, [size, frames, currentFrame, saveToHistory]);

  // ---- Pencil drawing ----

  const drawCell = useCallback(
    (row: number, col: number) => {
      if (row < 0 || row >= size || col < 0 || col >= size) return;
      const color = activeTool === "eraser" ? "#ffffff" : drawColor;
      setFrames((prev) => {
        const frame = prev[currentFrame];
        if (!frame || frame[row][col] === color) return prev;
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
    [size, activeTool, drawColor, currentFrame]
  );

  // ---- Shape tools ----

  const computeShapeCells = useCallback(
    (r0: number, c0: number, r1: number, c1: number): [number, number][] => {
      switch (activeTool) {
        case "line":     return plotLine(r0, c0, r1, c1);
        case "rect":     return plotRect(r0, c0, r1, c1, isFilled);
        case "circle":   return plotCircle(r0, c0, r1, c1, isFilled);
        case "triangle": return plotTriangle(r0, c0, r1, c1, isFilled);
        default:         return [];
      }
    },
    [activeTool, isFilled]
  );

  const getGridPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [-1, -1];
      const rect = canvas.getBoundingClientRect();
      return [
        Math.floor(((e.clientY - rect.top)  / rect.height) * size),
        Math.floor(((e.clientX - rect.left) / rect.width)  * size),
      ];
    },
    [size]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const [row, col] = getGridPos(e);
      if (row < 0 || row >= size || col < 0 || col >= size) return;
      if (SHAPE_TOOLS.includes(activeTool)) {
        setShapeAnchor([row, col]);
        setPreviewCells([[row, col]]);
        return;
      }
      setIsDrawing(true);
      drawCell(row, col);
    },
    [getGridPos, size, activeTool, drawCell]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const [row, col] = getGridPos(e);
      if (shapeAnchor) {
        setPreviewCells(
          computeShapeCells(shapeAnchor[0], shapeAnchor[1], row, col).filter(
            ([r, c]) => r >= 0 && r < size && c >= 0 && c < size
          )
        );
        return;
      }
      if (isDrawing && row >= 0 && row < size && col >= 0 && col < size) {
        drawCell(row, col);
      }
    },
    [shapeAnchor, computeShapeCells, size, isDrawing, drawCell, getGridPos]
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
  }, [shapeAnchor, previewCells, activeTool, drawColor, frames, currentFrame, saveToHistory]);

  const handlePointerUpOrLeave = useCallback(() => {
    if (shapeAnchor) {
      commitShape();
      return;
    }
    if (!isDrawing) return;
    setFrames((current) => {
      saveToHistory(current);
      return current;
    });
    setIsDrawing(false);
  }, [shapeAnchor, commitShape, isDrawing, saveToHistory]);

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
      frameDelay
    );
    return () => clearInterval(id);
  }, [isPlaying, frames.length, frameDelay]);

  useEffect(() => {
    if (frames.length <= 1) setIsPlaying(false);
  }, [frames.length]);

  // ---- Canvas rendering ----

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== FIXED_DISPLAY_SIZE || canvas.height !== FIXED_DISPLAY_SIZE) {
      canvas.width = FIXED_DISPLAY_SIZE;
      canvas.height = FIXED_DISPLAY_SIZE;
    } else {
      ctx.clearRect(0, 0, FIXED_DISPLAY_SIZE, FIXED_DISPLAY_SIZE);
    }

    const frame = frames[currentFrame] ?? createEmptyGrid(size);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        ctx.fillStyle = frame[row][col];
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }

    if (previewCells.length > 0) {
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = activeTool === "eraser" ? "#ffffff" : drawColor;
      for (const [r, c] of previewCells) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i <= size; i++) {
      const p = i * cellSize;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, FIXED_DISPLAY_SIZE);
      ctx.moveTo(0, p);
      ctx.lineTo(FIXED_DISPLAY_SIZE, p);
    }
    ctx.stroke();
  }, [frames, currentFrame, previewCells, drawColor, activeTool, size, cellSize]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

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
    [size]
  );

  const getImageData = useCallback(
    () => renderFrameToCanvas(frames[currentFrame]).toDataURL("image/png"),
    [frames, currentFrame, renderFrameToCanvas]
  );

  const downloadPng = useCallback(() => {
    const link = document.createElement("a");
    link.download = `emoji_pixel_${Date.now()}.png`;
    link.href = getImageData();
    link.click();
  }, [getImageData]);

  const buildGifDataUrl = useCallback(async (): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { GIFEncoder, quantize, applyPalette } = await import("gifenc" as any);
    const gif = GIFEncoder();
    for (const frame of frames) {
      const canvas = renderFrameToCanvas(frame);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      const imageData = ctx.getImageData(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      const palette = quantize(imageData.data, 256);
      const index = applyPalette(imageData.data, palette);
      gif.writeFrame(index, EXPORT_SIZE, EXPORT_SIZE, { palette, delay: frameDelay });
    }
    gif.finish();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(new Blob([gif.bytes()], { type: "image/gif" }));
    });
  }, [frames, renderFrameToCanvas, frameDelay]);

  const downloadGif = useCallback(async () => {
    const dataUrl = await buildGifDataUrl();
    const link = document.createElement("a");
    link.download = `emoji_pixel_${Date.now()}.gif`;
    link.href = dataUrl;
    link.click();
  }, [buildGifDataUrl]);

  const handleDownload = useCallback(() => {
    if (outputFormat === "gif" && frames.length > 1) downloadGif();
    else downloadPng();
  }, [outputFormat, frames.length, downloadGif, downloadPng]);

  // ---- Save ----

  const { data: session } = authClient.useSession();
  const createEmoji = api.emoji.create.useMutation();

  const handleSave = () => {
    if (!session?.user) {
      authClient.signIn.social({ provider: "google" });
      return;
    }
    setShowSaveForm(true);
  };

  const handleSaveSubmit = async () => {
    if (!saveName.trim()) return;
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
    createEmoji.mutate(
      {
        name: saveName.trim(),
        editorType: "PIXEL",
        imageData,
        isPublic: savePublic,
        pixelData: frames[currentFrame],
        pixelCanvasSize: size,
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

  const labelStyle = "text-xs font-medium text-muted-foreground uppercase tracking-wide";
  const isShapeTool = SHAPE_TOOLS.includes(activeTool);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>ピクセルエディター</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Canvas size */}
            <div className="space-y-1.5">
              <Label className={labelStyle}>キャンバスサイズ</Label>
              <Select value={canvasSize} onValueChange={handleCanvasSizeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16">16×16</SelectItem>
                  <SelectItem value="32">32×32</SelectItem>
                  <SelectItem value="64">64×64</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <Label className={labelStyle}>ツール</Label>
              <div className="flex flex-wrap gap-1">
                {TOOL_DEFS.map(({ tool, label, icon }) => (
                  <Button
                    key={tool}
                    variant={activeTool === tool ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTool(tool)}
                    title={label}
                    className="px-2.5"
                  >
                    {icon}
                  </Button>
                ))}
              </div>
              {isShapeTool && (
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={isFilled} onCheckedChange={setIsFilled} id="fill-toggle" />
                  <Label htmlFor="fill-toggle" className="text-sm cursor-pointer">塗りつぶし</Label>
                </div>
              )}
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className={labelStyle}>カラー</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setActiveTool((t) => (t === "eraser" ? "pencil" : t));
                      setDrawColor(color);
                      setCustomColor(color);
                    }}
                    className={`h-7 w-7 rounded border-2 transition ${
                      drawColor === color && activeTool !== "eraser"
                        ? "border-gray-900 scale-110"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
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
                  className="h-9 w-10 cursor-pointer rounded border flex-shrink-0"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setDrawColor(e.target.value);
                  }}
                  className="flex-1 rounded-md border px-3 py-2 text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Edit actions */}
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant="outline" size="sm" onClick={undo}
                disabled={historyIndex <= 0} title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm" onClick={redo}
                disabled={historyIndex >= history.length - 1} title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={clearCanvas}>クリア</Button>
            </div>

            {/* Animation frames */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className={labelStyle}>アニメーション</Label>
                <span className="text-xs text-muted-foreground">
                  フレーム {currentFrame + 1} / {frames.length}
                </span>
              </div>

              <div className="flex gap-1.5">
                <Button
                  variant="outline" size="sm" onClick={addFrame}
                  disabled={frames.length >= MAX_FRAMES} className="flex-1 text-xs"
                >
                  + フレーム追加
                </Button>
                <Button
                  variant="outline" size="sm" onClick={deleteFrame}
                  disabled={frames.length <= 1} className="flex-1 text-xs"
                >
                  − 削除
                </Button>
              </div>

              {frames.length > 1 && (
                <>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm" className="px-2"
                      onClick={() => setCurrentFrame((f) => Math.max(0, f - 1))}
                      disabled={currentFrame === 0}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex gap-1 flex-1 justify-center flex-wrap">
                      {frameIds.map((fid, i) => (
                        <button
                          key={fid}
                          type="button"
                          onClick={() => setCurrentFrame(i)}
                          className={`min-w-[1.75rem] h-7 text-xs rounded border font-medium transition ${
                            currentFrame === i
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-gray-200 hover:border-gray-400 bg-background"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline" size="sm" className="px-2"
                      onClick={() => setCurrentFrame((f) => Math.min(frames.length - 1, f + 1))}
                      disabled={currentFrame === frames.length - 1}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Button
                    variant={isPlaying ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="w-full"
                  >
                    {isPlaying
                      ? <Pause className="h-4 w-4 mr-1.5" />
                      : <Play  className="h-4 w-4 mr-1.5" />
                    }
                    {isPlaying ? "停止" : "再生プレビュー"}
                  </Button>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>速度</span>
                      <span>{frameDelay}ms / frame</span>
                    </div>
                    <input
                      type="range" min={50} max={1000} step={50}
                      value={frameDelay}
                      onChange={(e) => setFrameDelay(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Download */}
            <div className="space-y-2">
              <Label className={labelStyle}>ダウンロード</Label>
              {frames.length > 1 && (
                <div className="flex gap-1.5">
                  {(["png", "gif"] as const).map((fmt) => (
                    <Button
                      key={fmt}
                      variant={outputFormat === fmt ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOutputFormat(fmt)}
                      className="flex-1"
                    >
                      {fmt.toUpperCase()}
                    </Button>
                  ))}
                </div>
              )}
              <Button onClick={handleDownload} className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" />
                {frames.length > 1 ? outputFormat.toUpperCase() : "PNG"} ダウンロード
              </Button>
            </div>

            {/* Save */}
            <Button onClick={handleSave} variant="outline" className="w-full" size="lg">
              <Save className="mr-2 h-4 w-4" />
              マイ絵文字に保存
            </Button>

            {showSaveForm && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
                <div className="space-y-1.5">
                  <Label>名前</Label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="emoji_name"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    maxLength={50}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>公開</Label>
                  <Switch checked={savePublic} onCheckedChange={setSavePublic} />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveSubmit}
                    disabled={!saveName.trim() || createEmoji.isPending || isSavingGif}
                    className="flex-1"
                  >
                    {isSavingGif ? "GIF生成中..." : createEmoji.isPending ? "保存中..." : "保存"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowSaveForm(false)}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Canvas preview */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              プレビュー
              {frames.length > 1 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — フレーム {currentFrame + 1} / {frames.length}
                  {isPlaying && " ▶"}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 p-8">
              <div
                className="rounded-lg border bg-gray-100 p-4 overflow-auto max-w-full"
                style={{ maxHeight: "min(70vh, 512px)" }}
              >
                <canvas
                  ref={canvasRef}
                  width={FIXED_DISPLAY_SIZE}
                  height={FIXED_DISPLAY_SIZE}
                  className={`block touch-none select-none ${isPlaying ? "cursor-default" : "cursor-crosshair"}`}
                  style={{ width: FIXED_DISPLAY_SIZE, height: FIXED_DISPLAY_SIZE, imageRendering: "pixelated" }}
                  onPointerDown={isPlaying ? undefined : handlePointerDown}
                  onPointerMove={isPlaying ? undefined : handlePointerMove}
                  onPointerUp={isPlaying ? undefined : handlePointerUpOrLeave}
                  onPointerLeave={isPlaying ? undefined : handlePointerUpOrLeave}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {size}×{size}
                {frames.length > 1
                  ? ` · ${frames.length}フレーム · ${outputFormat.toUpperCase()}で書き出し（128×128）`
                  : "（Slack用に128×128で書き出し）"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
