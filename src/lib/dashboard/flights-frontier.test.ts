import { afterEach, expect, test, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { frontierSearchDestinations, schoolBreaks } from "./config";
import {
  completeFrontierRoundTrip,
  FRONTIER_AIRLINE,
  FRONTIER_BUDGET_MS,
  FRONTIER_COMBO_BATCH,
  FRONTIER_CONCURRENCY,
  FRONTIER_FETCH_TIMEOUT_MS,
  FRONTIER_MAX_REQUESTS,
  frontierFetchTimeoutMs,
  getFrontierDashboard,
  isFrontierOnlyIdentity,
  isQuotedRoundTrip,
  isQualifyingFrontierTrip,
  nextFrontierBatch,
  selectCheapestConfirmedRoundTrip,
  selectFrontierOutbounds,
  serpProviderError,
} from "./flights-frontier";
import { serpApiFlightsUrl } from "./flights";
import { identityFromSerpFlightSegments } from "./airline-identity";
import { nightsBetween } from "./trip-dates";

const winter = schoolBreaks[2];
const chicago = { origin: "DFW" as const, destination: "ORD", label: "Chicago O'Hare" };
const chicagoCombo = {
  destination: { destination: "ORD", label: "Chicago O'Hare" },
  pair: { departureDate: "2026-12-29", returnDate: "2027-01-02" },
};

function f9Segment(from: string, to: string, day: string, extra: Record<string, unknown> = {}) {
  return {
    airline: "Frontier",
    airline_code: "F9",
    flight_number: "F9 100",
    departure_airport: { id: from, time: `${day} 08:00` },
    arrival_airport: { id: to, time: `${day} 10:00` },
    ...extra,
  };
}

const originalKey = process.env.SERP_API_KEY;
const originalSerpapiKey = process.env.SERPAPI_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalKey) process.env.SERP_API_KEY = originalKey;
  else delete process.env.SERP_API_KEY;
  if (originalSerpapiKey) process.env.SERPAPI_KEY = originalSerpapiKey;
  else delete process.env.SERPAPI_KEY;
});

test("Dec 29 2026-Jan 2 2027 is a qualifying four-night winter trip and Jan 5-6 is not", () => {
  expect(nightsBetween("2026-12-29", "2027-01-02")).toBe(4);
  expect(isQualifyingFrontierTrip({ departureDate: "2026-12-29", returnDate: "2027-01-02" }, winter, "2026-09-11")).toBe(true);
  expect(nightsBetween("2027-01-05", "2027-01-06")).toBe(1);
  expect(isQualifyingFrontierTrip({ departureDate: "2027-01-05", returnDate: "2027-01-06" }, winter, "2026-09-11")).toBe(false);
});

test("rejects mixed and non-Frontier legs instead of treating include_airlines as proof", () => {
  const mixed = identityFromSerpFlightSegments([
    f9Segment("DFW", "ORD", "2026-12-29"),
    { airline: "United", airline_code: "UA", flight_number: "UA 200", departure_airport: { id: "ORD", time: "2026-12-29 12:00" }, arrival_airport: { id: "MDW", time: "2026-12-29 13:00" } },
  ]);
  expect(isFrontierOnlyIdentity(mixed)).toBe(false);
  expect(selectFrontierOutbounds([{
    price: 70,
    type: "Round trip",
    departure_token: "token-ua",
    flights: [{ airline: "United", airline_code: "UA", flight_number: "UA 1", departure_airport: { id: "DFW", time: "2026-12-29 08:00" }, arrival_airport: { id: "ORD", time: "2026-12-29 10:00" } }],
  }, {
    price: 80,
    type: "Round trip",
    departure_token: "token-f9",
    flights: [f9Segment("DFW", "ORD", "2026-12-29")],
  }]).map((option) => option.departure_token)).toEqual(["token-f9"]);
});

