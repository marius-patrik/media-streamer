import type { UserRole } from "@tailstreamer/domain";
import { TRPCError, initTRPC } from "@trpc/server";
import type { ApiContext } from "./context";

const t = initTRPC.context<ApiContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export function roleProcedure(...roles: UserRole[]) {
  return authedProcedure.use(({ ctx, next }) => {
    if (!roles.includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
    return next({ ctx });
  });
}
