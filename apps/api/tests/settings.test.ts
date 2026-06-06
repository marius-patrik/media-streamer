import { describe, expect, test } from "bun:test";
import { readJsonSetting, readStringSetting, writeJsonSetting } from "../src/settings";

describe("app settings", () => {
  test("reads string setting values without exposing object envelopes", async () => {
    const prisma = fakeSettingsPrisma({ value: { value: " secret " } });

    await expect(readStringSetting(prisma, "tmdb.apiKey")).resolves.toBe("secret");
  });

  test("returns null for missing or unsupported setting values", async () => {
    await expect(readStringSetting(fakeSettingsPrisma(null), "tmdb.apiKey")).resolves.toBeNull();
    await expect(
      readStringSetting(fakeSettingsPrisma({ value: { enabled: true } }), "tmdb.apiKey"),
    ).resolves.toBeNull();
  });

  test("reads JSON settings with fallback", async () => {
    await expect(
      readJsonSetting<Array<{ id: string }>>(fakeSettingsPrisma({ value: [{ id: "cloud" }] }), "cloud.providers", []),
    ).resolves.toEqual([{ id: "cloud" }]);
    await expect(readJsonSetting(fakeSettingsPrisma(null), "cloud.providers", [{ id: "default" }])).resolves.toEqual([
      { id: "default" },
    ]);
  });

  test("writes JSON settings through upsert", async () => {
    const calls: unknown[] = [];
    const prisma = {
      appSetting: {
        async upsert(input: unknown) {
          calls.push(input);
          return { key: "cloud.providers", value: [{ id: "cloud" }], updatedAt: new Date(0) };
        },
      },
    } as unknown as Parameters<typeof writeJsonSetting>[0];

    await writeJsonSetting(prisma, "cloud.providers", [{ id: "cloud" }]);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      where: { key: "cloud.providers" },
      create: { key: "cloud.providers", value: [{ id: "cloud" }] },
      update: { value: [{ id: "cloud" }] },
    });
  });
});

function fakeSettingsPrisma(record: { value: unknown } | null) {
  return {
    appSetting: {
      async findUnique() {
        return record;
      },
    },
  } as unknown as Parameters<typeof readStringSetting>[0];
}