test("does not treat an outbound price as a confirmed round-trip fare", () => {
  const outbound = {
    price: 40,
    type: "Round trip",
    departure_token: "token",
    flights: [f9Segment("DFW", "ORD", "2026-12-29")],
    total_duration: 120,
  };
  const oneWayReturn = {
    price: 40,
    type: "One way",
    flights: [f9Segment("ORD", "DFW", "2027-01-02")],
    total_duration: 120,
  };
  expect(isQuotedRoundTrip(outbound)).toBe(true);
  expect(completeFrontierRoundTrip(outbound, oneWayReturn, chicago, winter, "2026-09-11")).toBeNull();
  expect(completeFrontierRoundTrip(outbound, {
    price: 188,
    type: "Round trip",
    flights: [{ airline: "United", airline_code: "UA", flight_number: "UA 9", departure_airport: { id: "ORD", time: "2027-01-02 08:00" }, arrival_airport: { id: "DFW", time: "2027-01-02 10:00" } }],
    total_duration: 125,
  }, chicago, winter, "2026-09-11")).toBeNull();
  expect(completeFrontierRoundTrip(outbound, {
    price: 188,
    type: "Round trip",
    flights: [f9Segment("ORD", "DFW", "2027-01-02")],
    total_duration: 125,
  }, chicago, winter, "2026-09-11")).toMatchObject({
    amount: 188,
    tripType: "round-trip",
    departureDate: "2026-12-29",
    returnDate: "2027-01-02",
    airportCode: "ORD",
  });
});

test("does not claim a verified itinerary when timestamps are missing or airports do not match the route", () => {
  const outbound = {
    price: 40,
    type: "Round trip",
    departure_token: "token",
    flights: [f9Segment("DFW", "ORD", "2026-12-29")],
  };
  expect(completeFrontierRoundTrip(outbound, {
    price: 188,
    type: "Round trip",
    flights: [{ airline: "Frontier", airline_code: "F9", flight_number: "F9 100", departure_airport: { id: "ORD" }, arrival_airport: { id: "DFW" } }],
  }, chicago, winter, "2026-09-11")).toBeNull();
  expect(completeFrontierRoundTrip({
    ...outbound,
    flights: [f9Segment("DFW", "MDW", "2026-12-29")],
  }, {
    price: 188,
    type: "Round trip",
    flights: [f9Segment("ORD", "DFW", "2027-01-02")],
  }, chicago, winter, "2026-09-11")).toBeNull();
  expect(completeFrontierRoundTrip(outbound, {
    price: 188,
    type: "Round trip",
    flights: [f9Segment("ORD", "DAL", "2027-01-02")],
  }, chicago, winter, "2026-09-11")).toBeNull();
});

test("rejects a return that arrives home after the shared school window", () => {
  expect(completeFrontierRoundTrip({
    price: 40,
    type: "Round trip",
    flights: [f9Segment("DFW", "ORD", "2027-01-01")],
  }, {
    price: 210,
    type: "Round trip",
    flights: [f9Segment("ORD", "DFW", "2027-01-04", { arrival_airport: { id: "DFW", time: "2027-01-05 00:30" } })],
  }, chicago, winter, "2026-09-11")).toBeNull();
});

test("selects the cheapest quoted round-trip return instead of the first provider ranking", () => {
  const outbound = {
    price: 40,
    type: "Round trip",
    departure_token: "token",
    flights: [f9Segment("DFW", "ORD", "2026-12-29")],
    total_duration: 120,
  };
  expect(selectCheapestConfirmedRoundTrip(outbound, [
    { price: 300, type: "Round trip", flights: [f9Segment("ORD", "DFW", "2027-01-02")], total_duration: 125 },
    { price: 188, type: "Round trip", flights: [f9Segment("ORD", "DFW", "2027-01-02")], total_duration: 130 },
  ], chicago, winter, "2026-09-11")?.amount).toBe(188);
});

