import { schoolBreaks } from "./config";
import { nearestUpcomingWindow } from "./flex-dates";
import { getAnywhereDashboard } from "./flights-anywhere";
import { getFlightDashboard } from "./flights";
import { acquireRefreshLock, readFlightState, releaseRefreshLock, writeFlightState } from "./flight-store";

export async function refreshFlightState() {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const window = schoolBreaks.find(({ label }) => label === previous?.anywhereSeasonLabel)
      ?? nearestUpcomingWindow(new Date(), schoolBreaks);
    const [flights, anywhere] = await Promise.all([getFlightDashboard(), getAnywhereDashboard([window])]);
    await writeFlightState({
      flights: flights.every((flight) => flight.status === "unavailable") && previous ? previous.flights : flights,
      anywhere: anywhere.status === "error" && previous ? previous.anywhere : anywhere,
      anywhereSeasonLabel: window.label,
      fetchedAt: new Date().toISOString(),
    });
    return { ok: true };
  } finally { await releaseRefreshLock(); }
}

export async function refreshAnywhereSeason(seasonLabel: string) {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const window = schoolBreaks.find(({ label }) => label === seasonLabel)
      ?? nearestUpcomingWindow(new Date(), schoolBreaks);
    const anywhere = await getAnywhereDashboard([window]);
    await writeFlightState({
      flights: previous?.flights ?? [],
      anywhere,
      anywhereSeasonLabel: window.label,
      fetchedAt: new Date().toISOString(),
    });
    return { ok: true };
  } finally { await releaseRefreshLock(); }
}
