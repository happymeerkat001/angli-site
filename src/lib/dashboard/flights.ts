import { fareSearch, flightRoutes } from "./config";
import { buildFlexCandidates } from "./flex-dates";
import type { FareWindow, FlightSearchRoute, FlightSnapshot } from "./types";

type SerpFlightOption = {
  price?: unknown;
  flights?: unknown;
  total_duration?: unknown;
};

type SerpFlightsResponse = {
  best_flights?: SerpFlightOption[];
  other_flights?: SerpFlightOption[];
};

type EligibleFlight = {
  amount: number;
  stops: number;
  durationMinutes?: number;
};

const fareSearchWindow: FareWindow = {
  label: "Summer 2027",
  departureDate: fareSearch.departureDate,
  returnDate: fareSearch.returnDate,
};

export function serpApiFlightsUrl(route: FlightSearchRoute, apiKey: string, window: FareWindow) {
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
    const durationMinutes = typeof option.total_duration === "number" ? option.total_duration : null;
    return amount !== null && stops !== null && stops <= 1
      ? [{ amount, stops, ...(durationMinutes !== null ? { durationMinutes } : {}) }]
      : [];
  });

  return eligible.sort((a, b) => a.amount - b.amount)[0] ?? null;
}

function unavailableSnapshot(route: FlightSearchRoute, fetchedAt: string, window: FareWindow): FlightSnapshot {
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

export async function getFlightSnapshot(
  route: FlightSearchRoute,
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
      ...(cheapest.durationMinutes !== undefined ? { durationMinutes: cheapest.durationMinutes } : {}),
      status: "available",
    };
  } catch (error) {
    console.error(`Flight fare unavailable for ${route.destination}`, error);
    return unavailableSnapshot(route, fetchedAt, window);
  }
}

export async function getFlexFlightSnapshot(
  route: FlightSearchRoute,
  apiKey: string,
  window: FareWindow,
  fetchedAt: string,
): Promise<FlightSnapshot> {
  const snapshots = await Promise.all(buildFlexCandidates(window).map((candidate) => (
    getFlightSnapshot(route, apiKey, candidate, fetchedAt)
  )));
  return snapshots
    .filter((snapshot): snapshot is FlightSnapshot & { amount: number; status: "available" } => snapshot.status === "available" && snapshot.amount !== null)
    .sort((a, b) => a.amount - b.amount)[0] ?? unavailableSnapshot(route, fetchedAt, window);
}

export async function getFlightDashboard(): Promise<FlightSnapshot[]> {
  const apiKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  const fetchedAt = new Date().toISOString();

  if (!apiKey) return flightRoutes.map((route) => unavailableSnapshot(route, fetchedAt, fareSearchWindow));

  return Promise.all(flightRoutes.map((route) => getFlexFlightSnapshot(route, apiKey, fareSearchWindow, fetchedAt)));
}