test("enumerates route/date combinations with one cursor so later dates still cover Chicago", () => {
  const first = nextFrontierBatch(winter, "2026-09-11");
  expect(first.batch.map((combo) => combo.destination.destination)).toEqual(["ORD", "MDW"]);
  expect(first.batch.map((combo) => combo.pair.departureDate)).toEqual([first.batch[0].pair.departureDate, first.batch[0].pair.departureDate]);
  expect(frontierSearchDestinations.map((destination) => destination.destination).slice(0, 2)).toEqual(["ORD", "MDW"]);
  const second = nextFrontierBatch(winter, "2026-09-11", {
    cursor: first.nextCursor,
    lastBatch: { destinations: ["ORD", "MDW"], datePairs: [] },
    totalCombos: first.totalCombos,
    incomplete: false,
    timedOut: false,
    failedSearches: 0,
    requestCount: 0,
    limitedOutboundTokens: false,
  });
  expect(second.batch.map((combo) => combo.destination.destination)).toEqual(["DEN", "LAS"]);
  expect(second.batch[0].pair).toEqual(first.batch[0].pair);
  expect(FRONTIER_COMBO_BATCH).toBe(2);
  expect(FRONTIER_MAX_REQUESTS).toBe(6);
  expect(FRONTIER_BUDGET_MS).toBe(40_000);
  expect(FRONTIER_CONCURRENCY).toBe(2);
});

test("caps each fetch at the remaining deadline instead of always using 12s", () => {
  expect(frontierFetchTimeoutMs(1_000_080, 1_000_000)).toBe(80);
  expect(frontierFetchTimeoutMs(1_000_000 + 60_000, 1_000_000)).toBe(FRONTIER_FETCH_TIMEOUT_MS);
  expect(frontierFetchTimeoutMs(1_000_000, 1_000_000)).toBe(0);
});

test("treats a provider JSON error on HTTP 200 as an error, not zero flights", () => {
  expect(serpProviderError({ error: "Google hasn't returned any results for this query." })).toBeTruthy();
  expect(serpProviderError({ search_metadata: { status: "Error" } })).toBe("Frontier search provider error");
  expect(serpProviderError({ best_flights: [] })).toBeNull();
});

test("builds Frontier Google Flights URLs with include_airlines=F9 and optional departure_token", () => {
  const outbound = new URL(serpApiFlightsUrl(chicago, "test-key", { label: "Winter Break", departureDate: "2026-12-29", returnDate: "2027-01-02" }, { includeAirlines: FRONTIER_AIRLINE }));
  expect(outbound.searchParams.get("include_airlines")).toBe("F9");
  expect(outbound.searchParams.get("type")).toBe("1");
  expect(outbound.searchParams.has("departure_token")).toBe(false);
  const returning = new URL(serpApiFlightsUrl(chicago, "test-key", { label: "Winter Break", departureDate: "2026-12-29", returnDate: "2027-01-02" }, { includeAirlines: FRONTIER_AIRLINE, departureToken: "token-1" }));
  expect(returning.searchParams.get("departure_token")).toBe("token-1");
});

test("returns an empty ok result without fetching when there is nothing to search", async () => {
  process.env.SERP_API_KEY = "test-key";
  const fetchMock = vi.spyOn(global, "fetch");
  await expect(getFrontierDashboard({ schoolBreak: winter, combos: [], now: new Date("2026-09-11T00:00:00.000Z") })).resolves.toMatchObject({
    status: "ok",
    value: { options: [], requestCount: 0 },
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("keeps source errors distinct from no matches, and confirms a round trip only after the return call", async () => {
  process.env.SERP_API_KEY = "test-key";
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.has("departure_token")) {
      return new Response(JSON.stringify({
        best_flights: [{
          price: 300,
          type: "Round trip",
          flights: [f9Segment("ORD", "DFW", "2027-01-02")],
          total_duration: 125,
        }],
        other_flights: [{
          price: 188,
          type: "Round trip",
          flights: [f9Segment("ORD", "DFW", "2027-01-02")],
          total_duration: 130,
        }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      best_flights: [{
        price: 40,
        type: "Round trip",
        departure_token: "token-1",
        flights: [f9Segment("DFW", "ORD", "2026-12-29")],
        total_duration: 120,
      }],
    }), { status: 200 });
  });

  const found = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
  });
  expect(found.status).toBe("ok");
  if (found.status !== "ok") throw new Error(found.message);
  expect(found.value.options[0]).toMatchObject({ amount: 188, airportCode: "ORD" });
  expect(fetchMock).toHaveBeenCalledTimes(2);

  fetchMock.mockImplementation(async () => new Response("nope", { status: 500 }));
  const failed = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
  });
  expect(failed).toEqual({ status: "error", message: "Frontier search temporarily unavailable" });

  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ error: "Google hasn't returned any results for this query." }), { status: 200 }));
  const providerFailed = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
  });
  expect(providerFailed).toEqual({ status: "error", message: "Frontier search temporarily unavailable" });
});

