# Implementation Plan: AR tab (S9)

Ground rules: one commit per task after its tests pass, then push at once; never push in the middle of a task. Guards and tools get the simplest sufficient check. When the design is not enough, stop and ask.

- [x] 1. Field_Core: ring, blend, guide angle, star field, visibility bar
  - [x] 1.1 Add `src/lib/field/orbit-ring.ts`, `src/lib/field/visibility-bar.ts`, and `guideAngleRad`, `starField`, `projectStars` in `src/lib/field/ar.ts`; export them from `src/lib/field/index.ts`. Add `RING_STEPS` (180), `RING_REFRESH_MS` (5000), `RING_MORPH_MS` (600) and `STAR_COUNT` (300) to `constants.ts`.
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 5.1, 5.4, 7.2, 8.2, 10.1_
  - [x] 1.2 Add `tests/field/ar-tab.test.ts` with the seven example cases of design "Tests". Run `pnpm vitest run tests/field`.
    - _Requirements: 10.2_
  - [x] 1.3 Main agent: commit by name, then push.

- [x] 2. AR_Tab page: route, Tab_Bar entry, scene, switcher, guide, readouts
  - Depends on: task 1.
  - [x] 2.1 Add `src/app/ar/page.tsx`, `src/components/ar/ar-tab.tsx`, `src/components/ar/ar-scene.tsx`; add `navAr` to `SHELL_COPY`, the `Link` to `layout.tsx`, the `.tab-ar` icon and active selectors to `globals.css`, `'/ar'` to `SHELL_DOCUMENTS` in `public/sw.js` with `CACHE` bumped to `v2`. Update the lists of check 1.19 in `tests/scaffold/scaffold.test.ts`. Behaviour per Requirements 1, 2, 3, 4, 5, 6 and 9.
    - _Requirements: 1.1 to 1.5, 2.1 to 2.4, 3.1 to 3.4, 4.3, 5.1 to 5.4, 6.1 to 6.4, 9.1 to 9.3_
  - [x] 2.2 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
  - [x] 2.3 Main agent: commit by name, then push.

- [ ] 3. Visibility bar and Sky_Slider
  - Depends on: task 2.
  - [ ] 3.1 Add `src/components/ar/visibility-bar.tsx`; wire the bar, its text, the slider and the Night_Sky stars into `ar-tab.tsx` and `ar-scene.tsx`. Add `components/ar/visibility-bar.tsx` to the check 1.19 list.
    - _Requirements: 7.1 to 7.4, 8.1 to 8.4_
  - [ ] 3.2 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
  - [ ] 3.3 Main agent: commit by name, then push.

- [ ] 4. Review items for the project owner on a real phone (executed by the owner)
  - Depends on: task 3, with its push deployed.
  - [ ] 4.1 Present this checklist and record the owner's report per item, never assuming an outcome: the AR tab opens in one tap from the bottom bar; the camera starts; the dot is visible below the horizon and moves; the ring is a near-closed loop with solid and dashed parts; the guide arrow turns toward the satellite and becomes a faint circle when aimed; switching a satellite morphs the ring; the 24-hour bar and its text; the slider from the camera to the night sky.
    - _Requirements: 10.4_
    - Not yet reported: every item.
