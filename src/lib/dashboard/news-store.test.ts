import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({ kv: mocks }));

import { acquireNewsRefreshLock, readNewsState, releaseNewsRefreshLock, STATE_KEY, writeNewsState } from "./news-store";

const originalKvUrl = process.env.KV_REST_API_URL;
const state = {
  headlines: [{ id: "one", title: "Headline", url: "https://example.com/one", publisher: "Example", publishedAt: null, sourceId: "google-news" as const }],
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

test("round-trips news state through KV when enabled", async () => {
  mocks.get.mockResolvedValue(state);

  await writeNewsState(state);
  await expect(readNewsState()).resolves.toEqual(state);

  expect(mocks.set).toHaveBeenCalledWith(STATE_KEY, state);
  expect(mocks.get).toHaveBeenCalledWith(STATE_KEY);
});

test("returns null without contacting KV when disabled", async () => {
  delete process.env.KV_REST_API_URL;

  await expect(readNewsState()).resolves.toBeNull();
  expect(mocks.get).not.toHaveBeenCalled();
});

test("acquires one news refresh lock at a time and releases it", async () => {
  mocks.set.mockResolvedValueOnce("OK").mockResolvedValueOnce(null);

  await expect(acquireNewsRefreshLock()).resolves.toBe(true);
  await expect(acquireNewsRefreshLock()).resolves.toBe(false);
  await releaseNewsRefreshLock();

  expect(mocks.set).toHaveBeenNthCalledWith(1, "dashboard:news:lock", "1", { nx: true, ex: 60 });
  expect(mocks.set).toHaveBeenNthCalledWith(2, "dashboard:news:lock", "1", { nx: true, ex: 60 });
  expect(mocks.del).toHaveBeenCalledWith("dashboard:news:lock");
});
