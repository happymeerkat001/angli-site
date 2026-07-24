---
title: "feat: NVDA stock section, multi-calendar fix, month-grid calendar"
date: 2026-07-21
type: feat
depth: standard
---

# feat: NVDA stock section, multi-calendar fix, month-grid calendar

## Summary

Three additions to the `/personal` dashboard: (1) an NVDA position section below the news — live price, P/L against a $245.99 cost basis (~203.26 shares ≈ $50k), NVDA headlines, and an AI-generated analysis with a suggested limit-sell price; (2) fix the calendar so events from **all** calendars on the Google account (including the subscribed Apple calendar) appear, not just `primary`; (3) an Apple-style month-grid calendar view.

---

## Problem Frame

- The dashboard has no market data. User holds ~203.26 NVDA shares (cost basis $245.99/share, ~$50k) and wants price, news, and a daily AI take with a limit-sell suggestion in one place.
- `src/lib/dashboard/calendar.ts` queries a single `calendarId` (`GOOGLE_CALENDAR_ID || "primary"`). The Apple calendar subscribed in Google Calendar lives under a different calendar ID, so its events never reach the dashboard. This is a code gap, not a sync problem.
- The "Next 30 days" agenda is a flat list; user wants an Apple-Calendar-like month grid (squares, date numbers, events in cells).

## Requirements

- R1: Stock section below the news section showing NVDA live price, day change, position value, and unrealized P/L vs. cost basis.
- R2: 3–5 recent NVDA headlines, same visual language as existing news items.
- R3: AI analysis paragraph + a specific suggested limit-sell price, refreshed at most daily, clearly labeled "not financial advice."
- R4: Analysis LLM must be swappable via env vars (user may point at MiniMax M2/M3-class hosted model or any OpenAI-compatible endpoint); no hardcoded provider.
- R5: Calendar reads events from every calendar visible to the account (or an explicit env-configured list), merged and sorted.
- R6: Month-grid calendar UI with day squares, date numbers, and events rendered inside their day cells; agenda list retained below as a compact fallback.
- R7: Every new data source follows the existing fail-closed `SourceResult` pattern — one source failing never breaks the page.

---

## Key Technical Decisions

