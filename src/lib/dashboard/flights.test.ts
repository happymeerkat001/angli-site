import { expect, test } from "vitest";
import { flightRoutes } from "./config";
import { selectLowestEligibleFlight, serpApiFlightsUrl } from "./flights";

test("chooses the cheapest itinerary with at most one stop", () => {
  expect(selectLowestEligibleFlight([
    { price: 900, flights: [{}, {}, {}] },
    { price: 780, flights: [{}, {}] },
    { price: 820, flights: [{}] },
  ])).toEqual({ amount: 780, stops: 1 });
});

test("requests the configured 2027 round-trip search dates", () => {
  const url = new URL(serpApiFlightsUrl(flightRoutes[0], "test-key"));

  expect(url.searchParams.get("outbound_date")).toBe("2027-06-18");
  expect(url.searchParams.get("return_date")).toBe("2027-07-09");
  expect(url.searchParams.get("departure_id")).toBe("DFW");
  expect(url.searchParams.get("arrival_id")).toBe("CRK");
});
