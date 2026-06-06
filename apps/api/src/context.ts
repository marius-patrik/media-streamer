import { hashSessionToken, parseSessionCookie } from "@tailstreamer/auth";
import { prisma } from "@tailstreamer/db";
import { readEnv } from "./env";

export async function createContext({ req }: { req: Request }) {
  const env = readEnv();
  const responseHeaders = new Headers();
  const token = parseSessionCookie(req.headers.get("cookie"));
  const tokenHash = token ? hashSessionToken(token, env.sessionSecret) : null;
  const session = tokenHash
    ? await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      })
    : null;
  const user = session && session.expiresAt > new Date() && !session.user.disabledAt ? session.user : null;

  if (session && (!user || session.expiresAt <= new Date())) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
  }

  return { req, responseHeaders, env, user };
}

export type ApiContext = Awaited<ReturnType<typeof createContext>>;
