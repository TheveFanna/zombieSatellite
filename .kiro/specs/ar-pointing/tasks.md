# Implementation Plan: ar-pointing (S3)

## Overview

Build the pointing layer exactly as specified in `design.md`: the pure Pointing_Core under `src/lib/pointing`, the framework-free Pointing_Controllers under `src/components/pointing`, and the single `'use client'` page `src/app/pointing/page.tsx`. Language: TypeScript (strict, ES modules); tests in Vitest, `node` environment.

Ground rules for the implementer:

- `requirements.md` and `design.md` in this folder are the specification. Read the design sections named in each sub-task before writing code. Do not deviate from the module layout, names, signatures, constants and formulas given there. Where design.md and requirements.md differ, requirements.md wins; if you find such a difference, stop and ask.
- The World_Frame is the Scene_Frame of C40 (+X east, +Y up, −Z north). Every vector in code is a `SceneVector`. Never create an East-North-Up vector type; ENU appears only as the local names `east`, `north`, `up` inside `headingPitch` (design "Frames").
- The only lock threshold is `LOCK_TOLERANCE_DEG = 10`, compared as `<= 10 + LOCK_COMPARISON_EPSILON_DEG`. The number 8 must not appear in any lock or alignment role anywhere.
- Tests: plain example assertions only, exactly the cases listed in design.md "Correctness Properties" and "Controller example checks". No fast-check, no extra cases, no scanner self-tests, no negative instrumentation. If design.md seems insufficient, stop and ask instead of extending scope.
- Tests run in the Vitest `node` environment. Do not add jsdom, happy-dom, a React testing library or any other package. `package.json` and `pnpm-lock.yaml` stay unchanged.
- Imports: inside `src/lib/pointing` only relative paths inside that directory; from `src/components/pointing` and the page, relative paths (no `@/` alias, Vitest has none). Tests import the core only through `src/lib/pointing/index`.
- Do not modify anything under `src/lib/orbit`, `src/lib/catalog`, `tests/orbit`, `tests/catalog`, `tests/helpers/source-scan.ts` or `tests/helpers/catalog-source-scan.ts`. The single permitted edit outside this spec's files is task 7.4 in `tests/scaffold/scaffold.test.ts`.
- Test command: `pnpm vitest run <paths>`; full suite: `pnpm test`; typecheck: `pnpm typecheck`; build: `pnpm run build`.
- Tolerance helper: tests compare numbers with `Math.abs(actual - expected) <= tol` through the helper of task 1.6, never with `toBeCloseTo`.
- Commit and push: the main agent commits locally once per top-level task, after that task's tests and `pnpm typecheck` pass, staging files by name (never `git add -A` or `git add .`), then pushes immediately. Never push in the middle of a task. Commit message style: `feat(pointing): <summary> (S3 task N)` or `test(pointing): ...`.
- Execution is serial. Each top-level task depends on the one before it.

## Tasks

