import type { Prisma, PrismaClient } from "@tailstreamer/db";

export async function readStringSetting(prisma: PrismaClient, key: string) {
  const setting = await prisma.appSetting.findUnique({ where: { key }, select: { value: true } });
  if (!setting) return null;
  const value = setting.value;
  if (typeof value === "string") return value.trim() || null;
  if (isSettingObject(value) && typeof value.value === "string") return value.value.trim() || null;
  return null;
}

export async function readJsonSetting<TValue>(prisma: PrismaClient, key: string, fallback: TValue) {
  const setting = await prisma.appSetting.findUnique({ where: { key }, select: { value: true } });
  return setting ? (setting.value as TValue) : fallback;
}

export async function writeJsonSetting(prisma: PrismaClient, key: string, value: Prisma.InputJsonValue) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
    select: { key: true, value: true, updatedAt: true },
  });
}

function isSettingObject(value: unknown): value is { value?: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
