# Professional Home + Private Daily Dashboard Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Keep `angli.site` professionally welcoming while adding a daily briefing with combined news, Philippines travel fares, PadSplit, and a private Google Calendar agenda.

**Architecture:** Preserve the current public professional landing page at `/`. Add a public, non-sensitive daily briefing preview below its hero, and create a Basic-Auth-protected `/today` route for the full personal dashboard and calendar. Server-only adapters in `src/lib/dashboard/` normalize RSS, flight, and Google Calendar data; each upstream source fails independently so no single outage breaks the page.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS v4, Lucide React, `fast-xml-parser`, `googleapis`, Vercel KV, and Vitest.

---

## Confirmed product decisions

- **Taiwan:** use Taipei Taoyuan (`TPE`).
- **Fare search:** economy, one adult, round trip, with an approximately 21–30-day stay departing around mid-June. Use configurable date-window constants; version one does not add a booking-form UI.
- **Fare provider:** select the least-expensive compliant, production-ready API based on actual credential/pricing availability at implementation time. Never scrape Google Flights, airline sites, or OTAs.
- **Public presentation:** retain the existing professional hero and primary pages. The data dashboard supplements it rather than replacing it.
- **Calendar:** pull a read-only, curated Google Calendar agenda. Calendar content is private and must never be rendered on the public homepage, indexed, or made accessible through an unauthenticated API.
- **Apple Calendar clarification:** Google Calendar API returns events held in Google Calendar. Events that exist only in Apple Calendar/iCloud are not exposed by this API. To include Apple events, subscribe/share the relevant Apple calendar into Google Calendar (or later add a separate Apple/iCloud ICS adapter); do not attempt to read a Mac-local Apple Calendar database from Vercel.

## Current repository facts

- The public home page is `src/app/page.tsx:1-55`; it has no data fetching today.
- `middleware.ts:1-47` already protects only `/ht101` and `/ht101-assets/` with Basic Auth; extend it carefully rather than replacing it.
- `package.json:5-27` has no parser, calendar SDK, KV client, or test runner.
- `news.google.com/rss` responds with XML. Dallas News, CrossCheck, and HoopsHype returned HTML during inspection; no stable direct publisher API/feed has been confirmed.
- This repository recommends Vercel deployment in `README.md:21-28`; the private calendar token store therefore uses Vercel KV rather than a local file or Hermes OAuth credential.
- Do not read, print, commit, or deploy a local `.env` file. Add only names/comments to `.env.example`.

## Data and privacy design

### Public `/`

- Existing Hero and professional internal links remain first.
- Public data: headline-only news panels, Philippines headlines, cached public fare snapshots, and the PadSplit external link.
- No calendar content, Google OAuth endpoints, access tokens, or private invite/location fields.

### Private `/today`

- Requires `DASHBOARD_USER` / `DASHBOARD_PASSWORD` HTTP Basic Auth, separate from HT101 credentials.
- Displays the complete public briefing plus the authenticated owner’s upcoming Google Calendar events.
- Has page-level `robots: { index: false, follow: false }` and is excluded from `src/app/sitemap.ts`.
- The calendar REST endpoint and OAuth callback are protected by the same middleware before they can read or change stored tokens.

### Google Calendar authorization

- Create a Google Cloud **Web application** OAuth client—not Hermes’ desktop OAuth credential—and enable Google Calendar API.
- Request only `https://www.googleapis.com/auth/calendar.events.readonly` and `openid email` scopes.
- The owner initiates a one-time connection from the protected `/today` page. The callback validates the Google email equals `GOOGLE_CALENDAR_OWNER_EMAIL`, then stores only the refresh token in Vercel KV under a fixed server-only key.
- Events are fetched server-side with `calendar.events.list`, a seven-day range in `America/Chicago`, `singleEvents: true`, and `orderBy: "startTime"`. Normalize and display only title, start/end, and location; omit descriptions, attendee lists, conferencing URLs, and raw event IDs.
- Disconnect deletes the KV token only after an explicit confirmation flow. No calendar write scopes, event editing, sharing, or email access.

## Implementation tasks

### Task 1: Install dashboard and test dependencies

**Objective:** Add the smallest supported dependency set and a deterministic test command.

