# Refresh buttons give no visual feedback

## Context

The three refresh buttons on `/personal` (Refresh headlines, Refresh analysis, Refresh flights — `src/app/personal/page.tsx` lines 63, 88, 114) do work: each is a plain `<form action={refreshX}>` wrapping a submit button, and `src/app/personal/actions.ts` calls `revalidateTag(...)` server-side for `"news"`, `"stock-analysis"`, and `"flights"` respectively. Submitting the form re-renders the page with freshly fetched data.

The bug report ("cursor doesn't change to hand", "nothing seems to happen on click") is a UX gap, not a broken action:

- No `cursor-pointer` class on any of the three buttons. Tailwind v4's preflight sets `button { cursor: default }` — the pointer cursor is opt-in, not automatic like older Tailwind/browser defaults.
- No hover state — same `bg-accent` before and during hover, no visual affordance that it's clickable.
- No pending/loading feedback during the request. Server Actions triggered from a `<form action={...}>` do a soft navigation while the server re-fetches and `revalidateTag` invalidates the cache, but nothing on screen indicates a request is in flight. If the refreshed data happens to be unchanged (e.g., same headlines, same flight price), the page looks identical before and after, reinforcing the "did that even work?" impression.

Confirmed via code read: no existing usage of `useFormStatus` anywhere in the codebase, and `cursor-pointer` is not applied to these buttons (it is used elsewhere, e.g. `src/components/Nav.tsx`, confirming the project already has the convention available, just not applied here).

## Approach

### 1. Shared pending-aware refresh button component

New file `src/components/RefreshButton.tsx` (client component, `"use client"`): a small button that reads submission state via `useFormStatus` (from `react-dom`) and renders:
- Default: the given label, `cursor-pointer`, `hover:bg-accent/90` (or similar darkening) for visible hover affordance
- Pending (`pending === true`): label swaps to `"Refreshing…"`, button gets `disabled` and `cursor-wait`/`opacity-70`, so a click always produces an immediate, visible state change regardless of whether the underlying data ends up different

`useFormStatus` only reports pending state for the nearest enclosing `<form>`, so this component must be rendered *inside* each `<form action={refreshX}>` in `page.tsx` — it does not need the action passed in.

### 2. Wire into the three refresh forms

`src/app/personal/page.tsx`: replace each of the three `<button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">Refresh X</button>` (lines 63, 88, 114) with `<RefreshButton label="Refresh headlines" />` (and analogous labels for analysis/flights), keeping the existing `<form action={refreshX}>` wrapper unchanged. Import `RefreshButton` from `@/components/RefreshButton`.

No changes to `src/app/personal/actions.ts` or any `next: { tags: [...] }` fetch config — the refresh mechanism itself is already correct; this is presentation-only.

### Tests

- `src/components/RefreshButton.test.tsx` (new): render inside a `<form>`, assert default state shows the label with `cursor-pointer` class and is not disabled; mock `react-dom`'s `useFormStatus` to return `{ pending: true }` and assert the button shows "Refreshing…", is disabled, and no longer has `cursor-pointer`.

## Verification

- `npm run typecheck` · `npm test` · `npm run build`
- Manual: load `/personal`. Hover each of the three refresh buttons — cursor should show a hand and the button should visibly darken/highlight. Click each — button should immediately switch to a disabled "Refreshing…" state, then return to normal once the server response lands, even when the underlying data (headlines/analysis/flight price) is unchanged.
