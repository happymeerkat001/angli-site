# Reorder dashboard, manual news refresh, fix NVDA cost basis

## Context

Three independent corrections to `/personal`:

1. **Reorder**: "Next 7 Days" (the calendar agenda) currently renders last on the page. Move it to the top, above Daily Briefing.
2. **Manual news refresh**: the "Daily Briefing / Mixed headlines" section (`getNewsDashboard` → `getNewsSource`, `src/lib/dashboard/news.ts`) fetches RSS feeds with `next: { revalidate: 3600 }` — refetches on every page load once the hour rolls over. Same shape as the flights/stock-analysis problem already fixed twice this project (see `docs/plans/2026-07-22-003-feat-manual-flight-refresh-plan.md`, `docs/plans/2026-07-22-004-feat-manual-stock-analysis-refresh-plan.md`): switch to indefinite cache + tag + Server Action + button, no new architecture.
3. **Cost basis bug**: `stockPosition.costBasisPerShare` in `src/lib/dashboard/config.ts` is `245.99`; the user actually bought NVDA at `26.85`. This value feeds `unrealizedPL = shares * (price - costBasisPerShare)` in `src/lib/dashboard/stock.ts` (`parseStockQuote`), so the P/L shown in the "Unrealized P/L" card is currently wrong by a large margin. One-line data fix.

Scope note: the stock section's headlines (`getStockHeadlines`, a separate `getNewsSource(stockNewsSource)` call) are not part of "Daily Briefing" and are not touched — only `newsSources`-driven `getNewsDashboard` is in scope for the refresh button.

## Approach

### 1. Move "Next 7 Days" to the top

`src/app/personal/page.tsx`: relocate the `calendar-heading` `<section>` (currently the last section, ~line 169-177) to immediately after the page header `<section>` (before `news-heading`). Pure JSX reordering — no logic changes, no data-fetching changes. The `Promise.all` at the top of the component already fetches `agenda` alongside everything else, so no fetch-ordering change is needed either.

### 2. Manual refresh for Daily Briefing headlines

- `src/lib/dashboard/news.ts`, `getNewsSource`: change the RSS `fetch`'s `next: { revalidate: 3600 }` to `next: { revalidate: false, tags: ["news"] }`. New tag, separate from `"flights"` and `"stock-analysis"` — headlines refresh independently of flights/stock.
- `src/app/personal/actions.ts`: add `refreshNews()` calling `revalidateTag("news")`, following the existing `refreshFlights`/`refreshStockAnalysis` pattern in the same file.
- `src/app/personal/page.tsx`: add a `<form action={refreshNews}>` with a "Refresh headlines" submit button in the `news-heading` section, styled like the existing refresh buttons (`rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white`). No "Last refreshed" timestamp — `NewsItem` has no `fetchedAt` field and none of the three headline sources (`stockHeadlines` either) currently expose fetch time; adding one is unnecessary scope for a cosmetic RSS feed where staleness is low-stakes. Skip it, matching what the user actually asked for (just a refresh button).

### 3. Fix NVDA cost basis

`src/lib/dashboard/config.ts`: change `stockPosition.costBasisPerShare` from `245.99` to `26.85`. No other code changes — `parseStockQuote` in `src/lib/dashboard/stock.ts` already computes `unrealizedPL` and `positionValue` from this field, so the corrected P/L flows through automatically.

### Tests

- `src/lib/dashboard/news.test.ts`: update the fetch-options assertion to expect `next: { revalidate: false, tags: ["news"] }`.
- `src/app/personal/actions.test.ts`: add a case mocking `next/cache`'s `revalidateTag` and asserting `refreshNews()` calls it with `"news"`.
- `src/lib/dashboard/stock.test.ts`: update any fixture/expectation that hardcodes the old `245.99` cost basis or its derived `unrealizedPL`; add/adjust a case asserting `unrealizedPL` reflects `26.85` as cost basis (e.g., `shares * (price - 26.85)` for a known price fixture).

## Verification

- `npm run typecheck` · `npm test` · `npm run build`
- Manual: load `/personal`. Confirm "Next 7 Days" renders first, above Daily Briefing. Confirm the Daily Briefing section has a "Refresh headlines" button; load the page twice in a row and confirm no second RSS fetch fires (server logs), then click the button and confirm a fresh fetch fires. Confirm "Unrealized P/L" now reflects a `26.85` cost basis.
