import { kv } from "@vercel/kv";
import type { NewsItem } from "./types";

export type NewsStoreState = { headlines: NewsItem[]; fetchedAt: string };
export const STATE_KEY = "dashboard:news:state";
export const LOCK_KEY = "dashboard:news:lock";

const enabled = () => Boolean(process.env.KV_REST_API_URL);

export async function readNewsState(): Promise<NewsStoreState | null> {
  return enabled() ? await kv.get<NewsStoreState>(STATE_KEY) : null;
}

export async function writeNewsState(state: NewsStoreState) {
  if (enabled()) await kv.set(STATE_KEY, state);
}

export async function acquireNewsRefreshLock() {
  return enabled() ? (await kv.set(LOCK_KEY, "1", { nx: true, ex: 60 })) === "OK" : true;
}

export async function releaseNewsRefreshLock() {
  if (enabled()) await kv.del(LOCK_KEY);
}
