import type { InsightEntry } from "./types";

export function deriveTitleFromFilename(filename: string) {
  const extensionStripped = filename.replace(/\.md$/, "");
  const datePrefixStripped = extensionStripped.replace(/^(?:\d{8}|\d{4}-\d{2}-\d{2})\s+/, "").trim();
  return datePrefixStripped || extensionStripped;
}

export function splitNoteSections(markdown: string) {
  const [firstLine, ...lines] = markdown.split(/\r?\n/);
  const title = firstLine.startsWith("# ") ? firstLine.slice(2).trim() : "";
  let excluded = false;
  const scannableText = lines.filter((line) => {
    if (/^## (Description|YouTube Transcript)/i.test(line)) { excluded = true; return false; }
    if (/^## /.test(line)) excluded = false;
    return !excluded && !/^\*\*(Source|Date|Language|Transcript source):\*\*/.test(line);
  }).join("\n");
  return { title, scannableText };
}

export function parseImageHighlight(value: string) {
  const match = value.match(/^\s*!\[([^\]]*)\]\((https:\/\/i\.imgur\.com\/[^\s)]+)\)\s*([\s\S]*)$/);
  if (!match) return null;
  const [, altText, imageUrl, trailingText] = match;
  return { imageUrl, caption: trailingText.trim() || altText.trim() };
}

export function extractHighlights(text: string) {
  return [...text.matchAll(/(?<![=])==([^=][\s\S]*?)==/g)].map((match) => match[1].trim()).filter((value) => {
    if (parseImageHighlight(value)) return true;
    const nonEmptyLines = value.split(/\r?\n/).filter((line) => line.trim());
    return value && !/^=+$/.test(value) && value.split(/\s+/).length >= 4 && !value.includes("```") && (value.match(/[`{};]/g)?.length ?? 0) / value.length <= 0.5 && nonEmptyLines.filter((line) => /^\s{2,}/.test(line)).length / nonEmptyLines.length < 0.5;
  });
}

export function extractInsightsFromNote(markdown: string, noteTitle?: string): InsightEntry[] {
  const split = splitNoteSections(markdown);
  const title = noteTitle || split.title;
  return extractHighlights(split.scannableText).map((value, index) => {
    const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${index + 1}`;
    const image = parseImageHighlight(value);
    return image
      ? { kind: "image" as const, id, noteTitle: title, ...image }
      : { kind: "text" as const, id, noteTitle: title, insightText: value };
  });
}

export function selectRandomInsight(pool: InsightEntry[], seenIds: Set<string>, random = Math.random) {
  if (!pool.length) return { entry: null, nextSeenIds: new Set<string>() };
  const choices = pool.filter(({ id }) => !seenIds.has(id));
  const available = choices.length ? choices : pool;
  const entry = available[Math.floor(random() * available.length)];
  const nextSeenIds = choices.length ? new Set(seenIds) : new Set<string>();
  nextSeenIds.add(entry.id);
  return { entry, nextSeenIds };
}
