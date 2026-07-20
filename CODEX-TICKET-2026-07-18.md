# Codex Ticket — angli.site fixes + /today rebuild (2026-07-18)

All decisions made by Leon. No open questions. Sources: `SHIP-AUDIT-2026-07-09.md` (line targets), `2026-07-18-positioning-strategy.md` (§Decisions). One branch; commit order below. Verify each commit with `npm run typecheck && npm run lint && npm run build` before moving on.

## Commit 1 — `fix(ht101): close ended cohort`

Decision: cohort ended July 7–8, 2026. Do NOT change dates to new ones — mark closed.

- `src/app/ht101/page.tsx:372` — hero dates "June 20 - July 7, 2026" stay as historical record; add a clear "This cohort has concluded" status line near the hero.
- `src/app/ht101/page.tsx:729` and `:835` — on the three submission cards: mark submissions closed (or late-window if links still work), so students aren't invited to submit to a finished course.
- `src/app/ht101/page.tsx:637` — reword "five worked examples" → singular/plural-neutral ("A worked example of the Three Lenses format"); only one example exists.
- Check `public/HIS592-Syllabus.pdf` / `public/HIS592-Schedule.pdf` — if they promise future deadlines, note it in the PR description (regeneration needs source docs from Leon; don't block on it).

## Commit 2 — `feat(today): rebuild briefing dashboard page`

Decision: /today is Leon's private daily briefing (news + flights + calendar). Stays behind existing Basic-auth (`src/middleware.ts`) — verify the matcher still covers `/today` after the page is added.

- `src/app/today/` is an empty dir; the display page was removed but the full data layer survives in `src/lib/dashboard/` (calendar.ts, flights.ts, news.ts, routes.ts, config.ts, types.ts — all tested).
- Rebuild `src/app/today/page.tsx` on those modules. Check git history first (`git log --oneline --all -- 'src/app/today'`) — a prior page.tsx likely exists to restore/adapt rather than write from scratch.
- Rendering: dynamic/server-rendered route (data fetches use `next: { revalidate: 3600 }`); do not force it static.
- Layout priority for a daily briefing: calendar/today's events first, then flights, then news sections. Keep it fast and scannable on mobile — this is a phone-check page.
- Exclude /today from sitemap if it isn't already (it's private).

## Commit 3 — `feat: og image, footer parity, drop placeholder card`

- Delete "Future Project" placeholder card: `src/app/projects/page.tsx:36-43` (3-card grid is acceptable).
- Add `src/app/opengraph-image.tsx` (Next ImageResponse, brand colors from `globals.css` `@theme`).
- `src/components/Footer.tsx:4-7` — add About link (parity with Nav).

## Commit 4 — `chore: remove dead tailwind config, ignore .claude`

- Delete `tailwind.config.ts` (Tailwind v4 active via `@theme` in globals.css; config never read).
- Add `.claude/` to `.gitignore`.

## Explicitly out of scope (decided)

- Hero CTA order on homepage: keep as-is ("Let's talk" primary). Do not swap.
- No styling passes, no content rewrites beyond lines named above, no new sections.

After all commits: push to main (Vercel redeploys). Leon separately confirms Drive upload folders are "add" not "edit" (SHIP-AUDIT item 10, 2 min in Drive UI).