**Files:**
- Modify: `package.json:5-27`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`

**Step 1: Add dependencies**

Add `fast-xml-parser`, `googleapis`, and `@vercel/kv` to `dependencies`; add `vitest` to `devDependencies`; add:

```json
"test": "vitest run"
```

Use `npm install` so npm—not a manual edit—updates `package-lock.json`.

**Step 2: Add Node-only Vitest configuration**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

**Step 3: Verify tooling**

Run: `npm test -- --passWithNoTests && npm run typecheck`

Expected: both exit 0.

---

### Task 2: Define safe dashboard contracts and configuration

**Objective:** Centralize routes, external source URLs, cache windows, and normalizable data shapes.

**Files:**
- Create: `src/lib/dashboard/types.ts`
- Create: `src/lib/dashboard/config.ts`
- Create: `src/lib/dashboard/config.test.ts`

**Step 1: Write a failing configuration test**

```ts
import { expect, test } from "vitest";
import { flightRoutes, newsSources } from "./config";

test("configures the requested routes and HTTPS sources", () => {
  expect(flightRoutes.map((route) => route.destination)).toEqual([
    "CRK", "XIY", "XUZ", "TPE",
  ]);
  expect(newsSources.every(({ feedUrl }) => feedUrl.startsWith("https://"))).toBe(true);
});
```

**Step 2: Run RED**

Run: `npm test -- src/lib/dashboard/config.test.ts`

Expected: FAIL because the configuration module does not exist.

**Step 3: Implement shared types**

```ts
export type NewsSourceId =
  | "dallas-news"
  | "crosscheck"
  | "google-news"
  | "hoopshype"
  | "philippines";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  sourceId: NewsSourceId;
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

export type CalendarEvent = {
  title: string;
  start: string;
  end: string | null;
  location: string | null;
  isAllDay: boolean;
};

export type SourceResult<T> =
  | { status: "ok"; value: T }
  | { status: "error"; message: string };
```

**Step 4: Configure source/search URLs and fare date rules**

Use a `googleNewsSearch(query?: string)` helper with `URLSearchParams`, `hl=en-US`, `gl=US`, and `ceid=US:en`. Source filters must be `site:dallasnews.com`, `site:crosscheck.news`, no-query Google News, `site:hoopshype.com`, and `Philippines`.

Set routes to `DFW → CRK`, `DFW → XIY`, `DFW → XUZ`, and `DFW → TPE`. Add named constants for `fareSearch.month = 6`, `fareSearch.departureDay = 15`, `fareSearch.minimumStayDays = 21`, `fareSearch.maximumStayDays = 30`, `fareSearch.cabin = "ECONOMY"`, and `fareSearch.adults = 1`. The flight adapter must turn these into dates according to the selected provider’s documented query model.

**Step 5: Run GREEN**

Run: `npm test -- src/lib/dashboard/config.test.ts`

Expected: `1 passed`.

---

### Task 3: Implement headline-only RSS ingestion

**Objective:** Read permitted RSS data, sanitize it, and isolate per-source failures.

**Files:**
- Create: `src/lib/dashboard/news.ts`
- Create: `src/lib/dashboard/news.test.ts`

**Step 1: Write failing tests**

Use an inline RSS fixture with duplicate canonical links, a `javascript:` URL, and differing dates. Assert `parseNewsFeed` returns only valid unique HTTPS items ordered newest first and limits each source to five entries.

**Step 2: Run RED**

Run: `npm test -- src/lib/dashboard/news.test.ts`

Expected: FAIL because `parseNewsFeed` is absent.

**Step 3: Implement adapter**

Export:

```ts
export function parseNewsFeed(xml: string, source: NewsSource): NewsItem[];
export async function getNewsSource(source: NewsSource): Promise<SourceResult<NewsItem[]>>;
export async function getNewsDashboard(): Promise<Record<NewsSourceId, SourceResult<NewsItem[]>>>;
```

Use `XMLParser` from `fast-xml-parser`, `new URL()` to permit only HTTP(S) links, canonical URLs for de-duplication, and `fetch(..., { next: { revalidate: 3600 } })`. Return only a sanitized `News temporarily unavailable` message on source failures; log details server-side. Never fetch article pages, republish body text, or use `dangerouslySetInnerHTML`.

**Step 4: Verify GREEN**

Run: `npm test -- src/lib/dashboard/news.test.ts && npm run typecheck`

Expected: parser tests pass and TypeScript is clean.

---

### Task 4: Add the production flight-provider boundary

**Objective:** Present one honest daily price snapshot per route without coupling UI to a vendor or exposing API keys.

**Files:**
- Create: `src/lib/dashboard/flights.ts`
- Create: `src/lib/dashboard/flights.test.ts`
- Modify: `.env.example:1-2`

**Step 1: Select the actual provider before writing the mapper**

Compare only providers with current documented DFW international flight-search coverage, supported mid-June/date-flexible search, production credentials, legal display/deep-link terms, and lowest real project cost. Record the selected provider and its documentation URL in `README.md`; do not guess an endpoint from the provider name.

**Step 2: Write RED fixture tests from provider documentation**

Use a documented successful response fixture and a missing-price fixture. Assert that `normalizeFlightOffer(route, response, fetchedAt)` produces a numerical fare or the explicit unavailable state, never a fabricated value.

**Step 3: Implement the adapter**

```ts
export function normalizeFlightOffer(
  route: FlightRoute,
  response: unknown,
  fetchedAt: Date,
): FlightSnapshot;