- [x] 1. Core types, vectors, attitude chain and heading-source selection
  - Depends on: nothing (first task).
  - [x] 1.1 Create `src/lib/pointing/types.ts` and `src/lib/pointing/constants.ts`
    - Copy the code blocks of design.md "Components and Interfaces > Core types" and "> Core constants" verbatim. `SceneVector` uses the `declare const sceneFrame: unique symbol` brand (D2).
    - No imports in `constants.ts`; `types.ts` imports nothing.
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Create `src/lib/pointing/angles.ts` and `src/lib/pointing/vector.ts`
    - `angles.ts`: `normalizeDeg360(v) = ((v % 360) + 360) % 360`, `wrapDeg180` (design "Lock geometry"), `clamp`, `degToRad`, `radToDeg`.
    - `vector.ts`: internal `sceneVector(x, y, z)` (the only place that casts to `SceneVector`), `dot`, `cross`, `sceneDirection(azDeg, elDeg)` by C43 with R = 1, and `headingPitch(forward)` exactly as design "Frames > Heading and pitch extraction" (horizontal length `< VERTICAL_EPSILON` gives `headingDeg: null`; pitch from `asin(clamp(y, -1, 1))`).
    - _Requirements: 5.5, 5.6, 5.7, 8.2_
  - [x] 1.3 Create `src/lib/pointing/quaternion.ts` (internal)
    - Quaternion `(x, y, z, w)`; `qAxis(axis, rad)`, Hamilton `multiply(a, b)`, `rotate(q, v)` as `q v q*`. Hand-written, no package (Requirement 10.3).
    - _Requirements: 5.1, 10.3_
  - [x] 1.4 Create `src/lib/pointing/attitude.ts`
    - `cameraBasisFromSensor(attitude, screenOrientationDeg, declinationDeg)`: the chain `qAxis(Y, α_eff) ⊗ qAxis(X, β) ⊗ qAxis(Z, −γ) ⊗ qAxis(X, −90°) ⊗ qAxis(Z, −σ)`; `forward`, `up`, `right` by rotating (0, 0, −1), (0, 1, 0), (1, 0, 0) (design "Attitude > The chain").
    - α_eff per design "Effective alpha per Heading_Source" (D3): `'relative'` → α (declination ignored); `'absolute'` → α − D; `'compass'` → h₀(β, γ) − (H + D), where h₀ is `headingPitch` of the chain's forward at α = 0, and h₀ = 0 when that heading is `null`. The compass path never reads alpha.
    - `cameraBasisFromDrag(pose)` and `applyDrag(pose, dxPx, dyPx)` and `INITIAL_DRAG_POSE` per design "Drag basis" and the core function table (drag right raises heading, drag toward the top, dy < 0, raises pitch; pitch clamped to [−90, 90]; heading normalized).
    - _Requirements: 5.1, 5.2, 5.3, 6.3, 6.4, 9.1, 9.2, 12.1, 12.2, 12.3, 12.5_
  - [x] 1.5 Create `src/lib/pointing/heading-source.ts` and `src/lib/pointing/index.ts`
    - `selectHeadingSource`, `HEADING_SOURCE_PRIORITY`, `pickHeadingSource`, `toSensorAttitude` (Valid_Sample per D4: "absolute"/"relative" need alpha, beta, gamma non-null; "compass" needs webkitCompassHeading, beta, gamma; return `null` otherwise, never substitute numbers), `normalizeScreenOrientationDeg` (finite → `normalizeDeg360`, else 0).
    - `index.ts`: barrel exporting the types, constants and the functions of tasks 1.2 to 1.5 listed in design.md "Core functions (barrel exports)". `quaternion.ts` and `sceneVector` stay internal.
    - _Requirements: 1.1, 2.1, 2.2, 4.2, 5.2_
  - [x] 1.6 Create `tests/helpers/pointing-assert.ts`
    - `expectClose(actual: number, expected: number, tol: number)` and `expectVec(actual: {x, y, z}, expected: [number, number, number], tol: number)` using `Math.abs(a - e) <= tol` with a readable failure message. Nothing else.
  - [x] 1.7 Create `tests/pointing/heading-source.test.ts`
    - **Property 2: One heading-source decision.** The five rows of design.md Property 2, one `expect` each.
    - Tag comment: `// Feature: ar-pointing, Property 2: One heading-source decision`.
    - **Validates: Requirements 2.1, 2.3**
  - [x] 1.8 Create `tests/pointing/attitude.test.ts`
    - **Property 3: §4.5 forward baselines** — five rows, 1e-9 per component.
    - **Property 4: Non-zero screen orientation** — each Property 3 row at σ ∈ {90, 180, 270} and σ = `normalizeScreenOrientationDeg(-90)` equals its σ = 0 forward within 1e-9; plus the approved OQ-D3 check: (0, 90, 0) at σ = 90 gives `up` = (1, 0, 0) within 1e-9.
    - **Property 5: §4.5 UI conventions** — via `headingPitch`, 1e-9.
    - **Property 6: Compass with tilt** — attitude `{ source: 'compass', compassHeadingDeg: 45, betaDeg: 120, gammaDeg: 60 }`, σ 0, D 0: forward (0.6846531968814576, 0.25, −0.6846531968814578), heading 45, pitch 14.477512185929925, all within 1e-9.
    - One tag comment per property: `// Feature: ar-pointing, Property N: <title>`.
    - **Validates: Requirements 5.4, 5.8, 5.9, 5.10**
  - [x] 1.9 Verify task 1 and hand over for commit
    - Run `pnpm vitest run tests/pointing/heading-source.test.ts tests/pointing/attitude.test.ts` and `pnpm typecheck`; both must pass. If a baseline row fails, fix the code, never the expected value.
    - Main agent: commit staging `src/lib/pointing/types.ts`, `constants.ts`, `angles.ts`, `vector.ts`, `quaternion.ts`, `attitude.ts`, `heading-source.ts`, `index.ts`, `tests/helpers/pointing-assert.ts`, `tests/pointing/heading-source.test.ts`, `tests/pointing/attitude.test.ts` by name, then push.