test("marks partial failures incomplete while keeping valid successes", async () => {
  process.env.SERP_API_KEY = "test-key";
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.get("arrival_id") === "MDW") return new Response("nope", { status: 500 });
    if (url.searchParams.has("departure_token")) {
      return new Response(JSON.stringify({
        best_flights: [{ price: 210, type: "Round trip", flights: [f9Segment("ORD", "DFW", "2027-01-02")], total_duration: 125 }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      best_flights: [{ price: 50, type: "Round trip", departure_token: "token-ord", flights: [f9Segment("DFW", "ORD", "2026-12-29")], total_duration: 120 }],
    }), { status: 200 });
  });

  const result = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [
      chicagoCombo,
      { destination: { destination: "MDW", label: "Chicago Midway" }, pair: chicagoCombo.pair },
    ],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 6,
  });
  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value.incomplete).toBe(true);
  expect(result.value.options.map(({ airportCode }) => airportCode)).toEqual(["ORD"]);
});

test("times out before requests, honors the request quota, and uses remaining deadline for fetch abort", async () => {
  process.env.SERP_API_KEY = "test-key";
  const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ best_flights: [] }), { status: 200 }));
  await expect(getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    budgetMs: 0,
  })).resolves.toEqual({ status: "error", message: "Frontier search timed out before returning qualifying trips" });
  expect(fetchMock).not.toHaveBeenCalled();

  const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
  const quota = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [
      chicagoCombo,
      { destination: { destination: "MDW", label: "Chicago Midway" }, pair: chicagoCombo.pair },
    ],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 1,
    budgetMs: 80,
  });
  expect(quota.status).toBe("ok");
  if (quota.status !== "ok") throw new Error(quota.message);
  expect(quota.value.requestCount).toBe(1);
  expect(quota.value.options).toEqual([]);
  expect(quota.value.incomplete).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(timeoutSpy.mock.calls.every(([timeoutMs]) => timeoutMs <= 80)).toBe(true);
});

test("flags sampled outbound coverage even when request budget remains after the first confirmed token", async () => {
  process.env.SERP_API_KEY = "test-key";
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.has("departure_token")) {
      return new Response(JSON.stringify({
        best_flights: [{ price: 188, type: "Round trip", flights: [f9Segment("ORD", "DFW", "2027-01-02")], total_duration: 125 }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      best_flights: [
        { price: 40, type: "Round trip", departure_token: "token-a", flights: [f9Segment("DFW", "ORD", "2026-12-29")], total_duration: 120 },
        { price: 50, type: "Round trip", departure_token: "token-b", flights: [f9Segment("DFW", "ORD", "2026-12-29")], total_duration: 110 },
      ],
    }), { status: 200 });
  });

  const result = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 6,
  });
  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value.options[0]?.amount).toBe(188);
  expect(result.value.requestCount).toBe(2);
  expect(result.value.limitedOutboundTokens).toBe(true);
});

test("returns a source error when flight search is not connected", async () => {
  delete process.env.SERP_API_KEY;
  delete process.env.SERPAPI_KEY;
  const fetchMock = vi.spyOn(global, "fetch");
  await expect(getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
  })).resolves.toEqual({ status: "error", message: "Flight search is not connected" });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("treats a timed-out return confirmation as a failed search, not an empty success", async () => {
  process.env.SERP_API_KEY = "test-key";
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.has("departure_token")) {
      throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
    }
    return new Response(JSON.stringify({
      best_flights: [{ price: 40, type: "Round trip", departure_token: "token-1", flights: [f9Segment("DFW", "ORD", "2026-12-29")], total_duration: 120 }],
    }), { status: 200 });
  });

  await expect(getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
  })).resolves.toEqual({ status: "error", message: "Frontier search timed out before returning qualifying trips" });
});

