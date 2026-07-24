# Manual flight refresh (button-triggered, no auto-fetch on page load)

## Context

Follow-up to the SerpApi quota fix (weekly cache bump, `docs/plans/2026-07-22-002-feat-calendar-7day-flex-anywhere-plan.md`'s booking-window filter). User originally asked for a way to mark a school-break window (e.g. Fall Break) "booked" so it stops displaying and stops calling the API, freeing quota for the next season (Thanksgiving).

Clarified via discussion:
- The dashboard is deployed on Vercel, where the filesystem is read-only — a persistent "booked" checkbox would need external storage (Edge Config / KV). User rejected that: **"just have a button to run the API, so it doesn't run on page load."**
- Follow-up: does a booked season still need to be hidden from the list? **No — manual refresh alone is enough.** Once a season isn't refreshed anymore, the stale card can stay visible; no hide/mark-booked UI is needed.

Net effect: replace all automatic, time-based SerpApi refetching with an explicit manual trigger. This subsumes the original "stop pulling the API for a booked season" ask — once Fall Break is booked, the user simply stops clicking refresh for it (or clicks it rarely) instead of it running on a schedule.

## Approach

### 1. Cache flight fetches indefinitely, tagged for manual invalidation

Currently `src/lib/dashboard/flights.ts` (`getFlightSnapshot`, used by both fixed routes and the California leg via `getFlexFlightSnapshot`) and `src/lib/dashboard/flights-anywhere.ts` (`getAnywhereDashboard`'s explore fetch) use `next: { revalidate: 604_800 }` — a 7-day auto-refetch. Switch both to `next: { revalidate: false, tags: ["flights"] }`. `revalidate: false` means Next's Data Cache serves the cached response indefinitely; the entry is only invalidated when something explicitly calls `revalidateTag("flights")`. Every flight-related fetch call shares the one tag — there's no need for per-route or per-window granularity since the refresh is a single manual action, not selective.

Practical implication: the very first request for a given fetch (cold cache — e.g. right after a deploy) still hits SerpApi once, same as today. After that, no page load re-triggers a network call until the tag is explicitly revalidated.

### 2. Server Action to invalidate the tag

New file `src/app/personal/actions.ts` with a `"use server"` directive, exporting `refreshFlights()` that calls `revalidateTag("flights")` from `next/cache`. This is the only thing the action does — no arguments, no per-window targeting, matching the "manual refresh is enough" decision.

### 3. Refresh button + last-updated indicator on the page

`src/app/personal/page.tsx`: add a plain `<form action={refreshFlights}>` with a submit button ("Refresh flights") placed once, above the Summer Fares / Anywhere sections (both are flight data, one button covers both). No client component needed — Server Actions work from a form in a Server Component; Next re-renders the page after the action runs, and the now-invalidated `flights` tag causes the next `getFlightDashboard()` / `getAnywhereDashboard()` calls in that render to hit SerpApi fresh.

Also surface a "Last refreshed: {date}" line so it's clear the data isn't live: derive it from the most recent `fetchedAt` across the `flights` array (`FlightSnapshot.fetchedAt` already exists — no type changes needed). Format with the existing `America/Chicago` `Intl.DateTimeFormat` convention used elsewhere on the page.

### Tests

- `src/lib/dashboard/flights.test.ts`: update the fetch-options assertion — expect `next: { revalidate: false, tags: ["flights"] }` instead of the 604,800 revalidate value.
- `src/lib/dashboard/flights-anywhere.test.ts`: same assertion update for the explore fetch.
- `src/app/personal/actions.test.ts` (new): mock `next/cache`'s `revalidateTag` and assert `refreshFlights()` calls it with `"flights"`.

## Verification

- `npm run typecheck` · `npm test` · `npm run build`
- Manual: load `/personal` twice in a row — confirm (via server logs or SerpApi dashboard) no second network call fires. Click "Refresh flights" — confirm a fresh SerpApi call fires and the page re-renders with an updated "Last refreshed" timestamp.
