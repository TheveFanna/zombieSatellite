# Implementation Plan: field-companion (S7)

## Overview

Build S7 exactly as specified in `design.md`, in the delivery order of Requirement 26: Must (sunlight model and Shadow_Silence, Tuning_Table, Sky_Track, AR_View with FOV_Calibration), then Should (Ground_Track_Map, Pass_Planner with calendar export, Listening_Guide), then Could (satellite models, Listening_Log, First_Run_Guide and the Instrument_Detail pass), then the submission materials (Requirement 24), then the project owner's acceptance on a real phone (Requirement 25). Language: TypeScript (strict, ES modules); tests in Vitest, `node` environment.

Ground rules for the implementer:

- `requirements.md` and `design.md` in this folder are the specification. Read the design sections named in each sub-task before writing code. Do not deviate from the file layout, names, signatures, constants, keys and decisions F1 to F20 given there. Where design.md and requirements.md differ, requirements.md wins. If design.md seems insufficient, stop and ask instead of extending scope.
- All eight open points of the design review are accepted as written: planner links via calendar export (the session link targets the next pass only), one stored ZIP download, Original_Models only as `.obj` of at most 150 KB, Listening_Guide sources N1 to N5 (each opened once and confirmed in task 12 before use; unsupported facts are dropped), the noise floor kept sounding at its no-signal level in Shadow_Silence, no Log_Card, a second Camera_Controller instance for the AR_View, and the `SessionSnapshot` extension with `shadowSilent` and `demoBasis`. The Sun reference instants are confirmed on the USNO page in task 1.
- Tests: only the named ones. The automated tests are exactly the six rows of design "Testing Strategy > The automated tests": `tests/field/sun-shadow.test.ts` (task 1), `tests/field/source-boundary.test.ts` (task 1), `tests/field/tuning.test.ts` (task 3), `tests/field/ar-projection.test.ts` (task 6), `tests/field/ground.test.ts` (task 8) and the extended `tests/scaffold/scaffold.test.ts`. No other test, no property test, no round-trip test, no scanner self-test, no negative instrumentation, no DOM environment, no React testing library, no real network, camera or geolocation. Everything else is checked by review and by the owner on a real phone (task 18). Do not add extra verification, extra experiments or extra instrumentation to any guard or utility; follow the design's stated plan and stop to ask when it seems insufficient.
- Honesty_Scan (checks 1.24 and 1.25): every new string, new `.tsx` file and README paragraph is covered. If a string fails the scan, reword the string. Never weaken, loosen, skip or special-case the scan or any existing assertion; scaffold changes are extensions by explicit file name only.
- Copy: every new string comes from `FIELD_COPY` (`src/lib/field/copy.ts`), `src/lib/field/guide.ts` or `src/lib/field/models.ts` as design "Field_Copy" requires (plain string literals as direct property values, no radio term paired with a reception word, a simulated or synthesized qualifier wherever a radio term appears, no URLs inside scanned strings).
- Do not modify `src/lib/orbit`, `src/lib/pointing`, `src/lib/catalog`, `src/lib/qsl`, `src/lib/shell`, `src/components/pointing`, `src/components/qsl`, `src/components/shell` (except the single export edit of `visuals/sky-dome.tsx` in task 5), `public/sw.js`, or any existing test file other than `tests/scaffold/scaffold.test.ts` and, only if an added snapshot field breaks an exact-equality assertion, `tests/session/session-controller.test.ts`. The permitted edits of landed files are the rows of design "Landed files changed".
- `next.config.ts` is never edited and never staged. It may carry a developer's uncommitted edit; leave it as it is.
- No new package; `package.json` and `pnpm-lock.yaml` stay unchanged; `satellite.js` stays 6.0.2; all times UTC; lock tolerance stays 10°.
- Imports: inside `src/lib/field` only relative paths inside that directory plus the `index` barrels of `orbit`, `pointing`, `session` and `catalog` (design F1). Elsewhere relative paths (no `@/` alias). Tests import the Field_Core only through `src/lib/field/index`.
- Every task leaves the tree buildable and coherent: `pnpm test`, `pnpm typecheck` and `pnpm run build` pass at the end of every task (Requirement 23.4, 26.3). Test command: `pnpm vitest run <paths>`; full suite: `pnpm test`.
- Scaffold checks: tasks that add files extend `tests/scaffold/scaffold.test.ts` by explicit file name, and each such task lists its enumerations. The end state is the one of design "Scaffold check changes": check 1.19 directory listing `['api', 'cards', 'globals.css', 'guide', 'layout.tsx', 'log', 'manifest.ts', 'page.tsx', 'planner', 'pointing', 'session']`, the `.ts` list under `src/app` unchanged (`['api/tle/route.ts', 'manifest.ts']`), the `.tsx` inventory plus eleven entries, and the checks 1.24 and 1.25 `checkedTexts()` plus three property-string groups and the `FIELD_PAGES` and `FIELD_COMPONENTS` rendered-JSX groups.
- Commit and push: the main agent commits locally once per top-level task, after that task's tests, `pnpm typecheck` and `pnpm run build` pass, staging files by name (never `git add -A` or `git add .`), then pushes immediately. Never push in the middle of a task. Commit message style: `feat(field): <summary> (S7 task N)`, `docs(field): ...` or `test(field): ...`.
- Execution is serial by default; each task depends on the one before it. Parallelism is marked only where the files are disjoint: sub-tasks 8.1 and 8.2, sub-tasks 13.1 and 13.2, and sub-tasks 17.2 and 17.3. At most 2 to 3 sub-agents run at once; sub-agents write code and run their own sub-task's tests only; the main agent commits and pushes serially after they return.
- Task 18 is executed by the project owner. The agent presents the checklist and records the owner's reports. The agent never runs, assumes, infers or fabricates a phone outcome.

