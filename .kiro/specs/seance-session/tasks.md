# Implementation Plan: seance-session (S4)

## Overview

Build the session layer exactly as specified in `design.md`: the pure Session_Core under `src/lib/session`, the framework-free Session_Components under `src/components/session`, and the two `'use client'` pages `src/app/session/page.tsx` and `src/app/session/[noradId]/page.tsx`. Language: TypeScript (strict, ES modules); tests in Vitest, `node` environment.

Ground rules for the implementer:

- `requirements.md` and `design.md` in this folder are the specification. Read the design sections named in each sub-task before writing code. Do not deviate from the module layout, names, signatures, constants and formulas given there. Where design.md and requirements.md differ, requirements.md wins; if you find such a difference, or design.md seems insufficient, stop and ask instead of extending scope.
- Lock: the only lock decision is `LockResult.locked` from the S3 `evaluateLock`. No file of this spec defines a lock threshold or computes acos of a dot product of forward and target vectors.
- Doppler: the audible glide (`dopplerGlideHz`, constants in `beacon.ts`) and the physical shift (`physicalDopplerShiftKhz`, `SPEED_OF_LIGHT_KM_PER_S` in `doppler.ts`) stay in separate modules; neither module imports the other.
- Instants: every engine call receives an explicit instant; no code of this spec calls `Date.now()` or `new Date()` except `browser-deps.ts`, and no Session_Source_Module reads any clock.
- Tests: plain example assertions only, exactly the cases listed in design.md "Correctness Properties". No fast-check, no extra cases, no scanner self-tests, no negative instrumentation. Compare numbers with `expectClose` from `tests/helpers/pointing-assert.ts` (imported, not modified), never with `toBeCloseTo`.
- Tests run in the Vitest `node` environment. Do not add jsdom, happy-dom, a React testing library or any other package. `package.json` and `pnpm-lock.yaml` stay unchanged.
- Imports: inside `src/lib/session` only relative paths inside that directory plus `../orbit/index`, `../catalog/index` and `../pointing/index`; from `src/components/session` and the pages, relative paths (no `@/` alias). Tests import the core only through `src/lib/session/index`.
- Do not modify anything under `src/lib/orbit`, `src/lib/catalog`, `src/lib/pointing`, `src/components/pointing`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/pointing`, `tests/orbit`, `tests/catalog`, `tests/pointing` or the existing files of `tests/helpers`. The single permitted edit outside this spec's own files is task 6.6 in `tests/scaffold/scaffold.test.ts`.
- Copy: every page paragraph that mentions a beacon, a signal or the radio comes from `SESSION_COPY` (D17); page JSX text never contains these words on its own.
- Test command: `pnpm vitest run <paths>`; full suite: `pnpm test`; typecheck: `pnpm typecheck`; build: `pnpm run build`.
- Commit and push: the main agent commits locally once per top-level task, after that task's tests and `pnpm typecheck` pass, staging files by name (never `git add -A` or `git add .`), then pushes immediately. Never push in the middle of a task. The three spec documents and `.config.kiro` are committed with task 1. Commit message style: `feat(session): <summary> (S4 task N)` or `test(session): ...`.
- Execution is serial. Each top-level task depends on the one before it.

## Tasks

- [x] 1. Session_Core foundations: types, transitions, clocks, Doppler readout, statistics and results
  - Depends on: nothing (first task).
  - [x] 1.1 Create `src/lib/session/types.ts` and `src/lib/session/constants.ts`
    - `types.ts`: `SessionPhase`, `SessionEvent`, `TransitionRejection`, `TransitionOutcome` (design "State machine > Identifiers"), `ClockMode`, `SessionResult` (design "Session result > Type"), `ObserverPosition` `{ latitudeDeg, longitudeDeg }`. Type imports only (`NoradId` from `../catalog/index`).
    - `constants.ts`: `DEMO_RATE` 60, `SESSION_TICK_MS` 250, `MAX_HOLD_TICKS` 2, `PASS_SEARCH_HOURS` 24, `PASS_SEARCH_FALLBACK_HOURS` 168, `IN_PROGRESS_LOOKBACK_HOURS` 24, `PASS_MIN_ELEVATION_DEG` 0. No imports.
    - _Requirements: 1.1, 2.1, 3.2, 8.1_
  - [x] 1.2 Create `src/lib/session/transition.ts`
    - Frozen `SESSION_PHASES` and `SESSION_EVENTS`; `sessionTransition(state, event)` with the frozen table of design "Transition function" (9 legal pairs). Every other pair, and any value outside the types, returns `{ ok: false, rejection: { kind: 'transition-rejected', state, event } }`. Never throws.
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 1.3 Create `src/lib/session/clock.ts`
    - `VirtualClockAnchor`, `realInstantMs`, `virtualInstantMs`, `countdownMs` exactly as design "Clocks" (D4: `Math.floor`).
    - _Requirements: 2.7, 3.1, 3.2_
  - [x] 1.4 Create `src/lib/session/doppler.ts`
    - `SPEED_OF_LIGHT_KM_PER_S` 299 792.458, `DopplerReadout`, `physicalDopplerShiftKhz`, `dopplerReadout`, `formatDopplerReadout` as design "Doppler readout" (D16: 2 decimals, `+` for a rounded value ≥ 0 with −0 turned into +0, `−` U+2212 otherwise, then ` kHz`; the marker prints `No documented downlink frequency`). Imports nothing from `beacon.ts`.
    - _Requirements: 5.6, 7.2, 7.3, 7.4_
  - [x] 1.5 Create `src/lib/session/stats.ts` and `src/lib/session/result.ts`
    - `stats.ts`: `LockObservation`, `LockStats`, `EMPTY_LOCK_STATS`, `reduceLockStats`, `closeLockStats`, `maxHoldMsFor` per design "Lock_Statistics_Reducer" (sample-and-hold, each held interval clamped to [0, maxHoldMs], a `lock: null` observation sets `lastLocked = false`).
    - `result.ts`: `SessionResultInput`, `buildSessionResult` (design formulas, `lockedRatio = min(1, …)`), `MAX_STORED_RESULTS` 50, `isSessionResult`, `parseSessionResults` (never throws), `appendSessionResult`, per design "Serialization".
    - _Requirements: 4.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8_
  - [x] 1.6 Create `src/lib/session/format.ts` and `src/lib/session/entry.ts`
    - `format.ts`: `formatUtc` (`YYYY-MM-DD HH:MM:SS UTC` from `toISOString()`), `formatCountdown` (`T−HH:MM:SS`, values ≤ 0 shown as `T−00:00:00`), `formatDurationMin` (rounded whole minutes, C79), `parseCoordinateInput(text, min, max)` (the `/pointing` `parseInRange` rule: empty or out of range gives `null`), `parseStoredObserver(raw)` and `serializeObserver(position)` (design "Observer store").
    - `entry.ts`: `resolvePlayableEntry(raw)` (accepts `^[1-9][0-9]{0,4}$`, then looks the number up in `listPlayableEntries()`; else `null`).
    - _Requirements: 9.4, 9.5, 9.9_
  - [x] 1.7 Create `src/lib/session/index.ts`
    - Barrel exporting the public names of tasks 1.1 to 1.6 listed in design "Components and Interfaces > src/lib/session".
    - Review point for every Session_Source_Module of this and later tasks: no reference to `window`, `document`, `navigator`, `screen`, `localStorage`, `AudioContext` or `webkitAudioContext`, and no network, storage, timer, audio or clock access.
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 1.8 Create `tests/session/transition.test.ts`
    - **Property 2: Full transition table.** An expected-table literal of the 9 legal pairs; loop over all 28 pairs of `SESSION_PHASES` × `SESSION_EVENTS` and assert the next phase or the rejection `{ kind: 'transition-rejected', state, event }`.
    - Tag comment: `// Feature: seance-session, Property 2: Full transition table`.
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.12**
  - [x] 1.9 Create `tests/session/clock.test.ts`
    - **Property 4: Virtual_Clock advance.** With an integer anchor: `virtualInstantMs(anchor, anchor.anchorRealMs) === anchor.anchorSessionMs`, and an advance of d ms (two values of d) moves the result by exactly 60 × d.
    - **Validates: Requirements 3.2, 3.11**
  - [x] 1.10 Create `tests/session/doppler.test.ts`
    - **Property 11: Physical Doppler vectors.** `dopplerReadout(145.9775, -2.1094)` is a shift within 0.01 of 1.03; `dopplerReadout(145.9775, 2.6384)` within 0.01 of −1.28; `dopplerReadout(null, 1)` equals `{ kind: 'no-frequency' }`.
    - **Validates: Requirements 7.2, 7.4, 7.7**
  - [x] 1.11 Create `tests/session/result.test.ts`
    - **Property 12: Statistics fixture.** Fold the five observations of design "Lock_Statistics_Reducer" with `maxHoldMs` 100 000, close at 1 600 000, build with the fixture pass (`riseMs` 1 000 000, `setMs` 1 600 000, `maxElevationDeg` 42), `completed: true`, `mode: 'demo'`; assert the whole Session_Result: `lockedSeconds` 300, `lockedRatio` 0.5, `bestPointingErrorDeg` 3, `autoPointUsed` true, `aosMs` 1 000 000, `losMs` 1 600 000, `maxElevationDeg` 42, `noradId`, `completed`, `mode`.
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.10**
  - [x] 1.12 Verify task 1 and hand over for commit
    - Run `pnpm vitest run tests/session` and `pnpm typecheck`; both must pass. If a fixture fails, fix the code, never the expected value.
    - Main agent: commit staging `.kiro/specs/seance-session/.config.kiro`, `.kiro/specs/seance-session/requirements.md`, `.kiro/specs/seance-session/design.md`, `.kiro/specs/seance-session/tasks.md`, `src/lib/session/types.ts`, `constants.ts`, `transition.ts`, `clock.ts`, `doppler.ts`, `stats.ts`, `result.ts`, `format.ts`, `entry.ts`, `index.ts`, `tests/session/transition.test.ts`, `clock.test.ts`, `doppler.test.ts`, `result.test.ts` by name, then push.

