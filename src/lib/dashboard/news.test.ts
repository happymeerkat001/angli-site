import { expect, test } from "vitest";
import { mixNewsItems, parseNewsFeed } from "./news";
import type { NewsItem, NewsSource } from "./types";

const source: NewsSource = {
  id: "dallas-news",
  label: "Dallas News",
  feedUrl: "https://news.google.com/rss?q=site%3Adallasnews.com",
};

const feed = `<?xml version="1.0"?><rss><channel>
  <item><title>Older story - Dallas News</title><link>https://example.com/older</link><pubDate>Mon, 01 Jun 2026 08:00:00 GMT</pubDate><source>Dallas News</source></item>
  <item><title>Newer story - Dallas News</title><link>https://example.com/newer</link><pubDate>Tue, 02 Jun 2026 08:00:00 GMT</pubDate><source>Dallas News</source></item>
  <item><title>Duplicate</title><link>https://example.com/newer</link><pubDate>Tue, 02 Jun 2026 08:00:00 GMT</pubDate></item>
  <item><title>Unsafe</title><link>javascript:alert(1)</link><pubDate>Tue, 02 Jun 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;

test("keeps valid unique headlines in newest-first order", () => {
  expect(parseNewsFeed(feed, source)).toEqual([
    expect.objectContaining({
      title: "Newer story",
      url: "https://example.com/newer",
      publisher: "Dallas News",
      sourceId: "dallas-news",
    }),
    expect.objectContaining({ title: "Older story" }),
  ]);
});

test("mixes headlines from every source newest-first without duplicate links", () => {
  const items: NewsItem[] = [
    { id: "dallas", title: "Dallas", url: "https://example.com/dallas", publisher: "Dallas News", publishedAt: "2026-07-02T08:00:00.000Z", sourceId: "dallas-news" },
    { id: "hoops", title: "Hoops", url: "https://example.com/hoops", publisher: "HoopsHype", publishedAt: "2026-07-03T08:00:00.000Z", sourceId: "hoopshype" },
    { id: "duplicate", title: "Duplicate", url: "https://example.com/dallas", publisher: "Google News", publishedAt: "2026-07-04T08:00:00.000Z", sourceId: "google-news" },
  ];

  expect(mixNewsItems(items)).toEqual([
    expect.objectContaining({ title: "Hoops" }),
    expect.objectContaining({ title: "Dallas" }),
  ]);
});