- [x] 2. Calibration, lock geometry, marker projection and permission transitions
  - Depends on: task 1.
  - [x] 2.1 Create `src/lib/pointing/calibration.ts`
    - `effectiveAzimuthDeg`, `applyCalibrationInput(previousDeg, input: unknown)` (only `typeof input === 'number' && Number.isFinite(input)` is accepted, then normalized; everything else, including numeric strings, returns `previousDeg`), `stepCalibrationOffset`.
    - _Requirements: 7.1, 7.3, 7.5, 7.8_
  - [x] 2.2 Create `src/lib/pointing/lock.ts`
    - `evaluateLock(forward, target, calibrationOffsetDeg)` exactly as the pseudocode of design "Lock geometry": `azEff`, `u = sceneDirection(azEff, el)`, `errorDeg`, `locked = errorDeg <= LOCK_TOLERANCE_DEG + LOCK_COMPARISON_EPSILON_DEG`, `behind = d < 0`, one `headingPitch(forward)` call for heading, pitch and the `null` Azimuth_Difference.
    - _Requirements: 5.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.1_
  - [x] 2.3 Create `src/lib/pointing/projection.ts`
    - `projectMarker(target, basis, aspect)` per design "Marker projection", `VERTICAL_FOV_DEG` 75. It must not import `lock.ts`. Review only, no test.
    - _Requirements: 10.1, 10.2_
  - [x] 2.4 Create `src/lib/pointing/permission.ts`
    - `permissionTransition(state, event)` implementing exactly the table of design "Permission transitions", including `unavailable + valid-sample-arrived → granted`; every other pair returns `state`.
    - _Requirements: 11.1, 11.4, 11.5, 11.6, 11.7, 11.9, 11.10, 11.13_
  - [x] 2.5 Extend `src/lib/pointing/index.ts` with the exports of tasks 2.1 to 2.4.
  - [x] 2.6 Create `tests/pointing/calibration.test.ts`
    - **Property 8: Calibration sample and normalization** — `effectiveAzimuthDeg(90, 10)` = 80 (1e-9); `20 · sceneDirection(80, 0)` = (19.696155, 0, −3.472964) (1e-6); `applyCalibrationInput(0, -5)` = 355; `applyCalibrationInput(0, -365)` = 355; `effectiveAzimuthDeg(90, -5)` and `effectiveAzimuthDeg(90, 355)` both 95.
    - **Validates: Requirements 7.2, 7.3, 7.4**
  - [x] 2.7 Create `tests/pointing/lock.test.ts`
    - **Property 9: §4.4 target rows** — six axis-aligned rows within 1e-6, three real-data rows within 1e-4 (design Property 9).
    - **Property 10: Lock geometry** — the four target rows and the Vertical_Forward case of design Property 10.
    - **Validates: Requirements 8.9, 8.10**
  - [x] 2.8 Create `tests/pointing/permission.test.ts`
    - **Property 12: Permission transitions** — one table-driven assertion per row of the design table, plus `granted + request-started → granted`.
    - **Validates: Requirements 11.12, 11.13**
  - [x] 2.9 Verify task 2 and hand over for commit
    - Run `pnpm vitest run tests/pointing` and `pnpm typecheck`; both must pass.
    - Main agent: commit staging `src/lib/pointing/calibration.ts`, `lock.ts`, `projection.ts`, `permission.ts`, `index.ts`, `tests/pointing/calibration.test.ts`, `tests/pointing/lock.test.ts`, `tests/pointing/permission.test.ts` by name, then push.

