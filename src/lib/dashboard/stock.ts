import { stockNewsSource, stockPosition } from "./config";
import { getNewsSource } from "./news";
import type { NewsItem, SourceResult, StockPosition, StockSnapshot } from "./types";

type YahooQuoteResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: unknown;
        chartPreviousClose?: unknown;
      };
    }>;
  };
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseStockQuote(data: unknown, position: StockPosition): StockSnapshot | null {
  const meta = (data as YahooQuoteResponse).chart?.result?.[0]?.meta;
  const price = typeof meta?.regularMarketPrice === "number" && Number.isFinite(meta.regularMarketPrice)
    ? meta.regularMarketPrice
    : null;
  const previousClose = typeof meta?.chartPreviousClose === "number" && Number.isFinite(meta.chartPreviousClose)
    ? meta.chartPreviousClose
    : null;
  if (price === null || previousClose === null || previousClose === 0) return null;

  return {
    symbol: position.symbol,
    price,
    previousClose,
    dayChange: price - previousClose,
    dayChangePercent: (price - previousClose) / previousClose * 100,
    positionValue: roundMoney(position.shares * price),
    unrealizedPL: roundMoney(position.shares * (price - position.costBasisPerShare)),
  };
}

export async function getStockSnapshot(): Promise<SourceResult<StockSnapshot>> {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${stockPosition.symbol}?range=1d`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Yahoo quote response: ${response.status}`);

    const snapshot = parseStockQuote(await response.json(), stockPosition);
    if (!snapshot) throw new Error("Yahoo quote missing price data");
    return { status: "ok", value: snapshot };
  } catch (error) {
    console.error("NVDA stock price unavailable", error);
    return { status: "error", message: "Stock price temporarily unavailable" };
  }
}

export async function getStockHeadlines(): Promise<SourceResult<NewsItem[]>> {
  const result = await getNewsSource(stockNewsSource);
  return result.status === "ok" ? { status: "ok", value: result.value.slice(0, 5) } : result;
}