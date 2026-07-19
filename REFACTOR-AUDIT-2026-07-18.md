# angli-site — Refactor & Optimization Audit (2026-07-18)

> **STATUS: PLAN ONLY — code refactors below not executed.** (Unlike the other repos' audits, the *content/ship* work here IS done — see SHIP-AUDIT-2026-07-09.md and CODEX-TICKET-2026-07-18.md, both fully implemented on `fix/ship-audit`.)
> **Next step (Leon, 2 min):** merge `fix/ship-audit` → `main` — this triggers the Vercel production deploy of everything already done. Then optionally hand the items below to Codex.

## Verdict in one line

Post-ship-audit the repo is clean (typecheck/lint/build/tests green, dashboard lib fully tested) — the only real refactor target is `src/app/ht101/page.tsx` at 870 lines, and even that is optional polish on an archived course page.

## P1 — `ht101/page.tsx` (870 lines; only if the page will be reused)

It inlines all course data (lens examples, submission cards, session schedule) with JSX. If HT101 runs again (new cohort) this page gets cloned-and-edited — that's the moment to split, not before:
- `ht101/data.ts` — typed course-content arrays (sessions, cards, examples, dates).
- Section components (`CourseHero`, `SubmissionCards`, `ModelPresentations`…) in `src/components/ht101/`.
- Payoff: next cohort = new data file, zero JSX surgery. **If HT101 never runs again, skip this entirely.**

## P2 — Small items

- `src/app/ht101/page.tsx:534` — the one lint warning (raw `<img>` for YouTube thumbnails). Either `next/image` + `img.youtube.com` in `remotePatterns`, or an eslint-disable with comment. 10 min.
- PLACEHOLDER comments still awaiting real URLs: `about/page.tsx` (profiles/publications), `Footer.tsx` (socials), `ProjectCard.tsx` (repo/case-study links). Needs links from Leon, then trivial.
- `/personal` dashboard: news sources and flight routes are hardcoded in `lib/dashboard/config.ts` — fine for one user; consider env/JSON only when the list churns.
- Tests cover `lib/dashboard/` only. Adequate — pages are static JSX. Don't add snapshot tests for prose pages.

## Explicitly do NOT

- No styling/design pass, no CMS, no i18n, no app-router restructure. The site's job is credibility, not engineering showcase (per 2026-07-18-positioning-strategy.md).

## Codex order

1. (Leon) merge to main → verify Vercel deploy.
2. P2 lint warning + any links Leon supplies.
3. P1 only when a new HT101 cohort is actually scheduled.
