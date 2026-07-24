import { kv } from "@vercel/kv";
import type { AnywhereWindowSection, FlightSnapshot, SourceResult } from "./types";

export type FlightStoreState = { flights: FlightSnapshot[]; anywhere: SourceResult<AnywhereWindowSection[]>; fetchedAt: string };
export const STATE_KEY = "dashboard:flights:state";
export const LOCK_KEY = "dashboard:flights:lock";

const enabled = () => Boolean(process.env.KV_REST_API_URL);
export async function readFlightState(): Promise<FlightStoreState | null> { return enabled() ? await kv.get<FlightStoreState>(STATE_KEY) : null; }
export async function writeFlightState(state: FlightStoreState) { if (enabled()) await kv.set(STATE_KEY, state); }
export async function acquireRefreshLock() { return enabled() ? (await kv.set(LOCK_KEY, "1", { nx: true, ex: 60 })) === "OK" : true; }
export async function releaseRefreshLock() { if (enabled()) await kv.del(LOCK_KEY); }
