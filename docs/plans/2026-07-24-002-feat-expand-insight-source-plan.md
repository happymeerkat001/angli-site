# Expand /personal insight-highlight source from read.done to z.Ingestion + Hedy-AI

## Summary

The `/personal` "Insight reminder" card (`src/components/RandomInsightCard.tsx`) surfaces a random `==highlight==` span extracted from Obsidian notes via `scripts/generate-insights.ts` into the committed manifest `src/lib/dashboard/insights.generated.json` (see origin: `docs/plans/2026-07-23-001-feat-random-insight-reminder-card-plan.md`). Today the script only scans `AI-Vault/z.Ingestion/read.done/` — a flat folder of 13 curated files, all with an H1 title on line 1.

This plan widens the scan to a fixed allowlist of folders across `z.Ingestion` plus a separate `Hedy-AI` vault folder, recursively, while excluding folders the user does not want surfaced. Both new roots contain far more files than `read.done` (~1150 candidate `.md` files vs. 13) and the large majority lack an H1 title line, so the script's current fail-loud-on-missing-H1 behavior must change to a filename-derived fallback rather than throwing.

## Problem Frame

- Current scan root: `AI-Vault/z.Ingestion/read.done/` only, non-recursive (`readdir` without `recursive`), 13 files.
- Target scan roots: `AI-Vault/z.Ingestion/{Clippings, Official Docs, People, personal.Spaces, read.done}` (recursive, arbitrary nesting depth) **excluding** `z.Ingestion/personal.Sources` entirely and **excluding** `personal.Spaces/Manus` and `personal.Spaces/$$$` — plus the separate `AI-Vault/Hedy-AI/` folder (sibling of `z.Ingestion`, flat), excluding its raw `transcript *.md` files.
- Confirmed via investigation: of the ~30 files across `z.Ingestion` that currently contain a genuine `==highlight==` pair, 22 have no H1 as line 1 (they start with wikilinks, YAML frontmatter, headings other than H1, or prose). The script's `if (!title) throw new Error(...)` (`scripts/generate-insights.ts:13`) would abort the very first such file.
- `Hedy-AI` notes use a callout block (`> [!success] ...`) or an H2 (`## Hedy AI — <date>`) as their opening line, never an H1, and file-based daily notes like `2026-05-19.md` carry no title text elsewhere either — title must come from the filename.
- The extraction library (`src/lib/dashboard/insights.ts`) is already tolerant: `splitNoteSections` returns `title: ""` when there's no H1, and `extractInsightsFromNote` accepts an explicit `noteTitle` override. Only the **script's** fail-loud check and its single-flat-directory read need to change — the extraction/exclusion regex logic (`## Description`, `## YouTube Transcript`, `**Source:**` etc. metadata stripping, `==...==` false-positive guard) is unaffected and stays as-is (R7).

## Requirements

| ID | Requirement |
|----|-------------|
| R1 | Script recursively walks `z.Ingestion/Clippings`, `z.Ingestion/Official Docs`, `z.Ingestion/People`, `z.Ingestion/personal.Spaces` (minus `Manus` and `$$$`), and `z.Ingestion/read.done` for `.md` files, at any nesting depth. |
| R2 | Script also recursively walks the separate `Hedy-AI` vault folder (sibling of `z.Ingestion`), excluding any file whose name matches `transcript *.md` (case-insensitive) — those are raw, unprocessed transcripts with no section markers to exclude by. |
| R3 | `z.Ingestion/personal.Sources`, `z.Ingestion/personal.Spaces/Manus`, and `z.Ingestion/personal.Spaces/$$$` are never scanned. |
| R4 | When a note has no H1 on line 1, its title falls back to a filename-derived title: strip the extension, strip a leading `YYYYMMDD ` or `YYYY-MM-DD ` date prefix if present, trim; if nothing remains after stripping the date prefix, use the filename (minus extension) unstripped. The script no longer throws for missing H1. |
| R5 | The single `--vault <path>` CLI argument now means the **AI-Vault root** (the parent directory containing both `z.Ingestion` and `Hedy-AI`), not the `read.done` folder directly. The folder allowlist itself (R1–R3) is fixed in source, not passed as flags. |
| R6 | Manifest shape and privacy guarantee are unchanged: only `{id, noteTitle, insightText}` per insight ever reaches `insights.generated.json` / the client. Generation stays a manual, human-reviewed (`git diff`) step — never run by Vercel or CI. |
| R7 | Existing extraction rules — `## Description` / `## YouTube Transcript` section exclusion, the 4-line metadata block strip, and the `==...==` false-positive guard against bare `===` runs — apply unchanged to every scanned root. |

