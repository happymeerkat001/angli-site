import { afterEach, expect, test, vi } from "vitest";

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

vi.mock("./flights-frontier", () => ({
  getFrontierDashboard: mocks.getFrontierDashboard,
}));

import { refreshAnywhereSeason, refreshFrontierSeason, refreshPointsSeason } from "./flight-refresh";

const priorPoints = { status: "ok" as const, value: [{ airportCode: "AUS", destination: "Austin", amount: 200, currency: "USD" as const, durationMinutes: 60, stops: 0, departureDate: "2026-12-19", returnDate: "2027-01-06", windowLabel: "Winter Break", program: "Chase" as const, points: 13333 }] };
const priorFrontier = { status: "ok" as const, value: [{ origin: "DFW", airportCode: "LAS", destination: "Las Vegas", amount: 60, currency: "USD" as const, durationMinutes: null, stops: null, departureDate: "2026-12-20", returnDate: null, tripType: "one-way" as const, windowLabel: "Winter Break" }] };

function previousState() {
  return {
    flights: [{ origin: "DFW", destination: "CRK", label: "Clark", fetchedAt: "2026-07-29T00:00:00.000Z", amount: 900, currency: "USD", departureDate: "2027-06-18", returnDate: "2027-07-09", stops: 1, status: "available" }],
    anywhere: { status: "ok" as const, value: [{ windowLabel: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13", options: [{ airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD" as const, durationMinutes: 63, stops: 1, departureDate: "2026-10-10", returnDate: "2026-10-13", windowLabel: "Fall Break" }] }] },
    anywhereSeasonLabel: "Fall Break",
    anywherePile: [
      { airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD" as const, durationMinutes: 63, stops: 1, departureDate: "2027-03-13", returnDate: "2027-03-21", windowLabel: "Spring Break" },
      { airportCode: "DEN", destination: "Denver", amount: 360, currency: "USD" as const, durationMinutes: 120, stops: 0, departureDate: "2027-03-13", returnDate: "2027-03-21", windowLabel: "Spring Break" },
    ],
    anywherePileSeasonLabel: "Spring Break",
    fetchedAt: "2026-07-29T00:00:00.000Z",
    points: priorPoints,
    pointsSeasonLabel: "Winter Break",
    pointsFetchedAt: "2026-07-28T00:00:00.000Z",
    frontier: priorFrontier,
    frontierSeasonLabel: "Winter Break",
    frontierFetchedAt: "2026-07-28T00:00:00.000Z",
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

test("refreshes the selected season without refreshing international flights or the new rows", async () => {
  mocks.acquireRefreshLock.mockResolvedValue(true);
  mocks.readFlightState.mockResolvedValue(previousState());
  mocks.getAnywhereDashboard.mockResolvedValue({ status: "ok", value: { sections: [], pile: [] } });

  await expect(refreshAnywhereSeason("Winter Break")).resolves.toEqual({ ok: true });

  expect(mocks.getAnywhereDashboard).toHaveBeenCalledWith([{ label: "Winter Break", departureDate: "2026-12-19", returnDate: "2027-01-06" }]);
  expect(mocks.getFlightDashboard).not.toHaveBeenCalled();
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    flights: expect.arrayContaining([expect.objectContaining({ destination: "CRK" })]),
    anywhereSeasonLabel: "Winter Break",
    anywhere: { status: "ok", value: [] },
    points: priorPoints,
    frontier: priorFrontier,
  }));
  expect(mocks.releaseRefreshLock).toHaveBeenCalledOnce();
});

test("re-ranks a warm cash pile without another explore search", async () => {
  mocks.acquireRefreshLock.mockResolvedValue(true);
  mocks.readFlightState.mockResolvedValue({
    ...previousState(),
    anywhereSeasonLabel: "Spring Break",
    anywhere: { status: "ok", value: [{ windowLabel: "Spring Break", departureDate: "2027-03-13", returnDate: "2027-03-21", options: [{ airportCode: "AUS", destination: "Austin", amount: 253, currency: "USD", durationMinutes: 63, stops: 1, departureDate: "2027-03-13", returnDate: "2027-03-21", windowLabel: "Spring Break" }] }] },
  });

  await expect(refreshPointsSeason()).resolves.toEqual({ ok: true, fetched: false });
  expect(mocks.getAnywhereDashboard).not.toHaveBeenCalled();
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    pointsSeasonLabel: "Spring Break",
    anywhere: expect.objectContaining({ status: "ok" }),
    points: { status: "ok", value: expect.arrayContaining([expect.objectContaining({ airportCode: "DEN" })]) },
  }));
});

test("fetches explore for points only when the pile is cold and does not rewrite cash sections", async () => {
  mocks.acquireRefreshLock.mockResolvedValue(true);
  const previous = { ...previousState(), anywherePile: [], anywherePileSeasonLabel: "" };
  mocks.readFlightState.mockResolvedValue(previous);
  mocks.getAnywhereDashboard.mockResolvedValue({
    status: "ok",
    value: {
      sections: [{ windowLabel: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13", options: [] }],
      pile: [{ airportCode: "DEN", destination: "Denver", amount: 360, currency: "USD", durationMinutes: 120, stops: 0, departureDate: "2026-10-10", returnDate: "2026-10-13", windowLabel: "Fall Break" }],
    },
  });

  await expect(refreshPointsSeason()).resolves.toEqual({ ok: true, fetched: true });
  expect(mocks.getAnywhereDashboard).toHaveBeenCalledOnce();
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    anywhere: previous.anywhere,
    anywherePile: [expect.objectContaining({ airportCode: "DEN" })],
    points: { status: "ok", value: [expect.objectContaining({ airportCode: "DEN" })] },
  }));
});

test("keeps prior Frontier cards when the deals board fails", async () => {
  mocks.acquireRefreshLock.mockResolvedValue(true);
  mocks.readFlightState.mockResolvedValue(previousState());
  mocks.getFrontierDashboard.mockResolvedValue({ status: "error", message: "Frontier deals temporarily unavailable" });

  await expect(refreshFrontierSeason()).resolves.toEqual({ ok: true });
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    frontier: priorFrontier,
    frontierSeasonLabel: "Fall Break",
  }));
});