export async function getFlightSnapshot(route: FlightRoute): Promise<FlightSnapshot>;
export async function getFlightDashboard(): Promise<FlightSnapshot[]>;
```

Read `FLIGHT_API_BASE_URL` and `FLIGHT_API_KEY` only on the server. Use provider-documented request fields built from `fareSearch`; bound calls with `AbortSignal.timeout(10_000)` and cache with `next: { revalidate: 86400 }`. A missing key, timeout, non-OK response, or malformed result returns a card with `status: "unavailable"` and a provider search link.

Append only names/comments:

```dotenv
# Server-only fare provider values; set in Vercel Production and Preview.
FLIGHT_API_BASE_URL=
FLIGHT_API_KEY=
```

**Step 4: Verify GREEN**

Run: `npm test -- src/lib/dashboard/flights.test.ts && npm run typecheck`

Expected: fixture tests pass; no real credential is required to test the unavailable path.

---

### Task 5: Create the private dashboard access boundary

**Objective:** Extend existing middleware without weakening HT101 protection or accidentally exposing `/today` or calendar APIs.

**Files:**
- Modify: `middleware.ts:1-47`
- Modify: `.env.example`
- Create: `src/lib/dashboard/auth.ts`
- Create: `src/lib/dashboard/auth.test.ts`

**Step 1: Write RED credential-validation tests**

Test the pure helper accepts matching Basic credentials and rejects missing/malformed/wrong credentials. Test the dashboard and HT101 configurations resolve independently.

**Step 2: Implement reusable credentials helper**

Create a pure server-safe function that receives an `Authorization` header and explicit expected username/password. It must return `false` for malformed base64 or missing pieces, without throwing.

**Step 3: Extend middleware routes explicitly**

Keep HT101’s current variables and realm. Add dashboard protection for:

```ts
"/today/:path*",
"/api/calendar/:path*",
```

Use `DASHBOARD_USER` and `DASHBOARD_PASSWORD`, and return a `503` when those are absent rather than leaving routes public. Give the dashboard its own realm (`Daily Dashboard`). Do not add `/` to the matcher: the professional homepage remains public.

**Step 4: Document variable names only**

```dotenv
# Private /today and calendar API access.
DASHBOARD_USER=
DASHBOARD_PASSWORD=
```

**Step 5: Verify GREEN**

Run: `npm test -- src/lib/dashboard/auth.test.ts && npm run typecheck`

Manually confirm an unauthenticated `/today` request returns `401`, whereas `/` remains `200`.

---

### Task 6: Implement Google Calendar OAuth and read-only event adapter

**Objective:** Allow only the approved owner to connect one Google calendar account, safely retain its refresh token, and display a minimal seven-day agenda.

**Files:**
- Create: `src/lib/dashboard/calendar.ts`
- Create: `src/lib/dashboard/calendar.test.ts`
- Create: `src/app/api/calendar/connect/route.ts`
- Create: `src/app/api/calendar/callback/route.ts`
- Create: `src/app/api/calendar/disconnect/route.ts`
- Modify: `.env.example`

**Step 1: Write RED normalization tests**

Use Google Calendar event fixtures for timed, all-day, recurring-instance, canceled, and description-heavy events. Assert the normalizer:

- excludes canceled events;
- retains only title/start/end/location/all-day;
- removes descriptions, attendees, conference data, and IDs;
- sorts chronologically; and
- returns the message `Calendar is not connected` when no KV refresh token exists.

**Step 2: Implement server-only calendar client**

Create one `OAuth2` client from `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, and `GOOGLE_CALENDAR_REDIRECT_URI`. The connect route generates URL state with CSRF protection, scopes:

