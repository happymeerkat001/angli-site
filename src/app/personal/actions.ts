"use server";

import { revalidateTag } from "next/cache";

export async function refreshFlights() {
  revalidateTag("flights");
}

export async function refreshStockAnalysis() {
  revalidateTag("stock-analysis");
}

export async function refreshNews() {
  revalidateTag("news");
}
