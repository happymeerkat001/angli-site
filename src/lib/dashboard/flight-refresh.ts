import { schoolBreaks } from "./config";
import { nearestUpcomingWindow } from "./flex-dates";
import { getAnywhereDashboard } from "./flights-anywhere";
import { getFrontierDashboard } from "./flights-frontier";
import { selectTopPointsFlights } from "./flights-points";
import { getFlightDashboard } from "./flights";
import { acquireRefreshLock, mergeFlightState, readFlightState, releaseRefreshLock, writeFlightState } from "./flight-store";
import type { AnywhereFlightOption, AnywhereWindowSection, FareWindow } from "./types";

function resolveWindow(seasonLabel: string | undefined, now = new Date()): FareWindow {
  return schoolBreaks.find(({ label }) => label === seasonLabel)
    ?? nearestUpcomingWindow(now, schoolBreaks);
}

function cashAirportCodes(anywhere: { status: string; value?: AnywhereWindowSection[] }) {
  if (anywhere.status !== "ok" || !anywhere.value) return [];
  return anywhere.value.flatMap((group) => group.options.map((option) => option.airportCode));
}

function rankPoints(pile: AnywhereFlightOption[], anywhere: { status: string; value?: AnywhereWindowSection[] }) {
  return selectTopPointsFlights(pile, cashAirportCodes(anywhere));
}

export async function refreshFlightState() {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const window = resolveWindow(previous?.anywhereSeasonLabel);
    const [flights, anywhere] = await Promise.all([getFlightDashboard(), getAnywhereDashboard([window])]);
    const sections = anywhere.status === "ok" ? { status: "ok" as const, value: anywhere.value.sections } : anywhere;
    await writeFlightState(mergeFlightState(previous, {
      flights: flights.every((flight) => flight.status === "unavailable") && previous ? previous.flights : flights,
      anywhere: sections.status === "error" && previous ? previous.anywhere : sections,
      anywherePile: anywhere.status === "ok" ? anywhere.value.pile : previous?.anywherePile,
      anywherePileSeasonLabel: anywhere.status === "ok" ? window.label : previous?.anywherePileSeasonLabel,
      anywhereSeasonLabel: window.label,
      fetchedAt: new Date().toISOString(),
    }));
    return { ok: true };
  } finally { await releaseRefreshLock(); }
}

export async function refreshAnywhereSeason(seasonLabel: string) {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const window = resolveWindow(seasonLabel);
    const anywhere = await getAnywhereDashboard([window]);
    const sections = anywhere.status === "ok" ? { status: "ok" as const, value: anywhere.value.sections } : anywhere;
    await writeFlightState(mergeFlightState(previous, {
      flights: previous?.flights ?? [],
      anywhere: sections,
      anywherePile: anywhere.status === "ok" ? anywhere.value.pile : previous?.anywherePile,
      anywherePileSeasonLabel: anywhere.status === "ok" ? window.label : previous?.anywherePileSeasonLabel,
      anywhereSeasonLabel: window.label,
      fetchedAt: new Date().toISOString(),
    }));
    return { ok: true };
  } finally { await releaseRefreshLock(); }
}

export async function refreshPointsSeason() {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const window = resolveWindow(previous?.anywhereSeasonLabel);
    const now = new Date().toISOString();
    const warmPile = previous?.anywherePileSeasonLabel === window.label ? previous.anywherePile : [];
    if (warmPile && warmPile.length > 0) {
      await writeFlightState(mergeFlightState(previous, {
        anywhereSeasonLabel: window.label,
        fetchedAt: previous?.fetchedAt ?? now,
        points: { status: "ok", value: rankPoints(warmPile, previous?.anywhere ?? { status: "error" }) },
        pointsSeasonLabel: window.label,
        pointsFetchedAt: now,
      }));
      return { ok: true, fetched: false };
    }

    const anywhere = await getAnywhereDashboard([window]);
    if (anywhere.status === "error") {
      await writeFlightState(mergeFlightState(previous, {
        anywhereSeasonLabel: previous?.anywhereSeasonLabel ?? window.label,
        fetchedAt: previous?.fetchedAt ?? now,
        points: { status: "error", message: anywhere.message },
        pointsSeasonLabel: window.label,
        pointsFetchedAt: now,
      }));
      return { ok: true, fetched: true };
    }

    await writeFlightState(mergeFlightState(previous, {
      anywhereSeasonLabel: previous?.anywhereSeasonLabel ?? window.label,
      anywherePile: anywhere.value.pile,
      anywherePileSeasonLabel: window.label,
      fetchedAt: previous?.fetchedAt ?? now,
      points: { status: "ok", value: rankPoints(anywhere.value.pile, previous?.anywhere ?? { status: "error" }) },
      pointsSeasonLabel: window.label,
      pointsFetchedAt: now,
    }));
    return { ok: true, fetched: true };
  } finally { await releaseRefreshLock(); }
}

export async function refreshFrontierSeason() {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const window = resolveWindow(previous?.anywhereSeasonLabel);
    const now = new Date().toISOString();
    const frontier = await getFrontierDashboard(window);
    await writeFlightState(mergeFlightState(previous, {
      anywhereSeasonLabel: previous?.anywhereSeasonLabel ?? window.label,
      fetchedAt: previous?.fetchedAt ?? now,
      frontier: frontier.status === "error" && previous?.frontier.status === "ok" ? previous.frontier : frontier,
      frontierSeasonLabel: window.label,
      frontierFetchedAt: now,
    }));
    return { ok: true };
  } finally { await releaseRefreshLock(); }
}
