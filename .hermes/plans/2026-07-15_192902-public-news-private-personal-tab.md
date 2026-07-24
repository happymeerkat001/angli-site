# Public News + Private Personal Tab Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Restore the public homepage’s professional marketing-first layout, retain public news and the PadSplit shortcut, and place Philippines travel, Google Flights links, and Google Calendar behind a new authenticated `Personal` navigation tab.

**Architecture:** Keep `/` public and professionally focused: original Hero and four site cards remain in their current order, followed by a compact headline-only news section and the external PadSplit link. Move all personal data/features to `/personal`, protected by the existing dashboard Basic Auth credentials. Replace `/today` rather than exposing two private entry points.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS v4, Lucide React, existing RSS/news adapter, Google Flights links, Google Calendar adapter, Vitest.

---

## Current context

- `src/app/page.tsx:48-147` currently fetches both news and flights and includes Philippines news, Google Flights cards, PadSplit, and a link to `/today` on the public homepage.
- `src/components/Nav.tsx:8-14` contains the five current public navigation links and supports per-link `prefetch` control.
- `src/app/today/page.tsx:1-44` contains the private calendar agenda.
- `src/middleware.ts:28-54` already protects `/today` with `DASHBOARD_USER` / `DASHBOARD_PASSWORD` and keeps HT101 on separate credentials.
- The user has configured the HT101 Vercel password. Do not change its environment-variable names, middleware realm, matcher behavior, or deployed configuration.
- `src/lib/dashboard/news.ts` already returns headline-only public RSS data. `src/lib/dashboard/flights.ts` creates flexible Google Flights links. `src/lib/dashboard/calendar.ts` reads a server-only Google Calendar configuration.
- Existing unit tests cover dashboard configuration, RSS safety, Google Flights fallback links, and calendar-event field filtering.

## Intended access boundaries

| Feature | Public `/` | Private `/personal` |
|---|---:|---:|
| Professional Hero and HT101/projects/real-estate/booking cards | Yes | Optional link through nav |
| Dallas News, CrossCheck, Google News, HoopsHype headlines | Yes | No duplicate required |
| PadSplit external dashboard link | Yes | No duplicate required |
| Philippines headlines | No | Yes |
| DFW → CRK/XIY/XUZ/TPE Google Flights links | No | Yes |
| Google Calendar agenda and setup state | No | Yes |

The public page must not import or call `getFlightDashboard` or `getCalendarAgenda`; it must contain no private calendar copy, `/personal` credential instructions, travel search dates, or calendar-derived content in its HTML.

## Step-by-step plan

### Task 1: Add a `Personal` route constant and test its public/private boundary

**Objective:** Establish the new private route name before moving UI, avoiding a lingering `/today` entry point.

**Files:**
- Create: `src/lib/dashboard/routes.ts`
- Create: `src/lib/dashboard/routes.test.ts`
- Modify: `src/middleware.ts:28-54`

**Step 1: Write the failing test**

```ts
import { expect, test } from "vitest";
import { personalRoute } from "./routes";

test("uses a single private personal route", () => {
  expect(personalRoute).toBe("/personal");
  expect(personalRoute).not.toBe("/today");
});
```

**Step 2: Verify RED**

Run:

```bash
npm test -- src/lib/dashboard/routes.test.ts
```

Expected: FAIL because `./routes` does not exist.

**Step 3: Add the minimum route constant**

```ts
export const personalRoute = "/personal";
```

**Step 4: Protect `/personal` and retire `/today`**

In `src/middleware.ts`:

