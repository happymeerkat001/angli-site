# Revert fixed-route dates, rename fare heading, split anywhere section by break window

## Context

The previous iteration (already implemented and live) switched CRK/XIY/XUZ to a 5-window `schoolBreaks` search so they'd stop showing "unavailable," and folded a single cheapest California fare into the "anywhere" section as a fixed 5th card.

After seeing it live, the user wants three corrections:

1. **CRK/XIY/XUZ should go back to a single far-out window** (the original mid-June–July 2027 dates) and are expected to show "Live price unavailable today." — that's fine, it reflects SerpApi's real fare-publishing horizon. The multi-window search was solving the wrong problem for these routes.
2. **The "Cheapest fares" heading should be renamed** to something like "Summer Fares" — it's specifically the summer 2027 fare grid, not a general "cheapest fares" claim.
3. **The "anywhere" section should split into 5 subsections, one per school break, in chronological order (Fall, Thanksgiving, Winter, Spring, Summer last)** — not one pooled top-4+California list. Within *each* window's subsection, California should appear as its own 5th card alongside that window's top 4 explore results (confirmed by user: "it should remain as the 5th option in each of the sections... for each of fall break, thanksgiving, winter, spring break...etc"). This means California fares must now be computed **per window**, not once globally.

## Key decisions

- **`fareSearch` regains `departureDate`/`returnDate`** (`2027-06-18` / `2027-07-09`), restoring the pre-migration shape. `flights.ts` regains a single `fareSearchWindow` constant built from these dates, and `getFlightDashboard()` reverts to querying each of `flightRoutes` (CRK/XIY/XUZ) against that one window only — no more looping across `schoolBreaks` for these three routes. They will show "unavailable" today, which is expected and acceptable per the user.
- **`schoolBreaks` (5 windows) is untouched** and continues to drive the "anywhere" explore search and the California search — only the CRK/XIY/XUZ fare-grid routes stop using it.
- **California fare selection becomes per-window instead of global-cheapest.** Currently `getCaliforniaFare()` fetches all `californiaAirports × schoolBreaks` combinations and picks one single cheapest result overall. That collapses to: fetch the same 15 combinations, but group results by window and pick the cheapest California airport *for that window* — one CA candidate per school break, not one CA candidate total.
- **`getAnywhereDashboard()` return shape changes** from a flat `AnywhereFlightOption[]` to a per-window grouped shape (new type, e.g. `AnywhereWindowSection = { windowLabel: string; options: AnywhereFlightOption[] }`), one entry per `schoolBreaks` window in the same chronological order already defined in `config.ts` (Fall → Thanksgiving → Winter → Spring → Summer). Each group's `options` is that window's top-4 explore results (`selectTopAnywhereFlights`, unchanged, already computed per-window today) plus that window's own cheapest California fare appended as a 5th entry when available — mirrors the existing single-list compose pattern, just scoped per window instead of globally.
- **Failure behavior stays fail-closed per window, not per whole section:** if a window's explore fetch fails, that window's section falls back to whatever succeeded (California card alone, or an empty/omitted section) rather than erroring the entire "anywhere" feature. The existing "all windows failed → SourceResult error" case is preserved at the top level.
- **Page heading rename:** "Cheapest fares" → "Summer Fares" (the h2 in the fare-grid section). No other copy in that section changes.
- **Page anywhere-section restructure:** instead of one grid, render 5 stacked subsections (or an outer section with 5 inner blocks), each titled to reflect its window (e.g. "Cheapest flights anywhere (≤6h) — Fall Break", "— Thanksgiving", … "— Summer Break" last), each with its own grid of up to 5 cards. Reuse the existing card markup unchanged.

## Files to change

**`src/lib/dashboard/config.ts`**
- `fareSearch`: add back `departureDate: "2027-06-18"`, `returnDate: "2027-07-09"` alongside existing `adults`/`cabin`.
- `schoolBreaks`, `californiaAirports`, `flightRoutes`: unchanged.

