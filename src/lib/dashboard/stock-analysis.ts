import { stockPosition } from "./config";
import type { NewsItem, SourceResult, StockSnapshot } from "./types";

export type StockAnalysis = {
  analysis: string;
  limitSellPrice: number;
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

export function parseStockAnalysis(content: unknown): StockAnalysis | null {
  if (typeof content !== "string") return null;
  const json = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(json) as { analysis?: unknown; limit_sell?: unknown };
    if (typeof parsed.analysis !== "string" || typeof parsed.limit_sell !== "number" || parsed.limit_sell <= 0) return null;
    return { analysis: parsed.analysis.trim(), limitSellPrice: parsed.limit_sell };
  } catch {
    return null;
  }
}

export async function getStockAnalysis(snapshot: StockSnapshot, headlines: NewsItem[]): Promise<SourceResult<StockAnalysis>> {
  const baseUrl = process.env.STOCK_LLM_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.STOCK_LLM_API_KEY;
  const model = process.env.STOCK_LLM_MODEL;
  if (!baseUrl || !apiKey || !model) return { status: "error", message: "Analysis not configured" };

  try {
    const prompt = `NVDA price: ${snapshot.price}; previous close: ${snapshot.previousClose}; day change: ${snapshot.dayChange}; shares: ${stockPosition.shares}; cost basis: ${stockPosition.costBasisPerShare}; headlines: ${headlines.map(({ title }) => title).join(" | ")}. Return strict JSON only: {"analysis":"short analysis","limit_sell":123.45}.`;
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: "You provide concise market commentary, not financial advice." }, { role: "user", content: prompt }], temperature: 0.2 }),
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Stock analysis response: ${response.status}`);
    const content = (await response.json() as ChatResponse).choices?.[0]?.message?.content;
    const analysis = parseStockAnalysis(content);
    if (!analysis) throw new Error("Stock analysis response is malformed");
    return { status: "ok", value: analysis };
  } catch (error) {
    console.error("NVDA analysis unavailable", error);
    return { status: "error", message: "Analysis temporarily unavailable" };
  }
}
