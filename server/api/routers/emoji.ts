import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { protectedProcedure, publicProcedure, router } from "../trpc";

/** デコード後の画像バイト数上限（約1.5MB — 128px 絵文字には十分） */
const MAX_IMAGE_BYTES = 1_500_000;

/** 1ユーザーあたりの保存数上限（ストレージ悪用対策） */
const MAX_EMOJIS_PER_USER = 100;

/** 一覧・作成結果で返す公開フィールド（imageData / pixelData / userId は返さない） */
const listSelect = {
	id: true,
	name: true,
	editorType: true,
	imageMimeType: true,
	isPublic: true,
	createdAt: true,
} as const;

/**
 * base64 データ URL を検証してデコードする。
 * MIME タイプはヘッダを信用せず、マジックバイトで判定する。
 */
function decodeImageDataUrl(dataUrl: string): {
	buffer: Buffer;
	mimeType: "image/png" | "image/gif";
} {
	const commaIndex = dataUrl.indexOf(",");
	if (!dataUrl.startsWith("data:") || commaIndex === -1) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "画像データの形式が不正です",
		});
	}
	const buffer = Buffer.from(dataUrl.slice(commaIndex + 1), "base64");
	if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
		throw new TRPCError({
			code: "PAYLOAD_TOO_LARGE",
			message: "画像サイズが大きすぎます（上限 1.5MB）",
		});
	}

	// マジックバイト: PNG = 89 50 4E 47, GIF = "GIF8"
	const isPng =
		buffer.length > 8 &&
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47;
	const isGif =
		buffer.length > 6 && buffer.subarray(0, 4).toString("latin1") === "GIF8";
	if (!isPng && !isGif) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "PNG または GIF 画像のみ保存できます",
		});
	}
	return { buffer, mimeType: isPng ? "image/png" : "image/gif" };
}

export const emojiRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(50),
				editorType: z.enum(["TEXT", "PIXEL"]),
				// base64 は元バイナリの約 4/3 倍 + ヘッダ分の余裕
				imageData: z.string().max(2_100_000),
				isPublic: z.boolean(),
				text: z.string().optional(),
				fontSize: z.number().optional(),
				fontWeight: z.number().optional(),
				fontFamily: z.string().optional(),
				textColor: z.string().optional(),
				backgroundColor: z.string().optional(),
				pixelData: z.array(z.array(z.string())).optional(),
				pixelCanvasSize: z.number().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { buffer, mimeType } = decodeImageDataUrl(input.imageData);

			// ストレージ悪用対策: 1ユーザーあたりの保存数上限
			const count = await prisma.emoji.count({
				where: { userId: ctx.userId },
			});
			if (count >= MAX_EMOJIS_PER_USER) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `保存できる絵文字は ${MAX_EMOJIS_PER_USER} 個までです。不要な絵文字を削除してください`,
				});
			}

			return prisma.emoji.create({
				data: {
					userId: ctx.userId,
					name: input.name,
					editorType: input.editorType,
					imageData: new Uint8Array(buffer),
					imageMimeType: mimeType,
					isPublic: input.isPublic,
					text: input.text,
					fontSize: input.fontSize,
					fontWeight: input.fontWeight,
					fontFamily: input.fontFamily,
					textColor: input.textColor,
					backgroundColor: input.backgroundColor,
					pixelData: input.pixelData,
					pixelCanvasSize: input.pixelCanvasSize,
				},
				select: listSelect,
			});
		}),

	listMine: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(30),
				cursor: z.string().uuid().nullish(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const items = await prisma.emoji.findMany({
				where: { userId: ctx.userId },
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
				select: listSelect,
			});
			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				nextCursor = items.pop()?.id;
			}
			return { items, nextCursor };
		}),

	listPublic: publicProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(12),
				cursor: z.string().uuid().nullish(),
			}),
		)
		.query(async ({ input }) => {
			const items = await prisma.emoji.findMany({
				where: { isPublic: true },
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
				select: listSelect,
			});
			let nextCursor: string | undefined;
			if (items.length > input.limit) {
				nextCursor = items.pop()?.id;
			}
			return { items, nextCursor };
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const emoji = await prisma.emoji.findFirst({
				where: { id: input.id, userId: ctx.userId },
				select: {
					...listSelect,
					text: true,
					fontSize: true,
					fontWeight: true,
					fontFamily: true,
					textColor: true,
					backgroundColor: true,
					pixelData: true,
					pixelCanvasSize: true,
				},
			});
			if (!emoji) throw new TRPCError({ code: "NOT_FOUND" });
			return emoji;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { count } = await prisma.emoji.deleteMany({
				where: { id: input.id, userId: ctx.userId },
			});
			if (count === 0) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			return { success: true };
		}),
});
