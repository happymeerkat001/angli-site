---
title: Replace the mobile circular hamburger navigation with direct links
type: refactor
date: 2026-07-20
origin: user feedback on the mobile Personal/dashboard navigation
---

## Summary

Replace the phone-only circular hamburger control with the same direct navigation links used on desktop. On narrow screens, the links will remain in one horizontally scrollable row beside the Ang Li home link. This removes the extra interaction required to reach Personal while retaining the site's existing route list, active-state treatment, privacy behavior, and desktop presentation.

---

## Problem Frame

The current mobile navigation hides all site links behind a filled circular hamburger button. Reaching the private Personal dashboard therefore requires opening a menu before selecting Personal. The control is also visually inconsistent with the user's preferred navigation experience.

The repository already contains an uncommitted direction that replaces the stateful menu with a horizontally scrollable direct-link row. This plan formalizes and verifies that direction rather than introducing a competing menu pattern.

---

## Requirements

R1. On phone-width viewports, show all existing primary navigation destinations directly without a hamburger trigger or an expand/collapse interaction.

R2. Keep the home link and the six current destinations unchanged: HT101, Projects, Real Estate, About, Book, and Personal.

R3. Preserve route-specific behavior: HT101 and Personal must continue to opt out of Next.js link prefetching.

R4. Keep active-route semantics and visual distinction through `aria-current="page"` and the existing accent treatment.

R5. Preserve the existing desktop navigation layout and visual language.

R6. Make the phone-width link row usable without page-level horizontal overflow: links must not shrink unreadably, and overflow must be horizontally scrollable with no visible scrollbar.

R7. Do not change `/personal`, its authentication middleware, dashboard content, public-page content, or navigation labels as part of this work.

---

## Key Technical Decisions

### D1. Use a direct, horizontally scrollable link row on mobile

Use the existing `links` collection for every viewport rather than duplicating it into a menu-specific render branch. This gives Personal a one-tap path while keeping every route in one source of truth. Horizontal scrolling is preferable to reducing label size or wrapping the fixed header into multiple lines, both of which would weaken readability and make the header height unpredictable.

### D2. Remove menu state and icon dependencies rather than visually hiding them

The mobile menu's open/close state and Lucide menu/close icons become unused when links are always visible. Removing the stateful branch prevents inaccessible or dead controls from remaining in the component and reduces client-side behavior to route-aware active styling.

### D3. Retain protected-route prefetch opt-out at the data definition

`prefetch: false` remains attached to HT101 and Personal in `links` and is passed to each rendered `Link`. This maintains the established intentional-navigation behavior for protected routes without special cases between mobile and desktop.

---

## High-Level Technical Design

`Nav` remains a client component because it reads the current pathname. The component renders one fixed navigation shell containing the home link and a flex row generated from the existing `links` array. Responsive utility classes make the container slightly more compact on phones, prevent individual destination links from shrinking, and allow the row to scroll within its own width. No route, middleware, API, or dashboard changes are needed.

---

## Implementation Units

### U1. Consolidate mobile and desktop navigation into an always-visible responsive link row

Goal: Remove the circular mobile menu interaction and make all primary destinations, including Personal, directly reachable on phone-width screens.

Requirements: R1, R2, R3, R4, R5, R6.

Dependencies: None.

Files:
- `src/components/Nav.tsx`
- Test path: no automated component-test path is currently available; `vitest.config.ts` is node-only and includes only `*.test.ts`. Validate this presentational interaction through the viewport scenarios below rather than adding a UI-testing stack for this bounded refactor.

Approach:
- Keep `links` as the sole route definition and continue deriving the active link from `usePathname`.
- Replace the breakpoint-separated desktop row and conditional mobile panel with one flex row that is visible at all widths.
- Remove the menu toggle button, the open-state branch, the React state import, and Lucide menu/close imports.
- Make the navigation shell and link spacing compact on phones while preserving its current rounded desktop proportions at the small breakpoint and above.
- Ensure the home link does not compress, link pills retain their readable intrinsic width, and only the link row—not the document—scrolls horizontally on narrow viewports.
- Preserve the existing label text, destination order, `prefetch` values, active styling, and `aria-current` behavior.

Patterns to follow:
- Reuse the existing Tailwind utility-first styling in `Nav.tsx`; do not add global CSS for a component-local layout concern.
- Continue mapping `links` once and use the existing `isActive` expression for semantic and visual active states.
- Keep the fixed header and current color tokens (`ink`, `accent`, `line`, `paper`) rather than introducing a new visual system.

Test scenarios:
- At a narrow phone viewport, confirm there is no circular hamburger, no menu dialog/panel, and no second tap required before selecting Personal.
- At the narrowest supported viewport, confirm Ang Li remains visible; every destination pill remains legible; the destination row can scroll horizontally; and the document itself has no horizontal overflow.
- Visit `/personal` from the row and confirm the Personal pill has `aria-current="page"` and the browser still receives the existing dashboard authentication challenge when credentials are absent.
- Visit `/ht101` from the row and confirm its protected-route behavior remains unchanged.
- At tablet and desktop widths, confirm the full row fits normally, preserves the existing rounded navigation treatment, and displays the active route in the accent treatment.
- Confirm only HT101 and Personal retain disabled Next.js prefetch behavior.

Verification:
- TypeScript completes without unused-import or JSX type errors.
- The production build completes successfully.
- The full existing test suite remains green.
- Manual responsive checks satisfy every scenario above on a real browser or device emulation.

---

## Scope Boundaries

Included:
- The shared navigation component's phone and desktop layout behavior.
- Removal of the mobile hamburger interaction and its unused dependencies.
- Responsive and accessibility verification for current links.

Excluded:
- Renaming, reordering, adding, or removing navigation destinations.
- Changes to Personal dashboard data, its Basic Authentication, or its URL.
- Changes to HT101 protection, site middleware, sitemap/robots policy, footer links, page copy, or global styling.
- Introducing a new component test framework for this single layout refactor.

---

## Risks and Dependencies

The primary risk is a constrained phone viewport causing the fixed header to overflow the document rather than the link row. The implementation must constrain overflow to the link container and retain nonshrinking labels. Another risk is accidentally removing `prefetch: false` while consolidating rendering; the two protected route entries must remain unchanged.

The plan assumes the existing uncommitted `Nav.tsx` changes are the intended in-progress implementation of this chosen direct-link design. The executor should preserve unrelated user changes and reconcile rather than overwrite that work.

---

## Sources and Research

- `src/components/Nav.tsx`: current routes, protected-route prefetch settings, active state, and existing menu implementation.
- `src/app/layout.tsx`: shared fixed header placement and page top spacing.
- `src/middleware.ts`: `/personal` and `/ht101` protection boundaries.
- `vitest.config.ts` and `src/lib/dashboard/*.test.ts`: current node-only test posture.
- Commit `dab0d33`: prior mobile visibility and active-state changes.
- Live `https://www.angli.site/`: current desktop navigation structure.
