"use client";

import { type RefObject, useCallback, useEffect, useRef } from "react";
import {
	clamp,
	constrainPosition,
	hitTest,
	normalizeRotation,
	type Transform,
	visibleHandlePosition,
} from "@/lib/editor/layers";

type Target = Transform & { aspect?: number };
type Point = { x: number; y: number };

type Gesture =
	| { kind: "drag"; id: string; start: Point; origin: Target }
	| { kind: "handle"; id: string; dist: number; angle: number; origin: Target }
	| {
			kind: "pinch";
			id: string;
			dist: number;
			angle: number;
			mid: Point;
			origin: Target;
	  };

export type CanvasGestureOptions = {
	canvasRef: RefObject<HTMLCanvasElement | null>;
	/** キャンバスの内部解像度（px） */
	size: number;
	selectedId: string | null;
	getTarget: (id: string) => Target | null;
	findAt: (x: number, y: number) => string | null;
	getScaleLimits: (id: string) => { min: number; max: number };
	onSelect: (id: string | null) => void;
	onTransform: (id: string, next: Partial<Transform>) => void;
	/** ドラッグ / ピンチ中かどうか（アニメーションの一時停止などに使う） */
	onInteractionChange?: (active: boolean) => void;
};

/** ハンドルのタッチ判定半径（CSS px） */
export const HANDLE_HIT_RADIUS = 22;
/** ハンドルをキャンバスの縁から離す距離（CSS px） */
export const HANDLE_MARGIN = 10;
/** 回転を 0° / 90° 刻みに吸着させる範囲（度） */
const ROTATION_SNAP = 4;

