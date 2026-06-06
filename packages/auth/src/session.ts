import { createHash, randomBytes } from "node:crypto";

export const sessionCookieName = "tailstreamer_session";
export const sessionTokenBytes = 32;

export function createSessionToken() {
  return randomBytes(sessionTokenBytes).toString("base64url");
}

export function hashSessionToken(token: string, sessionSecret: string) {
  if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return createHash("sha256").update(`${sessionSecret}:${token}`).digest("hex");
}

export type SessionCookieOptions = {
  expiresAt: Date;
  secure: boolean;
};

export function serializeSessionCookie(token: string, options: SessionCookieOptions) {
  return [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    options.secure ? "Secure" : "",
    `Expires=${options.expiresAt.toUTCString()}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function serializeExpiredSessionCookie() {
  return [`${sessionCookieName}=`, "HttpOnly", "SameSite=Lax", "Path=/", "Expires=Thu, 01 Jan 1970 00:00:00 GMT"].join(
    "; ",
  );
}

export function parseSessionCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = pair.trim().split("=");
    if (rawName === sessionCookieName) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}
