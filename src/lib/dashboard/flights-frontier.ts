import { identityFromSerpFlightSegments } from "./airline-identity";
import { runBoundedTasks } from "./bounded-pool";
import { frontierOrigin, frontierSearchDestinations } from "./config";
import { serpApiFlightsUrl } from "./flights";
import { isoToday, isDateInWindow, listValidTripPairs, orderTripPairsForSearch, selectRotatedBatch, tripFitsPolicy } from "./trip-dates";
import type {
  FlightAirlineIdentity,
  FlightSearchRoute,
  FrontierDealOption,
  FrontierSearchCombo,
  FrontierSearchCursor,
  FrontierSearchValue,
  SchoolBreak,
  SourceResult,
  TripDatePair,
} from "./types";

export const FRONTIER_AIRLINE = "F9";
export const FRONTIER_MAX_REQUESTS = 6;
export const FRONTIER_COMBO_BATCH = 2;
export const FRONTIER_BUDGET_MS = 40_000;
export const FRONTIER_CONCURRENCY = 2;
export const FRONTIER_FETCH_TIMEOUT_MS = 12_000;
export const FRONTIER_SOURCE_VERSION = "google-flights-f9-v2";

type SerpFrontierOption = {
  price?: unknown;
  type?: unknown;
  flights?: unknown;
  total_duration?: unknown;
  departure_token?: unknown;
  booking_token?: unknown;
};

type SerpFlightsResponse = {
  error?: unknown;
  search_metadata?: { status?: unknown };
  best_flights?: SerpFrontierOption[];
  other_flights?: SerpFrontierOption[];
};

export function isQuotedRoundTrip(option: Pick<SerpFrontierOption, "price" | "type">): option is SerpFrontierOption & { price: number } {
  if (typeof option.price !== "number" || !Number.isFinite(option.price)) return false;
  return typeof option.type === "string" && /round\s*trip/i.test(option.type);
}

export function isFrontierOnlyIdentity(identity: FlightAirlineIdentity): boolean {
  return identity.kind === "single"
    && identity.segments.length > 0
    && identity.segments.every((segment) => segment.iata === FRONTIER_AIRLINE);
}

export function flightDay(option: SerpFrontierOption, end: "departure" | "arrival"): string | null {
  if (!Array.isArray(option.flights) || option.flights.length === 0) return null;
  const segment = (end === "departure" ? option.flights[0] : option.flights[option.flights.length - 1]) as {
    departure_airport?: { time?: unknown };
    arrival_airport?: { time?: unknown };
  };
  const time = end === "departure" ? segment.departure_airport?.time : segment.arrival_airport?.time;
  if (typeof time !== "string") return null;
  const day = time.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function airportId(option: SerpFrontierOption, end: "departure" | "arrival"): string | null {
  if (!Array.isArray(option.flights) || option.flights.length === 0) return null;
  const segment = (end === "departure" ? option.flights[0] : option.flights[option.flights.length - 1]) as {
    departure_airport?: { id?: unknown };
    arrival_airport?: { id?: unknown };
  };
  const id = end === "departure" ? segment.departure_airport?.id : segment.arrival_airport?.id;
  return typeof id === "string" && /^[A-Z]{3}$/.test(id) ? id : null;
}

export function legMatchesRoute(option: SerpFrontierOption, origin: string, destination: string): boolean {
  return airportId(option, "departure") === origin && airportId(option, "arrival") === destination;
}

export function isQualifyingFrontierTrip(
  trip: { departureDate: string; returnDate: string | null },
  schoolBreak: SchoolBreak,
  today?: string,
): boolean {
  if (!trip.returnDate) return false;
  return tripFitsPolicy({ departureDate: trip.departureDate, returnDate: trip.returnDate }, schoolBreak, today);
}

export function frontierFetchTimeoutMs(deadline: number, now = Date.now()): number {
  return Math.min(Math.max(0, deadline - now), FRONTIER_FETCH_TIMEOUT_MS);
}

export function serpProviderError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { error?: unknown; search_metadata?: { status?: unknown } };
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  if (typeof record.search_metadata?.status === "string" && /error/i.test(record.search_metadata.status)) {
    return "Frontier search provider error";
  }
  return null;
}

