import { FRONTIER_AIRLINE_IDENTITY } from "./airline-identity";
import { FRONTIER_DEALS_URL, frontierDallasOrigins } from "./config";
import { tripFitsPolicy } from "./trip-dates";
import type { FrontierDealOption, FrontierTripType, SchoolBreak, SourceResult } from "./types";

const dallasOrigins = new Set<string>(frontierDallasOrigins);

const monthIndex: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

export function parseFrontierDate(value: string): string | null {
  const match = value.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return null;
  const month = monthIndex[match[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[2].padStart(2, "0")}`;
}

export function datesOverlapWindow(dates: Array<string | null>, window: Pick<SchoolBreak, "departureDate" | "returnDate">) {
  return dates.some((date) => date !== null && date >= window.departureDate && date <= window.returnDate);
}

export function isQualifyingFrontierDeal(deal: Pick<FrontierDealOption, "tripType" | "departureDate" | "returnDate">, schoolBreak: SchoolBreak, today?: string) {
  if (deal.tripType !== "round-trip" || !deal.returnDate) return false;
  return tripFitsPolicy({ departureDate: deal.departureDate, returnDate: deal.returnDate }, schoolBreak, today);
}

export function parseFrontierDealsHtml(html: string, window: SchoolBreak, today?: string): FrontierDealOption[] {
  const startPattern = /([A-Za-z .]+),\s*([A-Za-z .]+)\s*\(([A-Z]{3})\)\s*To\s*([A-Za-z .]+),\s*([A-Za-z .]+)\s*\(([A-Z]{3})\)/gi;
  const deals: FrontierDealOption[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(startPattern)) {
    const origin = match[3];
    const destination = match[4].trim();
    const airportCode = match[6];
    const after = html.slice((match.index ?? 0) + match[0].length);
    const nextCard = after.search(/To\s+[A-Za-z .]+,\s*[A-Za-z .]+\s*\([A-Z]{3}\)/);
    const slice = html.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + (nextCard >= 0 ? nextCard : 180));
    const departing = slice.match(/Departing\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
    const returning = slice.match(/Returning\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
    const price = slice.match(/\$(\d[\d,]*)/);
    const trip = slice.match(/One-way|Round[\s-]?trip/i);
    const tripType: FrontierTripType = trip && /round/i.test(trip[0]) ? "round-trip" : "one-way";
    const departureDate = departing ? parseFrontierDate(departing[1]) : null;
    const returnDate = tripType === "round-trip" && returning ? parseFrontierDate(returning[1]) : null;
    const amount = price ? Number(price[1].replace(/,/g, "")) : NaN;
    if (!dallasOrigins.has(origin) || !departureDate || Number.isNaN(amount)) continue;
    if (!isQualifyingFrontierDeal({ tripType, departureDate, returnDate }, window, today)) continue;

    const key = `${origin}-${airportCode}-${departureDate}-${returnDate ?? "one-way"}-${amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deals.push({
      origin,
      destination,
      airportCode,
      amount,
      currency: "USD",
      durationMinutes: null,
      stops: null,
      departureDate,
      returnDate,
      tripType,
      windowLabel: window.label,
      airlineIdentity: FRONTIER_AIRLINE_IDENTITY,
    });
  }

  return deals.sort((a, b) => a.amount - b.amount).slice(0, 5);
}

export async function getFrontierDashboard(window: SchoolBreak, now = new Date()): Promise<SourceResult<FrontierDealOption[]>> {
  try {
    const response = await fetch(FRONTIER_DEALS_URL, { signal: AbortSignal.timeout(15_000), headers: { accept: "text/html" } });
    if (!response.ok) throw new Error(`Frontier deals response: ${response.status}`);
    const html = await response.text();
    return { status: "ok", value: parseFrontierDealsHtml(html, window, now.toISOString().slice(0, 10)) };
  } catch (error) {
    console.error("Frontier deals unavailable", error);
    return { status: "error", message: "Frontier deals temporarily unavailable" };
  }
}

