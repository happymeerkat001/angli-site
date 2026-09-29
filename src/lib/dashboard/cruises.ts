import { cruiseSearch, cruiseWindows, schoolBreaks } from "./config";
import { fetchCruiseLines, type ParsedCruiseSailing } from "./cruise-lines";
import type { CruiseOffer, CruiseWindowSection, FareWindow, SourceResult } from "./types";

export { carnivalSearchUrl, parseCarnivalItineraries, type ParsedCruiseSailing } from "./cruise-lines";

export function cashToPoints(amount: number, centsPerPoint = cruiseSearch.pointsCentsPerPoint) {
  return Math.round((amount * 100) / centsPerPoint);
}

function shiftIsoDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function sailingFitsWindow(departureDate: string, returnDate: string, window: FareWindow, flexDays = cruiseSearch.flexDays) {
  const earliestDeparture = shiftIsoDate(window.departureDate, -flexDays);
  const latestReturn = shiftIsoDate(window.returnDate, flexDays);
  return departureDate >= earliestDeparture && returnDate <= latestReturn && returnDate > departureDate;
}

const schoolBreakLabels = new Set(schoolBreaks.map((window) => window.label));

export function sailingDepartsInSeason(departureDate: string, window: FareWindow) {
  return departureDate >= window.departureDate && departureDate <= window.returnDate;
}

function sailingMatchesWindow(sailing: ParsedCruiseSailing, window: FareWindow) {
  if (schoolBreakLabels.has(window.label)) {
    return sailingFitsWindow(sailing.departureDate, sailing.returnDate, window);
  }
  return sailingDepartsInSeason(sailing.departureDate, window);
}

export function selectCruiseWindows(
  sailings: ParsedCruiseSailing[],
  windows: FareWindow[] = cruiseWindows,
): CruiseWindowSection[] {
  return windows.map((window) => {
    const seen = new Set<string>();
    const offers = sailings
      .filter((sailing) => (
        sailing.roundtrip
        && sailing.departurePortCode === cruiseSearch.portCode
        && sailingMatchesWindow(sailing, window)
      ))
      .sort((a, b) => a.cashAmount - b.cashAmount || a.departureDate.localeCompare(b.departureDate))
      .filter((sailing) => !seen.has(sailing.id) && Boolean(seen.add(sailing.id)))
      .slice(0, cruiseSearch.offersPerWindow)
      .map((sailing): CruiseOffer => ({
        id: sailing.id,
        line: sailing.line,
        ship: sailing.ship,
        title: sailing.title,
        departurePort: "Galveston",
        departureDate: sailing.departureDate,
        returnDate: sailing.returnDate,
        nights: sailing.nights,
        cashAmount: sailing.cashAmount,
        currency: "USD",
        points: cashToPoints(sailing.cashAmount),
        url: sailing.url,
        windowLabel: window.label,
      }));

    return {
      windowLabel: window.label,
      departureDate: window.departureDate,
      returnDate: window.returnDate,
      offers,
    };
  });
}

export async function getCruiseDashboard(): Promise<SourceResult<CruiseWindowSection[]>> {
  const lines = await fetchCruiseLines();
  if (!lines.some((line) => line.ok)) {
    return { status: "error", message: "Cruise prices are temporarily unavailable" };
  }
  return { status: "ok", value: selectCruiseWindows(lines.flatMap((line) => line.sailings)) };
}
