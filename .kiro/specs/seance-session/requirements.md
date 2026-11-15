# Requirements Document

## Introduction

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). Users pick a real "zombie satellite" from a fixed catalog, the app predicts its passes over the user's location from public TLE data (SGP4), points the phone at the satellite in AR during a pass, plays a simulated beacon whose pitch follows the Doppler shift, and issues a digital QSL card after the pass. The primary audience is amateur radio and satellite listeners (SWL and SDR hobbyists); for them the app is a finding, pointing and Doppler-math aid, and a 60x demo mode is the entry point for newcomers. The app is pure software: only the public orbital data is real, and the app receives no real radio-frequency signals.

This spec, seance-session (S4), delivers the session layer: the user picks a playable satellite, waits for or joins its pass, tracks it while a simulated beacon sounds, and receives a Session_Result when the pass ends. It has two parts:

1. The Session_Core: framework-free pure functions under `src/lib/session` for the session state transitions, the Session_Clock arithmetic (real and virtual), the Countdown, the Auto_Point direction synthesis, the Beacon_State_Function, the Doppler_Readout, and the Session_Result type, statistics and serialization.
2. The Session_Components under `src/components/session`: framework-free Session_Controllers that perform the side effects (timers, engine calls, TLE fetching, pointing input, audio, storage) with injected dependencies, the Audio_Binding, and the thin Session_Page and Satellite_Picker.

The orbit-engine (S1), zombie-catalog (S2) and ar-pointing (S3) specs have landed. This spec changes none of their source files. It consumes these interfaces as landed:

- S1, `src/lib/orbit`: `createTleFetcher` and its `TleFetcher.fetchTle(noradId)`, which resolves with a `TleRecord`; `createSatrec(tle)`; `observeAt(satrec, instant, observer)` returns an `ObservationResult` whose success case carries `lookAngles` (`azimuthDeg`, `elevationDeg`, `slantRangeKm`) and `rangeRateKmPerS` (negative while the satellite approaches, positive while it recedes); `predictPasses(search)` returns `Pass` objects `{ riseMs, peakMs, setMs, maxElevationDeg, durationMin, startTruncated, endTruncated }`, every instant an integer number of ms UTC. Every engine call takes an explicit instant.
- S2, `src/lib/catalog`: `getCatalogEntry(noradId)`, `listPlayableEntries()`, the `BeaconBlock` fields `downlinkMhz`, `displayFrequency`, `beaconMode`, `tumblePeriodS`, `sunlitOnly`, and `EntryStatus`.
- S3, `src/lib/pointing` and `src/components/pointing`: `evaluateLock` and `LockResult`, `LOCK_TOLERANCE_DEG` (10°), `sceneDirection`, `cameraBasisFromDrag`, `createPointingSession(deps)` and its `PointingSession`, `DEFAULT_OBSERVER`, `createDragCompass`, and the injected interfaces of `src/components/pointing/deps.ts` (`Clock`, `TimerApi`, `KeyValueStorage`, `EventSourceLike`).

The beacon shapes of the five Playable_Entries, cited from `src/lib/catalog/entries.ts` as landed (not re-verified here):

| Entry | NORAD | status | downlinkMhz | displayFrequency | beaconMode | tumblePeriodS | sunlitOnly |
|---|---|---|---|---|---|---|---|
| LES-1 | 1002 | still-transmitting | 237 | about 237 MHz | null | 4 | null |
| Transit 5B-5 | 965 | still-transmitting | 136.65 | 136.65 MHz | telemetry | null | true |
| AO-7 | 7530 | semi-operational | 145.9775 | 145.9775 MHz | cw-beacon | null | true |
| Prospero | 5580 | unconfirmed | 137.56 | 137.56 MHz (historical) | null | null | null |
| IMAGE | 26113 | silent-again | null | null | telemetry | null | null |

### Normative sources