export function listFrontierCombos(schoolBreak: SchoolBreak, today: string): FrontierSearchCombo[] {
  const dates = orderTripPairsForSearch(listValidTripPairs(schoolBreak, today), schoolBreak);
  return dates.flatMap((pair) => [...frontierSearchDestinations].map((destination) => ({
    destination: { destination: destination.destination, label: destination.label },
    pair,
  })));
}

export function nextFrontierBatch(schoolBreak: SchoolBreak, today: string, previous?: FrontierSearchCursor) {
  const combos = listFrontierCombos(schoolBreak, today);
  const selected = selectRotatedBatch(combos, previous?.cursor ?? 0, FRONTIER_COMBO_BATCH);
  return {
    ...selected,
    totalCombos: combos.length,
  };
}

export function selectFrontierOutbounds(options: SerpFrontierOption[]): Array<SerpFrontierOption & { departure_token: string }> {
  return options.flatMap((option) => {
    const token = typeof option.departure_token === "string" && option.departure_token ? option.departure_token : null;
    const identity = identityFromSerpFlightSegments(option.flights);
    if (!token || !isFrontierOnlyIdentity(identity)) return [];
    return [{ ...option, departure_token: token }];
  }).sort((a, b) => {
    const aPrice = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
    const bPrice = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
    return aPrice - bPrice;
  });
}

export function completeFrontierRoundTrip(
  outbound: SerpFrontierOption,
  returning: SerpFrontierOption,
  route: FlightSearchRoute,
  schoolBreak: SchoolBreak,
  today: string,
): FrontierDealOption | null {
  if (!isQuotedRoundTrip(returning)) return null;
  if (!Array.isArray(returning.flights) || returning.flights.length === 0) return null;
  const outboundIdentity = identityFromSerpFlightSegments(outbound.flights);
  const returnIdentity = identityFromSerpFlightSegments(returning.flights);
  if (!isFrontierOnlyIdentity(outboundIdentity) || !isFrontierOnlyIdentity(returnIdentity)) return null;
  if (!legMatchesRoute(outbound, route.origin, route.destination)) return null;
  if (!legMatchesRoute(returning, route.destination, route.origin)) return null;

  const departureDate = flightDay(outbound, "departure");
  const returnDate = flightDay(returning, "departure");
  const arrivalHomeDate = flightDay(returning, "arrival");
  if (!departureDate || !returnDate || !arrivalHomeDate) return null;
  if (!isDateInWindow(arrivalHomeDate, schoolBreak)) return null;
  if (!isQualifyingFrontierTrip({ departureDate, returnDate }, schoolBreak, today)) return null;

  const outboundStops = Array.isArray(outbound.flights) ? Math.max(0, outbound.flights.length - 1) : null;
  const returnStops = Array.isArray(returning.flights) ? Math.max(0, returning.flights.length - 1) : null;
  const outboundDuration = typeof outbound.total_duration === "number" ? outbound.total_duration : null;
  const returnDuration = typeof returning.total_duration === "number" ? returning.total_duration : null;

  return {
    origin: frontierOrigin,
    destination: route.label,
    airportCode: route.destination,
    amount: returning.price,
    currency: "USD",
    durationMinutes: outboundDuration !== null && returnDuration !== null ? outboundDuration + returnDuration : null,
    stops: outboundStops !== null && returnStops !== null ? outboundStops + returnStops : null,
    departureDate,
    returnDate,
    tripType: "round-trip",
    windowLabel: schoolBreak.label,
    airlineIdentity: identityFromSerpFlightSegments([
      ...(Array.isArray(outbound.flights) ? outbound.flights : []),
      ...(Array.isArray(returning.flights) ? returning.flights : []),
    ]),
  };
}