- [x] 2. Beacon state and Auto_Point
  - Depends on: task 1.
  - [x] 2.1 Create `src/lib/session/auto-point.ts`
    - The `AUTO_POINT_*` constants, `Jitter`, `drawJitter(u1, u2, u3)` and `offsetDirection(target, jitter)` exactly as design "Auto_Point" (excursion when u2 < 0.1; wobble `1 + 7·u1`; excursion `12 + 8·u1`; bearing `360·u3`; great-circle destination with elevation as latitude and azimuth as longitude, azimuth normalized to [0, 360)). Type import of `TargetDirection` from `../pointing/index`; no lock threshold, no dot product.
    - _Requirements: 4.3, 4.5, 4.6_
  - [x] 2.2 Create `src/lib/session/beacon.ts`
    - The constants of design "Beacon > Constants", `BeaconSoundMode`, `BeaconInputs` (no status input, DQ-1), `BeaconState`, `signalQuality`, `dopplerGlideHz`, `tumbleEnvelope`, `beaconState`, `SILENT_BEACON_STATE` (frozen, 700 Hz, all gains 0), with the formulas of design "Signal_Quality", "Carrier frequency and Doppler_Glide", "Mode selection" and "Gains" (non-negative `mod` for phases). Imports nothing from `doppler.ts`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_
  - [x] 2.3 Extend `src/lib/session/index.ts` with the exports of tasks 2.1 and 2.2.
  - [x] 2.4 Create `tests/session/auto-point.test.ts`
    - **Property 6: Jitter distribution.** `drawJitter` at (0, 0.5, 0), (0.999, 0.5, 0.25), (0, 0.05, 0.5) and (0.999, 0.05, 0.75) gives the offsets and bearings of the design formulas (wobble below 8°, excursion below 20°); for targets (azimuth 30°, elevation 0°) and (azimuth 200°, elevation 80°), `evaluateLock(sceneDirection(dir.azimuthDeg, dir.elevationDeg), target, 0)` (imported from `src/lib/pointing/index`) has `pointingErrorDeg` within 1e-6 of `offsetDeg`, `locked` true for a wobble and false for an excursion.
    - **Validates: Requirements 4.6, 4.8**
  - [x] 2.5 Create `tests/session/beacon.test.ts`
    - **Property 8: Beacon state shape.** Exactly the bullet list of design Property 8: the q anchors, `signalQuality(null)` and monotonicity over 0°, 5°, …, 45°; 700 Hz at range rate 0 and the glide direction at −3 and +3 km/s; the LES-1 envelope period, bounds, value 1 at t = 0 and 0.1 at t = 2; IMAGE `ticks` with carrier gain 0 over a small grid; the four beacon-shape examples (AO-7, Transit 5B-5, Prospero, IMAGE) with the phases and values listed there, using the entries from `getCatalogEntry`.
    - **Validates: Requirements 5.2, 5.4, 5.5, 5.7, 5.8, 5.9, 5.13, 5.14**
  - [x] 2.6 Verify task 2 and hand over for commit
    - Run `pnpm vitest run tests/session` and `pnpm typecheck`; both must pass.
    - Main agent: commit staging `src/lib/session/auto-point.ts`, `beacon.ts`, `index.ts`, `tests/session/auto-point.test.ts`, `tests/session/beacon.test.ts` by name, then push.

