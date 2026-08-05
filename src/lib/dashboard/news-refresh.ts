import { getNewsDashboard, mixNewsItems } from "./news";
import { acquireNewsRefreshLock, releaseNewsRefreshLock, writeNewsState } from "./news-store";

export async function refreshNewsState() {
  if (!(await acquireNewsRefreshLock())) return { ok: false as const, reason: "refresh already in progress" };

  try {
    try {
      const news = await getNewsDashboard();
      const headlines = mixNewsItems(
        Object.values(news).flatMap((result) => result.status === "ok" ? result.value : []),
      );
      await writeNewsState({ headlines, fetchedAt: new Date().toISOString() });
      return { ok: true as const };
    } catch {
      await writeNewsState({ headlines: [], fetchedAt: new Date().toISOString() });
      return { ok: false as const, reason: "refresh failed" };
    }
  } finally {
    await releaseNewsRefreshLock();
  }
}
