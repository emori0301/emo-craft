"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface LoginDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onLogin: () => void;
}

/** 保存時に未ログインだった場合の説明ダイアログ（作業内容は退避される） */
export function LoginDialog({ open, onOpenChange, onLogin }: LoginDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>保存にはログインが必要です</DialogTitle>
					<DialogDescription>
						Google アカウントでログインすると絵文字を保存・管理できます。
						編集中の内容は保存され、ログイン後に復元できます。
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						キャンセル
					</Button>
					<Button onClick={onLogin}>Googleでログインして続ける</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
