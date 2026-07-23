import { stockPosition } from "./config";
import type { NewsItem, SourceResult, StockSnapshot } from "./types";

export type StockAnalysis = {
  analysis: string;
  limitSellPrice: number;
  fetchedAt: string;
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

function jsonObjectCandidates(content: string) {
  const candidates = [content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")];
  for (let start = content.indexOf("{"); start >= 0; start = content.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < content.length; end += 1) {
      const character = content[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === "\"") inString = false;
        continue;
      }
      if (character === "\"") inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}" && --depth === 0) {
        candidates.push(content.slice(start, end + 1));
        break;
      }
    }
  }
  return candidates;
}

export function parseStockAnalysis(content: unknown): Omit<StockAnalysis, "fetchedAt"> | null {
  if (typeof content !== "string") return null;
  for (const candidate of jsonObjectCandidates(content)) {
    try {
      const parsed = JSON.parse(candidate) as { analysis?: unknown; limit_sell?: unknown };
      if (typeof parsed.analysis === "string" && parsed.analysis.trim() && typeof parsed.limit_sell === "number" && Number.isFinite(parsed.limit_sell) && parsed.limit_sell > 0) {
        return { analysis: parsed.analysis.trim(), limitSellPrice: parsed.limit_sell };
      }
    } catch {
      // Keep searching: chatty model output can contain non-JSON text and other objects.
    }
  }
  return null;
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
      next: { revalidate: false, tags: ["stock-analysis"] },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Stock analysis response: ${response.status}`);
    const content = (await response.json() as ChatResponse).choices?.[0]?.message?.content;
    const analysis = parseStockAnalysis(content);
    if (!analysis) throw new Error("Stock analysis response is malformed");
    return { status: "ok", value: { ...analysis, fetchedAt: new Date().toISOString() } };
  } catch (error) {
    console.error("NVDA analysis unavailable", error);
    return { status: "error", message: "Analysis temporarily unavailable" };
  }
}