function snapRotation(deg: number): number {
	const nearest = Math.round(deg / 90) * 90;
	return Math.abs(deg - nearest) <= ROTATION_SNAP
		? normalizeRotation(nearest)
		: normalizeRotation(deg);
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const angleDeg = (from: Point, to: Point) =>
	(Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

/**
 * キャンバス上の要素をマウス / タッチで動かすためのジェスチャー処理。
 * - 1本指 / ドラッグ: 移動
 * - 右下ハンドルのドラッグ: 拡大縮小 + 回転
 * - 2本指ピンチ: 拡大縮小 + 回転 + 移動
 * - ホイール（トラックパッドのピンチ含む）: 拡大縮小、Shift+ホイールで回転
 */
export function useCanvasGestures(options: CanvasGestureOptions) {
	// ハンドラを安定させるため、最新のオプションは ref 経由で参照する
	const optsRef = useRef(options);
	optsRef.current = options;

	const pointers = useRef(new Map<number, Point>());
	const gesture = useRef<Gesture | null>(null);

	const toCanvas = useCallback((e: { clientX: number; clientY: number }) => {
		const canvas = optsRef.current.canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		const { size } = optsRef.current;
		return {
			x: ((e.clientX - rect.left) / rect.width) * size,
			y: ((e.clientY - rect.top) / rect.height) * size,
		};
	}, []);

	/** CSS px をキャンバス内部 px に換算する倍率 */
	const pxRatio = useCallback(() => {
		const canvas = optsRef.current.canvasRef.current;
		const width = canvas?.getBoundingClientRect().width || 1;
		return optsRef.current.size / width;
	}, []);

	const isOnHandle = useCallback(
		(p: Point): boolean => {
			const { selectedId, getTarget, size } = optsRef.current;
			if (!selectedId) return false;
			const target = getTarget(selectedId);
			if (!target) return false;
			const ratio = pxRatio();
			return (
				distance(
					p,
					visibleHandlePosition(target, size, HANDLE_MARGIN * ratio),
				) <=
				HANDLE_HIT_RADIUS * ratio
			);
		},
		[pxRatio],
	);

	const setInteracting = useCallback((active: boolean) => {
		optsRef.current.onInteractionChange?.(active);
	}, []);

	const startDrag = useCallback((id: string, p: Point) => {
		const origin = optsRef.current.getTarget(id);
		gesture.current = origin ? { kind: "drag", id, start: p, origin } : null;
	}, []);

	const startPinch = useCallback((id: string) => {
		const origin = optsRef.current.getTarget(id);
		const [a, b] = [...pointers.current.values()];
		if (!origin || !a || !b) return;
		gesture.current = {
			kind: "pinch",
			id,
			dist: Math.max(1, distance(a, b)),
			angle: angleDeg(a, b),
			mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
			origin,
		};
	}, []);

	const onPointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (e.pointerType === "mouse" && e.button !== 0) return;
			e.preventDefault();
			e.currentTarget.setPointerCapture(e.pointerId);
			const p = toCanvas(e);
			pointers.current.set(e.pointerId, p);
			const opts = optsRef.current;

			if (pointers.current.size === 1) {
				if (opts.selectedId && isOnHandle(p)) {
					const origin = opts.getTarget(opts.selectedId);
					if (origin) {
						const center = { x: origin.x * opts.size, y: origin.y * opts.size };
						gesture.current = {
							kind: "handle",
							id: opts.selectedId,
							dist: Math.max(1, distance(center, p)),
							angle: angleDeg(center, p),
							origin,
						};
						setInteracting(true);
						return;
					}
				}
				const hit = opts.findAt(p.x, p.y);
				opts.onSelect(hit);
				if (hit) {
					startDrag(hit, p);
					setInteracting(true);
				} else {
					gesture.current = null;
				}
			} else if (pointers.current.size === 2) {
				const id = gesture.current?.id ?? opts.selectedId;
				if (id) {
					startPinch(id);
					setInteracting(true);
				}
			}
		},
		[toCanvas, isOnHandle, startDrag, startPinch, setInteracting],
	);

	const onPointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			const p = toCanvas(e);
			const canvas = e.currentTarget;
			const opts = optsRef.current;

			if (!pointers.current.has(e.pointerId)) {
				// ホバー中はカーソルで操作できることを示す
				if (e.pointerType === "mouse") {
					canvas.style.cursor = isOnHandle(p)
						? "nwse-resize"
						: opts.findAt(p.x, p.y)
							? "move"
							: "default";
				}
				return;
			}
			pointers.current.set(e.pointerId, p);

			const g = gesture.current;
			if (!g) return;
			const { size } = opts;
			const limits = opts.getScaleLimits(g.id);

			if (g.kind === "drag") {
				opts.onTransform(
					g.id,
					constrainPosition(
						g.origin.x + (p.x - g.start.x) / size,
						g.origin.y + (p.y - g.start.y) / size,
						!e.shiftKey,
					),
				);
			} else if (g.kind === "handle") {
				const center = { x: g.origin.x * size, y: g.origin.y * size };
				opts.onTransform(g.id, {
					scale: clamp(
						(g.origin.scale * distance(center, p)) / g.dist,
						limits.min,
						limits.max,
					),
					rotation: snapRotation(
						g.origin.rotation + angleDeg(center, p) - g.angle,
					),
				});
			} else if (g.kind === "pinch" && pointers.current.size >= 2) {
				const [a, b] = [...pointers.current.values()];
				const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
				opts.onTransform(g.id, {
					scale: clamp(
						(g.origin.scale * distance(a, b)) / g.dist,
						limits.min,
						limits.max,
					),
					rotation: snapRotation(g.origin.rotation + angleDeg(a, b) - g.angle),
					...constrainPosition(
						g.origin.x + (mid.x - g.mid.x) / size,
						g.origin.y + (mid.y - g.mid.y) / size,
					),
				});
			}
		},
		[toCanvas, isOnHandle],
	);

	const onPointerEnd = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (!pointers.current.has(e.pointerId)) return;
			pointers.current.delete(e.pointerId);
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId);
			}
			const g = gesture.current;
			if (pointers.current.size >= 2 && g?.kind === "pinch") {
				// 3本目の指が離れた場合などは、残った2本で基準を取り直す
				startPinch(g.id);
			} else if (pointers.current.size === 1 && g?.kind === "pinch") {
				// ピンチの片方の指を離したら、残った指でのドラッグに切り替える
				const [rest] = [...pointers.current.values()];
				startDrag(g.id, rest);
			} else if (pointers.current.size === 0) {
				if (g) setInteracting(false);
				gesture.current = null;
			}
		},
		[startDrag, startPinch, setInteracting],
	);

	// ホイールで拡大縮小（React の onWheel は passive なので直接登録）
	useEffect(() => {
		const canvas = options.canvasRef.current;
		if (!canvas) return;
		const onWheel = (e: WheelEvent) => {
			const opts = optsRef.current;
			const id = opts.selectedId;
			const target = id ? opts.getTarget(id) : null;
			// 選択中の要素の上にポインタがあるときだけ操作し、それ以外はページをスクロールさせる
			if (!id || !target) return;
			const p = toCanvas(e);
			if (!hitTest(target, p.x, p.y, opts.size)) return;
			e.preventDefault();
			if (e.shiftKey) {
				const delta = e.deltaY || e.deltaX;
				opts.onTransform(id, {
					rotation: normalizeRotation(target.rotation + Math.sign(delta) * 5),
				});
				return;
			}
			const limits = opts.getScaleLimits(id);
			opts.onTransform(id, {
				scale: clamp(
					target.scale * Math.exp(-e.deltaY * 0.0015),
					limits.min,
					limits.max,
				),
			});
		};
		canvas.addEventListener("wheel", onWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", onWheel);
	}, [options.canvasRef, toCanvas]);

	return {
		onPointerDown,
		onPointerMove,
		onPointerUp: onPointerEnd,
		onPointerCancel: onPointerEnd,
	};
}
