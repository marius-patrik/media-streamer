import { describe, expect, test } from "bun:test";
import { rankSources } from "../src";

describe("source ranking", () => {
  test("prefers explicit last source when still available", () => {
    const ranked = rankSources(
      [
        { type: "LOCAL" as const, id: "local-1" },
        { type: "CLOUD" as const, id: "cloud-1", rank: 0 },
      ],
      { type: "CLOUD", id: "cloud-1" },
    );

    expect(ranked.map((source) => source.id)).toEqual(["cloud-1", "local-1"]);
  });

  test("ranks local assets before completed downloads and cloud sources", () => {
    const ranked = rankSources([
      { type: "CLOUD" as const, id: "cloud-1", rank: 0 },
      { type: "DOWNLOAD" as const, id: "download-1" },
      { type: "LOCAL" as const, id: "local-1" },
    ]);

    expect(ranked.map((source) => source.type)).toEqual(["LOCAL", "DOWNLOAD", "CLOUD"]);
  });

  test("ranks preferred cloud provider before other enabled cloud providers", () => {
    const ranked = rankSources([
      { type: "CLOUD" as const, id: "backup-cloud", rank: 10 },
      { type: "CLOUD" as const, id: "preferred-cloud", rank: 0 },
    ]);

    expect(ranked.map((source) => source.id)).toEqual(["preferred-cloud", "backup-cloud"]);
  });
});
