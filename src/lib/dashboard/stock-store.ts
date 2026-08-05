import { kv } from "@vercel/kv";
import type { StockAnalysis } from "./stock-analysis";
import type { NewsItem, SourceResult, StockSnapshot } from "./types";

export type StockStoreState = {
  snapshot: SourceResult<StockSnapshot>;
  headlines: SourceResult<NewsItem[]>;
  analysis: SourceResult<StockAnalysis> | null;
  fetchedAt: string;
};

export const STATE_KEY = "dashboard:stock:state";
export const LOCK_KEY = "dashboard:stock:lock";

const enabled = () => Boolean(process.env.KV_REST_API_URL);

export async function readStockState(): Promise<StockStoreState | null> {
  return enabled() ? await kv.get<StockStoreState>(STATE_KEY) : null;
}

export async function writeStockState(state: StockStoreState) {
  if (enabled()) await kv.set(STATE_KEY, state);
}

export async function acquireStockRefreshLock() {
  return enabled() ? (await kv.set(LOCK_KEY, "1", { nx: true, ex: 60 })) === "OK" : true;
}

export async function releaseStockRefreshLock() {
  if (enabled()) await kv.del(LOCK_KEY);
}