**`src/lib/dashboard/flights.ts`**
- Reintroduce a `fareSearchWindow: FareWindow` constant (label e.g. `"Summer 2027"`) built from `fareSearch.departureDate`/`returnDate`.
- `getFlightDashboard()`: revert to querying each route in `flightRoutes` against `fareSearchWindow` only (single `getFlightSnapshot` call per route, not a loop over `schoolBreaks` + cheapest-of-N). Fix the no-API-key fallback path to use `fareSearchWindow` instead of `schoolBreaks[0]` (currently references `schoolBreaks[0]`, which is Fall Break — wrong window for this fallback).
- `serpApiFlightsUrl`, `getFlightSnapshot`, `selectLowestEligibleFlight` (incl. `durationMinutes` extraction): unchanged — still generic over any `FlightSearchRoute` + `FareWindow`, still reused by `flights-anywhere.ts` for California.

**`src/lib/dashboard/types.ts`**
- Add `AnywhereWindowSection = { windowLabel: string; options: AnywhereFlightOption[] }`.
- `AnywhereFlightOption`: unchanged.

**`src/lib/dashboard/flights-anywhere.ts`**
- Keep `serpApiExploreUrl`, `selectTopAnywhereFlights` (per-window top-4, unchanged).
- Replace `getCaliforniaFare()` (single global-cheapest) with a helper that fetches all `californiaAirports × schoolBreaks` combinations once (same 15 calls as today) and groups the eligible results by `windowLabel`, keeping the cheapest per window. `selectLowestCaliforniaFare` can be reused per-window-group (call it once per window with just that window's candidates) rather than once globally.
- `getAnywhereDashboard()`: for each window in `schoolBreaks` (in existing order), combine that window's explore top-4 with that window's California candidate (if any) into one `AnywhereWindowSection`. Return `SourceResult<AnywhereWindowSection[]>`. Preserve the existing "every explore window failed → error" short-circuit at the top level.

**`src/app/personal/page.tsx`**
- Fare-grid section: change h2 text from "Cheapest fares" to "Summer Fares".
- Anywhere section: map over `anywhere.value` (now `AnywhereWindowSection[]`) and render one heading + grid per group, in array order (already Fall→Summer). Each inner grid keeps the current card markup (`durationLabel`, price, stops, window/date line) and key structure, just scoped to `group.options` instead of the flat list. Keep the existing "no flights" / error fallback text patterns, applied per group where a group's `options` is empty (or omit empty groups entirely — implementer's call, favor showing the heading with a small "no matches this window" note for consistency with the existing single-section fallback copy).

**Tests**
- `src/lib/dashboard/config.test.ts`: update the `fareSearch` assertion back to include `departureDate`/`returnDate` alongside `adults`/`cabin`.
- `src/lib/dashboard/flights.test.ts`: revert the "searches every fare-grid route across all school breaks" test back to a single-window-per-route expectation (`fetchMock` called `flightRoutes.length` times total, all against the same `outbound_date`/`return_date`); keep the `serpApiFlightsUrl`/`selectLowestEligibleFlight` tests as-is.
- `src/lib/dashboard/flights-anywhere.test.ts`: update/add tests for per-window California selection (cheapest airport within a single window's candidate set, not across windows) and for `getAnywhereDashboard()`'s new grouped return shape — 5 groups in chronological order, each with up to 5 options, California appended per-group.

## Verification

- `npm run typecheck`
- `npm test` (vitest) — updated tests above
- `npm run build`
- Manual: hit `/personal` locally with `SERP_API_KEY` set. Confirm: fare-grid heading reads "Summer Fares" and CRK/XIY/XUZ show "Live price unavailable today."; the anywhere area shows 5 labeled subsections in Fall→Summer order, each with up to 5 cards (top-4 explore + that window's California fare).
