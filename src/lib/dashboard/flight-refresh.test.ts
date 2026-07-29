import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquireRefreshLock: vi.fn(),
  getAnywhereDashboard: vi.fn(),
  getFlightDashboard: vi.fn(),
  readFlightState: vi.fn(),
  releaseRefreshLock: vi.fn(),
  writeFlightState: vi.fn(),
}));

vi.mock("./flight-store", () => ({
  acquireRefreshLock: mocks.acquireRefreshLock,
  readFlightState: mocks.readFlightState,
  releaseRefreshLock: mocks.releaseRefreshLock,
  writeFlightState: mocks.writeFlightState,
}));

vi.mock("./flights-anywhere", () => ({
  getAnywhereDashboard: mocks.getAnywhereDashboard,
}));

vi.mock("./flights", () => ({
  getFlightDashboard: mocks.getFlightDashboard,
}));

import { refreshAnywhereSeason } from "./flight-refresh";

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

test("refreshes the selected season without refreshing international flights", async () => {
  mocks.acquireRefreshLock.mockResolvedValue(true);
  mocks.readFlightState.mockResolvedValue({
    flights: [{ origin: "DFW", destination: "CRK", label: "Clark", fetchedAt: "2026-07-29T00:00:00.000Z", amount: 900, currency: "USD", departureDate: "2027-06-18", returnDate: "2027-07-09", stops: 1, status: "available" }],
    anywhere: { status: "ok", value: [] },
    anywhereSeasonLabel: "Fall Break",
    fetchedAt: "2026-07-29T00:00:00.000Z",
  });
  mocks.getAnywhereDashboard.mockResolvedValue({ status: "ok", value: [] });

  await expect(refreshAnywhereSeason("Winter Break")).resolves.toEqual({ ok: true });

  expect(mocks.getAnywhereDashboard).toHaveBeenCalledWith([{ label: "Winter Break", departureDate: "2026-12-19", returnDate: "2027-01-06" }]);
  expect(mocks.getFlightDashboard).not.toHaveBeenCalled();
  expect(mocks.writeFlightState).toHaveBeenCalledWith(expect.objectContaining({
    flights: expect.arrayContaining([expect.objectContaining({ destination: "CRK" })]),
    anywhereSeasonLabel: "Winter Break",
    anywhere: { status: "ok", value: [] },
  }));
  expect(mocks.releaseRefreshLock).toHaveBeenCalledOnce();
});
