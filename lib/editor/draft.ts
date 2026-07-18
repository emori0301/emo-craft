/**
 * ログイン前の編集内容を localStorage に退避する仕組み。
 * 保存にはログインが必要で、OAuth リダイレクトでエディターの状態が失われるため、
 * ログイン直前に下書きを保存し、戻ってきたときに復元を提案する。
 */

export type TextEditorDraft = {
	type: "TEXT";
	text: string;
	fontWeight: string;
	fontFamily: string;
	textColor: string;
	backgroundColor: string;
	savedAt: number;
};

export type PixelEditorDraft = {
	type: "PIXEL";
	frames: string[][][];
	canvasSize: number;
	frameDelay: number;
	savedAt: number;
};

export type EditorDraft = TextEditorDraft | PixelEditorDraft;

const DRAFT_KEY = "emocraft:editor-draft";
/** 下書きの有効期限（1時間） */
const DRAFT_TTL_MS = 60 * 60 * 1000;

export function saveDraft(draft: EditorDraft): void {
	try {
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	} catch {
		// localStorage が使えない環境では黙って諦める
	}
}

export function loadDraft(): EditorDraft | null {
	try {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const draft = JSON.parse(raw) as EditorDraft;
		if (
			(draft.type !== "TEXT" && draft.type !== "PIXEL") ||
			typeof draft.savedAt !== "number" ||
			Date.now() - draft.savedAt > DRAFT_TTL_MS
		) {
			clearDraft();
			return null;
		}
		return draft;
	} catch {
		return null;
	}
}

export function clearDraft(): void {
	try {
		localStorage.removeItem(DRAFT_KEY);
	} catch {
		// noop
	}
}
