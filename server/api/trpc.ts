import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/lib/auth/config";
export interface Context {
  req?: NextRequest;
  session: { session: { userId: string }; user: { id: string; email: string; name: string | null } } | null;
}

export const createContext = async (opts: { req?: NextRequest }) => {
  let session: Context["session"] = null;
  if (opts.req) {
    const result = await auth.api.getSession({
      headers: opts.req.headers,
    });
    session = result ?? null;
  }
  return {
    req: opts.req,
    session,
  };
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

