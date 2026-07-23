import { afterEach, expect, test, vi } from "vitest";
import { stockNewsSource, stockPosition } from "./config";
import { getStockHeadlines, getStockSnapshot, parseStockQuote } from "./stock";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

test("computes NVDA position value and unrealized profit from Yahoo quote data", () => {
  expect(parseStockQuote({
    chart: { result: [{ meta: { regularMarketPrice: 300, chartPreviousClose: 290 } }] },
  }, stockPosition)).toEqual({
    symbol: "NVDA",
    price: 300,
    previousClose: 290,
    dayChange: 10,
    dayChangePercent: 10 / 290 * 100,
    positionValue: 60_978,
    unrealizedPL: 55_520.47,
  });
});

test("rejects malformed quote data", () => {
  expect(parseStockQuote({ chart: { result: [{ meta: { regularMarketPrice: "bad" } }] } }, stockPosition)).toBeNull();
});

test("fails closed when Yahoo returns a non-success response", async () => {
  global.fetch = vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 }));

  await expect(getStockSnapshot()).resolves.toEqual({
    status: "error",
    message: "Stock price temporarily unavailable",
  });
});

test("uses the NVIDIA stock news query and caps headlines at five", async () => {
  expect(new URL(stockNewsSource.feedUrl).searchParams.get("q")).toBe("NVIDIA NVDA stock");
  const items = Array.from({ length: 6 }, (_, index) => `
    <item><title>Story ${index}</title><link>https://example.com/${index}</link><pubDate>Tue, 02 Jun 2026 0${index}:00:00 GMT</pubDate></item>`).join("");
  global.fetch = vi.fn().mockResolvedValue(new Response(`<rss><channel>${items}</channel></rss>`, { status: 200 }));

  const result = await getStockHeadlines();

  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value).toHaveLength(5);
});