- [x] 3. Source-boundary scan for `src/lib/session`
  - Depends on: task 2.
  - [x] 3.1 Create `tests/helpers/session-source-scan.ts`
    - Modelled on `tests/helpers/pointing-source-scan.ts`, with root `src/lib/session`. Allowed: a `./` or `../` specifier that resolves inside `src/lib/session`, or resolves exactly to `src/lib/orbit/index`, `src/lib/catalog/index` or `src/lib/pointing/index`. Same node kinds as the S3 scanner. Exports `listSessionSourceFiles` and `scanSessionSources`.
    - _Requirements: 1.2, 1.5_
  - [x] 3.2 Create `tests/session/source-boundary.test.ts`
    - **Property 1: Session source modules stay inside their boundary.** Two assertions as in the S3 test: `index.ts` is among the files, and the scan returns `[]`.
    - **Validates: Requirements 1.2, 1.5**
  - [x] 3.3 Verify task 3 and hand over for commit
    - Run `pnpm vitest run tests/session` and `pnpm typecheck`; both must pass.
    - Main agent: commit staging `tests/helpers/session-source-scan.ts`, `tests/session/source-boundary.test.ts` by name, then push.

- [x] 4. Component foundations: injected interfaces, pass finder, audio binding and beacon player
  - Depends on: task 3.
  - [x] 4.1 Create `src/components/session/deps.ts`
    - `NoiseSource`, the `Audio*Like` interfaces and `AudioContextFactory` exactly as design "Injected audio interfaces", and `SensorPointing` as design "Sensor_Pointing" (a `Pick` of the S3 `PointingSession`).
    - _Requirements: 6.6, 11.2_
  - [x] 4.2 Create `src/components/session/pass-finder.ts`
    - `PassSearchOutcome` and `findTargetPass(tle, observer, nowMs, mode)` following steps 1 to 5 of design "Pass selection" (24 h then 168 h; demo skips `startTruncated`; real-time lookback search from `nowMs − 24 h` over 48 h; `endTruncated` repeat search from `riseMs` over 168 h; minimum elevation 0°). Engine exceptions propagate. Review only, no own test (it runs inside the controller tests of task 5).
    - _Requirements: 3.3, 3.5, 3.7, 3.8, 3.9_
  - [x] 4.3 Create `src/components/session/audio-binding.ts`
    - `AudioBinding`, `createAudioBinding(ctx, noise)` and its constants per design "Node graph": build the graph once, set initial values through `.value` (no automation call while building), fill the 2 s noise buffer with `2 · noise.next() − 1`, start the oscillator and the noise source; `apply` makes exactly the five `setTargetAtTime` calls of the design table; `setMaster` makes exactly one call, on the Master_Gain; `dispose` stops, disconnects and closes, swallowing errors.
    - _Requirements: 6.1, 6.2, 6.3, 6.7_
  - [x] 4.4 Create `src/components/session/beacon-player.ts`
    - `AudioStatus`, `BeaconPlayer`, `createBeaconPlayer(deps)` and its constants per design "Scheduling": the factory is called only by the first `enableFromGesture()`; `resume()` only there; the 25 ms scheduler applies `stateAt(t − origin)` on the 20 ms grid up to 100 ms ahead, skipping forward when behind; `stop()` applies `SILENT_BEACON_STATE` at `currentTime()`. Review only, no own test.
    - _Requirements: 5.11, 5.12, 6.2, 6.4, 6.8, 6.9_
  - [x] 4.5 Create `src/components/session/browser-deps.ts` with `createAudioContextFactory(globals)` only
    - Prefer `globals.AudioContext`, fall back to `globals.webkitAudioContext`, else a factory returning `null`; the returned factory constructs a new context on each call and casts it to `AudioContextLike`. No other export yet (task 6 adds the dependency builders).
    - _Requirements: 6.5, 6.9_
  - [x] 4.6 Create `tests/helpers/session-mocks.ts` with the audio mocks
    - A recording mock audio context implementing `AudioContextLike`: every `AudioParamLike` logs its `setTargetAtTime` calls as `[target, startTime, timeConstant]`, nodes are reachable by role for assertions, `currentTime` is settable; a counting `AudioContextFactory`; a scripted `NoiseSource` that returns a given list in order and then repeats its last value. Task 5 adds the other mocks.
  - [x] 4.7 Create `tests/session/audio-binding.test.ts`
    - **Property 9: Audio binding applies the state.** Exactly design Property 9: one `apply(state, 1.5)` call checked on all five parameters (values and time constants of the design table), then `setMaster(true, 0.7)` and `setMaster(false, 0.4)` each adding exactly one Master_Gain call (0 and 0.4) and no call elsewhere.
    - **Property 10 (factory part):** `createAudioContextFactory({ webkitAudioContext: MockCtor })()` returns a `MockCtor` instance.
    - **Validates: Requirements 6.2, 6.3, 6.5, 6.7, 6.10, 6.11, 6.12**
  - [x] 4.8 Verify task 4 and hand over for commit
    - Run `pnpm vitest run tests/session` and `pnpm typecheck`; both must pass.
    - Main agent: commit staging `src/components/session/deps.ts`, `pass-finder.ts`, `audio-binding.ts`, `beacon-player.ts`, `browser-deps.ts`, `tests/helpers/session-mocks.ts`, `tests/session/audio-binding.test.ts` by name, then push.

