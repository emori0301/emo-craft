"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PixelEditor } from "@/components/editor/pixel-editor";
import { TextEditor } from "@/components/editor/text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type EditorMode, useEditorStore } from "@/lib/stores/editor-store";
import { cn } from "@/lib/utils";
import { api } from "@/lib/trpc/react";

const MODES: { id: EditorMode; label: string }[] = [
	{ id: "normal", label: "ノーマル" },
	{ id: "fancy", label: "ファンシー" },
	{ id: "retro", label: "レトロ" },
	{ id: "space", label: "スペース" },
];

const MODE_PAGE_STYLES: Record<EditorMode, string> = {
	normal: "bg-background",
	fancy: "bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50",
	retro: "bg-[#071407] text-green-300",
	space: "bg-[#020817] text-blue-100",
};

const MODE_UI_FONTS: Record<EditorMode, string> = {
	normal: "",
	fancy: "font-['Pacifico']",
	retro: "font-['DotGothic16']",
	space: "font-['Zen Kaku Gothic New']",
};

const MODE_BUTTON_STYLES: Record<EditorMode, { base: string; active: string }> =
	{
		normal: {
			base: "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50",
			active: "border-gray-600 bg-gray-100 text-gray-900 font-semibold",
		},
		fancy: {
			base: "border-pink-200 text-pink-600 hover:border-pink-400 hover:bg-pink-50",
			active:
				"border-pink-500 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 font-semibold",
		},
		retro: {
			base: "border-green-800 text-green-500 hover:border-green-500 hover:bg-green-900/30",
			active:
				"border-green-400 bg-green-900/50 text-green-200 font-semibold shadow-[0_0_6px_rgba(74,222,128,0.4)]",
		},
		space: {
			base: "border-blue-800 text-blue-500 hover:border-blue-500 hover:bg-blue-900/20",
			active:
				"border-blue-400 bg-blue-900/40 text-blue-200 font-semibold shadow-[0_0_8px_rgba(56,189,248,0.5)]",
		},
	};

const TAB_STYLES: Record<
	EditorMode,
	{ list: string; trigger: string; triggerActive: string }
> = {
	normal: {
		list: "bg-muted",
		trigger:
			"data-[state=active]:bg-background data-[state=active]:text-foreground",
		triggerActive: "",
	},
	fancy: {
		list: "bg-pink-100/80 border border-pink-200",
		trigger:
			"text-pink-700 data-[state=active]:bg-white data-[state=active]:text-pink-900 data-[state=active]:shadow-sm",
		triggerActive: "",
	},
	retro: {
		list: "bg-green-900/30 border border-green-800",
		trigger:
			"text-green-500 data-[state=active]:bg-green-900/50 data-[state=active]:text-green-200 data-[state=active]:shadow-[0_0_6px_rgba(74,222,128,0.3)]",
		triggerActive: "",
	},
	space: {
		list: "bg-blue-950/50 border border-blue-900",
		trigger:
			"text-blue-400 data-[state=active]:bg-blue-900/40 data-[state=active]:text-blue-100 data-[state=active]:shadow-[0_0_8px_rgba(56,189,248,0.3)]",
		triggerActive: "",
	},
};

function EditorContent() {
	const { mode, setMode } = useEditorStore();
	const searchParams = useSearchParams();
	const editId = searchParams.get("edit");

	const { data: editEmoji } = api.emoji.getById.useQuery(
		{ id: editId ?? "" },
		{ enabled: !!editId }
	);

	const [activeTab, setActiveTab] = useState<"text" | "pixel">("text");

	useEffect(() => {
		if (editEmoji?.editorType === "PIXEL") setActiveTab("pixel");
		else if (editEmoji?.editorType === "TEXT") setActiveTab("text");
	}, [editEmoji?.editorType]);

	const textInitial = editEmoji?.editorType === "TEXT" ? {
		text: editEmoji.text ?? undefined,
		fontFamily: editEmoji.fontFamily ?? undefined,
		fontWeight: editEmoji.fontSize ? String(editEmoji.fontSize) : undefined,
		textColor: editEmoji.textColor ?? undefined,
		backgroundColor: editEmoji.backgroundColor ?? undefined,
	} : undefined;

	const pixelInitial = editEmoji?.editorType === "PIXEL" ? {
		pixelData: editEmoji.pixelData as string[][] | undefined,
		pixelCanvasSize: editEmoji.pixelCanvasSize ?? undefined,
	} : undefined;

	return (
		<div
			className={cn(
				"min-h-[calc(100vh-64px)] transition-all duration-500 py-6 sm:py-8 px-4",
				MODE_PAGE_STYLES[mode],
				MODE_UI_FONTS[mode],
			)}
		>
			<div className="container mx-auto max-w-7xl">
				<div className="mb-6">
					<h1 className="text-3xl sm:text-4xl font-bold mb-1">
						{editId ? "絵文字を編集" : "エディター"}
					</h1>
				</div>

				<div className="mb-6">
					<p
						className={cn(
							"text-xs mb-2 font-semibold uppercase tracking-widest",
							mode === "retro"
								? "text-green-600"
								: mode === "space"
									? "text-blue-700"
									: "text-muted-foreground",
						)}
					>
						テーマ
					</p>
					<div className="flex flex-wrap gap-2">
						{MODES.map((m) => (
							<button
								key={m.id}
								type="button"
								onClick={() => setMode(m.id)}
								className={cn(
									"px-4 py-2 rounded-lg border text-sm transition-all duration-200",
									MODE_BUTTON_STYLES[m.id].base,
									mode === m.id && MODE_BUTTON_STYLES[m.id].active,
								)}
							>
								{m.label}
							</button>
						))}
					</div>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as "text" | "pixel")}
					className="w-full"
				>
					<TabsList
						className={cn(
							"grid w-full max-w-sm grid-cols-2 mb-6",
							TAB_STYLES[mode].list,
						)}
					>
						<TabsTrigger value="text" className={TAB_STYLES[mode].trigger}>
							テキスト
						</TabsTrigger>
						<TabsTrigger value="pixel" className={TAB_STYLES[mode].trigger}>
							ピクセル
						</TabsTrigger>
					</TabsList>
					<TabsContent value="text">
						<TextEditor mode={mode} initialValues={textInitial} />
					</TabsContent>
					<TabsContent value="pixel">
						<PixelEditor initialValues={pixelInitial} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

export default function EditorPage() {
	return (
		<Suspense>
			<EditorContent />
		</Suspense>
	);
}
