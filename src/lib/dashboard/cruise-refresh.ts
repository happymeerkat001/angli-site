import { cruiseWindows } from "./config";
import { nearestUpcomingWindow } from "./flex-dates";
import { getCruiseDashboard } from "./cruises";
import { acquireCruiseRefreshLock, readCruiseState, releaseCruiseRefreshLock, writeCruiseState } from "./cruise-store";

function resolveCruiseSeason(label: string | undefined) {
  return cruiseWindows.find((window) => window.label === label)?.label
    ?? nearestUpcomingWindow(new Date(), cruiseWindows).label;
}

export async function refreshCruiseState() {
  if (!(await acquireCruiseRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readCruiseState();
    const windows = await getCruiseDashboard();
    const latest = await readCruiseState();
    await writeCruiseState({
      windows: windows.status === "error" && previous ? previous.windows : windows,
      seasonLabel: resolveCruiseSeason(latest?.seasonLabel ?? previous?.seasonLabel),
      fetchedAt: new Date().toISOString(),
    });
    return { ok: true };
  } finally {
    await releaseCruiseRefreshLock();
  }
}

export async function selectCruiseSeason(seasonLabel: string) {
  if (!(await acquireCruiseRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readCruiseState();
    await writeCruiseState({
      windows: previous?.windows ?? { status: "error", message: "Not yet loaded — press Refresh cruises" },
      seasonLabel: resolveCruiseSeason(seasonLabel),
      fetchedAt: previous?.fetchedAt ?? "",
    });
    return { ok: true };
  } finally {
    await releaseCruiseRefreshLock();
  }
}
