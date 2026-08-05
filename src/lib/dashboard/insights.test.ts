import { expect, test } from "vitest";
import { deriveTitleFromFilename, extractHighlights, extractInsightsFromNote, selectRandomInsight, splitNoteSections } from "./insights";

const note = `# Note title\n**Source:** x\n**Date:** today\n**Language:** en\n**Transcript source:** x\n\n## AI Summary\nInline ==important idea worth keeping== here.\n\n## Description\n==excluded content that stays hidden==\n\n## YouTube Transcript\n==also excluded content that stays hidden==`;

test("extracts eligible highlights while excluding description and transcript", () => {
  expect(splitNoteSections(note).title).toBe("Note title");
  expect(extractInsightsFromNote(note)).toMatchObject([{ kind: "text", noteTitle: "Note title", insightText: "important idea worth keeping" }]);
  expect(extractHighlights("=====\n==full insight from note==")).toEqual(["full insight from note"]);
});

test("keeps prose highlights while filtering short and code-heavy text", () => {
  expect(extractHighlights(`
==A durable idea worth remembering==
==Energy==
==A helpful thought==
==\`\`\` {}; {} ;==
==function run() {
  return \`result\`;
  console.log("done");
}==
==Reference implementation:
\`\`\`js
const value = true;
\`\`\`
Useful explanation follows here==
==Use \`code\` terms in a durable explanation==
==\`;\` \`{\` aa b==
`)).toEqual([
    "A durable idea worth remembering",
    "Use `code` terms in a durable explanation",
    "`;` `{` aa b",
  ]);
});

test("cycles without immediate repeats until the pool is exhausted", () => {
  const pool = [{ kind: "text" as const, id: "a", noteTitle: "A", insightText: "A" }, { kind: "text" as const, id: "b", noteTitle: "B", insightText: "B" }];
  const first = selectRandomInsight(pool, new Set(), () => 0);
  const second = selectRandomInsight(pool, first.nextSeenIds, () => 0);
  const reset = selectRandomInsight(pool, second.nextSeenIds, () => 0);
  expect([first.entry?.id, second.entry?.id]).toEqual(["a", "b"]);
  expect(reset.entry?.id).toBe("a");
  expect(selectRandomInsight([], new Set()).entry).toBeNull();
});

test("derives a title from a filename when a note has no H1", () => {
  expect(deriveTitleFromFilename("20260719 C4 Model Official - Software Architecture Diagrams.md")).toBe("C4 Model Official - Software Architecture Diagrams");
  expect(deriveTitleFromFilename("2026-07-24 Andee Tao Architecture.md")).toBe("Andee Tao Architecture");
  expect(deriveTitleFromFilename("close.bot.md")).toBe("close.bot");
  expect(deriveTitleFromFilename("2026-05-19.md")).toBe("2026-05-19");
});

test("extracts a leading Imgur image highlight with its caption", () => {
  const entries = extractInsightsFromNote("# Improvement\n==![](https://i.imgur.com/abc.png) Improving 1% daily compounds==");

  expect(entries).toEqual([{
    kind: "image",
    id: "improvement-1",
    noteTitle: "Improvement",
    imageUrl: "https://i.imgur.com/abc.png",
    caption: "Improving 1% daily compounds",
  }]);
});

test("keeps image highlights with short captions and empty captions", () => {
  expect(extractInsightsFromNote("# Improvement\n==![](https://i.imgur.com/short.png) 1% better==")[0]).toMatchObject({
    kind: "image",
    caption: "1% better",
  });
  expect(extractInsightsFromNote("# Improvement\n==![](https://i.imgur.com/empty.png)==")[0]).toMatchObject({
    kind: "image",
    caption: "",
  });
});

test("uses image alt text only when an image highlight has no trailing caption", () => {
  expect(extractInsightsFromNote("# Improvement\n==![Chart](https://i.imgur.com/chart.png) The real caption text here==")[0]).toMatchObject({
    kind: "image",
    caption: "The real caption text here",
  });
  expect(extractInsightsFromNote("# Improvement\n==![Chart of 1% gains](https://i.imgur.com/chart.png)==")[0]).toMatchObject({
    kind: "image",
    caption: "Chart of 1% gains",
  });
});

test("rejects malformed image markdown and preserves unsupported image markdown as text", () => {
  expect(extractHighlights("==![]() ==")).toEqual([]);
  expect(extractInsightsFromNote("# Improvement\n==![](https://example.com/graphic.png) A durable caption==")[0]).toMatchObject({
    kind: "text",
    insightText: "![](https://example.com/graphic.png) A durable caption",
  });
  expect(extractInsightsFromNote("# Improvement\n==Look at this: ![](https://i.imgur.com/abc.png)==")[0]).toMatchObject({
    kind: "text",
    insightText: "Look at this: ![](https://i.imgur.com/abc.png)",
  });
});