## Key Technical Decisions

- **Fixed internal folder allowlist, single vault-root arg (R1, R3, R5).** The set of included/excluded subfolders is a content-policy decision, not something that should vary per invocation — it's hardcoded in `scripts/generate-insights.ts` and reviewable in the script's own diff. The CLI keeps its existing single-argument shape (`--vault <path>`); only what that path is expected to point at changes, from `read.done` to the `AI-Vault` root. This avoids a wider flag surface and keeps the "no local paths committed to the repo" property intact.
- **Filename-fallback title replaces fail-loud (R4).** The original fail-loud-on-missing-H1 behavior was deliberate for the curated, 13-file `read.done` set, where every file was expected to already have a clean H1. That assumption doesn't hold once the scan covers ~1150 files across heterogeneous note types (dissertation drafts, class plans, daily journal entries, clippings). Falling back to a derived filename title — mirroring how Obsidian itself displays untitled notes — lets generation succeed across the full set while still producing a meaningful `noteTitle`. The script logs which files used a fallback title (extending the existing `console.log`/`console.warn` summary output) so the human reviewing the `git diff` can spot low-quality titles.
- **Transcript exclusion by filename, not by section (R2).** `read.done` notes mark their transcript content with a `## YouTube Transcript` heading that the existing section-splitter already strips. `Hedy-AI`'s `transcript YYYY-MM-DD.md` files have no such internal marker — the entire file *is* the transcript — so they're excluded by filename pattern before being read, consistent in intent with the existing section-level exclusion (raw transcript text never becomes scannable text).
- **Recursive walk with no fixed depth limit.** `personal.Spaces` nests arbitrarily (e.g. `Academics/zCivil Rights Books/...`), so the walker recurses through every subdirectory of each allowed root rather than assuming a fixed depth, matching how `read.done`'s existing (currently non-recursive) call is generalized rather than special-cased.

## Implementation Units

### U1. Filename-derived title fallback (pure function)

**Goal:** Add a pure, unit-testable helper that derives a title from a filename when a note has no H1.

**Requirements:** R4

**Dependencies:** none

**Files:**
- `src/lib/dashboard/insights.ts` — add and export `deriveTitleFromFilename(filename: string): string`
- `src/lib/dashboard/insights.test.ts` — new test cases

**Approach:** Strip the `.md` extension. Strip a leading date prefix matching `^\d{8}\s+` (e.g. `20260719 `) or `^\d{4}-\d{2}-\d{2}\s+` (e.g. `2026-07-24 `). Trim whitespace. If the result is empty (e.g. a bare `2026-05-19.md` daily note with no trailing text), return the extension-stripped filename unstripped (i.e. `"2026-05-19"`) instead of an empty string.

**Patterns to follow:** Mirrors the existing pure-function style in `insights.ts` (`extractHighlights`, `splitNoteSections`) — synchronous, no filesystem access, easily unit-tested in isolation.

**Test scenarios:**
- Filename with `YYYYMMDD ` prefix and trailing title (e.g. `20260719 C4 Model Official - Software Architecture Diagrams.md`) → returns `"C4 Model Official - Software Architecture Diagrams"`.
- Filename with `YYYY-MM-DD ` prefix and trailing title (e.g. `2026-07-24 Andee Tao Architecture.md`) → returns `"Andee Tao Architecture"`.
- Filename with no date prefix (e.g. `close.bot.md`) → returns `"close.bot"`.
- Filename that is *only* a date with nothing else (e.g. `2026-05-19.md`) → returns `"2026-05-19"` (not empty string).
- Filename with mixed case extension (e.g. `Notes.MD`) — Test expectation: none — script-level file discovery already filters to lowercase `.md` before this function is called; not this function's concern.

