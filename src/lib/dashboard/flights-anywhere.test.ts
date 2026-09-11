import { afterEach, expect, test, vi } from "vitest";
import { schoolBreaks } from "./config";
import type { FlightSnapshot } from "./types";
import { SEARCH_BATCH_SIZE } from "./trip-dates";
import { filterQualifyingOptions, getAnywhereDashboard, selectAnywherePile, seasonalApiCallCount, serpApiExploreUrl, selectCaliforniaFaresByWindow, selectLowestCaliforniaFare, selectTopAnywhereFlights } from "./flights-anywhere";

const originalSerpApiKey = process.env.SERP_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  if (originalSerpApiKey) process.env.SERP_API_KEY = originalSerpApiKey;
  else delete process.env.SERP_API_KEY;
});

const exploreDestinations = [
  { name: "Slow City", destination_airport: { code: "SLO" }, flight_price: 100, flight_duration: 361, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
  { name: "Missing price", destination_airport: { code: "MIS" }, flight_duration: 100, number_of_stops: 0 },
  { name: "Austin", destination_airport: { code: "AUS" }, flight_price: 150, flight_duration: 60, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
  { name: "Denver", destination_airport: { code: "DEN" }, flight_price: 90, flight_duration: 120, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
  { name: "Chicago", destination_airport: { code: "ORD" }, flight_price: 130, flight_duration: 150, number_of_stops: 1, start_date: "2027-03-13", end_date: "2027-03-21" },
  { name: "Houston", destination_airport: { code: "IAH" }, flight_price: 80, flight_duration: 70, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
  { name: "Nashville", destination_airport: { code: "BNA" }, flight_price: 120, flight_duration: 100, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
  { name: "Kansas City", destination_airport: { code: "MCI" }, flight_price: 110, flight_duration: 90, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
];

test("ranks and caps anywhere-flight results without a duration cap", () => {
  const results = selectTopAnywhereFlights(exploreDestinations, "Spring Break");

  expect(results.map(({ airportCode }) => airportCode)).toEqual(["IAH", "DEN", "SLO", "MCI"]);
  expect(results.some(({ durationMinutes }) => durationMinutes > 360)).toBe(true);
});

test("keeps a wider explore pile than the displayed cash row", () => {
  const pile = selectAnywherePile(exploreDestinations, "Spring Break");

  expect(pile.map(({ airportCode }) => airportCode)).toEqual(["IAH", "DEN", "SLO", "MCI", "BNA", "ORD", "AUS"]);
});

test("propagates Explore airline identity from the cheapest destination, not a more expensive one", () => {
  const results = selectTopAnywhereFlights([
    { name: "Houston", destination_airport: { code: "IAH" }, flight_price: 80, flight_duration: 70, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21", airline: "United", airline_code: "UA" },
    { name: "Houston", destination_airport: { code: "IAH" }, flight_price: 120, flight_duration: 70, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21", airline: "American", airline_code: "AA" },
  ], "Spring Break");

  expect(results[0]).toMatchObject({ airportCode: "IAH", amount: 80 });
  expect(results[0].airlineIdentity).toMatchObject({ kind: "single", segments: [expect.objectContaining({ iata: "UA" })] });
});

test("copies California winning snapshot identity onto the cash-row slot", () => {
  const snapshot: FlightSnapshot = {
    origin: "DFW",
    destination: "SFO",
    label: "San Francisco, California",
    fetchedAt: "2026-07-21T00:00:00.000Z",
    amount: 180,
    currency: "USD",
    departureDate: "2027-03-13",
    returnDate: "2027-03-21",
    stops: 0,
    durationMinutes: 240,
    status: "available",
    airlineIdentity: { kind: "single", segments: [{ name: "United", iata: "UA", iataSource: "airline_code", operatingName: null, operatorStatus: "reported-marketing" }] },
  };

  expect(selectLowestCaliforniaFare([{ snapshot, windowLabel: "Spring Break" }])?.airlineIdentity?.segments[0]?.iata).toBe("UA");
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
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-24T00:00:00.000Z"));
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

  const result = await getAnywhereDashboard({
    schoolBreak: schoolBreaks[0],
    datePairs: [{ departureDate: "2026-10-10", returnDate: "2026-10-13" }],
    now: new Date("2026-07-24T00:00:00.000Z"),
  });

  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value.sections.map(({ windowLabel }) => windowLabel)).toEqual(["Fall Break"]);
  expect(result.value.sections[0]).toMatchObject({ departureDate: "2026-10-10", returnDate: "2026-10-13" });
  expect(result.value.sections.every(({ options }) => options.length === 2)).toBe(true);
  expect(result.value.sections.every(({ options }) => options.at(-1)?.airportCode === "SFO")).toBe(true);
  expect(result.value.pile.map(({ airportCode }) => airportCode)).toEqual(["EXP"]);
  expect(fetchMock).toHaveBeenCalledTimes(seasonalApiCallCount(1, true));
});

test("returns no sections without fetching when no windows are selected", async () => {
  process.env.SERP_API_KEY = "test-key";
  const fetchMock = vi.spyOn(global, "fetch");

  await expect(getAnywhereDashboard({ schoolBreak: schoolBreaks[0], datePairs: [] })).resolves.toEqual({
    status: "ok",
    value: {
      sections: [{ windowLabel: "Fall Break", departureDate: "2026-10-10", returnDate: "2026-10-13", options: [] }],
      pile: [],
      incomplete: false,
      timedOut: false,
      failedSearches: 0,
      searchedPairs: [],
    },
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("filters provider-returned dates before ranking and caps a refresh at five pairs", async () => {
  process.env.SERP_API_KEY = "test-key";
  const extraPairs = [
    { departureDate: "2027-03-13", returnDate: "2027-03-16" },
    { departureDate: "2027-03-13", returnDate: "2027-03-17" },
    { departureDate: "2027-03-13", returnDate: "2027-03-18" },
    { departureDate: "2027-03-13", returnDate: "2027-03-19" },
    { departureDate: "2027-03-13", returnDate: "2027-03-20" },
    { departureDate: "2027-03-14", returnDate: "2027-03-17" },
  ];
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.get("engine") === "google_travel_explore") {
      return new Response(JSON.stringify({ destinations: [
        { name: "Too long", destination_airport: { code: "LONG" }, flight_price: 50, flight_duration: 80, number_of_stops: 0, start_date: "2027-03-13", end_date: "2027-03-21" },
        { name: "Austin", destination_airport: { code: "AUS" }, flight_price: 150, flight_duration: 60, number_of_stops: 0, start_date: url.searchParams.get("outbound_date"), end_date: url.searchParams.get("return_date") },
      ] }), { status: 200 });
    }
    return new Response(JSON.stringify({ best_flights: [{ price: 200, flights: [{}], total_duration: 180 }] }), { status: 200 });
  });

  const result = await getAnywhereDashboard({
    schoolBreak: schoolBreaks[3],
    datePairs: extraPairs,
    now: new Date("2026-09-11T00:00:00.000Z"),
  });

  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value.searchedPairs).toHaveLength(SEARCH_BATCH_SIZE);
  expect(fetchMock).toHaveBeenCalledTimes(seasonalApiCallCount(SEARCH_BATCH_SIZE, true));
  expect(result.value.pile.every(({ airportCode }) => airportCode !== "LONG")).toBe(true);
  expect(filterQualifyingOptions([
    { destination: "Long", airportCode: "LONG", amount: 50, currency: "USD", durationMinutes: 80, stops: 0, departureDate: "2027-03-13", returnDate: "2027-03-21", windowLabel: "Spring Break" },
    { destination: "Austin", airportCode: "AUS", amount: 150, currency: "USD", durationMinutes: 60, stops: 0, departureDate: "2027-03-13", returnDate: "2027-03-16", windowLabel: "Spring Break" },
  ], schoolBreaks[3]).map(({ airportCode }) => airportCode)).toEqual(["AUS"]);
});

test("returns a timeout error when the budget expires before any search succeeds", async () => {
  process.env.SERP_API_KEY = "test-key";
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async () => new Response(JSON.stringify({ destinations: [] }), { status: 200 }));

  const result = await getAnywhereDashboard({
    schoolBreak: schoolBreaks[3],
    datePairs: [{ departureDate: "2027-03-13", returnDate: "2027-03-16" }],
    includeCalifornia: false,
    budgetMs: 0,
    now: new Date("2026-09-11T00:00:00.000Z"),
  });

  expect(result).toEqual({ status: "error", message: "Flight search timed out before returning qualifying trips" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("keeps valid successes when some date searches fail", async () => {
  process.env.SERP_API_KEY = "test-key";
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.get("outbound_date") === "2027-03-13") {
      return new Response("nope", { status: 500 });
    }
    if (url.searchParams.get("engine") === "google_travel_explore") {
      return new Response(JSON.stringify({ destinations: [{
        name: "Denver",
        destination_airport: { code: "DEN" },
        flight_price: 90,
        flight_duration: 120,
        number_of_stops: 0,
        start_date: url.searchParams.get("outbound_date"),
        end_date: url.searchParams.get("return_date"),
      }] }), { status: 200 });
    }
    return new Response(JSON.stringify({ best_flights: [] }), { status: 200 });
  });

  const result = await getAnywhereDashboard({
    schoolBreak: schoolBreaks[3],
    datePairs: [
      { departureDate: "2027-03-13", returnDate: "2027-03-16" },
      { departureDate: "2027-03-14", returnDate: "2027-03-17" },
    ],
    includeCalifornia: false,
    now: new Date("2026-09-11T00:00:00.000Z"),
  });

  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value.incomplete).toBe(true);
  expect(result.value.pile.map(({ airportCode }) => airportCode)).toEqual(["DEN"]);
});