- [ ] 3. WMM2025 declination and the end-to-end correction chain
  - Depends on: task 2 (Property 11 extends `lock.test.ts`).
  - [~] 3.1 Create `src/lib/pointing/wmm2025-cof.ts` (internal)
    - `export const WMM2025_COF = \`...\`;` holding the code block of design.md "Appendix: WMM2025 coefficients" exactly: header line, 90 coefficient rows, two terminator lines. Copy, do not retype.
    - _Requirements: 6.5_
  - [~] 3.2 Create `src/lib/pointing/declination.ts`
    - Parse `WMM2025_COF` once at module load (skip the header, stop at the first line of `9`s; expect exactly 90 rows n = 1..12, m = 0..n; throw at load if not).
    - `declinationDeg(latitudeDeg, longitudeDeg, time: Date | number)`: `RangeError` for non-finite or out-of-range latitude/longitude or a non-finite time; decimal year and clamping to [2025.0, 2030.0] per design "WMM_Validity_Interval and clamping"; altitude 0 km always; synthesis per design "Declination > Algorithm", following the WMM2025 technical report linked there for the Legendre recursion, the field sums and the geodetic rotation.
    - No package, no I/O, no timers.
    - _Requirements: 1.4, 6.1, 6.2, 6.5, 6.6, 6.7, 6.8_
  - [~] 3.3 Extend `src/lib/pointing/index.ts` with `declinationDeg`.
  - [~] 3.4 Create `tests/pointing/declination.test.ts`
    - **Property 7: Declination at the acceptance points** — `declinationDeg(lat, lon, Date.UTC(2026, 10, 15))` within 0.5° of: Beijing (39.9042, 116.4074) −7.5631; Shanghai (31.23, 121.47) −6.55898; Ürümqi (43.83, 87.62) 2.49421; Guangzhou (23.13, 113.26) −3.28683.
    - **Validates: Requirements 6.10**
  - [~] 3.5 Add Property 11 to `tests/pointing/lock.test.ts`
    - **Property 11: End-to-end correction chain** — exactly the setup, expected values and tolerances of design Property 11 (compass 30°, β 90, γ 0, σ 0, Beijing, `Date.UTC(2026, 10, 15)`, offset +10, target (24.4369, 0)).
    - **Validates: Requirements 9.3**
  - [~] 3.6 Verify task 3 and hand over for commit
    - Run `pnpm vitest run tests/pointing` and `pnpm typecheck`; both must pass. If Property 7 fails, fix `declination.ts` against the report; never change the pinned values.
    - Review: record the byte sizes of `wmm2025-cof.ts` and `declination.ts` (source size, an upper bound of the minified size) in the hand-over note; their sum must stay under 30 KB (Requirement 6.6).
    - Main agent: commit staging `src/lib/pointing/wmm2025-cof.ts`, `declination.ts`, `index.ts`, `tests/pointing/declination.test.ts`, `tests/pointing/lock.test.ts` by name, then push.

