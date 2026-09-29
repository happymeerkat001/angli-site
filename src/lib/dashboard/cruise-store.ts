import { kv } from "@vercel/kv";
import type { CruiseWindowSection, SourceResult } from "./types";

export type CruiseStoreState = {
  windows: SourceResult<CruiseWindowSection[]>;
  seasonLabel?: string;
  fetchedAt: string;
};

export const STATE_KEY = "dashboard:cruises:state";
export const LOCK_KEY = "dashboard:cruises:lock";

const enabled = () => Boolean(process.env.KV_REST_API_URL);

export async function readCruiseState(): Promise<CruiseStoreState | null> {
  return enabled() ? await kv.get<CruiseStoreState>(STATE_KEY) : null;
}

export async function writeCruiseState(state: CruiseStoreState) {
  if (enabled()) await kv.set(STATE_KEY, state);
}

export async function acquireCruiseRefreshLock() {
  return enabled() ? (await kv.set(LOCK_KEY, "1", { nx: true, ex: 60 })) === "OK" : true;
}

export async function releaseCruiseRefreshLock() {
  if (enabled()) await kv.del(LOCK_KEY);
}
