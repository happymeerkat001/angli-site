import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const ALLOWED_ROOTS = [
  "z.Ingestion/Clippings",
  "z.Ingestion/Official Docs",
  "z.Ingestion/People",
  "z.Ingestion/personal.Spaces",
  "z.Ingestion/read.done",
  "z.Ingestion/Hedy-AI",
];

export function shouldExcludeInsightSourcePath(path: string) {
  const segments = path.split(/[\\/]+/);
  const filename = segments.at(-1) ?? "";
  const personalSpacesIndex = segments.indexOf("personal.Spaces");
  const isExcludedPersonalSpace = personalSpacesIndex >= 0 && segments.slice(personalSpacesIndex + 1, -1).some((segment) => segment === "Manus" || segment === "$$$");
  const isHedyTranscript = segments.includes("Hedy-AI") && /^transcript .+\.md$/i.test(filename);
  return isExcludedPersonalSpace || isHedyTranscript;
}

async function walkMarkdownFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (shouldExcludeInsightSourcePath(path)) return [];
    if (entry.isDirectory()) return walkMarkdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  }));
  return files.flat();
}

export async function collectInsightSourceFiles(vaultRoot: string) {
  const roots = ALLOWED_ROOTS.map((root) => resolve(vaultRoot, root));
  return (await Promise.all(roots.map(walkMarkdownFiles))).flat();
}
