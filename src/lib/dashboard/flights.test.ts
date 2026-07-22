import { afterEach, expect, test, vi } from "vitest";
import { fareSearch, flightRoutes, schoolBreaks } from "./config";
import { buildFlexCandidates } from "./flex-dates";
import { getFlightDashboard, selectLowestEligibleFlight, serpApiFlightsUrl } from "./flights";

const originalSerpApiKey = process.env.SERP_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSerpApiKey) process.env.SERP_API_KEY = originalSerpApiKey;
  else delete process.env.SERP_API_KEY;
});

test("chooses the cheapest itinerary with at most one stop", () => {
  expect(selectLowestEligibleFlight([
    { price: 900, flights: [{}, {}, {}] },
    { price: 780, flights: [{}, {}] },
    { price: 820, flights: [{}] },
  ])).toEqual({ amount: 780, stops: 1 });
});

test("retains the itinerary duration when SerpApi provides it", () => {
  expect(selectLowestEligibleFlight([
    { price: 780, flights: [{}, {}], total_duration: 215 },
  ])).toEqual({ amount: 780, stops: 1, durationMinutes: 215 });
});

test("requests the configured 2027 round-trip search dates", () => {
  const url = new URL(serpApiFlightsUrl(flightRoutes[0], "test-key", schoolBreaks[4]));

  expect(url.searchParams.get("outbound_date")).toBe("2027-06-18");
  expect(url.searchParams.get("return_date")).toBe("2027-07-09");
  expect(url.searchParams.get("departure_id")).toBe("DFW");
  expect(url.searchParams.get("arrival_id")).toBe("CRK");
});

test("searches every route across flexible summer candidates and chooses the cheapest", async () => {
  process.env.SERP_API_KEY = "test-key";
  const flexCandidates = buildFlexCandidates({ label: "Summer 2027", departureDate: fareSearch.departureDate, returnDate: fareSearch.returnDate });
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const outboundDate = new URL(input.toString()).searchParams.get("outbound_date");
    return new Response(JSON.stringify({
      best_flights: [{ price: outboundDate === "2027-06-23" ? 300 : 500, flights: [{}] }],
    }), { status: 200 });
  });

  const flights = await getFlightDashboard();

  expect(flights).toHaveLength(3);
  expect(flights.every((flight) => flight.status === "available" && flight.amount === 300)).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(flightRoutes.length * flexCandidates.length);
  expect(new Set(fetchMock.mock.calls.map(([url]) => new URL(url.toString()).searchParams.get("outbound_date"))))
    .toEqual(new Set(flexCandidates.map(({ departureDate }) => departureDate)));
});
