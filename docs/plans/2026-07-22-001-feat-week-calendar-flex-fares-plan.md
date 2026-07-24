# Weekly calendar (no truncation), flexible ±5-day fare search, round-trip price labels

## Context

Three corrections to the live `/personal` dashboard:

1. The month-grid calendar (`MonthGrid` + `buildMonthGrids`) is cramped — tiny boxes truncate events to 2 with a "+3 more" that hides info. User wants a simple 7-days-out view (today through +6 days, not aligned to Sun–Sat) that shows every event on each day, no truncation.
2. All fare searches (fixed routes CRK/XIY/XUZ, and the California leg of the "anywhere" search) currently query one fixed departure/return pair per season. User is flexible ±5 days on each end and wants the cheapest combination tried, not just the season's outer bounds — e.g. Winter Break's max window (`2026-12-19`–`2027-01-06`) could shrink to `12-23`–`01-01` if that's cheaper.
3. Fare prices should be explicitly labeled "round trip" on the cards (Summer Fares + Anywhere/California), not just implied by the section header above them.

## Approach

### 1. Calendar: 7-day strip, full event lists

Replace `buildMonthGrids`/`MonthGrid` with a simple 7-day view.

- `src/lib/dashboard/calendar-grid.ts`: replace `buildMonthGrids` with `buildWeekStrip(now: Date, events: CalendarEvent[]): { date: string; label: string; events: CalendarEvent[] }[]` — builds exactly 7 entries starting from today's Chicago-local date (no weekday alignment, no `inMonth` concept, no 6-week padding). Reuse the existing `eventDatesInChicago`/`chicagoDate`/`dateKey` helpers unchanged for bucketing. `label` is a short day heading (e.g. `Tue, Jul 22`).
- `src/components/MonthGrid.tsx` → rename to `src/components/WeekGrid.tsx`, export `WeekGrid({ events })`. Render 7 day columns/cards (responsive: stack or wrap on small screens). Each card lists **all** of that day's events — drop the `slice(0, 2)` + "+N more" logic entirely. Drop `min-h-24` fixed sizing so cards grow with content.
- `src/app/personal/page.tsx`: swap the `MonthGrid` import/usage for `WeekGrid`. Leave the existing flat "Next 30 days" `<ul>` agenda below it untouched — it still covers the longer horizon; the strip is just the near-term visual.
- `src/lib/dashboard/calendar-grid.test.ts`: replace month-grid tests with tests for `buildWeekStrip`: exactly 7 entries starting today, correct Chicago-local day boundaries, an event bucketed to the right day, no truncation behavior to test since none exists.

### 2. Flexible ±5-day fare search

New shared helper, reused by both the fixed-route search and the California leg of the anywhere search (both already go through `getFlightSnapshot`).

- **New file `src/lib/dashboard/flex-dates.ts`**:
  - `buildFlexCandidates(window: FareWindow, maxFlexDays = 5): FareWindow[]` — returns a small bounded set of candidate windows, not a full grid:
    1. the original window (baseline)
    2. both ends shrunk by `maxFlexDays` (departure `+maxFlexDays`, return `-maxFlexDays`)
    3. a middle option shrinking unevenly (departure `+3`, return `-5`) mirroring the user's own example
    4. departure-only shrink (`+maxFlexDays`, return unchanged)
    5. return-only shrink (departure unchanged, `-maxFlexDays`)
  - Drop any candidate where `returnDate <= departureDate` after shrinking (guards short windows like Fall Break's 3-night trip). Dedupe identical date pairs.

- **`src/lib/dashboard/flights.ts`**: add `getFlexFlightSnapshot(route, apiKey, window, fetchedAt)`: runs `getFlightSnapshot` for every `buildFlexCandidates(window)` entry in parallel, returns whichever result has the lowest `amount` among `status: "available"` snapshots, falling back to an `"unavailable"` snapshot (built from the base window) if all failed. `getFlightDashboard()` calls this instead of `getFlightSnapshot` directly.

- **`src/lib/dashboard/flights-anywhere.ts`**: `getCaliforniaFaresByWindow()`'s per-airport-per-window fetch (currently a direct `getFlightSnapshot` call) switches to `getFlexFlightSnapshot` — same call shape, just flexed. **Leave the `google_travel_explore` "anywhere" search un-flexed** — it already scans many destinations per call, and flexing its dates would multiply calls (5 windows × 5 candidates = 25 vs 5 today) for a search whose value is destination discovery, not date optimization on one route. This keeps the added SerpApi call volume bounded: fixed routes go from 3→15 calls/day, California goes from 15→75 calls/day. **Cost flag:** California alone is a 5x call multiplier per day-cache-refresh (all cached 24h via existing `revalidate: 86_400`) — worth confirming SerpApi plan headroom before shipping; `maxFlexDays`/candidate count is a single easy knob to dial down later if quota becomes an issue.

- **Tests**: `src/lib/dashboard/flex-dates.test.ts` (new) — verifies candidate count/shape, short-window guard, dedupe. `src/lib/dashboard/flights.test.ts` and `flights-anywhere.test.ts`: update fetch-count assertions (now `flightRoutes.length * candidateCount` and `californiaAirports.length * schoolBreaks.length * candidateCount`), add a case where a shrunk candidate is cheaper than the baseline and gets selected.

### 3. Round-trip price labels only — no single-trip framing

All quoted fares are already round-trip amounts (SerpApi `type: "1"`); the copy just needs to say so unambiguously and drop anything that reads as one-way.

- `src/app/personal/page.tsx`, Summer Fares card: change `Cheapest {nonstop|one-stop} fare` → `Cheapest {nonstop|one-stop} fare, round trip`.
- Anywhere/California cards: the duration line currently reads `{duration} one way · {stops}` — the "one way" there describes flight *duration*, not price, but sitting directly under the price it reads as if the price is one-way too. Reword to `{duration} flight time · {stops}` (drop "one way" entirely) and append `, round trip` to the price line itself: `${amount.toLocaleString()} round trip`. Net effect: the word "one way" no longer appears anywhere on a fare card; "round trip" appears directly next to every price.

## Verification

- `npm run typecheck`
- `npm test` (vitest) — updated/new tests above
- `npm run build`
- Manual: hit `/personal` locally with `SERP_API_KEY` set. Confirm: calendar shows 7 day-cards starting today with every event listed (no "+N more"); Summer Fares / Anywhere / California cards say "round trip" under the price; fixed-route and California fares reflect the cheapest of the flexed date candidates (check network calls / logs for multiple `outbound_date` values per route).
