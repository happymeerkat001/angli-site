# Family trip dates within school breaks

Status: proposed for Leon's review. Do not implement until approved; implementation through Cursor, followed by Codex review.

## Outcome and agreed rules

Treat each school break as the permitted travel window, not the itinerary. Search trips lasting 3–7 nights, inclusive, with departure and return both within the break. Nights means the calendar-date difference between outbound and return dates; this does not establish hotel nights at the destination for overnight international flights.

Thanksgiving trips must include Thanksgiving Day. Winter trips must include Christmas Day, New Year's Day, or both. Inclusion is inclusive of departure and return dates: December 25, 2026–January 1, 2027 qualifies for both and is seven nights. Other breaks have no holiday requirement. Rank qualifying cash fares by price; covering both winter holidays does not justify silently preferring a more expensive fare.

Apply this to the seasonal cheapest-anywhere, California, points, and Frontier rows. Proposed scope: keep the separately configured Clark/Xi'an/Xuzhou international summer search unchanged. Confirm this distinction during review.

## Findings

- `config.ts` holds fall Oct 10–13, Thanksgiving Nov 21–29, winter Dec 19–Jan 6, spring Mar 13–21. Summer currently searches June 18–July 9; a comment records the full break as May 28–Aug 12, 2027.
- `flex-dates.ts` generates at most five end-trimmed variants, often still too long.
- Anywhere Explore searches the whole window once, and California searches three airports with up to five variants each: up to 16 seasonal SerpApi calls today.
- Points reuses the anywhere destination pile, keyed only by season label.
- Frontier parses advertised deals; its overlap check accepts one matching endpoint and includes one-way deals. It is not a round-trip availability search.
- Stored rows and fallback data can survive policy changes. Refresh uses a 60-second lock and independent row refresh controls.

## Proposed implementation

1. **Separate allowed windows from trip candidates.** Add explicit holiday metadata to school-break configuration and shared pure helpers for strict dates, date differences, inclusive holiday coverage, containment, and candidate generation. Generate all valid pairs in memory, excluding past departures, then choose a bounded search batch. Handle year-crossing winter, ongoing breaks and empty/expired windows. Do not change the international flex helper accidentally.
2. **Bound date discovery.** Search at most five date pairs per selected-season refresh, using each pair for one Explore call plus the three California airports: at most 20 seasonal calls, excluding the unchanged international row. Include Dec 25–Jan 1 in the first winter batch, then cover both single-holiday groups and varied durations. For other breaks distribute initial samples across the window and durations. Persist a per-policy/per-season cursor so subsequent explicit refreshes rotate through remaining pairs; after exhaustion repeat. No automatic background sweeps. Deduplicate before requests, limit concurrency and bound total execution time so requests cannot outlive the refresh lock; review the deployed function deadline before finalizing the batch executor.
3. **Filter before ranking.** Validate actual returned dates against the full policy, not just requested dates. Merge valid results across sampled pairs, choose cheapest per destination, then retain the existing card limits, California inclusion and points ranking. Share the eligible pile with points rather than duplicating date searches. On partial failures retain valid successes and indicate incomplete coverage; no result is different from a failed search. Call results “lowest found,” not an exhaustive cheapest-date guarantee.
4. **Frontier eligibility.** Only complete advertised round trips satisfying the same policy enter the qualifying results. One-way offers cannot demonstrate duration or holiday coverage and should not appear as qualifying trips. Explain an empty result honestly; do not fabricate a return price, pair unrelated outbound deals, or claim comprehensive Frontier coverage. Retain the existing Frontier source and booking link.
5. **Cache and refresh correctness.** Store a policy fingerprint including date boundaries and holiday rules, plus search cursor/coverage metadata. Reuse points piles only when both season and fingerprint match. Reject or clearly retire legacy/nonmatching caches at read time without fetching on page load. Preserve valid same-policy fallback data with its true season and timestamp; never relabel another season's retained fares. Tie lock ownership and timeout to the bounded refresh lifecycle so an expired old refresh cannot release a newer lock.
6. **User-facing dates.** Show the break as “Travel window,” the 3–7-night rule and holiday rule near the selector, and actual itinerary dates plus night count on cards. Mark Christmas/New Year's/Thanksgiving coverage briefly. Keep purchase-method explanations. Explain sampled-date coverage in a short note. Proposed summer window expands to May 28–Aug 12 from the existing code comment; confirm those calendar dates before relying on them.

## Likely files

`src/lib/dashboard/config.ts`, `types.ts`, `flex-dates.ts` (or a dedicated `trip-dates.ts`), `flights.ts`, `flights-anywhere.ts`, `flights-frontier.ts`, `flight-refresh.ts`, `flight-store.ts`, `src/app/personal/page.tsx`, and their corresponding tests. Touch action/runtime configuration only if needed to enforce the bounded refresh deadline. Preserve unrelated working changes and existing purchase-recommendation logic.

## Acceptance and verification

- Accept exactly 3 and 7 nights; reject 2 and 8. Reject malformed dates, reversed dates, past departures and either endpoint outside the break.
- Accept holiday on either travel day; reject winter trips covering neither holiday and Thanksgiving trips missing Thanksgiving Day. Include the seven-night two-holiday winter candidate.
- Fall Oct 10–13 yields exactly one valid three-night pair. Cross-year and leap-day calculations use strict calendar arithmetic.
- All provider-returned dates are filtered before deduplication, card ranking, California selection or points reuse.
- Frontier one-way/unknown return and overlap-only fixtures do not qualify; a valid advertised round trip does.
- Assert at most five unique date pairs and 20 seasonal API calls per refresh, deterministic first batch, rotation, exhaustion, bounded concurrency, partial failure and timeout behavior. No paid live-search sweep during tests.
- Cover old cache migration, changed window/holiday fingerprint, season switching, stale points piles, correct failure labels and lock ownership.
- Verify desktop/mobile cards with fixture trips; run related tests, full test suite, TypeScript and production build. Review Cursor's diff before asking about shipping.

## Review decisions

Approve or revise: five-date batches (sampled lowest found, not exhaustive), full summer window subject to date confirmation, seasonal rows only versus also shortening the separate international routes, and excluding unverified Frontier one-way offers from qualifying trips. No implementation, commit or deployment is authorized by this plan alone.
