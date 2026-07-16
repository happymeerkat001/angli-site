import { XMLParser } from "fast-xml-parser";
import { newsSources } from "./config";
import type { NewsItem, NewsSource, NewsSourceId, SourceResult } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? (value as T[]) : [value];
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function titleWithoutPublisher(title: string) {
  return title.replace(/\s+-\s+[^-]+$/, "").trim();
}

export function parseNewsFeed(xml: string, source: NewsSource): NewsItem[] {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
  };
  const items = toArray<Record<string, unknown>>(
    parsed.rss?.channel?.item as Record<string, unknown> | undefined,
  );
  const seen = new Set<string>();

  return items
    .flatMap((item) => {
      const url = safeHttpUrl(item.link);
      const title = typeof item.title === "string" ? titleWithoutPublisher(item.title) : "";
      if (!url || !title || seen.has(url)) return [];
      seen.add(url);

      const rawDate = typeof item.pubDate === "string" ? item.pubDate : null;
      const date = rawDate && !Number.isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : null;
      const rawSource = typeof item.source === "string" ? item.source : source.label;

      return [{
        id: url,
        title,
        url,
        publisher: rawSource || source.label,
        publishedAt: date,
        sourceId: source.id,
      }];
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 5);
}

export async function getNewsSource(source: NewsSource): Promise<SourceResult<NewsItem[]>> {
  try {
    const response = await fetch(source.feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`News response: ${response.status}`);
    return { status: "ok", value: parseNewsFeed(await response.text(), source) };
  } catch (error) {
    console.error(`News feed unavailable for ${source.id}`, error);
    return { status: "error", message: "News temporarily unavailable" };
  }
}

export async function getNewsDashboard(): Promise<Record<NewsSourceId, SourceResult<NewsItem[]>>> {
  const results = await Promise.all(newsSources.map(async (source) => [source.id, await getNewsSource(source)] as const));
  return Object.fromEntries(results) as Record<NewsSourceId, SourceResult<NewsItem[]>>;
}
