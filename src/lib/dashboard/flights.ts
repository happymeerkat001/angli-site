import { fareSearch, flightRoutes } from "./config";
import type { FlightRoute, FlightSnapshot } from "./types";

type SerpFlightOption = {
  price?: unknown;
  flights?: unknown;
};

type SerpFlightsResponse = {
  best_flights?: SerpFlightOption[];
  other_flights?: SerpFlightOption[];
};

type EligibleFlight = {
  amount: number;
  stops: number;
};

export function serpApiFlightsUrl(route: FlightRoute, apiKey: string) {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: route.origin,
    arrival_id: route.destination,
    outbound_date: fareSearch.departureDate,
    return_date: fareSearch.returnDate,
    type: "1",
    adults: String(fareSearch.adults),
    travel_class: "1",
    currency: "USD",
    hl: "en",
    api_key: apiKey,
  });

  return `https://serpapi.com/search.json?${params.toString()}`;
}

export function selectLowestEligibleFlight(options: SerpFlightOption[]): EligibleFlight | null {
  const eligible = options.flatMap((option) => {
    const amount = typeof option.price === "number" ? option.price : null;
    const stops = Array.isArray(option.flights) ? Math.max(0, option.flights.length - 1) : null;
    return amount !== null && stops !== null && stops <= 1 ? [{ amount, stops }] : [];
  });

  return eligible.sort((a, b) => a.amount - b.amount)[0] ?? null;
}

function unavailableSnapshot(route: FlightRoute, fetchedAt: string): FlightSnapshot {
  return {
    ...route,
    fetchedAt,
    amount: null,
    currency: null,
    departureDate: fareSearch.departureDate,
    returnDate: fareSearch.returnDate,
    stops: null,
    status: "unavailable",
  };
}

export async function getFlightDashboard(): Promise<FlightSnapshot[]> {
  const apiKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  const fetchedAt = new Date().toISOString();

  if (!apiKey) return flightRoutes.map((route) => unavailableSnapshot(route, fetchedAt));

  return Promise.all(flightRoutes.map(async (route) => {
    try {
      const response = await fetch(serpApiFlightsUrl(route, apiKey), {
        next: { revalidate: 86_400 },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Flight response: ${response.status}`);

      const data = await response.json() as SerpFlightsResponse;
      const cheapest = selectLowestEligibleFlight([
        ...(data.best_flights ?? []),
        ...(data.other_flights ?? []),
      ]);
      if (!cheapest) return unavailableSnapshot(route, fetchedAt);

      return {
        ...route,
        fetchedAt,
        amount: cheapest.amount,
        currency: "USD" as const,
        departureDate: fareSearch.departureDate,
        returnDate: fareSearch.returnDate,
        stops: cheapest.stops,
        status: "available" as const,
      };
    } catch (error) {
      console.error(`Flight fare unavailable for ${route.destination}`, error);
      return unavailableSnapshot(route, fetchedAt);
    }
  }));
}
