"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { refreshFlightState } from "@/lib/dashboard/flight-refresh";
import { readSchedulePhotoState, writeSchedulePhotoState } from "@/lib/dashboard/schedule-photo-store";

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

export async function refreshStockAnalysis() {
  revalidateTag("stock-analysis");
}

export async function refreshNews() {
  revalidateTag("news");
}