test("treats a return-leg provider failure as a failed search, not an empty success", async () => {
  process.env.SERP_API_KEY = "test-key";
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.has("departure_token")) return new Response("nope", { status: 500 });
    return new Response(JSON.stringify({
      best_flights: [{ price: 40, type: "Round trip", departure_token: "token-1", flights: [f9Segment("DFW", "ORD", "2026-12-29")], total_duration: 120 }],
    }), { status: 200 });
  });

  await expect(getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
  })).resolves.toEqual({ status: "error", message: "Frontier search temporarily unavailable" });
});

test("treats an all-timeout outbound search as a failed search, not an empty success", async () => {
  process.env.SERP_API_KEY = "test-key";
  vi.spyOn(global, "fetch").mockImplementation(async () => {
    throw Object.assign(new Error("aborted"), { name: "AbortError" });
  });

  await expect(getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
  })).resolves.toEqual({ status: "error", message: "Frontier search timed out before returning qualifying trips" });
});

test("keeps an unconfirmed outbound as no match instead of publishing its price", async () => {
  process.env.SERP_API_KEY = "test-key";
  const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(input.toString());
    if (url.searchParams.has("departure_token")) {
      return new Response(JSON.stringify({
        best_flights: [{ price: 40, type: "One way", flights: [f9Segment("ORD", "DFW", "2027-01-02")], total_duration: 120 }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      best_flights: [{ price: 40, type: "Round trip", departure_token: "token-1", flights: [f9Segment("DFW", "ORD", "2026-12-29")], total_duration: 120 }],
    }), { status: 200 });
  });

  const result = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
  });
  expect(result.status).toBe("ok");
  if (result.status !== "ok") throw new Error(result.message);
  expect(result.value.options).toEqual([]);
  expect(result.value.requestCount).toBe(2);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

function loadLocalSerpKey(): boolean {
  if (process.env.SERP_API_KEY || process.env.SERPAPI_KEY) return true;
  for (const name of [".env.local", ".env"]) {
    if (!existsSync(name)) continue;
    for (const line of readFileSync(name, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^(?:SERP_API_KEY|SERPAPI_KEY)=(.*)$/.exec(trimmed);
      const value = match?.[1]?.replace(/^["']|["']$/g, "").trim();
      if (value) {
        process.env.SERP_API_KEY = process.env.SERP_API_KEY || value;
        return true;
      }
    }
  }
  return false;
}

test.skipIf(process.env.LIVE_FRONTIER_SERP !== "1")("live DFW-Chicago Dec 29-Jan 2 uses at most two SerpApi requests", async () => {
  if (!loadLocalSerpKey()) throw new Error("LIVE_FRONTIER_SERP=1 but no SerpApi key is available");
  const realFetch = global.fetch;
  let calls = 0;
  vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    calls += 1;
    if (calls > 2) throw new Error("live request cap exceeded");
    return realFetch(input, init);
  });

  const result = await getFrontierDashboard({
    schoolBreak: winter,
    combos: [chicagoCombo],
    now: new Date("2026-09-11T00:00:00.000Z"),
    maxRequests: 2,
    budgetMs: FRONTIER_BUDGET_MS,
  });

  expect(calls).toBeLessThanOrEqual(2);
  if (result.status === "error") {
    expect(result.message).not.toMatch(/api[_-]?key/i);
    expect(result.message).not.toEqual("No qualifying Frontier round trips found for the sampled dates and destinations");
  } else {
    expect(result.value.requestCount).toBeLessThanOrEqual(2);
    expect(result.value.requestCount).toBe(calls);
    for (const option of result.value.options) {
      expect(option.tripType).toBe("round-trip");
      expect(option.airportCode).toBe("ORD");
      expect(option.airlineIdentity?.segments.every((segment) => segment.iata === "F9")).toBe(true);
    }
  }
});
