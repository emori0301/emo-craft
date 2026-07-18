"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SaveEmojiFormProps {
	saveName: string;
	onSaveNameChange: (name: string) => void;
	savePublic: boolean;
	onSavePublicChange: (isPublic: boolean) => void;
	onSubmit: () => void;
	onCancel: () => void;
	isSaving: boolean;
	/** 保存中よりさらに前段の処理中表示（GIF 生成中など） */
	busyLabel?: string;
	labelClassName?: string;
	inputClassName?: string;
}

/** テキスト/ピクセル両エディター共通の保存フォーム */
export function SaveEmojiForm({
	saveName,
	onSaveNameChange,
	savePublic,
	onSavePublicChange,
	onSubmit,
	onCancel,
	isSaving,
	busyLabel,
	labelClassName,
	inputClassName,
}: SaveEmojiFormProps) {
	return (
		<div className="space-y-3 p-3 rounded-lg border bg-muted/50">
			<div className="space-y-1.5">
				<Label htmlFor="save-emoji-name" className={labelClassName}>
					名前
				</Label>
				<input
					id="save-emoji-name"
					type="text"
					value={saveName}
					onChange={(e) => onSaveNameChange(e.target.value)}
					placeholder="emoji_name"
					className={cn(
						"w-full rounded-md border px-3 py-2 text-sm bg-background",
						inputClassName,
					)}
					maxLength={50}
				/>
			</div>
			<div className="flex items-center justify-between">
				<Label htmlFor="save-emoji-public" className={labelClassName}>
					公開
				</Label>
				<Switch
					id="save-emoji-public"
					checked={savePublic}
					onCheckedChange={onSavePublicChange}
				/>
			</div>
			<div className="flex gap-2">
				<Button
					onClick={onSubmit}
					disabled={!saveName.trim() || isSaving || !!busyLabel}
					className="flex-1"
				>
					{busyLabel ?? (isSaving ? "保存中..." : "保存")}
				</Button>
				<Button variant="ghost" onClick={onCancel}>
					キャンセル
				</Button>
			</div>
		</div>
	);
}
