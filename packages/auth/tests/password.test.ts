import { describe, expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "../src";

describe("password hashing", () => {
  test("hashes and verifies an Argon2id password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });

  test("rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "wrong horse battery staple")).toBe(false);
  });

  test("returns false for too-short verification candidates", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword(hash, "short")).toBe(false);
  });
});
