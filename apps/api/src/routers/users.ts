import { hashPassword, verifyPassword } from "@tailstreamer/auth";
import { prisma } from "@tailstreamer/db";
import { TRPCError } from "@trpc/server";
import { authedProcedure, roleProcedure, router } from "../trpc";
import {
  changePasswordInputParser,
  createUserInputParser,
  updateUserRoleInputParser,
  userIdInputParser,
} from "../validation";

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  disabledAt: true,
} as const;

export const usersRouter = router({
  list: roleProcedure("ADMIN").query(() =>
    prisma.user.findMany({
      select: publicUserSelect,
      orderBy: [{ disabledAt: "asc" }, { createdAt: "asc" }],
    }),
  ),

  create: roleProcedure("ADMIN")
    .input(createUserInputParser)
    .mutation(async ({ input }) =>
      prisma.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          role: input.role,
          passwordHash: await hashPassword(input.password),
        },
        select: publicUserSelect,
      }),
    ),

  updateRole: roleProcedure("ADMIN")
    .input(updateUserRoleInputParser)
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (user.role === "ADMIN" && input.role !== "ADMIN") await assertNotLastEnabledAdmin(user.id);
      return prisma.user.update({ where: { id: input.userId }, data: { role: input.role }, select: publicUserSelect });
    }),

  disable: roleProcedure("ADMIN")
    .input(userIdInputParser)
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (user.role === "ADMIN" && !user.disabledAt) await assertNotLastEnabledAdmin(user.id);
      return prisma.user.update({
        where: { id: input.userId },
        data: { disabledAt: new Date() },
        select: publicUserSelect,
      });
    }),

  changePassword: authedProcedure.input(changePasswordInputParser).mutation(async ({ ctx, input }) => {
    const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
    if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    return true;
  }),
});

async function assertNotLastEnabledAdmin(userId: string) {
  const otherAdmins = await prisma.user.count({
    where: {
      role: "ADMIN",
      disabledAt: null,
      id: { not: userId },
    },
  });
  if (otherAdmins === 0) throw new TRPCError({ code: "CONFLICT", message: "Cannot remove the last enabled admin" });
}
