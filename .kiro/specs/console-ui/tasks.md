# Implementation Plan: console-ui (S8)

## Overview

Build S8 exactly as specified in `design.md`, in the delivery order of Requirement 15: Must (Console_Lib with the Meter_Level mapping, Alignment_Meter, Radar_Panel, Session_Console main area), then Should (Countdown_Ring and timeline, Console_Sheets and Console_Tabs, S7 panels behind the dock, Satellite_Dial with home controller, Console_Home on a preview URL, touch and motion, then the switch of `/` to the Console_Home), then Could (Pass_Strip, Compact_Controls on the Console_Home), then the project owner's acceptance on a real phone (Requirement 16). The bottom navigation is dropped (Requirement 9.1, Decision OQ-E). Language: TypeScript (strict, ES modules); tests in Vitest, `node` environment.

Ground rules for the implementer:

- `requirements.md` and `design.md` in this folder are the specification. Read the design sections named in each sub-task before writing code. Do not deviate from the file layout, names, signatures, constants, keys and decisions C1 to C13 and the decided points given there. Where design.md and requirements.md differ, requirements.md wins. If design.md seems insufficient, stop and ask instead of extending scope.
- Decided points of the design review (design "Decided points"): the home preview before the switch is a temporary `?console=1` client wrapper (`src/components/console/console-preview.tsx`) that is deleted in task 11; the Satellite_Dial is the draggable circular dial with tap and previous/next buttons always available; Pass_Strip marks beyond the next pass show details plus a one-line note only, and the session controller is NOT changed to start a later pass.
- Tests: only the named ones. The automated tests are exactly the three rows of design "Testing Strategy > The automated tests": `tests/console/meter.test.ts` (task 1), `tests/console/source-boundary.test.ts` with `tests/helpers/console-source-scan.ts` (task 1) and the extended `tests/scaffold/scaffold.test.ts`. No other test, no property test, no scanner self-test, no negative instrumentation, no DOM environment, no React testing library, no test for the ring, strip or dial functions, no experiment or extra verification. Everything else is checked by review and by the owner on a real phone (task 14). Follow the design's stated plan and stop to ask when it seems insufficient.
- Honesty_Scan (checks 1.24 and 1.25): every new string, new `.tsx` file and changed copy is covered. If a string fails the scan, reword the string. Never weaken, loosen, skip or special-case the scan or any existing assertion; scaffold changes are extensions by explicit file name only.
- Copy: every new string comes from `CONSOLE_COPY` (`src/components/console/copy.ts`) or from the landed `SESSION_COPY`, `SHELL_COPY` and `FIELD_COPY`, as plain string literals as direct property values, under the wording rules of design "Console copy" (radio term with a simulated or synthesized qualifier, no reception word paired with a radio term, the meter says "aim" and "pointing", never "signal strength", no URLs inside scanned strings).
- Do not modify `src/lib/orbit`, `src/lib/pointing`, `src/lib/session`, `src/lib/shell`, `src/lib/catalog`, `src/lib/field`, `src/lib/qsl`, `src/components/shell/visuals/sky-dome.tsx`, `src/components/field/planner-controller.ts`, `src/app/layout.tsx`, `public/sw.js`, or any existing test file other than `tests/scaffold/scaffold.test.ts`. The permitted edits of landed files are the rows of design "Landed files changed".
- `next.config.ts` is never edited and never staged. It may carry a developer's uncommitted edit; leave it as it is.
- No new package; `package.json` and `pnpm-lock.yaml` stay unchanged; `satellite.js` stays 6.0.2; no WebGL; all times UTC through `formatUtc`; lock tolerance stays 10°.
- Imports: inside `src/lib/console` only relative paths inside that directory plus the `index` barrels of `pointing` and `orbit` (design C1). Elsewhere relative paths (no `@/` alias). Tests import the Console_Lib only through `src/lib/console/index`.
- Every task leaves the tree buildable and coherent: `pnpm test`, `pnpm typecheck` and `pnpm run build` pass at the end of every task (Requirement 14.6, 15.3). Test command: `pnpm vitest run <paths>`; full suite: `pnpm test`. Until task 11, `/` is the landed S7 Home_Page. The Session_Console replaces the session screen in place from task 4, and the S7 panels stay on it as landed until task 7.
- Scaffold checks: tasks that add files extend `tests/scaffold/scaffold.test.ts` by explicit file name, and each such task lists its enumerations. The end state is the one of design "Scaffold check changes": check 1.19 directory listing and the `.ts` list under `src/app` unchanged, the `.tsx` inventory plus the eleven console entries (`alignment-meter`, `console-home`, `console-sheet`, `console-tabs`, `countdown-ring`, `pass-strip`, `pass-timeline`, `radar-panel`, `satellite-dial`, `session-console`, `story-panel`), and checks 1.24 and 1.25 `checkedTexts()` plus the console copy group and the `CONSOLE_COMPONENTS` rendered-JSX group. The temporary `console-preview.tsx` is added to the `.tsx` inventory and to `CONSOLE_COMPONENTS` in task 9 and removed from both in task 11.
- Commit and push: the main agent commits locally once per top-level task, after that task's tests, `pnpm typecheck` and `pnpm run build` pass, staging files by name (never `git add -A` or `git add .`), then pushes immediately. Never push in the middle of a task. Commit message style: `feat(console): <summary> (S8 task N)`, `docs(console): ...` or `test(console): ...`.
- Execution is serial by default; each task depends on the one before it. Parallelism is marked only where the files are disjoint: sub-tasks 6.1 and 6.2, and sub-tasks 8.2 and 8.3. At most 2 to 3 sub-agents run at once; sub-agents write code and run their own sub-task's tests only; the main agent edits shared files (`index.ts`, `copy.ts`, `globals.css`, `scaffold.test.ts`) and commits and pushes serially after they return.
- Task 14 is executed by the project owner. The agent presents the checklist and records the owner's reports. The agent never runs, assumes, infers or fabricates a phone outcome.
- README, Devpost and video-script changes for the console UI are not a task of this spec: requirements.md does not require them. They belong to the S6 Final_Submission_Checklist, which runs after this spec lands (Requirement 16.3).

