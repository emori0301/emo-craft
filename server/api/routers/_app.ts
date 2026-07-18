import { router } from "../trpc";
import { emojiRouter } from "./emoji";

export const appRouter = router({
	emoji: emojiRouter,
});

export type AppRouter = typeof appRouter;
