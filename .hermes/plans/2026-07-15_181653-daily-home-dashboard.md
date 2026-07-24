# Daily Home Dashboard Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn `https://www.angli.site/` into a fast, personal daily dashboard with grouped news, Philippines coverage, once-daily DFW flight-price snapshots, and a PadSplit dashboard shortcut.

**Architecture:** Keep the home page a server-rendered Next.js App Router page. Put network access behind small provider adapters in `src/lib/dashboard/`, normalize all remote results into shared types, and use Next `fetch` revalidation so a transient upstream outage never takes down the page. Render only headlines, publisher, timestamp, and a canonical outbound link; do not scrape or republish paid article bodies.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS v4, Lucide React, `fast-xml-parser` for RSS/Atom parsing, Vitest for pure-adapter tests, and a licensed flight-search API selected before implementation.

---

## Current context and constraints

- The home page is currently a marketing landing page in `src/app/page.tsx:1-55`; it has no data fetching, dashboard components, API routes, or test runner.
- The site already uses server components by default, Tailwind utility classes, and `lucide-react`. `src/components/Nav.tsx:1-83` is the only client component found.
- `package.json:5-27` has no XML parser, test library, or flight/news SDK. Add only the parser and test tooling needed for this feature; call remote APIs with native `fetch`.
- `news.google.com/rss` returned `200 application/xml` during discovery. The three publisher home pages returned HTML; no stable public RSS/API contract was established during inspection. Treat a direct publisher API/feed as opt-in only after its terms and endpoint are confirmed.
- `crosscheck.news` was named twice in the request; this plan treats it as one source.
- Do not read or commit `.env`; add only variable names and comments to `.env.example`.
- Preserve the existing HT101 middleware and all current pages. This is a homepage enhancement, not a replacement of the archive, projects, real-estate, or booking pages.

## Assumptions to confirm before the flight implementation task

1. **Taiwan airport:** default to Taipei Taoyuan (`TPE`) unless Ang specifies another airport/city.
2. **Search pattern:** prices are not meaningful without dates. Default to economy, one adult, round trip, one checked-bag-neutral price, departing 60–90 days out for seven nights; make these values configuration constants rather than UI controls in version one.
3. **Flight supplier:** obtain a production credential and commercial permission for one provider (recommended: a licensed flight-search API that exposes documented JSON fares). Do not scrape Google Flights, airline sites, or OTA pages. The implementation will use `FLIGHT_API_BASE_URL`, `FLIGHT_API_KEY`, and provider-specific request/response mapping; the exact endpoint and normalized price semantics must come from the chosen provider’s current documentation.
4. **News source policy:** use Google News RSS as the reliable transport for Google News, Dallas News, CrossCheck, and HoopsHype source-filtered searches unless each publisher supplies an approved API/feed. This satisfies a combined reading view without bypassing paywalls or terms. Each card must link to the original publisher article.

If any assumption differs, resolve it before Task 7. The dashboard and source-normalization work can proceed independently.

## Proposed dashboard behavior

- At the top of `/`, show a compact “Today” dashboard header with the Dallas local date and a “Last refreshed” timestamp.
- **News:** four source columns/tabs—Dallas News, CrossCheck, Google News, and HoopsHype—show up to five deduplicated cards each. A card contains source badge, headline, relative/published time, and external-link icon.
- **Philippines:** show five Philippines headlines from Google News RSS and a dedicated flight section with four route cards: `DFW → CRK`, `DFW → XIY`, `DFW → XUZ`, and `DFW → TPE` (subject to the Taiwan confirmation).
- Flight cards show the lowest normalized fare, currency, candidate departure/return dates, one-stop/nonstop detail when furnished, the daily snapshot date, and a provider search link. If no current quote is available, show an honest “Unavailable today — open search” state, never a made-up price.
- **PadSplit:** show a prominent external card that opens `https://happymeerkat001.github.io/padsplit-scrapper/index.html` in a new tab with `target="_blank"` and `rel="noreferrer"`.
- Cache news for one hour and flight results for 24 hours. Individual failed sources degrade to a visible small status message while the rest of the dashboard remains usable.

