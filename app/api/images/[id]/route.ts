import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 絵文字画像の配信ルート。
 * 公開絵文字は誰でも閲覧可・長期キャッシュ。非公開は所有者のみ。
 * 画像は作成後に変更されない（編集は新規保存になる）ため immutable キャッシュが安全。
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	if (!UUID_RE.test(id)) {
		return new Response("Not Found", { status: 404 });
	}

	const emoji = await prisma.emoji.findUnique({
		where: { id },
		select: {
			imageData: true,
			imageMimeType: true,
			isPublic: true,
			userId: true,
		},
	});
	if (!emoji) {
		return new Response("Not Found", { status: 404 });
	}

	if (!emoji.isPublic) {
		const session = await auth.api.getSession({ headers: req.headers });
		if (!session?.user || session.user.id !== emoji.userId) {
			// 存在の有無を漏らさないため 404 を返す
			return new Response("Not Found", { status: 404 });
		}
	}

	return new Response(Buffer.from(emoji.imageData), {
		headers: {
			"Content-Type": emoji.imageMimeType,
			// s-maxage で Vercel の CDN にキャッシュさせ、関数呼び出し・DB クエリを減らす
			// （画像は作成後に変更されないため immutable が安全）
			"Cache-Control": emoji.isPublic
				? "public, max-age=31536000, s-maxage=31536000, immutable"
				: "private, max-age=3600",
		},
	});
}