## Tasks

- [x] 1. Field_Core foundation: Sun direction, shadow model, illumination profile
  - Depends on: nothing (first task).
  - [x] 1.1 Create the Field_Core base: `src/lib/field/constants.ts`, `time.ts`, `sun.ts`, `shadow.ts`, `illumination.ts`, `copy.ts`, `index.ts`
    - Per design "Time and Sun direction", "Shadow model", "Illumination profile" and "Field_Copy": `julianDate`, `gmstRad`, `sunDirection` (USNO formula), `subsolarPoint`, `illuminationState`, `isInShadow` (cylindrical, radius 6378.137 km, `'sunlit' | 'umbra'`), `illuminationProfile`, `shadowedAt`, `shadowIntervals` (10 s steps, cap 600 samples, 1 s bisection, failed samples skipped, `unavailable` when no sample succeeds), the constants of design "Data Models", and `FIELD_COPY` with the keys needed so far (illumination badge texts, `silentInShadow`, `shadowSilenceNote`, `instrumentLabel`) under the Field_Copy wording rules. `index.ts` is the barrel of every name above.
    - Where the shadow-state check on `unavailable` or a failed sample could throw, follow design F4: never throw for a propagation failure.
    - _Requirements: 1.1, 1.2, 2.1–2.4, 3.1–3.3, 21.1, 21.2_
  - [x] 1.2 Create `tests/helpers/field-source-scan.ts` and the two tests
    - `field-source-scan.ts`: a copy of `tests/helpers/shell-source-scan.ts` with root `src/lib/field`, allowed outside files the `index` barrels of `orbit`, `pointing`, `session` and `catalog`, and the forbidden-identifier and forbidden-call checks of design F1 added from `tests/helpers/source-scan.ts`.
    - `tests/field/source-boundary.test.ts`: two cases as design "Testing Strategy" (`index.ts` listed; no violation).
    - `tests/field/sun-shadow.test.ts`: case 1 (four equinox and solstice instants, angle at most 0.05° from the definition vectors) and case 2 (`7000·s` is `'sunlit'`, `−7000·s` is `'umbra'` at 2026-03-20T14:46Z). Before writing the literals, open the USNO "Earth's Seasons" page once, confirm the four 2026 instants, and record any correction in a comment above the literals.
    - Run both files and `pnpm typecheck`.
    - _Requirements: 1.3, 1.4, 2.5, 2.6_
  - [x] 1.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.24 and 1.25 `checkedTexts()` gains `['field copy strings', propertyStrings('src/lib/field/copy.ts')]`. Check 1.19 listing and `.tsx` inventory are unchanged in this task. No other change.
    - Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [x] 1.4 Main agent: commit staging `.kiro/specs/field-companion/.config.kiro`, `requirements.md`, `design.md`, `tasks.md`, the seven `src/lib/field` files, `tests/helpers/field-source-scan.ts`, `tests/field/source-boundary.test.ts`, `tests/field/sun-shadow.test.ts` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 2. Shadow_Silence of the simulated beacon (S4 change)
  - Depends on: task 1.
  - [x] 2.1 Change the landed S4 code as design "Shadow_Silence and the S4 change" lists, no more
    - `src/lib/session/beacon.ts`: optional `shadowSilent` in `BeaconInputs`; the one changed line in `beaconState`.
    - `src/components/session/session-controller.ts`: import `isInShadow` from `../../lib/field/index`; `shadowSilent` in `BeaconLevels`, `NO_BEACON_LEVELS`, `refreshPointingError`, `sampleAt`, `stateAt` and the snapshot; reset to `NO_BEACON_LEVELS` on an observation failure. Do not add `demoBasis` yet (task 7).
    - `src/components/session/copy.ts`: the new `sunlitNote` text. Add `FIELD_COPY.shadowSilenceNote` use below.
    - `src/app/session/[noradId]/page.tsx`: `initialSnapshot` gains `shadowSilent: false`; a paragraph with `FIELD_COPY.shadowSilenceNote` while `snapshot.shadowSilent`. No other change.
    - If an added snapshot field breaks an exact-equality assertion in `tests/session/session-controller.test.ts`, adjust that assertion only. Add no case.
    - _Requirements: 4.1–4.7, 22.1, 22.2_
  - [x] 2.2 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. The landed `beacon.test.ts` and `session-controller.test.ts` cases must pass unchanged (an omitted flag keeps the landed behavior).
    - _Requirements: 4.5, 23.4_
  - [x] 2.3 Main agent: commit staging `src/lib/session/beacon.ts`, `src/components/session/session-controller.ts`, `src/components/session/copy.ts`, `src/app/session/[noradId]/page.tsx` and, only if it was adjusted, `tests/session/session-controller.test.ts` by name, then push.

