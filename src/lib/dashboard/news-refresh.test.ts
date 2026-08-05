import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquireNewsRefreshLock: vi.fn(),
  getNewsDashboard: vi.fn(),
  mixNewsItems: vi.fn(),
  releaseNewsRefreshLock: vi.fn(),
  writeNewsState: vi.fn(),
}));

vi.mock("./news-store", () => ({
  acquireNewsRefreshLock: mocks.acquireNewsRefreshLock,
  releaseNewsRefreshLock: mocks.releaseNewsRefreshLock,
  writeNewsState: mocks.writeNewsState,
}));

vi.mock("./news", () => ({
  getNewsDashboard: mocks.getNewsDashboard,
  mixNewsItems: mocks.mixNewsItems,
}));

import { refreshNewsState } from "./news-refresh";

const headline = { id: "one", title: "Headline", url: "https://example.com/one", publisher: "Example", publishedAt: null, sourceId: "google-news" };

afterEach(() => vi.clearAllMocks());

test("fetches, mixes, persists, and unlocks news", async () => {
  mocks.acquireNewsRefreshLock.mockResolvedValue(true);
  mocks.getNewsDashboard.mockResolvedValue({ "google-news": { status: "ok", value: [headline] } });
  mocks.mixNewsItems.mockReturnValue([headline]);

  await expect(refreshNewsState()).resolves.toEqual({ ok: true });

  expect(mocks.mixNewsItems).toHaveBeenCalledWith([headline]);
  expect(mocks.writeNewsState).toHaveBeenCalledWith({ headlines: [headline], fetchedAt: expect.any(String) });
  expect(mocks.releaseNewsRefreshLock).toHaveBeenCalledOnce();
});

test("does not fetch when another news refresh holds the lock", async () => {
  mocks.acquireNewsRefreshLock.mockResolvedValue(false);

  await expect(refreshNewsState()).resolves.toEqual({ ok: false, reason: "refresh already in progress" });

  expect(mocks.getNewsDashboard).not.toHaveBeenCalled();
  expect(mocks.writeNewsState).not.toHaveBeenCalled();
  expect(mocks.releaseNewsRefreshLock).not.toHaveBeenCalled();
});

test("persists an empty state and releases the lock when fetching news throws", async () => {
  mocks.acquireNewsRefreshLock.mockResolvedValue(true);
  mocks.getNewsDashboard.mockRejectedValue(new Error("network failure"));

  await expect(refreshNewsState()).resolves.toEqual({ ok: false, reason: "refresh failed" });

  expect(mocks.writeNewsState).toHaveBeenCalledWith({ headlines: [], fetchedAt: expect.any(String) });
  expect(mocks.releaseNewsRefreshLock).toHaveBeenCalledOnce();
});