**Verification:** `deriveTitleFromFilename` never returns an empty string for any non-empty input filename.

---

### U2. Recursive multi-root scan with folder allowlist and transcript exclusion

**Goal:** Replace the single flat `readdir` in `scripts/generate-insights.ts` with a recursive walk over the fixed set of allowed roots, and remove the fail-loud H1 check.

**Requirements:** R1, R2, R3, R5, R6, R7

**Dependencies:** U1

**Files:**
- `scripts/generate-insights.ts` — rewrite file discovery and title resolution

**Approach:**
- Interpret `--vault <path>` as the AI-Vault root.
- Define the fixed allowlist: `z.Ingestion/Clippings`, `z.Ingestion/Official Docs`, `z.Ingestion/People`, `z.Ingestion/personal.Spaces`, `z.Ingestion/read.done`, `Hedy-AI` (all relative to the vault-root argument).
- Recursively collect `.md` files under each allowed root using `readdir(dir, { withFileTypes: true, recursive: true })` (Node 20+; confirm current Node engine supports it) or manual recursive directory traversal if not.
- Within `personal.Spaces`, skip any path containing a `Manus` or `$$$` path segment.
- Within `Hedy-AI`, skip any file whose basename matches `/^transcript /i`.
- For each remaining file: read it, run `splitNoteSections`; if `title` is empty, call `deriveTitleFromFilename(basename)` instead of throwing.
- Keep the existing zero-insights log line and the `http`/400-char review warning unchanged (R6, R7).
- Update the usage error string (`scripts/generate-insights.ts:7`) to describe the AI-Vault root argument instead of "read.done path".

**Technical design (directional):**
```
for root of ALLOWED_ROOTS(vaultArg):
  for file of walk(root, { skip: EXCLUDE_RULES[root] }):
    markdown = read(file)
    { title, scannableText } = splitNoteSections(markdown)
    resolvedTitle = title || deriveTitleFromFilename(basename(file))
    insights.push(...extractInsightsFromNote(markdown, resolvedTitle))
```

**Patterns to follow:** Keep the existing per-file loop shape, summary `console.log`, and `insight-review` warning heuristic (`http` / >400 chars) from the current script — only the discovery and title-resolution steps change.

**Test scenarios:**
- Given a temp directory tree mimicking the allowlist (a nested `.md` file 3 levels deep under a `personal.Spaces` equivalent, a file directly under an excluded `Manus`-equivalent folder, and a `transcript *.md`-equivalent file under a `Hedy-AI` equivalent), the collected file list includes the nested file and excludes the `Manus` and `transcript` files.
- A file with no H1 no longer throws; the resulting insight's `noteTitle` matches `deriveTitleFromFilename` output for that file.
- A file with an H1 still uses the H1 text as before (regression check against existing `read.done` behavior).
- Test expectation for the top-level `main()`/CLI wiring itself: none — covered indirectly by the extraction/discovery unit tests and by the manual verification run in the Verification section; the script has no existing test harness for its CLI entrypoint and this plan doesn't add one, consistent with `scripts/` being a manually-run, non-CI surface.

**Verification:** Running `npm run generate:insights -- --vault "<AI-Vault root>"` against the real vault completes without throwing and prints a files-scanned / insights-extracted summary covering all allowed roots.

---

### U3. Unit tests for title fallback and recursive discovery

**Goal:** Cover the new behavior introduced in U1 and U2 with colocated Vitest tests.

**Requirements:** R4, R1, R2, R3

**Dependencies:** U1, U2