- [x] 3. Tuning table core
  - Depends on: task 2.
  - [x] 3.1 Create `src/lib/field/tuning.ts` and extend `index.ts` and `copy.ts`
    - `tuningTable`, `minuteTable`, `tuningCsv`, `roundMhz`, the file-name builder and the formatting per design "Tuning table": `physicalDopplerShiftKhz` from the session barrel (Doppler is not reimplemented), 4-decimal MHz rounding, whole-UTC-minute rows plus AOS and LOS, "Now" and "Window end" labels for truncated passes, `{ kind: 'no-frequency' }` for IMAGE before any engine call, the five-column CSV with CRLF line ends. `FIELD_COPY` gains the tuning labels, `nominalNote`, `les1Note`, `prosperoNote`, `noFrequencyNote` and the CSV header.
    - The functions are wired into the Session_Page in task 4.
    - _Requirements: 5.1–5.8_
  - [x] 3.2 Write `tests/field/tuning.test.ts`
    - One case as design "Tuning table": the ISS fixture pass, TCA 145.9785 MHz from the baseline range rate −2.1094 km/s, AOS and LOS literals computed once with `rangeRateOracle` and `Δf = −f0 · ṙ / c`, with a comment naming the method.
    - Run it, `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 5.9_
  - [x] 3.3 Main agent: commit staging `src/lib/field/tuning.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts` and `tests/field/tuning.test.ts` by name, then push.

- [x] 4. Session_Page field panel: badge, Tuning_Table, Instrument_Detail, copy and CSV
  - Depends on: task 3.
  - [x] 4.1 Create the component-layer base
    - `src/components/field/deps.ts`, `browser-deps.ts` (clipboard, downloads, clock, timers, storage; real objects only here), `tle-source.ts`, `pass-field-controller.ts` and `field-downloader.ts` per design "Pass field controller and TLE source" and "Downloads and clipboard". The controller computes `track` as `null` until task 5.
    - `src/components/field/visuals/field-bits.tsx`: `IlluminationBadge` and `InstrumentDetail` (a `details` element, summary `FIELD_COPY.instrumentLabel`).
    - _Requirements: 3.4–3.6, 5.5, 18.1, 18.2, 23.1–23.3_
  - [x] 4.2 Create `src/components/field/session-panel.tsx` and wire it into the Session_Page
    - `FieldSessionPanel` renders, for now, blocks 1, 3, 4 and 6 of design "Session_Page block" (badge, Tuning_Table with notes, Instrument_Detail with shadow instants, Minute_Table, copy and CSV buttons, links to the planner and the guide are shown from tasks 10 and 12, so omit them now). One insertion in `src/app/session/[noradId]/page.tsx` after the header, shadow note and effects, with the pass-field controller created next to the session controller from `sessionDeps.tleFetcher`. The Simple_View shows the badge, three tuning rows and the Maximum_Elevation; everything else sits in the Instrument_Detail.
    - Append the "Field companion" block to `src/app/globals.css` with the classes this task uses (`.badge-*`, `.instrument`, tuning table styles); later tasks append their own classes to the same block.
    - _Requirements: 3.4–3.6, 5.1–5.8, 18.1–18.4, 20.1–20.3_
  - [x] 4.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/field/session-panel.tsx` and `components/field/visuals/field-bits.tsx` (test title names the field components); checks 1.24 and 1.25 rendered-JSX group gains `FIELD_COMPONENTS` with those two files by name. Directory listing and `.ts` list unchanged.
    - Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [x] 4.4 Main agent: commit staging the files of `src/components/field` created so far (`deps.ts`, `browser-deps.ts`, `tle-source.ts`, `pass-field-controller.ts`, `field-downloader.ts`, `session-panel.tsx`, `visuals/field-bits.tsx`), `src/app/session/[noradId]/page.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 5. Sky_Track
  - Depends on: task 4.
  - [x] 5.1 Create `src/lib/field/sky-track.ts` and extend `index.ts` and `copy.ts`
    - `buildSkyTrack`, `trackSegments`, `tickLabel` per design "Sky track": step `max(10 s, ceil(duration / 180))`, exact samples at AOS, TCA, LOS and every Time_Tick, failed samples split the polyline, shadow segments continuous. `FIELD_COPY` gains `aosLabel`, `nowLabel`, `losLabel`, `windowEndLabel`.
    - _Requirements: 6.1–6.6_
  - [x] 5.2 Create the Sky_Track visual and wire it
    - `src/components/shell/visuals/sky-dome.tsx`: only the three exports of design "Landed files changed" (`DomeFrame`, `DOME_RADIUS`, `DOME_VIEWBOX`); no behavior change.
    - `src/components/field/visuals/sky-track.tsx`: the track on the dome with dashed brass shadow segments, solid phosphor sunlit segments, AOS and LOS marks with azimuth labels, culmination mark with the Maximum_Elevation, tick labels, and the Current_Point from `snapshot.target`. Elevation clamped at 0 for drawing.
    - `pass-field-controller.ts`: compute `track` in `setPass`/`setObserver`. `session-panel.tsx`: add block 2 (Sky_Track). Append `.track-sun` and `.track-shadow` to the "Field companion" block of `src/app/globals.css`.
    - `PassProfile` stays on the picker rows (decision F7).
    - _Requirements: 6.1–6.6, 20.1–20.3_
  - [x] 5.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/field/visuals/sky-track.tsx`; the `FIELD_COMPONENTS` group of checks 1.24 and 1.25 gains the same file by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [x] 5.4 Main agent: commit staging `src/lib/field/sky-track.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts`, `src/components/shell/visuals/sky-dome.tsx`, `src/components/field/visuals/sky-track.tsx`, `src/components/field/pass-field-controller.ts`, `src/components/field/session-panel.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 6. AR math and FOV calibration core
  - Depends on: task 5.
  - [x] 6.1 Create `src/lib/field/ar.ts` and `fov.ts`; extend `index.ts` and `copy.ts`
    - Per design "AR math" and "FOV calibration": `projectAr` (wrapping the landed `projectMarker`, tangent ratio, equal to it at 75°), `arMarker`, `projectTrackArc`, `projectTicks`, `horizonLine`, cardinal marks, lock ring and `edgeArrow` as the design specifies, `AR_NDC_LIMIT`; `FOV_MIN_DEG`, `FOV_MAX_DEG`, `FOV_DEFAULT_DEG`, `FOV_STEP_DEG`, `normalizeFov`. `FIELD_COPY` gains the AR texts (`arOpen`, `arClose`, `arDemoMark`, `arFovLabel`, `arNoCamera`, `arEnableSensors`).
    - The functions are wired into the AR_View in task 7.
    - _Requirements: 7.2–7.8, 7.13, 9.1–9.6_
  - [x] 6.2 Write `tests/field/ar-projection.test.ts`
    - The six analytic cases of design "AR math", including the 75° agreement with `projectMarker` and the second Vertical_FOV case the design states.
    - Run it, `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 7.13, 9.6_
  - [x] 6.3 Main agent: commit staging `src/lib/field/ar.ts`, `src/lib/field/fov.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts` and `tests/field/ar-projection.test.ts` by name, then push.

