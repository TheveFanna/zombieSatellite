# Implementation Plan: small-phone layout, AR permissions and story (S11)

Ground rules: one commit per task after its tests pass, then push at once. Guards and tools get the simplest sufficient check.

- [x] 1. Global cleanup and Planner page
  - [x] 1.1 Remove dashed borders on `label`, `dt`, `dd`, `main > dl` and `label + label` in `globals.css`. Give `.card` an inset certificate frame with a faint pattern, and remove its corner ticks.
    - _Requirements: 1.4, 5.3_
  - [x] 1.2 Rewrite `src/app/planner/[noradId]/page.tsx`: header with name and two actions; a segmented minimum-elevation control; the Pass_List of compact rows; the pass details in `ConsoleSheet`. Keep every existing action (calendar, copy, CSV, ground track).
    - _Requirements: 1.3_
  - [x] 1.3 Run `pnpm test`, `pnpm typecheck`, `pnpm run build`.
  - [x] 1.4 Main agent: commit by name, then push.

- [ ] 2. AR tab
  - Depends on: task 1.
  - [ ] 2.1 Rewrite `ar-tab.tsx` with the fixed layout, always-mounted video with explicit play, the Permission_Gate, the horizon fallback, the Settings_Sheet and the Story_Card.
    - _Requirements: 1.1, 1.2, 2.1 to 2.4, 3.1 to 3.3, 6.1, 6.2, 7.1, 7.2_
  - [ ] 2.2 Add `ruler.tsx`, `ar-settings.tsx`, `story-card.tsx`; rewrite `satellite-wheel.tsx` (tall stacked cards, rise animation, certificate design); replace the AR CSS block.
    - _Requirements: 4.1 to 4.3, 5.1 to 5.3_
  - [ ] 2.3 Run `pnpm test`, `pnpm typecheck`, `pnpm run build`.
  - [ ] 2.4 Main agent: commit by name, then push.

- [ ] 3. Story links
  - Depends on: task 2.
  - [ ] 3.1 Give each archive article an id equal to its slug; add a story link to each Pass_List row on the Passes page.
    - _Requirements: 7.2_
  - [ ] 3.2 Run `pnpm test`, `pnpm typecheck`, `pnpm run build`.
  - [ ] 3.3 Main agent: commit by name, then push.

- [ ] 4. Owner review on a real phone (executed by the owner)
  - Depends on: task 3, with its push deployed.
  - [ ] 4.1 Present the checklist: the AR camera picture; one tap for both permissions; the rulers; the wheel rise animation; the settings sheet; the story card; the Passes and Planner layouts on a small phone. Record only the owner's words.
    - _Requirements: 1.1 to 7.2_
    - Not yet reported: every item.
