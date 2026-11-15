# Requirements Document

## Introduction

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). Users pick a real "zombie satellite" from a fixed catalog, the app predicts its passes over the user's location from public TLE data (SGP4), points the phone at the satellite in AR during a pass, plays a simulated beacon whose pitch follows the Doppler shift, and issues a digital QSL card after the pass. The primary audience is amateur radio and satellite listeners (SWL and SDR hobbyists); for them the app is a finding, pointing and Doppler-math aid, and a 60x demo mode is the entry point for newcomers. The app is pure software: only the public orbital data is real, and the app receives no real radio-frequency signals.

This spec, ar-pointing (S3), delivers the pointing layer only: device attitude in, pointing error out. It has two parts:

1. The Pointing_Core: framework-free pure functions under `src/lib/pointing` for heading-source selection, attitude-to-forward-vector conversion, heading and pitch extraction, magnetic declination, calibration-offset normalization, target vectors, lock geometry, marker projection and the permission state transitions.
2. The Pointing_Components: the component layer. It consists of framework-free Pointing_Controllers, which perform the side effects (permission request, event subscription, timers, page visibility, storage, pointer drag) and feed their results to the Pointing_Core, and thin React components on the Pointing_Demo_Page that render the controller state.

The orbit-engine spec (S1, `src/lib/orbit`) and the zombie-catalog spec (S2, `src/lib/catalog`) have landed. The Pointing_Core consumes azimuth and elevation values of the shape that the S1 `observeAt` returns in `LookAngles` (`azimuthDeg` in [0, 360), `elevationDeg` in [-90, 90]) and observer coordinates of the shape of the S1 `Observer` (`latitudeDeg`, `longitudeDeg`), as plain numbers. The Pointing_Core recomputes no orbital math and imports nothing from the Orbit_Engine, the Zombie_Catalog or UI code; it shares only conventions with them, the same standalone-layer discipline as S2.

### Normative sources

- Sections 2 (conventions) and 4 (numeric baselines) of the Reference_Document are normative for this spec, except where this list supersedes them. This spec relies in particular on C33–C37 (look angles), C40–C45 (scene frame and mapping), C52 and C54 (alignment criterion and calibration rotation), C56–C74 (device orientation and heading), formulas 2.9.3–2.9.6, and the baselines of sections 4.4 and 4.5. The baseline values are cited as normative and are not re-derived or re-verified in the requirements phase; the acceptance tests of the implementation phase verify them.
- Precedence: the five rows of the section 4.5 table, the section 4.5 UI conventions and the scene coordinates of section 4.4 are normative baselines. Where the text of a formula in section 2 conflicts with these baselines, the baselines win.
- Frames: formula 2.9.5 gives `heading = atan2(forward.x, forward.y)` and `pitch = asin(forward.z)`. These read the forward vector as East-North-Up components, while formula 2.9.5 produces the forward vector in the Scene_Frame of C40, where north is −Z. The design SHALL define the World_Frame and every conversion between the Scene_Frame, East-North-Up components and the World_Frame explicitly, before any heading, pitch or dot product is specified (Requirement 5, criterion 7; Requirement 8, criterion 1).
- Lock tolerance: every 8° figure of the Reference_Document (C52, C88, formula 2.9.6, section 4.9) is superseded. The lock tolerance of this project is ±10° (Lock_Tolerance). Only the C52 criterion itself carries over: angle = acos(f·u), and f·u < 0 means the target is behind. The comparison is "less than or equal to 10°" (Requirement 8, criterion 4), replacing the strict "< 8°" of C52.
- C64, C65, C67 and P20 describe the old project's three disagreeing heading sources (`deviceorientation` for the scene; `deviceorientationabsolute`, `AbsoluteOrientationSensor` and `webkitCompassHeading` for the UI). They are superseded by Requirements 2 and 3: one Heading_Source per Orientation_Stream feeds every consumer, and `AbsoluteOrientationSensor` is not used.
- C70 (no declination model) and C72 (manual offset as a declination workaround) are superseded by Requirement 6. This closes gap G1.
- C71 and P22 (offset stored by `(offset + delta) % 360`, negative values not normalized, `parseFloat` NaN unchecked) are superseded by Requirement 7. The sign semantics of C54, the default offset 0 of C71, the 5° step of C88, and the section 4.4 calibration sample are kept.
- P21 (null attitude fields coerced to 0) is superseded by Requirement 4.
- P04 (iOS permission prompt, pending state without retry) is superseded by Requirement 11.
- C41 (fixed vertical field of view of 75°) is kept for the Marker_Projection as accepted gap G6 (Known limitation 1).
- S1 Requirement 1, criterion 11 (every test file runs in the Vitest `node` environment) stays in force for this spec; no DOM test environment is added (Requirement 13).
- S1 Requirement 1, criterion 19 limited the UI of the S1 scaffold to the root layout and one placeholder page. This spec adds the Pointing_Demo_Page at the route `/pointing`.

### Verification scope

The automated tests of this spec run in the Vitest `node` environment. They are unit tests over the Pointing_Core and mock-based tests of the Pointing_Controllers. They cover:

- Pointing_Core: the source-boundary scan (Requirement 1); heading-source selection over mock samples (Requirement 2); the section 4.5 rows, a non-zero Screen_Orientation_Angle case, the section 4.5 UI conventions and a "compass" case (Requirement 5); declination at the four Declination_Acceptance_Points (Requirement 6); the section 4.4 calibration sample and calibration normalization including negative offsets (Requirement 7); the remaining section 4.4 rows, and lock geometry including the behind case and the exact 10° boundary (Requirement 8); the end-to-end correction chain (Requirement 9); the permission state transitions (Requirement 11).
- Pointing_Controllers, with mocks: stream selection and stream end (Requirement 3), sample handling (Requirement 4), the permission flow (Requirement 11), calibration persistence and steps (Requirement 7), the Drag_Compass (Requirement 12).