```ts
[
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.readonly",
]
```

The callback must validate state, exchange the code, call Google’s userinfo endpoint, compare the verified email to `GOOGLE_CALENDAR_OWNER_EMAIL`, and persist `tokens.refresh_token` to Vercel KV only after all checks pass. Reject an account switch without overwriting the existing token.

**Step 3: Implement agenda fetch**

Fetch only the configured `GOOGLE_CALENDAR_ID` (default `primary`) from current Dallas time through seven days later, with `singleEvents: true`, `orderBy: "startTime"`, `timeZone: "America/Chicago"`, and a 15-event cap. Cache rendered results for five minutes. Map the API response into `CalendarEvent` before returning it to a component.

**Step 4: Implement disconnect safely**

Make disconnect a `POST` endpoint protected by middleware and require a same-origin form/action confirmation. Delete only the calendar refresh-token KV key; do not revoke unrelated Google access or delete calendar data.

**Step 5: Add environment-variable documentation**

```dotenv
# Google Calendar read-only OAuth web client; never prefix with NEXT_PUBLIC_.
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=
GOOGLE_CALENDAR_OWNER_EMAIL=
GOOGLE_CALENDAR_ID=primary
# Vercel KV provides KV_REST_API_URL and KV_REST_API_TOKEN after integration.
```

**Step 6: Verify GREEN**

Run: `npm test -- src/lib/dashboard/calendar.test.ts && npm run typecheck`

In a Vercel Preview deployment, complete OAuth as the approved account; verify one token exists in KV, only the allowed event fields render, and a non-owner callback is rejected.

---

### Task 7: Build reusable presentation components

**Objective:** Display public data consistently and calendar data only in the private dashboard.

**Files:**
- Create: `src/components/dashboard/DashboardHeader.tsx`
- Create: `src/components/dashboard/NewsPanel.tsx`
- Create: `src/components/dashboard/FlightPanel.tsx`
- Create: `src/components/dashboard/CalendarAgenda.tsx`
- Create: `src/components/dashboard/ExternalDashboardLink.tsx`

**Step 1: Implement `DashboardHeader`**

Accept `refreshedAt` and format dates in `America/Chicago` with `Intl.DateTimeFormat`. Keep it server-rendered; no client clock.

**Step 2: Implement safe public panels**

`NewsPanel` uses semantic `section`, `h2`, `ul`, and external links with `target="_blank" rel="noreferrer"`. `FlightPanel` formats currency only for real values and otherwise says `Unavailable today`; it always includes the disclaimer `Prices are daily snapshots and can change before booking.`

**Step 3: Implement `CalendarAgenda`**

Accept `SourceResult<CalendarEvent[]>`. Render only title, date/time, all-day marker, and optional location. It must not render descriptions, attendees, conferencing details, raw IDs, or Google event links. Include a protected `Connect Google Calendar` link only when disconnected and a confirmation-backed disconnect form only when connected.

**Step 4: Implement PadSplit card**

Use `ExternalDashboardLink` with exactly:

```ts
href: "https://happymeerkat001.github.io/padsplit-scrapper/index.html"
```

Use external-link attributes and visible `Open dashboard` text.

**Step 5: Verify types**

Run: `npm run typecheck`

Expected: no component prop errors.

---

### Task 8: Compose the public homepage and private `/today` route

**Objective:** Retain the professional first impression while providing a useful everyday reading surface.

**Files:**
- Modify: `src/app/page.tsx:1-55`
- Create: `src/app/today/page.tsx`
- Modify: `src/components/Nav.tsx:8-14`
- Modify: `src/app/sitemap.ts:3`

**Step 1: Retain and enhance `/`**

Keep the existing `Hero` first. Below it, render a compact public `Daily briefing` section with Dallas News, CrossCheck, Google News, HoopsHype, Philippines headlines, the four flight cards, PadSplit card, and existing internal sections. Add a clearly labeled `Open my private dashboard` link to `/today`; it will challenge for credentials.

Start news and fares concurrently using:

```ts
const [news, flights] = await Promise.all([
  getNewsDashboard(),
  getFlightDashboard(),
]);
```