## Step-by-step plan

### Task 1: Establish dashboard dependencies and test command

**Objective:** Add the minimal packages and scripts needed to parse external feeds and test deterministic dashboard logic.

**Files:**
- Modify: `package.json:5-27`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`

**Step 1: Add runtime and development dependencies**

Add `fast-xml-parser` to `dependencies` and `vitest` to `devDependencies`. Add this script without changing the existing build scripts:

```json
"test": "vitest run"
```

Use the project’s installed npm version to update `package-lock.json`; do not hand-edit lockfile integrity hashes.

**Step 2: Add a Node test configuration**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

**Step 3: Verify tooling**

Run: `npm test -- --run`

Expected: exits successfully with no test files yet (or reports zero test files according to the installed Vitest version). Then run `npm run typecheck` to ensure the new config is included without TypeScript errors.

---

### Task 2: Define shared dashboard data contracts and route configuration

**Objective:** Create the single source of truth for news sources, routes, cache periods, and safe external URLs.

**Files:**
- Create: `src/lib/dashboard/types.ts`
- Create: `src/lib/dashboard/config.ts`
- Create: `src/lib/dashboard/config.test.ts`

**Step 1: Write failing configuration tests**

Test that the configured routes exactly cover the requested destinations and that every URL is HTTPS:

```ts
import { expect, test } from "vitest";
import { flightRoutes, newsSources } from "./config";

test("configures the four requested DFW flight routes", () => {
  expect(flightRoutes.map((route) => route.destination)).toEqual([
    "CRK", "XIY", "XUZ", "TPE",
  ]);
});

test("uses HTTPS feed URLs", () => {
  expect(newsSources.every((source) => source.feedUrl.startsWith("https://"))).toBe(true);
});
```

**Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/dashboard/config.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Add exact normalized types**

```ts
export type NewsItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  sourceId: NewsSourceId;
};

export type NewsSourceId = "dallas-news" | "crosscheck" | "google-news" | "hoopshype" | "philippines";

export type NewsSource = {
  id: NewsSourceId;
  label: string;
  feedUrl: string;
};

export type FlightRoute = {
  origin: "DFW";
  destination: "CRK" | "XIY" | "XUZ" | "TPE";
  label: string;
};

export type FlightSnapshot = FlightRoute & {
  fetchedAt: string;
  amount: number | null;
  currency: string | null;
  departureDate: string | null;
  returnDate: string | null;
  itinerarySummary: string | null;
  searchUrl: string;
  status: "available" | "unavailable";
};

export type SourceResult<T> =
  | { status: "ok"; value: T }
  | { status: "error"; message: string };
```

**Step 4: Add configuration with encoded Google News RSS queries**

Create a small `googleNewsSearch(query: string)` helper with `URLSearchParams`, `hl=en-US`, `gl=US`, and `ceid=US:en`. Configure source queries as `site:dallasnews.com`, `site:crosscheck.news`, a general Google News feed (no `q`), `site:hoopshype.com`, and `Philippines`. Configure `flightRoutes` as the four routes shown in the test. Keep presentation copy (labels) here, not in JSX.

**Step 5: Verify GREEN**

Run: `npm test -- src/lib/dashboard/config.test.ts`

Expected: `2 passed`.

---

### Task 3: Build and test the RSS normalization adapter

**Objective:** Safely convert Google News RSS XML into stable, deduplicated headline data while rejecting malformed external links.

**Files:**
- Create: `src/lib/dashboard/news.ts`
- Create: `src/lib/dashboard/news.test.ts`

**Step 1: Write failing parser tests**

Use a short inline RSS fixture containing duplicate links, a title ending in ` - Dallas News`, one invalid `javascript:` link, and two valid links. Assert the adapter returns the two valid unique items, carries the configured source ID, strips only the trailing publisher suffix, and orders newest first.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/dashboard/news.test.ts`

