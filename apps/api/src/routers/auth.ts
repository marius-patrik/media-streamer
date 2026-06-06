import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  parseSessionCookie,
  serializeExpiredSessionCookie,
  serializeSessionCookie,
  verifyPassword,
} from "@tailstreamer/auth";
import { prisma } from "@tailstreamer/db";
import { TRPCError } from "@trpc/server";
import { authedProcedure, publicProcedure, router } from "../trpc";
import { bootstrapInputParser, loginInputParser } from "../validation";

const sessionDays = 30;

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", disabledAt: null } });
    return {
      bootstrapRequired: adminCount === 0,
      user: ctx.user
        ? {
            id: ctx.user.id,
            email: ctx.user.email,
            displayName: ctx.user.displayName,
            role: ctx.user.role,
          }
        : null,
    };
  }),

  bootstrapAdmin: publicProcedure.input(bootstrapInputParser).mutation(async ({ input, ctx }) => {
    if (input.bootstrapSecret !== ctx.env.bootstrapSecret) throw new TRPCError({ code: "FORBIDDEN" });
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", disabledAt: null } });
    if (adminCount > 0) throw new TRPCError({ code: "CONFLICT" });

    const user = await prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        role: "ADMIN",
      },
    });

    await createSessionCookie(ctx, user.id);
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
  }),

  login: publicProcedure.input(loginInputParser).mutation(async ({ input, ctx }) => {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.disabledAt || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    await createSessionCookie(ctx, user.id);
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
  }),

  logout: authedProcedure.mutation(async ({ ctx }) => {
    const token = parseSessionCookie(ctx.req.headers.get("cookie"));
    if (token) {
      await prisma.session.deleteMany({
        where: { tokenHash: hashSessionToken(token, ctx.env.sessionSecret), userId: ctx.user.id },
      });
    }
    ctx.responseHeaders.append("set-cookie", serializeExpiredSessionCookie());
    return true;
  }),
});

async function createSessionCookie(
  ctx: { env: { sessionSecret: string; production: boolean }; responseHeaders: Headers },
  userId: string,
) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token, ctx.env.sessionSecret),
      expiresAt,
    },
  });
  ctx.responseHeaders.append("set-cookie", serializeSessionCookie(token, { expiresAt, secure: ctx.env.production }));
}
