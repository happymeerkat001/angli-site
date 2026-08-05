import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({ kv: mocks }));

import { acquireStockRefreshLock, readStockState, releaseStockRefreshLock, STATE_KEY, writeStockState } from "./stock-store";

const originalKvUrl = process.env.KV_REST_API_URL;
const state = {
  snapshot: { status: "error" as const, message: "Stock price temporarily unavailable" },
  headlines: { status: "ok" as const, value: [] },
  analysis: null,
  fetchedAt: "2026-08-05T00:00:00.000Z",
};

beforeEach(() => {
  process.env.KV_REST_API_URL = "https://kv.example.test";
});

afterEach(() => {
  vi.clearAllMocks();
  if (originalKvUrl) process.env.KV_REST_API_URL = originalKvUrl;
  else delete process.env.KV_REST_API_URL;
});

test("round-trips an atomic stock state including null analysis through KV", async () => {
  mocks.get.mockResolvedValue(state);

  await writeStockState(state);
  await expect(readStockState()).resolves.toEqual(state);

  expect(mocks.set).toHaveBeenCalledWith(STATE_KEY, state);
  expect(mocks.get).toHaveBeenCalledWith(STATE_KEY);
});

test("returns null without contacting KV when disabled", async () => {
  delete process.env.KV_REST_API_URL;

  await expect(readStockState()).resolves.toBeNull();
  expect(mocks.get).not.toHaveBeenCalled();
});

test("acquires one stock refresh lock at a time and releases it", async () => {
  mocks.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);

  await expect(acquireStockRefreshLock()).resolves.toBe(true);
  await expect(acquireStockRefreshLock()).resolves.toBe(false);
  await releaseStockRefreshLock();

  expect(mocks.set).toHaveBeenNthCalledWith(1, "dashboard:stock:lock", "1", { nx: true, ex: 60 });
  expect(mocks.set).toHaveBeenNthCalledWith(2, "dashboard:stock:lock", "1", { nx: true, ex: 60 });
  expect(mocks.del).toHaveBeenCalledWith("dashboard:stock:lock");
});
