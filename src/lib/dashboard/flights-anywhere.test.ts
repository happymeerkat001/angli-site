import { afterEach, expect, test, vi } from "vitest";
import { schoolBreaks } from "./config";
import type { FlightSnapshot } from "./types";
import { getAnywhereDashboard, serpApiExploreUrl, selectCaliforniaFaresByWindow, selectLowestCaliforniaFare, selectTopAnywhereFlights } from "./flights-anywhere";

const originalSerpApiKey = process.env.SERP_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSerpApiKey) process.env.SERP_API_KEY = originalSerpApiKey;
  else delete process.env.SERP_API_KEY;
});

test("filters, ranks, and caps nearby anywhere-flight results", () => {
  const results = selectTopAnywhereFlights([
    { name: "Slow City", destination_airport: { code: "SLO" }, flight_price: 100, flight_duration: 361, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
    { name: "Missing price", destination_airport: { code: "MIS" }, flight_duration: 100, number_of_stops: 0 },
    { name: "Austin", destination_airport: { code: "AUS" }, flight_price: 150, flight_duration: 60, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
    { name: "Denver", destination_airport: { code: "DEN" }, flight_price: 90, flight_duration: 120, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
    { name: "Chicago", destination_airport: { code: "ORD" }, flight_price: 130, flight_duration: 150, number_of_stops: 1, start_date: "2027-03-13", end_date: "2027-03-21" },
    { name: "Houston", destination_airport: { code: "IAH" }, flight_price: 80, flight_duration: 70, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
    { name: "Nashville", destination_airport: { code: "BNA" }, flight_price: 120, flight_duration: 100, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
    { name: "Kansas City", destination_airport: { code: "MCI" }, flight_price: 110, flight_duration: 90, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
  ], "Spring Break");

  expect(results.map(({ airportCode }) => airportCode)).toEqual(["IAH", "DEN", "MCI", "BNA"]);
  expect(results.every(({ durationMinutes }) => durationMinutes <= 360)).toBe(true);
});

test("selects the cheapest California fare within each school break", () => {
  const availableSnapshot = (destination: string, amount: number, durationMinutes: number): FlightSnapshot => ({
    origin: "DFW",
    destination,
    label: `${destination} California`,
    fetchedAt: "2026-07-21T00:00:00.000Z",
    amount,
    currency: "USD",
    departureDate: "2027-03-13",
    returnDate: "2027-03-21",
    stops: 0,
    durationMinutes,
    status: "available",
  });

  const fares = selectCaliforniaFaresByWindow([
    { snapshot: availableSnapshot("SJC", 220, 215), windowLabel: "Spring Break" },
    { snapshot: availableSnapshot("SFO", 180, 240), windowLabel: "Spring Break" },
    { snapshot: availableSnapshot("SAN", 200, 180), windowLabel: "Winter Break" },
  ]);

  expect(fares["Spring Break"]).toMatchObject({ airportCode: "SFO", amount: 180 });
  expect(fares["Winter Break"]).toMatchObject({ airportCode: "SAN", amount: 200 });
});

test("returns no California slot when every search is unavailable", () => {
  const unavailable: FlightSnapshot = {
    origin: "DFW",
    destination: "SJC",
    label: "San Jose, California",
    fetchedAt: "2026-07-21T00:00:00.000Z",
    amount: null,
    currency: null,
    departureDate: "2027-03-13",
    returnDate: "2027-03-21",
    stops: null,
    status: "unavailable",
  };

  expect(selectLowestCaliforniaFare([{ snapshot: unavailable, windowLabel: "Spring Break" }])).toBeNull();
});

test("builds an explore request without an arrival airport", () => {
  const url = new URL(serpApiExploreUrl({
    label: "Spring Break",
    departureDate: "2027-03-13",
    returnDate: "2027-03-21",
  }, "test-key"));

  expect(url.searchParams.get("departure_id")).toBe("DFW");
  expect(url.searchParams.get("outbound_date")).toBe("2027-03-13");
  expect(url.searchParams.get("return_date")).toBe("2027-03-21");
  expect(url.searchParams.has("arrival_id")).toBe(false);
});

test("groups each break's explore results with its California fifth slot", async () => {
  process.env.SERP_API_KEY = "test-key";
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    const outboundDate = url.searchParams.get("outbound_date") ?? "";

    if (url.searchParams.get("engine") === "google_travel_explore") {
      return new Response(JSON.stringify({ destinations: [{
        name: `Explore ${outboundDate}`,
        destination_airport: { code: "EXP" },
        flight_price: 300,
        flight_duration: 120,
        number_of_stops: 0,
        start_date: outboundDate,
        end_date: url.searchParams.get("return_date"),
      }] }), { status: 200 });
    }

    const airportCode = url.searchParams.get("arrival_id");
    return new Response(JSON.stringify({ best_flights: [{
      price: airportCode === "SFO" ? 100 : 200,
      flights: [{}],
      total_duration: 180,
    }] }), { status: 200 });
  });

  const result = await getAnywhereDashboard();

  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value.map(({ windowLabel }) => windowLabel)).toEqual(schoolBreaks.map(({ label }) => label));
  expect(result.value.every(({ options }) => options.length === 2)).toBe(true);
  expect(result.value.every(({ options }) => options.at(-1)?.airportCode === "SFO")).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(schoolBreaks.length * 4);
});