Do not import or call calendar code from `src/app/page.tsx`.

**Step 2: Implement `/today`**

Make `/today` an async server component with:

```ts
export const metadata = {
  title: "Today",
  robots: { index: false, follow: false },
};
```

Render the same public data plus `CalendarAgenda`. Fetch public data and calendar independently (for example via `Promise.allSettled`) so calendar authorization/provider issues do not blank the news and fares.

**Step 3: Navigation and indexing**

Add `Today` to `src/components/Nav.tsx` only if showing a private item in public navigation is desired; recommended label: `Today`. Do not add `/today` to `src/app/sitemap.ts`.

**Step 4: Verify manually**

At desktop and mobile widths verify `/` still presents Dr. Ang Li professionally first; `/today` requires Basic Auth; calendar is absent from public HTML; feeds/fare failures show local degraded states; and every external link opens in a new tab.

---

### Task 9: Document deployment and validate the complete system

**Objective:** Set up Vercel secrets/cron correctly and prove private data stays private.

**Files:**
- Modify: `README.md:14-41`
- Optional: `vercel.json` only if a calendar-independent daily cache warm-up is required

**Step 1: Document exact configuration workflow**

Add a `Daily briefing and private calendar` README section covering:

1. Provision Vercel KV.
2. Enable Calendar API and create a Google OAuth **Web application** client.
3. Register the production and preview callback URLs.
4. Set listed environment variables in Vercel Production/Preview.
5. Visit authenticated `/today` and connect the approved Google account once.
6. Explain Apple-only events must be shared/subscribed into Google Calendar to appear.

Never include secret values in the README.

**Step 2: Configure refresh behavior**

Use Next revalidation: hourly for RSS, daily for fares, and five minutes for calendar. If a guaranteed daily fare refresh is needed before the first visitor, add a Vercel Cron route only after confirming cron plan availability; it must accept `CRON_SECRET`, warm public fare cache, return no content data, and never call private calendar endpoints.

**Step 3: Run all checks**

```bash
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: all exit 0. If the existing `next lint` script is unavailable/deprecated, report its exact output and use the project’s discovered ESLint invocation rather than silently omitting lint.

**Step 4: Production smoke tests**

- `/` returns `200` before authentication and contains no Google event title/location or token-like value.
- `/today` returns `401` without valid dashboard credentials and `200` with them.
- Google Calendar OAuth only accepts `GOOGLE_CALENDAR_OWNER_EMAIL`.
- No `GOOGLE_CALENDAR_CLIENT_SECRET`, refresh token, KV token, or flight API key occurs in rendered HTML or browser network responses.
- `/ht101` still uses its current, separate Basic Auth behavior.

## Files likely to change

- `package.json`, `package-lock.json`, `vitest.config.ts`, `.env.example`, `README.md`
- `middleware.ts`, `src/app/page.tsx`, `src/app/today/page.tsx`, `src/app/sitemap.ts`, optionally `src/components/Nav.tsx`
- `src/lib/dashboard/types.ts`, `config.ts`, `news.ts`, `flights.ts`, `auth.ts`, `calendar.ts` and their `*.test.ts` files
- `src/app/api/calendar/connect/route.ts`, `callback/route.ts`, `disconnect/route.ts`
- `src/components/dashboard/DashboardHeader.tsx`, `NewsPanel.tsx`, `FlightPanel.tsx`, `CalendarAgenda.tsx`, `ExternalDashboardLink.tsx`

## Risks and remaining choices

- **Flight provider:** “cheapest” must mean the lowest ongoing provider cost that also supports the required route/date queries and legal display. Compare live pricing/terms before locking in an adapter; the user will still need an API account/credential.
- **June date window:** the fare card needs a concrete target year. During implementation choose the next upcoming mid-June relative to refresh date; once the target is in the past, roll forward to the next year and display the dates prominently.
- **Calendar privacy:** Basic Auth is adequate for a personal dashboard when credentials are strong and HTTPS/Vercel is used. If the dashboard expands to more users, replace it with a managed identity provider rather than sharing Basic Auth credentials.
- **Publisher availability:** Google News source-filtered RSS is the stable transport until a publisher grants a direct API/feed. Do not silently switch to scraping.
- **Apple calendars:** this plan intentionally does not claim Apple Calendar API support. Google-shared calendars are the supported bridge in version one.
