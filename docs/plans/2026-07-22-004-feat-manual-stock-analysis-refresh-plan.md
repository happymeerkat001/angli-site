# Manual stock analysis refresh (button-triggered, no AI call on page load)

## Context

Same problem as the flight refresh work (`docs/plans/2026-07-22-003-feat-manual-flight-refresh-plan.md`), applied to the "Suggested limit sell" / AI commentary block: `getStockAnalysis` in `src/lib/dashboard/stock-analysis.ts` calls an LLM chat-completions endpoint on every `/personal` load, cached only 24h (`next: { revalidate: 86_400 }`). That's an LLM call on every uncached page load, same shape as the SerpApi problem already fixed.

Scope is the AI recommendation only — `getStockAnalysis` (the limit-sell price + written analysis, driven by `STOCK_LLM_*` env vars). It does **not** cover `getStockSnapshot` in `src/lib/dashboard/stock.ts` (the live NVDA price from Yahoo, `next: { revalidate: 900 }`) — that's a live quote, not an AI recommendation, and re-fetching it cheaply on a schedule is the correct behavior the user isn't asking to change.

Reuses the exact mechanism already shipped for flights: indefinite cache + tag, `revalidateTag` in a Server Action, a form button, and a "Last refreshed" timestamp — no new architecture.

## Approach

### 1. Cache the analysis fetch indefinitely, tagged for manual invalidation

`src/lib/dashboard/stock-analysis.ts`: change the chat-completions `fetch` call's `next: { revalidate: 86_400 }` to `next: { revalidate: false, tags: ["stock-analysis"] }`. Separate tag from `"flights"` since these are independent data sources refreshed independently — a flights refresh shouldn't re-trigger an LLM call and vice versa.

### 2. Server Action to invalidate the tag

`src/app/personal/actions.ts` already exists with `"use server"` and `refreshFlights()`. Add a second export, `refreshStockAnalysis()`, calling `revalidateTag("stock-analysis")`. Same file, same pattern, no new file needed.

### 3. Refresh button + last-updated indicator on the stock section

`src/app/personal/page.tsx`: add a second `<form action={refreshStockAnalysis}>` with a "Refresh analysis" submit button in the stock section (`aria-labelledby="stock-heading"`), mirroring the existing flights refresh button's placement and styling. Add a "Last refreshed" line for the analysis, using `StockAnalysis`'s absence of a timestamp field as the reason to add one (see below) rather than approximating from an unrelated source.

`StockAnalysis` (`src/lib/dashboard/stock-analysis.ts`) currently has no `fetchedAt` field, unlike `FlightSnapshot`. Add `fetchedAt: string` to the type and set it in `getStockAnalysis` the same way `getFlightSnapshot` does (`new Date().toISOString()` at call time), so the page can render "Last refreshed" without guessing. This is a one-field type addition, not a new pattern.

### Tests

- `src/lib/dashboard/stock-analysis.test.ts`: update the fetch-options assertion to expect `next: { revalidate: false, tags: ["stock-analysis"] }`; add/update a case asserting `fetchedAt` is present on the returned `StockAnalysis`.
- `src/app/personal/actions.test.ts`: add a case mocking `next/cache`'s `revalidateTag` and asserting `refreshStockAnalysis()` calls it with `"stock-analysis"`.

## Verification

- `npm run typecheck` · `npm test` · `npm run build`
- Manual: load `/personal` twice in a row — confirm no second LLM call fires (check `STOCK_LLM_*` provider logs, or console output if self-hosted). Click "Refresh analysis" — confirm a fresh call fires and the page re-renders with an updated "Last refreshed" timestamp and (potentially) a new limit-sell price/analysis.
