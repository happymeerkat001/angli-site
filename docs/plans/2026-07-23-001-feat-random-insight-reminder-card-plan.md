# Random insight reminder card on /personal

## Context

`/personal` (`src/app/personal/page.tsx`) is Ang Li's private dashboard, gated by HTTP Basic Auth in `src/middleware.ts` (matcher `/personal/:path*`). It's an async Server Component that aggregates calendar, news, stock, and flight-fare cards via one `Promise.all()`.

This adds a lightweight, spaced-repetition-style card: it surfaces one highlighted "insight" span at random, drawn from notes captured in the user's Obsidian vault (`AI-Vault/z.Ingestion/read.done/`), plus the source note title, so previously-consumed ideas resurface while using the dashboard without needing to re-read full notes. A "Show another insight" button re-selects client-side, without a full page reload.

**Key constraint:** the vault is iCloud-backed and lives only on the user's local machine. The deployed Vercel site has no runtime access to it, and this repo has no CI. So insight data must be extracted **at authoring time, on the local machine**, reduced to an allowlisted minimal shape, committed into the repo as a static artifact, and shipped as part of the normal Next.js build. There is no live "vault backend" for this feature, ever.

## Requirements

| ID | Requirement |
|----|-------------|
| R1 | Card on `/personal` shows one highlighted insight span + source note title, chosen at random from an allowlist. |
| R2 | "Show another insight" re-selects client-side, no full page reload. |
| R3 | No immediate repeats until the pool is exhausted, then reshuffle. Scoped to the card's mounted lifetime — resets on page reload, matching how every other card on the page already re-renders fresh per load (confirmed with user). |
| R4 | Only `{id, noteTitle, insightText}` ever reaches the client — no full note bodies, transcripts, URLs, or unrelated vault data. |
| R5 | Feature only reachable behind the existing `/personal` auth gate; never exposed via a public API, prefetch, or separate endpoint. |
| R6 | Explicit, reviewable, deploy-safe refresh workflow for newly added/edited notes. |

## Vault content shape (confirmed by grepping all 13 files for `==`)

Source: `AI-Vault/z.Ingestion/read.done/` — 13 flat `.md` files, no subdirectories.

1. Line 1 is `# <Title>` — matches the filename with its `YYYYMMDD ` prefix stripped. Extract title from the H1, not the filename.
2. Immediately after: a fixed 4-line metadata block to always exclude: `**Source:**`, `**Date:**`, `**Language:**`, `**Transcript source:**`.
3. `## Description`: promotional text, sponsor links, timestamp indices — always excluded.
4. Optional `## AI Summary`: prose paragraphs, may contain a `### Why this matters` subsection. Not itself an insight span, but may contain the Obsidian highlights described next.
5. **Insight-bearing spans**: text wrapped in Obsidian's native highlight syntax, `==highlighted text==`. Confirmed real usage in 1 of 13 files (`20260723 The 2% of Engineers Winning the AI Era (Ex-Meta L8).md`), with 2 genuine highlights: one a full standalone paragraph, one an inline span embedded mid-sentence within a larger paragraph. This is the extraction target. Not every note has one — extraction must tolerate zero-insight files (skip, don't error). **False-positive to guard against:** `20210113 The Four Temperaments - How To Assess People Quickly.md` contains a bare `=========================================` horizontal-rule-style line that also matches a naive `==` substring search but is not a highlight — the extraction pattern must require paired `==...==` delimiters around non-empty, non-`=` content, not just any run of `=`.
6. `## YouTube Transcript` (or equivalent): raw transcript, always massive, always excluded entirely — never scanned.

Extraction rule should be pattern-based: match `==...==` pairs (non-greedy, content between the pairs must not itself be blank or all `=` characters) outside the Description/Transcript sections. Both an inline highlight (embedded within a larger sentence) and a full-paragraph highlight are valid matches — `insightText` is the highlighted span's own text, trimmed of the `==` markers, not the surrounding sentence.

## Approach

### 1. Architecture: build-time manifest, static import, client-side selection

