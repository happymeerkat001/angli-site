import { afterEach, expect, test, vi } from "vitest";
import { schoolBreaks } from "./config";
import { currentPolicyFingerprint } from "./flight-store";
import { FRONTIER_SOURCE_VERSION } from "./flights-frontier";
import { orderTripPairsForSearch, listValidTripPairs, selectSearchBatch } from "./trip-dates";

const mocks = vi.hoisted(() => ({
  acquireRefreshLock: vi.fn(),
  getAnywhereDashboard: vi.fn(),
  getFlightDashboard: vi.fn(),
  getFrontierDashboard: vi.fn(),
  readFlightState: vi.fn(),
  releaseRefreshLock: vi.fn(),
  writeFlightState: vi.fn(),
}));

vi.mock("./flight-store", async () => {
  const actual = await vi.importActual<typeof import("./flight-store")>("./flight-store");
  return {
    ...actual,
    acquireRefreshLock: mocks.acquireRefreshLock,
    readFlightState: mocks.readFlightState,
    releaseRefreshLock: mocks.releaseRefreshLock,
    writeFlightState: mocks.writeFlightState,
  };
});

vi.mock("./flights-anywhere", () => ({
  getAnywhereDashboard: mocks.getAnywhereDashboard,
}));

vi.mock("./flights", () => ({
  getFlightDashboard: mocks.getFlightDashboard,
}));

vi.mock("./flights-frontier", async () => {
  const actual = await vi.importActual<typeof import("./flights-frontier")>("./flights-frontier");
  return {
    ...actual,
    getFrontierDashboard: mocks.getFrontierDashboard,
  };
});

import { refreshAnywhereSeason, refreshFlightState, refreshFrontierSeason, refreshPointsSeason, selectAnywhereSeason } from "./flight-refresh";

const fingerprint = currentPolicyFingerprint();
const now = new Date("2026-09-11T12:00:00.000Z");
const winter = schoolBreaks[2];
const firstWinterBatch = selectSearchBatch(orderTripPairsForSearch(listValidTripPairs(winter, "2026-09-11"), winter), 0).batch;
const priorPoints = { status: "ok" as const, value: [{ airportCode: "AUS", destination: "Austin", amount: 200, currency: "USD" as const, durationMinutes: 60, stops: 0, departureDate: "2026-12-25", returnDate: "2027-01-01", windowLabel: "Winter Break", program: "Chase" as const, points: 13333 }] };
const priorFrontier = { status: "ok" as const, value: [{ origin: "DAL", airportCode: "DEN", destination: "Denver", amount: 88, currency: "USD" as const, durationMinutes: null, stops: null, departureDate: "2027-03-16", returnDate: "2027-03-20", tripType: "round-trip" as const, windowLabel: "Spring Break" }] };

function previousState() {
  return {
    flights: [{ origin: "DFW", destination: "CRK", label: "Clark", fetchedAt: "2026-07-29T00:00:00.000Z", amount: 900, currency: "USD", departureDate: "2027-06-18", returnDate: "2027-07-09", stops: 1, status: "available" }],
    anywhere: { status: "ok" as const, value: [{ windowLabel: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13", options: [{ airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD" as const, durationMinutes: 63, stops: 1, departureDate: "2026-10-10", returnDate: "2026-10-13", windowLabel: "Fall Break" }] }] },
    anywhereSeasonLabel: "Fall Break",
    anywherePile: [
      { airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD" as const, durationMinutes: 63, stops: 1, departureDate: "2027-03-13", returnDate: "2027-03-16", windowLabel: "Spring Break" },
      { airportCode: "DEN", destination: "Denver", amount: 360, currency: "USD" as const, durationMinutes: 120, stops: 0, departureDate: "2027-03-13", returnDate: "2027-03-16", windowLabel: "Spring Break" },
    ],
    anywherePileSeasonLabel: "Spring Break",
    anywherePileFingerprint: fingerprint,
    fetchedAt: "2026-07-29T00:00:00.000Z",
    points: priorPoints,
    pointsSeasonLabel: "Winter Break",
    pointsFetchedAt: "2026-07-28T00:00:00.000Z",
    frontier: priorFrontier,
    frontierSeasonLabel: "Winter Break",
    frontierFetchedAt: "2026-07-28T00:00:00.000Z",
    frontierSourceVersion: FRONTIER_SOURCE_VERSION,
    frontierCoverageBySeason: {},
    policyFingerprint: fingerprint,
    coverageBySeason: {},
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

test("refreshes the selected season without refreshing international flights or the new rows", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue(previousState());
  mocks.getAnywhereDashboard.mockResolvedValue({ status: "ok", value: { sections: [], pile: [], incomplete: false, timedOut: false, failedSearches: 0, searchedPairs: [] } });

  await expect(refreshAnywhereSeason("Winter Break", now)).resolves.toEqual({ ok: true });

  expect(mocks.getAnywhereDashboard).toHaveBeenCalledWith(expect.objectContaining({
    schoolBreak: expect.objectContaining({ label: "Winter Break", departureDate: "2026-12-19", returnDate: "2027-01-04" }),
    datePairs: firstWinterBatch,
  }));
  expect(firstWinterBatch).toHaveLength(5);
  expect(firstWinterBatch[0]).toEqual({ departureDate: "2026-12-25", returnDate: "2027-01-01", nights: 7 });
  expect(mocks.getFlightDashboard).not.toHaveBeenCalled();
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    flights: expect.arrayContaining([expect.objectContaining({ destination: "CRK" })]),
    anywhereSeasonLabel: "Winter Break",
    anywhere: { status: "ok", value: [] },
    points: priorPoints,
    frontier: priorFrontier,
    policyFingerprint: fingerprint,
  }));
  expect(mocks.releaseRefreshLock).toHaveBeenCalledWith("lock-1");
});