- Replace the `pathname.startsWith("/today")` check with `pathname.startsWith("/personal")`.
- Replace the matcher entry `"/today/:path*"` with `"/personal/:path*"`.
- Keep `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, `Daily Dashboard` realm, and all HT101 behavior unchanged.
- Do not make the public `/` route match the middleware.

**Step 5: Verify GREEN**

Run:

```bash
npm test -- src/lib/dashboard/routes.test.ts
npm run typecheck
```

Expected: test passes and TypeScript is clean.

---

### Task 2: Restore the marketing-first public home and keep only public dashboard content

**Objective:** Preserve the original homepage hierarchy while retaining a small public news/Padsplit utility section.

**Files:**
- Modify: `src/app/page.tsx:1-147`
- Test: existing `src/lib/dashboard/news.test.ts`

**Step 1: Preserve the original public imports and hero/card order**

Remove public-page imports that are private-only:

```ts
import Link from "next/link";
import { CalendarDays, Plane } from "lucide-react";
import { getFlightDashboard } from "@/lib/dashboard/flights";
```

Keep `BookOpen`, `Bot`, `HomeIcon`, `Newspaper`, `ExternalLink`, `Hero`, `SectionCard`, `getNewsDashboard`, and `newsSources`.

**Step 2: Fetch only public news**

Replace:

```ts
const [news, flights] = await Promise.all([getNewsDashboard(), getFlightDashboard()]);
```

with:

```ts
const news = await getNewsDashboard();
```

**Step 3: Restore professional hierarchy**

Render in exactly this order:

1. Existing `Hero` unchanged.
2. Existing four `SectionCard`s unchanged.
3. A compact `Daily briefing` section containing only the four public source panels (`newsSources.slice(0, 4)`) and the PadSplit external link.

Do not render `news.philippines`, `flights`, “Philippines & travel,” “DFW flexible June searches,” or a private dashboard link on `/`.

**Step 4: Preserve external-link safety**

For every news and PadSplit link, retain:

```tsx
target="_blank"
rel="noreferrer"
```

Continue rendering only title and publisher for news items. No article descriptions, calendar data, or private data should be added.

**Step 5: Verify regressions**

Run:

```bash
npm test -- src/lib/dashboard/news.test.ts
npm run typecheck
```

Expected: RSS safety tests pass and page types are valid.

---

### Task 3: Create the authenticated `/personal` page

**Objective:** Move all private travel and calendar content into one password-protected page.

**Files:**
- Create: `src/app/personal/page.tsx`
- Delete: `src/app/today/page.tsx`
- Modify: `src/app/sitemap.ts:3`

**Step 1: Reuse the existing private dashboard behavior under the new path**

Start from `src/app/today/page.tsx`, retaining its no-index metadata and calendar field restrictions. Update title/copy:

```ts
export const metadata = {
  title: "Personal",
  robots: { index: false, follow: false },
};
```

```tsx
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
  Personal
</p>
<h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-ink">
  Personal dashboard
</h1>
```

**Step 2: Add private travel data concurrently**

Import and fetch the private sources without changing public source behavior:

```ts
import { getFlightDashboard } from "@/lib/dashboard/flights";
import { getNewsDashboard } from "@/lib/dashboard/news";
import { getCalendarAgenda } from "@/lib/dashboard/calendar";

const [news, flights, agenda] = await Promise.all([
  getNewsDashboard(),
  getFlightDashboard(),
  getCalendarAgenda(),
]);
```

**Step 3: Add the Philippines section**

Render a `Philippines & travel` section before the calendar agenda:

- Philippines headlines from `news.philippines`, using the same source-error state and secure outbound-link attributes as the public news cards.
- Four Google Flights cards from `flights`, showing the selected route, date range, Economy, one adult, and `Search flexible fares in Google Flights`.
- Keep the existing `search-only` status truthful; do not invent price data.

**Step 4: Keep calendar data minimal**

Retain the current calendar list UI’s use of only:

- event title
- date/time or all-day date
- location

Do not add descriptions, attendees, Google event URLs, conferencing URLs, event IDs, calendar IDs, OAuth client values, or refresh-token values to rendered output.

**Step 5: Remove obsolete route and sitemap exposure**

Delete `src/app/today/page.tsx`; do not create a redirect that reveals its old private content. Confirm neither `/today` nor `/personal` is present in `src/app/sitemap.ts`.

**Step 6: Verify build route registration**

Run:

```bash
npm run build
```

Expected: route table contains `/personal`, does not contain `/today`, and reports successful compilation.

---

### Task 4: Add the `Personal` nav tab without prefetching private content

**Objective:** Make the private dashboard intentional and discoverable while preserving the public navigation layout.

**Files:**
- Modify: `src/components/Nav.tsx:8-14`
- Modify: `src/components/Footer.tsx:3-9` only if a footer Personal link is desired

**Step 1: Add the nav item**

Add this final item to the `links` array:

```ts
{ href: "/personal", label: "Personal", prefetch: false },
```

`prefetch: false` prevents Next from prefetching a password-protected route while a visitor simply browses the public site.

**Step 2: Keep footer scope conservative**

Do not add the private page to `Footer` unless the user explicitly wants the private URL in the global footer. The header tab is the requested entry point and avoids duplicating it in a public sitemap-like surface.

**Step 3: Verify desktop and mobile navigation**

Run `npm run dev` with temporary local `DASHBOARD_USER` / `DASHBOARD_PASSWORD` values. Verify that both desktop and mobile menus display `Personal`, active state works on `/personal`, and selecting it prompts for Basic Auth.

---

### Task 5: Update documentation and environment labels

**Objective:** Align documentation with the private `/personal` location and avoid implying the homepage exposes calendar content.

**Files:**
- Modify: `README.md:43-64` (Daily briefing and private calendar section)
- Modify: `.env.example:4-12`

**Step 1: Update user-facing route references**

Replace `/today` with `/personal` in README and `.env.example` comments. State clearly:

- homepage news and PadSplit are public;
- flights, Philippines feed, and calendar are private at `/personal`;
- `/personal` uses `DASHBOARD_USER` / `DASHBOARD_PASSWORD`;
- HT101 continues to use `HT101_ARCHIVE_USER` / `HT101_ARCHIVE_PASSWORD` separately.

**Step 2: Keep calendar configuration server-only**

Retain these variable names, without values:

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary
```