export function selectCheapestConfirmedRoundTrip(
  outbound: SerpFrontierOption,
  returnOptions: SerpFrontierOption[],
  route: FlightSearchRoute,
  schoolBreak: SchoolBreak,
  today: string,
): FrontierDealOption | null {
  return returnOptions
    .flatMap((returning) => {
      const confirmed = completeFrontierRoundTrip(outbound, returning, route, schoolBreak, today);
      return confirmed ? [confirmed] : [];
    })
    .sort((a, b) => a.amount - b.amount)[0] ?? null;
}

function routeFor(destination: FrontierSearchCombo["destination"]): FlightSearchRoute {
  return { origin: frontierOrigin, destination: destination.destination, label: destination.label };
}

function windowFor(pair: Pick<TripDatePair, "departureDate" | "returnDate">) {
  return { label: "Frontier", departureDate: pair.departureDate, returnDate: pair.returnDate };
}

function allOptions(data: SerpFlightsResponse): SerpFrontierOption[] {
  return [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
}

function isTimeoutError(error: unknown): boolean {
  return (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))
    || (typeof error === "object" && error !== null && "timedOut" in error);
}

async function fetchFrontierFlights(
  route: FlightSearchRoute,
  apiKey: string,
  pair: Pick<TripDatePair, "departureDate" | "returnDate">,
  deadline: number,
  departureToken?: string,
): Promise<SerpFlightsResponse> {
  const timeoutMs = frontierFetchTimeoutMs(deadline);
  if (timeoutMs <= 0) {
    throw Object.assign(new Error("Frontier search timed out"), { timedOut: true });
  }
  const url = serpApiFlightsUrl(route, apiKey, windowFor(pair), {
    includeAirlines: FRONTIER_AIRLINE,
    ...(departureToken ? { departureToken } : {}),
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Frontier flight response: ${response.status}`);
  const data: unknown = await response.json();
  const providerError = serpProviderError(data);
  if (providerError) throw new Error("Frontier provider error");
  return data as SerpFlightsResponse;
}

export async function getFrontierDashboard(input: {
  schoolBreak: SchoolBreak;
  combos: FrontierSearchCombo[];
  now?: Date;
  budgetMs?: number;
  maxRequests?: number;
}): Promise<SourceResult<FrontierSearchValue>> {
  const combos = input.combos.slice(0, FRONTIER_COMBO_BATCH);
  const empty: FrontierSearchValue = {
    options: [],
    incomplete: false,
    timedOut: false,
    failedSearches: 0,
    requestCount: 0,
    searchedPairs: combos.map((combo) => ({ departureDate: combo.pair.departureDate, returnDate: combo.pair.returnDate })),
    searchedDestinations: combos.map((combo) => combo.destination.destination),
    limitedOutboundTokens: false,
  };
  if (combos.length === 0) {
    return { status: "ok", value: empty };
  }

  const configuredKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  if (!configuredKey) return { status: "error", message: "Flight search is not connected" };
  const apiKey = configuredKey;

  const today = isoToday(input.now ?? new Date());
  const deadline = Date.now() + (input.budgetMs ?? FRONTIER_BUDGET_MS);
  const maxRequests = input.maxRequests ?? FRONTIER_MAX_REQUESTS;
  const options: FrontierDealOption[] = [];
  let requestCount = 0;
  let failedSearches = 0;
  let timedOut = false;
  let incomplete = false;
  let limitedOutboundTokens = false;

  async function takeRequest(): Promise<boolean> {
    if (frontierFetchTimeoutMs(deadline) <= 0) {
      timedOut = true;
      incomplete = true;
      return false;
    }
    if (requestCount >= maxRequests) {
      incomplete = true;
      return false;
    }
    requestCount += 1;
    return true;
  }

  type ComboOutcome = "found" | "no-match" | "failed" | "timeout";

  async function searchCombo(combo: FrontierSearchCombo): Promise<{ outcome: ComboOutcome; option: FrontierDealOption | null }> {
    if (!(await takeRequest())) {
      return { outcome: timedOut ? "timeout" : "failed", option: null };
    }
    const route = routeFor(combo.destination);
    let outboundData: SerpFlightsResponse;
    try {
      outboundData = await fetchFrontierFlights(route, apiKey, combo.pair, deadline);
    } catch (error) {
      if (isTimeoutError(error)) {
        timedOut = true;
        incomplete = true;
        return { outcome: "timeout", option: null };
      }
      failedSearches += 1;
      console.error(`Frontier outbound unavailable for ${combo.destination.destination}`, error);
      incomplete = true;
      return { outcome: "failed", option: null };
    }

    const outbounds = selectFrontierOutbounds(allOptions(outboundData));
    if (outbounds.length === 0) return { outcome: "no-match", option: null };

    const confirmed: FrontierDealOption[] = [];
    let inspectedTokens = 0;
    let sawSuccessfulReturn = false;
    for (const outbound of outbounds) {
      if (!(await takeRequest())) break;
      inspectedTokens += 1;
      try {
        const returnData = await fetchFrontierFlights(route, apiKey, combo.pair, deadline, outbound.departure_token);
        sawSuccessfulReturn = true;
        const cheapest = selectCheapestConfirmedRoundTrip(outbound, allOptions(returnData), route, input.schoolBreak, today);
        if (cheapest) {
          confirmed.push(cheapest);
          break;
        }
      } catch (error) {
        if (isTimeoutError(error)) {
          timedOut = true;
          incomplete = true;
          break;
        }
        failedSearches += 1;
        console.error(`Frontier return unavailable for ${combo.destination.destination}`, error);
        incomplete = true;
      }
    }
    if (inspectedTokens < outbounds.length) limitedOutboundTokens = true;
    const option = confirmed.sort((a, b) => a.amount - b.amount)[0] ?? null;
    if (option) return { outcome: "found", option };
    if (sawSuccessfulReturn) return { outcome: "no-match", option: null };
    if (timedOut) return { outcome: "timeout", option: null };
    return { outcome: "failed", option: null };
  }

  const { results, timedOut: poolTimedOut } = await runBoundedTasks(
    combos.map((combo) => async () => searchCombo(combo)),
    { concurrency: FRONTIER_CONCURRENCY, budgetMs: input.budgetMs ?? FRONTIER_BUDGET_MS },
  );
  if (poolTimedOut) {
    timedOut = true;
    incomplete = true;
  }
  let completedNoMatch = 0;
  let confirmationFailures = 0;
  for (const result of results) {
    if (result.status === "skipped") incomplete = true;
    if (result.status === "error") {
      failedSearches += 1;
      confirmationFailures += 1;
      incomplete = true;
    }
    if (result.status !== "ok") continue;
    if (result.value.option) options.push(result.value.option);
    if (result.value.outcome === "no-match") completedNoMatch += 1;
    if (result.value.outcome === "failed" || result.value.outcome === "timeout") confirmationFailures += 1;
  }

  if (options.length === 0 && completedNoMatch === 0 && (timedOut || confirmationFailures > 0 || requestCount === 0)) {
    return { status: "error", message: timedOut ? "Frontier search timed out before returning qualifying trips" : "Frontier search temporarily unavailable" };
  }

  const ranked = [...options].sort((a, b) => a.amount - b.amount);
  const unique = ranked.filter((option, index) => ranked.findIndex((candidate) => candidate.airportCode === option.airportCode) === index).slice(0, 5);
  return {
    status: "ok",
    value: {
      ...empty,
      options: unique,
      incomplete,
      timedOut,
      failedSearches,
      requestCount,
      limitedOutboundTokens,
    },
  };
}
