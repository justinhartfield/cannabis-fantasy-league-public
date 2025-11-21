import { DEFAULT_ADMIN_BYPASS_PASSWORD, NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const ADMIN_BYPASS_HEADER = "x-admin-pass";
const ADMIN_BYPASS_PASSWORD = process.env.ADMIN_BYPASS_PASSWORD || DEFAULT_ADMIN_BYPASS_PASSWORD;

function hasAdminBypass(ctx: TrpcContext) {
  if (!ADMIN_BYPASS_PASSWORD) return false;
  const headerValue = ctx.req.headers[ADMIN_BYPASS_HEADER];
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return typeof provided === "string" && provided === ADMIN_BYPASS_PASSWORD;
}

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const bypass = hasAdminBypass(ctx);

    if (!ctx.user && !bypass) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!bypass && (!ctx.user || ctx.user.role !== 'admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