Expected: FAIL because `parseNewsFeed` is not exported.

**Step 3: Implement the pure parser**

Implement these exports:

```ts
export function parseNewsFeed(xml: string, source: NewsSource): NewsItem[];
export async function getNewsSource(source: NewsSource): Promise<SourceResult<NewsItem[]>>;
export async function getNewsDashboard(): Promise<Record<NewsSourceId, SourceResult<NewsItem[]>>>;
```

Implementation requirements:

- Use `XMLParser` from `fast-xml-parser`; do not regex XML.
- Accept RSS item values that arrive as an object or array.
- Require `http:` or `https:` URLs using `new URL(value)` before retaining an item.
- Use canonical URL as the de-duplication key; retain a maximum of five articles per source after sorting by valid `pubDate` descending.
- Fetch with `next: { revalidate: 3600 }`, an `Accept: application/rss+xml, application/xml, text/xml` header, and no secret client headers.
- Return `{ status: "error", message: "News temporarily unavailable" }` for non-OK responses, parse failures, or timeouts; log the underlying error server-side without passing it into the UI.
- Do not use `dangerouslySetInnerHTML` or render descriptions supplied by feeds.

**Step 4: Run focused tests and typecheck**

Run: `npm test -- src/lib/dashboard/news.test.ts && npm run typecheck`

Expected: all parser assertions pass and TypeScript reports no errors.

---

### Task 4: Add a provider-agnostic flight snapshot boundary

**Objective:** Make the daily fare integration replaceable, secure, and independently testable before credentials are added.

**Files:**
- Create: `src/lib/dashboard/flights.ts`
- Create: `src/lib/dashboard/flights.test.ts`
- Modify: `.env.example:1-2`

**Step 1: Write failing normalization tests**

Test `normalizeFlightOffer` using a provider-response fixture supplied by the selected provider’s documented example. Assert it returns the requested route, numerical amount/currency, travel dates, a provider search URL, and `status: "available"`. Test missing or malformed price data becomes `status: "unavailable"` with all price fields `null`.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- src/lib/dashboard/flights.test.ts`

Expected: FAIL because the flight module does not exist.

**Step 3: Implement provider boundary and one-day cache**

Create these exports, with the provider request/response mapper isolated in one function:

```ts
export function normalizeFlightOffer(
  route: FlightRoute,
  response: unknown,
  fetchedAt: Date,
): FlightSnapshot;

