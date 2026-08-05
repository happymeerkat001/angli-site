import { getStockAnalysis } from "./stock-analysis";
import { getStockHeadlines, getStockSnapshot } from "./stock";
import { acquireStockRefreshLock, releaseStockRefreshLock, writeStockState } from "./stock-store";

export async function refreshStockState() {
  if (!(await acquireStockRefreshLock())) return { ok: false as const, reason: "refresh already in progress" };

  try {
    const [snapshot, headlines] = await Promise.all([getStockSnapshot(), getStockHeadlines()]);
    const analysis = snapshot.status === "ok"
      ? await getStockAnalysis(snapshot.value, headlines.status === "ok" ? headlines.value : [])
      : null;
    await writeStockState({ snapshot, headlines, analysis, fetchedAt: new Date().toISOString() });
    return { ok: true as const };
  } finally {
    await releaseStockRefreshLock();
  }
}
