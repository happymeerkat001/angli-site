# Next 7 Days calendar, flexed anywhere search, window filtering, round-trip verification

## Context

Follow-up corrections to `/personal` after shipping plan 001 (week strip, flex fares, round-trip labels):

1. Calendar section still titled "Next 30 days" and has a flat 30-day agenda list under the week strip. User wants: heading → "Next 7 Days", the flat to-do list deleted, and the week strip carrying all content (cards must grow with content — nothing hidden).
2. User questioned whether the "anywhere" fares (e.g. ATL) are really round trip — price never changes and looked like the old one-way numbers. **Verified:** SerpApi `google_travel_explore` defaults `type` to `1` = round trip (our `serpApiExploreUrl` sends no `type`, so round trip is what we get). The price is static because the explore search was left un-flexed in plan 001 — same fixed window every day. User approved flexing it too.
3. Anywhere section headings should carry the season dates: `Cheapest flights anywhere (≤6h) — Fall Break: 2026-10-10 – 2026-10-13`.
4. Each anywhere card should show its actual (flexed) trip dates under the `{duration} flight time · {stops}` line — the deal's own departure/return, which now vary per candidate window.
5. Token/cost saver: only show school-break windows in the domestic booking sweet spot (departure within the next 4 months). Today (Jul 22) that's Fall Break only — even Thanksgiving (Nov 21) is past the cutoff. This more than offsets the added flex calls.

## Approach

### 1. Calendar: "Next 7 Days", no flat list, self-sufficient cards

- `src/app/personal/page.tsx`: rename heading `Next 30 days` → `Next 7 Days`; delete the flat `<ul>` agenda (and its `MapPin` usage / empty-state copy) so `WeekGrid` is the whole section body.
- `src/components/WeekGrid.tsx`: cards already grow with content (no fixed height, no truncation) — keep that. Since the flat list carried the only time/location info, enrich each event chip: show start time (Chicago-local, omit for all-day) and location when present. Reuse the `Intl.DateTimeFormat` `America/Chicago` pattern from the deleted list.
- `src/lib/dashboard/calendar-grid.test.ts`: no logic change to `buildWeekStrip`; existing tests stand.

### 2. Flex the anywhere (explore) search

- `src/lib/dashboard/flights-anywhere.ts`: for each displayed window, fetch `serpApiExploreUrl` once per `buildFlexCandidates(window)` entry (same helper as fixed routes), merge all returned destinations across candidates, then run `selectTopAnywhereFlights` over the merged pool with a dedupe: keep only the cheapest deal per `airportCode`. Each surviving option keeps its own `start_date`/`end_date`, so cards naturally show the winning flexed dates.
- Failure handling: a window counts as failed only if **all** its candidate fetches fail (matches `getFlexFlightSnapshot`'s all-or-nothing fallback).
- Call volume: with the section-5 filter active, anywhere = 1 window × 5 candidates = 5 calls/day (same as today's un-filtered, un-flexed 5). California = 3 airports × 1 window × 5 candidates = 15 calls/day (same as today's 15 un-flexed). Net: no cost increase vs. pre-flex, despite full flexing.

### 3. Window heading with dates

- `src/app/personal/page.tsx`: group heading → `Cheapest flights anywhere (≤6h) — {label}: {departureDate} – {returnDate}`. Needs the window's dates in `AnywhereWindowSection` — add `departureDate`/`returnDate` fields (`src/lib/dashboard/types.ts`) populated from the base `FareWindow` in `getAnywhereDashboard`.

### 4. Card dates = actual flexed trip dates

- Cards already render `{flight.departureDate} – {flight.returnDate}`; drop the `{windowLabel}:` prefix (the section heading now carries label + season range, so the card line is purely the deal's own dates). With section 2, explore deals and California flex snapshots both carry real candidate dates.

### 5. Booking-window filter (domestic sweet spot)

- New helper in `src/lib/dashboard/flex-dates.ts` (or `config.ts`): `windowsInBookingRange(now: Date, windows: FareWindow[]): FareWindow[]` — keep windows whose `departureDate` is after today and at most 4 calendar months out. Jul 22 → Fall Break (Oct 10) in; Thanksgiving (Nov 21) out.
- Apply in `flights-anywhere.ts` to both the explore loop and `getCaliforniaFaresByWindow` (replace direct `schoolBreaks` iteration). Leave the international Summer Fares (CRK/XIY/XUZ) untouched — the 1–4 month rule is for domestic hops.
- Empty-range guard: if no window qualifies, render the existing "No nearby flights found for the school breaks" empty state (already handled by `anywhere.value.length === 0` path).

### Tests

- `src/lib/dashboard/flex-dates.test.ts`: add `windowsInBookingRange` cases — window inside range kept, window past 4 months dropped (Thanksgiving-from-Jul-22 example), window in the past dropped, boundary at exactly 4 months dropped.
- `src/lib/dashboard/flights-anywhere.test.ts`: update fetch-count assertions (filtered windows × candidates); merged-pool dedupe keeps cheapest per airport; a cheaper deal from a shrunk candidate window wins and its dates surface; all-candidates-fail → window failed; section carries base-window dates.

## Verification

- `npm run typecheck` · `npm test` · `npm run build`
- Manual `/personal`: calendar heading "Next 7 Days", no flat list below the strip, day cards show every event with time/location; only Fall Break appears in Anywhere; heading reads `— Fall Break: 2026-10-10 – 2026-10-13`; card date lines vary per deal (flexed) with no `Fall Break:` prefix.
