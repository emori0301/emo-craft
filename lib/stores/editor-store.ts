import { create } from "zustand";

export type EditorMode = "normal" | "fancy" | "retro" | "space";

interface EditorModeStore {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
}

export const useEditorStore = create<EditorModeStore>((set) => ({
  mode: "normal",
  setMode: (mode) => set({ mode }),
}));

