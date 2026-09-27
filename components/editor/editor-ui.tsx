"use client";

import { Download, Loader2, Save } from "lucide-react";
import { LoginDialog } from "@/components/editor/login-dialog";
import { SaveEmojiForm } from "@/components/editor/save-emoji-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { useSaveEmoji } from "@/hooks/use-save-emoji";
import { cn } from "@/lib/utils";

/** テキスト / ピクセル両エディター共通の小さな UI 部品 */

/** 透明背景を示す市松模様 */
export const CHECKER_STYLE: React.CSSProperties = {
	backgroundImage:
		"linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%), linear-gradient(45deg, #d1d5db 25%, transparent 25%, transparent 75%, #d1d5db 75%)",
	backgroundSize: "16px 16px",
	backgroundPosition: "0 0, 8px 8px",
	backgroundColor: "#f9fafb",
};

export const CHECKER_SMALL_STYLE: React.CSSProperties = {
	...CHECKER_STYLE,
	backgroundSize: "8px 8px",
	backgroundPosition: "0 0, 4px 4px",
};

/** 色のプリセットパレット */
export const COLOR_PRESETS = [
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

/** セクション見出し */
export function SectionLabel({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<h3
			className={cn(
				"text-xs font-semibold uppercase tracking-widest text-muted-foreground",
				className,
			)}
		>
			{children}
		</h3>
	);
}

/** 2〜3択の切り替えボタン */
export function SegmentedControl<T extends string>({
	value,
	onChange,
	options,
	ariaLabel,
	className,
}: {
	value: T;
	onChange: (value: T) => void;
	options: readonly (readonly [T, React.ReactNode])[];
	ariaLabel?: string;
	className?: string;
}) {
	return (
		<fieldset
			aria-label={ariaLabel}
			className={cn("inline-flex min-w-0 rounded-lg border p-0.5", className)}
		>
			{options.map(([key, label]) => (
				<button
					key={key}
					type="button"
					onClick={() => onChange(key)}
					aria-pressed={value === key}
					className={cn(
						"inline-flex min-h-8 items-center justify-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition",
						value === key
							? "bg-primary text-primary-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{label}
				</button>
			))}
		</fieldset>
	);
}

/** 色スウォッチ（パレット + カスタム + 任意で透明チップ） */
export function ColorPicker({
	value,
	onChange,
	allowTransparent = false,
	label,
	colors = COLOR_PRESETS,
}: {
	value: string;
	onChange: (color: string) => void;
	allowTransparent?: boolean;
	label: string;
	colors?: string[];
}) {
	const isCustom = !!value && !colors.includes(value);
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
						"h-9 w-9 rounded-md border-2 transition sm:h-8 sm:w-8",
						value === ""
							? "border-primary ring-2 ring-primary/30"
							: "border-border hover:border-muted-foreground/60",
					)}
					style={CHECKER_SMALL_STYLE}
				/>
			)}
			{colors.map((color) => (
				<button
					key={color}
					type="button"
					onClick={() => onChange(color)}
					aria-label={`${label}を ${color} にする`}
					aria-pressed={value === color}
					className={cn(
						"h-9 w-9 rounded-md border-2 transition sm:h-8 sm:w-8",
						value === color
							? "border-primary ring-2 ring-primary/30 scale-110"
							: "border-border hover:border-muted-foreground/60",
					)}
					style={{ backgroundColor: color }}
				/>
			))}
			<label
				className={cn(
					"relative h-9 w-9 cursor-pointer overflow-hidden rounded-md border-2 transition sm:h-8 sm:w-8",
					isCustom
						? "border-primary ring-2 ring-primary/30 scale-110"
						: "border-dashed border-border hover:border-muted-foreground/60",
				)}
				title="カスタムカラー"
			>
				<span
					className="absolute inset-0"
					style={{
						background: isCustom
							? value
							: "conic-gradient(#ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)",
					}}
				/>
				<input
					type="color"
					value={value || "#ffffff"}
					onChange={(e) => onChange(e.target.value)}
					aria-label={`${label}をカスタムカラーで選択`}
					className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
				/>
			</label>
		</div>
	);
}

/** ログイン往復後の下書き復元バナー */
export function DraftBanner({
	onRestore,
	onDiscard,
}: {
	onRestore: () => void;
	onDiscard: () => void;
}) {
	return (
		<div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
			<p className="text-sm">ログイン前の編集内容があります。復元しますか？</p>
			<div className="flex gap-2">
				<Button size="sm" onClick={onRestore}>
					復元する
				</Button>
				<Button size="sm" variant="ghost" onClick={onDiscard}>
					破棄
				</Button>
			</div>
		</div>
	);
}

/**
 * 画面下部に固定する操作バー（ダウンロード / 保存）。
 * iPhone のホームインジケーターに被らないよう safe-area 分の余白を取る。
 */
export function EditorActionBar({
	leading,
	downloadLabel,
	onDownload,
	isBusy,
	onSave,
}: {
	leading?: React.ReactNode;
	downloadLabel: string;
	onDownload: () => void;
	isBusy: boolean;
	onSave: () => void;
}) {
	return (
		<div className="sticky bottom-0 z-40 mt-6 -mx-4 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-1px_3px_rgba(0,0,0,0.04)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
			<div className="flex items-center justify-end gap-2">
				{leading && (
					<div className="mr-auto flex min-w-0 items-center gap-1.5">
						{leading}
					</div>
				)}
				<Button
					onClick={onDownload}
					size="lg"
					disabled={isBusy}
					className="flex-1 px-4 sm:flex-none sm:px-8"
				>
					{isBusy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Download className="h-4 w-4" />
					)}
					{isBusy ? "生成中..." : downloadLabel}
				</Button>
				<Button
					onClick={onSave}
					variant="outline"
					size="lg"
					className="flex-1 px-4 sm:flex-none sm:px-8"
				>
					<Save className="h-4 w-4" />
					保存
				</Button>
			</div>
		</div>
	);
}

/** 保存ダイアログ + 未ログイン時のログインダイアログ */
export function SaveDialogs({
	save,
	onSubmit,
	busyLabel,
}: {
	save: ReturnType<typeof useSaveEmoji>;
	onSubmit: () => void;
	busyLabel?: string;
}) {
	return (
		<>
			<Dialog open={save.showSaveForm} onOpenChange={save.setShowSaveForm}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>マイ絵文字に保存</DialogTitle>
					</DialogHeader>
					<SaveEmojiForm
						saveName={save.saveName}
						onSaveNameChange={save.setSaveName}
						savePublic={save.savePublic}
						onSavePublicChange={save.setSavePublic}
						onSubmit={onSubmit}
						onCancel={() => save.setShowSaveForm(false)}
						isSaving={save.isSaving}
						busyLabel={busyLabel}
					/>
				</DialogContent>
			</Dialog>
			<LoginDialog
				open={save.showLoginDialog}
				onOpenChange={save.setShowLoginDialog}
				onLogin={save.loginAndContinue}
			/>
		</>
	);
}

/** 入力欄にフォーカスがあるか（1文字ショートカットの誤爆防止） */
export function isTypingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}
