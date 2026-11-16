# Requirements: AR tab (S9)

## Introduction

Today the AR_View opens only from a running session, in the `awaiting-pass` and `in-pass` phases, so the satellite marker is missing while the satellite is below the horizon and the user needs several taps to reach it. S9 adds a standalone **AR tab** in the bottom bar. It shows the live satellite direction at every instant (also below the horizon), a near-closed orbit ring for one revolution, a centre guide arrow, a 24-hour visibility bar and a camera-to-night-sky slider. The fixed catalog of satellites, the UTC rule, satellite.js 6.0.2 and the honesty rules of the earlier specs keep applying.

## Glossary

- **AR_Tab**: the page at `/ar` and its entry in the bottom Tab_Bar.
- **Tab_Bar**: the existing bottom navigation of `layout.tsx`.
- **AR_Satellite**: the satellite the AR_Tab currently follows; one of `listPlayableEntries()`.
- **Live_Target**: the az/el of the AR_Satellite at the current instant from `observeAt`, for any elevation.
- **Orbit_Ring**: the path of the AR_Satellite over one revolution, drawn around the sky.
- **Ring_Anchor**: the instant `t0` at which an Orbit_Ring was built.
- **Ring_Refresh**: the rebuild of the Orbit_Ring with a new Ring_Anchor.
- **Center_Guide**: the arrow in the middle of the screen that points toward the Live_Target.
- **Lock_Halo**: the faint circle of angular radius `LOCK_TOLERANCE_DEG` (10°) around the Live_Target.
- **Visibility_Bar**: the 24-hour bar of the windows in which the AR_Satellite is at or above elevation 0°.
- **Sky_Slider**: the vertical slider that blends the camera picture into the Night_Sky.
- **Night_Sky**: a dark background with a fixed, generated star field and the Horizon_Line and Cardinal_Marks.
- **Satellite_Switcher**: the control that changes the AR_Satellite.
- **Ring_Morph**: the animated change from the old Orbit_Ring to the new one when the AR_Satellite changes.

## Requirements

### Requirement 1: Entry

**User Story:** As a user, I want to reach the AR in one tap, so that I do not start a session first.

1. THE Tab_Bar SHALL show an "AR" entry that links to `/ar`, with the same look and active state as the other entries.
2. WHEN the AR_Tab opens, THE app SHALL show the camera picture, the Live_Target and the Orbit_Ring of the AR_Satellite without a session, a pass phase or a start button.
3. THE AR_Tab SHALL start the camera when it opens and SHALL stop it when it closes.
4. THE AR_Tab SHALL put the sensor permission behind a visible button that calls `pointing.requestPermission()` inside the click, and SHALL fall back to the landed drag compass when sensors are unavailable or denied.
5. THE service worker SHALL list `/ar` among its shell documents.

### Requirement 2: Satellite switching

1. THE AR_Tab SHALL show one card per entry of `listPlayableEntries()` in a horizontally scrollable, snapping strip, and SHALL mark the AR_Satellite.
2. WHEN the user selects a card, THE AR_Tab SHALL make that entry the AR_Satellite and SHALL load its TLE through the existing `createTleSource` and `createTleFetcher`; THE AR_Tab SHALL add no other network path.
3. WHILE the TLE of the AR_Satellite loads, THE AR_Tab SHALL show a loading note; WHEN it fails or SGP4 fails, THE AR_Tab SHALL show a short error note and SHALL draw no invented position.
4. WHEN the AR_Satellite changes, THE Orbit_Ring SHALL change by a Ring_Morph of 600 ms and THE Live_Target marker SHALL move to its new direction in the same time. THE morph SHALL not run when the user has reduced motion set; the new ring appears at once.

### Requirement 3: Live position

1. THE AR_Tab SHALL compute the Live_Target from `observeAt` at the current instant at most 30 times per second, with the S3 calibration offset applied as in the AR_Overlay.
2. THE AR_Tab SHALL draw the Live_Target as a filled dot with a halo whenever its direction is in front of the camera, at every elevation including negative ones.
3. WHILE the elevation of the Live_Target is below 0°, THE AR_Tab SHALL draw the dot with a dashed halo and SHALL label it "Below horizon".
4. WHEN the Live_Target is not in front of the camera, THE Center_Guide SHALL be the only pointer; THE AR_Tab SHALL NOT use the S7 Edge_Arrow.

### Requirement 4: Orbit ring

