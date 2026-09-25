import { kv } from "@vercel/kv";
import { schoolBreaks } from "./config";
import { FRONTIER_SOURCE_VERSION } from "./flights-frontier";
import { tripDatePolicyFingerprint } from "./trip-dates";
import type { AnywhereFlightOption, AnywhereWindowSection, FlightSnapshot, FrontierDealOption, FrontierSearchCursor, PointsFlightOption, SeasonSearchCursor, SourceResult } from "./types";

export type FlightStoreState = {
  flights: FlightSnapshot[];
  anywhere: SourceResult<AnywhereWindowSection[]>;
  anywhereSeasonLabel: string;
  anywherePile: AnywhereFlightOption[];
  anywherePileSeasonLabel: string;
  anywherePileFingerprint: string;
  fetchedAt: string;
  points: SourceResult<PointsFlightOption[]>;
  pointsSeasonLabel: string;
  pointsFetchedAt: string;
  frontier: SourceResult<FrontierDealOption[]>;
  frontierSeasonLabel: string;
  frontierFetchedAt: string;
  frontierSourceVersion: string;
  frontierCoverageBySeason: Record<string, FrontierSearchCursor>;
  policyFingerprint: string;
  coverageBySeason: Record<string, SeasonSearchCursor>;
};

export const STATE_KEY = "dashboard:flights:state";
export const LOCK_KEY = "dashboard:flights:lock";
export const LOCK_TTL_SECONDS = 60;
export const REFRESH_BUDGET_MS = 50_000;
export const SEASONAL_SEARCH_CONCURRENCY = 4;
export const FETCH_TIMEOUT_MS = 12_000;

const RETIRED_ANYWHERE = "Saved fares used an older date policy — press Refresh flights";
const RETIRED_POINTS = "Saved points fares used an older date policy — press Refresh points";
const RETIRED_FRONTIER = "Saved Frontier results used an older search source — press Refresh Frontier";
const emptyAnywhere: SourceResult<AnywhereWindowSection[]> = { status: "error", message: "Flight data not loaded yet — press Refresh flights" };
const emptyPoints: SourceResult<PointsFlightOption[]> = { status: "error", message: "Not yet loaded — press Refresh points" };
const emptyFrontier: SourceResult<FrontierDealOption[]> = { status: "error", message: "Not yet loaded — press Refresh Frontier" };
const RELEASE_LOCK_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export function currentPolicyFingerprint() {
  return tripDatePolicyFingerprint(schoolBreaks);
}

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
    anywherePileFingerprint: patch.anywherePileFingerprint ?? previous?.anywherePileFingerprint ?? "",
    fetchedAt: patch.fetchedAt,
    points: patch.points ?? previous?.points ?? emptyPoints,
    pointsSeasonLabel: patch.pointsSeasonLabel ?? previous?.pointsSeasonLabel ?? "",
    pointsFetchedAt: patch.pointsFetchedAt ?? previous?.pointsFetchedAt ?? "",
    frontier: patch.frontier ?? previous?.frontier ?? emptyFrontier,
    frontierSeasonLabel: patch.frontierSeasonLabel ?? previous?.frontierSeasonLabel ?? "",
    frontierFetchedAt: patch.frontierFetchedAt ?? previous?.frontierFetchedAt ?? "",
    frontierSourceVersion: patch.frontierSourceVersion ?? previous?.frontierSourceVersion ?? "",
    frontierCoverageBySeason: patch.frontierCoverageBySeason ?? previous?.frontierCoverageBySeason ?? {},
    policyFingerprint: patch.policyFingerprint ?? previous?.policyFingerprint ?? "",
    coverageBySeason: patch.coverageBySeason ?? previous?.coverageBySeason ?? {},
  };
}

export function presentFlightState(state: FlightStoreState | null, fingerprint = currentPolicyFingerprint()): FlightStoreState | null {
  if (!state) return null;
  const datePolicyOk = state.policyFingerprint === fingerprint;
  const next = datePolicyOk ? state : {
    ...state,
    anywhere: { status: "error" as const, message: RETIRED_ANYWHERE },
    anywherePile: [],
    anywherePileSeasonLabel: "",
    anywherePileFingerprint: "",
    points: { status: "error" as const, message: RETIRED_POINTS },
    pointsSeasonLabel: "",
    frontier: { status: "error" as const, message: RETIRED_FRONTIER },
    frontierSeasonLabel: "",
    frontierFetchedAt: "",
    frontierCoverageBySeason: {},
    coverageBySeason: {},
  };
  if ((next.frontierSourceVersion ?? "") === FRONTIER_SOURCE_VERSION) return next;
  return {
    ...next,
    frontier: { status: "error", message: RETIRED_FRONTIER },
    frontierSeasonLabel: "",
    frontierFetchedAt: "",
    frontierCoverageBySeason: {},
  };
}

export function compatiblePile(
  state: FlightStoreState | null,
  seasonLabel: string,
  fingerprint = currentPolicyFingerprint(),
): AnywhereFlightOption[] {
  if (!state) return [];
  if (state.anywherePileFingerprint !== fingerprint) return [];
  if (state.anywherePileSeasonLabel !== seasonLabel) return [];
  return state.anywherePile;
}

const enabled = () => Boolean(process.env.KV_REST_API_URL);

export async function readFlightState(): Promise<FlightStoreState | null> {
  return enabled() ? await kv.get<FlightStoreState>(STATE_KEY) : null;
}

export async function writeFlightState(state: FlightStoreState) {
  if (enabled()) await kv.set(STATE_KEY, state);
}

export async function acquireRefreshLock(token = crypto.randomUUID()): Promise<{ acquired: boolean; token: string }> {
  if (!enabled()) return { acquired: true, token };
  const acquired = (await kv.set(LOCK_KEY, token, { nx: true, ex: LOCK_TTL_SECONDS })) === "OK";
  return { acquired, token };
}

export async function releaseRefreshLock(token: string) {
  if (enabled()) await kv.eval(RELEASE_LOCK_SCRIPT, [LOCK_KEY], [token]);
}