## Tasks

- [ ] 1. Console_Lib foundation: Meter_Level mapping and its guards
  - Depends on: nothing (first task).
  - [x] 1.1 Create `src/lib/console/meter.ts` and `src/lib/console/index.ts`
    - Per design "Alignment meter" and C1, C2: `METER_CLOSING_DEG` (30), `METER_FAR_DEG` (90), types `MeterBand` and `MeterLevel`, `meterLevel(pointingErrorDeg, toleranceDeg)` with the rules of the design (`null`, `NaN` or negative: level 0, unavailable; at most the tolerance: level 1, locked; otherwise linear to 0 at 90°, band closing up to 30°, else far). `index.ts` is the only entry file and the barrel of every name above. Imports: relative paths inside the directory only (the `pointing` constant is passed in by callers).
    - _Requirements: 2.2, 2.4, 3.1, 3.2_
  - [x] 1.2 Create `tests/helpers/console-source-scan.ts` and the two tests
    - `console-source-scan.ts`: a copy of `tests/helpers/field-source-scan.ts` with root `src/lib/console`, allowed outside files the `index` barrels of `pointing` and `orbit`, and the forbidden-global and forbidden-call checks of design C1 (including `Date.now`).
    - `tests/console/source-boundary.test.ts`: the cases of design "Testing Strategy" (`index.ts` is the only entry; no import outside the allow-list; no forbidden global).
    - `tests/console/meter.test.ts`: the five pinned inputs of design "Alignment meter" with tolerance 10: 0 gives level 1 locked; 10 gives level 1 locked; 50 gives level 0.5 far; 180 gives level 0 far; `null` gives level 0 unavailable.
    - Run both files and `pnpm typecheck`.
    - _Requirements: 2.5, 3.3, 14.5_
  - [x] 1.3 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. The scaffold test needs no change in this task (no `.tsx`, route or copy module is added).
    - _Requirements: 14.6_
  - [x] 1.4 Main agent: commit staging `.kiro/specs/console-ui/.config.kiro`, `requirements.md`, `design.md`, `tasks.md`, `src/lib/console/meter.ts`, `src/lib/console/index.ts`, `tests/helpers/console-source-scan.ts`, `tests/console/source-boundary.test.ts` and `tests/console/meter.test.ts` by name, then push.

