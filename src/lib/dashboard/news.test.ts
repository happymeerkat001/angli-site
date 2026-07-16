import { expect, test } from "vitest";
import { parseNewsFeed } from "./news";
import type { NewsSource } from "./types";

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