- [x] 5. Stores and the Session_Controller
  - Depends on: task 4.
  - [x] 5.1 Create `src/components/session/result-store.ts`
    - `RESULT_STORAGE_KEY` `zombieSatellite.session.results`, `createResultStore(storage)` with `append` (read, `appendSessionResult`, write; storage errors swallowed) and `readSessionResults(storage)` (never throws), per design "Serialization and Result_Store".
    - _Requirements: 8.6, 8.7, 8.8_
  - [x] 5.2 Create `src/components/session/observer-store.ts`
    - `OBSERVER_STORAGE_KEY` `zombieSatellite.session.observer`, `createObserverStore(storage)` with `get()` (stored value through `parseStoredObserver`, else the S3 `DEFAULT_OBSERVER`) and `set(position)` (validates, writes, swallows storage errors, returns whether it was accepted).
    - _Requirements: 9.5_
  - [x] 5.3 Create `src/components/session/session-controller.ts`
    - `SessionControllerDeps`, `SessionActionResult`, `DemoPointing`, `SessionSnapshot`, `SessionController` and `createSessionController(deps, entry)` exactly as design "Session_Controller": every phase change through `sessionTransition`; rejections returned and stored in `lastRejection`; starts check the event first, await the TLE (refetch after a failure), search with `findTargetPass`, then dispatch; demo anchor at the search reading and `riseMs`; `pick` or `join` by `riseMs > now`; the 250 ms tick with both AOS and LOS checks per tick; sampling with `observeAt` at the Session_Instant and the three Pointing_Sources (Auto_Point draws three Noise_Source values per tick and calls `evaluateLock(sceneDirection(…), target, 0)`); `reduceLockStats` with `maxHoldMsFor(mode)`; completion with `closeLockStats`, `buildSessionResult` and `resultStore.append`; `abort()` runs the tick checks first; `readCountdownMs()` reads the clock on every call; `enableAudio()` is the only path to the Beacon_Player's `enableFromGesture`; `stateAt` calls `beaconState` with the latest inputs; `dispose()` per design.
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.10, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 5.12, 6.4, 6.8, 7.6, 7.8, 8.6, 8.7_
  - [x] 5.4 Extend `tests/helpers/session-mocks.ts` with the controller mocks
    - A manual clock (`nowMs`, `advance(ms)`); manual timers implementing `TimerApi` whose `fireAll()` runs once the callbacks pending at the call (callbacks scheduled during the run wait for the next call); a mock TLE fetcher per design "Testing Strategy" (the ISS Baseline_TLE_Snapshot with columns 3 to 7 of both lines replaced by the requested NORAD ID zero-padded to five digits, parsed with `parseTle`); a stub `SensorPointing` (snapshot with `lock: null`, no-op methods). Storage comes from `createMockStorage` in `tests/helpers/pointing-mocks.ts`, imported, not modified.
  - [x] 5.5 Create `tests/session/session-controller.test.ts`
    - Setup per design "Testing Strategy": the AO-7 entry, the clock at 2026-11-09T11:00:00Z, the Reference_Observer (default), the mocks of 4.6 and 5.4; expected pass values are read from the snapshot.
    - **Property 3: Countdown derived from the clock** — `startRealTime()` resolves to awaiting-pass; after `clock.advance(5000)` with no `fireAll()`, `readCountdownMs()` is exactly 5000 smaller.
    - **Property 5: Demo jump to AOS** — `startDemo()` resolves to in-pass; `sessionInstantMs === targetPass.riseMs` and `targetPass.startTruncated === false` with no clock advance.
    - **Property 7: Auto_Point locks come from evaluateLock** — with a scripted Noise_Source, `snapshot.lock` deep-equals `evaluateLock(sceneDirection(dir.azimuthDeg, dir.elevationDeg), snapshot.target, 0)` for `dir = offsetDirection(snapshot.target, drawJitter(u1, u2, u3))`.
    - **Property 10 (controller part)** — the counting factory stays at 0 calls through `startDemo()`, `fireAll()`, `abort()` and `newSession()`, and is at 1 after `enableAudio()`.
    - **Property 13: Results persisted at LOS and on Abort** — demo, advance past `(setMs − riseMs) / 60` ms, `fireAll()`: one record with `completed: true`, `losMs === setMs`, `mode: 'demo'`; then `newSession()`, `startDemo()`, `abort()`: a second record with `completed: false` and `losMs` equal to the abort Session_Instant; `readSessionResults` returns both.
    - One tag comment per property: `// Feature: seance-session, Property N: <title>`.
    - **Validates: Requirements 2.7, 2.13, 3.4, 3.12, 4.3, 4.9, 6.4, 6.11, 8.6, 8.7, 8.8, 8.11**
  - [x] 5.6 Verify task 5 and hand over for commit
    - Run `pnpm vitest run tests/session` and `pnpm typecheck`; both must pass.
    - Main agent: commit staging `src/components/session/result-store.ts`, `observer-store.ts`, `session-controller.ts`, `tests/helpers/session-mocks.ts`, `tests/session/session-controller.test.ts` by name, then push.