- [ ] 2. Console copy, frame throttle and Alignment_Meter component
  - Depends on: task 1.
  - [x] 2.1 Create `src/components/console/copy.ts` and `src/components/console/frame-throttle.ts`
    - `CONSOLE_COPY` as `Object.freeze({...})` with the header comment of S6 about checks 1.24 and 1.25 and the meter and radar groups of design "Console copy" (title `Aim`, caption, the four band labels, behind text, enable-sensors text, radar empty text). Later tasks append their own groups.
    - `throttleSubscribe` per design "Frame throttle" with the injected `FrameScheduler` and `Clock`, 33 ms minimum interval, pending frame cancelled on unsubscribe.
    - _Requirements: 5.5, 11.3, 12.2, 12.3_
  - [x] 2.2 Create `src/components/console/alignment-meter.tsx`
    - Props `{ errorDeg, locked, behind }` per design "Alignment meter": 240° arc gauge, fill by `meterLevel(errorDeg, LOCK_TOLERANCE_DEG).level`, error in degrees in monospace at the centre, band label and arc style (solid, dashed, dotted) so colour is never the only cue, locked band shown whenever `locked` is true, the 120 ms `stroke-dashoffset` transition. No timers, no state beyond props. Append the `.meter*` classes to a new "Console" block at the end of `src/app/globals.css`, with controls at least 44 × 44 CSS pixels where interactive.
    - _Requirements: 2.1, 2.3, 2.6–2.8, 11.1, 11.4, 12.2_
  - [x] 2.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/alignment-meter.tsx` (test title names the console components); checks 1.24 and 1.25 `checkedTexts()` gains `['console copy strings', propertyStrings('src/components/console/copy.ts')]` and the rendered-JSX group gains a `CONSOLE_COMPONENTS` constant holding that file by name. Directory listing and `.ts` list unchanged. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 14.1–14.3, 14.6_
  - [x] 2.4 Main agent: commit staging `src/components/console/copy.ts`, `src/components/console/frame-throttle.ts`, `src/components/console/alignment-meter.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 3. Radar_Panel
  - Depends on: task 2.
  - [x] 3.1 Export `SkyTrackLayer` from `src/components/field/visuals/sky-track.tsx`
    - Per design "Landed files changed": export the path and shadow drawing as `SkyTrackLayer`, a layer inside an existing `<svg>`; `SkyTrackView` renders it and its markup stays unchanged.
    - _Requirements: 5.1, 5.3, 13.1_
  - [x] 3.2 Create `src/components/console/radar-panel.tsx`
    - Props as design "Radar panel": `DomeFrame`, `DOME_RADIUS`, `DOME_VIEWBOX`, `domePoint`, `domeRadius`; `SkyTrackLayer` for the path and shadow segments; satellite dot, AOS/peak/LOS marks, pointing reticle, Lock_Ring of radius `domeRadius(LOCK_TOLERANCE_DEG)`, `<g className="radar-sweep">` rotated by a CSS `@keyframes` of 8 s per turn, the `emptyText` empty state (nothing invented). Optional pointer handlers on the element for the drag surface with `touch-action: none`. Append `.radar*` classes to the "Console" block of `src/app/globals.css`, including `[data-ar-open] .radar-sweep { animation-play-state: paused }`.
    - _Requirements: 5.1–5.4, 5.6, 11.2, 11.3_
  - [x] 3.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/radar-panel.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 gains it by name. `sky-track.tsx` is already covered by `FIELD_COMPONENTS`. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 14.1–14.3, 14.6_
  - [x] 3.4 Main agent: commit staging `src/components/field/visuals/sky-track.tsx`, `src/components/console/radar-panel.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 4. Session_Console main area (in place)
  - Depends on: task 3.
  - [x] 4.1 Create `src/components/console/session-console.tsx` and wire it into the session page
    - Layout of design "Session console layout" for the `awaiting-pass`, `in-pass` and `completed` phases: header, radar with the meter overlaid in `in-pass`, Lock badge, Doppler figure through `formatDopplerReadout` (or the landed No_Frequency_Note), the S6 `DopplerDial` with `SHELL_COPY.dialCaption`, AR_Entry as a large button calling the page's `openAr()`, the simulated-beacon label and the landed shadow-silence note. The lock source is chosen as in design "Pointing_Error source": the pointing snapshot lock for real time with the sensor source, the session snapshot lock otherwise, `null` in `awaiting-pass` or when orbit data is missing. The "Enable motion sensors" button keeps the landed synchronous `pointing.requestPermission()` call. Meter and radar subscribe to the pointing session through `throttleSubscribe`. In `awaiting-pass` the countdown is the `formatCountdown` text for now (the ring comes in task 5). The `completed` phase keeps the landed result view and QSL entry in the same layout classes.
    - `src/app/session/[noradId]/page.tsx`: controller creation and effects stay; the rendered body of the three phases is replaced by `SessionConsole`; `data-ar-open` is set on the console root while the AR_View is open; the `selecting` block stays. The S7 panels, the Controls content (observer fields, sound, abort, drag compass, calibration, Sky_View) and the dock stay as landed below the new main area until task 7. Append the session-console layout classes to the "Console" block of `src/app/globals.css` (First_Screen budget of design: header 44 px, radar 250 px, ring row 56 px, AR_Entry 56 px).
    - _Requirements: 2.1, 2.3, 2.4, 4.1–4.7, 5.2, 11.1, 12.1, 13.2_
  - [x] 4.2 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/session-console.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 gains it by name. The changed session page is already covered by `SESSION_PAGES`. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 14.1–14.3, 14.6_
  - [x] 4.3 Main agent: commit staging `src/components/console/session-console.tsx`, `src/app/session/[noradId]/page.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push. The Must tier is complete here.

