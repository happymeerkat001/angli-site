# Fix "unavailable" fares + fold California into the anywhere section

## Context

The SJC + anywhere-flights feature (commit `a280e5c`) is live, but CRK/XIY/XUZ still show "Live price unavailable today." — they're still on the old fixed `fareSearch` window (2027-06-18 → 2027-07-09), ~11 months out, which is the exact "no fare data yet" zone diagnosed in the original bug. Only SJC was switched to the multi-window `schoolBreaks` search.

The user wants two changes:

1. **CRK/XIY/XUZ switch to the same `schoolBreaks` multi-window search SJC already uses** (cheapest-across-all-windows), plus a 5th window — **Summer Break** — added to `schoolBreaks`. Per the user: keep the search dates as `2027-06-18` → `2027-07-09` (the existing mid-summer window, unchanged), while noting the school's actual summer break runs `2027-05-28` → `2027-08-12` (informational only, not the search dates).
2. **San Jose stops being its own fare-grid card.** California becomes a dedicated "cheapest California ticket" search — querying a short list of CA airports directly across all 5 `schoolBreaks` windows — and that single cheapest result is appended as the **5th, fixed slot** in the existing "Cheapest flights anywhere (≤6h)" section (which shrinks from top-5 to top-4 organic results + 1 California slot). The anywhere section itself stays as-is otherwise.

Net effect: the fare grid shrinks to 3 cards (CRK, XIY, XUZ), each now showing real prices instead of "unavailable" (assuming SerpApi has data within these nearer-term windows). The anywhere section keeps 5 cards, but the 5th is always California, not whatever the explore engine ranked 5th.

## Key decisions

- **California airports:** query `SJC`, `SFO`, `SAN` directly via the existing fixed-route `google_flights` search (same reliable per-route method already used for CRK/XIY/XUZ), not the `google_travel_explore` engine — its per-destination state/location field isn't confirmed reliable. Reuses proven code path, no new API behavior to trust.
- **Route/airport type split:** `FlightRoute.destination` narrows to `"CRK" | "XIY" | "XUZ"` (SJC drops out of the fare-grid route list entirely). A new, separate `CaliforniaAirport` type (`{ origin: "DFW"; destination: "SJC" | "SFO" | "SAN"; label: string }`) holds the CA list. `serpApiFlightsUrl`/`getFlightSnapshot` in `flights.ts` get their route parameter type widened to a minimal structural shape (`{ origin: "DFW"; destination: string; label: string }`) so both `FlightRoute` and `CaliforniaAirport` satisfy it — avoids duplicating the fetch/parse logic for California.
- **Duration for the California card:** the anywhere card layout displays one-way duration, which the existing `google_flights`-based `selectLowestEligibleFlight` doesn't currently capture (only `amount`/`stops`). Extend it to also read `total_duration` (minutes) from each SerpApi flight option when present, so the California-sourced `AnywhereFlightOption` can populate `durationMinutes` the same way explore-sourced entries do.
- **`fareSearch`:** drops `departureDate`/`returnDate` (no longer used for windowing — Summer Break in `schoolBreaks` replaces that purpose). Keeps `adults`/`cabin` since those still feed the SerpApi query params.
- **Failure behavior:** if the California search fails/returns nothing, the anywhere section falls back to 4 cards (top-4 organic only) rather than erroring the whole section — consistent with the existing fail-closed-per-window pattern in `flights-anywhere.ts`.

## Files to change

**`src/lib/dashboard/types.ts`**
- `FlightRoute.destination`: `"CRK" | "XIY" | "XUZ"` (drop `"SJC"`).
- Add `CaliforniaAirportCode = "SJC" | "SFO" | "SAN"` and `CaliforniaAirport = { origin: "DFW"; destination: CaliforniaAirportCode; label: string }`.

**`src/lib/dashboard/config.ts`**
- `flightRoutes`: drop the SJC entry — CRK/XIY/XUZ only.
- `schoolBreaks`: add a 5th entry, `{ label: "Summer Break", departureDate: "2027-06-18", returnDate: "2027-07-09" }` (comment noting the full summer break is `2027-05-28`–`2027-08-12`, this window is the mid-summer slice used for search).
- Add `californiaAirports: CaliforniaAirport[]` — `SJC` (San Jose), `SFO` (San Francisco), `SAN` (San Diego).
- `fareSearch`: drop `departureDate`/`returnDate`; keep `adults`/`cabin`.

**`src/lib/dashboard/flights.ts`**
- Remove the `fareSearchWindow` constant and the `route.destination === "SJC" ? schoolBreaks : [fareSearchWindow]` branch in `getFlightDashboard()` — every route in `flightRoutes` (now just CRK/XIY/XUZ) always searches all 5 `schoolBreaks` windows and takes the cheapest, same logic already proven for SJC.
- Widen the route parameter type on `serpApiFlightsUrl`/`getFlightSnapshot` to the minimal structural shape described above so `flights-anywhere.ts` can call them directly for California airports.
- Extend `selectLowestEligibleFlight` to also extract `durationMinutes` from `total_duration` (numeric, minutes) on each flight option when present; keep it optional so existing `FlightSnapshot` usage (which ignores duration) is unaffected.

**`src/lib/dashboard/flights-anywhere.ts`**
- `getAnywhereDashboard()`: pool across all 5 `schoolBreaks` windows (was 4) via the explore engine, rank, take **top 4** (was top 5).
- Add `getCaliforniaFare(): Promise<AnywhereFlightOption | null>`: for each of `californiaAirports` × each of `schoolBreaks`, fetch via the shared `getFlightSnapshot`/`serpApiFlightsUrl` logic from `flights.ts` (reused, not reimplemented), take the single cheapest result across all airport/window combinations, map to `AnywhereFlightOption` (`destination` = the winning airport's label, `windowLabel` = the winning break's label).
- Compose the final list as top-4 explore results + the California result appended as the fixed 5th entry (regardless of price order). If the California search returns nothing, the section falls back to 4 cards.

**`src/app/personal/page.tsx`**
- No structural changes needed — the fare grid already maps over `flights` (now naturally 3 cards since `flightRoutes` shrank) and the anywhere section already maps over whatever `anywhere.value` contains (now naturally 5, with California last). Confirm the `sm:grid-cols-2 lg:grid-cols-4` grid on the fare section still reads fine with 3 cards.

**Tests**
- `src/lib/dashboard/config.test.ts`: destination list → `["CRK", "XIY", "XUZ"]`; `schoolBreaks` assertion extended to 5 entries including Summer Break; add assertion for `californiaAirports` (codes `SJC`/`SFO`/`SAN`, all origin `DFW`).
- `src/lib/dashboard/flights.test.ts`: update for the removed SJC branch (route/window logic now uniform across all 3 routes); `serpApiFlightsUrl` test unaffected in shape (still takes a route + window).
- `src/lib/dashboard/flights-anywhere.test.ts`: update `selectTopAnywhereFlights`/pooling tests for 5 windows and top-4 cap; add tests for the California cheapest-selection logic — cheapest wins across airports and windows, and an all-failed/empty case returns `null` (section falls back to 4 cards).

## Verification

- `npm run typecheck`
- `npm test` (vitest) — updated and new unit tests above
- `npm run build`
- Manual: hit `/personal` locally with `SERP_API_KEY` set, confirm CRK/XIY/XUZ show real prices (not "unavailable") pulled from one of the 5 windows, the fare grid shows 3 cards, and the anywhere section shows 5 cards with California always last.
