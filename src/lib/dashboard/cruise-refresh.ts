import { getCruiseDashboard } from "./cruises";
import { acquireCruiseRefreshLock, readCruiseState, releaseCruiseRefreshLock, writeCruiseState } from "./cruise-store";

export async function refreshCruiseState() {
  if (!(await acquireCruiseRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readCruiseState();
    const windows = await getCruiseDashboard();
    await writeCruiseState({
      windows: windows.status === "error" && previous ? previous.windows : windows,
      fetchedAt: new Date().toISOString(),
    });
    return { ok: true };
  } finally {
    await releaseCruiseRefreshLock();
  }
}