- [x] 5. Countdown_Ring and pass timeline
  - Depends on: task 4.
  - [x] 5.1 Create `src/lib/console/ring.ts`; extend `index.ts` and `copy.ts`
    - `RING_LEAD_MS` (30 min), `RING_NEAR_MS` (5 min), `countdownRingFraction`, `remainingRingFraction`, `ringIsNear` per design "Countdown ring and timeline"; pure, no clock read. `CONSOLE_COPY` gains the ring group (to AOS, AOS soon, to LOS, in pass now, calculating, no pass in 48 h).
    - _Requirements: 6.3, 6.4_
  - [x] 5.2 Create `src/components/console/countdown-ring.tsx` and `pass-timeline.tsx`; wire them
    - `CountdownRing`: `stroke-dasharray` fill, `formatCountdown` text inside, caption; near AOS the stroke changes from solid to dashed and the caption changes (not colour alone); in `in-pass` it shows `remainingRingFraction` with "to LOS". `PassTimeline`: thin rule with AOS, peak and LOS marks placed by the peak share, UTC times from `formatUtc(ms).slice(11, 19)`, and a moving tick for the current instant. Mount both in `session-console.tsx` (awaiting-pass and in-pass). Append `.ring*` and `.timeline*` classes to the "Console" block of `src/app/globals.css`.
    - _Requirements: 4.2, 6.1–6.3, 11.2_
  - [x] 5.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/countdown-ring.tsx` and `components/console/pass-timeline.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 gains the same two files by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 14.1–14.3, 14.6_
  - [x] 5.4 Main agent: commit staging `src/lib/console/ring.ts`, `src/lib/console/index.ts`, `src/components/console/copy.ts`, `src/components/console/countdown-ring.tsx`, `src/components/console/pass-timeline.tsx`, `src/components/console/session-console.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 6. Sheet and tab primitives, `sections` prop and story panel
  - Depends on: task 5.
  - [x] 6.1 Create `src/components/console/console-sheet.tsx` and `console-tabs.tsx` (parallel with 6.2; disjoint files, no edit of `copy.ts`, `globals.css` or `scaffold.test.ts`)
    - `ConsoleSheet` per design "Sheets and tabs": native `<dialog>` with `showModal()` and `close()`, `onClose` from the `close` event, 44 × 44 close button, children mounted only while open, progressive inline fallback when `HTMLDialogElement` is unsupported. `ConsoleTabs`: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving `tabindex`, Left/Right/Home/End keys, `role="tabpanel"`. Strings come as props or from `CONSOLE_COPY` keys the main agent adds before dispatch (close label, sheet titles, tab labels).
    - _Requirements: 10.3, 10.4, 11.1_
  - [x] 6.2 Add the `sections` prop to `src/components/field/session-panel.tsx` and create `src/components/console/story-panel.tsx` (parallel with 6.1; disjoint files)
    - `FieldSessionPanel`: one optional `sections?: ReadonlyArray<'overview' | 'tuning' | 'minutes' | 'map' | 'links'>`, default all five, rendering exactly what it renders today when omitted (design C11 and "Re-hosting the S7 panels").
    - `story-panel.tsx`: the markup of the landed `EntryArticle` (story, history, sources, lifeline, Model_Viewer and its download, landed unplayable reason) copied from `src/app/page.tsx` as a presentational component with links unchanged. The original in `page.tsx` stays untouched until task 11.
    - _Requirements: 1.3, 1.4, 10.5, 10.6, 13.2_
  - [x] 6.3 Main agent: append the sheet, tab and dock string groups to `src/components/console/copy.ts` (close label, sheet titles, tab labels) and the `.sheet*` and `.tabs*` classes to the "Console" block of `src/app/globals.css`, then extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/console-sheet.tsx`, `components/console/console-tabs.tsx` and `components/console/story-panel.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 gains the same three files by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 14.1–14.3, 14.6_
  - [x] 6.4 Main agent: commit staging `src/components/console/console-sheet.tsx`, `src/components/console/console-tabs.tsx`, `src/components/console/story-panel.tsx`, `src/components/console/copy.ts`, `src/components/field/session-panel.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 7. Session dock: S7 panels behind sheets and tabs
  - Depends on: task 6.
  - [x] 7.1 Add the dock and sheets to `session-console.tsx` and remove the landed panels from the page
    - Dock of design "Session console layout": Tuning, Passes, Guide, Map, Story and Controls, each 44 px or larger and one tap from the First_Screen. Tuning sheet: `ConsoleTabs` "Tuning" and "Minutes" hosting `FieldSessionPanel` with `sections` (overview and tuning; minutes), mounted only while open. Map sheet: `GroundTrackMap` unchanged. Passes and Guide sheets: the links to `/planner/[noradId]` and `/guide/[noradId]` only. Story sheet: `story-panel.tsx`. Controls sheet: observer fields and location, mute, volume and "Enable sound", abort, in demo the Auto-point/Manual switch, in real mode the drag-compass switch and the calibration offset buttons, and the S6 Sky_View with its camera toggle (the camera stops when the sheet closes, S6 DD-2 unchanged). In demo-manual mode the radar takes the landed drag pointer handlers. A mute button (44 px) stays on the First_Screen next to the Doppler figure; "Start demo instead" and "Abort" go to the Controls sheet plus a 44 px "Demo" button in the awaiting row; the Doppler dial opens in a Doppler sheet from the figure.
    - `src/app/session/[noradId]/page.tsx`: the S7 panels and landed controls below the main area are removed from the page body because their content now lives in the sheets; the `selecting` block stays, with its buttons restyled to the Touch_Minimum by CSS only. Every content stays reachable without the AR_View, the camera or the sensors. Append `.dock*` classes to the "Console" block of `src/app/globals.css`.
    - _Requirements: 4.5, 10.1, 10.5, 10.6, 11.1_
  - [x] 7.2 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. No scaffold enumeration changes in this task (no new file); the JSX-text scan already covers the changed files by name.
    - _Requirements: 14.6_
  - [x] 7.3 Main agent: commit staging `src/components/console/session-console.tsx`, `src/app/session/[noradId]/page.tsx` and `src/app/globals.css` by name, then push.