- [ ] 4. Pointing source-boundary scan
  - Depends on: task 3 (the scan covers every core file).
  - [~] 4.1 Create `tests/helpers/pointing-source-scan.ts`
    - A copy of `tests/helpers/catalog-source-scan.ts` with the root changed to `src/lib/pointing` and the names changed to `PointingSourceViolation`, `listPointingSourceFiles()`, `scanPointingSources()`. Same node handling, same rule (relative path resolving inside the directory). Do not import from or change the S1 or S2 helpers.
    - _Requirements: 1.2, 1.5_
  - [~] 4.2 Create `tests/pointing/source-boundary.test.ts`
    - **Property 1: Pointing source modules stay inside `src/lib/pointing`** — `expect(scanPointingSources()).toEqual([])` plus one sanity assertion that `listPointingSourceFiles()` contains `'index.ts'`. Nothing else.
    - **Validates: Requirements 1.2, 1.5**
  - [~] 4.3 Verify task 4 and hand over for commit
    - Run `pnpm vitest run tests/pointing/source-boundary.test.ts` and `pnpm typecheck`; both must pass.
    - Review checklist (by reading): no file under `src/lib/pointing` references `window`, `document`, `navigator`, `screen`, `localStorage`, `DeviceOrientationEvent`, `setTimeout`, `fetch` or `AbsoluteOrientationSensor` (Requirements 1.3, 1.4, 3.9).
    - Main agent: commit staging `tests/helpers/pointing-source-scan.ts`, `tests/pointing/source-boundary.test.ts` by name, then push.

- [ ] 5. Orientation stream and permission flow controllers
  - Depends on: task 4.
  - [~] 5.1 Create `src/components/pointing/deps.ts`
    - Copy the interfaces of design "Injected interfaces" verbatim. No imports.
    - _Requirements: 13.2_
  - [~] 5.2 Create `src/components/pointing/orientation-stream.ts`
    - `createOrientationStream` exactly per the pseudocode of design "`orientation-stream.ts`": listeners for both event types, No_Sample_Timeout from Subscription start, Selection_Window opened by the first Valid_Sample, lock at window end with `pickHeadingSource`, samples of other sources ignored after lock, silence ignored, hidden ends the Subscription (listeners removed, attitude `null`), visible restarts it if still wanted.
    - Internal `toOrientationSample(event: unknown)`: finite numbers kept, everything else `null`; `absolute === true`; `webkitCompassHeading` only when finite.
    - Uses only the injected `events`, `timers` and `visibility`; no globals.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3_
  - [~] 5.3 Create `src/components/pointing/permission-flow.ts`
    - `createPermissionFlow` exactly per design "`permission-flow.ts`": every change via `permissionTransition`; `start()` never calls the requester; `requestFromGesture()` dispatches `request-started`, starts the 5 s timeout and calls the requester synchronously in the same call; generation check for stale results; a synchronous throw is a `permission-error`; on granted, `stream.start()`; stream callbacks map to `no-sample-timeout` and `valid-sample-arrived`.
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.9, 11.10, 11.13_
  - [~] 5.4 Create `tests/helpers/pointing-mocks.ts`
    - Minimal mocks: an event source with `dispatch(type, fields)` and a listener count per type; a visibility source with `setHidden(boolean)`; a storage over a `Map`; a requester factory returning a never-settling promise or a promise resolving to a given value; `fakeTimerApi()` returning `{ setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h as never) }` for use under `vi.useFakeTimers()`. Nothing else.
  - [~] 5.5 Create `tests/pointing/orientation-stream.test.ts`
    - The rows of design "Controller example checks": relative then absolute in the window; no switch after lock; late first sample; all-null samples only (the desktop Chrome case, including the `onNoSampleTimeout` call at 3000 ms; the flow-state part is covered in 5.6); page hidden and visible; null alpha after a valid sample. Use `vi.useFakeTimers()` and `vi.advanceTimersByTime`.
    - **Validates: Requirements 3.10, 4.4**
  - [~] 5.6 Create `tests/pointing/permission-flow.test.ts`
    - The rows "no request without gesture", "never-settling request" (advance with `vi.advanceTimersByTimeAsync(5000)`), "silent subscription" (no requester, granted, unavailable at 3000 ms), and the flow-state part of "all-null samples only" (state unavailable at 3000 ms).
    - **Validates: Requirements 11.3, 11.7, 11.9, 11.10, 11.12**
  - [~] 5.7 Verify task 5 and hand over for commit
    - Run `pnpm vitest run tests/pointing` and `pnpm typecheck`; both must pass.
    - Main agent: commit staging `src/components/pointing/deps.ts`, `orientation-stream.ts`, `permission-flow.ts`, `tests/helpers/pointing-mocks.ts`, `tests/pointing/orientation-stream.test.ts`, `tests/pointing/permission-flow.test.ts` by name, then push.