- [x] 7. AR_View with camera, overlay and FOV calibration
  - Depends on: task 6.
  - [x] 7.1 Add `demoBasis` to the S4 snapshot
    - `src/components/session/session-controller.ts`: `demoBasis: CameraBasis | null` in `SessionSnapshot` per design "Camera basis" (auto-point from the aimed pose, manual from the drag compass pose, `null` for the sensor source, cleared with the other sample state). `src/app/session/[noradId]/page.tsx`: `initialSnapshot` gains `demoBasis: null`.
    - If the added field breaks an exact-equality assertion in `tests/session/session-controller.test.ts`, adjust that assertion only.
    - _Requirements: 8.5, 8.6, 22.1, 22.2_
  - [x] 7.2 Create the AR components
    - `src/components/field/fov-store.ts` (key `zombieSatellite.field.verticalFovDeg`, `normalizeFov` on read).
    - `src/components/field/visuals/ar-overlay.tsx`: the SVG overlay (marker, lock ring, track arc with dashed shadow part, tick labels, horizon, cardinals, edge arrow).
    - `src/components/field/ar-view.tsx`: full-screen layer, its own `createCameraController` instance started on mount and stopped on cleanup, fallback to the dark sky background with a one-line note, sensor-enable button and drag layer per design "Sensors in the AR_View", `ResizeObserver` aspect, `requestAnimationFrame` loop gated to 30 fps and paused while hidden, Instrument_Strip (lock, Doppler, countdown) toggling the Instrument_Detail (azimuth, elevation, Doppler, illumination, FOV slider 45 to 100), close control, Demo_AR_View with `camera={false}` and the always-visible demo mark. No canvas, frame read, recorder, upload or storage.
    - _Requirements: 7.1–7.12, 7.14, 7.15, 8.1–8.5, 9.1–9.5, 18.1, 18.2_
  - [x] 7.3 Mount it on the Session_Page
    - `src/app/session/[noradId]/page.tsx`: `arOpen` state, the `FIELD_COPY.arOpen` button in `awaiting-pass` and `in-pass` (real time and demo), `<ArView … />` while open and in those phases, the Sky_View camera stop on open (`camera.stop()` and `setCameraOn(false)`), unmount when the phase leaves the two phases. S6 DD-2 is extended for the AR_View only. Append the AR classes of design "Visual language" to the "Field companion" block of `src/app/globals.css`.
    - _Requirements: 7.1, 7.12, 8.4, 8.6, 20.1–20.3, 22.2_
  - [x] 7.4 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/field/ar-view.tsx` and `components/field/visuals/ar-overlay.tsx`; the `FIELD_COMPONENTS` group of checks 1.24 and 1.25 gains the same two files by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [x] 7.5 Main agent: commit staging `src/components/session/session-controller.ts`, `src/components/field/fov-store.ts`, `src/components/field/visuals/ar-overlay.tsx`, `src/components/field/ar-view.tsx`, `src/app/session/[noradId]/page.tsx`, `src/app/globals.css`, `tests/scaffold/scaffold.test.ts` and, only if it was adjusted, `tests/session/session-controller.test.ts` by name, then push. The Must tier is complete here.

- [x] 8. Ground-track core: geodetic point, footprint, terminator, coastline
  - Depends on: task 7.
  - [x] 8.1 Create `scripts/build-coastline.mjs` and `src/lib/field/data/coastline.ts` (parallel with 8.2; disjoint files, no barrel edit)
    - Per design "Coastline data": Node built-ins only, Ramer-Douglas-Peucker at 0.25° per line, 0.1° quantization, absolute `M` and relative `l` commands in map units, one exported string `COASTLINE_PATH`, at most 40 KB (raise the tolerance in 0.05° steps if needed). Download `ne_110m_coastline.geojson` once as the design says; commit the generated TypeScript file, not the GeoJSON. The main agent adds the `COASTLINE_PATH` export to `index.ts` after both sub-tasks return.
    - _Requirements: 13.7, 13.8_
  - [x] 8.2 Create `src/lib/field/geodetic.ts` and `ground-track.ts`; extend `index.ts` and `copy.ts` (parallel with 8.1)
    - `subSatellitePoint` (Bowring iteration), `orbitalPeriodMin`, `groundTrack`, `footprint` (radius on the 6371.0088 km sphere), `terminator` per design "Geodetic, footprint, terminator" and "Ground track"; `FIELD_COPY.mapNoOrbit`.
    - _Requirements: 12.1–12.5, 13.3, 13.5_
  - [x] 8.3 Write `tests/field/ground.test.ts`
    - The two cases of design "Testing Strategy": Sub_Satellite_Point at the Reference_ISS_Instant against literals from `satellite.js` `eciToGeodetic`, and the footprint radius at `h = 0, R, R(√2−1)`. Run it, `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 12.6, 12.7_
  - [x] 8.4 Main agent: commit staging `scripts/build-coastline.mjs`, `src/lib/field/data/coastline.ts`, `src/lib/field/geodetic.ts`, `src/lib/field/ground-track.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts` and `tests/field/ground.test.ts` by name, then push.

