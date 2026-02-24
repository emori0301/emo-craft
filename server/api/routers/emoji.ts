import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

export const emojiRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        editorType: z.enum(["TEXT", "PIXEL"]),
        imageData: z.string(),
        isPublic: z.boolean(),
        text: z.string().optional(),
        fontSize: z.number().optional(),
        fontWeight: z.number().optional(),
        fontFamily: z.string().optional(),
        textColor: z.string().optional(),
        backgroundColor: z.string().optional(),
        pixelData: z.any().optional(),
        pixelCanvasSize: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const emoji = await prisma.emoji.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          editorType: input.editorType,
          imageUrl: input.imageData,
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
      });
      return emoji;
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return prisma.emoji.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
    });
  }),

  listPublic: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(12) }))
    .query(async ({ input }) => {
      return prisma.emoji.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const emoji = await prisma.emoji.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!emoji) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await prisma.emoji.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
