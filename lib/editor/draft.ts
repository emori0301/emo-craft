import type { ImageLayer, Transform } from "./layers";
import type { AnimType, TextAlign } from "./text-config";

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
	/** 以下は後から追加したフィールド（古い下書きには無い） */
	textAlign?: TextAlign;
	animationType?: AnimType | null;
	animateImages?: boolean;
	textTransform?: Transform;
	layers?: ImageLayer[];
	/** 容量超過で画像を外して保存した */
	imagesDropped?: boolean;
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

function writeDraft(draft: EditorDraft): boolean {
	try {
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
		return true;
	} catch {
		return false;
	}
}

/**
 * 下書きを保存する。画像入りで容量上限（数 MB）を超えた場合は画像を外して再試行する。
 * localStorage が使えない環境では黙って諦める。
 */
export function saveDraft(draft: EditorDraft): void {
	if (writeDraft(draft)) return;
	if (draft.type === "TEXT" && draft.layers?.length) {
		writeDraft({ ...draft, layers: [], imagesDropped: true });
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
