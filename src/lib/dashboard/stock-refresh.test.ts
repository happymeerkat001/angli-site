import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquireStockRefreshLock: vi.fn(),
  getStockAnalysis: vi.fn(),
  getStockHeadlines: vi.fn(),
  getStockSnapshot: vi.fn(),
  releaseStockRefreshLock: vi.fn(),
  writeStockState: vi.fn(),
}));

vi.mock("./stock-store", () => ({
  acquireStockRefreshLock: mocks.acquireStockRefreshLock,
  releaseStockRefreshLock: mocks.releaseStockRefreshLock,
  writeStockState: mocks.writeStockState,
}));

vi.mock("./stock", () => ({
  getStockHeadlines: mocks.getStockHeadlines,
  getStockSnapshot: mocks.getStockSnapshot,
}));

vi.mock("./stock-analysis", () => ({ getStockAnalysis: mocks.getStockAnalysis }));

import { refreshStockState } from "./stock-refresh";

const snapshot = { symbol: "NVDA", price: 180, previousClose: 175, dayChange: 5, dayChangePercent: 2.86, positionValue: 1800, unrealizedPL: 300 };
const headline = { id: "one", title: "Headline", url: "https://example.com/one", publisher: "Example", publishedAt: null, sourceId: "stock-news" };

afterEach(() => vi.clearAllMocks());

test("refreshes and persists a self-consistent stock card", async () => {
  mocks.acquireStockRefreshLock.mockResolvedValue(true);
  mocks.getStockSnapshot.mockResolvedValue({ status: "ok", value: snapshot });
  mocks.getStockHeadlines.mockResolvedValue({ status: "ok", value: [headline] });
  mocks.getStockAnalysis.mockResolvedValue({ status: "ok", value: { analysis: "Hold.", limitSellPrice: 200, fetchedAt: "2026-08-05T00:00:00.000Z" } });

  await expect(refreshStockState()).resolves.toEqual({ ok: true });

  expect(mocks.getStockAnalysis).toHaveBeenCalledWith(snapshot, [headline]);
  expect(mocks.writeStockState).toHaveBeenCalledWith({
    snapshot: { status: "ok", value: snapshot },
    headlines: { status: "ok", value: [headline] },
    analysis: { status: "ok", value: { analysis: "Hold.", limitSellPrice: 200, fetchedAt: "2026-08-05T00:00:00.000Z" } },
    fetchedAt: expect.any(String),
  });
  expect(mocks.releaseStockRefreshLock).toHaveBeenCalledOnce();
});

test("skips analysis when the stock snapshot fails", async () => {
  mocks.acquireStockRefreshLock.mockResolvedValue(true);
  mocks.getStockSnapshot.mockResolvedValue({ status: "error", message: "Stock price temporarily unavailable" });
  mocks.getStockHeadlines.mockResolvedValue({ status: "ok", value: [headline] });

  await expect(refreshStockState()).resolves.toEqual({ ok: true });

  expect(mocks.getStockAnalysis).not.toHaveBeenCalled();
  expect(mocks.writeStockState).toHaveBeenCalledWith(expect.objectContaining({
    snapshot: { status: "error", message: "Stock price temporarily unavailable" },
    analysis: null,
  }));
});

test("does not fetch when another stock refresh holds the lock", async () => {
  mocks.acquireStockRefreshLock.mockResolvedValue(false);

  await expect(refreshStockState()).resolves.toEqual({ ok: false, reason: "refresh already in progress" });

  expect(mocks.getStockSnapshot).not.toHaveBeenCalled();
  expect(mocks.getStockHeadlines).not.toHaveBeenCalled();
  expect(mocks.releaseStockRefreshLock).not.toHaveBeenCalled();
});
