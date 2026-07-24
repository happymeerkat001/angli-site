# Flights never load — decouple SerpAPI calls from page render, gate behind Refresh button

## Context

`/personal`'s flight section shows "Live price unavailable today" / "No nearby flights found" persistently, even after pressing "Refresh flights." Root cause confirmed via live Vercel logs from earlier today: SerpAPI is rate-limiting (`Flight response: 429`) on every route.

Two compounding causes:

1. **Every render can trigger the full SerpAPI fan-out.** `src/app/personal/page.tsx` calls `getFlightDashboard()` and `getAnywhereDashboard()` directly inside the page's server-side `Promise.all` (`src/app/personal/page.tsx:35`). The page is `force-dynamic`, so this runs on every request. Each call is individually cached via Next's fetch Data Cache (`revalidate: false` + `tags: ["flights"]`), so a *warm* cache avoids re-fetching — but any cache-cold render (fresh deploy, evicted cache entry, first-ever request for a given candidate URL) fires live SerpAPI calls as a side effect of an ordinary page view from any visitor. There's no way to distinguish "the button was pressed" from "the cache happened to be cold" — both paths call the same functions the same way.
2. **Call volume is large.** Per full fan-out: fixed routes (`flightRoutes`, 3 routes × 5 flex candidates from `buildFlexCandidates`) = 15 calls. California leg (`californiaAirports`, 3 airports × `schoolBreaks`, 5 windows × 5 flex candidates) = 75 calls. "Anywhere explore" search (`src/lib/dashboard/flights-anywhere.ts:130-136`) is *also* flexed (5 windows × 5 candidates) = 25 calls — this deviates from the original plan (`whimsical-giggling-karp.md`), which explicitly said to leave the explore search un-flexed to bound call volume. Total: up to 115 SerpAPI calls from a single trigger, uncontrolled as to when that trigger fires.

Fetch's `cache: "only-if-cached"` (read cache without ever hitting network) is spec-restricted to same-origin requests, so it can't be used for SerpAPI. Next's Data Cache has no "peek, don't fetch on miss" mode. Reliably guaranteeing "SerpAPI is called only on button press" requires moving the read path off `fetch()`'s cache entirely and onto an explicit store the page reads passively.

## Approach

### 1. Persisted snapshot store (Vercel-connected Redis/KV)

New file `src/lib/dashboard/flight-store.ts` using `@vercel/kv` (new dependency — Vercel Marketplace Redis/Upstash, REST-based, no persistent connections needed in serverless functions).

```ts
type FlightStoreState = {
  flights: FlightSnapshot[];
  anywhere: SourceResult<AnywhereWindowSection[]>;
  fetchedAt: string;
};
```

- `readFlightState(): Promise<FlightStoreState | null>` — `kv.get(STATE_KEY)`. Returns `null` if never refreshed or KV isn't configured (`process.env.KV_REST_API_URL` absent → short-circuit to `null`, mirroring the existing "not connected" pattern used for `SERP_API_KEY`/dashboard creds).
- `writeFlightState(state)` — `kv.set(STATE_KEY, state)`.
- `acquireRefreshLock(): Promise<boolean>` — `kv.set(LOCK_KEY, "1", { nx: true, ex: 60 })`, returns whether the lock was actually acquired. Prevents two concurrent refresh clicks (or a retried form submission) from doubling SerpAPI usage.
- `releaseRefreshLock()` — `kv.del(LOCK_KEY)`.

Constants: `STATE_KEY = "dashboard:flights:state"`, `LOCK_KEY = "dashboard:flights:lock"`, `LOCK_TTL_SECONDS = 60`.

### 2. Refresh orchestration, isolated from the Server Action

New file `src/lib/dashboard/flight-refresh.ts`:

```ts
export async function refreshFlightState(): Promise<{ ok: boolean; reason?: string }> {
  if (!(await acquireRefreshLock())) return { ok: false, reason: "refresh already in progress" };
  try {
    const previous = await readFlightState();
    const [flights, anywhere] = await Promise.all([getFlightDashboard(), getAnywhereDashboard()]);
    const flightsFailed = flights.every((f) => f.status === "unavailable");
    const anywhereFailed = anywhere.status === "error";
    await writeFlightState({
      flights: flightsFailed && previous ? previous.flights : flights,
      anywhere: anywhereFailed && previous ? previous.anywhere : anywhere,
      fetchedAt: new Date().toISOString(),
    });
    return { ok: true };
  } finally {
    await releaseRefreshLock();
  }
}
```

This is the **only** call site for `getFlightDashboard()` and `getAnywhereDashboard()` (the existing SerpAPI-calling functions in `flights.ts`/`flights-anywhere.ts` — unchanged internally except §4 below). Preserving the previous value per-piece on total failure means a rate-limited refresh doesn't wipe out the last good fares.

### 3. Wire into the Server Action and page

`src/app/personal/actions.ts`:

```ts
export async function refreshFlights() {
  await refreshFlightState();
  revalidatePath("/personal");
}
```