- [x] 8. Satellite_Dial and home controller
  - Depends on: task 7.
  - [x] 8.1 Main agent: create `src/lib/console/dial.ts` and prepare the shared files
    - `dialRotationDeg` and `dialIndexFromRotation` per design "Satellite dial". Extend `src/lib/console/index.ts`. Append the dial and home string groups of design "Console copy" to `src/components/console/copy.ts` (group label, previous, next, view story, start session, calculating, no pass in 48 h, location prompt) so that the two sub-agents below do not touch it.
    - _Requirements: 3.1, 7.2_
  - [x] 8.2 Create `src/components/console/satellite-dial.tsx` (parallel with 8.3; disjoint files, no shared-file edit)
    - Per design "Satellite dial" (decided: the draggable circular dial): seven nodes in landed catalog order, selected node enlarged at the top centre with name and status label, Playable nodes as filled phosphor circles with the landed "Playable" text, Story_Only nodes as brass rings with the "Story only" text; pointer-angle drag with `touch-action: none`, snap by `dialIndexFromRotation` with a 200 ms transition, tap on a node selects it, always-available 44 × 44 previous and next buttons that wrap, `role="radiogroup"` with `role="radio"` nodes, `aria-checked` and arrow keys; primary action link to `/session/[noradId]` for a Playable_Entry, "View story" button with the landed unplayable reason for a Story_Only_Entry; no other action for story-only entries.
    - _Requirements: 7.1–7.6, 11.1, 11.2_
  - [x] 8.3 Create `src/components/console/home-controller.ts` (parallel with 8.2; disjoint files)
    - `HomeController` per design "Home controller": `SELECTED_SLUG_KEY`, selection restored from the injected `KeyValueStorage` (missing or unknown value selects the first Playable_Entry, storage errors swallowed), `hasStoredObserver` check, a 250 ms delayed `createPlannerController` per playable selection with the previous one disposed, 1 Hz live position through the planner snapshot `satrec` and `observeAt`, `dispose`. All dependencies injected; the browser implementations are the landed `createBrowserDeps`, `createFieldBrowserDeps` and `createSessionBrowserDeps`.
    - _Requirements: 7.7, 8.1, 8.4–8.6, 3.4_
  - [x] 8.4 Main agent: extend `tests/scaffold/scaffold.test.ts`, then run the checks
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/satellite-dial.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 gains it by name. Append `.dial*` classes to the "Console" block of `src/app/globals.css`. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. Both new files are not yet mounted; task 9 mounts them.
    - _Requirements: 14.1–14.3, 14.6_
  - [x] 8.5 Main agent: commit staging `src/lib/console/dial.ts`, `src/lib/console/index.ts`, `src/components/console/copy.ts`, `src/components/console/satellite-dial.tsx`, `src/components/console/home-controller.ts`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 9. Console_Home on the preview URL
  - Depends on: task 8.
  - [x] 9.1 Create `src/components/console/console-home.tsx` and the temporary `src/components/console/console-preview.tsx`
    - `ConsoleHome` per design "Console home": header, `SatelliteDial`, the Radar_Panel with the live position and the next-pass path (`buildSkyTrack`, memoised per pass) when a Playable_Entry is selected and an Observer is known, the location control (landed `createLocator`, geolocation and manual input) when no Observer is known, the story hint and lifeline for a Story_Only_Entry, `CountdownRing` "to next pass" with formatted time and UTC AOS, "In pass now", "Calculating passes…" and "No pass found in the next 48 hours" states, the primary action, the secondary row of 44 px buttons (Cards, Log, Planner, Guide as links for a Playable_Entry only, About), the Story sheet through `story-panel.tsx` for every entry (including the Model_Viewer and its download), the landed `FirstRunGuide` mounted as landed, the honesty footer `SHELL_COPY.honestyFooter`, times through `formatUtc` with the Local_Time_Note as a secondary line. The landed Global_Navigation is unchanged.
    - `console-preview.tsx` (client component, temporary): renders `ConsoleHome` when the URL has `?console=1`, and the landed home content otherwise. `src/app/page.tsx` renders it in place of the landed body and stays a server page free of `'use client'`, `fetch`, `async`, `next/font` and `next/image` (checks 1.20 and 1.21). Append `.home*` classes to the "Console" block of `src/app/globals.css`.
    - _Requirements: 7.1, 7.4, 7.6, 8.1, 8.4–8.7, 9.2, 12.2, 12.3, 15.3_
  - [x] 9.2 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/console-home.tsx` and `components/console/console-preview.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 gains the same two files by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. With no query the landed home is served unchanged.
    - _Requirements: 14.1–14.4, 14.6_
  - [x] 9.3 Main agent: commit staging `src/components/console/console-home.tsx`, `src/components/console/console-preview.tsx`, `src/components/console/copy.ts`, `src/app/page.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 10. Touch and motion pass
  - Depends on: task 9.
  - [ ] 10.1 Apply the Touch_Minimum and the motion rules to the console
    - CSS in the "Console" block of `src/app/globals.css` and presentational prop changes only: every control this spec adds or restyles is at least 44 × 44 CSS pixels with a visible focus indicator (dial buttons, dock, meter button, sheet close, tabs, secondary row, `selecting` buttons of the session page); the Radar_Sweep `sweep` prop is read once through an injected `matchMedia('(prefers-reduced-motion: reduce)')` in the session page and the home and is false under Reduced_Motion (a static radar is shown); the meter still updates without easing; no loop runs while its component is not visible; the Seance Observatory look is kept (night palette, bone text, phosphor accent, brass for history, serif stories, monospace telemetry, no web font).
    - _Requirements: 5.6, 11.1–11.5_
  - [ ] 10.2 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. No scaffold enumeration changes in this task.
    - _Requirements: 14.6_
  - [ ] 10.3 Main agent: commit staging by name every file 10.1 changed (expected: `src/app/globals.css`, `src/app/session/[noradId]/page.tsx`, `src/components/console/console-home.tsx`, `src/components/console/radar-panel.tsx`), then push.

- [ ] 11. Switch `/` to the Console_Home
  - Depends on: task 10. The Should tier is complete here.
  - [ ] 11.1 Replace the landed home by the Console_Home
    - `src/app/page.tsx`: render `<ConsoleHome />` directly, and stay a server page free of `'use client'`, `fetch`, `async`, `next/font` and `next/image`. Delete `src/components/console/console-preview.tsx`. Remove the landed `EntryArticle` markup and the `GhostSky` use from the home page; every route that existed after S7 stays reachable (cards, log, planner, guide, session and the seven entries). Check that the landed `FirstRunGuide` and the Model_Viewer remain reachable from the Console_Home.
    - _Requirements: 1.5, 15.3_
  - [ ] 11.2 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory loses `components/console/console-preview.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 loses the same file. The `.tsx` inventory now holds the landed entries plus the ten console entries present at this point (`pass-strip` is added in task 12). Checks 1.20, 1.21, 1.22 and 1.23 are unchanged and must still pass. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 14.1–14.4, 14.6_
  - [ ] 11.3 Main agent: commit staging `src/app/page.tsx`, `tests/scaffold/scaffold.test.ts` and the deletion of `src/components/console/console-preview.tsx` by name, then push.

