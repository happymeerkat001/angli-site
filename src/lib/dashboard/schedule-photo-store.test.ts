import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: mocks,
}));

import { readSchedulePhotoState, writeSchedulePhotoState } from "./schedule-photo-store";

const originalKvUrl = process.env.KV_REST_API_URL;

afterEach(() => {
  vi.clearAllMocks();
  if (originalKvUrl) process.env.KV_REST_API_URL = originalKvUrl;
  else delete process.env.KV_REST_API_URL;
});

test("returns null without a configured KV store", async () => {
  delete process.env.KV_REST_API_URL;

  await expect(readSchedulePhotoState()).resolves.toBeNull();
  expect(mocks.get).not.toHaveBeenCalled();
});

test("does not write without a configured KV store", async () => {
  delete process.env.KV_REST_API_URL;

  await expect(writeSchedulePhotoState({ url: "https://example.test/photo.jpg", uploadedAt: "2026-07-25T12:00:00.000Z" })).resolves.toBeUndefined();
  expect(mocks.set).not.toHaveBeenCalled();
});

test("writes and reads the current photo state", async () => {
  process.env.KV_REST_API_URL = "https://kv.example.test";
  const state = { url: "https://example.test/photo.jpg", uploadedAt: "2026-07-25T12:00:00.000Z" };
  mocks.get.mockResolvedValue(state);

  await writeSchedulePhotoState(state);

  expect(mocks.set).toHaveBeenCalledWith("dashboard:schedule-photo:state", state);
  await expect(readSchedulePhotoState()).resolves.toEqual(state);
  expect(mocks.get).toHaveBeenCalledWith("dashboard:schedule-photo:state");
});
