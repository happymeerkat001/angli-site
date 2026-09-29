import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquireCruiseRefreshLock: vi.fn(),
  getCruiseDashboard: vi.fn(),
  readCruiseState: vi.fn(),
  releaseCruiseRefreshLock: vi.fn(),
  writeCruiseState: vi.fn(),
}));

vi.mock("./cruise-store", () => ({
  acquireCruiseRefreshLock: mocks.acquireCruiseRefreshLock,
  readCruiseState: mocks.readCruiseState,
  releaseCruiseRefreshLock: mocks.releaseCruiseRefreshLock,
  writeCruiseState: mocks.writeCruiseState,
}));

vi.mock("./cruises", () => ({
  getCruiseDashboard: mocks.getCruiseDashboard,
}));

import { cruiseWindows } from "./config";
import { nearestUpcomingWindow } from "./flex-dates";
import { refreshCruiseState, selectCruiseSeason } from "./cruise-refresh";

afterEach(() => {
  vi.clearAllMocks();
});

test("keeps the previous cruise snapshot when the refresh fails", async () => {
  const previous = {
    windows: { status: "ok" as const, value: [] },
    seasonLabel: "Winter 2027-28",
    fetchedAt: "2026-09-01T00:00:00.000Z",
  };
  mocks.acquireCruiseRefreshLock.mockResolvedValue(true);
  mocks.readCruiseState.mockResolvedValue(previous);
  mocks.getCruiseDashboard.mockResolvedValue({ status: "error", message: "Cruise prices are temporarily unavailable" });

  await expect(refreshCruiseState()).resolves.toEqual({ ok: true });

  expect(mocks.writeCruiseState).toHaveBeenCalledWith({
    windows: previous.windows,
    seasonLabel: "Winter 2027-28",
    fetchedAt: expect.any(String),
  });
  expect(mocks.releaseCruiseRefreshLock).toHaveBeenCalledOnce();
});

test("switches season without fetching cruise prices", async () => {
  const previous = {
    windows: { status: "ok" as const, value: [] },
    seasonLabel: "Fall Break",
    fetchedAt: "2026-09-01T00:00:00.000Z",
  };
  mocks.acquireCruiseRefreshLock.mockResolvedValue(true);
  mocks.readCruiseState.mockResolvedValue(previous);

  await expect(selectCruiseSeason("Fall 2027")).resolves.toEqual({ ok: true });

  expect(mocks.getCruiseDashboard).not.toHaveBeenCalled();
  expect(mocks.writeCruiseState).toHaveBeenCalledWith({
    windows: previous.windows,
    seasonLabel: "Fall 2027",
    fetchedAt: previous.fetchedAt,
  });
});

test("falls back to the nearest season when the saved label is unknown", async () => {
  mocks.acquireCruiseRefreshLock.mockResolvedValue(true);
  mocks.readCruiseState.mockResolvedValue(null);
  mocks.getCruiseDashboard.mockResolvedValue({ status: "ok", value: [] });

  await refreshCruiseState();

  expect(mocks.writeCruiseState).toHaveBeenCalledWith({
    windows: { status: "ok", value: [] },
    seasonLabel: nearestUpcomingWindow(new Date(), cruiseWindows).label,
    fetchedAt: expect.any(String),
  });
});

test("does not fetch when a cruise refresh is already running", async () => {
  mocks.acquireCruiseRefreshLock.mockResolvedValue(false);

  await expect(refreshCruiseState()).resolves.toEqual({ ok: false, reason: "refresh already in progress" });

  expect(mocks.getCruiseDashboard).not.toHaveBeenCalled();
  expect(mocks.releaseCruiseRefreshLock).not.toHaveBeenCalled();
});
