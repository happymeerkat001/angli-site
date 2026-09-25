import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import * as insightSources from "./insight-sources";
import { collectInsightSourceFiles, shouldExcludeInsightSourcePath } from "./insight-sources";

const temporaryVaults: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryVaults.splice(0).map((vault) => rm(vault, { force: true, recursive: true })));
});

test("collects nested allowed notes and excludes Manus and Hedy transcripts", async () => {
  const vault = await mkdtemp(join(tmpdir(), "insight-sources-"));
  temporaryVaults.push(vault);
  const nestedNote = join(vault, "z.Ingestion", "personal.Spaces", "Real Estate", "nested", "idea.md");
  const readDoneNote = join(vault, "z.Ingestion", "read.done", "existing.md");
  const manusNote = join(vault, "z.Ingestion", "personal.Spaces", "Manus", "draft.md");
  const sourceNote = join(vault, "z.Ingestion", "personal.Sources", "private.md");
  const hedyNote = join(vault, "z.Ingestion", "Hedy-AI", "2026-05-19.md");
  const transcriptNote = join(vault, "z.Ingestion", "Hedy-AI", "transcript 2026-05-19.md");

  await Promise.all([nestedNote, readDoneNote, manusNote, sourceNote, hedyNote, transcriptNote].map(async (file) => {
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, "# Test\n==insight==");
  }));

  const files = await collectInsightSourceFiles(vault);
  expect(files).toEqual(expect.arrayContaining([nestedNote, readDoneNote, hedyNote]));
  expect(files).not.toContain(manusNote);
  expect(files).not.toContain(sourceNote);
  expect(files).not.toContain(transcriptNote);
});

test("includes the curated Matt Pocock note without broadening the z.Ingestion root", async () => {
  const vault = await mkdtemp(join(tmpdir(), "insight-sources-"));
  temporaryVaults.push(vault);
  const mattNote = join(vault, "z.Ingestion", "Matt pocock 5 to learn.md");
  const uncuratedSibling = join(vault, "z.Ingestion", "Some other root note.md");

  await Promise.all([mattNote, uncuratedSibling].map(async (file) => {
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, "1. ==Learn to read code==\n");
  }));

  const files = await collectInsightSourceFiles(vault);
  expect(files).toContain(mattNote);
  expect(files).not.toContain(uncuratedSibling);
});

test("skips curated allowed files that do not exist", async () => {
  const vault = await mkdtemp(join(tmpdir(), "insight-sources-"));
  temporaryVaults.push(vault);
  const readDoneNote = join(vault, "z.Ingestion", "read.done", "existing.md");
  await mkdir(join(readDoneNote, ".."), { recursive: true });
  await writeFile(readDoneNote, "# Test\n==insight==");

  const files = await collectInsightSourceFiles(vault);
  expect(files).toEqual([readDoneNote]);
});

type InsightSourceEntry = {
  id: string;
  title: string;
  source: string;
};

function isInsightSourceEntry(value: unknown): value is InsightSourceEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string" && typeof entry.title === "string" && typeof entry.source === "string";
}

function stringList(sourceText: string, name: string) {
  const match = sourceText.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`Missing ${name} catalog in insight-sources.ts`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((found) => found[1]);
}

function entryFromPath(path: string): InsightSourceEntry {
  const title = path.split("/").at(-1)?.replace(/\.md$/i, "").trim() ?? "";
  return { id: path, title, source: path };
}

function catalogEntries(sourceText: string): InsightSourceEntry[] {
  const fromModule = Object.values(insightSources).flatMap((value) => {
    if (isInsightSourceEntry(value)) return [value];
    return Array.isArray(value) ? value.filter(isInsightSourceEntry) : [];
  });
  const fromAllowlists = [...stringList(sourceText, "ALLOWED_ROOTS"), ...stringList(sourceText, "ALLOWED_FILES")].map(entryFromPath);
  const seen = new Set(fromModule.map((entry) => entry.id));
  return [...fromModule, ...fromAllowlists.filter((entry) => !seen.has(entry.id))];
}

test("every insight source entry has a non-empty title and source and unique ids and titles", async () => {
  const sourceText = await readFile(new URL("./insight-sources.ts", import.meta.url), "utf8");
  const entries = catalogEntries(sourceText);

  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    expect(entry.id.trim()).not.toBe("");
    expect(entry.title.trim()).not.toBe("");
    expect(entry.source.trim()).not.toBe("");
  }
  expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  expect(new Set(entries.map((entry) => entry.title)).size).toBe(entries.length);
});

test("identifies only the explicitly excluded source paths", () => {
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/personal.Spaces/Manus/draft.md")).toBe(true);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/personal.Spaces/$$$/draft.md")).toBe(true);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/Hedy-AI/transcript 2026-05-19.md")).toBe(true);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/personal.Spaces/Real Estate/PML raising 07-05-23.md")).toBe(false);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/read.done/20260723 2% Engineers Winning AI Era (Ex-Meta L8).md")).toBe(false);
});
