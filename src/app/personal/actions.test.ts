import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  put: vi.fn(),
  del: vi.fn(),
  readSchedulePhotoState: vi.fn(),
  writeSchedulePhotoState: vi.fn(),
  refreshFlightState: vi.fn(),
  refreshAnywhereSeason: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: mocks.put,
  del: mocks.del,
}));

vi.mock("@/lib/dashboard/schedule-photo-store", () => ({
  readSchedulePhotoState: mocks.readSchedulePhotoState,
  writeSchedulePhotoState: mocks.writeSchedulePhotoState,
}));

vi.mock("@/lib/dashboard/flight-refresh", () => ({
  refreshFlightState: mocks.refreshFlightState,
  refreshAnywhereSeason: mocks.refreshAnywhereSeason,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));

import { setAnywhereSeason, uploadSchedulePhoto } from "./actions";

const originalKvUrl = process.env.KV_REST_API_URL;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

function photoFormData(file: File) {
  const formData = new FormData();
  formData.set("photo", file);
  return formData;
}

beforeEach(() => {
  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
});

afterEach(() => {
  vi.clearAllMocks();
  if (originalKvUrl) process.env.KV_REST_API_URL = originalKvUrl;
  else delete process.env.KV_REST_API_URL;
  if (originalBlobToken) process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  else delete process.env.BLOB_READ_WRITE_TOKEN;
});

test("stores a new image, updates state, deletes the replaced blob, and revalidates", async () => {
  const previous = { url: "https://blob.example.test/old.jpg", uploadedAt: "2026-07-18T12:00:00.000Z" };
  mocks.readSchedulePhotoState.mockResolvedValue(previous);
  mocks.put.mockResolvedValue({ url: "https://blob.example.test/current.jpg" });

  const result = await uploadSchedulePhoto({ error: null }, photoFormData(new File(["photo"], "schedule.jpg", { type: "image/jpeg" })));

  expect(result).toEqual({ error: null });
  expect(mocks.put).toHaveBeenCalledWith(expect.stringMatching(/^schedule-photo\/.+-schedule\.jpg$/), expect.any(File), { access: "public" });
  expect(mocks.writeSchedulePhotoState).toHaveBeenCalledWith({
    url: "https://blob.example.test/current.jpg",
    uploadedAt: expect.any(String),
  });
  expect(mocks.del).toHaveBeenCalledWith(previous.url);
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/personal");
});

test("rejects a missing photo before any storage call", async () => {
  const result = await uploadSchedulePhoto({ error: null }, new FormData());

  expect(result).toEqual({ error: "Select an image to upload." });
  expect(mocks.put).not.toHaveBeenCalled();
  expect(mocks.writeSchedulePhotoState).not.toHaveBeenCalled();
  expect(mocks.del).not.toHaveBeenCalled();
});

test("rejects a non-image photo before any storage call", async () => {
  const result = await uploadSchedulePhoto(
    { error: null },
    photoFormData(new File(["notes"], "schedule.txt", { type: "text/plain" })),
  );

  expect(result).toEqual({ error: "Only image files can be uploaded." });
  expect(mocks.put).not.toHaveBeenCalled();
  expect(mocks.writeSchedulePhotoState).not.toHaveBeenCalled();
  expect(mocks.del).not.toHaveBeenCalled();
});

test("returns a friendly error when KV or Blob storage is not configured, for any image type", async () => {
  delete process.env.KV_REST_API_URL;

  const result = await uploadSchedulePhoto(
    { error: null },
    photoFormData(new File(["photo"], "schedule.jpg", { type: "image/jpeg" })),
  );

  expect(result).toEqual({ error: "Schedule photo uploads are not configured." });
  expect(mocks.put).not.toHaveBeenCalled();
  expect(mocks.writeSchedulePhotoState).not.toHaveBeenCalled();
});

test("returns a friendly error instead of throwing when the blob upload itself fails", async () => {
  mocks.readSchedulePhotoState.mockResolvedValue(null);
  mocks.put.mockRejectedValue(new Error("network blip"));

  const result = await uploadSchedulePhoto(
    { error: null },
    photoFormData(new File(["photo"], "schedule.jpg", { type: "image/jpeg" })),
  );

  expect(result).toEqual({ error: "Upload failed. Please try again." });
  expect(mocks.writeSchedulePhotoState).not.toHaveBeenCalled();
});

test("keeps the first uploaded photo without deleting a nonexistent previous blob", async () => {
  mocks.readSchedulePhotoState.mockResolvedValue(null);
  mocks.put.mockResolvedValue({ url: "https://blob.example.test/first.jpg" });

  const result = await uploadSchedulePhoto(
    { error: null },
    photoFormData(new File(["photo"], "schedule.png", { type: "image/png" })),
  );

  expect(result).toEqual({ error: null });
  expect(mocks.writeSchedulePhotoState).toHaveBeenCalledWith({
    url: "https://blob.example.test/first.jpg",
    uploadedAt: expect.any(String),
  });
  expect(mocks.del).not.toHaveBeenCalled();
});

test("refreshes only the submitted anywhere season and revalidates the personal page", async () => {
  const formData = new FormData();
  formData.set("season", "Winter Break");

  await setAnywhereSeason(formData);

  expect(mocks.refreshAnywhereSeason).toHaveBeenCalledWith("Winter Break");
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/personal");
});