- [x] 9. Ground_Track_Map component
  - Depends on: task 8.
  - [x] 9.1 Create `src/components/field/ground-track-map.tsx` and wire it
    - Per design "Ground_Track_Map component": static graticule and coastline path, dynamic night polygon, past and future track, footprint at −360°, 0° and +360°, satellite dot, Observer_Pin, the recompute rules (track on leaving one grid step, terminator per UTC minute), the no-orbit state, the Simple_View map with an Instrument_Detail of latitude, longitude, altitude, footprint radius and track span. Add block 5 to `session-panel.tsx` (map at `snapshot.sessionInstantMs`, demo instant included). Append `.map*` classes to the "Field companion" block of `src/app/globals.css`.
    - Credits for the coastline go into the README in task 17.
    - _Requirements: 12.1–12.5, 13.1–13.6, 18.1, 18.2_
  - [x] 9.2 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/field/ground-track-map.tsx`; the `FIELD_COMPONENTS` group of checks 1.24 and 1.25 gains it by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [x] 9.3 Main agent: commit staging `src/components/field/ground-track-map.tsx`, `src/components/field/session-panel.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 10. Pass_Planner page
  - Depends on: task 9.
  - [x] 10.1 Create `src/lib/field/planner.ts` and `src/components/field/planner-controller.ts`
    - `planner.ts` constants and `filterPassesByElevation` per design "Pass planner core". The controller per design "Planner": states `loading`, `searching`, `badging`, `ready`, `tle-unavailable`; `predictPasses` over 168 h at 0° in a `setTimeout(…, 0)` task; illumination profiles in chunks of 6 passes per task; a generation counter dropping stale work; no Web Worker. Extend `index.ts` and `copy.ts` (planner texts, empty-state texts).
    - _Requirements: 10.1–10.3, 10.8_
  - [x] 10.2 Create `src/app/planner/[noradId]/page.tsx` and link it
    - Client page on the `session/[noradId]` pattern (`resolvePlayableEntry`, a not-found branch, observer from the observer store, `createPickerBrowserDeps()` fetcher): filter control 0°, 10°, 20°, 30° (default 10°), rows with AOS and LOS UTC through `formatUtc`, azimuths, maximum elevation, badge and the secondary `formatLocalTimeNote` line; a selected-row detail with the Sky_Track, Tuning_Table or No_Frequency_Note, an Instrument_Detail (Minute_Table, copy, CSV, illumination instants) and the Ground_Track_Map at the clock instant; the header link "Open session (it targets the next pass)" with the first pass marked. Add the "Plan passes" link to each row of `src/app/session/page.tsx`, to `session-panel.tsx` (block 6) and to the Home_Page entry cards in `src/app/page.tsx`. Append planner classes to `src/app/globals.css`.
    - _Requirements: 10.4–10.7, 18.1–18.4, 22.2_
  - [x] 10.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 directory listing gains `planner`; the `.tsx` inventory gains `app/planner/[noradId]/page.tsx`; the `.ts` list under `src/app` is unchanged; the rendered-JSX group of checks 1.24 and 1.25 gains `FIELD_PAGES` with that page by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [x] 10.4 Main agent: commit staging `src/lib/field/planner.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts`, `src/components/field/planner-controller.ts`, `src/app/planner/[noradId]/page.tsx`, `src/app/session/page.tsx`, `src/components/field/session-panel.tsx`, `src/app/page.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 11. Calendar export
  - Depends on: task 10.
  - [x] 11.1 Create `src/lib/field/ics.ts` and wire the button
    - `buildCalendarEvent`, `calendarFileName`, escaping and 75-octet folding per design "Calendar event" (RFC 5545 only, VALARM 10 min before AOS, UID `<noradId>-<riseMs>@zombiesatellite`, `stampMs` from `clock.nowMs()`); extend `index.ts` and `copy.ts` (calendar pieces). Add the "Add to calendar" button to the planner detail in `src/app/planner/[noradId]/page.tsx`, delivered through `field-downloader.ts` as `text/calendar;charset=utf-8`. No test; the owner imports the file on a phone in task 18.
    - _Requirements: 11.1–11.5_
  - [x] 11.2 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 23.4_
  - [x] 11.3 Main agent: commit staging `src/lib/field/ics.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts` and `src/app/planner/[noradId]/page.tsx` by name, then push.

- [x] 12. Listening_Guide
  - Depends on: task 11.
  - [x] 12.1 Confirm the new sources, then create `src/lib/field/guide.ts`
    - Open each of the sources N1 to N5 of design "Listening guide" once and confirm the fact it is meant to support. Drop any fact the page does not support and write "none documented" instead. Record the outcome per source in the commit message body. No setup is promised for AO-7, Prospero or IMAGE unless a source supports it.
    - `guide.ts` per design: named `facts` properties each `{ text, source }`, named `recordings`, explicit `none` texts, the red lines (Transit 5B-5 identity dispute, no nuclear-battery claim, Prospero "later reports are unconfirmed", IMAGE "silent again since August 2018" with no frequency, LES-1 "about 237 MHz"). Extend `index.ts` and `copy.ts` (guide page labels, the fixed own-equipment line).
    - _Requirements: 14.1–14.7_
  - [x] 12.2 Create `src/app/guide/[noradId]/page.tsx` and link it
    - Client page on the `session/[noradId]` pattern; frequency from `displayFrequency` verbatim or the No_Frequency_Note, mode from `beaconMode`, the setup line, the illumination condition, recordings as links only, the fixed line. Add the "Guide" link to each row of `src/app/session/page.tsx`, to `session-panel.tsx` (block 6), to the planner header in `src/app/planner/[noradId]/page.tsx` and to the Home_Page entry cards in `src/app/page.tsx`. Append guide classes to `src/app/globals.css` (serif prose).
    - _Requirements: 14.1–14.8, 18.1_
  - [x] 12.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 directory listing gains `guide`; the `.tsx` inventory gains `app/guide/[noradId]/page.tsx`; checks 1.24 and 1.25 `checkedTexts()` gains `['listening guide strings', propertyStrings('src/lib/field/guide.ts')]`; the `FIELD_PAGES` group gains the guide page by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. Any guide string the scan rejects is reworded.
    - _Requirements: 21.3–21.5, 23.4_
  - [x] 12.4 Main agent: commit staging `src/lib/field/guide.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts`, `src/app/guide/[noradId]/page.tsx`, `src/app/session/page.tsx`, `src/components/field/session-panel.tsx`, `src/app/planner/[noradId]/page.tsx`, `src/app/page.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push. The Should tier is complete here.

