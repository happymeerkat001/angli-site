import { identityFromExploreDestination } from "./airline-identity";
import { californiaAirports } from "./config";
import { runBoundedTasks } from "./bounded-pool";
import { FETCH_TIMEOUT_MS, REFRESH_BUDGET_MS, SEASONAL_SEARCH_CONCURRENCY } from "./flight-store";
import { getFlightSnapshot } from "./flights";
import { SEARCH_BATCH_SIZE, tripFitsPolicy } from "./trip-dates";
import type { AnywhereDashboardValue, AnywhereFlightOption, FlightSnapshot, SchoolBreak, SourceResult, TripDatePair } from "./types";

type SerpExploreDestination = {
  name?: unknown;
  destination_airport?: { code?: unknown } | null;
  flight_price?: unknown;
  flight_duration?: unknown;
  number_of_stops?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  airline?: unknown;
  airline_code?: unknown;
};

type SerpExploreResponse = {
  destinations?: SerpExploreDestination[];
};

export function serpApiExploreUrl(window: Pick<SchoolBreak, "departureDate" | "returnDate"> & { label?: string }, apiKey: string) {
  const params = new URLSearchParams({
    engine: "google_travel_explore",
    departure_id: "DFW",
    outbound_date: window.departureDate,
    return_date: window.returnDate,
    currency: "USD",
    hl: "en",
    api_key: apiKey,
  });

  return `https://serpapi.com/search.json?${params.toString()}`;
}

function mapExploreDestinations(destinations: SerpExploreDestination[], windowLabel: string): AnywhereFlightOption[] {
  return destinations.flatMap((destination) => {
    const amount = typeof destination.flight_price === "number" ? destination.flight_price : null;
    const durationMinutes = typeof destination.flight_duration === "number" ? destination.flight_duration : null;
    const stops = typeof destination.number_of_stops === "number" ? destination.number_of_stops : null;
    const name = typeof destination.name === "string" ? destination.name : null;
    const airportCode = typeof destination.destination_airport?.code === "string"
      ? destination.destination_airport.code
      : null;
    const departureDate = typeof destination.start_date === "string" ? destination.start_date : null;
    const returnDate = typeof destination.end_date === "string" ? destination.end_date : null;

    if (amount === null || durationMinutes === null || stops === null || !name || !airportCode || !departureDate || !returnDate) {
      return [];
    }

    return [{
      destination: name,
      airportCode,
      amount,
      currency: "USD" as const,
      durationMinutes,
      stops,
      departureDate,
      returnDate,
      windowLabel,
      airlineIdentity: identityFromExploreDestination(destination),
    }];
  });
}

function uniqueCheapestByAirport(options: AnywhereFlightOption[], limit: number): AnywhereFlightOption[] {
  const ranked = [...options].sort((a, b) => a.amount - b.amount);
  const seen = new Set<string>();
  return ranked.filter((option) => !seen.has(option.airportCode) && Boolean(seen.add(option.airportCode))).slice(0, limit);
}

export function filterQualifyingOptions(
  options: AnywhereFlightOption[],
  schoolBreak: SchoolBreak,
  today?: string,
): AnywhereFlightOption[] {
  return options.filter((option) => tripFitsPolicy(option, schoolBreak, today));
}

export function selectTopAnywhereFlights(
  destinations: SerpExploreDestination[],
  windowLabel: string,
  limit = 4,
): AnywhereFlightOption[] {
  return uniqueCheapestByAirport(mapExploreDestinations(destinations, windowLabel), limit);
}

export function selectAnywherePile(
  destinations: SerpExploreDestination[],
  windowLabel: string,
  limit = 40,
): AnywhereFlightOption[] {
  return uniqueCheapestByAirport(mapExploreDestinations(destinations, windowLabel), limit);
}

type CaliforniaFareCandidate = {
  snapshot: FlightSnapshot;
  windowLabel: string;
};

export function selectLowestCaliforniaFare(candidates: CaliforniaFareCandidate[]): AnywhereFlightOption | null {
  const eligible = candidates.flatMap(({ snapshot, windowLabel }) => {
    if (
      snapshot.status !== "available" || snapshot.amount === null || snapshot.stops === null
      || snapshot.durationMinutes === undefined
    ) return [];

    return [{
      destination: snapshot.label,
      airportCode: snapshot.destination,
      amount: snapshot.amount,
      currency: "USD" as const,
      durationMinutes: snapshot.durationMinutes,
      stops: snapshot.stops,
      departureDate: snapshot.departureDate,
      returnDate: snapshot.returnDate,
      windowLabel,
      ...(snapshot.airlineIdentity ? { airlineIdentity: snapshot.airlineIdentity } : {}),
    }];
  });

  return eligible.sort((a, b) => a.amount - b.amount)[0] ?? null;
}

export function selectCaliforniaFaresByWindow(candidates: CaliforniaFareCandidate[]) {
  const labels = [...new Set(candidates.map(({ windowLabel }) => windowLabel))];
  return Object.fromEntries(labels.flatMap((windowLabel) => {
    const fare = selectLowestCaliforniaFare(candidates.filter((candidate) => candidate.windowLabel === windowLabel));
    return fare ? [[windowLabel, fare]] : [];
  })) as Record<string, AnywhereFlightOption>;
}