test("re-ranks a warm cash pile without another explore search", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue({
    ...previousState(),
    anywhereSeasonLabel: "Spring Break",
    anywherePileSeasonLabel: "Spring Break",
    anywhere: { status: "ok", value: [{ windowLabel: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21", options: [{ airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD", durationMinutes: 63, stops: 1, departureDate: "2027-03-13", returnDate: "2027-03-16", windowLabel: "Spring Break" }] }] },
  });

  await expect(refreshPointsSeason(now)).resolves.toEqual({ ok: true, fetched: false });
  expect(mocks.getAnywhereDashboard).not.toHaveBeenCalled();
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    pointsSeasonLabel: "Spring Break",
    anywhere: expect.objectContaining({ status: "ok" }),
    points: { status: "ok", value: expect.arrayContaining([expect.objectContaining({ airportCode: "DEN" })]) },
  }));
});

test("fetches explore for points only when the pile is cold and does not rewrite cash sections", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  const previous = {
    ...previousState(),
    anywhereSeasonLabel: "Spring Break",
    anywherePile: [],
    anywherePileSeasonLabel: "",
    anywherePileFingerprint: "",
  };
  mocks.readFlightState.mockResolvedValue(previous);
  mocks.getAnywhereDashboard.mockResolvedValue({
    status: "ok",
    value: {
      sections: [{ windowLabel: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21", options: [] }],
      pile: [{ airportCode: "DEN", destination: "Denver", amount: 360, currency: "USD", durationMinutes: 120, stops: 0, departureDate: "2027-03-13", returnDate: "2027-03-16", windowLabel: "Spring Break" }],
      incomplete: false,
      timedOut: false,
      failedSearches: 0,
      searchedPairs: [{ departureDate: "2027-03-13", returnDate: "2027-03-16" }],
    },
  });

  await expect(refreshPointsSeason(now)).resolves.toEqual({ ok: true, fetched: true });
  expect(mocks.getAnywhereDashboard).toHaveBeenCalledWith(expect.objectContaining({ includeCalifornia: false }));
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    anywhere: previous.anywhere,
    anywherePile: [expect.objectContaining({ airportCode: "DEN" })],
    points: { status: "ok", value: [expect.objectContaining({ airportCode: "DEN" })] },
  }));
});

test("does not reuse a pile from another season or an old policy", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue({
    ...previousState(),
    anywhereSeasonLabel: "Spring Break",
    anywherePileFingerprint: "old-policy",
  });
  mocks.getAnywhereDashboard.mockResolvedValue({
    status: "ok",
    value: { sections: [], pile: [], incomplete: false, timedOut: false, failedSearches: 0, searchedPairs: [] },
  });

  await expect(refreshPointsSeason(now)).resolves.toEqual({ ok: true, fetched: true });
  expect(mocks.getAnywhereDashboard).toHaveBeenCalledOnce();
});

test("keeps prior Frontier cards with their true season and timestamp when the search fails", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue(previousState());
  mocks.getFrontierDashboard.mockResolvedValue({ status: "error", message: "Frontier search temporarily unavailable" });

  await expect(refreshFrontierSeason(now)).resolves.toEqual({ ok: true });
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    frontier: priorFrontier,
    frontierSeasonLabel: "Winter Break",
    frontierFetchedAt: "2026-07-28T00:00:00.000Z",
  }));
});

