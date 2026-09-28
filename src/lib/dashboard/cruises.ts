import { cruiseSearch, schoolBreaks } from "./config";
import type { CruiseOffer, CruiseWindowSection, FareWindow, SourceResult } from "./types";

type CarnivalRoom = {
  price?: unknown;
  soldOut?: unknown;
  taxesAndFees?: unknown;
};

type CarnivalSailing = {
  departureDate?: unknown;
  arrivalDate?: unknown;
  rooms?: Record<string, CarnivalRoom | undefined>;
  lowestPrice?: unknown;
  sailingId?: unknown;
  sailingURL?: unknown;
};

type CarnivalItinerary = {
  roundtrip?: unknown;
  sailings?: CarnivalSailing[];
  itineraryTitle?: unknown;
  departurePortCode?: unknown;
  dur?: unknown;
  shipName?: unknown;
};

type CarnivalSearchResponse = {
  results?: {
    itineraries?: CarnivalItinerary[];
    lastPage?: unknown;
  };
};

export type ParsedCruiseSailing = {
  id: string;
  line: string;
  ship: string;
  title: string;
  departurePortCode: string;
  roundtrip: boolean;
  departureDate: string;
  returnDate: string;
  nights: number;
  cashAmount: number;
  url: string;
};

const carnivalOrigin = "https://www.carnival.com";

export function carnivalSearchUrl(pageNumber: number) {
  const params = new URLSearchParams({
    numAdults: String(cruiseSearch.adults),
    port: cruiseSearch.portCode,
    pageSize: "50",
    pageNumber: String(pageNumber),
  });
  return `${carnivalOrigin}/cruisesearch/api/search?${params.toString()}`;
}

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

function isoDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function roomFare(room: CarnivalRoom | undefined) {
  if (!room || room.soldOut === true) return null;
  const price = typeof room.price === "number" ? room.price : null;
  if (price === null || price <= 0) return null;
  const taxes = typeof room.taxesAndFees === "number" && room.taxesAndFees > 0 ? room.taxesAndFees : 0;
  return price + taxes;
}

function lowestCabinFare(sailing: CarnivalSailing) {
  const rooms = Object.values(sailing.rooms ?? {});
  const fares = rooms.flatMap((room) => {
    const fare = roomFare(room);
    return fare === null ? [] : [fare];
  });
  if (fares.length > 0) return Math.min(...fares);
  return typeof sailing.lowestPrice === "number" && sailing.lowestPrice > 0 ? sailing.lowestPrice : null;
}

function absoluteUrl(path: unknown) {
  if (typeof path !== "string" || path.length === 0) return `${carnivalOrigin}/cruisesearch/search?port=${cruiseSearch.portCode}`;
  if (path.startsWith("http")) return path;
  return `${carnivalOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function parseCarnivalItineraries(itineraries: CarnivalItinerary[]): ParsedCruiseSailing[] {
  return itineraries.flatMap((itinerary) => {
    const title = typeof itinerary.itineraryTitle === "string" ? itinerary.itineraryTitle : null;
    const ship = typeof itinerary.shipName === "string" ? itinerary.shipName : null;
    const departurePortCode = typeof itinerary.departurePortCode === "string" ? itinerary.departurePortCode : null;
    const nights = typeof itinerary.dur === "number" ? itinerary.dur : null;
    if (!title || !ship || !departurePortCode || nights === null) return [];

    return (itinerary.sailings ?? []).flatMap((sailing) => {
      const id = typeof sailing.sailingId === "string" ? sailing.sailingId : null;
      const departureDate = isoDate(sailing.departureDate);
      const returnDate = isoDate(sailing.arrivalDate);
      const cashAmount = lowestCabinFare(sailing);
      if (!id || !departureDate || !returnDate || cashAmount === null) return [];
      return [{
        id,
        line: "Carnival",
        ship,
        title,
        departurePortCode,
        roundtrip: itinerary.roundtrip === true,
        departureDate,
        returnDate,
        nights,
        cashAmount,
        url: absoluteUrl(sailing.sailingURL),
      }];
    });
  });
}

export function selectCruiseWindows(
  sailings: ParsedCruiseSailing[],
  windows: FareWindow[] = schoolBreaks,
): CruiseWindowSection[] {
  return windows.map((window) => {
    const seen = new Set<string>();
    const offers = sailings
      .filter((sailing) => (
        sailing.roundtrip
        && sailing.departurePortCode === cruiseSearch.portCode
        && sailingFitsWindow(sailing.departureDate, sailing.returnDate, window)
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

async function fetchCarnivalPage(pageNumber: number): Promise<CarnivalSearchResponse> {
  const response = await fetch(carnivalSearchUrl(pageNumber), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; angli-site/1.0; +https://angli.site)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Cruise response: ${response.status}`);
  return await response.json() as CarnivalSearchResponse;
}

export async function getCruiseDashboard(): Promise<SourceResult<CruiseWindowSection[]>> {
  try {
    const first = await fetchCarnivalPage(1);
    const lastPage = typeof first.results?.lastPage === "number" ? Math.min(first.results.lastPage, 10) : 1;
    const pages = [first];
    for (let page = 2; page <= lastPage; page += 1) pages.push(await fetchCarnivalPage(page));
    const sailings = parseCarnivalItineraries(pages.flatMap((page) => page.results?.itineraries ?? []));
    return { status: "ok", value: selectCruiseWindows(sailings) };
  } catch (error) {
    console.error("Cruise fares unavailable", error);
    return { status: "error", message: "Cruise prices are temporarily unavailable" };
  }
}