- [ ] 12. Pass_Strip
  - Depends on: task 11.
  - [ ] 12.1 Create `src/lib/console/strip.ts`; extend `index.ts` and `copy.ts`
    - `STRIP_WINDOW_MS` (48 h), `StripMark`, `passStripMarks` per design "Pass strip": 48 h filter of the landed planner rows on the view side, in-progress pass at x = 0, passes ending before now or rising beyond the window dropped, size from `maxElevationDeg / 90`, sorted by `riseMs`. `CONSOLE_COPY` gains the strip group (axis label, illumination glyph names, the one-line note that a session starts for the next pass).
    - _Requirements: 8.2_
  - [ ] 12.2 Create `src/components/console/pass-strip.tsx` and mount it on the Console_Home
    - Horizontal axis with day ticks, one circle per mark (8 to 16 px radius, 44 × 44 hit area), the S7 illumination glyph and accessible name from `profile.kind`. Tapping a mark opens a `ConsoleSheet` with AOS, peak and LOS through `formatUtc`, the Maximum_Elevation, the `IlluminationBadge`, the Local_Time_Note as a secondary line and the session link. Decided: for a mark beyond the next pass the sheet shows the details only, one line of note that a session starts for the next pass, and the session link for the next pass only; the session controller is NOT changed. Mount in `console-home.tsx`; append `.strip*` classes to the "Console" block of `src/app/globals.css`.
    - _Requirements: 8.2, 8.3, 8.7, 11.1_
  - [ ] 12.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/console/pass-strip.tsx`; the `CONSOLE_COMPONENTS` group of checks 1.24 and 1.25 gains it by name. The inventory now holds the eleven console entries of design "Scaffold check changes". Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 14.1–14.3, 14.6_
  - [ ] 12.4 Main agent: commit staging `src/lib/console/strip.ts`, `src/lib/console/index.ts`, `src/components/console/copy.ts`, `src/components/console/pass-strip.tsx`, `src/components/console/console-home.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 13. Console_Home Compact_Controls
  - Depends on: task 12.
  - [ ] 13.1 Move the home text-heavy content behind Compact_Controls
    - In `console-home.tsx`: the history text moves into the Story sheet (landed content, links unchanged); the landed `FirstRunGuide` is re-hosted unchanged in a "How it works" sheet (its dismissal flag key is unchanged) in place of its inline card; "Story" and "How it works" are 44 px buttons, each one tap from the First_Screen; focus returns to the opener on close. Append any new string to `CONSOLE_COPY` and any class to the "Console" block of `src/app/globals.css`.
    - _Requirements: 10.2, 10.3, 10.5, 10.6_
  - [ ] 13.2 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. No scaffold enumeration changes in this task (no new file). The Could tier is complete here.
    - _Requirements: 14.6_
  - [ ] 13.3 Main agent: commit staging `src/components/console/console-home.tsx`, `src/components/console/copy.ts` and `src/app/globals.css` by name, then push.