export function seasonalApiCallCount(pairCount: number, includeCalifornia: boolean) {
  return pairCount * (1 + (includeCalifornia ? 3 : 0));
}

const emptyDashboard = (
  schoolBreak: SchoolBreak,
  searchedPairs: Array<{ departureDate: string; returnDate: string }>,
  extra: Partial<AnywhereDashboardValue> = {},
): AnywhereDashboardValue => ({
  sections: [{
    windowLabel: schoolBreak.label,
    departureDate: schoolBreak.departureDate,
    returnDate: schoolBreak.returnDate,
    options: [],
  }],
  pile: [],
  incomplete: false,
  timedOut: false,
  failedSearches: 0,
  searchedPairs,
  ...extra,
});

export async function getAnywhereDashboard(input: {
  schoolBreak: SchoolBreak;
  datePairs: Array<Pick<TripDatePair, "departureDate" | "returnDate">>;
  includeCalifornia?: boolean;
  budgetMs?: number;
  concurrency?: number;
  now?: Date;
}): Promise<SourceResult<AnywhereDashboardValue>> {
  const includeCalifornia = input.includeCalifornia ?? true;
  const uniquePairs = input.datePairs.filter((pair, index, pairs) => (
    pairs.findIndex((candidate) => candidate.departureDate === pair.departureDate && candidate.returnDate === pair.returnDate) === index
  )).slice(0, SEARCH_BATCH_SIZE);
  if (uniquePairs.length === 0) {
    return { status: "ok", value: emptyDashboard(input.schoolBreak, []) };
  }

  const apiKey = process.env.SERP_API_KEY ?? process.env.SERPAPI_KEY;
  if (!apiKey) return { status: "error", message: "Flight search is not connected" };

  const today = (input.now ?? new Date()).toISOString().slice(0, 10);
  const fetchedAt = (input.now ?? new Date()).toISOString();
  const timeoutMs = FETCH_TIMEOUT_MS;
  type ExploreTask = { kind: "explore"; pair: (typeof uniquePairs)[number] };
  type CaliforniaTask = { kind: "california"; pair: (typeof uniquePairs)[number]; airport: (typeof californiaAirports)[number] };
  const tasks: Array<ExploreTask | CaliforniaTask> = uniquePairs.flatMap((pair) => ([
    { kind: "explore" as const, pair },
    ...(includeCalifornia ? californiaAirports.map((airport) => ({ kind: "california" as const, pair, airport })) : []),
  ]));

  const { results, timedOut } = await runBoundedTasks(tasks.map((task) => async () => {
    if (task.kind === "explore") {
      const response = await fetch(serpApiExploreUrl(task.pair, apiKey), { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`Flight explore response: ${response.status}`);
      const data = await response.json() as SerpExploreResponse;
      return {
        kind: "explore" as const,
        pair: task.pair,
        options: filterQualifyingOptions(
          mapExploreDestinations(data.destinations ?? [], input.schoolBreak.label),
          input.schoolBreak,
          today,
        ),
      };
    }

    return {
      kind: "california" as const,
      pair: task.pair,
      snapshot: await getFlightSnapshot(task.airport, apiKey, {
        label: input.schoolBreak.label,
        departureDate: task.pair.departureDate,
        returnDate: task.pair.returnDate,
      }, fetchedAt, { timeoutMs }),
    };
  }), {
    concurrency: input.concurrency ?? SEASONAL_SEARCH_CONCURRENCY,
    budgetMs: input.budgetMs ?? REFRESH_BUDGET_MS,
  });

  const exploreOptions: AnywhereFlightOption[] = [];
  const californiaCandidates: CaliforniaFareCandidate[] = [];
  let failedSearches = 0;

  results.forEach((result, index) => {
    const task = tasks[index];
    if (result.status !== "ok") {
      failedSearches += 1;
      if (result.status === "error" && task.kind === "explore") {
        console.error(`Flight explore unavailable for ${input.schoolBreak.label} ${task.pair.departureDate}`, result.error);
      }
      return;
    }
    if (result.value.kind === "explore") {
      exploreOptions.push(...result.value.options);
      return;
    }
    californiaCandidates.push({
      snapshot: result.value.snapshot,
      windowLabel: input.schoolBreak.label,
    });
  });

  const anySuccess = results.some((result) => result.status === "ok");
  if (!anySuccess) {
    return { status: "error", message: timedOut ? "Flight search timed out before returning qualifying trips" : "Flight search temporarily unavailable" };
  }

  const pile = uniqueCheapestByAirport(exploreOptions, 40);
  const qualifyingCalifornia = selectLowestCaliforniaFare(californiaCandidates.filter(({ snapshot }) => (
    tripFitsPolicy({ departureDate: snapshot.departureDate, returnDate: snapshot.returnDate }, input.schoolBreak, today)
  )));
  const options = uniqueCheapestByAirport(exploreOptions, 4);
  const incomplete = failedSearches > 0 || timedOut;

  return {
    status: "ok",
    value: {
      sections: [{
        windowLabel: input.schoolBreak.label,
        departureDate: input.schoolBreak.departureDate,
        returnDate: input.schoolBreak.returnDate,
        options: qualifyingCalifornia ? [...options, qualifyingCalifornia] : options,
        incomplete,
      }],
      pile,
      incomplete,
      timedOut,
      failedSearches,
      searchedPairs: uniquePairs,
    },
  };
}