- Sections 2 (conventions) and 4 (numeric baselines) of the Reference_Document are normative. Its header states that the features it does not contain, among them range rate and Doppler, the WebAudio beacon, the session state machine and the QSL card, are governed by the spec requirements; this document governs them for S4. This spec relies on C01 (every propagation instant is a UTC instant), C79 (pass duration = (set − rise) / 60 000 min), C80 (minimum elevation 0° for pass search) and C81 (default search window 24 h). No section 3 item applies to this spec.
- Lock: the only lock definition of the project is the S3 lock geometry: `LockResult.locked` is true when the Pointing_Error is at most `LOCK_TOLERANCE_DEG` (10°). This spec defines no lock threshold of its own and does not reimplement the lock geometry.
- Times: all instants are UTC (project rule). C03 (times displayed in the browser's local time zone) conflicts with the project rule and is superseded for the S4 pages: displayed instants are UTC and marked as UTC (Requirement 9, criterion 9). Local-time display is deferred to S6.
- Catalog facts: the S2 catalog values and Section 2 of `docs/reference/POSITIONING_AND_STORY.md`. IMAGE was rediscovered in January 2018, its signal weakened in February 2018 and has been lost since August 2018; its session copy and beacon treatment follow that status.
- The Doppler acceptance vectors of Requirement 7, criterion 7 are normative fixtures given by the project owner. They are cited as given and are not re-derived or re-verified in the requirements phase; the acceptance tests of the implementation phase verify them.
- S1 Requirement 1, criterion 11 (every test file runs in the Vitest `node` environment) stays in force; no DOM test environment is added.
- S1 Requirement 1, criterion 19, as extended by S3, limits `src/app` to the root layout, the placeholder page and the `/pointing` route. This spec adds the S4 route files (Requirement 10, criterion 7).

### Verification scope

The automated tests of this spec run in the Vitest `node` environment. They are unit tests over the Session_Core and mock-based tests of the Session_Controllers and the Audio_Binding. They cover:

- Session_Core: the Source_Boundary_Scan (Requirement 1); every pair of the Transition_Table, including every illegal pair (Requirement 2); the Virtual_Clock advance (Requirement 3); the Auto_Point Jitter distribution (Requirement 4); Signal_Quality at both anchors and its monotonicity, the pinned Audible_Base_Frequency, the Doppler_Glide direction, the Tumble_Envelope period and bounds, the Tick_Mode state shape, and the Beacon_State for every beacon shape of the catalog (Requirement 5); the Doppler acceptance vectors and the no-frequency case (Requirement 7); a hand-computable Session_Result statistics fixture (Requirement 8).
- Session_Components, with mocks: the demo jump to AOS (Requirement 3); the Countdown following a Real_Clock advance without a tick (Requirement 2); Auto_Point Lock_Results coming from `evaluateLock` (Requirement 4); the audio context created only from the gesture entry, and the `webkitAudioContext` fallback (Requirement 6); the Audio_Binding against a mock audio context, including mute and volume acting on the Master_Gain only, without producing real sound (Requirement 6); Session_Results written through `KeyValueStorage` at LOS and on Abort (Requirement 8).
- The extended Honesty_Scan and the extended route check of the S1 scaffold test (Requirement 10).

The React components of the Session_Page and the Satellite_Picker are checked by review only. The Manual_Listening_Check is a review item, not an automated test. Criteria not named here are checked by review.

Criteria marked "approved addition (OQ-n)" are acceptance cases or outputs outside the original brief that the project owner approved during requirements refinement.

### Out of scope

- QSL card rendering and the QSL collection UI (S5). This spec defines, persists and reads back the Session_Result only.
- The app shell, navigation from the home page, PWA and deployment (S6). No link to the S4 pages is added to `src/app/page.tsx`, which is an S1 source.
- A camera view with live video and a drawn marker (OQ-15: moves to S6).
- Local-time display of instants (S6).
- Any change to the source files of S1, S2 or S3.
- Browser geolocation; it requires the project owner's approval before it is added.
- An eclipse or sunlight model (Known limitation 1).
- Any real radio reception, recording or decoding; satellite search, a user satellite library, a custom backend API.
- A Doppler curve chart, audio recording or export, pausing the Virtual_Clock, any demo rate other than 60, and persisting the mute and volume settings.
- A DOM test environment (jsdom, happy-dom) and React component tests.

### Known limitations

1. The Orbit_Engine has no eclipse model. Transit 5B-5 and AO-7 (`sunlitOnly: true`) transmit only in sunlight in reality, but the simulated beacon sounds during every pass, sunlit or not. `sunlitOnly` is shown as information only and never gates the beacon, the session flow or audibility (Requirement 9, criterion 6).
2. The pitch glide of the simulated beacon is a scaled, artistic mapping of the range rate into the audible range. It is not the physical Doppler shift; the Physical_Doppler_Shift appears only in the Doppler_Readout.
3. The Doppler_Readout uses the catalog's `downlinkMhz` as f0. For LES-1 this is the rounded value of "about 237 MHz", and for Prospero it is the historical downlink of "137.56 MHz (historical)"; the computed shift inherits these qualifiers. IMAGE has no documented downlink frequency, so it has no Doppler figure.
4. In demo mode a pass of N minutes plays in N / 60 minutes. IMAGE's highly elliptical orbit gives long passes, so a demo of an IMAGE pass of H hours takes about H minutes (OQ-3).
5. A real-time session that joins a pass in progress records Lock_Samples only from the join instant, while the locked ratio divides by the full pass duration (OQ-2, OQ-4), so a late join cannot reach a locked ratio of 1.

## Glossary

- **Session_Core**: The framework-free pure functions delivered by this spec under `src/lib/session`.
- **Session_Source_Module**: A module under `src/lib/session`. Test files and test helpers are not Session_Source_Modules.
- **Session_Components**: The component layer delivered by this spec under `src/components/session`: the Session_Controllers, the Audio_Binding, the stores, the browser dependency builder and the copy module.
- **Session_Controller**: A framework-free component-layer module that performs side effects and feeds their results to the Session_Core. A Session_Controller imports no React and receives every side-effect source (Real_Clock, timers, storage, the TLE fetcher, the Noise_Source, the Audio_Context_Factory, the S3 pointing session) as an injected parameter, following `src/components/pointing/deps.ts` and the factory pattern of `createPointingSession(deps)`.
- **Session_Page**: The page that runs one session for one Playable_Entry, at the route `/session/[noradId]` (OQ-12).
- **Satellite_Picker**: The page at the route `/session` (OQ-12) that lists the Playable_Entries with each entry's Next_Pass and links to their Session_Pages.
- **Orbit_Engine**, **Zombie_Catalog**, **Pointing_Core**, **Pointing_Components**: The landed S1, S2 and S3 layers listed in the Introduction.
- **Reference_Document**: `docs/reference/TECHNICAL_ROUTE.md`, the trimmed technical route of the author's earlier personal project SatAware AR.
- **Playable_Entry**: A catalog entry returned by `listPlayableEntries()`.
- **Reference_Observer**: Latitude 39.9042° N, longitude 116.4074° E, altitude 0 km (Reference_Document section 4.1), the S3 `DEFAULT_OBSERVER` position.
- **Session_Observer**: The S1 `Observer` used by a session: latitude and longitude from the observer inputs, altitude 0 km.
- **Session_State**: One of the four states of the session state machine: selecting (no pass chosen), awaiting-pass (Countdown to AOS), in-pass (tracking) and completed (LOS reached or session aborted in in-pass, Session_Result produced). The design fixes the identifiers.
- **Session_Event**: One of the seven events of the Transition_Table: Pick, Join, Start_Demo, AOS_Reached, LOS_Reached, Abort and New_Session. The design fixes the identifiers.
- **Session_Transition_Function**: The pure function of the Session_Core that maps a Session_State and a Session_Event to the next Session_State or to a Transition_Rejection.
- **Transition_Rejection**: The typed result of the Session_Transition_Function for a pair that the Transition_Table does not list. It identifies the rejected state and event.
- **Transition_Table**: The table of Requirement 2, criterion 3.
- **Target_Pass**: The S1 `Pass` that a session follows, with its true `riseMs` and `setMs` (Requirement 3, criteria 8 and 9).
- **AOS**: The `riseMs` of the Target_Pass.
- **LOS**: The `setMs` of the Target_Pass.
- **Next_Pass**: For a Playable_Entry, the Session_Observer and a Clock_Mode, the pass that Requirement 3, criteria 7 to 9 select from `predictPasses` results with minimum elevation 0° (C80).
- **Clock_Mode**: `real` (real-time) or `demo`.
- **Real_Clock**: The injected system clock, the S3 `Clock` interface (`nowMs()`).
- **Virtual_Clock**: A pair of anchors (Anchor_Real_Instant, Anchor_Session_Instant) and the Demo_Rate. At the Real_Clock instant r it gives the instant Anchor_Session_Instant + Demo_Rate × (r − Anchor_Real_Instant).
- **Demo_Rate**: 60.
- **Session_Clock**: The active instant source of a session: the Real_Clock in Clock_Mode `real`, the Virtual_Clock in Clock_Mode `demo`.
- **Session_Instant**: An integer number of ms UTC read from the Session_Clock.
- **Countdown**: AOS minus the current Session_Instant.
- **Demo_Session**: A session in Clock_Mode `demo`.
- **Join_Instant**: The Session_Instant at which a real-time session enters in-pass by Join.
- **Target_Direction**: The `azimuthDeg` and `elevationDeg` that `observeAt` returns for the Target_Pass's satellite and the Session_Observer at the current Session_Instant.
- **Pointing_Source**: The origin of the Lock_Results of a session: Sensor_Pointing, Auto_Point or Manual_Pointing.
- **Sensor_Pointing**: The real-time Pointing_Source: the Lock_Results of the S3 pointing session, including its drag-compass fallback.
- **Auto_Point**: The demo Pointing_Source that synthesizes a device forward direction from the Target_Direction perturbed by a Jitter and evaluates it with the S3 `evaluateLock`.
- **Manual_Pointing**: The demo Pointing_Source that uses the S3 drag-compass controller.
- **Noise_Source**: The injected source of pseudo-random numbers in [0, 1) used by Auto_Point and the noise buffer. Tests inject a deterministic one.
- **Jitter**: The angular offset of the synthesized direction from the Target_Direction that Auto_Point draws from the Noise_Source.
- **Lock_Result**, **Pointing_Error**, **Lock_Tolerance**: The S3 terms. The Pointing_Error is `LockResult.pointingErrorDeg`; the Lock_Tolerance is 10°.
- **Lock_Sample**: One Session_Instant of an in-pass session together with the Pointing_Error and the locked flag of the Lock_Result at that instant, and whether Auto_Point produced it.
- **Beacon_State_Function**: The pure function of the Session_Core that maps the inputs of Requirement 5, criterion 1 to a Beacon_State.
- **Beacon_State**: The output of the Beacon_State_Function: a beacon mode, the audible carrier frequency in Hz, the carrier gain, the noise gain and the tick gain.
- **Beacon_Phase_Input**: The time input of the Beacon_State_Function in seconds of real (audio) time, from which every periodic beacon behaviour is computed (OQ-8).
- **Signal_Quality**: The value q in [0, 1] that the Beacon_State_Function derives from the Pointing_Error.
- **Quality_Zero_Error**: 45°, the Pointing_Error at and above which the Signal_Quality is 0.
- **Audible_Base_Frequency**: The fixed audible carrier frequency in Hz at zero Doppler_Glide. The design states it.
- **Doppler_Glide**: The offset of the audible carrier frequency from the Audible_Base_Frequency: a scaled, artistic function of the range rate. It is not the Physical_Doppler_Shift.
- **Glide_Scale**: The scale of the Doppler_Glide. The design states it.
- **Tumble_Envelope**: The periodic factor on the carrier gain of an entry whose `tumblePeriodS` is not null.
- **Tumble_Floor**: The minimum of the Tumble_Envelope. The design states it.
- **Tick_Mode**: The beacon mode of an entry whose `downlinkMhz` is null (IMAGE): no carrier, sparse short filtered clicks against a noise floor.
- **Audio_Binding**: The component-layer module that builds the WebAudio node graph and applies Beacon_States to it.
- **Audio_Context_Factory**: The injected function that creates the audio context. The browser implementation uses `AudioContext`, or `webkitAudioContext` where `AudioContext` is undefined; tests inject a mock.
- **Master_Gain**: The final gain node of the Audio_Binding, on which mute and volume act.
- **User_Gesture_Handler**: An event handler that the browser runs for a direct user activation, such as a click or tap on a button.
- **Physical_Doppler_Shift**: Δf = −f0 × rangeRate / c, with f0 the catalog `downlinkMhz`, rangeRate the S1 `rangeRateKmPerS` and c the Speed_Of_Light. It is positive while the satellite approaches.
- **Speed_Of_Light**: c = 299 792.458 km/s.
- **Doppler_Readout**: The output of the pure readout function of the Session_Core: either the Physical_Doppler_Shift in kHz with its sign, or a no-frequency marker when `downlinkMhz` is null.
- **Readout_Rate**: The refresh rate of the live readouts, in the range 1 Hz to 4 Hz. The design picks it.
- **Session_Result**: The result record of one session (Requirement 8), the hand-off to S5.
- **Lock_Statistics_Reducer**: The pure reducer of the Session_Core that folds Lock_Samples into the statistics of a Session_Result.
- **Result_Store**: The component-layer persistence of Session_Results in `localStorage` through the injected `KeyValueStorage`.
- **Session_Copy**: All user-facing text of the Session_Page and the Satellite_Picker: JSX text and the copy strings of the copy module.
- **Honesty_Scan**: The wording checks 1.24 and 1.25 of the S1 scaffold test (`tests/scaffold/scaffold.test.ts`), extended to the Session_Copy.
- **Source_Boundary_Scan**: The test that parses every Session_Source_Module with the TypeScript compiler API and checks its import and export specifiers, in the style of `tests/helpers/pointing-source-scan.ts` (S3).
- **Manual_Listening_Check**: One real pass or one demo run of the Session_Page on a phone, listened to by the reviewer.

## Requirements

### Requirement 1: Pure session core and source boundary

**User Story:** As a maintainer, I want all session logic in one framework-free directory with a guarded import boundary, so that it is testable in Node and cannot drift into the UI.

#### Acceptance Criteria

1. THE Session_Core SHALL place the Session_Transition_Function, the Virtual_Clock arithmetic, the Countdown, the Auto_Point direction synthesis, the Beacon_State_Function, the Doppler_Readout function, the Session_Result type, the Lock_Statistics_Reducer and the Session_Result serialization in Session_Source_Modules under `src/lib/session`, with one `index.ts` barrel as the only entry file, following the module conventions of the Orbit_Engine, the Zombie_Catalog and the Pointing_Core.
2. THE Session_Core SHALL use as import and export specifiers in every Session_Source_Module only relative paths that resolve to a module inside `src/lib/session`, plus the `index.ts` barrels of `src/lib/orbit`, `src/lib/catalog` and `src/lib/pointing`, so that no Session_Source_Module imports React, Next.js, component-layer code or any package.
3. THE Session_Core SHALL keep every Session_Source_Module free of references to the DOM globals `window`, `document`, `navigator`, `screen`, `localStorage`, `AudioContext` and `webkitAudioContext`, and SHALL take every input, including instants, Lock_Results, catalog fields, noise values and stored text, as plain parameters.
4. THE Session_Core SHALL perform no network access, storage access, timer use or audio output, and SHALL NOT read the system clock; every instant SHALL be a parameter.
5. THE Source_Boundary_Scan SHALL parse every Session_Source_Module with the TypeScript compiler API and report every import or export specifier that violates criterion 2; the acceptance test SHALL verify that the scan reports no violation.

### Requirement 2: Session state machine

**User Story:** As a satellite listener, I want the session to move through clear, named stages from picking a pass to the end of it, so that I always know whether I am waiting, tracking or done, and a wrong action never leaves the session in an undefined stage.

#### Acceptance Criteria

1. THE session state machine SHALL have exactly the Session_States selecting, awaiting-pass, in-pass and completed, and SHALL start in selecting (OQ-1).
2. THE Session_Core SHALL provide the Session_Transition_Function as a pure function, in the style of the S3 `permissionTransition`, that returns for every pair of a Session_State and a Session_Event either the next Session_State or a Transition_Rejection, and never throws.
3. THE Session_Transition_Function SHALL implement this Transition_Table and no other transition (OQ-1, OQ-2):

   | From | Event | To | Side effect performed by the Session_Controller |
   |---|---|---|---|
   | selecting | Pick | awaiting-pass | Clock_Mode `real`; the Target_Pass rises after the Real_Clock instant; Countdown to AOS starts |
   | selecting | Join | in-pass | Clock_Mode `real`; the Target_Pass is in progress at the Real_Clock instant; Lock_Samples from the Join_Instant |
   | selecting | Start_Demo | in-pass | Clock_Mode `demo`; Virtual_Clock anchored at AOS (Requirement 3, criterion 4) |
   | awaiting-pass | AOS_Reached | in-pass | Lock_Sample collection and beacon start |
   | awaiting-pass | Start_Demo | in-pass | as selecting + Start_Demo |
   | awaiting-pass | Abort | selecting | no Session_Result |
   | in-pass | LOS_Reached | completed | Session_Result with `completed: true` produced and persisted |
   | in-pass | Abort | completed | Session_Result with `completed: false` produced and persisted |
   | completed | New_Session | selecting | none |

4. IF a Session_Event arrives for a Session_State with which the Transition_Table does not pair it, THEN THE Session_Transition_Function SHALL return a Transition_Rejection that identifies the state and the event, and THE Session_Controller SHALL keep the current Session_State and make the Transition_Rejection observable to its caller; a rejected event SHALL NOT be silently ignored.
5. THE Session_Controller SHALL obtain every Session_State change from the Session_Transition_Function and SHALL perform only the side effects (timers, engine calls, TLE fetching, pointing input, audio, storage).
6. WHILE the Session_State is selecting, THE Session_Controller SHALL fetch the TLE and search the Next_Pass without leaving selecting; IF the TLE fetch fails or no Next_Pass is found, THEN THE Session_Controller SHALL stay in selecting, report the failure in its state, and retry when the user starts a session again (OQ-1).
7. WHILE the Session_State is awaiting-pass, THE Session_Controller SHALL derive the Countdown as AOS minus the Session_Instant read from the Session_Clock at the moment the Countdown is read, and SHALL NOT accumulate the Countdown by counting ticks or timer callbacks.
8. WHEN the Session_Instant reaches or passes AOS while the Session_State is awaiting-pass, THE Session_Controller SHALL dispatch AOS_Reached.
9. WHEN the Session_Instant reaches or passes LOS while the Session_State is in-pass, THE Session_Controller SHALL dispatch LOS_Reached.
10. WHILE the page is hidden, THE Session_Controller SHALL keep the session; WHEN it next reads the Session_Clock, it SHALL dispatch every event that the elapsed time implies, in Transition_Table order (AOS_Reached before LOS_Reached), with the Lock_Samples it has (OQ-6).
11. WHEN the Session_Page is unmounted while the Session_State is in-pass, THE Session_Controller SHALL treat it as Abort and persist the Session_Result on a best-effort basis; WHEN it is unmounted in awaiting-pass, THE Session_Controller SHALL discard the session without a Session_Result (OQ-6).
12. THE acceptance test SHALL verify every pair of a Session_State and a Session_Event: each pair of the Transition_Table gives its listed next Session_State, and every other pair gives a Transition_Rejection that identifies that state and event.
13. Approved addition (OQ-14e): THE controller test SHALL verify that, in awaiting-pass, an advance of the mock Real_Clock without any timer callback firing changes the Countdown that the Session_Controller reports by exactly the advance.

### Requirement 3: Dual clock, demo start and pass selection

**User Story:** As a newcomer, I want to play through a real upcoming pass in seconds instead of waiting hours for it, so that I can hear and practise a whole pass right away, and as a listener I want the real-time mode to follow the true time of the pass, including one that is already overhead.

#### Acceptance Criteria

1. WHILE a session is in Clock_Mode `real`, THE Session_Controller SHALL read every Session_Instant from the Real_Clock.
2. WHILE a session is in Clock_Mode `demo`, THE Session_Controller SHALL read every Session_Instant from the Virtual_Clock with the Demo_Rate of 60, computed by a pure Session_Core function of the Virtual_Clock anchors and the Real_Clock instant; the design states how the result is made an integer number of ms.
3. THE Session_Components SHALL pass an explicit instant to every Orbit_Engine call: the current Session_Instant to `observeAt`, and to `predictPasses` a window start derived from the current Real_Clock instant (the instant itself, the lookback start of criterion 9, or the `riseMs` of a cut pass under criterion 8). THE browser dependency builder SHALL create the TLE fetcher with the Real_Clock as its `now` option, so that no engine call relies on an implicit current time.
4. WHEN the user starts a Demo_Session for a Playable_Entry, THE Session_Controller SHALL select the Next_Pass for Clock_Mode `demo` from the current Real_Clock instant, SHALL set the Virtual_Clock anchors to the current Real_Clock instant and the AOS of that pass, and SHALL dispatch Start_Demo, so that the Demo_Session begins in in-pass at AOS.
5. WHEN the user starts a real-time session, THE Session_Controller SHALL select the Next_Pass for Clock_Mode `real` from the current Real_Clock instant, and SHALL dispatch Pick if its AOS lies after the Real_Clock instant and Join otherwise (OQ-2).
6. THE Session_Controller SHALL support a Demo_Session for every Playable_Entry, including IMAGE.
7. THE Next_Pass search SHALL call `predictPasses` with minimum elevation 0° over 24 h from the current Real_Clock instant, and, if that search returns no eligible pass, once more over 168 h; IF the second search returns no eligible pass either, THEN the result SHALL be "no pass found" (OQ-3). For Clock_Mode `demo`, a pass that is `startTruncated` (in progress at the window start) is not eligible, so the demo takes the next complete pass; for Clock_Mode `real`, the first pass is eligible, including one in progress (OQ-2).
8. IF the selected pass is `endTruncated`, THEN THE Session_Components SHALL search again with the window start at its `riseMs` and take the full record of that pass from the second search (OQ-2).
9. IF the selected pass in Clock_Mode `real` is `startTruncated`, THEN THE Session_Components SHALL search again with a window start before the Real_Clock instant, by a lookback that the design states, and take the full record of the pass in progress, so that AOS and LOS are that pass's true `riseMs` and `setMs` (OQ-2).
10. THE Session_Clock SHALL serve only as a source of instants: the Session_Components SHALL compute every orbital quantity of a session by an Orbit_Engine call at an explicit Session_Instant and SHALL NOT advance or interpolate orbital quantities in any other way.
11. THE acceptance test SHALL verify the Virtual_Clock advance: an advance of the Real_Clock by d ms advances the Virtual_Clock by 60 × d ms.
12. THE controller test SHALL verify the demo jump to AOS: after Start_Demo, the Session_State is in-pass and the Session_Instant equals AOS before any Real_Clock advance.

### Requirement 4: Pointing input

**User Story:** As a satellite listener, I want the session to judge my aim with exactly the same lock rule as the pointing screen, and as a newcomer I want the demo to aim for me by default, so that I hear the full beacon arc before I try aiming myself.

#### Acceptance Criteria

1. WHILE a session is in Clock_Mode `real` and in in-pass, THE Session_Controller SHALL take its Lock_Results from the S3 pointing session, SHALL set that session's target to the current Target_Direction at each update, and SHALL set its observer to the Session_Observer.
2. WHEN a Demo_Session starts, THE Session_Controller SHALL use Auto_Point as the Pointing_Source.
3. WHILE Auto_Point is the Pointing_Source, THE Session_Core SHALL synthesize a device forward direction by offsetting the current Target_Direction by a Jitter drawn from the Noise_Source, and THE Session_Controller SHALL obtain the Lock_Result by calling the S3 `evaluateLock` on that direction. Auto_Point SHALL fabricate only the lock inputs and SHALL NOT construct, copy or modify a Lock_Result itself.
4. WHILE a Demo_Session is in in-pass, THE Session_Page SHALL let the user switch the Pointing_Source between Auto_Point and Manual_Pointing, and WHILE Manual_Pointing is the Pointing_Source, THE Session_Controller SHALL obtain the Lock_Result from the S3 drag-compass pose through the S3 attitude and lock functions.
5. THE Session_Core and the Session_Components SHALL take the lock decision only from `LockResult.locked` and SHALL contain no lock threshold constant and no implementation of the lock angle (acos of a dot product of the forward and target vectors) of their own.
6. THE Jitter SHALL keep the Pointing_Error mostly within the Lock_Tolerance, SHALL occasionally exceed it to give brief moments without lock, and SHALL never exceed about 20°; the design states the distribution and its time behaviour (OQ-7).
7. WHILE no Lock_Result is available in in-pass, including before the user enables sensors in Clock_Mode `real`, THE Session_Controller SHALL record no Lock_Sample, the time until the next Lock_Sample SHALL count as not locked, and THE Session_Controller SHALL pass a Pointing_Error of `null` to the Beacon_State_Function (OQ-10).
8. THE acceptance test SHALL verify the Jitter distribution that the design pins, with a deterministic Noise_Source.
9. Approved addition (OQ-14a): THE controller test SHALL verify, with a deterministic Noise_Source, that every Auto_Point Lock_Result equals the result of the S3 `evaluateLock` for the synthesized direction and the Target_Direction.

### Requirement 5: Beacon state function

**User Story:** As a satellite listener, I want the simulated beacon to get cleaner as I aim better and to glide in pitch as the satellite approaches and recedes, with each satellite's documented character, so that the pass is something I can hear and practise.

#### Acceptance Criteria

1. THE Session_Core SHALL provide the Beacon_State_Function as a pure, deterministic function of the Pointing_Error in degrees or `null`, the range rate in km/s or `null`, the entry's `BeaconBlock` and the Beacon_Phase_Input, returning a Beacon_State: a beacon mode, the audible carrier frequency in Hz, the carrier gain, the noise gain and the tick gain. Equal inputs SHALL give equal Beacon_States. Approved addition (OQ-9): the tick gain is a fifth output beyond the brief. The entry's `EntryStatus` is not an input (DQ-1).
2. THE Beacon_State_Function SHALL derive the Signal_Quality q from the Pointing_Error with q = 1 at a Pointing_Error of 0°, q = 0 at every Pointing_Error of at least the Quality_Zero_Error of 45°, q monotonic non-increasing between 0° and 45°, and q = 0 for a Pointing_Error of `null` (OQ-10); the design proposes the curve shape.
3. THE Beacon_State_Function SHALL crossfade the carrier against the noise by q: with all other inputs fixed, the carrier gain and the tick gain SHALL be non-decreasing in q and the noise gain SHALL be non-increasing in q.
4. THE Beacon_State_Function SHALL use a fixed Audible_Base_Frequency in the audible range as the carrier frequency at zero range rate; the design states its value.
5. THE Beacon_State_Function SHALL set the carrier frequency to the Audible_Base_Frequency plus the Doppler_Glide, where the Doppler_Glide is monotonic non-decreasing in −rangeRate, positive while the satellite approaches, negative while it recedes, and zero at zero range rate and for a range rate of `null`; the design states the Glide_Scale.
6. THE Session_Core SHALL keep the Doppler_Glide and the Physical_Doppler_Shift apart: they SHALL be computed by separate, separately named functions and constants, the Doppler_Glide SHALL NOT feed the Doppler_Readout, and the Physical_Doppler_Shift SHALL NOT be used as the audible carrier offset.
7. WHERE the entry's `tumblePeriodS` is not null, THE Beacon_State_Function SHALL multiply the carrier gain by a Tumble_Envelope that is periodic in the Beacon_Phase_Input with a period of exactly `tumblePeriodS` seconds and whose values lie in [Tumble_Floor, 1]; the design states the Tumble_Floor and the envelope shape. WHERE `tumblePeriodS` is null, THE Beacon_State_Function SHALL apply no Tumble_Envelope.
8. WHERE the entry's `downlinkMhz` is null, THE Beacon_State_Function SHALL return the Tick_Mode with a carrier gain of 0 for every input, SHALL produce sparse, short filtered clicks through the tick gain, timed by the Beacon_Phase_Input, and SHALL map q to the clarity of the clicks against the noise floor; the design states the click timing and the mapping. The Tick_Mode SHALL depend on `downlinkMhz` only; the `EntryStatus` silent-again drives the copy (OQ-9).
9. WHERE the entry has a `downlinkMhz` and a `beaconMode` of null, THE Beacon_State_Function SHALL return a plain, unkeyed carrier.
10. THE design SHALL propose how a `cw-beacon` entry differs audibly from a `telemetry` entry; IF the design adopts a keying or modulation pattern, THEN THE Beacon_State_Function SHALL compute it from the Beacon_Phase_Input inside the function.
11. THE Beacon_Phase_Input SHALL be measured in real (audio) time in both Clock_Modes, so that the Tumble_Envelope, the clicks and any keying keep their real-time rhythm in a Demo_Session, while the range rate and the Pointing_Error follow the Session_Clock (OQ-8).
12. THE Session_Page and the other React components SHALL NOT call the Beacon_State_Function; only the Session_Controller calls it.
13. THE acceptance test SHALL verify: q = 1 at 0° and q = 0 at 45° and above, and q non-increasing over a sampled sequence of Pointing_Errors from 0° to 45°; the carrier frequency at zero range rate equals the pinned Audible_Base_Frequency; for LES-1, the Tumble_Envelope repeats with a period of 4 s and stays within [Tumble_Floor, 1] with the pinned Tumble_Floor; for IMAGE, the beacon mode is the Tick_Mode and the carrier gain is 0 at every sampled input; and one Beacon_State example for each beacon shape of the catalog: `cw-beacon` (AO-7), `telemetry` with a frequency (Transit 5B-5), `beaconMode` null with a frequency (LES-1 or Prospero), and `downlinkMhz` null (IMAGE).
14. Approved addition (OQ-14f): THE acceptance test SHALL verify the Doppler_Glide direction: a negative range rate gives a carrier frequency above the Audible_Base_Frequency, and a positive range rate gives one below it.

### Requirement 6: WebAudio binding

**User Story:** As a listener on a phone, I want the beacon to start only when I tap to allow sound, to change smoothly without clicks or zipper noise, and to have mute and volume controls, so that it behaves well on iOS and Android browsers.

#### Acceptance Criteria

1. THE Audio_Binding SHALL build a node graph of at least one oscillator for the carrier, one looped noise buffer source, a carrier gain, a noise gain, a tick path with its tick gain, and the Master_Gain; the design adds any further nodes.
2. WHEN the Session_Controller passes a Beacon_State to the Audio_Binding, THE Audio_Binding SHALL apply its frequency and gains to the corresponding audio parameters with `setTargetAtTime`-style smoothing; the design states the time constants.
3. THE Audio_Binding SHALL compute no beacon logic: every frequency and gain it applies SHALL come from a Beacon_State or from the mute and volume controls.
4. THE Session_Components SHALL create or resume the audio context only inside a User_Gesture_Handler, and SHALL NOT create or resume it on page load, on mount, from a timer or on a Session_State change.
5. WHERE `AudioContext` is undefined and `webkitAudioContext` is defined, THE browser Audio_Context_Factory SHALL use `webkitAudioContext`.
6. THE Session_Components SHALL receive the Audio_Context_Factory as an injected dependency, so that tests replace it with a mock.
7. THE Session_Page SHALL provide a mute control and a volume control that act on the Master_Gain only and leave the Beacon_States unchanged; their settings are not persisted, and the design states the default volume (OQ-16).
8. WHILE the Session_State is not in-pass, THE Session_Controller SHALL keep the beacon silent (OQ-10).
9. IF the browser provides neither `AudioContext` nor `webkitAudioContext`, THEN THE Session_Controller SHALL run the session without audio and the Session_Page SHALL say that audio is not available (OQ-16).
10. THE acceptance test SHALL verify the Audio_Binding against a mock audio context by asserting the parameter values and smoothing calls it applies for given Beacon_States, without producing real sound.
11. Approved addition (OQ-14b): THE controller test SHALL verify that the Audio_Context_Factory is not called by session start, timers or Session_State changes and is called by the gesture entry, and THE acceptance test SHALL verify that the browser Audio_Context_Factory uses `webkitAudioContext` where `AudioContext` is undefined.
12. Approved addition (OQ-14c): THE acceptance test SHALL verify that the mute and volume controls change the Master_Gain only and leave every other audio parameter untouched.

### Requirement 7: Live Doppler readout

**User Story:** As a satellite listener with my own receiver, I want the documented frequency and the true computed Doppler shift on screen, kept apart from the audio effect, so that I can tune my radio by the real numbers.

#### Acceptance Criteria

1. THE Session_Page SHALL show the entry's `displayFrequency` string verbatim from the catalog, qualifiers included.
2. THE Session_Core SHALL compute the Doppler_Readout as Δf = −f0 × rangeRate / c with f0 the `downlinkMhz`, rangeRate the S1 `rangeRateKmPerS` and c = 299 792.458 km/s, expressed in kHz, positive while the satellite approaches.
3. WHILE the Session_State is in-pass, THE Session_Page SHALL show the Doppler_Readout in kHz with an explicit sign, at the precision the design fixes; in the other Session_States it SHALL NOT show a Doppler figure (OQ-11).
4. WHERE `downlinkMhz` is null, THE Doppler_Readout SHALL be the no-frequency marker, and THE Session_Page SHALL show a "no documented downlink frequency" note instead of a number and SHALL NOT show or compute any substitute frequency.
5. THE Session_Page SHALL refresh the live readouts at the Readout_Rate, which the design picks in the range 1 Hz to 4 Hz.
6. THE Session_Page and the acceptance tests SHALL use the same pure Session_Core readout function, applied to the range rate of the `observeAt` result at the current Session_Instant.
7. THE acceptance test SHALL verify, as pure arithmetic fixtures, that f0 = 145.9775 MHz with rangeRate = −2.1094 km/s gives about +1.03 kHz and with rangeRate = +2.6384 km/s gives about −1.28 kHz, each within 0.01 kHz, and that f0 null gives the no-frequency marker.
8. IF `observeAt` fails at the current Session_Instant, THEN THE Session_Page SHALL show a "no orbit data" note instead of the Target_Direction and the Doppler_Readout (OQ-10).

### Requirement 8: Session result

**User Story:** As a satellite listener, I want each pass I track to leave a record of how long I held the lock and how close I got, so that the later QSL card can confirm the session.

#### Acceptance Criteria

1. THE Session_Core SHALL define the Session_Result with exactly these fields: the NORAD ID; the AOS and the LOS as integer ms UTC; the maximum elevation in degrees; the total locked seconds; the best (smallest) Pointing_Error in degrees, or `null` when no Lock_Sample was recorded; the locked ratio; a completed flag that is false when the user aborted; and, approved addition (OQ-4), the Clock_Mode as `mode` (`real` or `demo`) and `autoPointUsed`, true when any Lock_Sample came from Auto_Point.
2. THE Session_Result SHALL take AOS from the Target_Pass `riseMs`, the maximum elevation from the Target_Pass `maxElevationDeg`, and LOS from the Target_Pass `setMs` when the session reaches LOS or from the Session_Instant of the Abort when the user aborts (OQ-4).
3. THE Session_Core SHALL accumulate the statistics with the Lock_Statistics_Reducer, a pure reducer over Lock_Samples, with the locked seconds measured on the Session_Clock (virtual seconds in a Demo_Session); the design states how the locked seconds are integrated from the Lock_Samples (OQ-4).
4. THE Lock_Statistics_Reducer SHALL count a Lock_Sample as locked exactly when its Lock_Result's `locked` flag is true.
5. THE Session_Core SHALL compute the locked ratio as the locked seconds divided by the full Target_Pass duration in seconds, (`setMs` − `riseMs`) / 1000, also for an aborted session and for a session that joined a pass in progress (OQ-2, OQ-4).
6. WHEN a session reaches LOS, THE Session_Controller SHALL produce a Session_Result with `completed: true`; WHEN the user aborts a session in in-pass, THE Session_Controller SHALL produce a Session_Result with `completed: false`.
7. THE Result_Store SHALL persist every produced Session_Result, from both Clock_Modes, to `localStorage` through the injected `KeyValueStorage` under one storage key as a JSON array, newest last, keeping at most the 50 newest results; a storage failure SHALL NOT interrupt the session (OQ-5).
8. THE Session_Components SHALL provide a read-back function that returns the stored Session_Results, skips every malformed record and never throws, for S5 to consume (OQ-5).
9. THE Session_Components SHALL NOT render a QSL card.
10. THE acceptance test SHALL verify the Lock_Statistics_Reducer and the Session_Result fields against a hand-computable fixture of Lock_Samples.
11. Approved addition (OQ-14d): THE controller test SHALL verify that a Session_Result is written through the mock `KeyValueStorage` at LOS with `completed: true` and on Abort in in-pass with `completed: false`.

### Requirement 9: Session page and satellite picker

**User Story:** As a satellite listener, I want a simple list of the satellites I can hunt with their next pass, and one page that takes me from the countdown through the pass, so that I can run a whole session from my phone.

#### Acceptance Criteria

1. THE Satellite_Picker SHALL be served at the route `/session` and THE Session_Page at the route `/session/[noradId]` (OQ-12).
2. THE Session_Page and the Satellite_Picker SHALL contain no session logic beyond composing the Session_Controllers, rendering their state and forwarding user events, following the `/pointing` page; they SHALL make no Orbit_Engine call and no Beacon_State_Function call themselves.
3. THE Satellite_Picker SHALL list every Playable_Entry of `listPlayableEntries()` in catalog order, each with its Next_Pass computed by Requirement 3, criteria 7 to 9, or with a note where no Next_Pass is found or its TLE cannot be fetched, and with a link to its Session_Page.
4. IF the `noradId` of the Session_Page route is not the NORAD ID of a Playable_Entry, THEN THE Session_Page SHALL show a message with a link to the Satellite_Picker and SHALL start no session (OQ-12).
5. THE Session_Page and the Satellite_Picker SHALL default the Session_Observer to the Reference_Observer, SHALL share the Session_Observer through one `KeyValueStorage` key, and SHALL provide manual latitude and longitude inputs that behave as on `/pointing`: latitude accepted in [−90, 90], longitude in [−180, 180], and an invalid input keeps the previous value with an inline message. On the Session_Page the inputs SHALL be editable only in selecting. They SHALL use no geolocation API (OQ-12).
6. WHERE the entry's `sunlitOnly` is true, THE Satellite_Picker and the Session_Page SHALL show it as an information badge or note only; `sunlitOnly` SHALL NOT gate the beacon, the session flow or audibility (Known limitation 1).
7. THE Session_Page SHALL provide the user actions of the Transition_Table (start in real time, start a demo, abort, start a new session), the Pointing_Source switch of Requirement 4, criterion 4, the audio enable action of Requirement 6, criterion 4, the mute and volume controls, and in Clock_Mode `real` the S3 controls that the session uses: the motion-sensor permission action, the drag-compass toggle and drag area, and the calibration step buttons (OQ-12).
8. WHILE the Session_State is awaiting-pass, THE Session_Page SHALL show the Countdown.
9. THE Session_Page and the Satellite_Picker SHALL display every instant in UTC and mark it as UTC.
10. THE React components of the Session_Page and the Satellite_Picker SHALL be checked by review.

### Requirement 10: Honesty of the session copy

**User Story:** As a satellite listener, I want the app to be plain about what is simulated, so that I never mistake the synthesized beacon for a real reception, and a silent satellite is never presented as transmitting.

#### Acceptance Criteria

1. THE Session_Copy SHALL state, in every paragraph that mentions a beacon, a signal or reception, within that same paragraph, that the beacon or signal is simulated or synthesized.
2. THE Session_Copy SHALL NOT claim or imply that the app receives, hears or decodes a real radio-frequency signal.
3. THE Session_Copy for IMAGE SHALL be consistent with its status "silent again since August 2018": it SHALL present the Tick_Mode as a simulation of IMAGE's telemetry character and SHALL NOT claim or imply that IMAGE transmits today.
4. THE Session_Copy SHALL NOT present the audible pitch change as the Physical_Doppler_Shift; the kHz figure of the Doppler_Readout SHALL be the only Doppler figure the pages show.
5. THE Honesty_Scan SHALL extend checks 1.24 and 1.25 of `tests/scaffold/scaffold.test.ts` to the Session_Copy, covering the JSX text of the new page files and the copy strings of the copy module (OQ-13).
6. THE Session_Page and the Satellite_Picker SHALL NOT render catalog prose (`hook`, `story`, `statusNote`); the Satellite_Picker shows the name, the difficulty, a short status label, the `sunlitOnly` badge and the Next_Pass (OQ-13).
7. THE route check 1.19 of `tests/scaffold/scaffold.test.ts` SHALL be updated to admit exactly the route directories and page files of this spec in addition to the existing ones.

### Requirement 11: Test environment and review

**User Story:** As a maintainer, I want the session layer pinned by small Node tests and one listening check on a phone, so that a regression in the session logic is caught by `pnpm test` and the sound is checked by ear.

#### Acceptance Criteria

1. THE tests of this spec SHALL run in the Vitest `node` environment of `vitest.config.ts`, as `tests/**/*.test.ts` files, without jsdom, happy-dom or a React testing library.
2. THE acceptance tests over the Session_Core SHALL be plain example assertions, and the controller and Audio_Binding tests SHALL replace the Real_Clock, timers, storage, the TLE fetcher, the Noise_Source, the Audio_Context_Factory and the S3 pointing session with injected mocks. The mock TLE fetcher SHALL return a `TleRecord` whose `NORAD_CAT_ID` equals the requested NORAD ID.
3. THE tests SHALL stay minimal and sufficient: no multi-layer verification machinery, no instrumented negative tests for a single helper or guard.
4. THE tests SHALL run offline, under the existing network guard of `tests/setup/network-guard.ts`.
5. THE Manual_Listening_Check (one real pass or one demo run on a phone) SHALL be a review item of the final task, not an automated test.

## Decisions recorded during requirements refinement

- OQ-1: No extra Session_State. TLE fetching and the Next_Pass search run while the state stays selecting; a fetch failure or an empty search leaves selecting with an error and a retry on the next start. Abort in awaiting-pass returns to selecting without a Session_Result; Abort in in-pass goes to completed with `completed: false`; New_Session leads from completed to selecting. Start_Demo is accepted in selecting and awaiting-pass and rejected in in-pass and completed; a Demo_Session cannot switch back to real time.
- OQ-2: The demo skips a pass in progress and takes the next complete pass. Real time joins a pass in progress (selecting → in-pass by Join); AOS and LOS stay that pass's true `riseMs` and `setMs`, found by a lookback search, and the statistics start at the Join_Instant. A pass cut by the window end is searched again from its `riseMs` for its full record.
- OQ-3: Search window 24 h, then once 168 h, then "no pass found". The Demo_Rate stays 60 for IMAGE.
- OQ-4: AOS and LOS from the Target_Pass; on Abort, LOS is the Session_Instant of the abort. Maximum elevation from the Target_Pass. Locked seconds on the Session_Clock. Locked ratio over the full pass duration, also on Abort. Best Pointing_Error `null` without Lock_Samples. Approved addition: the fields `mode` (`real` or `demo`) and `autoPointUsed`.
- OQ-5: One storage key, JSON array, newest last, at most 50 results; demo results are stored too; S4 provides a read-back function that skips malformed records and never throws.
- OQ-6: Unmount in in-pass counts as Abort with a best-effort persisted result; unmount in awaiting-pass discards the session; a hidden page keeps the session, and the pending events are dispatched in order on the next clock read.
- OQ-7: The Auto_Point Jitter locks most of the time, occasionally exceeds 10° for brief moments without lock, and stays below about 20°; the design pins the distribution and the tests verify it.
- OQ-8: Periodic beacon behaviour (Tumble_Envelope, clicks, keying) runs on real time; the Doppler_Glide and the pointing follow the Session_Clock.
- OQ-9: The Tick_Mode applies exactly when `downlinkMhz` is null; the status silent-again drives the copy. Approved addition: the Beacon_State gets the fifth output tick gain.
- OQ-10: A Pointing_Error of `null` gives q = 0 (noise only); an `observeAt` failure gives no Target_Direction, no Lock_Sample, q = 0 and a "no orbit data" note; outside in-pass the beacon is silent.
- OQ-11: The Doppler_Readout is shown in in-pass only; awaiting-pass shows the `displayFrequency` and the Countdown; the design fixes the display precision.
- OQ-12: Satellite_Picker at `/session`, Session_Page at `/session/[noradId]`; the Session_Observer is shared through one `KeyValueStorage` key and editable only in selecting; an unknown or unplayable `noradId` shows a message with a link back; in real time the Session_Page offers the S3 permission action, drag-compass toggle and area, and calibration step buttons.
- OQ-13: Checks 1.24 and 1.25 are both extended to the Session_Copy; the S4 pages render no catalog prose.
- OQ-14: Cases (a) to (f) are added as approved additions: Requirement 4, criterion 9 (a); Requirement 6, criteria 11 (b) and 12 (c); Requirement 8, criterion 11 (d); Requirement 2, criterion 13 (e); Requirement 5, criterion 14 (f).
- OQ-15: The camera view is out of scope for S4 and moves to S6.
- OQ-16: Without WebAudio the session runs silently with a note; mute and volume are not persisted; the design states the default volume.
- Time zone: where C03 conflicts with the project rule, the project rule wins; every instant is displayed in UTC and marked as UTC; local-time display is deferred to S6.
- Wording refinements approved with the requirements: Requirement 4, criterion 7 (a period without a Lock_Result counts as not locked) and Requirement 3, criterion 3 (the Session_Components receive a TLE fetcher, which the browser dependency builder creates with the Real_Clock as `now`; the S1 fetcher rejects a record whose NORAD number differs from the requested one, so the test TLE fetcher returns a record with the requested NORAD ID, Requirement 11, criterion 2).

## Decisions recorded during design review

- DQ-1: The `EntryStatus` input is removed from the Beacon_State_Function (Requirement 5, criterion 1). Reason: under OQ-9 the Tick_Mode depends on `downlinkMhz` only and no output depends on the status, so the function takes only the inputs that drive its outputs. The status silent-again still drives the IMAGE copy (Requirement 10, criterion 3).
- DQ-2: The Satellite_Picker shows each entry's Next_Pass by the real-time rule and marks a pass in progress as "in progress". A demo started from the Session_Page of such an entry plays the next complete pass (Requirement 3, criteria 4 and 7).
- DQ-3: The `cw` keying and the `telemetry` level pattern are simulated beacon characteristics, not real telemetry content. The copy never presents them as real; the "simulated" wording in the same paragraph already covers them, so no extra copy is added.
