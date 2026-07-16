import { fareSearch, flightRoutes, googleFlightsUrl } from "./config";
import type { FlightSnapshot } from "./types";

export async function getFlightDashboard(): Promise<FlightSnapshot[]> {
  const fetchedAt = new Date().toISOString();

  return flightRoutes.map((route) => ({
    ...route,
    fetchedAt,
    amount: null,
    currency: null,
    departureDate: fareSearch.departureDate,
    returnDate: fareSearch.returnDate,
    searchUrl: googleFlightsUrl(route),
    status: "search-only" as const,
  }));
}