The React components of the Pointing_Demo_Page are checked by review only. The Manual_Device_Checklist (one iPhone pass, one Android pass) is a review item, not an automated test. Criteria not named here are checked by review.

Criteria marked "approved addition (OQ-12x)" are acceptance cases outside the original brief that the project owner approved during requirements refinement.

### Out of scope

- The pass session state machine and the beacon audio (S4), the QSL card (S5), the app shell, PWA and deployment (S6).
- A camera view component (live video with the marker drawn over it); it belongs to S4 or S6. This spec delivers only the pure Marker_Projection function.
- three.js or any other 3D or math library; the quaternion math is hand-written.
- Orbital math of any kind: propagation, look angles, pass prediction. The Pointing_Core takes azimuth and elevation as inputs.
- Satellite search, a user satellite library, a custom backend API.
- `AbsoluteOrientationSensor` and the Generic Sensor API.
- Camera intrinsics or per-device field-of-view calibration (gap G6).
- Attitude filtering or smoothing (low-pass, quaternion interpolation).
- A DOM test environment (jsdom, happy-dom) and React component tests.

### Known limitations

1. The Marker_Projection uses a fixed vertical field of view of 75° (C41, gap G6). On devices whose real camera field of view differs, the marker is drawn at a slightly wrong screen position. This never affects the Lock_Result, which depends only on the Forward_Vector and the Target_Vector.
2. On a stream of Heading_Source "relative" (Requirement 2, criterion 1, case c), alpha may have an arbitrary zero, so the Device_Heading can be offset from true north by an unknown, possibly drifting amount. The Calibration_Offset can remove a constant offset only.
3. The Declination is computed at altitude 0 km. Dates outside the WMM2025 validity interval are clamped to the nearest boundary date, so the Declination is not extrapolated and grows less accurate the further the date lies outside the interval.

## Glossary

