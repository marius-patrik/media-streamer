import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const requiredSections = [
  "## Status",
  "## Scope",
  "## Non-Goals",
  "## Contracts",
  "## Security",
  "## Failure Modes",
  "## Acceptance Criteria",
  "## Dependency Changes",
];

const specsDir = join(root, "specs");
const specs = readdirSync(specsDir).filter((name) => /^[0-9][0-9][0-9]-.*\.md$/.test(name));
let failed = false;

for (const spec of specs) {
  const text = readFileSync(join(specsDir, spec), "utf8");
  const missing = requiredSections.filter((section) => !text.includes(section));
  if (missing.length > 0) {
    failed = true;
    console.error(`${spec} missing: ${missing.join(", ")}`);
  }
}

const deps = readFileSync(join(specsDir, "dependencies.md"), "utf8");
for (const required of ["wouter", "Rsbuild", "Tailwind CSS", "Radix", "Lucide", "Dagre", "Framer Motion", "Biome"]) {
  if (!deps.toLowerCase().includes(required.toLowerCase())) {
    failed = true;
    console.error(`dependencies.md missing approved dependency: ${required}`);
  }
}

const forbidden = ["zod", "eslint"];
for (const term of forbidden) {
  if (deps.toLowerCase().includes(term)) {
    failed = true;
    console.error(`dependencies.md mentions forbidden dependency: ${term}`);
  }
}

const allowlist = new Set(
  deps
    .split("\n")
    .map((line) => line.match(/^- `?([^`]+?)`?$/)?.[1])
    .filter(Boolean) as string[],
);

function packageFiles(dir: string, found: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) packageFiles(path, found);
    if (entry.isFile() && entry.name === "package.json") found.push(path);
  }
  return found;
}

for (const packageFile of packageFiles(root)) {
  const manifest = JSON.parse(readFileSync(packageFile, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  for (const section of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (name.startsWith("@tailstreamer/")) continue;
      if (!allowlist.has(name)) {
        failed = true;
        console.error(
          `${packageFile.replace(`${root}/`, "")}: ${section}.${name} is not approved in specs/dependencies.md`,
        );
      }
    }
  }
}

if (failed) process.exit(1);
console.log(`Checked ${specs.length} specs.`);
