import { expect, test } from "vitest";
import { extractHighlights, extractInsightsFromNote, selectRandomInsight, splitNoteSections } from "./insights";

const note = `# Note title\n**Source:** x\n**Date:** today\n**Language:** en\n**Transcript source:** x\n\n## AI Summary\nInline ==important idea== here.\n\n## Description\n==excluded==\n\n## YouTube Transcript\n==also excluded==`;

test("extracts eligible highlights while excluding description and transcript", () => {
  expect(splitNoteSections(note).title).toBe("Note title");
  expect(extractInsightsFromNote(note)).toMatchObject([{ noteTitle: "Note title", insightText: "important idea" }]);
  expect(extractHighlights("=====\n==full insight==")).toEqual(["full insight"]);
});

test("cycles without immediate repeats until the pool is exhausted", () => {
  const pool = [{ id: "a", noteTitle: "A", insightText: "A" }, { id: "b", noteTitle: "B", insightText: "B" }];
  const first = selectRandomInsight(pool, new Set(), () => 0);
  const second = selectRandomInsight(pool, first.nextSeenIds, () => 0);
  const reset = selectRandomInsight(pool, second.nextSeenIds, () => 0);
  expect([first.entry?.id, second.entry?.id]).toEqual(["a", "b"]);
  expect(reset.entry?.id).toBe("a");
  expect(selectRandomInsight([], new Set()).entry).toBeNull();
});
