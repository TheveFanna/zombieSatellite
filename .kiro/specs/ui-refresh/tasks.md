# Implementation Plan: UI refresh (S10)

Ground rules: one commit per task after its tests pass, then push at once; never push in the middle of a task. Guards and tools get the simplest sufficient check.

- [x] 1. Visibility_Bar and FOV slider on the AR tab
  - [x] 1.1 `hourTicks` gives one tick per whole UTC hour with `HH` labels; update the example case in `tests/field/ar-tab.test.ts`. Rewrite `src/components/ar/visibility-bar.tsx` with the head row, the track, NOW and SAT markers and the hour row. Compute NOW, SAT and the texts in `ar-tab.tsx`. Replace the FOV buttons with the slider.
    - _Requirements: 3.1 to 3.4, 4.1 to 4.3_
  - [x] 1.2 Run `pnpm vitest run tests/field`, `pnpm typecheck`.
  - [x] 1.3 Main agent: commit by name, then push.

- [x] 2. Satellite_Wheel and AR layout
  - Depends on: task 1.
  - [x] 2.1 Add `src/components/ar/satellite-wheel.tsx` (arc placement, drag and tap). Move the readouts below the wheel and the calibration and sensor controls into the bottom panel. Add the `satellite-wheel.tsx` file to the scaffold list.
    - _Requirements: 2.1 to 2.3, 1.2, 1.3_
  - [x] 2.2 Run `pnpm test`, `pnpm typecheck`, `pnpm run build`.
  - [x] 2.3 Main agent: commit by name, then push.

- [x] 3. Visual tokens
  - Depends on: task 2.
  - [x] 3.1 Apply the radius, material and touch-size tokens to panels, cards, buttons, the tab bar and the sheet in `globals.css`.
    - _Requirements: 1.1 to 1.3_
  - [x] 3.2 Run `pnpm test`, `pnpm run build`.
  - [x] 3.3 Main agent: commit by name, then push.

- [x] 4. Archive page and home split
  - Depends on: task 3.
  - [x] 4.1 Move the catalog list to `src/components/catalog/catalog-list.tsx`, add `src/app/catalog/page.tsx`, remove the list from `LandedHome`, add the Archive link. Add `/catalog` to the service worker and bump the cache name. Update the scaffold lists.
    - _Requirements: 5.1, 5.2, 5.6_
  - [x] 4.2 Run `pnpm test`, `pnpm typecheck`, `pnpm run build`.
  - [x] 4.3 Main agent: commit by name, then push.

- [x] 5. Passes page
  - Depends on: task 4.
  - [x] 5.1 Rewrite `src/app/session/page.tsx` as the observer block and one compact row per satellite, with open session and plan actions. Drop the pass profile and the guide link from this page.
    - _Requirements: 5.3, 5.4_
  - [x] 5.2 Run `pnpm test`, `pnpm typecheck`, `pnpm run build`.
  - [x] 5.3 Main agent: commit by name, then push.

- [ ] 6. Owner review on a real phone (executed by the owner)
  - Depends on: task 5, with its push deployed.
  - [ ] 6.1 Present the checklist: the wheel swipes and rotates; the bar shows 24 hour labels, NOW and SAT; the FOV slider; the home, Passes and Archive have separate jobs; the corners and surfaces look as intended. Record only the owner's words.
    - _Requirements: 1.1 to 5.6_
    - Not yet reported: every item.
