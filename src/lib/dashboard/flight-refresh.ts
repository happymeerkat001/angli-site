import { schoolBreaks } from "./config";
import { nearestUpcomingWindow } from "./flex-dates";
import { getAnywhereDashboard } from "./flights-anywhere";
import { FRONTIER_BUDGET_MS, FRONTIER_MAX_REQUESTS, FRONTIER_SOURCE_VERSION, getFrontierDashboard, nextFrontierBatch } from "./flights-frontier";
import { selectTopPointsFlights } from "./flights-points";
import { getFlightDashboard } from "./flights";
import {
  acquireRefreshLock,
  compatiblePile,
  currentPolicyFingerprint,
  mergeFlightState,
  presentFlightState,
  readFlightState,
  REFRESH_BUDGET_MS,
  releaseRefreshLock,
  writeFlightState,
} from "./flight-store";
import { isoToday, listValidTripPairs, orderTripPairsForSearch, SEARCH_BATCH_SIZE, selectSearchBatch, tripFitsPolicy } from "./trip-dates";
import type { AnywhereFlightOption, AnywhereWindowSection, SchoolBreak, SeasonSearchCursor } from "./types";

function resolveWindow(seasonLabel: string | undefined, now = new Date()): SchoolBreak {
  return schoolBreaks.find(({ label }) => label === seasonLabel)
    ?? nearestUpcomingWindow(now, schoolBreaks);
}

function cashAirportCodes(anywhere: { status: string; value?: AnywhereWindowSection[] }) {
  if (anywhere.status !== "ok" || !anywhere.value) return [];
  return anywhere.value.flatMap((group) => group.options.map((option) => option.airportCode));
}

function rankPoints(pile: AnywhereFlightOption[], anywhere: { status: string; value?: AnywhereWindowSection[] }, schoolBreak: SchoolBreak, today: string) {
  return selectTopPointsFlights(
    pile.filter((option) => tripFitsPolicy(option, schoolBreak, today)),
    cashAirportCodes(anywhere),
  );
}

function coverageFor(
  searched: ReturnType<typeof selectSearchBatch>,
  totalPairs: number,
  extra: Pick<SeasonSearchCursor, "incomplete" | "timedOut" | "failedSearches">,
): SeasonSearchCursor {
  return {
    cursor: searched.nextCursor,
    lastBatch: searched.batch.map((pair) => ({ departureDate: pair.departureDate, returnDate: pair.returnDate })),
    totalPairs,
    incomplete: extra.incomplete,
    timedOut: extra.timedOut,
    failedSearches: extra.failedSearches,
  };
}

function nextBatch(schoolBreak: SchoolBreak, today: string, previous: SeasonSearchCursor | undefined) {
  const ordered = orderTripPairsForSearch(listValidTripPairs(schoolBreak, today), schoolBreak);
  return {
    ordered,
    searched: selectSearchBatch(ordered, previous?.cursor ?? 0, SEARCH_BATCH_SIZE),
  };
}

export async function refreshFlightState(now = new Date()) {
  const lock = await acquireRefreshLock();
  if (!lock.acquired) return { ok: false, reason: "refresh already in progress" };
  try {
    const fingerprint = currentPolicyFingerprint();
    const previous = presentFlightState(await readFlightState(), fingerprint);
    const window = resolveWindow(previous?.anywhereSeasonLabel, now);
    const flights = await getFlightDashboard();
    const stamp = now.toISOString();
    await writeFlightState(mergeFlightState(previous, {
      flights: flights.every((flight) => flight.status === "unavailable") && previous ? previous.flights : flights,
      anywhereSeasonLabel: previous?.anywhereSeasonLabel ?? window.label,
      fetchedAt: stamp,
      policyFingerprint: fingerprint,
    }));
    return { ok: true };
  } finally { await releaseRefreshLock(lock.token); }
}

