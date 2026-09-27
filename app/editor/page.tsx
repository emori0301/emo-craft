"use client";

import { Grid3X3, Type } from "lucide-react";
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
		<div className="min-h-[calc(100dvh-64px)] px-4 pt-4 sm:pt-8">
			<div className="container mx-auto max-w-7xl">
				<h1 className="sr-only">{editId ? "絵文字を編集" : "エディター"}</h1>

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
						<div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
							<TabsList className="grid w-full max-w-sm grid-cols-2">
								<TabsTrigger value="text" className="gap-1.5">
									<Type className="h-4 w-4" />
									テキスト・画像
								</TabsTrigger>
								<TabsTrigger value="pixel" className="gap-1.5">
									<Grid3X3 className="h-4 w-4" />
									ドット絵
								</TabsTrigger>
							</TabsList>
							{editId && (
								<p className="text-sm text-muted-foreground">
									保存済みの絵文字を編集中（文字の設定のみ復元されます。保存すると新しい絵文字として追加されます）
								</p>
							)}
						</div>
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
