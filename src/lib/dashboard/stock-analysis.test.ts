import { afterEach, expect, test, vi } from "vitest";
import type { NewsItem, StockSnapshot } from "./types";
import { getStockAnalysis, parseStockAnalysis } from "./stock-analysis";

const snapshot: StockSnapshot = {
  symbol: "NVDA", price: 300, previousClose: 290, dayChange: 10, dayChangePercent: 3.45, positionValue: 60_978, unrealizedPL: 10_978.07,
};
const headlines: NewsItem[] = [{ id: "1", title: "NVIDIA earnings", url: "https://example.com", publisher: "News", publishedAt: null, sourceId: "stock-news" }];
const environment = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...environment };
});

test("parses strict JSON analysis wrapped in markdown fences", () => {
  expect(parseStockAnalysis("```json\n{\"analysis\":\"Momentum remains strong.\",\"limit_sell\":325.5}\n```"))
    .toEqual({ analysis: "Momentum remains strong.", limitSellPrice: 325.5 });
});

test("extracts a valid analysis object from chatty model text", () => {
  expect(parseStockAnalysis("Here is the requested result:\n\n{\"analysis\":\"Hold while monitoring earnings.\",\"limit_sell\":320}\n\nThis is not financial advice."))
    .toEqual({ analysis: "Hold while monitoring earnings.", limitSellPrice: 320 });
});

test("fails closed when analysis is not configured", async () => {
  delete process.env.STOCK_LLM_BASE_URL;
  delete process.env.STOCK_LLM_API_KEY;
  delete process.env.STOCK_LLM_MODEL;
  await expect(getStockAnalysis(snapshot, headlines)).resolves.toEqual({ status: "error", message: "Analysis not configured" });
});

test("sends price, cost basis, and headlines to the configured endpoint", async () => {
  process.env.STOCK_LLM_BASE_URL = "https://llm.example/v1";
  process.env.STOCK_LLM_API_KEY = "test-key";
  process.env.STOCK_LLM_MODEL = "small-model";
  const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
    choices: [{ message: { content: "{\"analysis\":\"Hold.\",\"limit_sell\":320}" } }],
  }), { status: 200 }));

  await expect(getStockAnalysis(snapshot, headlines)).resolves.toMatchObject({ status: "ok", value: { analysis: "Hold.", limitSellPrice: 320, fetchedAt: expect.any(String) } });
  expect(fetchMock.mock.calls[0][0]).toBe("https://llm.example/v1/chat/completions");
  expect(fetchMock.mock.calls[0][1]?.body).toContain("245.99");
  expect(fetchMock.mock.calls[0][1]?.body).toContain("NVIDIA earnings");
});