1. THE Orbit_Ring SHALL cover one revolution: the period is `1440 / MEAN_MOTION` minutes from the TLE, sampled at 180 equal steps from the Ring_Anchor, plus the closing sample at one full period.
2. THE ring points SHALL be the ECI positions from `propagateAt` at the sample instants, rotated into the Earth-fixed frame by the GMST of the Ring_Anchor only (Decision S9-1, "frozen Earth"), then converted to azimuth and elevation for the observer. The ring is thus a near-closed loop through the Live_Target at the Ring_Anchor; the closing gap is the SGP4 drift of one revolution.
3. THE AR_Tab SHALL redo the Ring_Refresh every 5 s, so that the ring follows the real motion and does not stand still when the page stays open.
4. THE AR_Overlay SHALL draw ring samples with elevation at or above 0° solid and samples below 0° dashed, split at the sign change with a shared boundary sample; a sample whose propagation fails SHALL leave a gap.
5. THE AR_Overlay SHALL mark the ring with small time ticks at multiples of one twelfth of the period after the Ring_Anchor, labelled `+N min`, with a dot of radius 1.5 and a label of font size 9.
6. THE ring math SHALL be pure functions of the Field_Core with example tests; the ring SHALL NOT claim future positions beyond what the frozen-Earth model says (the label of the ring is "orbit ring" and not "future track").

### Requirement 5: Centre guide

1. WHILE the pointing error of `evaluateLock` (the S3 lock, C52, tolerance 10°) is above the tolerance, THE AR_Tab SHALL draw the Center_Guide at the centre of the screen, rotated toward the Live_Target by `atan2(u·up, u·right)` in camera space.
2. WHEN the lock is reached, THE Center_Guide SHALL disappear and THE AR_Tab SHALL draw the Lock_Halo at 35 % opacity around the Live_Target, so that the satellite is seen at the centre of the circle.
3. THE AR_Tab SHALL define no lock threshold of its own; the lock SHALL be `evaluateLock(basis.forward, live target, calibration offset)` of the landed S3 code.
4. WHEN the Live_Target is exactly behind the camera, THE Center_Guide SHALL point to the right (angle 0).

### Requirement 6: Surrounding information and controls

1. THE AR_Tab SHALL show azimuth, elevation, slant range and range rate of the Live_Target in the corners, and a lock indicator, in monospace figures.
2. THE AR_Tab SHALL show the UTC time of the instant (all times are UTC).
3. THE AR_Tab SHALL offer the S3 calibration buttons (↺ ↻ by `CALIBRATION_STEP_DEG`) and the FOV controls of S7 (`FOV_STEP_DEG`, persisted through `fov-store`).
4. THE texts of the AR_Tab SHALL follow the honesty rules (scaffold checks 1.24 and 1.25) and SHALL NOT say that the app receives anything.

### Requirement 7: 24-hour visibility bar

1. THE AR_Tab SHALL draw below the picture a bar that spans the next 24 hours from now, with the windows in which the AR_Satellite is at or above elevation 0°, found by `predictPasses` with `durationHours` 24 and `minElevationDeg` 0.
2. THE bar SHALL mark "now" at its left end, hour ticks every 6 hours labelled in UTC, and SHALL clip a window that is running or that crosses the end to the bar.
3. THE AR_Tab SHALL show the next window as text: the UTC rise time and the maximum elevation, or "In view now" when a window is running, or "No pass in 24 h".
4. THE AR_Tab SHALL recompute the bar when the AR_Satellite or the observer changes and every 60 s.
5. THE bar math (window to fraction, clipping, hour ticks) SHALL be pure functions of the Field_Core with example tests.

### Requirement 8: Camera to night-sky slider

1. THE AR_Tab SHALL show a vertical Sky_Slider at the side; at the top end the camera picture has full opacity, at the bottom end the picture is hidden and only the Night_Sky shows, and values between blend linearly.
2. THE Night_Sky SHALL draw 300 stars from a fixed seed at fixed sky directions, so that they move with the phone as the sky does; their brightness SHALL scale with `1 − camera opacity`. THE stars are an aid for orientation and SHALL NOT be presented as real stars or constellations.
3. THE Horizon_Line, the Cardinal_Marks, the Orbit_Ring and the Live_Target SHALL stay visible at every slider value.
4. THE slider value SHALL be kept in memory only.

### Requirement 9: Data and observer

1. THE AR_Tab SHALL take the observer from `createObserverStore`, and SHALL call the existing locator's `autoLocate` once so that a fresh position is stored, as the Session_Page does; THE observer altitude SHALL be 0 km.
2. THE AR_Tab SHALL pass the observer to the pointing session so that the declination applies.
3. THE AR_Tab SHALL add no backend route and no new data source.

### Requirement 10: Structure and tests

1. THE new pure code (ring, ring blend, guide angle, star field, visibility bar) SHALL live in `src/lib/field` and SHALL be exported from its barrel.
2. THE example tests SHALL be in `tests/field/ar-tab.test.ts`; every expected value SHALL be analytic or equal to an existing landed function at the same input (the ring's first sample equals `observeAt` at the Ring_Anchor within 0.01°).
3. THE scaffold test lists (routes and `.tsx` files) SHALL be updated for the new files.
4. THE drawing and the feel SHALL be checked by review on a real phone (task 5).
5. THE existing session AR_View SHALL stay unchanged.
