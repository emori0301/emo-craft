"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PixelEditor } from "@/components/editor/pixel-editor";
import { TextEditor } from "@/components/editor/text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findTemplate } from "@/lib/templates";
import { api } from "@/lib/trpc/react";

function EditorContent() {
	const searchParams = useSearchParams();
	const editId = searchParams.get("edit");
	const presetId = searchParams.get("preset");
	const preset = presetId ? findTemplate(presetId) : undefined;

	const { data: editEmoji, isLoading: isEditLoading } =
		api.emoji.getById.useQuery({ id: editId ?? "" }, { enabled: !!editId });

	const [activeTab, setActiveTab] = useState<"text" | "pixel">("text");

	useEffect(() => {
		if (editEmoji?.editorType === "PIXEL") setActiveTab("pixel");
		else if (editEmoji?.editorType === "TEXT") setActiveTab("text");
	}, [editEmoji?.editorType]);

	const textInitial =
		editEmoji?.editorType === "TEXT"
			? {
					text: editEmoji.text ?? undefined,
					fontFamily: editEmoji.fontFamily ?? undefined,
					fontWeight: editEmoji.fontWeight
						? String(editEmoji.fontWeight)
						: undefined,
					textColor: editEmoji.textColor ?? undefined,
					backgroundColor: editEmoji.backgroundColor ?? undefined,
				}
			: preset
				? {
						text: preset.text,
						fontFamily: preset.fontFamily,
						fontWeight: preset.fontWeight,
						textColor: preset.textColor,
						backgroundColor: preset.backgroundColor,
					}
				: undefined;

	const pixelInitial =
		editEmoji?.editorType === "PIXEL"
			? {
					pixelData: editEmoji.pixelData as string[][] | undefined,
					pixelCanvasSize: editEmoji.pixelCanvasSize ?? undefined,
				}
			: undefined;

	return (
		<div className="min-h-[calc(100vh-64px)] py-6 sm:py-8 px-4">
			<div className="container mx-auto max-w-7xl">
				<div className="mb-6">
					<h1 className="text-3xl sm:text-4xl font-bold mb-1">
						{editId ? "絵文字を編集" : "エディター"}
					</h1>
				</div>

				{editId && isEditLoading ? (
					// 編集対象の読み込み中はデフォルト値のエディターを一瞬見せない
					<div className="space-y-6" aria-busy="true">
						<div className="h-10 w-full max-w-sm rounded-md bg-muted animate-pulse" />
						<div className="grid gap-6 lg:grid-cols-3">
							<div className="h-96 rounded-xl bg-muted animate-pulse" />
							<div className="h-96 rounded-xl bg-muted animate-pulse lg:col-span-2" />
						</div>
					</div>
				) : (
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as "text" | "pixel")}
						className="w-full"
					>
						<TabsList className="grid w-full max-w-sm grid-cols-2 mb-6">
							<TabsTrigger value="text">テキスト</TabsTrigger>
							<TabsTrigger value="pixel">ピクセル</TabsTrigger>
						</TabsList>
						{/* forceMount + hidden で両エディタをマウントしたままにし、
						    タブを行き来しても編集中の内容が消えないようにする */}
						<TabsContent
							value="text"
							forceMount
							className="data-[state=inactive]:hidden"
						>
							<TextEditor
								key={editId ?? presetId ?? "new"}
								initialValues={textInitial}
								active={activeTab === "text"}
							/>
						</TabsContent>
						<TabsContent
							value="pixel"
							forceMount
							className="data-[state=inactive]:hidden"
						>
							<PixelEditor
								key={editId ?? "new"}
								initialValues={pixelInitial}
								active={activeTab === "pixel"}
							/>
						</TabsContent>
					</Tabs>
				)}
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