test("keeps prior Frontier cards when confirmation times out", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue(previousState());
  mocks.getFrontierDashboard.mockResolvedValue({ status: "error", message: "Frontier search timed out before returning qualifying trips" });

  await expect(refreshFrontierSeason(now)).resolves.toEqual({ ok: true });
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    frontier: priorFrontier,
    frontierSeasonLabel: "Winter Break",
    frontierFetchedAt: "2026-07-28T00:00:00.000Z",
  }));
});

test("searches an independent Frontier batch starting with Chicago under a strict request budget", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue({
    ...previousState(),
    anywhereSeasonLabel: "Winter Break",
  });
  mocks.getFrontierDashboard.mockResolvedValue({
    status: "ok",
    value: {
      options: [],
      incomplete: false,
      timedOut: false,
      failedSearches: 0,
      requestCount: 4,
      limitedOutboundTokens: false,
      searchedPairs: [],
      searchedDestinations: ["ORD", "MDW"],
    },
  });

  await expect(refreshFrontierSeason(now)).resolves.toEqual({ ok: true });
  expect(mocks.getFrontierDashboard).toHaveBeenCalledWith(expect.objectContaining({
    combos: [
      { destination: { destination: "ORD", label: "Chicago O'Hare" }, pair: expect.objectContaining({ departureDate: "2026-12-25", returnDate: "2027-01-01" }) },
      { destination: { destination: "MDW", label: "Chicago Midway" }, pair: expect.objectContaining({ departureDate: "2026-12-25", returnDate: "2027-01-01" }) },
    ],
    maxRequests: 6,
    budgetMs: 40_000,
  }));
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    frontierSeasonLabel: "Winter Break",
    frontierFetchedAt: now.toISOString(),
    frontierSourceVersion: FRONTIER_SOURCE_VERSION,
  }));
});

test("selecting a season updates the window without any provider searches", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue(previousState());

  await expect(selectAnywhereSeason("Winter Break", now)).resolves.toEqual({ ok: true });

  expect(mocks.getAnywhereDashboard).not.toHaveBeenCalled();
  expect(mocks.getFlightDashboard).not.toHaveBeenCalled();
  expect(mocks.getFrontierDashboard).not.toHaveBeenCalled();
  expect(mocks.acquireRefreshLock).toHaveBeenCalledOnce();
  expect(mocks.releaseRefreshLock).toHaveBeenCalledWith("lock-1");
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    anywhereSeasonLabel: "Winter Break",
    anywhere: previousState().anywhere,
    points: priorPoints,
    frontier: priorFrontier,
    fetchedAt: "2026-07-29T00:00:00.000Z",
    flights: expect.arrayContaining([expect.objectContaining({ destination: "CRK" })]),
  }));
});

test("does not overwrite fares or report success when a concurrent refresh holds the lock", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: false, token: "lock-2" });
  mocks.readFlightState.mockResolvedValue(previousState());

  await expect(selectAnywhereSeason("Winter Break", now)).resolves.toEqual({
    ok: false,
    reason: "refresh already in progress",
  });
  expect(mocks.writeFlightState).not.toHaveBeenCalled();
  expect(mocks.getAnywhereDashboard).not.toHaveBeenCalled();
  expect(mocks.getFlightDashboard).not.toHaveBeenCalled();
  expect(mocks.getFrontierDashboard).not.toHaveBeenCalled();
  expect(mocks.releaseRefreshLock).not.toHaveBeenCalled();
});

test("international refresh does not search anywhere, points, or Frontier", async () => {
  mocks.acquireRefreshLock.mockResolvedValue({ acquired: true, token: "lock-1" });
  mocks.readFlightState.mockResolvedValue(previousState());
  mocks.getFlightDashboard.mockResolvedValue([{ origin: "DFW", destination: "CRK", label: "Clark", fetchedAt: now.toISOString(), amount: 900, currency: "USD", departureDate: "2027-06-18", returnDate: "2027-07-09", stops: 1, status: "available" }]);

  await expect(refreshFlightState(now)).resolves.toEqual({ ok: true });
  expect(mocks.getFlightDashboard).toHaveBeenCalledOnce();
  expect(mocks.getAnywhereDashboard).not.toHaveBeenCalled();
  expect(mocks.getFrontierDashboard).not.toHaveBeenCalled();
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    anywhere: previousState().anywhere,
    points: priorPoints,
    frontier: priorFrontier,
    anywhereSeasonLabel: "Fall Break",
  }));
});