- [ ] 13. Satellite models: research, register and model core
  - Depends on: task 12.
  - [x] 13.1 Run the model research and write `docs/reference/MODELS.md` (parallel with 13.2; files `docs/reference/MODELS.md` and `public/models/*.obj` only)
    - Follow the research plan of design "Models": the search order, one Model_Record per candidate, the adoption rule (redistribution allowed, `.obj`, at most 150 KB), the table layout, a dimension-source section per Illustrative_Model, the Coastline_Data section and the research date. Commit adopted originals as `public/models/<slug>.obj`. Record the decision per entry for 13.2 (the main agent hands the list to the code sub-task).
    - _Requirements: 15.1–15.7, 13.8_
  - [x] 13.2 Create the model core (parallel with 13.1; files under `src/lib/field` only)
    - `model-build.ts`, `model-defs.ts` (seven Illustrative_Model definitions from primitives), `obj.ts` (`parseObj`, `serializeObj`), `zip.ts` (`buildStoredZip`, CRC-32), `model-view.ts` (`projectModel`), `models.ts` (Model_Records of the register as plain property strings, Attribution_File text builders). The records of `models.ts` follow `MODELS.md` once 13.1 returns; the main agent reconciles the two before 13.3. Extend `index.ts` and `copy.ts` (`modelIllustrative`, model labels).
    - _Requirements: 15.2, 15.3, 15.5, 16.1–16.3_
  - [x] 13.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: checks 1.24 and 1.25 `checkedTexts()` gains `['models register strings', propertyStrings('src/lib/field/models.ts')]`. Check 1.19 is unchanged in this task. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [-] 13.4 Main agent: commit staging `docs/reference/MODELS.md`, each adopted `public/models/<slug>.obj` by name, the seven new `src/lib/field` files, `src/lib/field/index.ts`, `src/lib/field/copy.ts` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 14. Model viewer and download on the Home_Page
  - Depends on: task 13.
  - [~] 14.1 Create `src/components/field/model-viewer.tsx` and add it to the Home_Page
    - Canvas 2D viewer per design "Models": `requestAnimationFrame` at 30 fps at most, 18°/s, `IntersectionObserver` and `document.visibilityState` gating, never mounted while its `details` block is closed, the Illustrative label or the author and licence line, the same-origin `.obj` fetch on tap with the Illustrative_Model fallback; Model_Download as one stored ZIP (`<slug>.obj` and `<slug>-ATTRIBUTION.txt`) through `downloadBytes`. One `details` block per entry card in `src/app/page.tsx`; the home page stays free of `'use client'`, `fetch`, `async`, `next/font` and `next/image` (checks 1.20 and 1.21). Append `.model-canvas` to `src/app/globals.css`.
    - _Requirements: 16.1–16.6, 15.4_
  - [~] 14.2 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/field/model-viewer.tsx`; the `FIELD_COMPONENTS` group of checks 1.24 and 1.25 gains it by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.6, 23.4_
  - [~] 14.3 Main agent: commit staging `src/components/field/model-viewer.tsx`, `src/app/page.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 15. Listening_Log
  - Depends on: task 14.
  - [~] 15.1 Create `src/lib/field/log.ts` and `src/components/field/log-store.ts`
    - `parseLogDraft` (per-field errors), `appendEntry` (oldest dropped at 200), `parseStoredLog` (drops invalid elements, never throws), `serializeLog` per design "Listening log core"; the store over `KeyValueStorage` with key `zombieSatellite.field.listeningLog` and `{ "v": 1, "entries": [...] }`. Extend `index.ts` and `copy.ts` (log labels, `selfReportedMark`, errors). No Log_Card (F18).
    - _Requirements: 17.1–17.4, 17.6, 17.7_
  - [~] 15.2 Create `src/app/log/page.tsx` and link it
    - Form (satellite select, UTC text, frequency, equipment, note) with per-field errors, the entry list newest first, the Self_Reported_Mark at the top and inside every entry (`SelfReportedMark` added to `src/components/field/visuals/field-bits.tsx`), free text as React text children only, the 200-entry notice, nothing prefilled from a session and nothing leaving the device. Add the "Listening log" link to the action row of `src/app/page.tsx`. Append log classes (`.self-reported`) to `src/app/globals.css`. The S5 collection and the Session_Result store are not touched.
    - _Requirements: 17.1–17.9, 18.1_
  - [~] 15.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 directory listing gains `log`; the `.tsx` inventory gains `app/log/page.tsx`; the `FIELD_PAGES` group of checks 1.24 and 1.25 gains the log page by name. Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.5, 23.4_
  - [~] 15.4 Main agent: commit staging `src/lib/field/log.ts`, `src/lib/field/index.ts`, `src/lib/field/copy.ts`, `src/components/field/log-store.ts`, `src/components/field/visuals/field-bits.tsx`, `src/app/log/page.tsx`, `src/app/page.tsx`, `src/app/globals.css` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 16. First_Run_Guide and the Instrument_Detail pass
  - Depends on: task 15.
  - [~] 16.1 Create `src/components/field/first-run-guide.tsx` and `first-run-store.ts`; mount on the Home_Page
    - Four steps, Skip on every step, Done on the last, flag `zombieSatellite.field.firstRunDone` read in an effect so the server render and the first client render match, nothing rendered afterwards, no session started, per design "Two depths of use". Extend `FIELD_COPY` with the first-run steps. Add the card to `src/app/page.tsx` (checks 1.20 and 1.21 stay true). Append `.first-run` to `src/app/globals.css`.
    - _Requirements: 19.1–19.5_
  - [~] 16.2 Check the Simple_View and Instrument_Detail of every S7 screen against design "Simple_View numbers per screen"
    - Review the planner row, the planner detail, the AR_View, the ground map and the Session_Page panel against the table; move any professional number out of the Simple_View into its Instrument_Detail. Presentational changes only, in files this spec already owns.
    - _Requirements: 18.1–18.4, 20.3_
  - [~] 16.3 Extend `tests/scaffold/scaffold.test.ts`
    - Enumerations touched: check 1.19 `.tsx` inventory gains `components/field/first-run-guide.tsx`; the `FIELD_COMPONENTS` group of checks 1.24 and 1.25 gains it by name. The `.tsx` inventory now holds the twelve landed entries plus the eleven field entries of design "Scaffold check changes". Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 21.3–21.6, 23.4_
  - [~] 16.4 Main agent: commit staging `src/components/field/first-run-guide.tsx`, `src/components/field/first-run-store.ts`, `src/lib/field/copy.ts`, `src/app/page.tsx`, `src/app/globals.css`, `tests/scaffold/scaffold.test.ts` and any other file changed by 16.2, each by name, then push. The Could tier is complete here.

