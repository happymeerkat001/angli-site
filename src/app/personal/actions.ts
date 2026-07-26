"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { refreshFlightState } from "@/lib/dashboard/flight-refresh";
import { readSchedulePhotoState, writeSchedulePhotoState } from "@/lib/dashboard/schedule-photo-store";

export async function uploadSchedulePhoto(formData: FormData) {
  const photo = formData.get("photo");
  if (!photo || typeof photo === "string") throw new Error("Select an image to upload.");
  if (!photo.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (!process.env.KV_REST_API_URL || !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Schedule photo uploads are not configured.");
  }

  const previous = await readSchedulePhotoState();
  const filename = photo.name.replace(/[^a-zA-Z0-9._-]/g, "-") || "schedule-photo";
  const blob = await put(`schedule-photo/${Date.now()}-${filename}`, photo, { access: "public" });
  await writeSchedulePhotoState({ url: blob.url, uploadedAt: new Date().toISOString() });
  if (previous) await del(previous.url);
  revalidatePath("/personal");
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
