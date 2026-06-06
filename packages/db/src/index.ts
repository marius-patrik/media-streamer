import { type DownloadStatus, Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export { Prisma };
export type { DownloadStatus, PrismaClient };
