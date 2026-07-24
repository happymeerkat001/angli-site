"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { refreshFlightState } from "@/lib/dashboard/flight-refresh";

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