- [x] 6. Picker controller, browser dependencies, copy, pages and the scaffold checks
  - Depends on: task 5.
  - [x] 6.1 Create `src/components/session/picker-controller.ts`
    - `PickerRow`, `PickerSnapshot`, `createPickerController(deps)` per design "Picker controller": five TLE fetches in parallel, rows by `findTargetPass(…, 'real')` with `inProgress = pass.riseMs ≤ now`, observer through the observer store, `retry` for failed rows, `dispose`. Review only, no own test.
    - _Requirements: 9.3, 9.5_
  - [x] 6.2 Complete `src/components/session/browser-deps.ts`
    - Add `createSessionBrowserDeps(pointing)` and `createPickerBrowserDeps()` per design "Browser dependencies": one clock `{ nowMs: () => Date.now() }`, the TLE fetcher created with `createTleFetcher({ now: clock.nowMs })`, bound window timers, a local try/catch `localStorage` wrapper, `Math.random` as Noise_Source, `createAudioContextFactory(window)`.
    - _Requirements: 3.3, 6.5, 6.6_
  - [x] 6.3 Create `src/components/session/copy.ts`
    - Frozen `SESSION_COPY` with exactly the keys and texts of design "Copy module", including `statusLabels` keyed by `EntryStatus`. One string per paragraph.
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 6.4 Create `src/app/session/page.tsx` (route `/session`)
    - `'use client'` page per design "Pages > /session": controller in `useEffect` with `createPickerBrowserDeps()`, `useSyncExternalStore` with a frozen neutral server snapshot, observer inputs with `parseCoordinateInput` and the `/pointing` inline message, one row per entry with status label, sunlit badge, UTC pass times, "in progress" marking, failure note with retry, and a link to `/session/{noradId}`. No catalog prose, no engine call.
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.9, 9.10, 10.6_
  - [x] 6.5 Create `src/app/session/[noradId]/page.tsx` (route `/session/[noradId]`)
    - `'use client'` page per design "Pages > /session/[noradId]" and its seven sections: `useParams<{ noradId: string }>()` and `resolvePlayableEntry`; the not-playable message with a link to `/session`; the S3 pointing session and the Session_Controller created in `useEffect` and disposed on unmount; start handlers call `controller.enableAudio()` first, synchronously; Countdown from `snapshot.countdownMs`; Doppler_Readout in in-pass only; auto/manual switch in demo; the S3 controls in real time; result as plain values; audio controls; footer notice. No engine call, no `beaconState` call.
    - _Requirements: 4.4, 6.4, 6.7, 6.9, 7.1, 7.3, 7.4, 7.5, 7.8, 8.9, 9.1, 9.2, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 10.1, 10.6_
  - [x] 6.6 Extend `tests/scaffold/scaffold.test.ts`
    - **Property 14: Session copy honesty and routes.** Check 1.19: `src/app` lists `['layout.tsx', 'page.tsx', 'pointing', 'session']`, and the `.tsx` list adds `app/session/[noradId]/page.tsx` and `app/session/page.tsx`. `checkedTexts()`: add the JSX texts of `session/page.tsx` and `session/[noradId]/page.tsx`, and the property-assignment string values of `src/components/session/copy.ts`, so checks 1.24 and 1.25 cover them. `APP_FILES` stays unchanged.
    - **Validates: Requirements 10.1, 10.2, 10.5, 10.7**
  - [x] 6.7 Verify task 6 and hand over for commit
    - Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. If check 1.24 or 1.25 fails, fix the copy or move the text into `SESSION_COPY`, never the check.
    - Main agent: commit staging `src/components/session/picker-controller.ts`, `browser-deps.ts`, `copy.ts`, `src/app/session/page.tsx`, `src/app/session/[noradId]/page.tsx`, `tests/scaffold/scaffold.test.ts` by name, then push.

