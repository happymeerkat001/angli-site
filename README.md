# angli.site

Personal site for Dr. Ang Li, built with Next.js 14, TypeScript, Tailwind CSS v4, and Lucide React.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production checks

```bash
npm run typecheck
npm run build
```

## Deploy to Vercel

1. Import this project in Vercel.
2. Set the production domain to `angli.site`.
3. Use the default Next.js build settings:
   - Build command: `npm run build`
   - Install command: `npm install`
   - Output: Next.js default

### Private HT101 archive

`/ht101` and its course PDFs are protected with HTTP Basic Authentication.
Before deploying, add these Production environment variables in Vercel:

- `HT101_ARCHIVE_USER`
- `HT101_ARCHIVE_PASSWORD`

After deployment, open `https://angli.site/ht101` and enter those credentials
in the browser prompt. The full 2026 course-folder backup is stored privately
at `r2:skool-archive/ht101-2026`; it is intentionally not committed to this
repository or deployed with the site because it is approximately 610 MiB.

### Daily briefing and private calendar

The public home page includes headline-only news panels and a PadSplit shortcut.
Philippines news, flexible Google Flights searches, and the calendar are private
to the `Personal` tab. Google Flights does not expose a public website API for
live fares, so its private links open the flexible-date search UI.

`/personal` is a separate private dashboard. Before deploying it, set these
Vercel environment variables:

- `DASHBOARD_USER`
- `DASHBOARD_PASSWORD`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_IDS` (optional comma-separated override; otherwise all selected calendars are read)
- `SERP_API_KEY` (SerpApi key for live Google Flights fares; without it every
  route falls back to "Live price unavailable today")
- `STOCK_LLM_BASE_URL`, `STOCK_LLM_API_KEY`, `STOCK_LLM_MODEL` (optional OpenAI-compatible endpoint for the daily NVDA analysis)

Create a Google Cloud OAuth client with only the read-only Calendar scope, then
store its refresh token as `GOOGLE_REFRESH_TOKEN`. Do not use a
`NEXT_PUBLIC_` prefix for any calendar variable. Events that exist only in
Apple Calendar/iCloud must be shared or subscribed into Google Calendar before
they can appear in the dashboard. `/personal` uses its own dashboard credentials;
HT101 continues to use `HT101_ARCHIVE_USER` and `HT101_ARCHIVE_PASSWORD`.
The NVDA quote uses Yahoo Finance without a key and fails closed if unavailable;
`FINNHUB_API_KEY` is the documented fallback seam if Yahoo becomes unreliable.

## Editing content

Most public copy lives in `src/app/**/page.tsx`. Shared navigation and footer links live in `src/components/Nav.tsx` and `src/components/Footer.tsx`.

Search for `PLACEHOLDER` to find items that should be replaced later:

- Social/profile links
- HT101 cohort details
- Public project links or case studies
- Calendly or Cal.com booking embed
- Images and Open Graph artwork