- [ ] 14. Owner's acceptance on a real phone (review items, executed by the project owner)
  - Depends on: task 13, with its push deployed (confirm that the Live_URL serves the final push).
  - [ ] 14.1 Present the Requirement 16 checklist to the owner against the Live_URL and record the owner's report per item: the Alignment_Meter while moving the phone toward and away from the satellite in a demo session and in a real-time pass; the Radar_Panel and the reticle; the AR_Entry; the Countdown_Ring; the Satellite_Dial gestures (drag, tap, previous and next buttons); the Pass_Strip and its sheet; the Compact_Controls (sheets, tabs, Escape and back gesture, focus return); touch sizes; Reduced_Motion; the First_Screen at 360 × 640; the honesty wording of the new strings. Record outcomes only as the owner reports them. Never run, assume, infer or fabricate an outcome. A failed item is recorded with the owner's words and raised as a follow-up, not fixed inside this task. If the owner's review rejects the dial, report it (design risk R4) instead of changing it inside this task.
    - _Requirements: 16.1, 16.2_
    - Not yet reported: every item.
  - [ ] 14.2 Confirm with the owner that the S6 Final_Submission_Checklist (S6 task 11) stays an S6 task and runs after this spec lands, and that the video is recorded only after this review. Report any tier at risk to the owner instead of cutting a part silently.
    - _Requirements: 15.4, 16.3_
  - [ ] 14.3 Main agent: after the owner has reported every item, mark the tasks of this file that are complete, then commit staging `.kiro/specs/console-ui/tasks.md` by name with `docs(console): record owner acceptance (S8 task 14)`, then push.