export async function getFlightSnapshot(route: FlightRoute): Promise<FlightSnapshot>;
export async function getFlightDashboard(): Promise<FlightSnapshot[]>;
```

Requirements:

- Read `FLIGHT_API_BASE_URL` and `FLIGHT_API_KEY` only on the server. If either is absent, return the truthful unavailable state; never throw on page render.
- Use the selected provider’s documented authentication, query fields, and response shape. Supply the selected provider’s search/deep link as `searchUrl`.
- Cache the upstream fetch with `next: { revalidate: 86400 }`; do not use `cache: "no-store"`.
- Bound the request with `AbortSignal.timeout(10_000)` and normalize all request errors to the unavailable state.
- Never expose a secret through props, route responses, page source, logs, or `.env.example`.

Append only commented variable names to `.env.example`:

```dotenv
# Server-only production values for the daily flight snapshot provider.
FLIGHT_API_BASE_URL=
FLIGHT_API_KEY=
```

**Step 4: Verify GREEN**

Run: `npm test -- src/lib/dashboard/flights.test.ts && npm run typecheck`

Expected: all tests pass. With no real credentials, the unit tests must use fixtures and the runtime function must take the unavailable path.

---

### Task 5: Create reusable, accessible dashboard presentation components

**Objective:** Render normalized data with clear loading/degraded states and safe outbound links.

**Files:**
- Create: `src/components/dashboard/DashboardHeader.tsx`
- Create: `src/components/dashboard/NewsPanel.tsx`
- Create: `src/components/dashboard/FlightPanel.tsx`
- Create: `src/components/dashboard/ExternalDashboardLink.tsx`

**Step 1: Implement `DashboardHeader`**

Accept `refreshedAt: string`. Render an `h1` such as “Today” and a human-readable timestamp using `Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "America/Chicago" })`. Keep it server-rendered; do not add a client clock.

**Step 2: Implement `NewsPanel`**

Accept `source: NewsSource` and `result: SourceResult<NewsItem[]>`. Use a semantic `section` plus `h2`, an `ul`, and one external `<a>` per item. Set outbound links to `target="_blank" rel="noreferrer"`; include an `ExternalLink` icon with `aria-hidden`. On error, render the sanitized error message and a link to the source feed/search page. On an empty successful feed, show “No current headlines.”

**Step 3: Implement `FlightPanel`**

Accept the four `FlightSnapshot` values. Render price with `Intl.NumberFormat` only when `amount` and `currency` are present; otherwise use “Unavailable today.” Show itinerary/date details only when available, and always render the provider search link. Include an explicit small note: “Prices are daily snapshots and can change before booking.”

**Step 4: Implement `ExternalDashboardLink`**

Accept `href`, `title`, `description`, and a Lucide icon component. Use it for the PadSplit destination with the exact requested URL, secure external-link attributes, and visible “Open dashboard” affordance.

**Step 5: Verify component integration types**

Run: `npm run typecheck`

Expected: no props or accessibility-related TypeScript failures.

---

### Task 6: Compose the home page as the daily dashboard

**Objective:** Replace the static homepage content with the dashboard without touching other site routes.

**Files:**
- Modify: `src/app/page.tsx:1-55`
- Modify: `src/app/globals.css:1-50` only if a non-utility global style is genuinely needed

**Step 1: Replace static section-card composition**

Make `Home` an async server component. Start news and flights in parallel:

```ts
const [news, flights] = await Promise.all([
  getNewsDashboard(),
  getFlightDashboard(),
]);
```

Render in this order:

1. `DashboardHeader`.
2. A responsive News grid containing Dallas News, CrossCheck, Google News, and HoopsHype `NewsPanel`s.
3. A Philippines section containing the Philippines `NewsPanel` and `FlightPanel`.
4. A two-column “My tools” section with `ExternalDashboardLink` for PadSplit and the existing internal links (HT101, Projects, Real Estate, Book) retained as compact navigation rather than deleted.

Use `max-w-6xl`, existing `paper/card/line/ink/accent` theme tokens, and responsive one/two/four-column Tailwind grids. Do not make this page a client component.

**Step 2: Define page metadata appropriate to a private daily dashboard**

Export page-level metadata with title `Today` and description `A personal daily dashboard for news, Philippines travel, and work tools.` Decide whether the dashboard should be indexed: recommended is `robots: { index: false, follow: false }` because it is a personal utility page; retain the root layout’s metadata for the rest of the site.

**Step 3: Visual and functional verification**

Run `npm run dev`, inspect `/` at desktop and mobile widths, and verify:

- all five news sections render or show isolated degraded states;
- the four routes are present;
- PadSplit opens exactly `https://happymeerkat001.github.io/padsplit-scrapper/index.html` in a new tab;
- external article links do not navigate within the site;
- other navigation links still resolve.

Stop the dev server after verification.

---

### Task 7: Configure production refresh and source credentials

**Objective:** Make the daily flight refresh reliable after deployment without exposing credentials.

**Files:**
- Modify: `README.md:14-41`
- Potentially create: `vercel.json` only if the deployment platform requires scheduled warm-up beyond Next data-cache revalidation

**Step 1: Document production configuration**

Add a “Daily dashboard” section to `README.md` naming the two flight variables, stating they are server-only Vercel Production variables, and documenting the supported routes and cache windows. Do not include values or a provider secret.

