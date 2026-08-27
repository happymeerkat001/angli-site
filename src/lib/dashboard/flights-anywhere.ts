import { californiaAirports, schoolBreaks } from "./config";
import { getFlexFlightSnapshot } from "./flights";
import type { AnywhereDashboardValue, AnywhereFlightOption, FareWindow, FlightSnapshot, SourceResult } from "./types";

type SerpExploreDestination = {
  name?: unknown;
  destination_airport?: { code?: unknown } | null;
  flight_price?: unknown;
  flight_duration?: unknown;
  number_of_stops?: unknown;
  start_date?: unknown;
  end_date?: unknown;
};

type SerpExploreResponse = {
  destinations?: SerpExploreDestination[];
};

export function serpApiExploreUrl(window: FareWindow, apiKey: string) {
  const params = new URLSearchParams({
    engine: "google_travel_explore",
    departure_id: "DFW",
    outbound_date: window.departureDate,
    return_date: window.returnDate,
    currency: "USD",
    hl: "en",
    api_key: apiKey,
  });

  return `https://serpapi.com/search.json?${params.toString()}`;
}

function mapExploreDestinations(destinations: SerpExploreDestination[], windowLabel: string): AnywhereFlightOption[] {
  return destinations.flatMap((destination) => {
    const amount = typeof destination.flight_price === "number" ? destination.flight_price : null;
    const durationMinutes = typeof destination.flight_duration === "number" ? destination.flight_duration : null;
    const stops = typeof destination.number_of_stops === "number" ? destination.number_of_stops : null;
    const name = typeof destination.name === "string" ? destination.name : null;
    const airportCode = typeof destination.destination_airport?.code === "string"
      ? destination.destination_airport.code
      : null;
    const departureDate = typeof destination.start_date === "string" ? destination.start_date : null;
    const returnDate = typeof destination.end_date === "string" ? destination.end_date : null;

    if (amount === null || durationMinutes === null || stops === null || !name || !airportCode || !departureDate || !returnDate) {
      return [];
    }

    return [{
      destination: name,
      airportCode,
      amount,
      currency: "USD" as const,
      durationMinutes,
      stops,
      departureDate,
      returnDate,
      windowLabel,
    }];
  });
}

function uniqueCheapestByAirport(options: AnywhereFlightOption[], limit: number): AnywhereFlightOption[] {
  const ranked = [...options].sort((a, b) => a.amount - b.amount);
  const seen = new Set<string>();
  return ranked.filter((option) => !seen.has(option.airportCode) && Boolean(seen.add(option.airportCode))).slice(0, limit);
}

export function selectTopAnywhereFlights(
  destinations: SerpExploreDestination[],
  windowLabel: string,
  limit = 4,
): AnywhereFlightOption[] {
  return uniqueCheapestByAirport(mapExploreDestinations(destinations, windowLabel), limit);
}

export function selectAnywherePile(
  destinations: SerpExploreDestination[],
  windowLabel: string,
  limit = 40,
): AnywhereFlightOption[] {
  return uniqueCheapestByAirport(mapExploreDestinations(destinations, windowLabel), limit);
}

type CaliforniaFareCandidate = {
  snapshot: FlightSnapshot;
  windowLabel: string;
};

export function selectLowestCaliforniaFare(candidates: CaliforniaFareCandidate[]): AnywhereFlightOption | null {
  const eligible = candidates.flatMap(({ snapshot, windowLabel }) => {
    if (
      snapshot.status !== "available" || snapshot.amount === null || snapshot.stops === null
      || snapshot.durationMinutes === undefined
    ) return [];

    return [{
      destination: snapshot.label,
      airportCode: snapshot.destination,
      amount: snapshot.amount,
      currency: "USD" as const,
      durationMinutes: snapshot.durationMinutes,
      stops: snapshot.stops,
      departureDate: snapshot.departureDate,
      returnDate: snapshot.returnDate,
      windowLabel,
    }];
  });

  return eligible.sort((a, b) => a.amount - b.amount)[0] ?? null;
}

export function selectCaliforniaFaresByWindow(candidates: CaliforniaFareCandidate[]) {
  return Object.fromEntries(schoolBreaks.flatMap((window) => {
    const fare = selectLowestCaliforniaFare(candidates.filter(({ windowLabel }) => windowLabel === window.label));
    return fare ? [[window.label, fare]] : [];
  })) as Record<string, AnywhereFlightOption>;
}

async function getCaliforniaFaresByWindow(windows: FareWindow[]): Promise<Record<string, AnywhereFlightOption>> {
  const apiKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  if (!apiKey) return {};

  const fetchedAt = new Date().toISOString();
  const candidates = await Promise.all(californiaAirports.flatMap((airport) => (
    windows.map(async (window) => ({
      snapshot: await getFlexFlightSnapshot(airport, apiKey, window, fetchedAt),
      windowLabel: window.label,
    }))
  )));

  return selectCaliforniaFaresByWindow(candidates);
}

export async function getAnywhereDashboard(windows: FareWindow[]): Promise<SourceResult<AnywhereDashboardValue>> {
  if (windows.length === 0) return { status: "ok", value: { sections: [], pile: [] } };
  const apiKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  if (!apiKey) return { status: "error", message: "Flight search is not connected" };

  const results = await Promise.all(windows.map(async (window) => {
    try {
      const response = await fetch(serpApiExploreUrl(window, apiKey), { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`Flight explore response: ${response.status}`);
      const data = await response.json() as SerpExploreResponse;
      return {
        window,
        failed: false,
        options: selectTopAnywhereFlights(data.destinations ?? [], window.label),
        pile: selectAnywherePile(data.destinations ?? [], window.label),
      };
    } catch (error) {
      console.error(`Flight explore unavailable for ${window.label}`, error);
      return { window, failed: true, options: [] as AnywhereFlightOption[], pile: [] as AnywhereFlightOption[] };
    }
  }));

  if (results.every((result) => result.failed)) {
    return { status: "error", message: "Flight search temporarily unavailable" };
  }

  const californiaFares = await getCaliforniaFaresByWindow(windows);
  const firstOk = results.find((result) => !result.failed);

  return {
    status: "ok",
    value: {
      sections: results.map(({ window, options }) => ({
        windowLabel: window.label,
        departureDate: window.departureDate,
        returnDate: window.returnDate,
        options: californiaFares[window.label] ? [...options, californiaFares[window.label]] : options,
      })),
      pile: firstOk?.pile ?? [],
    },
  };
}