- [ ] 6. Calibration store and drag compass controllers
  - Depends on: task 5 (uses `deps.ts` and `pointing-mocks.ts`).
  - [~] 6.1 Create `src/components/pointing/calibration-store.ts`
    - Per design "`calibration-store.ts`": key `zombieSatellite.pointing.calibrationOffsetDeg`; read with `raw === null || raw.trim() === '' ? undefined : Number(raw)` through `applyCalibrationInput(0, ...)`; `set` and `step` persist `String(offset)`.
    - _Requirements: 7.5, 7.6, 7.7, 7.8_
  - [~] 6.2 Create `src/components/pointing/drag-compass.ts`
    - Per design "`drag-compass.ts`": `activate` resets to `INITIAL_DRAG_POSE`; one tracked pointer; moves call `applyDrag` with the pixel deltas; other pointers ignored.
    - _Requirements: 12.1, 12.2, 12.3_
  - [~] 6.3 Create `tests/pointing/calibration-store.test.ts`
    - The "calibration storage" row: empty storage → 0; stored `'abc'` → 0; `step(-5)` from 0 → 355 and the storage holds `'355'`; a new store over the same storage reads 355.
    - **Validates: Requirements 7.9**
  - [~] 6.4 Create `tests/pointing/drag-compass.test.ts`
    - The "drag" row: activate → (0, 0); drag +40 px right → heading 10; from 0, drag −40 px → heading 350; drag 400 px toward the top (clientY decreasing) → pitch 90.
    - **Validates: Requirements 12.6**
  - [~] 6.5 Verify task 6 and hand over for commit
    - Run `pnpm vitest run tests/pointing` and `pnpm typecheck`; both must pass.
    - Main agent: commit staging `src/components/pointing/calibration-store.ts`, `drag-compass.ts`, `tests/pointing/calibration-store.test.ts`, `tests/pointing/drag-compass.test.ts` by name, then push.

