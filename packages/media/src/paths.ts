import { isAbsolute, relative, resolve } from "node:path";

export type MediaRootContract = {
  mediaRoot: string;
  downloadIncomplete: string;
  downloadComplete: string;
};

export function isInsideRoot(root: string, candidate: string) {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidate);
  const rel = relative(resolvedRoot, resolvedCandidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function safeResolve(root: string, ...segments: string[]) {
  const resolved = resolve(root, ...segments);
  if (!isInsideRoot(root, resolved)) throw new Error("Path escapes configured root");
  return resolved;
}

export function relativeFromRoot(root: string, candidate: string) {
  if (!isInsideRoot(root, candidate)) throw new Error("Path escapes configured root");
  return relative(resolve(root), resolve(candidate));
}

export function assertScannableMediaPath(roots: MediaRootContract, candidate: string) {
  if (!isInsideRoot(roots.mediaRoot, candidate)) throw new Error("Path is outside media root");
  if (isInsideRoot(roots.downloadIncomplete, candidate)) throw new Error("Incomplete downloads are not scannable");
  return candidate;
}
