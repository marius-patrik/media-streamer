import argon2 from "argon2";

export const passwordHashParameters = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 3,
  parallelism: 1,
} as const;

export async function hashPassword(password: string) {
  assertPassword(password);
  return argon2.hash(password, passwordHashParameters);
}

export async function verifyPassword(hash: string, password: string) {
  if (password.length < 8) return false;
  if (!hash.startsWith("$argon2id$")) return false;
  return argon2.verify(hash, password);
}

function assertPassword(password: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
}