**Files:**
- `src/lib/dashboard/insights.test.ts` — extend with `deriveTitleFromFilename` cases (listed under U1)
- A new colocated test for the discovery/exclusion logic if it is extracted into a testable pure function (e.g. `shouldExcludePath(path): boolean`) rather than left inline in `main()`

**Approach:** If the exclusion rules (`Manus`, `$$$`, `transcript *.md`) are extracted as a small pure predicate function (recommended, so U2's exclusion logic is unit-testable without touching the filesystem), test it directly with representative path strings rather than building a real directory tree.

**Test scenarios:**
- `shouldExcludePath` (or equivalent) returns `true` for a path containing `.../personal.Spaces/Manus/...`.
- Returns `true` for a path containing `.../personal.Spaces/$$$/...`.
- Returns `true` for a path whose basename matches `transcript 2026-05-19.md`.
- Returns `false` for an ordinary path like `.../personal.Spaces/Real Estate/PML raising 07-05-23.md`.
- Returns `false` for `read.done/20260723 2% Engineers Winning AI Era (Ex-Meta L8).md` (existing behavior unchanged).

**Verification:** `npx vitest run src/lib/dashboard/insights.test.ts` passes.

## Scope Boundaries

**In scope:** recursive folder allowlist under `z.Ingestion`, inclusion of `Hedy-AI` as a second root, filename-fallback titles, transcript-file exclusion, updated CLI usage text, unit tests for the new pure logic.

**Out of scope:**
- Changing the `==...==` extraction syntax, the `## Description`/`## YouTube Transcript` section-exclusion rule, or the false-positive guard (R7) — these are unaffected by the scope change.
- Any change to `src/components/RandomInsightCard.tsx`, `src/app/personal/page.tsx`, or the `InsightEntry` manifest shape — the client-facing contract is unchanged.
- Automating manifest regeneration in CI/build — generation remains a manual, human-reviewed local step (R6), matching the original design's no-CI constraint.

### Deferred to Follow-Up Work

- `personal.Spaces/Manus` and `personal.Spaces/$$$` are excluded per explicit user decision this round; if the user later wants either included, that's a follow-up folder-allowlist change to `scripts/generate-insights.ts`, not a re-plan.
- If the regenerated manifest turns out too large or noisy after this change ships, further per-folder curation (e.g. excluding additional folders, or filtering by note age) is a follow-up, not handled here.

## Risks / Dependencies

- **Scale jump.** Candidate file count goes from 13 to roughly 1150+ across the allowed roots (exact count depends on final `Manus`/`$$$` exclusion accuracy); actual highlight-bearing files found during investigation were ~26 outside `read.done` plus 1 in `Hedy-AI`. The human `git diff` review step (R6, unchanged) becomes proportionally more important as the manifest's diff grows on first regeneration.
- **Filename-fallback title quality.** Some fallback titles will be less polished than hand-written H1s (e.g. a bare date, or a filename with underscores/dashes). This is an accepted tradeoff of R4 and was confirmed with the user rather than silently assumed.
- **Node `recursive: true` support.** `readdir(..., { recursive: true })` requires Node ≥20.1; confirm the project's engine/CI Node version supports it during U2, or fall back to manual recursion if not.
- **No automation watches the vault** (carried over from the original plan) — regeneration is still a manual, on-demand step; this plan doesn't add a watcher or scheduled job.

## Verification

- `npx vitest run src/lib/dashboard/insights.test.ts` — all pass, including new U1/U3 cases.
- `npm run typecheck` and `npm run build`.
- `npm run generate:insights -- --vault "<AI-Vault root>"` run manually against the real vault; confirm the stdout summary reports files scanned across all allowed roots and no thrown error.
- `git diff src/lib/dashboard/insights.generated.json` reviewed by hand to confirm every new/changed insight line is genuine (no leaked transcript text, no content from `personal.Sources`/`Manus`/`$$$`), before committing the regenerated manifest.
- Manual: `npm run dev`, load `/personal` behind Basic Auth, confirm the insight card still renders and "Show another insight" still cycles without a full reload.