## Notes

- Requirement coverage: every acceptance criterion of `requirements.md` is listed under at least one sub-task. Criteria not listed under a test sub-task are checked by build, review or the owner's phone acceptance (requirements "Verification scope").
- Automated tests are only the three rows of design "Testing Strategy > The automated tests". No sub-task is marked optional, because every listed test is one of those named cases. The ring, strip and dial functions have no tests.
- Tiers: tasks 1 to 4 are Must, tasks 5 to 11 are Should (task 11 is the home switch and comes after the rest of the Should tier), tasks 12 and 13 are Could, task 14 is the owner's acceptance. The bottom navigation is dropped. After every task the pushed tree builds, passes its tests and is coherent, so stopping after any task loses only the later parts.
- Tasks 2, 3 and 8 add components that the following task mounts; each is committed with its scaffold extension so that nothing is left unguarded.
- Home reachability: the Console_Home keeps the landed `FirstRunGuide` inline and the full story content (Model_Viewer included) in the Story sheet from task 9, so that the switch in task 11 drops no route or content; task 13 only moves them behind Compact_Controls.
- The README, Devpost and video-script update is not a task of this spec (requirements.md does not require it); it falls under the S6 Final_Submission_Checklist after this spec lands.
- Internal target: the evening of 2026-12-04 (GMT+8); submission deadline 2026-12-05 06:00 GMT+8. The last 5 to 6 days before it are reserved for the video, S6 tasks 7 and 11 and the owner's acceptance.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1"] },
    { "id": 4, "tasks": ["2.2"] },
    { "id": 5, "tasks": ["2.3"] },
    { "id": 6, "tasks": ["3.1"] },
    { "id": 7, "tasks": ["3.2"] },
    { "id": 8, "tasks": ["3.3"] },
    { "id": 9, "tasks": ["4.1"] },
    { "id": 10, "tasks": ["4.2"] },
    { "id": 11, "tasks": ["5.1"] },
    { "id": 12, "tasks": ["5.2"] },
    { "id": 13, "tasks": ["5.3"] },
    { "id": 14, "tasks": ["6.1", "6.2"] },
    { "id": 15, "tasks": ["6.3"] },
    { "id": 16, "tasks": ["7.1"] },
    { "id": 17, "tasks": ["7.2"] },
    { "id": 18, "tasks": ["8.1"] },
    { "id": 19, "tasks": ["8.2", "8.3"] },
    { "id": 20, "tasks": ["8.4"] },
    { "id": 21, "tasks": ["9.1"] },
    { "id": 22, "tasks": ["9.2"] },
    { "id": 23, "tasks": ["10.1"] },
    { "id": 24, "tasks": ["10.2"] },
    { "id": 25, "tasks": ["11.1"] },
    { "id": 26, "tasks": ["11.2"] },
    { "id": 27, "tasks": ["12.1"] },
    { "id": 28, "tasks": ["12.2"] },
    { "id": 29, "tasks": ["12.3"] },
    { "id": 30, "tasks": ["13.1"] },
    { "id": 31, "tasks": ["13.2"] },
    { "id": 32, "tasks": ["14.1", "14.2"] }
  ]
}
```