```
[Local machine]                              [Repo / Vercel]
Obsidian vault (.md files, read.done/)
        |
        v
scripts/generate-insights.ts (run manually, by hand, when notes change)
        | reads vault path (CLI arg/env, never hardcoded)
        | extracts + filters insight lines via pure functions
        | in src/lib/dashboard/insights.ts
        v
src/lib/dashboard/insights.generated.json  <-- committed to git
        |
        | git diff review -> git commit -> git push -> Vercel build
        v
src/app/personal/page.tsx (Server Component)
        | static import of JSON (build-time, bundled)
        v
src/components/RandomInsightCard.tsx ("use client")
        | receives full manifest array as a prop
        | owns selection state (seen-set) in React state
        v
rendered inside existing /personal auth-gated page
```

This mirrors the existing `config.ts`/`types.ts` domain-split convention, but differs from every other card: other domains fetch **live external data at request time** (`fetch()` + `revalidateTag`), while insights are **static, pre-committed content** — closer in spirit to the static `flightRoutes`/`fareSearch` arrays in `config.ts` than to `news.ts`'s live-fetch pattern. The manifest is imported, not fetched, so `Promise.all()` in `page.tsx` needs no change.

**Why static JSON import, not a server action or API route:** a server action or route handler for insights would create a new network-observable endpoint — even gated by the same middleware, it's a new code path to reason about for R5. A static import ships inside the existing authenticated bundle with no new surface. It also matches R6's reality (no CI): generation is a human-run, pre-commit, local step, exactly like hand-editing `config.ts` today.

**Why not the `RefreshButton`/server-action pattern:** `src/components/RefreshButton.tsx` + `src/app/personal/actions.ts`'s `refreshFlights`/`refreshNews`/`refreshStockAnalysis` exist to force a server re-fetch of *external* data via `revalidateTag`. Picking a different insight is a pure in-browser reselection over data already shipped to the client — no server round-trip needed, so `RandomInsightCard` uses a plain `onClick` handler and local state instead.

### 2. `src/lib/dashboard/types.ts` — add `InsightEntry`

```
InsightEntry = { id: string; noteTitle: string; insightText: string }
```

Follows the existing flat-type convention already in this file (`NewsItem`, `AnywhereFlightOption`, etc.).

### 3. `src/lib/dashboard/insights.ts` — new module (pure functions, follows the existing `config.ts`/`types.ts`/`<domain>.ts` split)

- `splitNoteSections(markdown): { title, scannableText }` — extracts H1, strips the 4-line metadata block, excludes `## Description` and `## YouTube Transcript` sections, returns only text eligible for scanning. Centralizes "what counts as scannable" so a new excluded-section name is a one-line change.
- `extractHighlights(text): string[]` — finds all `==...==` pairs in a block of text and returns their inner content, trimmed; rejects matches whose inner content is empty or consists only of `=` characters (guards against the `=====` horizontal-rule false positive found in one note). Exported separately so delimiter/false-positive edge cases are unit-testable in isolation.
- `extractInsightsFromNote(markdown, noteTitle): InsightEntry[]` — pure, synchronous, takes a string, runs `extractHighlights` over the scannable text from `splitNoteSections`, and returns entries; no filesystem access, fully unit-testable without touching disk.
- `selectRandomInsight(pool, seenIds): { entry, nextSeenIds }` — pure random-without-replacement selection: excludes already-seen ids; when the filtered set is empty (pool exhausted), reselects from the full pool and starts a fresh seen-set. This is the only function of the module used by client code — it takes already-filtered `InsightEntry[]` as input and never touches raw markdown, which is itself part of the privacy boundary.

### 4. `src/lib/dashboard/insights.generated.json` — the manifest

- Colocated with other dashboard domain files in `src/lib/dashboard/`.
- `.generated.` in the filename signals "produced by script, don't hand-edit."
- Shape: flat `InsightEntry[]`, matching R4 exactly.

### 5. `scripts/generate-insights.ts` — the R6 refresh workflow

New top-level `scripts/` directory (first script of its kind in this repo). Run manually, never part of `npm run build`, never invoked by Vercel.

