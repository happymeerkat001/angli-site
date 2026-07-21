import { expect, test } from "vitest";
import type { FlightSnapshot } from "./types";
import { serpApiExploreUrl, selectLowestCaliforniaFare, selectTopAnywhereFlights } from "./flights-anywhere";

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

test("selects the cheapest California fare across airports and school breaks", () => {
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

  expect(selectLowestCaliforniaFare([
    { snapshot: availableSnapshot("SJC", 220, 215), windowLabel: "Spring Break" },
    { snapshot: availableSnapshot("SFO", 180, 240), windowLabel: "Summer Break" },
    { snapshot: availableSnapshot("SAN", 200, 180), windowLabel: "Winter Break" },
  ])).toMatchObject({ airportCode: "SFO", amount: 180, windowLabel: "Summer Break" });
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
