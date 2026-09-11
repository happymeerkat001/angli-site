import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  eval: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({ kv: mocks }));

import { schoolBreaks } from "./config";
import {
  acquireRefreshLock,
  compatiblePile,
  currentPolicyFingerprint,
  LOCK_KEY,
  LOCK_TTL_SECONDS,
  mergeFlightState,
  presentFlightState,
  readFlightState,
  releaseRefreshLock,
  writeFlightState,
} from "./flight-store";
import { tripDatePolicyFingerprint } from "./trip-dates";
import type { FlightStoreState } from "./flight-store";

const originalKvUrl = process.env.KV_REST_API_URL;
const fingerprint = currentPolicyFingerprint();

function state(overrides: Partial<FlightStoreState> = {}): FlightStoreState {
  return mergeFlightState(null, {
    anywhereSeasonLabel: "Fall Break",
    fetchedAt: "2026-09-11T00:00:00.000Z",
    flights: [{ origin: "DFW", destination: "CRK", label: "Clark", fetchedAt: "2026-09-11T00:00:00.000Z", amount: 900, currency: "USD", departureDate: "2027-06-18", returnDate: "2027-07-09", stops: 1, status: "available" }],
    anywhere: { status: "ok", value: [{ windowLabel: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13", options: [{ airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD", durationMinutes: 63, stops: 1, departureDate: "2026-10-10", returnDate: "2026-10-13", windowLabel: "Fall Break" }] }] },
    anywherePile: [{ airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD", durationMinutes: 63, stops: 1, departureDate: "2026-10-10", returnDate: "2026-10-13", windowLabel: "Fall Break" }],
    anywherePileSeasonLabel: "Fall Break",
    anywherePileFingerprint: fingerprint,
    points: { status: "ok", value: [] },
    pointsSeasonLabel: "Fall Break",
    frontier: { status: "ok", value: [] },
    frontierSeasonLabel: "Fall Break",
    policyFingerprint: fingerprint,
    coverageBySeason: { "Fall Break": { cursor: 0, lastBatch: [], totalPairs: 1, incomplete: false, timedOut: false, failedSearches: 0 } },
    ...overrides,
  });
}

beforeEach(() => {
  process.env.KV_REST_API_URL = "https://kv.example.test";
});

afterEach(() => {
  vi.clearAllMocks();
  if (originalKvUrl) process.env.KV_REST_API_URL = originalKvUrl;
  else delete process.env.KV_REST_API_URL;
});

test("retires nonmatching caches without changing international fares or relabeling the selected season", () => {
  const previous = state({ policyFingerprint: "old-policy" });
  const presented = presentFlightState(previous, fingerprint);

  expect(presented?.flights).toEqual(previous.flights);
  expect(presented?.anywhereSeasonLabel).toBe("Fall Break");
  expect(presented?.anywhere).toEqual({ status: "error", message: "Saved fares used an older date policy — press Refresh flights" });
  expect(presented?.points.status).toBe("error");
  expect(presented?.frontier.status).toBe("error");
  expect(presented?.anywherePile).toEqual([]);
  expect(presented?.fetchedAt).toBe(previous.fetchedAt);
});

test("keeps same-policy fares with their true season and timestamp", () => {
  const previous = state();
  expect(presentFlightState(previous, fingerprint)).toEqual(previous);
});

test("reuses a points pile only when season and fingerprint match", () => {
  expect(compatiblePile(state(), "Fall Break", fingerprint)).toHaveLength(1);
  expect(compatiblePile(state(), "Winter Break", fingerprint)).toEqual([]);
  expect(compatiblePile(state({ anywherePileFingerprint: "old" }), "Fall Break", fingerprint)).toEqual([]);
});

test("treats missing fingerprints as legacy caches", () => {
  const previous = state({ policyFingerprint: "" });
  expect(presentFlightState(previous, fingerprint)?.anywhere.status).toBe("error");
  expect(tripDatePolicyFingerprint(schoolBreaks)).toBe(fingerprint);
});

test("acquires a lock with an owner token and only releases that token", async () => {
  mocks.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);
  mocks.eval.mockResolvedValue(1);

  const first = await acquireRefreshLock("token-a");
  const second = await acquireRefreshLock("token-b");
  await releaseRefreshLock("token-a");

  expect(first).toEqual({ acquired: true, token: "token-a" });
  expect(second).toEqual({ acquired: false, token: "token-b" });
  expect(mocks.set).toHaveBeenNthCalledWith(1, LOCK_KEY, "token-a", { nx: true, ex: LOCK_TTL_SECONDS });
  expect(mocks.eval).toHaveBeenCalledWith(expect.stringContaining("redis.call('get'"), [LOCK_KEY], ["token-a"]);
  expect(mocks.del).not.toHaveBeenCalled();
});

test("round-trips flight state through KV when enabled", async () => {
  const stored = state();
  mocks.get.mockResolvedValue(stored);
  await writeFlightState(stored);
  await expect(readFlightState()).resolves.toEqual(stored);
});