- [x] 7. Final checkpoint and review items
  - Depends on: task 6.
  - [x] 7.1 Run `pnpm test`, `pnpm typecheck` and `pnpm run build` once more on the final tree; all must pass. Report any failure instead of changing tests. Confirm that every test of this spec is a `tests/**/*.test.ts` file in the `node` environment, runs offline under the network guard, and is one of Properties 1 to 14.
    - _Requirements: 11.1, 11.3, 11.4_
  - [x] 7.1b Add a `joined` field to `SessionSnapshot` and tighten the join note (approved addition after review)
    - `SessionSnapshot.joined: boolean` is set by the Session_Controller when it dispatches `join` (a real-time session that joins a pass in progress) and cleared by `newSession()`, by an abort in awaiting-pass and on dispose; it is false in every other case. Update the `SessionSnapshot` code block in design.md "Controllers > Session_Controller" accordingly. The page `src/app/session/[noradId]/page.tsx` reads `snapshot.joined` directly (and its neutral server snapshot gets `joined: false`); delete the `useRef`/`useEffect`/`joined` state derivation from the page.
    - Add one controller-level assertion to `tests/session/session-controller.test.ts` (approved addition, outside Properties 1 to 14): a real-time start while the first pass is in progress gives `joined === true` with phase in-pass, a start that waits for AOS gives `joined === false`, and `newSession()` clears it. Keep the existing cases unchanged.
    - _Requirements: 2.3, 9.2_
  - [x] 7.2 Manual_Listening_Check (review item, done by the project owner on a phone): follow design "Testing Strategy > Manual_Listening_Check" for `/session/1002` (LES-1) and `/session/26113` (IMAGE). Present the checklist to the project owner and record the outcome they report; do not automate it.
    - _Requirements: 11.5_
    - Outcome (project owner, real phone): passed. AO-7 CW keying, LES-1 tumble envelope (about 4 s swell and fade), IMAGE sparse ticks, and mute stopping the sound immediately were all correct.
  - [x] 7.3 Mark every task of this file complete and hand over for commit
    - Main agent: commit staging `.kiro/specs/seance-session/tasks.md` by name with `docs(session): mark seance-session tasks complete (S4 task 7)`, then push.

## Notes

- Requirement coverage: every acceptance criterion of `requirements.md` is listed under at least one sub-task; the criteria not listed under a test sub-task are checked by review (requirements "Verification scope").
- Tests are only those of design.md "Correctness Properties" (Properties 1 to 14), including the approved additions OQ-14 (a) to (f): (a) Property 7, (b) Property 10, (c) Property 9, (d) Property 13, (e) Property 3, (f) Property 8.
