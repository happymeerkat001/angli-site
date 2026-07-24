# SJC swap + "cheapest flight anywhere" for /personal dashboard

## Context

`/personal`'s fare grid currently searches 4 fixed DFW routes (CRK, XIY, XUZ, TPE) for a single June–July 2027 date window via SerpApi's `google_flights` engine. The user wants:

1. Taipei (TPE) replaced with San Jose, CA (SJC) — searched not against a single date, but against the actual MCA/Imagine International Academy of North Texas school-break calendar (Imagine follows McKinney ISD's calendar, confirmed identical to MCA's published 2026-27 PDF), showing whichever break has the cheapest fare.
2. A new "cheapest flight anywhere" section: top 5 cheapest round-trip fares to *any* destination reachable within a 6-hour one-way flight from DFW, again picked from whichever break is cheapest — using SerpApi's `google_travel_explore` engine.

CRK/XIY/XUZ keep their existing June–July 2027 window untouched (confirmed with the user — that part isn't broken, just a genuinely no-data-yet route for Google Flights 11 months out).

Confirmed break windows (weekends included, per user):
- Fall Break: `2026-10-10` → `2026-10-13`
- Thanksgiving Break: `2026-11-21` → `2026-11-29`
- Winter Break: `2026-12-19` → `2027-01-06`
- Spring Break: `2027-03-13` → `2027-03-21`

Both new sections report the single cheapest result **across all 4 windows combined** (not broken out per-break), per the user's explicit choice.

Verified live against SerpApi with the real `SERP_API_KEY` from `.env` before writing this plan:
- `google_flights` (existing engine) confirmed working — the current "unavailable" bug for CRK/XIY/XUZ/TPE is Google Flights genuinely having no fare data 11 months out, not a code or key problem.
- `google_travel_explore` (new engine) schema confirmed via live call: top-level `destinations: [{ name, destination_airport: { code, location? }, flight_price, flight_duration (one-way minutes), number_of_stops, airline, start_date, end_date, ... }]`. No `arrival_id` param; `departure_id`, `outbound_date`, `return_date`, `currency` only.

## Files to change

**`src/lib/dashboard/config.ts`**
- Swap the `TPE` entry in `flightRoutes` for `{ origin: "DFW", destination: "SJC", label: "San Jose, California" }`.
- Add `schoolBreaks: FareWindow[]` — the 4 windows above, each `{ label, departureDate, returnDate }`.
- Leave `fareSearch` (used by CRK/XIY/XUZ) untouched.

**`src/lib/dashboard/types.ts`**
- Add `FareWindow = { label: string; departureDate: string; returnDate: string }`.
- `FlightRoute.destination` union: replace `"TPE"` with `"SJC"`.
- Add `AnywhereFlightOption = { destination: string; airportCode: string; amount: number; currency: "USD"; durationMinutes: number; stops: number; departureDate: string; returnDate: string; windowLabel: string }`.

**`src/lib/dashboard/flights.ts`**
- Change `serpApiFlightsUrl(route, apiKey)` → `serpApiFlightsUrl(route, apiKey, window: FareWindow)`, using `window.departureDate`/`window.returnDate` instead of reading `fareSearch` directly.
- In `getFlightDashboard()`, per route pick `const windows = route.destination === "SJC" ? schoolBreaks : [fareSearch];`, fetch all windows for that route in parallel (reusing the existing try/catch/`selectLowestEligibleFlight` per-window, same 15s timeout, same fail-closed-to-`unavailableSnapshot` behavior), then take the cheapest successful result across those windows. This keeps CRK/XIY/XUZ on their exact current code path (1 window) while SJC transparently becomes a 4-window search — no branching duplication.

**`src/lib/dashboard/flights-anywhere.ts`** (new)
- `serpApiExploreUrl(window: FareWindow, apiKey)`: builds the `google_travel_explore` URL (`departure_id=DFW`, `outbound_date`, `return_date`, `currency=USD`, `hl=en`, `api_key`) — no `arrival_id`.
- `selectTopAnywhereFlights(destinations, windowLabel, maxDurationMinutes = 360, limit = 5)`: pure function mirroring `selectLowestEligibleFlight` — filters entries with numeric `flight_price`/`flight_duration`/`number_of_stops` and `flight_duration <= maxDurationMinutes`, maps to `AnywhereFlightOption`, sorts by price ascending. Exported and unit-testable without network mocking, same pattern as `selectLowestEligibleFlight`.
- `getAnywhereDashboard(): Promise<SourceResult<AnywhereFlightOption[]>>`: fail-closed like `calendar.ts`/`news.ts`. No API key → `{status:"error", message:"Flight search is not connected"}`. Otherwise fetch all 4 `schoolBreaks` windows in parallel (each wrapped in try/catch, `console.error` on failure, contributing `[]` on error rather than failing the whole call), pool every window's mapped `AnywhereFlightOption[]` together, run `selectTopAnywhereFlights`-style ranking (dedupe not needed — pool then sort by price, take top 5), return `{status:"ok", value: [...]}`. If every window failed, return `{status:"error", message:"Flight search temporarily unavailable"}`.

**`src/app/personal/page.tsx`**
- Add `getAnywhereDashboard()` to the top-level `Promise.all`.
- New section after the existing fare grid, same card styling (`rounded-[2rem] border border-line bg-card p-6 shadow-sm shadow-ink/5`), heading "Cheapest flights anywhere (≤6h)". Each of the top-5 cards shows destination name + airport code, price, one-way duration, stop count, and the specific date range that produced that fare. Empty/error state mirrors the calendar section's `agenda.status === "error"` pattern (`<p>{result.message}.</p>`).

**Tests**
- `src/lib/dashboard/config.test.ts`: update destination list assertion `"TPE"` → `"SJC"`; add an assertion locking in the 4 `schoolBreaks` labels/dates exactly as specified.
- `src/lib/dashboard/flights.test.ts`: update `serpApiFlightsUrl` call to pass a `FareWindow` explicitly (test unaffected otherwise — `flightRoutes[0]` is still CRK).
- `src/lib/dashboard/flights-anywhere.test.ts` (new): test `selectTopAnywhereFlights` — filters out entries over 360 min, sorts by price, caps at 5, ignores non-numeric price/duration; test `serpApiExploreUrl` — confirms `departure_id=DFW`, correct dates, and no `arrival_id` param present.

## Verification

- `npm run typecheck`
- `npm test` (vitest) — new and updated unit tests above
- `npm run build`
- Manual: hit `/personal` locally with `SERP_API_KEY` set, confirm SJC card shows a price (or a clean "unavailable" if all 4 breaks come back empty) and the new anywhere section renders 5 cards sorted cheapest-first, all ≤360 min duration.