- [ ] 7. Session composition, browser binding, `/pointing` page and the scaffold test edit
  - Depends on: task 6.
  - [~] 7.1 Create `src/components/pointing/pointing-session.ts`
    - Per design "`pointing-session.ts`": compose stream, flow, calibration store and drag compass; drag compass activated on entering unavailable or denied and never deactivated automatically; manual toggle; sensor basis only when an attitude exists; Declination for "absolute"/"compass" from the observer and `clock.nowMs()`, recomputed on observer change or UTC date change, previous value kept if `declinationDeg` throws; frozen snapshot per change; `subscribe`/`getSnapshot` for `useSyncExternalStore`. Defaults: observer (39.9042, 116.4074), target (90, 30).
    - Review only, no test.
    - _Requirements: 3.8, 6.3, 6.4, 9.1, 9.2, 11.11, 11.13, 12.4, 12.5_
  - [~] 7.2 Create `src/components/pointing/browser-deps.ts`
    - Per design "`browser-deps.ts`": the only component-layer file touching `window`, `document`, `screen`, `localStorage` and `DeviceOrientationEvent`; `localStorage` wrapped against exceptions; `requestPermission` only when it is a function; no `AbsoluteOrientationSensor`. Declare the `requestPermission` and `webkitCompassHeading` typings locally if `lib.dom` lacks them.
    - _Requirements: 3.9, 11.3, 11.8_
  - [~] 7.3 Create `src/app/pointing/page.tsx`
    - `'use client'`; the session is created in `useEffect` with `browser-deps`; `useSyncExternalStore` for the snapshot; render exactly the items of design "`src/app/pointing/page.tsx`": permission UI per state (the enable button's `onClick` calls `session.requestPermission()` directly; denied shows an error and "Try again"), drag toggle and drag surface (`touch-action: none`, `setPointerCapture`), ±5° buttons, the four numeric inputs with the stated defaults and range checks, the readout, a React 19 `<title>`.
    - No pointing logic in the page, no text about radio signals or beacons, no 8° anywhere.
    - _Requirements: 7.8, 11.8, 12.4, 13.3_
  - [~] 7.4 Edit `tests/scaffold/scaffold.test.ts`, test `1.19` only
    - Change the expected `readdirSync(join(root, 'src', 'app'))` list to `['layout.tsx', 'page.tsx', 'pointing']` and the expected `.tsx` list to `['app/layout.tsx', 'app/page.tsx', 'app/pointing/page.tsx']`. You may update the test title text to name the `/pointing` route. Change nothing else in the file (design D10, OQ-D5).
  - [~] 7.5 Verify task 7 and hand over for commit
    - Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass (the build prerenders `/pointing` without touching browser globals).
    - Review checklist (by reading): the page forwards events only and holds no pointing logic (13.3); display heading, lock and marker read one basis (3.8); the drag compass auto-activates on unavailable/denied and has a manual toggle (11.11, 12.4); no automatic `requestPermission` call on mount (11.3); no 8° constant in `src/lib/pointing`, `src/components/pointing` or the page (8.8).
    - Main agent: commit staging `src/components/pointing/pointing-session.ts`, `browser-deps.ts`, `src/app/pointing/page.tsx`, `tests/scaffold/scaffold.test.ts` by name, then push.

- [~] 8. Final checkpoint
  - Depends on: task 7.
  - Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. Confirm with `git status` and `git diff <base> --stat`, where `<base>` is the commit just before the task 1 commit, that nothing under `src/lib/orbit`, `src/lib/catalog`, `tests/orbit`, `tests/catalog`, `tests/helpers/source-scan.ts`, `tests/helpers/catalog-source-scan.ts`, `package.json` or `pnpm-lock.yaml` changed, and that `tests/scaffold/scaffold.test.ts` changed only in test 1.19.
  - Review pass against requirements.md: Requirement 1.3 and 1.4 (core free of DOM globals and I/O), 6.5 and 6.6 (bundled data, size note from task 3.6), 8.8 (no 8°), 10 (projection independent of the lock), 13.3 (thin page).
  - Hand the Manual_Device_Checklist of design.md "Testing Strategy" (one iPhone pass, one Android pass) to the project owner as a review item; it is not automated and not run by the agent. Ensure all tests pass; ask the user if questions arise.

## Notes

- All test sub-tasks are mandatory: requirements.md "Verification scope" names them as acceptance or controller tests.
- design.md defines Correctness Properties, but Requirement 13.2 asks for plain example assertions; each property is checked by its listed examples, without fast-check.
- The network guard `tests/setup/network-guard.ts` stays active; no S3 test touches the network. Task 3 needs no download: the coefficient text is in design.md.
- All times are UTC; the declination tests use `Date.UTC(2026, 10, 15)`.
- Sub-tasks 2.7 and 3.5 both write `tests/pointing/lock.test.ts`; the serial order handles this.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 7, "tasks": ["8"] }
  ]
}
```

Within each wave the sub-tasks run in the listed order.
