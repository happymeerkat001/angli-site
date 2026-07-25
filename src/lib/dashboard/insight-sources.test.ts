import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
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

test("identifies only the explicitly excluded source paths", () => {
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/personal.Spaces/Manus/draft.md")).toBe(true);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/personal.Spaces/$$$/draft.md")).toBe(true);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/Hedy-AI/transcript 2026-05-19.md")).toBe(true);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/personal.Spaces/Real Estate/PML raising 07-05-23.md")).toBe(false);
  expect(shouldExcludeInsightSourcePath("/vault/z.Ingestion/read.done/20260723 2% Engineers Winning AI Era (Ex-Meta L8).md")).toBe(false);
});
