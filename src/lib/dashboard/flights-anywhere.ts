import { schoolBreaks } from "./config";
import type { AnywhereFlightOption, FareWindow, SourceResult } from "./types";

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

export function selectTopAnywhereFlights(
  destinations: SerpExploreDestination[],
  windowLabel: string,
  maxDurationMinutes = 360,
  limit = 5,
): AnywhereFlightOption[] {
  return destinations
    .flatMap((destination) => {
      const amount = typeof destination.flight_price === "number" ? destination.flight_price : null;
      const durationMinutes = typeof destination.flight_duration === "number" ? destination.flight_duration : null;
      const stops = typeof destination.number_of_stops === "number" ? destination.number_of_stops : null;
      const name = typeof destination.name === "string" ? destination.name : null;
      const airportCode = typeof destination.destination_airport?.code === "string"
        ? destination.destination_airport.code
        : null;
      const departureDate = typeof destination.start_date === "string" ? destination.start_date : null;
      const returnDate = typeof destination.end_date === "string" ? destination.end_date : null;

      if (
        amount === null || durationMinutes === null || stops === null || durationMinutes > maxDurationMinutes
        || !name || !airportCode || !departureDate || !returnDate
      ) return [];

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
    })
    .sort((a, b) => a.amount - b.amount)
    .slice(0, limit);
}

export async function getAnywhereDashboard(): Promise<SourceResult<AnywhereFlightOption[]>> {
  const apiKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  if (!apiKey) return { status: "error", message: "Flight search is not connected" };

  const results = await Promise.all(schoolBreaks.map(async (window) => {
    try {
      const response = await fetch(serpApiExploreUrl(window, apiKey), {
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Flight explore response: ${response.status}`);

      const data = await response.json() as SerpExploreResponse;
      return { failed: false, options: selectTopAnywhereFlights(data.destinations ?? [], window.label) };
    } catch (error) {
      console.error(`Flight explore unavailable for ${window.label}`, error);
      return { failed: true, options: [] as AnywhereFlightOption[] };
    }
  }));

  if (results.every((result) => result.failed)) {
    return { status: "error", message: "Flight search temporarily unavailable" };
  }

  return {
    status: "ok",
    value: results
      .flatMap((result) => result.options)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 5),
  };
}