- Add a `package.json` script: `"generate:insights": "tsx scripts/generate-insights.ts"`. Requires adding `tsx` as a devDependency (repo has no TS runner today) — acceptable since it never runs in the Vercel build, only locally.
- **Input:** local absolute vault path, supplied via a required CLI arg (or env var read only inside the script). Must never be hardcoded into anything under `src/` — Next.js only bundles what's reachable from `src/app`/`src/components`/`src/lib`, so a script-local path in `scripts/` never ships to the client, but the rule should be explicit and enforced by review.
- **Steps:**
  1. Read all `.md` files directly under `read.done/` (non-recursive is fine — confirmed flat, no subdirectories today).
  2. Per file: extract H1. **Fail loudly** (non-zero exit) if a file has no H1 on line 1, or it's empty — do not silently skip; a malformed note should be visibly fixed, not silently dropped from the manifest.
  3. Strip the 4-line metadata block; exclude `## Description` / `## YouTube Transcript` sections.
  4. Run `extractInsightsFromNote` on what remains.
  5. Files yielding zero insights are logged ("0 insights found in `<file>`") and skipped — not an error.
  6. Assign a stable `id` per insight: slug derived from `noteTitle` + a running index per note (e.g. `i-was-wrong-about-fable-5-1`), so re-running the script on unchanged notes produces a stable diff instead of ID churn.
  7. Write the full `InsightEntry[]` array, pretty-printed, to `src/lib/dashboard/insights.generated.json`, overwriting the previous file.
  8. Print a summary to stdout: files scanned, files with zero insights, total insights extracted — an at-a-glance sanity check before reviewing the diff.
- **Review/approval (the actual R6 safety net):** after running the script, the human runs `git diff src/lib/dashboard/insights.generated.json`, visually confirms every new/changed line is a genuine meaningful insight (not leaked transcript, not a stray URL), then commits and pushes — deploy proceeds via the existing git-push-to-Vercel flow. As a lightweight machine-assisted second check, the script should flag (not block) any candidate `insightText` containing `http` or exceeding ~400 characters, since either is a signal the heuristic let transcript/URL content through.

### 6. `src/components/RandomInsightCard.tsx` — new client component

`"use client"`, following the `RefreshButton.tsx` file-per-component convention, but deliberately not reusing its `useFormStatus`/server-action pattern — there's no async server work here, just local state.

- **Props:** `{ insights: InsightEntry[] }` — the full manifest, passed down from the Server Component.
- **State:** `seenIds: Set<string>` and `current: InsightEntry | null`, initialized via a lazy `useState` initializer calling `selectRandomInsight(insights, new Set())` once on mount.
- **Button:** plain `<button type="button" onClick={...}>` calling `selectRandomInsight(insights, seenIds)` and updating both `current` and `seenIds`. Native button, keyboard-operable by default.
- **Rendering:** insight text rendered as plain text inside a `<mark>` (already-stripped of its `==` markers by extraction — the manifest never carries the delimiters, so no client-side markdown parsing needed), note title as a muted caption below it (matching the existing `text-xs text-muted` caption style used elsewhere), wrapped in an element with `aria-live="polite" aria-atomic="true"` so screen readers announce the new insight after a click without needing focus to move.
- **Empty state:** if `insights.length === 0` (manifest never generated, or empty), render a muted "No insights available yet." message instead of the button.
- Section wrapper follows the same `<section aria-labelledby="...-heading">` + `<h2 id="...-heading">` landmark pattern used by every other card in `page.tsx`.

### 7. `src/app/personal/page.tsx` — integration

- Add `import insights from "@/lib/dashboard/insights.generated.json";` and `import { RandomInsightCard } from "@/components/RandomInsightCard";` (existing `@/*` alias; `resolveJsonModule` already enabled per `tsconfig.json`).
- No change to the `Promise.all()` block — insight data is available synchronously at module-evaluation time, unlike every other card's data.
- Place the new `<section aria-labelledby="insight-heading">` near the top of the page, directly after the "Next 7 Days" calendar card — lightweight and glanceable, fits the page's existing lead-with-calendar ordering. Use an existing `lucide-react` icon (e.g. `Lightbulb`) matching the icon-per-card-heading convention already used elsewhere (`CalendarDays`, `Newspaper`, `Plane`, `TrendingUp`); `lucide-react` is already a dependency.

### Tests