Do not add `NEXT_PUBLIC_` variants or copy Vercel values into the repository.

---

### Task 6: Full privacy and regression verification

**Objective:** Prove route protection and public/private rendering boundaries before deployment.

**Files:**
- Review only: modified files and generated build output

**Step 1: Run automated checks**

```bash
npm test
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: all commands exit 0. The existing HT101 `<img>` lint warning may remain but must be reported separately and not be newly introduced by this change.

**Step 2: Test access routes locally**

Start the dev server with temporary credentials. Check:

```bash
curl -sS -o /dev/null -w 'public=%{http_code}\n' http://127.0.0.1:3000/
curl -sS -o /dev/null -w 'personal-anon=%{http_code}\n' http://127.0.0.1:3000/personal
curl -sS -u "$DASHBOARD_USER:$DASHBOARD_PASSWORD" -o /dev/null -w 'personal-auth=%{http_code}\n' http://127.0.0.1:3000/personal
curl -sS -o /dev/null -w 'today=%{http_code}\n' http://127.0.0.1:3000/today
```

Expected:

- public: `200`
- personal-anon: `401`
- personal-auth: `200`
- today: `404`

**Step 3: Inspect page boundaries**

- Public `/` displays Hero, four original cards, headline-only news, and PadSplit.
- Public `/` contains no “Philippines & travel,” travel dates, Google Flights links, calendar title/location, OAuth setup copy, or refresh-token-like value.
- Authenticated `/personal` displays Philippines headlines, four flexible Google Flights cards, and the minimal calendar agenda.
- Unauthenticated `/personal` never renders page HTML before Basic Auth succeeds.
- HT101 still authenticates with the separate Vercel-configured HT101 password.

## Files likely to change

- `src/app/page.tsx`
- `src/app/personal/page.tsx` (new)
- `src/app/today/page.tsx` (delete)
- `src/components/Nav.tsx`
- `src/middleware.ts`
- `README.md`
- `.env.example`
- `src/lib/dashboard/routes.ts` (new)
- `src/lib/dashboard/routes.test.ts` (new)

## Risks and tradeoffs

- **Basic Auth UX:** selecting `Personal` prompts in the browser rather than using a styled login page. This is appropriate for a single-owner dashboard and matches the existing HT101 approach.
- **Browser-cached credentials:** a browser may retain Basic Auth for the session. Keep dashboard credentials distinct from HT101 credentials, as the current middleware design does.
- **Google Flights data:** the private page offers Google’s flexible search UI, not scraped or API-derived price claims. Daily live fares require a separately licensed provider/API key.
- **Calendar setup:** the calendar section is operational only after the server-only Google OAuth refresh-token variables are configured in Vercel.
- **No accidental public route:** deleting `/today` avoids two competing private URLs. Any existing bookmark should be updated to `/personal` after deployment.
