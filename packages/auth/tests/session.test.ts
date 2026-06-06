import { describe, expect, test } from "bun:test";
import {
  createSessionToken,
  hashSessionToken,
  parseSessionCookie,
  serializeSessionCookie,
  sessionTokenBytes,
} from "../src";

const secret = "12345678901234567890123456789012";

describe("session tokens", () => {
  test("creates random 32-byte base64url tokens", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toEqual(second);
    expect(Buffer.from(first, "base64url").byteLength).toBe(sessionTokenBytes);
  });

  test("hashes tokens with a stable secret-keyed hash", () => {
    expect(hashSessionToken("token", secret)).toEqual(hashSessionToken("token", secret));
    expect(hashSessionToken("token", secret)).not.toEqual(hashSessionToken("other", secret));
  });

  test("round trips the session cookie value", () => {
    const cookie = serializeSessionCookie("abc=123", { expiresAt: new Date("2030-01-01T00:00:00Z"), secure: true });
    expect(parseSessionCookie(cookie)).toBe("abc=123");
  });

  test("rejects malformed cookie encoding", () => {
    expect(parseSessionCookie("tailstreamer_session=%E0%A4%A")).toBeNull();
  });
});