New colocated `src/lib/dashboard/insights.test.ts` (Vitest, `environment: "node"`, matching the existing 10 `*.test.ts` files' plain `test()`/`expect()` style).

- `extractHighlights` / `splitNoteSections` / `extractInsightsFromNote`:
  - Recognizes a full-paragraph `==highlighted text==` span as an insight.
  - Recognizes an inline `==highlighted text==` span embedded mid-sentence within a larger paragraph, extracting only the highlighted span's own text.
  - Rejects a bare `=====` horizontal-rule-style line (content that is empty or all `=` characters) as a false positive.
  - Excludes text found only inside `## Description` / `## YouTube Transcript` sections.
  - A note with zero eligible insight lines returns an empty array, not an error.
  - Confirms `noteTitle` comes from the H1, independent of filename.
- `selectRandomInsight`:
  - With an injected deterministic RNG and a small fixed pool (2–3 entries), confirm no id repeats until the seen-set covers the full pool, then confirm it resets and can reselect previously-seen ids.
  - Single-entry pool: returns that entry every time without looping/throwing.
  - Empty pool: returns `null`/`undefined` entry without throwing, so the component can render its empty state.
- Component-level rendering tests are out of scope — the repo has no `@testing-library/react`/jsdom setup today (`vitest.config.ts` is `environment: "node"` only), and no existing card component (`WeekGrid`, `RefreshButton`) has a test file either. Coverage instead comes from TypeScript prop types, the pure-function tests above, and manual verification via `npm run dev`.
- No new middleware test needed — `src/middleware.ts`'s existing `/personal/:path*` gating is unchanged by this feature.

## Privacy verification (R4, R5)

1. **Manifest content audit:** after generation, `git diff`/read `insights.generated.json` directly — it's the only artifact that ever reaches the client, so inspecting it is a complete audit of what ships.
2. **Route-reachability check:** `grep -r "insights.generated.json"` and `grep -r "RandomInsightCard"` across `src/` should each show exactly one import site, inside `src/app/personal/page.tsx`.
3. **No new API surface:** confirm no new `route.ts`/`route.tsx` file was added — the static-import architecture means there's no endpoint to audit in the first place.
4. **Build output sanity check:** after `npm run build`, grep the `.next/` client-reachable output for the vault's absolute local path string or any text resembling transcript content — should find nothing beyond the manifest's own `insightText`/`noteTitle` strings, since the generation script never runs as part of the Next.js build.

## Risks / dependencies

- **No automation watches the vault.** If notes are added/edited and the script isn't re-run, the card silently shows stale insights. Inherent to the R6-mandated manual/reviewable workflow, not a bug.
- **The extraction heuristic is inferred from just 1 of 13 files (2 highlight spans total), an even smaller sample than earlier drafts assumed.** Most notes in the vault currently have zero `==highlight==` content — the card's pool will start very small until more notes are highlighted going forward. The first real run across all 13 should be treated as a validation pass — expect to tune `extractHighlights`/section-name matching after seeing real output (e.g. if a file uses a differently-named section beyond `Description`/`YouTube Transcript`, or a highlight/false-positive shape not yet seen).
- **Fail-loud on malformed H1 is deliberate** — silently skipping a file would mean an insight-worthy note quietly never reaches the manifest with no signal to the human running the script.
- **New tooling surface:** introduces a `scripts/` directory and a `tsx` devDependency, both new to the repo's conventions (everything else runs through `next`/`vitest`/`eslint`/`tsc`). Low risk since it never touches the Vercel build.

## Verification

- `npm run generate:insights -- --vault "<local vault path>"` — confirm stdout summary and `git diff insights.generated.json` show only genuine insight lines, no leaked URLs/transcript text.
- `npx vitest run src/lib/dashboard/insights.test.ts` — confirm all pass.
- `npm run typecheck` · `npm run build`
- Manual: `npm run dev`, log into `/personal` with Basic Auth, confirm the new card renders one insight + title, "Show another insight" cycles through without a full reload, and repeats don't occur until the pool is exhausted (click through the full known pool size).
- Confirm keyboard operability (Tab to button, Enter/Space activates) and that a screen reader (or the accessibility tree in devtools) announces the updated insight text after a click.
- After `npm run build`, grep `.next/` client output for the vault's local path string — confirm no match beyond the manifest's own committed strings.
- `grep -r "insights.generated.json\|RandomInsightCard" src/` — confirm both are referenced only from `src/app/personal/page.tsx`.