export async function selectAnywhereSeason(seasonLabel: string, now = new Date()) {
  const lock = await acquireRefreshLock();
  if (!lock.acquired) return { ok: false, reason: "refresh already in progress" };
  try {
    const fingerprint = currentPolicyFingerprint();
    const previous = presentFlightState(await readFlightState(), fingerprint);
    const window = resolveWindow(seasonLabel, now);
    await writeFlightState(mergeFlightState(previous, {
      flights: previous?.flights ?? [],
      anywhereSeasonLabel: window.label,
      fetchedAt: previous?.fetchedAt ?? now.toISOString(),
      policyFingerprint: fingerprint,
    }));
    return { ok: true as const };
  } finally { await releaseRefreshLock(lock.token); }
}

export async function refreshAnywhereSeason(seasonLabel: string, now = new Date()) {
  const lock = await acquireRefreshLock();
  if (!lock.acquired) return { ok: false, reason: "refresh already in progress" };
  try {
    const fingerprint = currentPolicyFingerprint();
    const previous = presentFlightState(await readFlightState(), fingerprint);
    const window = resolveWindow(seasonLabel || previous?.anywhereSeasonLabel, now);
    const today = isoToday(now);
    const { ordered, searched } = nextBatch(window, today, previous?.coverageBySeason?.[window.label]);
    const anywhere = await getAnywhereDashboard({ schoolBreak: window, datePairs: searched.batch, now, budgetMs: REFRESH_BUDGET_MS });
    const sections = anywhere.status === "ok" ? { status: "ok" as const, value: anywhere.value.sections } : anywhere;
    await writeFlightState(mergeFlightState(previous, {
      flights: previous?.flights ?? [],
      anywhere: sections,
      anywherePile: anywhere.status === "ok" ? anywhere.value.pile : previous?.anywherePile,
      anywherePileSeasonLabel: anywhere.status === "ok" ? window.label : previous?.anywherePileSeasonLabel,
      anywherePileFingerprint: anywhere.status === "ok" ? fingerprint : previous?.anywherePileFingerprint,
      anywhereSeasonLabel: window.label,
      fetchedAt: previous?.fetchedAt ?? now.toISOString(),
      policyFingerprint: fingerprint,
      coverageBySeason: {
        ...(previous?.coverageBySeason ?? {}),
        [window.label]: anywhere.status === "ok"
          ? coverageFor(searched, ordered.length, {
            incomplete: anywhere.value.incomplete,
            timedOut: anywhere.value.timedOut,
            failedSearches: anywhere.value.failedSearches,
          })
          : previous?.coverageBySeason?.[window.label] ?? {
            cursor: previous?.coverageBySeason?.[window.label]?.cursor ?? 0,
            lastBatch: searched.batch.map((pair) => ({ departureDate: pair.departureDate, returnDate: pair.returnDate })),
            totalPairs: ordered.length,
            incomplete: true,
            timedOut: false,
            failedSearches: 1,
          },
      },
    }));
    return { ok: true };
  } finally { await releaseRefreshLock(lock.token); }
}

