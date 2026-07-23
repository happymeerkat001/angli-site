import type { InsightEntry } from "./types";

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

export function extractHighlights(text: string) {
  return [...text.matchAll(/(?<![=])==([^=][\s\S]*?)==/g)].map((match) => match[1].trim()).filter((value) => value && !/^=+$/.test(value));
}

export function extractInsightsFromNote(markdown: string, noteTitle?: string): InsightEntry[] {
  const split = splitNoteSections(markdown);
  const title = noteTitle || split.title;
  return extractHighlights(split.scannableText).map((insightText, index) => ({ id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${index + 1}`, noteTitle: title, insightText }));
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
