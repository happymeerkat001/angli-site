# Heading cleanup + booking-window "start looking" dates

## Context

Three display changes to `/personal`, clarified with the user:

1. The per-window `<h3>` in the Anywhere section repeats the parent section's heading verbatim (`Cheapest flights anywhere (≤6h) — Fall Break: 2026-10-10 – 2026-10-13`) — drop the redundant prefix, keep just the window label and dates.
2. Each Anywhere window's date range should show a "start looking" date in parens, e.g. `Fall Break: 2026-10-10 – 2026-10-13 (start looking 2026-06-10)`. Confirmed: `2026-06-10` is exactly 4 calendar months before `2026-10-10` — the same domestic booking horizon already stated in prose on the page ("Fares tend to be lowest 1–4 months out for domestic hops... 2–8 months out for international"). This is calendar-month subtraction (same day-of-month, month − 4), not a day-count shift, so it must be a new helper — the existing `windowsInBookingRange` 120-day cutoff is a close but inexact match (120 days ≠ 4 calendar months) and stays a separate, unrelated mechanism (it decides which windows fetch from SerpApi at all; this is purely a display label).
3. The user's original ask ("summer fares have both 4 month and 8 months out... International/Domestic") turned out to be about the fact that "Cheapest flights anywhere" rotates through all `schoolBreaks`, including `Summer Break` — so there already are two summer surfaces on the page: the fixed-route Summer Fares cards (CRK/XIY/XUZ — all international, 8-month horizon) and the Anywhere section's `Summer Break` window (domestic ≤6h, 4-month horizon, same as every other Anywhere window). Resolution: rename the Summer Fares heading to **"International Summer Fares"** and give it an 8-month start-looking date; when the Anywhere section's rotation reaches the `Summer Break` window, display it as **"Domestic Summer Break"** instead of the generic `Summer Break` label. Both get the red-when-in-window treatment described below; the other four Anywhere windows (Fall/Thanksgiving/Winter/Spring Break) get the same start-looking date but in the default muted color, since the user's red-coloring ask was specific to the International/Domestic summer pairing.

## Approach

### 1. Date-math helper

`src/lib/dashboard/flex-dates.ts`: add two small exported functions alongside the existing `shiftDate`/`buildFlexCandidates`/`windowsInBookingRange`:

- `subtractMonths(dateString: string, months: number): string` — calendar-month subtraction (`new Date` with UTC year/month/day components, `setUTCMonth(getUTCMonth() - months)`), returning `YYYY-MM-DD`. Verify against the user's own example: `subtractMonths("2026-10-10", 4) === "2026-06-10"`.
- `isWithinLookaheadWindow(now: Date, departureDate: string, months: number): boolean` — `true` when `today >= subtractMonths(departureDate, months)` and `today < departureDate`. Drives the red-text condition for both the International Summer Fares cards and the Domestic Summer Break window.

These are pure functions, independent of `windowsInBookingRange` — no changes to the existing 120-day filter or its callers.

### 2. Anywhere section: drop redundant prefix, add start-looking date, relabel Summer Break

`src/app/personal/page.tsx`, the `anywhere.value.map((group) => ...)` block (~line 145-147):

- Change the `<h3>` from `Cheapest flights anywhere (≤6h) — {group.windowLabel}: {group.departureDate} – {group.returnDate}` to just `{displayLabel}: {group.departureDate} – {group.returnDate} (start looking {subtractMonths(group.departureDate, 4)})`, where `displayLabel` is `group.windowLabel === "Summer Break" ? "Domestic Summer Break" : group.windowLabel`.
- Wrap the whole `<h3>` (or just the label portion) in the red-text class when `group.windowLabel === "Summer Break" && isWithinLookaheadWindow(new Date(), group.departureDate, 4)` — reuse the existing `text-red-700` utility already used elsewhere on the page (stock day-change/unrealized P/L) for the red state; default `text-ink` otherwise.
- All non-summer windows get the same `(start looking ...)` suffix, no color change — matches request #2 exactly with no scope creep from #3.

### 3. Summer Fares → International Summer Fares, with 8-month start-looking date

`src/app/personal/page.tsx`, `fares-heading` section (~line 99-131):

- Heading text: `Summer Fares` → `International Summer Fares`.
- Compute once per render (not per-card, since all three routes share `fareSearch.departureDate`): `const summerStartLooking = subtractMonths(fareSearch.departureDate, 8)` and `const summerInWindow = isWithinLookaheadWindow(new Date(), fareSearch.departureDate, 8)`. Import `fareSearch` from `./config` (already used in `src/lib/dashboard/flights.ts`; not currently imported in `page.tsx`).
- Add a line near the section intro (next to the existing "Prices below can be stale..." paragraph, not per-card — the date is identical on every card) showing `(International {summerStartLooking})`, red (`text-red-700`) when `summerInWindow`, muted otherwise.

### Tests

- `src/lib/dashboard/flex-dates.test.ts`: add cases for `subtractMonths` (the `2026-10-10` → `2026-06-10` example, plus a year-boundary case e.g. January minus 4 months) and `isWithinLookaheadWindow` (before window, inside window, on/after departure date — boundary-exact).
- No test changes needed for `page.tsx` (no existing test file renders it — confirm with `ls src/app/personal/*.test.tsx` before assuming; if one exists, add a case asserting the relabeled heading text and the presence of the start-looking string for a mocked window).

## Verification

- `npm run typecheck` · `npm test` · `npm run build`
- Manual: load `/personal`. Confirm: Anywhere per-window headings no longer repeat "Cheapest flights anywhere (≤6h)"; each shows `(start looking YYYY-MM-DD)` computed 4 months before its departure date; if a `Summer Break` window is currently in the booking range, it reads "Domestic Summer Break" and is red only when today is within 4 months of its departure. Summer Fares section heading reads "International Summer Fares" and shows `(International YYYY-MM-DD)`, red only when today is within 8 months of `fareSearch.departureDate`.