export async function refreshPointsSeason(now = new Date()) {
  const lock = await acquireRefreshLock();
  if (!lock.acquired) return { ok: false, reason: "refresh already in progress" };
  try {
    const fingerprint = currentPolicyFingerprint();
    const previous = presentFlightState(await readFlightState(), fingerprint);
    const window = resolveWindow(previous?.anywhereSeasonLabel, now);
    const today = isoToday(now);
    const stamp = now.toISOString();
    const warmPile = compatiblePile(previous, window.label, fingerprint);
    if (warmPile.length > 0) {
      await writeFlightState(mergeFlightState(previous, {
        anywhereSeasonLabel: window.label,
        fetchedAt: previous?.fetchedAt ?? stamp,
        points: { status: "ok", value: rankPoints(warmPile, previous?.anywhere ?? { status: "error" }, window, today) },
        pointsSeasonLabel: window.label,
        pointsFetchedAt: stamp,
        policyFingerprint: fingerprint,
      }));
      return { ok: true, fetched: false };
    }

    const { searched } = nextBatch(window, today, previous?.coverageBySeason?.[window.label]);
    const anywhere = await getAnywhereDashboard({
      schoolBreak: window,
      datePairs: searched.batch,
      includeCalifornia: false,
      now,
      budgetMs: REFRESH_BUDGET_MS,
    });
    if (anywhere.status === "error") {
      await writeFlightState(mergeFlightState(previous, {
        anywhereSeasonLabel: previous?.anywhereSeasonLabel ?? window.label,
        fetchedAt: previous?.fetchedAt ?? stamp,
        points: { status: "error", message: anywhere.message },
        pointsSeasonLabel: window.label,
        pointsFetchedAt: stamp,
        policyFingerprint: fingerprint,
      }));
      return { ok: true, fetched: true };
    }

    await writeFlightState(mergeFlightState(previous, {
      anywhereSeasonLabel: previous?.anywhereSeasonLabel ?? window.label,
      anywherePile: anywhere.value.pile,
      anywherePileSeasonLabel: window.label,
      anywherePileFingerprint: fingerprint,
      fetchedAt: previous?.fetchedAt ?? stamp,
      points: { status: "ok", value: rankPoints(anywhere.value.pile, previous?.anywhere ?? { status: "error" }, window, today) },
      pointsSeasonLabel: window.label,
      pointsFetchedAt: stamp,
      policyFingerprint: fingerprint,
    }));
    return { ok: true, fetched: true };
  } finally { await releaseRefreshLock(lock.token); }
}

export async function refreshFrontierSeason(now = new Date()) {
  const lock = await acquireRefreshLock();
  if (!lock.acquired) return { ok: false, reason: "refresh already in progress" };
  try {
    const fingerprint = currentPolicyFingerprint();
    const previous = presentFlightState(await readFlightState(), fingerprint);
    const window = resolveWindow(previous?.anywhereSeasonLabel, now);
    const stamp = now.toISOString();
    const today = isoToday(now);
    const batch = nextFrontierBatch(window, today, previous?.frontierCoverageBySeason?.[window.label]);
    const frontier = await getFrontierDashboard({
      schoolBreak: window,
      combos: batch.batch,
      now,
      budgetMs: FRONTIER_BUDGET_MS,
      maxRequests: FRONTIER_MAX_REQUESTS,
    });
    const keepPrior = frontier.status === "error" && previous?.frontier.status === "ok";
    await writeFlightState(mergeFlightState(previous, {
      anywhereSeasonLabel: previous?.anywhereSeasonLabel ?? window.label,
      fetchedAt: previous?.fetchedAt ?? stamp,
      frontier: keepPrior ? previous.frontier : frontier.status === "ok" ? { status: "ok", value: frontier.value.options } : frontier,
      frontierSeasonLabel: keepPrior ? previous.frontierSeasonLabel : window.label,
      frontierFetchedAt: keepPrior ? previous.frontierFetchedAt : stamp,
      frontierSourceVersion: keepPrior ? previous.frontierSourceVersion : frontier.status === "ok" ? FRONTIER_SOURCE_VERSION : previous?.frontierSourceVersion ?? "",
      frontierCoverageBySeason: frontier.status === "ok"
        ? {
          ...(previous?.frontierCoverageBySeason ?? {}),
          [window.label]: {
            cursor: batch.nextCursor,
            lastBatch: {
              destinations: batch.batch.map((combo) => combo.destination.destination),
              datePairs: batch.batch.map((combo) => ({ departureDate: combo.pair.departureDate, returnDate: combo.pair.returnDate })),
            },
            totalCombos: batch.totalCombos,
            incomplete: frontier.value.incomplete,
            timedOut: frontier.value.timedOut,
            failedSearches: frontier.value.failedSearches,
            requestCount: frontier.value.requestCount,
            limitedOutboundTokens: frontier.value.limitedOutboundTokens,
          },
        }
        : previous?.frontierCoverageBySeason ?? {},
      policyFingerprint: fingerprint,
    }));
    return { ok: true };
  } finally { await releaseRefreshLock(lock.token); }
}