- **Stock quotes: Yahoo Finance v8 chart endpoint, keyless** (`https://query1.finance.yahoo.com/v8/finance/chart/NVDA`). No signup, returns current price + previous close. It is unofficial and can break (research: broke twice in a two-week yfinance test window); acceptable because the section fails closed to "unavailable" exactly like flights do, and the fetch is cached. Fallback documented in Risks: switch to Finnhub (free key, 60 calls/min, ~20-min delay) via `FINNHUB_API_KEY` if Yahoo becomes unreliable. Cache: `next: { revalidate: 900 }` (15 min) — price staler than that is fine for a hold-position dashboard, and it keeps request volume trivial.
- **Position is config, not API**: `stockPosition = { symbol: "NVDA", shares: 203.26, costBasisPerShare: 245.99 }` in `src/lib/dashboard/config.ts`. No brokerage integration.
- **News: reuse the existing Google News RSS pattern** (`googleNewsSearch("NVIDIA NVDA stock")` in `config.ts`, parsed by the existing `news.ts` fetch/parse path). No new dependency, no scraping. Tykr has no public API; Notte/Printing-Press scraping rejected as fragile with no data advantage (consistent with the flights decision earlier in `docs/plans/2026-07-21-003-*`).
- **AI analysis: OpenAI-compatible chat-completions call, fully env-driven** — `STOCK_LLM_BASE_URL`, `STOCK_LLM_API_KEY`, `STOCK_LLM_MODEL`. This makes the cheap-model choice (MiniMax M2/M3, DeepSeek, Anthropic via a compatible gateway, or a self-hosted endpoint) a Vercel env-var swap, not a code change. Cached with `next: { revalidate: 86_400 }` (daily). Prompt receives: current price, cost basis, shares, day change, and headline titles; asks for a short analysis and a single numeric limit-sell suggestion; response parsed defensively (fail closed if the number can't be extracted). Output rendered with an explicit "AI-generated, not financial advice" line.
  - **Local-LLM note (decided against as primary)**: Vercel cannot reach a Mac-local model at request time. If the user later wants local, the seam is the same env vars pointed at a tunneled/pushed endpoint — no redesign needed.
- **Calendar fix: enumerate via `calendarList.list()`**, then query events per calendar and merge. `GOOGLE_CALENDAR_IDS` (comma-separated) as an optional override to pin an explicit list. Existing OAuth scope `calendar.readonly`-class refresh token already covers `calendarList.list`.
- **Month grid is a pure server-rendered component** — no client JS, no new dependency. Compute the grid for the current month (and next month when the 30-day window spans it) from the same `CalendarEvent[]` the agenda uses. Default layout: grid first, compact agenda list below (user didn't override this call-out; safest default preserves existing information).

---

## Implementation Units

### U1. Stock quote + position math

**Goal**: `getStockSnapshot()` returning price, day change, position value, unrealized P/L.
**Files**: `src/lib/dashboard/stock.ts` (new), `src/lib/dashboard/stock.test.ts` (new), `src/lib/dashboard/config.ts` (`stockPosition`), `src/lib/dashboard/types.ts` (`StockSnapshot`, position type).
**Approach**: fetch Yahoo v8 chart JSON (`range=1d`), extract `regularMarketPrice` + `chartPreviousClose` from `chart.result[0].meta`; compute derived fields from `stockPosition`. `SourceResult<StockSnapshot>`, 15-min revalidate, 10s `AbortSignal.timeout`, defensive `unknown`-typed parsing like `SerpFlightsResponse`.
**Patterns**: `flights.ts` fetch/parse/fail-closed structure.
**Test scenarios**: happy path computes P/L correctly from mocked response (203.26 × price − 50,000-ish basis math, exact expected values); missing/NaN price → error result; non-200 → error result; malformed JSON → error result; day-change sign correctness when price < previous close.
**Verification**: unit tests pass; section renders live locally.

### U2. NVDA news feed

**Goal**: 3–5 NVDA headlines via the existing RSS path.
**Dependencies**: none (parallel with U1).
**Files**: `src/lib/dashboard/config.ts` (add stock news source or standalone feed URL), `src/lib/dashboard/stock.ts` (or reuse `news.ts` fetch helper — implementer's call; prefer reusing the existing parse function exported from `news.ts`), tests in `src/lib/dashboard/stock.test.ts`.
**Approach**: `googleNewsSearch("NVIDIA NVDA stock")`; cap at 5 items. Keep stock headlines out of `mixNewsItems` (they belong to the stock section, not the daily briefing).
**Test scenarios**: query URL contains expected search term; cap at 5; feed failure → error result without affecting other sources.

### U3. AI analysis + limit-sell suggestion

**Goal**: `getStockAnalysis(snapshot, headlines)` → `{ analysis: string, limitSellPrice: number }` via env-configured OpenAI-compatible endpoint.
**Dependencies**: U1, U2 (inputs).
**Files**: `src/lib/dashboard/stock-analysis.ts` (new), `src/lib/dashboard/stock-analysis.test.ts` (new).
**Approach**: POST `{base_url}/chat/completions` with `STOCK_LLM_MODEL`; system prompt requests strict JSON (`{"analysis": "...", "limit_sell": 123.45}`); parse defensively — non-JSON, missing fields, or non-numeric limit → error result. Missing env vars → error result "Analysis not configured" (page still shows price/news). Daily revalidate, 30s timeout.
**Test scenarios**: happy path parses JSON reply; reply wrapped in markdown fences still parses (strip fences); missing env → configured-off error; endpoint 500 → error; non-numeric limit → error; prompt includes price/cost-basis/headlines (assert on request body).
**Verification**: with a real key set, analysis renders and the limit price is a plausible number > 0.

### U4. Stock section UI

**Goal**: section on `/personal` directly below "Mixed headlines".
**Dependencies**: U1–U3.
**Files**: `src/app/personal/page.tsx`.
**Approach**: match existing section chrome (icon — `TrendingUp` from lucide, accent kicker, serif h2). Card row: price + day change, position value, P/L (green/red), suggested limit sell. Headlines list under it; analysis paragraph with the disclaimer line "AI-generated analysis — not financial advice." Fail-closed copy per sub-source (price unavailable / analysis unavailable / news unavailable independently).
**Test expectation**: none — presentational; verified manually + typecheck/build.

### U5. Multi-calendar events

**Goal**: agenda includes events from all account calendars (Apple subscription included).
**Files**: `src/lib/dashboard/calendar.ts`, `src/lib/dashboard/calendar.test.ts`.
**Approach**: `calendarList.list()` → ids (filter `selected !== false`); honor `GOOGLE_CALENDAR_IDS` override when set; `Promise.all` per-calendar `events.list` (existing params), merge, de-dupe by `(start, title)` (the same event can exist on two calendars), sort, cap ~30. One calendar failing → log + continue with the rest; all failing → error result.
**Test scenarios**: merge across two mocked calendars sorted by start; de-dupe identical `(start, title)`; env override skips `calendarList.list`; one calendar 403 → others still returned; all fail → error result.
**Verification**: Apple-calendar events visibly appear on `/personal`.

### U6. Month-grid calendar UI

**Goal**: Apple-style month grid replacing the top of the calendar section; compact agenda below.
**Dependencies**: U5.
**Files**: `src/components/MonthGrid.tsx` (new), `src/lib/dashboard/calendar-grid.ts` (new — pure date/bucket helpers), `src/lib/dashboard/calendar-grid.test.ts` (new), `src/app/personal/page.tsx`.
**Approach**: pure helper builds weeks (Sun–Sat) for the month(s) covering today→+30d, buckets events by `America/Chicago` calendar date (all-day vs timed handled distinctly). Component renders bordered day squares, muted out-of-month days, accent ring on today, up to 2–3 event chips per cell with "+N more" overflow. Tailwind only, existing card chrome.
**Test scenarios** (helpers only): month starting mid-week pads leading days; timed event buckets to correct Chicago date (UTC event near midnight); multi-day all-day event appears on each covered day; 30-day window spanning two months yields both months' grids; empty events → empty buckets, grid still shaped correctly.
**Verification**: grid visually matches expectation on desktop + mobile widths.

### U7. Docs + env inventory

**Goal**: record new env vars (`STOCK_LLM_BASE_URL/API_KEY/MODEL`, optional `GOOGLE_CALENDAR_IDS`, optional `FINNHUB_API_KEY` fallback note) wherever `SERP_API_KEY` is documented.
**Dependencies**: U3, U5.
**Files**: follow the pattern of commit `638d707` ("docs: document SERP_API_KEY as required Vercel env var").
**Test expectation**: none — docs.

---

## Suggested Improvements (requested review, deferred to follow-up unless promoted)

1. **Streaming/Suspense**: `page.tsx` awaits all sources serially-in-parallel before painting; wrapping sections in `<Suspense>` would paint news instantly while SerpApi/LLM resolve. Biggest perceived-speed win available.
2. **Shared card/section components**: section-header and card markup is copy-pasted across four sections (and growing with the stock section); extract `SectionHeader` + `Card` once U4/U6 land.
3. **`lg:grid-cols-5` squeeze**: five cards per row get cramped ~1024–1280px; consider `xl:grid-cols-5 lg:grid-cols-3`.
4. **Empty-state consistency**: several fallback strings end with a stray period after `{message}` interpolation ("{message}.") — audit once.
5. **`force-dynamic` + per-fetch revalidate is correct but undocumented** — a short comment in `page.tsx` would prevent a future "optimization" from breaking the caching model.

---

## Scope Boundaries

**In**: everything under Implementation Units.
**Out (non-goals)**: brokerage/portfolio integration; trade execution of any kind (display-only — the dashboard never places orders); Tykr scraping; local-LLM runtime on Vercel; calendar write access; client-side interactivity in the month grid (navigation between months beyond the current window).
**Deferred to follow-up**: the Suggested Improvements list above; Finnhub fallback implementation (documented seam only); month-grid prev/next navigation.

---

## Risks

- **Yahoo endpoint breakage** (medium likelihood, low impact): fails closed to "Price unavailable"; seam ready for Finnhub swap.
- **LLM JSON discipline** (medium/low): cheap models sometimes wrap JSON in prose; fence-stripping + strict parse + fail-closed covers it.
- **Apple-calendar staleness upstream** (low, out of our control): Google refreshes subscribed ICS feeds only every ~24–48h; events may lag Apple by up to two days. Worth telling the user once — this is the residual gap after U5 and no code can fix it.
- **`calendarList` returns noise** (low): holidays/birthdays calendars may flood the grid; `GOOGLE_CALENDAR_IDS` override is the escape hatch.

## Verification (whole plan)

`npm run typecheck`, `npm test`, `npm run build`; manual `/personal` check: stock section shows price/P&L/limit suggestion + disclaimer; Apple-calendar event visible; month grid renders correctly across the month boundary (July→August 2026 window is a live test of the two-month case).