- [ ] 17. Submission materials update
  - Depends on: task 16.
  - [~] 17.1 Update `README.md`
    - Per design "Submission materials": a "Field companion" feature list and a "Credits" list (Natural Earth public domain, the USNO approximate solar coordinates algorithm, each Original_Model with author and licence, and the statement that the other models are illustrative). Keep both Provenance_Sentences character for character (checks 1.22 and 1.23). Check every new paragraph against 1.24 and 1.25 while writing. Run `pnpm vitest run tests/scaffold/scaffold.test.ts`.
    - _Requirements: 24.1, 24.4, 15.7, 13.8, 21.6_
  - [~] 17.2 Update `docs/submission/DEVPOST.md` (parallel with 17.3; disjoint file)
    - The S7 features and the seven-spec workflow stated factually; the S6 red lines kept: no claim of real reception, every historical reception attributed, unconfirmed claims respected, English only. Refresh the test count from a fresh `pnpm test` run.
    - _Requirements: 24.2, 24.5_
  - [~] 17.3 Update `docs/submission/VIDEO_SCRIPT.md` (parallel with 17.2; disjoint file)
    - Add the strongest S7 moments (the AR_View with the Track_Arc over the sky, the Ground_Track_Map); the shot durations still sum to at most 180 s; same red lines.
    - _Requirements: 24.3, 24.5_
  - [~] 17.4 Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. Review `DEVPOST.md` and `VIDEO_SCRIPT.md` against the red lines and record the result in this task.
    - _Requirements: 24.5, 23.4_
  - [~] 17.5 Main agent: commit staging `README.md`, `docs/submission/DEVPOST.md` and `docs/submission/VIDEO_SCRIPT.md` by name, then push.

