import { fareSearch, flightRoutes, schoolBreaks } from "./config";
import type { FareWindow, FlightRoute, FlightSnapshot } from "./types";

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

const fareSearchWindow: FareWindow = {
  label: "June–July 2027",
  departureDate: fareSearch.departureDate,
  returnDate: fareSearch.returnDate,
};

export function serpApiFlightsUrl(route: FlightRoute, apiKey: string, window: FareWindow) {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: route.origin,
    arrival_id: route.destination,
    outbound_date: window.departureDate,
    return_date: window.returnDate,
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

function unavailableSnapshot(route: FlightRoute, fetchedAt: string, window: FareWindow): FlightSnapshot {
  return {
    ...route,
    fetchedAt,
    amount: null,
    currency: null,
    departureDate: window.departureDate,
    returnDate: window.returnDate,
    stops: null,
    status: "unavailable",
  };
}

async function getFlightSnapshot(
  route: FlightRoute,
  apiKey: string,
  window: FareWindow,
  fetchedAt: string,
): Promise<FlightSnapshot> {
  try {
    const response = await fetch(serpApiFlightsUrl(route, apiKey, window), {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Flight response: ${response.status}`);

    const data = await response.json() as SerpFlightsResponse;
    const cheapest = selectLowestEligibleFlight([
      ...(data.best_flights ?? []),
      ...(data.other_flights ?? []),
    ]);
    if (!cheapest) return unavailableSnapshot(route, fetchedAt, window);

    return {
      ...route,
      fetchedAt,
      amount: cheapest.amount,
      currency: "USD",
      departureDate: window.departureDate,
      returnDate: window.returnDate,
      stops: cheapest.stops,
      status: "available",
    };
  } catch (error) {
    console.error(`Flight fare unavailable for ${route.destination}`, error);
    return unavailableSnapshot(route, fetchedAt, window);
  }
}

export async function getFlightDashboard(): Promise<FlightSnapshot[]> {
  const apiKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  const fetchedAt = new Date().toISOString();

  if (!apiKey) return flightRoutes.map((route) => {
    const [window] = route.destination === "SJC" ? schoolBreaks : [fareSearchWindow];
    return unavailableSnapshot(route, fetchedAt, window);
  });

  return Promise.all(flightRoutes.map(async (route) => {
    const windows = route.destination === "SJC" ? schoolBreaks : [fareSearchWindow];
    const snapshots = await Promise.all(
      windows.map((window) => getFlightSnapshot(route, apiKey, window, fetchedAt)),
    );
    return snapshots
      .filter((snapshot) => snapshot.status === "available")
      .sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity))[0]
      ?? snapshots[0];
  }));
}
