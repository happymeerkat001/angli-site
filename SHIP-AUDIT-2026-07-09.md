# angli.site Ship-Readiness Audit — 2026-07-09

Audit only — no code changed. Fix plan is written for Codex (per LEON_CONTEXT role split: Claude = strategy, Codex = implementation). Each item names exact file:line targets so Codex needs no re-discovery.

## Verdict in one line

The site is **live, deployed at HEAD, and technically clean** — the ship-blockers are three content-correctness items on the HT101 page, not engineering. Total Codex effort: under one hour once Leon answers the one date question.

## Verified healthy (do not spend quota here)

- `npm run typecheck` ✅ clean · `npm run lint` ✅ 1 warning only · `npm run build` ✅ 12 routes, all static, 96 kB first load
- Deployed site == local HEAD == origin/main (c9bd2e4); working tree clean
- All 40 curated YouTube video IDs verified alive via oembed (checked 2026-07-09)
- TidyCal booking link and all 4 Google Drive upload folders return 200
- sitemap.ts, robots.ts, `metadataBase`, title template, favicon all correct
- Fonts self-hosted via `next/font` (no external font requests)

## P0 — Blocking decision (Leon, then Codex)

**1. Course dates on the live site are already in the past.**
`src/app/ht101/page.tsx:372` hero says "June 20 - July 7, 2026"; `:729` and `:835` say final due "July 8, 2026". Today is July 9. Meanwhile vault activity (HT101 Coherence Audit 2026-07-08, APTS trip prep) indicates teaching is still ahead.
- **Leon decides:** actual course dates. If the cohort truly ended July 7, the fix is instead to mark submissions closed/late-window on the three submission cards.
- **Codex executes:** update the 3 line targets above, and check `public/HIS592-Syllabus.pdf` / `public/HIS592-Schedule.pdf` for the same stale dates (regenerate if Leon supplies updated source docs).

## P1 — Content bugs (Codex, no decision needed)

**2. "Five worked examples" but only one exists.**
`src/app/ht101/page.tsx:637` — commit 1fa527f removed the four non-USA lens examples but left the prose promising five. Fix: reword to "A worked example of the Three Lenses format" (or plural-neutral). One-line edit.

**3. Placeholder card shipping in production.**
`src/app/projects/page.tsx:36-43` renders a visible "Future Project" card with status literally reading "Placeholder". Fix: delete the card (grid stays balanced at 3 items on md:grid-cols-2? — it becomes 3 cards; acceptable) or Leon supplies a fourth real project.

## P2 — Polish before promoting the site anywhere

**4. No Open Graph image.** `layout.tsx` declares OG metadata but no `opengraph-image.(png|tsx)` exists — shared links render bare text. One file at `src/app/opengraph-image.tsx` (Next's ImageResponse, brand colors from globals.css `@theme`) covers every page.
**5. YouTube thumbnails use raw `<img>`.** `src/app/ht101/page.tsx:530` (the one lint warning). Either switch to `next/image` + `images.remotePatterns` for `img.youtube.com` in `next.config.mjs`, or add an eslint-disable with comment. Low stakes — thumbnails are small.
**6. PLACEHOLDER comments awaiting Leon's links:** `about/page.tsx:49` (profiles/publications), `Footer.tsx:28` (social links), `ProjectCard.tsx:24` (live/repo/case-study URLs). Codex wires them the moment Leon provides URLs; nothing to invent.
**7. Footer omits About.** `Footer.tsx:4-7` lists 4 links; Nav has 5. Add About for parity.

## P3 — Hygiene (zero risk, batch into one commit)

**8. `tailwind.config.ts` is dead weight.** Tailwind v4 is active via `@import "tailwindcss"` + `@theme` in `globals.css`; the v3-style config duplicates every color/font token and is never read (no `@config` directive). Delete it before the two token sets drift.
**9. Add `.claude/` to `.gitignore`** (currently untracked noise in `git status`).
**10. Drive folder permissions (Leon, 2 min, in Drive UI):** the 4 upload folders are link-public. Confirm they're "anyone with link can **add**" not "can edit", so students can upload but can't touch each other's files.

## Suggested Codex work order

One branch, three commits: (a) `fix(ht101): correct course dates + worked-example copy` [after P0 answer], (b) `feat: add opengraph image, footer About link, drop placeholder card`, (c) `chore: remove dead tailwind config, ignore .claude`. Verify with `npm run typecheck && npm run build`, then push — Vercel redeploys from main.