Drop `revalidateTag("flights")` — the fetch-cache tag no longer drives what's displayed; `revalidatePath` ensures the form's soft-navigation shows the just-written KV state immediately (page is already `force-dynamic`, so this is a safety/explicitness measure, not strictly required for correctness).

`src/app/personal/page.tsx`: replace the direct `getFlightDashboard()` / `getAnywhereDashboard()` calls in the top-level `Promise.all` (line 35) with a single `readFlightState()` call. Destructure `flights`, `anywhere`, `fetchedAt` from the result, falling back when `null` (never refreshed yet): `flights = []`, `anywhere = { status: "error", message: "Flight data not loaded yet — press Refresh flights" }`, `fetchedAt = null`. Update the "Last refreshed" line (currently `Math.max(...flights.map(({fetchedAt}) => ...))`, line 123) to use the single stored `fetchedAt`, showing "Not yet refreshed" when null instead of formatting `Date(NaN)`.

### 4. Revert "anywhere explore" to un-flexed (per user decision)

`src/lib/dashboard/flights-anywhere.ts`, `getAnywhereDashboard()` (lines 130-142): replace the `buildFlexCandidates(window).map(...)` fan-out with exactly one `fetch(serpApiExploreUrl(window, apiKey), ...)` per eligible window. Drop the now-unused `buildFlexCandidates` import from this file (`windowsInBookingRange` stays). California leg (`getCaliforniaFaresByWindow`, via `getFlexFlightSnapshot`) and fixed routes are unchanged — still flexed, per the user's explicit instruction to scope this revert to Explore only.

New call volume per refresh: fixed 15 + California 75 + explore 5 (was 25) = **95**, down from 115. Note this in the plan as a residual risk, not addressed further here — California remains the largest share and is out of scope for this fix.

Also drop the `next: { revalidate: false, tags: ["flights"] }` option from the `fetch()` calls in `flights.ts` (serpApiFlightsUrl) and `flights-anywhere.ts` (serpApiExploreUrl) — these calls now only ever execute inside `refreshFlightState()`, gated by the KV lock; Next's fetch Data Cache adds nothing here and risks confusing the caching story. Keep the existing `AbortSignal.timeout(15_000)`.

### 5. Setup prerequisite (user action required before deploy)

Attach a Vercel KV store (Marketplace → Redis/Upstash) to the project in the Vercel dashboard — this is account/infra provisioning, not something to script. Vercel auto-injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (and `KV_URL`) into the project's env vars once attached. For local dev, run `npx vercel env pull` after attaching, or leave unset — `readFlightState()`/`writeFlightState()` degrade to "no persisted state" locally without it, and `refreshFlightState()` still calls live SerpAPI (just doesn't persist), so the button remains testable without provisioning KV for local-only work.

`README.md`: add `KV_REST_API_URL`, `KV_REST_API_TOKEN` to the `/personal` env var list, with a one-line note on Vercel KV attachment and the local-degrades-gracefully behavior.

`package.json`: add `@vercel/kv` to `dependencies`.

## Tests

- `src/lib/dashboard/flight-store.test.ts` (new, mocks `@vercel/kv`'s `kv` client):
  - `readFlightState` returns `null` when `kv.get` returns `null`/undefined and when `KV_REST_API_URL` is unset.
  - `readFlightState` returns the parsed state when present.
  - `acquireRefreshLock` returns `true` when `kv.set` (nx) succeeds, `false` when it returns `null` (lock held).
  - `releaseRefreshLock` calls `kv.del` with `LOCK_KEY`.
- `src/lib/dashboard/flight-refresh.test.ts` (new, mocks the store module and `getFlightDashboard`/`getAnywhereDashboard`):
  - Lock already held → returns `{ ok: false }`, does not call either fetcher.
  - Fresh fetch fully fails (`flights` all `"unavailable"`, `anywhere.status === "error"`) with an existing `previous` state → written state keeps `previous.flights`/`previous.anywhere`, only `fetchedAt` advances.
  - Fresh fetch succeeds → written state uses the new values.
  - Lock is released via `finally` even when a fetcher throws.
- `src/lib/dashboard/flights-anywhere.test.ts` (update): assert `getAnywhereDashboard` issues exactly one `fetch` call per eligible window (was `windows.length * candidateCount`), and no `buildFlexCandidates` call for the explore path — California leg's call count assertions unchanged.
- `src/lib/dashboard/flight-store.test.ts`: add a case proving the page-load read path never touches the network — spy on global `fetch`, call `readFlightState()` with a mocked `kv.get`, assert `fetch` was never called. This is the direct regression test for "flights never fetch on page load."

## Verification

- `npm run typecheck` · `npm test` · `npm run build`
- Manual (requires a KV store attached, or accept the local-degraded no-persistence mode): load `/personal` repeatedly — confirm no SerpAPI calls in server logs on plain page loads once a snapshot exists in KV. Click "Refresh flights" — confirm exactly one round of SerpAPI calls (95, per §4), lock prevents a rapid double-click from doubling it, and the page shows the new fares after the soft-navigation. Simulate a SerpAPI 429 (or temporarily break `SERP_API_KEY`) during refresh — confirm the previously displayed fares remain visible rather than flipping to "unavailable."