**Step 2: Select refresh strategy based on deployment reality**

First deploy with Next’s `revalidate: 86400`; it refreshes when the first request arrives after expiry. If Ang needs the fare cache refreshed every calendar day even with no visitor, add a protected `app/api/cron/refresh-dashboard/route.ts` plus Vercel Cron configuration only after confirming the project is deployed on Vercel and a `CRON_SECRET` is available. The route must authenticate `Authorization: Bearer ${CRON_SECRET}`, call the cached flight/news functions, return no data, and never expose secrets.

**Step 3: Verify production behavior**

In a Vercel preview/production deployment with real flight credentials, check that the page returns `200`, that `FLIGHT_API_KEY` is not in HTML or browser network payloads, that one successful route has a real provider price/date, and that unavailable routes remain explicitly unavailable.

---

### Task 8: Run full regression checks and review the diff

**Objective:** Confirm the dashboard is deployable and does not disturb existing content or private archive protections.

**Files:**
- Review only: all modified/created files

**Step 1: Run all automated checks**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit `0`. If `npm run lint` fails because the installed Next 14 script is deprecated or unavailable, report the actual failure and use the project’s existing ESLint configuration only after inspecting it; do not silently skip linting.

**Step 2: Review changed paths and sensitive data**

Run `git diff --check` and inspect `git diff -- . ':!package-lock.json'`. Confirm:

- no `.env` file or secret value is staged or printed;
- `middleware.ts` remains unchanged;
- no remote article body, paywall content, or scraped fare page is copied into the repository;
- the flight API key is never imported into a client component.

**Step 3: Manual smoke test**

Navigate to `/`, `/ht101`, `/projects`, `/real-estate`, `/about`, and `/book`. Verify the homepage refresh works and HT101 still produces its existing Basic Auth challenge in production.

## Files likely to change

- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `.env.example`
- `README.md`
- `src/app/page.tsx`
- `src/lib/dashboard/types.ts`
- `src/lib/dashboard/config.ts`
- `src/lib/dashboard/config.test.ts`
- `src/lib/dashboard/news.ts`
- `src/lib/dashboard/news.test.ts`
- `src/lib/dashboard/flights.ts`
- `src/lib/dashboard/flights.test.ts`
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/dashboard/NewsPanel.tsx`
- `src/components/dashboard/FlightPanel.tsx`
- `src/components/dashboard/ExternalDashboardLink.tsx`
- Optionally, only after deployment confirmation: `app/api/cron/refresh-dashboard/route.ts` and `vercel.json`

## Risks and tradeoffs

- **Publisher access:** Dallas News, CrossCheck, and HoopsHype did not establish a public API/feed during discovery. Source-filtered Google News RSS is legal/low-maintenance headline aggregation, but it may be incomplete. Replacing a source with an approved direct feed/API should require only a configuration/adapter change.
- **Fare accuracy:** no price display is credible without explicit dates, passenger count, cabin, provider terms, and production credentials. The plan deliberately uses daily snapshots with a disclaimer rather than real-time booking quotes.
- **Cache behavior:** Next revalidation is request-driven. A Vercel Cron warm-up is a separate production decision if a guaranteed daily refresh is needed.
- **Personal dashboard versus public site:** `noindex` is recommended for the homepage once it becomes a daily utility. If the existing public marketing role must remain primary, keep the current marketing hero beneath the dashboard or put the dashboard on `/today` instead.
- **Availability:** source-level errors should be isolated. The page must never fail as a whole because one RSS feed or flight provider is down.

## Open questions for Ang

1. Confirm Taiwan is `TPE` (Taoyuan) rather than another airport.
2. Confirm the date pattern/passenger/cabin defaults for the daily fare snapshot.
3. Choose or provide credentials for the licensed flight-data provider. A provider decision is required for actual price cards.
4. Should the homepage become a non-indexed personal utility dashboard, or should the existing public professional hero remain above it?
