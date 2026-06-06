export type SourceType = "LOCAL" | "DOWNLOAD" | "CLOUD";

export type RankedSource = {
  type: SourceType;
  id: string;
  rank?: number;
};

export type LastSource = {
  type?: SourceType | null;
  id?: string | null;
};

export function rankSources<TSource extends RankedSource>(sources: TSource[], lastSource?: LastSource) {
  return [...sources].sort((left, right) => sourceScore(left, lastSource) - sourceScore(right, lastSource));
}

function sourceScore(source: RankedSource, lastSource?: LastSource) {
  if (lastSource?.type === source.type && lastSource.id === source.id) return 0;
  if (source.type === "LOCAL") return 10;
  if (source.type === "DOWNLOAD") return 20;
  return 30 + (source.rank ?? 0);
}
