import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * 一意な ID を生成する。crypto.randomUUID は安全なコンテキスト（https / localhost）
 * でしか使えないため、LAN 内の http で実機確認する場合に備えてフォールバックする。
 */
export function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		try {
			return crypto.randomUUID();
		} catch {
			// 非セキュアコンテキストでは例外になる
		}
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