- [ ] 18. Owner's acceptance on a real phone (review items, executed by the project owner)
  - Depends on: task 17, with its push deployed (confirm that the Live_URL serves the final push).
  - [~] 18.1 Present the Requirement 25 checklist to the owner against the Live_URL and record the owner's report per item: the AR_View with the Track_Arc, the Lock_Ring, the Edge_Arrow and the FOV_Calibration; Shadow_Silence; the Sky_Track; the Tuning_Table with the copy and CSV actions; the Pass_Planner and an imported Calendar_Event; the smoothness of the Ground_Track_Map; the Model_Viewer and a Model_Download; the Listening_Guide links; the Listening_Log; the First_Run_Guide. Record outcomes only as the owner reports them. Never run, assume, infer or fabricate an outcome. A failed item is recorded with the owner's words and raised as a follow-up, not fixed inside this task.
    - _Requirements: 25.1, 25.2_
    - Not yet reported: every item.
  - [~] 18.2 Confirm with the owner that the S6 Device_Checklist (S6 task 7) and the S6 Final_Submission_Checklist (S6 task 11) stay S6 tasks and that the latter runs after this spec lands. Report any tier at risk to the owner instead of cutting a part silently.
    - _Requirements: 25.3, 26.4_
  - [~] 18.3 Main agent: after the owner has reported every item, mark the tasks of this file that are complete, then commit staging `.kiro/specs/field-companion/tasks.md` by name with `docs(field): record owner acceptance (S7 task 18)`, then push.

## Notes

- Requirement coverage: every acceptance criterion of `requirements.md` is listed under at least one sub-task. Criteria not listed under a test sub-task are checked by build, review or the owner's phone acceptance (requirements "Verification scope").
- Automated tests are only the six rows of design "Testing Strategy > The automated tests". No sub-task is marked optional, because every listed test is one of those named cases.
- Tiers: tasks 1 to 7 are Must, tasks 8 to 12 are Should, tasks 13 to 16 are Could, task 17 is the submission update, task 18 is the owner's acceptance. After every task the pushed tree builds, passes its tests and is coherent, so stopping after any task loses only the later parts.
- Tasks 3, 5 (5.1) and 6 add pure core code that the next task wires into the UI; each is committed together with its test or with the barrel export so that nothing is left unreachable once the following task lands.
- Internal target: the evening of 2026-12-04 (GMT+8); submission deadline 2026-12-05 06:00 GMT+8.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1"] },
    { "id": 4, "tasks": ["2.2"] },
    { "id": 5, "tasks": ["3.1"] },
    { "id": 6, "tasks": ["3.2"] },
    { "id": 7, "tasks": ["4.1"] },
    { "id": 8, "tasks": ["4.2"] },
    { "id": 9, "tasks": ["4.3"] },
    { "id": 10, "tasks": ["5.1"] },
    { "id": 11, "tasks": ["5.2"] },
    { "id": 12, "tasks": ["5.3"] },
    { "id": 13, "tasks": ["6.1"] },
    { "id": 14, "tasks": ["6.2"] },
    { "id": 15, "tasks": ["7.1"] },
    { "id": 16, "tasks": ["7.2"] },
    { "id": 17, "tasks": ["7.3"] },
    { "id": 18, "tasks": ["7.4"] },
    { "id": 19, "tasks": ["8.1", "8.2"] },
    { "id": 20, "tasks": ["8.3"] },
    { "id": 21, "tasks": ["9.1"] },
    { "id": 22, "tasks": ["9.2"] },
    { "id": 23, "tasks": ["10.1"] },
    { "id": 24, "tasks": ["10.2"] },
    { "id": 25, "tasks": ["10.3"] },
    { "id": 26, "tasks": ["11.1"] },
    { "id": 27, "tasks": ["11.2"] },
    { "id": 28, "tasks": ["12.1"] },
    { "id": 29, "tasks": ["12.2"] },
    { "id": 30, "tasks": ["12.3"] },
    { "id": 31, "tasks": ["13.1", "13.2"] },
    { "id": 32, "tasks": ["13.3"] },
    { "id": 33, "tasks": ["14.1"] },
    { "id": 34, "tasks": ["14.2"] },
    { "id": 35, "tasks": ["15.1"] },
    { "id": 36, "tasks": ["15.2"] },
    { "id": 37, "tasks": ["15.3"] },
    { "id": 38, "tasks": ["16.1"] },
    { "id": 39, "tasks": ["16.2"] },
    { "id": 40, "tasks": ["16.3"] },
    { "id": 41, "tasks": ["17.1", "17.2", "17.3"] },
    { "id": 42, "tasks": ["17.4"] },
    { "id": 43, "tasks": ["18.1", "18.2"] }
  ]
}
```
