import { getAnywhereDashboard } from "./flights-anywhere";
import { getFlightDashboard } from "./flights";
import { acquireRefreshLock, readFlightState, releaseRefreshLock, writeFlightState } from "./flight-store";

export async function refreshFlightState() {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const [flights, anywhere] = await Promise.all([getFlightDashboard(), getAnywhereDashboard()]);
    await writeFlightState({
      flights: flights.every((flight) => flight.status === "unavailable") && previous ? previous.flights : flights,
      anywhere: anywhere.status === "error" && previous ? previous.anywhere : anywhere,
      fetchedAt: new Date().toISOString(),
    });
    return { ok: true };
  } finally { await releaseRefreshLock(); }
}
