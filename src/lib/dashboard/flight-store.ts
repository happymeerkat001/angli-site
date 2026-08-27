import { kv } from "@vercel/kv";
import type { AnywhereFlightOption, AnywhereWindowSection, FlightSnapshot, FrontierDealOption, PointsFlightOption, SourceResult } from "./types";

export type FlightStoreState = {
  flights: FlightSnapshot[];
  anywhere: SourceResult<AnywhereWindowSection[]>;
  anywhereSeasonLabel: string;
  anywherePile: AnywhereFlightOption[];
  anywherePileSeasonLabel: string;
  fetchedAt: string;
  points: SourceResult<PointsFlightOption[]>;
  pointsSeasonLabel: string;
  pointsFetchedAt: string;
  frontier: SourceResult<FrontierDealOption[]>;
  frontierSeasonLabel: string;
  frontierFetchedAt: string;
};

export const STATE_KEY = "dashboard:flights:state";
export const LOCK_KEY = "dashboard:flights:lock";

const emptyAnywhere: SourceResult<AnywhereWindowSection[]> = { status: "error", message: "Flight data not loaded yet — press Refresh flights" };
const emptyPoints: SourceResult<PointsFlightOption[]> = { status: "error", message: "Not yet loaded — press Refresh points" };
const emptyFrontier: SourceResult<FrontierDealOption[]> = { status: "error", message: "Not yet loaded — press Refresh Frontier" };

export function mergeFlightState(
  previous: FlightStoreState | null,
  patch: Partial<FlightStoreState> & Pick<FlightStoreState, "anywhereSeasonLabel" | "fetchedAt">,
): FlightStoreState {
  return {
    flights: patch.flights ?? previous?.flights ?? [],
    anywhere: patch.anywhere ?? previous?.anywhere ?? emptyAnywhere,
    anywhereSeasonLabel: patch.anywhereSeasonLabel,
    anywherePile: patch.anywherePile ?? previous?.anywherePile ?? [],
    anywherePileSeasonLabel: patch.anywherePileSeasonLabel ?? previous?.anywherePileSeasonLabel ?? "",
    fetchedAt: patch.fetchedAt,
    points: patch.points ?? previous?.points ?? emptyPoints,
    pointsSeasonLabel: patch.pointsSeasonLabel ?? previous?.pointsSeasonLabel ?? "",
    pointsFetchedAt: patch.pointsFetchedAt ?? previous?.pointsFetchedAt ?? "",
    frontier: patch.frontier ?? previous?.frontier ?? emptyFrontier,
    frontierSeasonLabel: patch.frontierSeasonLabel ?? previous?.frontierSeasonLabel ?? "",
    frontierFetchedAt: patch.frontierFetchedAt ?? previous?.frontierFetchedAt ?? "",
  };
}

const enabled = () => Boolean(process.env.KV_REST_API_URL);
export async function readFlightState(): Promise<FlightStoreState | null> { return enabled() ? await kv.get<FlightStoreState>(STATE_KEY) : null; }
export async function writeFlightState(state: FlightStoreState) { if (enabled()) await kv.set(STATE_KEY, state); }
export async function acquireRefreshLock() { return enabled() ? (await kv.set(LOCK_KEY, "1", { nx: true, ex: 60 })) === "OK" : true; }
export async function releaseRefreshLock() { if (enabled()) await kv.del(LOCK_KEY); }
