import { afterEach, expect, test, vi } from "vitest";
import { fareSearch, flightRoutes } from "./config";
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
  ])).toMatchObject({ amount: 780, stops: 1 });
});

test("retains the itinerary duration when SerpApi provides it", () => {
  expect(selectLowestEligibleFlight([
    { price: 780, flights: [{}, {}], total_duration: 215 },
  ])).toMatchObject({ amount: 780, stops: 1, durationMinutes: 215 });
});

test("requests the configured 2027 round-trip search dates", () => {
  const url = new URL(serpApiFlightsUrl(flightRoutes[0], "test-key", {
    label: "Summer 2027",
    departureDate: fareSearch.departureDate,
    returnDate: fareSearch.returnDate,
  }));

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

test("retains airline identity from the cheapest eligible itinerary, not a more expensive one", () => {
  const cheapest = selectLowestEligibleFlight([
    { price: 900, flights: [{ airline: "American", flight_number: "AA 100" }] },
    { price: 780, flights: [{ airline: "United", flight_number: "UA 2175" }, { airline: "United", flight_number: "UA 90" }] },
    { price: 820, flights: [{ airline: "Delta", flight_number: "DL 10" }] },
  ]);

  expect(cheapest).toMatchObject({ amount: 780, stops: 1 });
  expect(cheapest?.airlineIdentity.kind).toBe("single");
  expect(cheapest?.airlineIdentity.segments.map((segment) => segment.iata)).toEqual(["UA", "UA"]);
});

test("keeps the flex-winning date's airline instead of a more expensive candidate's carrier", async () => {
  process.env.SERP_API_KEY = "test-key";
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const outboundDate = new URL(input.toString()).searchParams.get("outbound_date");
    return new Response(JSON.stringify({
      best_flights: [{
        price: outboundDate === "2027-06-23" ? 300 : 500,
        flights: [{ airline: outboundDate === "2027-06-23" ? "United" : "American", flight_number: outboundDate === "2027-06-23" ? "UA 1" : "AA 2" }],
      }],
    }), { status: 200 });
  });

  const flights = await getFlightDashboard();
  expect(flights.every((flight) => flight.airlineIdentity?.kind === "single" && flight.airlineIdentity.segments[0]?.iata === "UA")).toBe(true);
});

test("marks mixed marketing carriers without treating the cheaper fare as a single-carrier itinerary", () => {
  const cheapest = selectLowestEligibleFlight([
    { price: 500, flights: [{ airline: "United", flight_number: "UA 1" }, { airline: "American", flight_number: "AA 2" }] },
  ]);

  expect(cheapest?.airlineIdentity.kind).toBe("mixed");
  expect(cheapest?.amount).toBe(500);
});