- **Pointing_Core**: The framework-free pure functions delivered by this spec under `src/lib/pointing`.
- **Pointing_Components**: The component layer delivered by this spec: the Pointing_Controllers and the React components of the Pointing_Demo_Page. The design fixes its location.
- **Pointing_Controller**: A framework-free component-layer module that performs side effects and feeds their results to the Pointing_Core. A Pointing_Controller imports no React and receives every side-effect source (orientation event target, Permission_API, screen orientation source, page visibility source, storage, clock and timers, pointer events) as an injected parameter, so that tests can replace each source with a mock.
- **Pointing_Demo_Page**: The minimal page of this spec that hosts the permission UI, the Drag_Compass, the calibration step buttons, numeric inputs for the observer latitude and longitude (default 39.9042, 116.4074, the Reference_Observer) and the target azimuth and elevation (default 90°, 30°), and a readout of the Lock_Result. It uses no geolocation API. Its route is `/pointing`.
- **Pointing_Source_Module**: A module under `src/lib/pointing`. Test files and test helpers are not Pointing_Source_Modules.
- **Source_Boundary_Scan**: The test that parses every Pointing_Source_Module with the TypeScript compiler API and checks its import and export specifiers, in the style of `tests/helpers/source-scan.ts` (S1) and `tests/helpers/catalog-source-scan.ts` (S2).
- **Orbit_Engine**: The S1 library under `src/lib/orbit`.
- **Zombie_Catalog**: The S2 data layer under `src/lib/catalog`.
- **Reference_Document**: `docs/reference/TECHNICAL_ROUTE.md` in this repository, the trimmed technical route of the author's earlier personal project SatAware AR.
- **Orientation_Sample**: The values that a Pointing_Controller reads from one `DeviceOrientationEvent` and passes to the Pointing_Core as plain data: the event type (`deviceorientation` or `deviceorientationabsolute`), the `absolute` flag, `alpha`, `beta` and `gamma` in degrees (each a number or `null`), and `webkitCompassHeading` in degrees where the event carries it.
- **Valid_Sample**: An Orientation_Sample in which every field that its Heading_Source (Requirement 2, criterion 1) needs to compute a Forward_Vector is a number, not `null` and not absent. For "absolute" and "relative" the required fields are `alpha`, `beta` and `gamma`. For "compass" they are `webkitCompassHeading` plus the fields of `alpha`, `beta` and `gamma` that the design's "compass" formula (Requirement 5, criterion 3) uses; the design lists them. An Orientation_Sample that is not a Valid_Sample takes no part in the stream selection and does not count as an arrived sample for the No_Sample_Timeout.
- **Subscription**: The orientation-event listeners that a Pointing_Controller registers at one time. A Subscription starts when the listeners are registered and ends when the listeners are removed or the page becomes hidden.
- **Selection_Window**: The 300 ms interval of a Subscription that starts at the arrival of its first Valid_Sample.
- **Orientation_Stream**: The sequence of Orientation_Samples of the Heading_Source selected for a Subscription, from the selection until the Subscription ends. Silence (no samples for a while) does not end an Orientation_Stream.
- **Heading_Source**: The result of the source-selection decision for an Orientation_Sample, one of three values: "absolute" (case a), "compass" (case b) and "relative" (case c) of Requirement 2, criterion 1. The design fixes the identifiers.
- **Attitude**: The last Valid_Sample of an Orientation_Stream: alpha, beta and gamma, together with `webkitCompassHeading` where the Heading_Source is "compass".
- **Screen_Orientation_Angle**: The current screen orientation angle in degrees, read from `screen.orientation.angle` where available and from `window.orientation` otherwise (C63). The design fixes how the two value sets (0/90/180/270 and 0/90/−90/180) are normalized.
- **World_Frame**: The one named Cartesian frame in which the Pointing_Core expresses every direction vector, including the Forward_Vector and the Target_Vector. The design names it and states its axes.
- **Scene_Frame**: The frame of C40: right-handed, +X east, +Y up, −Z north.
- **Forward_Vector**: The unit vector f of the device's rear-camera direction in the World_Frame. For a sensor Orientation_Stream it is computed by formula 2.9.5 (C61); for the Drag_Compass it is computed from the drag heading and pitch.
- **Vertical_Forward**: The condition in which the length of the horizontal component of the Forward_Vector (its component in the local horizontal plane) is less than 1e-9, so that a heading is undefined. No pitch-angle threshold is used.
- **Device_Heading**: The clockwise angle from true north to the horizontal projection of the Forward_Vector, in degrees in [0, 360), after the Declination correction where it applies and before the Calibration_Offset; typed `number | null`, and `null` under Vertical_Forward.
- **Device_Pitch**: The angle of the Forward_Vector above the local horizontal plane, in degrees in [−90, 90], up positive.
- **Magnetic_Heading**: A heading referenced to magnetic north, as delivered by the Heading_Sources "absolute" and "compass".
- **Declination**: The angle D from true north to magnetic north at an observer position and date, in degrees, east positive, computed from the WMM. True heading = Magnetic_Heading + D.
- **WMM**: The World Magnetic Model WMM2025, published by NOAA NCEI and the British Geological Survey.
- **WMM_Validity_Interval**: The validity interval of WMM2025 (2025 to 2030). The design fixes the exact boundary dates from the WMM2025 publication.
- **NOAA_WMM_Calculator**: NOAA NCEI's official online magnetic field calculator for the WMM. The design records its URL.
- **Declination_Lookup_Date**: The UTC date on which the NOAA_WMM_Calculator lookups of the design phase are made. The design records it.
- **Declination_Acceptance_Points**: Beijing (39.9042° N, 116.4074° E), Shanghai (31.23° N, 121.47° E), Ürümqi (43.83° N, 87.62° E) and Guangzhou (23.13° N, 113.26° E).
- **Calibration_Offset**: The manual heading correction of C54, in degrees, stored normalized in [0, 360). A positive Calibration_Offset makes a target's effective azimuth az' = az − offset.
- **Calibration_Step**: 5°, the step of the calibration buttons (C88).
- **Effective_Azimuth**: The target azimuth after the Calibration_Offset: az' = az − Calibration_Offset, normalized to [0, 360).
- **Target_Vector**: The unit vector u in the World_Frame of a target at Effective_Azimuth az' and elevation el, built by C43 with R = 1.
- **Pointing_Error**: The angle between the Forward_Vector and the Target_Vector, acos(clamp(f·u, −1, 1)), in degrees in [0, 180] (C52, formula 2.9.6).
- **Lock_Tolerance**: 10°, the project pass-lock tolerance.
- **Lock_Result**: The output of the lock geometry for one Forward_Vector and one Target_Vector: Pointing_Error, behind flag, locked flag, Azimuth_Difference and Elevation_Difference.
- **Azimuth_Difference**: wrap(az' − Device_Heading) in degrees, wrapped to (−180, 180], positive when the target lies clockwise of the Device_Heading (to the right); typed `number | null`, and `null` under Vertical_Forward.
- **Elevation_Difference**: el − Device_Pitch in degrees, positive when the target lies above the Device_Pitch.
- **Marker_Projection**: The pure function that maps a Target_Vector, the camera attitude and the viewport aspect ratio to the screen position of the target marker, using a vertical field of view of 75° (C41). The design fixes its inputs and output space.
- **Permission_State_Machine**: The state machine of the orientation-permission flow with exactly the states unknown, requesting, granted, denied and unavailable.
- **Permission_Transition_Function**: The pure function of the Pointing_Core that maps a Permission_State_Machine state and a permission event to the next state.
- **Permission_API**: `DeviceOrientationEvent.requestPermission`, present on iOS Safari.
- **Permission_Timeout**: 5 s, the time after which a Permission_API call that has not settled is abandoned.
- **No_Sample_Timeout**: 3 s, the time after the start of a Subscription after which a Subscription without any Valid_Sample counts as unavailable.
- **User_Gesture_Handler**: An event handler that the browser runs for a direct user activation, such as a click or tap on a button.
- **Drag_Compass**: The pointer-drag pointing mode in which a mouse or touch drag adjusts the drag heading and pitch.
- **Drag_Sensitivity**: 0.25° per CSS pixel of pointer movement, for heading and pitch alike.
- **Manual_Device_Checklist**: The written on-device review checklist of this spec, with one pass on an iPhone and one pass on an Android phone.

## Requirements

### Requirement 1: Pure pointing core and source boundary

**User Story:** As a maintainer, I want all pointing math and the permission transitions in one framework-free directory with a guarded import boundary, so that this logic is testable in Node and cannot drift into the UI or the orbit engine.

#### Acceptance Criteria

1. THE Pointing_Core SHALL place heading-source selection, attitude conversion, heading and pitch extraction, Declination, Calibration_Offset normalization, Target_Vector construction, lock geometry, the Marker_Projection and the Permission_Transition_Function in Pointing_Source_Modules under `src/lib/pointing`, with one `index.ts` barrel as the only entry file, following the module conventions of the Orbit_Engine and the Zombie_Catalog.
2. THE Pointing_Core SHALL use as import and export specifiers in every Pointing_Source_Module only relative paths (starting with `./` or `../`) that resolve to a module inside `src/lib/pointing`, plus the package specifier of the declination dependency WHERE the design selects one, so that no Pointing_Source_Module imports React, Next.js, the Orbit_Engine, the Zombie_Catalog, UI code or any other package.
3. THE Pointing_Core SHALL keep every Pointing_Source_Module free of references, as identifiers or as properties of `globalThis`, to the DOM globals `window`, `document`, `navigator`, `screen`, `localStorage` and `DeviceOrientationEvent`, and SHALL take every input, including Orientation_Samples, the Screen_Orientation_Angle, observer coordinates and dates, as plain parameters.
4. THE Pointing_Core SHALL perform no network access, storage access, timer use or other I/O, including during Declination computation.
5. THE Source_Boundary_Scan SHALL parse every Pointing_Source_Module with the TypeScript compiler API and report every import or export specifier that violates criterion 2; the acceptance test SHALL verify that the scan reports no violation.

### Requirement 2: One heading-source decision

**User Story:** As a satellite listener, I want the app to read my phone's heading from one well-defined source, so that the compass shown on screen and the direction used for locking can never disagree.

#### Acceptance Criteria

1. THE Pointing_Core SHALL provide one source-selection function that maps the event type, the `absolute` flag and the presence of the `webkitCompassHeading` field of an Orientation_Sample to a Heading_Source, as a pure function, by this priority: (a) "absolute" for an event of type `deviceorientationabsolute` or an event whose `absolute` flag is `true`; (b) otherwise "compass" for an event of type `deviceorientation` that carries a numeric `webkitCompassHeading`, with the heading taken from `webkitCompassHeading` and the tilt from the same event; (c) otherwise "relative" for an event of type `deviceorientation`, with alpha used as delivered.
2. THE Pointing_Core SHALL define the priority order "absolute" over "compass" over "relative" for use by the stream selection of Requirement 3.
3. THE acceptance test SHALL verify the source-selection function with mock Orientation_Samples for each of the cases a, b and c of criterion 1, including an event of type `deviceorientation` whose `absolute` flag is `true` (case a) and an event of type `deviceorientationabsolute` that also carries `webkitCompassHeading` (case a).

### Requirement 3: Stream selection and stream lifetime

**User Story:** As a satellite listener, I want the app to pick the best heading source once and stick with it, so that the view does not jump when a second sensor stream wakes up.

#### Acceptance Criteria

1. WHEN a Subscription starts, THE Pointing_Controllers SHALL register listeners for both `deviceorientationabsolute` and `deviceorientation` events.
2. WHILE a Subscription has received no Valid_Sample, THE Pointing_Controllers SHALL wait without selecting a Heading_Source and without a time limit on the wait, while the No_Sample_Timeout of Requirement 11, criterion 10 keeps running from the start of the Subscription.
3. WHEN the first Valid_Sample of a Subscription arrives, at any time after the start of the Subscription, THE Pointing_Controllers SHALL open the Selection_Window at that arrival and SHALL NOT lock a Heading_Source before the Selection_Window ends.
4. WHEN the Selection_Window of a Subscription ends, THE Pointing_Controllers SHALL select, by the source-selection function of Requirement 2 and the priority of Requirement 2, criterion 2, the highest-priority Heading_Source among the Valid_Samples that arrived within the Selection_Window, and SHALL lock the Orientation_Stream of the Subscription to that Heading_Source. Orientation_Samples that are not Valid_Samples take no part in this selection.
5. WHILE a Subscription has not ended, THE Pointing_Controllers SHALL keep the selected Heading_Source, SHALL NOT switch to another Heading_Source, and SHALL treat a period without Orientation_Samples as no reason to switch or to end the Orientation_Stream.
6. WHEN the orientation listeners are removed or the page becomes hidden, THE Pointing_Controllers SHALL end the Subscription and its Orientation_Stream.
7. WHEN the page becomes visible again after the end of a Subscription by page hiding, THE Pointing_Controllers SHALL start a new Subscription, which waits for its first Valid_Sample and opens a new Selection_Window as in criteria 2 to 4.
8. THE Pointing_Controllers SHALL derive every displayed heading, every Lock_Result and every Marker_Projection from the same Forward_Vector, computed from the Attitude of the one selected Orientation_Stream or from the Drag_Compass while the Drag_Compass is active.
9. THE Pointing_Core and the Pointing_Components SHALL NOT use `AbsoluteOrientationSensor` or any other Generic Sensor API interface.
10. THE controller tests SHALL verify criteria 2 to 7 with mock orientation events and mock timers, including a case in which a "relative" Orientation_Sample arrives before an "absolute" Orientation_Sample within the Selection_Window and "absolute" is selected, a case in which an Orientation_Sample of a higher-priority Heading_Source arriving after the selection does not cause a switch, a case in which the first Valid_Sample arrives more than 300 ms after the start of the Subscription and opens the Selection_Window at its arrival without being locked at once, and a case in which only all-null Orientation_Samples arrive, so that they take no part in the selection and the No_Sample_Timeout still sets unavailable 3 s after the start of the Subscription (the desktop Chrome case).

### Requirement 4: Attitude sample handling

**User Story:** As a satellite listener, I want a sensor glitch to leave the view where it was, so that the target marker does not jump to a wrong direction for a frame.

#### Acceptance Criteria

1. IF an Orientation_Sample of the selected Orientation_Stream is not a Valid_Sample, THEN THE Pointing_Controllers SHALL ignore that Orientation_Sample and keep the last valid Attitude unchanged.
2. THE Pointing_Core and the Pointing_Controllers SHALL NOT replace a `null` value of `alpha`, `beta` or `gamma` with 0 or any other number.
3. WHILE the selected Orientation_Stream has delivered no Valid_Sample, THE Pointing_Controllers SHALL report that no Attitude is available and SHALL produce no sensor Forward_Vector.
4. THE controller tests SHALL verify criteria 1 and 3 with a mock Orientation_Sample whose `alpha` is `null` following a Valid_Sample.

### Requirement 5: Attitude to forward vector, heading and pitch

**User Story:** As a satellite listener, I want the phone's rear-camera direction, heading and pitch computed exactly as the documented baselines say, so that the AR view points where the phone points.

#### Acceptance Criteria

1. THE Pointing_Core SHALL compute the sensor Forward_Vector from alpha, beta, gamma and the Screen_Orientation_Angle by formula 2.9.5 (C61): q_cam = quaternion(Euler(beta, alpha, −gamma, 'YXZ')) × Rx(−90°) × Rz(−Screen_Orientation_Angle), and Forward_Vector = q_cam × (0, 0, −1), converted to the World_Frame where the World_Frame is not the Scene_Frame.
2. THE Pointing_Core SHALL include the current Screen_Orientation_Angle in every sensor Forward_Vector computation (C61, C63).
3. WHERE the Heading_Source is "compass", THE Pointing_Core SHALL compute the Forward_Vector so that its heading is the `webkitCompassHeading` of the same Orientation_Sample, corrected by Requirement 6, and its tilt comes from beta and gamma of that Orientation_Sample. The design gives the formula.
4. THE acceptance test SHALL verify, at Screen_Orientation_Angle 0, that the Forward_Vector reproduces every row of the section 4.5 table: (alpha 0°, beta 90°, gamma 0°) gives the north direction (0, 0, −1); (90°, 90°, 0°) gives the west direction (−1, 0, 0); (180°, 90°, 0°) gives the south direction (0, 0, 1); (270°, 90°, 0°) gives the east direction (1, 0, 0); and (0°, 0°, 0°) gives straight down (0, −1, 0), all as Scene_Frame components, each component within 1e-9.
5. THE Pointing_Core SHALL extract the Device_Heading and the Device_Pitch from the Forward_Vector through the explicit frame conversion of the design, and SHALL return the Device_Heading normalized to [0, 360), so that a heading of exactly 360° is returned as 0°.
6. WHILE the Forward_Vector is Vertical_Forward, THE Pointing_Core SHALL return the Device_Heading as `null` and SHALL still return the Device_Pitch. One heading extraction SHALL decide Vertical_Forward for the Device_Heading and the Azimuth_Difference alike, so that the Device_Heading is `null` exactly when the Azimuth_Difference is `null` (Requirement 8, criterion 7).
7. THE design SHALL state the frame conversion used by criterion 5 and SHALL show that it reproduces the section 4.5 UI conventions of criterion 9.
8. Approved addition (OQ-12a): THE acceptance test SHALL verify the Forward_Vector for at least one non-zero Screen_Orientation_Angle, against expected values that the design derives from formula 2.9.5 and records, within 1e-9 per component. Approved addition (OQ-D3, design review): THE acceptance test SHALL also verify that (alpha 0°, beta 90°, gamma 0°) at Screen_Orientation_Angle 90° gives the camera up vector (1, 0, 0) in the Scene_Frame, within 1e-9 per component, because the Screen_Orientation_Angle acts only on the camera up and right vectors.
9. Approved addition (OQ-12b): THE acceptance test SHALL verify the section 4.5 UI conventions for the Heading_Source "relative" with no Declination and no Calibration_Offset: (alpha 90°, beta 90°, gamma 0°) gives the Device_Heading 270°; (270°, 90°, 0°) gives the Device_Heading 90°; (0°, 90°, 0°) gives the Device_Heading 0°; (0°, 90°, 0°) gives the Device_Pitch 0°; and (0°, 0°, 0°) gives the Device_Pitch −90°; each within 1e-9.
10. Approved addition (OQ-12d): THE acceptance test SHALL verify at least one "compass" Orientation_Sample that combines a `webkitCompassHeading` with a tilt from beta and gamma, against an expected Forward_Vector, Device_Heading and Device_Pitch that the design derives and records, within 1e-9.

### Requirement 6: Magnetic declination correction

**User Story:** As a satellite listener, I want the compass heading corrected from magnetic to true north for my location, so that the heading matches the true-north azimuth of the satellite without a manual offset.

#### Acceptance Criteria

1. THE Pointing_Core SHALL compute the Declination from the WMM as a pure function of observer latitude in degrees, observer longitude in degrees and a UTC date, at altitude 0 km in every call, including at run time.
2. IF the UTC date lies outside the WMM_Validity_Interval, THEN THE Pointing_Core SHALL compute the Declination at the nearest boundary date of the WMM_Validity_Interval, without throwing and without extrapolating.
3. WHERE the Heading_Source is "absolute" or "compass", THE Pointing_Core SHALL convert the Magnetic_Heading to the true heading by true = Magnetic_Heading + D, with D east-positive, normalized to [0, 360).
4. WHERE the Heading_Source is "relative" or the Drag_Compass is active, THE Pointing_Core SHALL apply no Declination correction.
5. THE Pointing_Core SHALL compute the Declination on the client from bundled data, without any server or network call.
6. THE Pointing_Core SHALL keep the added declination dependency and the coefficient data within a size budget of about 30 KB, measured as minified and not gzip-compressed, and the design SHALL list the size of the dependency and the size of the coefficient data as separate items.
7. THE design SHALL propose the implementation route (bundled WMM coefficients or a reduced approximation) under the constraints of criteria 5, 6 and 8.
8. THE Pointing_Core SHALL compute, for the Declination_Lookup_Date and altitude 0 km, a Declination within 0.5° of the NOAA_WMM_Calculator WMM2025 value at each Declination_Acceptance_Point.
9. THE design SHALL record the expected Declination value of each Declination_Acceptance_Point as looked up in the NOAA_WMM_Calculator during the design phase, together with the calculator URL, the model version WMM2025, the Declination_Lookup_Date and the altitude 0 km; these values SHALL NOT be written from memory.
10. THE acceptance test SHALL verify the Declination at the four Declination_Acceptance_Points for the Declination_Lookup_Date against the values pinned in the design, with a tolerance of 0.5°.

### Requirement 7: Calibration offset

**User Story:** As a satellite listener, I want to nudge the AR view to match a known landmark, so that a small residual compass error does not stop me from locking on, and I want the offset to behave predictably for any input and to survive a reload.

#### Acceptance Criteria

1. THE Pointing_Core SHALL apply the Calibration_Offset with the sign of C54: a positive Calibration_Offset gives the Effective_Azimuth az' = az − offset.
2. THE acceptance test SHALL verify the section 4.4 calibration sample: azimuth 90°, elevation 0° and Calibration_Offset +10° give the Effective_Azimuth 80° within 1e-9 and the Scene_Frame coordinates (19.696155, 0, −3.472964) at R = 20 within 1e-6 per component.
3. THE Pointing_Core SHALL normalize every Calibration_Offset into [0, 360), including negative inputs, so that for example −5° becomes 355° and −365° becomes 355°.
4. THE acceptance test SHALL verify the normalization of criterion 3 with at least one negative Calibration_Offset input and SHALL verify that a negative input and its normalized value give the same Effective_Azimuth.
5. IF a Calibration_Offset input is not a finite number, including `NaN`, `Infinity`, `null`, `undefined` and non-numeric strings, THEN THE Pointing_Core SHALL reject the input and the Calibration_Offset SHALL keep its previous value, without being reset to 0 and without ever becoming `NaN`.
6. THE Pointing_Controllers SHALL persist the normalized Calibration_Offset in `localStorage` and read it back on start; the Pointing_Core SHALL do only the normalization and the input check.
7. WHEN the Pointing_Controllers read a stored Calibration_Offset that the input check of criterion 5 rejects, or find none, THE Pointing_Controllers SHALL use the default Calibration_Offset 0° (C71).
8. THE Pointing_Demo_Page SHALL provide two calibration buttons that change the Calibration_Offset by −Calibration_Step and +Calibration_Step, and every changed value SHALL pass through the normalization of criterion 3, so that −5° from 0° gives 355°.
9. THE controller tests SHALL verify criteria 6 to 8 with a mock storage, including a stored non-numeric value.

### Requirement 8: Target vector and lock geometry

**User Story:** As a satellite listener, I want a clear lock decision and directional guidance, so that I know when I am on target and which way to move when I am not.

#### Acceptance Criteria

1. THE Pointing_Core SHALL express the Forward_Vector and the Target_Vector in the World_Frame before it computes their dot product.
2. THE Pointing_Core SHALL build the Target_Vector from the Effective_Azimuth and the elevation by C43 with R = 1.
3. THE Pointing_Core SHALL compute the Pointing_Error as acos(clamp(f·u, −1, 1)) in degrees (C52, formula 2.9.6).
4. THE Pointing_Core SHALL set the locked flag of the Lock_Result to `true` if and only if the Pointing_Error is less than or equal to the Lock_Tolerance of 10°; the design SHALL state how the exact 10° boundary is evaluated in floating point.
5. THE Pointing_Core SHALL set the behind flag of the Lock_Result to `true` if and only if f·u < 0.
6. THE Pointing_Core SHALL include in the Lock_Result the Azimuth_Difference, wrapped to (−180, 180] and positive when the target lies to the right, and the Elevation_Difference, positive when the target lies above, for the signal-quality mapping of S4 and for UI guidance.
7. WHILE the Forward_Vector is Vertical_Forward, THE Pointing_Core SHALL return the Azimuth_Difference as `null`, typed `number | null`, decided by the same heading extraction that returns the Device_Heading as `null` (Requirement 5, criterion 6), and SHALL still return the Pointing_Error, the locked flag, the behind flag and the Elevation_Difference computed as in criteria 3 to 6.
8. THE Pointing_Core and the Pointing_Components SHALL contain no lock threshold other than the Lock_Tolerance of 10°; the superseded 8° threshold SHALL NOT appear as a lock or alignment constant anywhere in the code.
9. THE acceptance test SHALL verify the lock geometry with at least: a target straight ahead (Pointing_Error 0°, locked), a target exactly 10° away (locked), a target more than 10° away (not locked), a target behind (f·u < 0, behind flag `true`, not locked), and a Vertical_Forward case (Device_Heading and Azimuth_Difference both `null`; Device_Pitch, Pointing_Error, locked flag, behind flag and Elevation_Difference present).
10. Approved addition (OQ-12c): THE acceptance test SHALL verify the remaining rows of section 4.4 as Target_Vector checks, scaled to R = 20: azimuth 0°, 90°, 180° and 270° at elevation 0° give (0, 0, −20), (20, 0, 0), (0, 0, 20) and (−20, 0, 0); azimuth 0° at elevation 90° gives (0, 20, 0); azimuth 90° at elevation 45° gives (14.142136, 14.142136, 0); all as Scene_Frame components within 1e-6, with Calibration_Offset 0. The acceptance test SHALL also verify the three real-data rows of section 4.4 at R = 20 and Calibration_Offset 0: ZHTW at 2026-11-09T12:00:00Z (azimuth 163.3780°, elevation 14.6746°) gives (5.5345, 5.0666, 18.5391); ISS at 2026-11-09T11:23:00Z (163.7360°, 45.4236°) gives (3.9313, 14.2463, 13.4754); ISS at 2026-11-09T12:00:00Z (56.7028°, −67.3222°) gives (6.4451, −18.4538, −4.2332); within 1e-4 per component. Reason for the wider tolerance: the section 4.4 table prints these rows with 4 decimals, so the printed coordinates carry a rounding error of up to 5e-5, and a tolerance of 1e-6 would fail because of the table's precision, not because of the implementation. The axis-aligned rows keep 1e-6.

### Requirement 9: Heading correction chain

**User Story:** As a satellite listener, I want every correction applied once, in one fixed order, in every pointing mode, so that the lock decision means the same thing on iPhone, Android and desktop.

#### Acceptance Criteria

1. THE Pointing_Core SHALL apply the corrections in this order: first the Declination of Requirement 6 to the Magnetic_Heading where Requirement 6, criterion 3 applies, then the Calibration_Offset of Requirement 7 through the Effective_Azimuth.
2. THE Pointing_Core SHALL apply the Calibration_Offset for every Heading_Source and for the Drag_Compass, through the same function chain.
3. Approved addition (OQ-12e): THE acceptance test SHALL verify one end-to-end case that starts from a Magnetic_Heading of an "absolute" or "compass" Orientation_Sample, a Declination_Acceptance_Point at the Declination_Lookup_Date, a non-zero Calibration_Offset and a target azimuth and elevation, and checks the resulting Device_Heading, Azimuth_Difference and locked flag against expected values that the design derives from the pinned Declination value and records.

### Requirement 10: Marker projection

**User Story:** As a developer of the later camera view, I want a pure projection function, so that the marker can be drawn without a 3D library and without affecting the lock decision.

#### Acceptance Criteria

1. THE Pointing_Core SHALL provide the Marker_Projection as a pure function with a fixed vertical field of view of 75° (C41), taking the viewport aspect ratio as an input.
2. THE Marker_Projection SHALL NOT feed into the Lock_Result; the locked flag and the behind flag SHALL depend only on the Forward_Vector and the Target_Vector.
3. THE Pointing_Core SHALL implement its quaternion and vector math by hand, without three.js or any other math or 3D package.

### Requirement 11: Orientation permission flow

**User Story:** As a satellite listener on an iPhone, I want a clear button to allow motion sensors and a way out of every error, so that I never get stuck on a loading screen.

#### Acceptance Criteria

1. THE Pointing_Core SHALL provide the Permission_Transition_Function as a pure function from a state of the Permission_State_Machine and a permission event to the next state; the Permission_State_Machine SHALL have exactly the states unknown, requesting, granted, denied and unavailable, and SHALL start in unknown.
2. THE Pointing_Controllers SHALL perform the side effects of the permission flow (calling the Permission_API, subscribing to orientation events, running the Permission_Timeout and the No_Sample_Timeout) and SHALL obtain every state change from the Permission_Transition_Function.
3. WHERE the Permission_API exists, THE Pointing_Controllers SHALL call `DeviceOrientationEvent.requestPermission()` only from a User_Gesture_Handler and SHALL NOT call it automatically, including on page load, on mount and on restore of a saved state.
4. WHEN the Permission_API is called, THE Permission_State_Machine SHALL enter requesting.
5. WHEN the Permission_API resolves with `granted`, THE Permission_State_Machine SHALL enter granted, and the Pointing_Controllers SHALL start a Subscription.
6. WHEN the Permission_API resolves with `denied`, the explicit refusal by the user, THE Permission_State_Machine SHALL enter denied; no other outcome of the Permission_API SHALL lead to denied.
7. IF the Permission_API promise rejects, resolves with a value other than `granted` or `denied`, or has not settled when the Permission_Timeout of 5 s after the call ends, THEN THE Permission_State_Machine SHALL return to unknown, enter neither denied nor granted, start no Subscription, and the Pointing_Demo_Page SHALL offer the permission action again; these outcomes are browser or flow errors, not a decision by the user.
8. WHILE the Permission_State_Machine is in denied, THE Pointing_Demo_Page SHALL show an error message and a retry action that starts a new Permission_API call from a User_Gesture_Handler.
9. WHERE the Permission_API does not exist, THE Pointing_Controllers SHALL start a Subscription without a permission request, and THE Permission_State_Machine SHALL enter granted.
10. IF no Valid_Sample arrives within the No_Sample_Timeout of 3 s after the start of a Subscription, THEN THE Permission_State_Machine SHALL enter unavailable, not remain in requesting or granted.
11. WHEN the Permission_State_Machine enters unavailable or denied, THE Pointing_Controllers SHALL activate the Drag_Compass.
12. THE acceptance test SHALL verify the Permission_Transition_Function for every transition of criteria 4 to 10 and 13, and the controller tests SHALL verify with mocks that the Permission_API is not called without a user gesture, that a never-settling Permission_API call returns to unknown after 5 s, and that a Subscription without Valid_Samples enters unavailable after 3 s.
13. Approved addition (OQ-D2, design review): WHEN a Valid_Sample arrives while the Permission_State_Machine is in unavailable, THE Permission_State_Machine SHALL enter granted, and THE Pointing_Controllers SHALL leave the Drag_Compass active until the user turns it off with the manual toggle. The state granted means that permission is given, or no Permission_API exists, and that Valid_Samples are flowing or have not yet been ruled out by the No_Sample_Timeout.

### Requirement 12: Drag compass

**User Story:** As a newcomer on a desktop, a judge trying the demo, or a tester without a sensor device, I want to point by dragging, so that I can exercise the full pointing flow without a phone.

#### Acceptance Criteria

1. THE Pointing_Components SHALL provide the Drag_Compass, in which a pointer drag with a mouse or a touch changes the drag heading and the drag pitch by the Drag_Sensitivity of 0.25° per CSS pixel of horizontal and vertical pointer movement. The drag follows device-steering semantics, as if the user turned the phone: a drag to the right increases the heading (turning right), and a drag toward the top of the screen increases the pitch (looking up). It does not drag the sky or a map.
2. WHEN the Drag_Compass is activated, THE Drag_Compass SHALL start at heading 0° and pitch 0°.
3. THE Drag_Compass SHALL keep the heading in [0, 360), wrapping across 0°, and the pitch in [−90, 90], clamped at the limits.
4. THE Pointing_Demo_Page SHALL provide a manual toggle that activates and deactivates the Drag_Compass on devices with orientation sensors as well, in addition to the automatic activation of Requirement 11, criterion 11.
5. WHILE the Drag_Compass is active, THE Pointing_Core SHALL compute the Forward_Vector from the drag heading and pitch in the World_Frame, treat the drag heading as a true heading without Declination, apply the Calibration_Offset through the chain of Requirement 9, and pass the result to the same lock geometry as a sensor Forward_Vector.
6. THE controller tests SHALL verify criteria 1 to 3 with mock pointer events, including a heading wrap across 0° and a pitch clamp.

### Requirement 13: Test environment and review

**User Story:** As a maintainer, I want the pointing layer pinned by small Node tests and one on-device review, so that a regression in the math is caught by `pnpm test` and the sensor behaviour is checked on real phones.

#### Acceptance Criteria

1. THE tests of this spec SHALL run in the Vitest `node` environment of `vitest.config.ts`, as `tests/**/*.test.ts` files, without jsdom, happy-dom or a React testing library.
2. THE acceptance tests over the Pointing_Core SHALL be plain example assertions, and the controller tests SHALL replace orientation events, the Permission_API, the screen orientation, page visibility, storage, timers and pointer events with injected mocks.
3. THE React components of the Pointing_Demo_Page SHALL contain no pointing logic beyond rendering controller state and forwarding user events to the Pointing_Controllers, and SHALL be checked by review.
4. THE Manual_Device_Checklist SHALL contain one pass on an iPhone and one pass on an Android phone, and SHALL be a review item of the final task, not an automated test.
5. THE tests SHALL run offline, under the existing network guard of `tests/setup/network-guard.ts`.

## Decisions recorded during requirements refinement

- OQ-1: Test environment stays `node`; component logic lives in framework-free Pointing_Controllers tested with mock events; React stays thin and review-only; no jsdom.
- OQ-2: The permission transition logic is the pure Permission_Transition_Function in `src/lib/pointing`; the component layer performs only side effects.
- OQ-3: Selection_Window of 300 ms (its start refined by OQ-R1); the highest-priority Heading_Source among its samples wins and is locked. Silence does not end a stream; a stream ends only when the listeners are removed or the page is hidden; a new selection runs when the page becomes visible again.
- OQ-4: Permission_Timeout 5 s returns to unknown with a retry, never to denied; denied means explicit refusal. No_Sample_Timeout 3 s leads to unavailable.
- OQ-5: Declination applies to "absolute" and "compass" only; the Calibration_Offset applies to all sources and to the Drag_Compass; order: Declination, then Calibration_Offset.
- OQ-6: Declination_Lookup_Date is the actual lookup date recorded in the design and is used by the tests; altitude 0 km, also at run time; WMM2025; dates outside the validity interval are clamped to the boundary date.
- OQ-7: Size measured minified, not gzipped; dependency and coefficient data listed separately.
- OQ-8: Non-finite input is rejected and the previous value kept; the offset is persisted in `localStorage` by the controller layer; ±5° buttons are in scope as a minimal implementation on the Pointing_Demo_Page.
- OQ-9: Azimuth_Difference positive to the right, Elevation_Difference positive above; Azimuth_Difference is `null` under Vertical_Forward, other fields still given.
- OQ-10: Drag_Sensitivity 0.25°/px for both axes; start at heading 0°, pitch 0°; automatic activation on unavailable or denied plus a manual toggle; the Calibration_Offset applies in Drag_Compass mode through the same chain.
- OQ-11: Pure Marker_Projection function only; hand-written quaternion math; no three.js; the camera view component belongs to S4 or S6.
- OQ-12: Cases (a) to (e) are added as approved additions.
- OQ-13: Tolerances 1e-9 for the section 4.5 rows and the Effective_Azimuth, 1e-6 for the section 4.4 coordinates, 0.5° for the Declination.

- OQ-R1: The Selection_Window starts at the first Valid_Sample of a Subscription, not at the start of the Subscription; before it the controller waits indefinitely while the 3 s No_Sample_Timeout runs; a late first sample opens the window and is not locked at once. Samples that are not Valid_Samples (a required field `null` or absent) take no part in the selection and do not count as arrived samples, so the all-null `deviceorientation` event of desktop Chrome does not block unavailable. A Valid_Sample has every field its Heading_Source needs to compute a Forward_Vector.
- OQ-R2: A rejected Permission_API promise is an error and returns to unknown with a retry, the same path as the Permission_Timeout; denied only for a promise that resolves with `denied`.
- OQ-R3: Vertical_Forward when the horizontal component of the Forward_Vector is shorter than 1e-9; no pitch threshold. Under Vertical_Forward the Device_Heading and the Azimuth_Difference are both `null`, decided by one extraction; the Device_Pitch is still returned.
- OQ-R4: Device-steering semantics: a drag to the right increases the heading, a drag up increases the pitch.
- OQ-R5: The Pointing_Demo_Page route is `/pointing`.
- OQ-R6: The three real-data rows of section 4.4 are included with a tolerance of 1e-4, because the table prints them with 4 decimals; the axis-aligned rows keep 1e-6.

- OQ-R7: A Permission_API promise that resolves with a value other than `granted` or `denied` is an error, like a rejection: it returns to unknown, is never recorded as denied and never treated as granted.
- OQ-R8: Two controller test cases are added to Requirement 3, criterion 10: a late first Valid_Sample opens the Selection_Window without an immediate lock, and all-null samples neither take part in the selection nor prevent unavailable after 3 s.
