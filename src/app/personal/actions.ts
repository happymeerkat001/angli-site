"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { refreshAnywhereSeason, refreshFlightState, refreshFrontierSeason, refreshPointsSeason, selectAnywhereSeason } from "@/lib/dashboard/flight-refresh";
import { refreshNewsState } from "@/lib/dashboard/news-refresh";
import { readSchedulePhotoState, writeSchedulePhotoState } from "@/lib/dashboard/schedule-photo-store";
import { refreshStockState } from "@/lib/dashboard/stock-refresh";

export type SchedulePhotoUploadState = { error: string | null };

export async function uploadSchedulePhoto(
  _prevState: SchedulePhotoUploadState,
  formData: FormData,
): Promise<SchedulePhotoUploadState> {
  const photo = formData.get("photo");
  if (!photo || typeof photo === "string") return { error: "Select an image to upload." };
  if (!photo.type.startsWith("image/")) return { error: "Only image files can be uploaded." };
  if (!process.env.KV_REST_API_URL || !process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "Schedule photo uploads are not configured." };
  }

  try {
    const previous = await readSchedulePhotoState();
    const filename = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-") || "schedule-photo";
    const blob = await put(`schedule-photo/${Date.now()}-${filename}`, photo, { access: "public" });
    await writeSchedulePhotoState({ url: blob.url, uploadedAt: new Date().toISOString() });
    if (previous) await del(previous.url);
    revalidatePath("/personal");
    return { error: null };
  } catch {
    return { error: "Upload failed. Please try again." };
  }
}

export async function refreshFlights() {
  await refreshFlightState();
  revalidatePath("/personal");
}

export type SeasonSelectState = { ok: true } | { ok: false; reason: string };

export async function setAnywhereSeason(
  _prevState: SeasonSelectState,
  formData: FormData,
): Promise<SeasonSelectState> {
  const season = formData.get("season");
  const result = await selectAnywhereSeason(typeof season === "string" ? season : "");
  if (result.ok) revalidatePath("/personal");
  return result;
}

export async function refreshAnywhere() {
  await refreshAnywhereSeason("");
  revalidatePath("/personal");
}

export async function refreshPoints() {
  await refreshPointsSeason();
  revalidatePath("/personal");
}

export async function refreshFrontier() {
  await refreshFrontierSeason();
  revalidatePath("/personal");
}

export async function refreshStockAnalysis() {
  await refreshStockState();
  revalidatePath("/personal");
}

export async function refreshNews() {
  await refreshNewsState();
  revalidatePath("/personal");
}
