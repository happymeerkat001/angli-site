import { expect, test } from "vitest";
import type { AnywhereFlightOption } from "./types";
import { choosePointsProgram, pointsForCash, selectTopPointsFlights } from "./flights-points";

function option(airportCode: string, amount: number, extra: Partial<AnywhereFlightOption> = {}): AnywhereFlightOption {
  return {
    destination: airportCode,
    airportCode,
    amount,
    currency: "USD",
    durationMinutes: 180,
    stops: 0,
    departureDate: "2027-03-13",
    returnDate: "2027-03-21",
    windowLabel: "Spring Break",
    ...extra,
  };
}

test("converts cash to Chase points at 1.5 cents", () => {
  expect(pointsForCash(400, 1.5)).toBe(26667);
  expect(choosePointsProgram(400)).toEqual({ program: "Chase", points: 26667 });
});

test("ranks a partner hub above a cheaper non-partner without changing displayed points", () => {
  const results = selectTopPointsFlights([
    option("AUS", 360),
    option("ORD", 400),
  ], []);

  expect(results[0]).toMatchObject({ airportCode: "ORD", program: "Chase", points: 26667, amount: 400 });
  expect(results[1]).toMatchObject({ airportCode: "AUS", program: "Chase", points: 24000, amount: 360 });
});

test("prefers destinations that are not already on the cash row", () => {
  const results = selectTopPointsFlights([
    option("AUS", 253),
    option("ATL", 321),
    option("ORD", 349),
    option("IAH", 349),
    option("SFO", 407),
    option("DEN", 360),
    option("MCO", 380),
    option("PHX", 390),
    option("BNA", 410),
    option("MCI", 420),
  ], ["AUS", "ATL", "ORD", "IAH", "SFO"]);

  expect(results.map(({ airportCode }) => airportCode)).toEqual(["DEN", "MCO", "PHX", "BNA", "MCI"]);
});

test("fills with cash-row cities only after preferred destinations run out", () => {
  const results = selectTopPointsFlights([
    option("AUS", 253),
    option("DEN", 360),
  ], ["AUS"]);

  expect(results.map(({ airportCode }) => airportCode)).toEqual(["DEN", "AUS"]);
});
