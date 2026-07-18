"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { clearDraft, type EditorDraft, saveDraft } from "@/lib/editor/draft";
import { api } from "@/lib/trpc/react";

type EmojiCreateInput = Parameters<
	ReturnType<typeof api.emoji.create.useMutation>["mutate"]
>[0];

export type SaveEmojiPayload = Omit<EmojiCreateInput, "name" | "isPublic">;

export type UseSaveEmojiOptions = {
	/** ログイン前に退避する下書きを収集する（未指定なら退避しない） */
	collectDraft?: () => EditorDraft;
};

/**
 * 絵文字保存フローの共通フック。
 * 認証ゲート（ログインダイアログ + 下書き退避）・保存フォームの状態・
 * 作成 mutation とトースト通知をまとめる。
 */
export function useSaveEmoji(options: UseSaveEmojiOptions = {}) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const createEmoji = api.emoji.create.useMutation();
	const [saveName, setSaveName] = useState("");
	const [savePublic, setSavePublic] = useState(false);
	const [showSaveForm, setShowSaveForm] = useState(false);
	const [showLoginDialog, setShowLoginDialog] = useState(false);

	/** 保存ボタン押下: 未ログインなら説明ダイアログ、ログイン済みならフォームを開く */
	const openSaveForm = () => {
		if (!session?.user) {
			setShowLoginDialog(true);
			return;
		}
		setShowSaveForm(true);
	};

	/** ログインダイアログの「ログインして続ける」: 下書きを退避してから OAuth へ */
	const loginAndContinue = () => {
		const draft = options.collectDraft?.();
		if (draft) saveDraft(draft);
		authClient.signIn.social({ provider: "google", callbackURL: "/editor" });
	};

	/** フォーム送信: 画像データ + エディタ固有フィールドを渡す */
	const submitSave = (payload: SaveEmojiPayload) => {
		if (!saveName.trim()) return;
		createEmoji.mutate(
			{ ...payload, name: saveName.trim(), isPublic: savePublic },
			{
				onSuccess: () => {
					setShowSaveForm(false);
					setSaveName("");
					clearDraft();
					toast.success("保存しました 🎉");
					router.push("/my-emojis");
				},
				onError: (error) => {
					toast.error(`保存に失敗しました: ${error.message}`);
				},
			},
		);
	};

	return {
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
		isSaving: createEmoji.isPending,
	};
}
