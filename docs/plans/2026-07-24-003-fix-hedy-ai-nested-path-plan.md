# fix: Update Hedy-AI insight source path after vault move

## Summary

`Hedy-AI` moved on disk from a sibling of `z.Ingestion` to `z.Ingestion/Hedy-AI`. The insight-source scanner (`src/lib/dashboard/insight-sources.ts`) still lists it as a top-level sibling root, so `collectInsightSourceFiles` currently only finds it via the compatibility symlink left at the old path (`AI-Vault/Hedy-AI -> z.Ingestion/Hedy-AI`). Update the hardcoded root and exclusion checks to reflect the real path so generation doesn't depend on that symlink.

## Problem Frame

`ALLOWED_ROOTS` in `src/lib/dashboard/insight-sources.ts` contains `"Hedy-AI"` as a bare, vault-root-relative entry (see origin: `docs/plans/2026-07-24-002-feat-expand-insight-source-plan.md`, which established Hedy-AI as a second scan root). The folder is now physically nested at `z.Ingestion/Hedy-AI`. The old location still resolves today only because a symlink (`AI-Vault/Hedy-AI -> z.Ingestion/Hedy-AI`) was left behind — the code should target the real path directly rather than rely on that symlink persisting.

`shouldExcludeInsightSourcePath`'s Hedy transcript check (`segments.includes("Hedy-AI")`) is path-shape-agnostic and needs no change — it matches on the `Hedy-AI` path segment regardless of nesting depth.

## Requirements

- R1: `collectInsightSourceFiles` scans `z.Ingestion/Hedy-AI` (nested), not a `Hedy-AI` root sibling to `z.Ingestion`.
- R2: Raw transcript exclusion (`transcript *.md` under `Hedy-AI`) continues to work unchanged at the new nested path.
- R3: No other scan roots (`Clippings`, `Official Docs`, `People`, `personal.Spaces`, `read.done`) change.

## Key Technical Decisions

- **Update `ALLOWED_ROOTS` entry from `"Hedy-AI"` to `"z.Ingestion/Hedy-AI"`.** Minimal one-line fix matching the actual current folder location; no new CLI flags or config needed, consistent with the existing hardcoded-roots convention.
- **Leave `shouldExcludeInsightSourcePath` untouched.** It already matches on the `Hedy-AI` path segment via `segments.includes("Hedy-AI")`, which is agnostic to how deep that segment sits — the nested path still satisfies it.

## Implementation Units

### U1. Update Hedy-AI scan root path

**Goal:** Point the scanner at the real, current location of the Hedy-AI folder.

**Requirements:** R1, R3

**Dependencies:** none

**Files:**
- `src/lib/dashboard/insight-sources.ts`
- `src/lib/dashboard/insight-sources.test.ts`

**Approach:** Change the `ALLOWED_ROOTS` array entry from `"Hedy-AI"` to `"z.Ingestion/Hedy-AI"`. No other logic changes — `walkMarkdownFiles` and `shouldExcludeInsightSourcePath` are already path-shape-agnostic.

**Patterns to follow:** Existing `ALLOWED_ROOTS` entries already use `z.Ingestion/<subfolder>` shape (e.g., `"z.Ingestion/read.done"`); this brings `Hedy-AI` in line with that convention instead of being the only bare top-level entry.

**Test scenarios:**
- Happy path: update the existing test fixture in `insight-sources.test.ts` so the sample vault tree places `Hedy-AI` under `z.Ingestion/Hedy-AI` instead of directly under the vault root, and confirm `collectInsightSourceFiles` still returns its markdown files.
- Existing exclusion test: `shouldExcludeInsightSourcePath("/vault/Hedy-AI/transcript 2026-05-19.md")` should be updated to `/vault/z.Ingestion/Hedy-AI/transcript 2026-05-19.md` and still assert `true`.
- Regression: confirm the other four scan roots (`Clippings`, `Official Docs`, `People`, `personal.Spaces`, `read.done`) are untouched and their existing tests still pass.

**Verification:** `insight-sources.test.ts` passes with the fixture tree matching the real on-disk nested layout; `collectInsightSourceFiles` no longer depends on the `AI-Vault/Hedy-AI` compatibility symlink to find Hedy-AI notes.

## Scope Boundaries

**In scope:** the single `ALLOWED_ROOTS` path string and its corresponding test fixtures/assertions.

**Out of scope:** re-running `npm run generate:insights` to regenerate `src/lib/dashboard/insights.generated.json` (manual, human-reviewed step per the existing convention — not part of this code change); removing the compatibility symlink at `AI-Vault/Hedy-AI` (that's vault housekeeping, not repo code, and outside this plan).

## Verification

- `insight-sources.test.ts` passes.
- Manually confirm (outside CI, per existing convention) that running the generator against the real vault root picks up Hedy-AI notes without relying on the old symlinked path.
