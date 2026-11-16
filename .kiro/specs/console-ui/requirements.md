# Requirements Document

## Introduction

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). Users pick a real "zombie satellite" from a fixed catalog of seven, the app predicts its passes over the user's location from public TLE data (SGP4), points the phone at the satellite during a pass, plays a simulated beacon whose pitch follows the Doppler shift, and issues a digital QSL card after the pass. The app is pure software: only the public orbital data is real, and the app receives no real radio-frequency signals.

S1 to S7 landed the features. The project owner's review of the result is that the screens read like a news page: a column of cards, tables and paragraphs, with the visuals as decoration. The owner wants a visual, operable mobile console in which the user feels the process of finding the satellite: a live radar, an AR overlay, a satellite dial, an estimate of the time to the next pass, and a dynamic meter that shows how well the phone is aimed at the satellite. This spec, console-ui (S8), is a presentation redesign of the home screen and the session screen. It changes no orbit, session, audio, QSL, tuning or illumination logic.

The spec has five parts, delivered in the order of the Delivery_Tiers (Requirement 15):

1. Alignment_Meter and its pure level mapping (Requirements 2 and 3).
2. Session_Console: radar, meter, AR entry, countdown and lock state as the main area (Requirements 4 to 6).
3. Console_Home: the Satellite_Dial with the Radar_Panel and the Pass_Strip (Requirements 7 to 9).
4. Compact_Controls: the S7 text-heavy panels moved behind tabs and sheets (Requirement 10).
5. Interaction polish: touch targets, motion, and the first-screen rule (Requirements 11 and 12).

The orbit-engine (S1), zombie-catalog (S2), ar-pointing (S3), seance-session (S4), qsl-card (S5), shell-pwa-deploy (S6) and field-companion (S7) specs have landed. This spec consumes their interfaces as landed. Where a part needs a change to a landed interface or behavior, the design proposes the extension explicitly with reasons (Requirement 13); `src/lib/orbit` is never changed.

Landed interfaces consumed (cited as landed, not re-verified in the requirements phase):

- S1, `src/lib/orbit`: `createSatrec`, `propagateAt`, `observeAt` (look angles, `rangeRateKmPerS`), `predictPasses` and the `Pass` object `{ riseMs, peakMs, setMs, maxElevationDeg, durationMin, startTruncated, endTruncated }`; the `Observer` type.
- S2, `src/lib/catalog`: `listCatalogEntries`, `listPlayableEntries`, `getCatalogEntry`; the entry fields `slug`, `name`, `noradId`, `playable`, `unplayableReason`, `status`, `hook`, `story`, `sourceUrls`, and the `BeaconBlock` fields `downlinkMhz`, `displayFrequency`, `sunlitOnly`.
- S3, `src/lib/pointing` and `src/components/pointing`: `sceneDirection`, `effectiveAzimuthDeg`, `evaluateLock` and `LockResult`, `LOCK_TOLERANCE_DEG` (10°), `projectMarker`, `CameraBasis`, the pointing session with its snapshot (`basis`, `lock`, `target`, `calibrationOffsetDeg`, `source`, `permission`), the drag compass and the injected interfaces of `src/components/pointing/deps.ts`.
- S4, `src/lib/session` and `src/components/session`: the phases `selecting`, `awaiting-pass`, `in-pass` and `completed`; the Session_Clock and `DEMO_RATE` (60); `formatDopplerReadout`, `formatUtc` (the only UTC formatter), `formatCountdown`; `createSessionController` and its `SessionSnapshot`; the observer store; `SESSION_COPY`.
- S5, `src/components/qsl`: the QSL_Card and the cards pages, unchanged by this spec.
- S6, `src/lib/shell` and `src/components/shell`: `domePoint`, `domeRadius`, `passProfilePath` of `src/lib/shell/sky.ts`; `markerPlacement`; `formatLocalTimeNote`; `createCameraController`; the geolocation controller; the Global_Navigation; the visual components of `src/components/shell/visuals` (`sky-dome`, `lifeline`, `pass-profile`, `doppler-dial`); `SHELL_COPY`; the Seance Observatory look (S6 tasks 7A to 7C); the S6 design section "Camera backdrop and sky view" (DD-1, DD-2).
- S7, `src/lib/field` and `src/components/field`: the Field_Core (`sky-track`, `ar`, `fov`, `tuning`, `planner`, `illumination`, `shadow`, `ground-track`, `guide`, `log`, `models`, `ics`) through its barrel; `createPassFieldController` and `PassFieldSnapshot`; `ArView`, `FieldSessionPanel`, `GroundTrackMap`, `ModelViewer`, `FirstRunGuide`; `FIELD_COPY`; the Instrument_Detail of the S7 screens (kept as it is).
- S1 to S7, `tests/scaffold/scaffold.test.ts`: checks 1.19 to 1.25 as they stand after S7.

### Normative sources

- Sections 2 and 4 of the Reference_Document are normative project-wide. This spec relies on C52 and formula 2.9.6 with the alignment constant replaced by 10° (project rule: `angle = acos(f·u)`, `f·u < 0` counts as behind) through the landed S3 lock geometry, and on C36 and C37 (elevation and azimuth) through the landed look angles. No section 3 item applies.
- The pass lock tolerance is ±10° everywhere (project rule). The 8° alignment value of the Reference_Document applies nowhere, including the Alignment_Meter.
- Times: all instants are UTC (project rule). `formatUtc` stays the only UTC formatter; the S6 Local_Time_Note stays a secondary line only.
- The app never claims to receive real RF signals; beacon audio is synthesized from public TLE data (project rule).
- The catalog is fixed at seven entries. There is no satellite search, no user satellite library and no custom backend; TLE data comes from CelesTrak through the landed `/api/tle` proxy.
- satellite.js stays pinned to 6.0.2. No new package is added and no WebGL is used.
- S1 Requirement 1, criterion 11 (every test file runs in the Vitest `node` environment) stays in force; no DOM test environment is added.

### Verification scope

The automated tests of this spec run in the Vitest `node` environment, offline under the existing network guard. They cover exactly the cases this document names:

- The Meter_Level mapping from a pointing error, with one pinned example set the design states (Requirement 2, criterion 5).
- The Source_Boundary_Scan of the new lib directory, if the design creates one (Requirement 3, criterion 3).
- The extended scaffold checks 1.19, 1.24 and 1.25 (Requirement 14).

The React components, the drawing of every visual, motion, touch behavior, sheets and tabs, and the feel of the meter are checked by review on the project owner's real phone against the Live_URL (Requirement 16). Criteria not named here are checked by review. Further automated cases are added only with the owner's approval.

### Out of scope

- Any change to orbit propagation, pass prediction, the session state machine, the beacon audio, the QSL card, the tuning computation, the illumination and shadow logic, the lock evaluation or `LOCK_TOLERANCE_DEG`.
- A simple mode and a professional mode. S8 has one mode only (Decision OQ-3). The S7 Instrument_Detail stays as it is and is not redesigned.
- Any change to external links: the Listening_Guide, the source links and every other outbound link stay exactly as today (Decision OQ-2).
- Satellite search, a user satellite library, any satellite outside the fixed catalog, a custom backend, user accounts.
- A WebGL renderer, a new package, a web font, a DOM test environment and React component tests.
- Any real radio reception, recording, decoding or radio control.
- New acceptance cases beyond those named in the Verification scope.
- Redesign of the QSL cards pages, the Listening_Log page, the Listening_Guide content and the Model_Viewer geometry, beyond the entry points and the first-screen rule of Requirements 10 and 12.

### Known limitations

1. The Alignment_Meter measures the pointing error between the phone's camera direction and the satellite direction. It is not a received signal strength and the app has no receiver. Its accuracy is the accuracy of the phone's compass and tilt sensors (S3 risk R1 applies).
2. The Next_Pass_Estimate is a prediction from public TLE data; its accuracy is the accuracy of the TLE and of S1 pass prediction.
3. The Radar_Panel is a schematic sky view in the S6 azimuthal equidistant projection, not a photograph and not a tracking display of a real instrument.
4. Motion is presentational. With reduced motion requested, the console shows the same information in static form.

## Glossary

Terms defined by S1 to S7 keep their landed meaning and are not repeated here, among them Pass, Target_Pass, Session_Page, Home_Page, Sky_Dome, Sky_Track, AR_View, AR_Overlay, Lock_Ring, Behind, Instrument_Detail, Field_Core, Field_Components, Field_Copy, Honesty_Scan, Route_Check, Source_Boundary_Scan, Session_Instant, Demo_Session, Playable_Entry, Story_Only_Entry, Reference_Document, Live_URL, Provenance_Sentences and Submission_Deadline.

- **Console_Home**: The redesigned Home_Page of this spec.
- **Session_Console**: The redesigned session screen of one Playable_Entry in the `awaiting-pass`, `in-pass` and `completed` phases (the screen at `/session/[noradId]`).
- **Satellite_Dial**: The Console_Home control that shows the seven catalog entries as a swipeable carousel or a circular dial, with one selected entry.
- **Selected_Entry**: The catalog entry currently selected in the Satellite_Dial.
- **Radar_Panel**: The live radar sky view: the S6 Sky_Dome with the current position of the Selected_Entry or session entry, its path across the sky, the horizon ring, the cardinal marks, and, in the Session_Console, the phone's pointing reticle and the Lock_Ring.
- **Radar_Sweep**: The slowly rotating sweep line drawn on the Radar_Panel as a purely presentational motion.
- **Pass_Strip**: A horizontal timeline of the next passes of the Selected_Entry over the next 48 hours for the Observer, each pass a mark placed by its time and sized by its Maximum_Elevation.
- **Next_Pass_Estimate**: The time from the current Real_Clock instant to the AOS of the next pass of the Selected_Entry, shown as a Countdown_Ring and as formatted text.
- **Countdown_Ring**: The ring or arc that fills as the Next_Pass_Estimate approaches zero, over a fixed lead window the design states.
- **Pointing_Error**: The angle in degrees between the camera forward direction and the unit direction to the satellite, `acos(f·u)` of the landed lock geometry (C52), as carried by the landed `LockResult`.
- **Alignment_Meter**: The dynamic meter of the Session_Console that shows how closely the phone is aimed at the satellite, driven by the Pointing_Error and the landed lock tolerance.
- **Meter_Level**: The pure function result that maps a Pointing_Error (or its absence) to the displayed state of the Alignment_Meter: a level from 0 to 1 and a named band.
- **Meter_Band**: The named state of the Alignment_Meter: locked (Pointing_Error at most `LOCK_TOLERANCE_DEG`), closing and far, and unavailable (no pointing source or the satellite not in a pass). The design fixes the band edges above the lock tolerance.
- **Meter_Unavailable**: The Meter_Band shown when there is no Pointing_Error to measure.
- **AR_Entry**: The large control of the Session_Console that opens the landed AR_View.
- **Lock_State**: The landed `LockResult.locked` of the session's pointing source, shown as a badge on the Session_Console.
- **Console_Sheet**: A bottom sheet or full-screen sheet that opens over the Session_Console or Console_Home and holds one Compact_Control content.
- **Console_Tab**: One tab of a tab bar that switches the lower area of the Session_Console or Console_Home between Compact_Control contents.
- **Compact_Controls**: The collective name of the Console_Tabs, Console_Sheets and small buttons that hold the S7 text-heavy content: the Tuning_Table and Minute_Table, the Pass_Planner list, the Listening_Guide entry, the story and history text, the Ground_Track_Map, the Model_Viewer, the Listening_Log link and the First_Run_Guide.
- **First_Screen**: What the user sees on a 360 × 640 CSS-pixel viewport without scrolling, when a console screen opens.
- **Touch_Target**: An interactive control. The Touch_Minimum is 44 × 44 CSS pixels.
- **Reduced_Motion**: The browser preference `prefers-reduced-motion: reduce`.
- **Delivery_Tiers**: The ranking Must, Should and Could of Requirement 15.
- **Console_Lib**: A new lib directory proposed by the design for the pure functions of this spec (Requirement 3); named only if the design creates it.
- **Console_Source_Module**: A module of the Console_Lib. Test files are not Console_Source_Modules.

## Requirements

### Requirement 1: Scope and one mode

**User Story:** As the project owner, I want one console that is visual and operable, with no mode switch and no logic changes, so that the redesign is small, safe and finished within the schedule of Requirement 15.

#### Acceptance Criteria

1. THE S8 changes SHALL be presentation and thin controller code only; THE orbit, session state machine, beacon audio, QSL, tuning, illumination and shadow logic SHALL NOT change.
2. THE app SHALL present one mode only; THE app SHALL NOT add a simple or professional mode switch in S8.
3. THE S7 Instrument_Detail SHALL stay as it is; WHERE a Compact_Control opens it, THE Instrument_Detail content SHALL NOT be redesigned.
4. EVERY external link of the app (the Listening_Guide links, the source links of the catalog entries and the recording links) SHALL stay exactly as it is today in target and wording.
5. THE seven catalog entries, their playable and story-only flags, and every route that exists after S7 SHALL remain reachable.

### Requirement 2: Alignment meter

**User Story:** As a user holding up my phone, I want a live meter that shows how close my camera is to pointing at the satellite, so that I can feel myself closing in on it.

#### Acceptance Criteria

1. THE Session_Console SHALL show the Alignment_Meter in the `in-pass` phase, driven by the Pointing_Error of the session's Pointing_Source; THE Alignment_Meter SHALL replace the idea of a signal-strength bar and SHALL NOT be labelled or styled as a signal strength.
2. THE Meter_Level function SHALL take the Pointing_Error in degrees (or its absence) and the lock tolerance `LOCK_TOLERANCE_DEG`, SHALL return a level in [0, 1] and a Meter_Band, SHALL return level 1 and the locked band for every Pointing_Error at most `LOCK_TOLERANCE_DEG`, and SHALL return a level that does not increase as the Pointing_Error increases.
3. THE Alignment_Meter SHALL agree with the Lock_State: THE locked band SHALL show exactly when the landed `LockResult.locked` is true, and THE Alignment_Meter SHALL define no lock threshold of its own; THE Pointing_Error SHALL come from the landed lock geometry and SHALL NOT be recomputed by another formula.
4. WHEN there is no Pointing_Error (no pointing source, no orbit data, or the satellite below the horizon), THE Alignment_Meter SHALL show the Meter_Unavailable band and SHALL NOT draw a level.
5. THE acceptance test SHALL pin the Meter_Level at a Pointing_Error of 0°, of exactly `LOCK_TOLERANCE_DEG`, of one value above it that the design states, of 180°, and of the absent case, against the values the design states.
6. THE Alignment_Meter SHALL be a dynamic visual (for example an arc, a ring that closes or a bar) that updates at the rate of the landed pointing snapshot and shows the Pointing_Error in degrees as a number next to it.
7. THE Alignment_Meter and its labels SHALL state that it measures how well the phone is aimed, SHALL NOT claim or imply that the app receives a signal, and SHALL pass the Honesty_Scan.
8. WHEN the Alignment_Meter changes Meter_Band, THE Session_Console SHALL give a visible change that is not colour alone (for example a text label or an icon change).

### Requirement 3: Console lib and layering

**User Story:** As a maintainer, I want the new pure functions in one small guarded place and the components thin, so that the logic is tested in Node and the UI stays presentation.

#### Acceptance Criteria

1. THE pure functions of this spec (the Meter_Level mapping, and any other pure helper the design needs, such as the Pass_Strip placement and the Countdown_Ring fraction) SHALL be placed by the design either in an existing lib directory with the design stating why, or in one new Console_Lib directory with one `index.ts` barrel as its only entry file.
2. THE design SHALL fix the path and the allowed import set of the Console_Lib if it creates one; the allowed set SHALL contain only relative paths inside the new directory and the `index.ts` barrels of landed lib directories that the design names.
3. WHERE the design creates a Console_Lib, THE Console_Source_Modules SHALL be free of the DOM globals `window`, `document`, `navigator`, `localStorage`, `requestAnimationFrame` and of any storage, network, file or clock access, and a Source_Boundary_Scan in the style of S1 to S7 SHALL verify that the Console_Source_Modules import and export nothing outside the allowed set.
4. THE components SHALL be thin: presentational components take props and hold no business logic; side effects (timers, animation frames, sensors, storage, camera) SHALL live in controllers with injected dependencies, in the pattern of S3 to S7.
5. THE app SHALL add no new package and SHALL use no WebGL; THE visuals SHALL be SVG, Canvas 2D or CSS.

### Requirement 4: Session console main area

**User Story:** As a user in a session, I want the first screen to be a radar, a meter and one big button to open AR, so that I act instead of read.

#### Acceptance Criteria

1. THE Session_Console First_Screen in the `awaiting-pass` and `in-pass` phases SHALL have as its main area the Radar_Panel, the Alignment_Meter (in `in-pass`), the AR_Entry, the countdown and the Lock_State, and SHALL NOT open with a text block, a table or a list.
2. WHILE the phase is `awaiting-pass`, THE Session_Console SHALL show the countdown to AOS through `formatCountdown` with the Countdown_Ring, the AOS and peak direction on the Radar_Panel, and the Target_Pass path.
3. WHILE the phase is `in-pass`, THE Session_Console SHALL show the Lock_State badge, the live Pointing_Error number, the Doppler figure of `formatDopplerReadout` (or the landed No_Frequency_Note for IMAGE), and the existing Doppler dial of S6.
4. THE AR_Entry SHALL be a large Touch_Target that opens the landed AR_View for a Playable_Entry in the phases and modes in which S7 offers it, with no change to the S7 AR_View behavior.
5. THE Session_Console SHALL keep the landed session actions (start real time, start demo, end session, volume, mute) reachable as Touch_Targets, and SHALL NOT change what they do.
6. THE Session_Console SHALL keep showing the simulated-beacon label (Requirement 12) and the landed shadow-silence note at the places the landed session screen shows them.
7. THE `completed` phase SHALL keep the landed result and QSL card entry, presented with the same visual language.

### Requirement 5: Live radar sky view

**User Story:** As a user, I want a live radar of where the satellite is in the sky and where my phone is pointing, so that I can see the chase.

#### Acceptance Criteria

1. THE Radar_Panel SHALL draw, with the landed `domePoint`, the horizon ring, elevation rings, the cardinal marks, the current position of the satellite at the Session_Instant, its Target_Pass path (the S7 Sky_Track samples), and the Radar_Sweep.
2. WHILE the phase is `in-pass`, THE Radar_Panel SHALL draw the phone's pointing reticle from the landed pointing snapshot and the Lock_Ring of angular radius `LOCK_TOLERANCE_DEG` around the satellite, so that the distance between reticle and satellite is the Pointing_Error the Alignment_Meter shows.
3. THE Radar_Panel SHALL show the shadow segments of the path for a Sunlit_Only_Entry as the S7 Sky_Track does.
4. WHEN the data for the Radar_Panel is not available (no TLE, no observer, observation failure), THE Radar_Panel SHALL show an empty-state with one line of copy and SHALL NOT draw an invented position.
5. THE Radar_Panel SHALL redraw at a rate the design states and SHALL stay smooth on a mid-range phone (review item).
6. WITH Reduced_Motion, THE Radar_Sweep SHALL be static or absent.

### Requirement 6: Session console time and state at a glance

**User Story:** As a user waiting for a pass, I want to see how long I have to wait and when the pass starts and ends, as a visual, so that I know when to be outside.

#### Acceptance Criteria

1. THE Session_Console SHALL show the Countdown_Ring for the time to AOS in the `awaiting-pass` phase, and the remaining time to LOS as a ring or bar in the `in-pass` phase, each with the formatted time through `formatCountdown`.
2. THE Session_Console SHALL show AOS, peak and LOS as marks on a small timeline with their UTC instants through `formatUtc`.
3. THE Countdown_Ring SHALL change in a visible, non-colour-only way when AOS is near, at a lead window the design states.
4. THE ring fraction computation SHALL be a pure function of the Console_Lib or of an existing lib (Requirement 3, criterion 1); IT SHALL NOT read the clock.

### Requirement 7: Console home and satellite dial

**User Story:** As a user opening the app, I want to spin through the seven satellites as a visual dial and see at once which are playable, so that I choose by looking.

#### Acceptance Criteria

1. THE Console_Home First_Screen SHALL show the Satellite_Dial with all seven catalog entries, the Selected_Entry enlarged, a name and a status label, and a primary action for the Selected_Entry.
2. THE Satellite_Dial SHALL be operable by touch swipe or drag and by tap, and SHALL offer a keyboard or button alternative that selects the previous and next entry.
3. THE Satellite_Dial SHALL distinguish Playable_Entries from Story_Only_Entries visually and with text (the landed labels), not by colour alone.
4. WHEN the Selected_Entry is a Playable_Entry, THE primary action SHALL start a session for it (the landed session route); WHEN it is a Story_Only_Entry, THE primary action SHALL be a "view story" action only (Decision OQ-F) that opens its story in a Console_Sheet and SHALL show the landed unplayable reason; THE Satellite_Dial SHALL offer no other action for a Story_Only_Entry.
5. THE Satellite_Dial SHALL preserve the landed catalog order and the landed entry data, and SHALL add no entry.
6. THE Satellite_Dial SHALL keep the S6 lifeline of each entry available (on the Selected_Entry or in its story Console_Sheet).
7. THE Selected_Entry SHALL persist across visits (Decision OQ-A): THE Console_Home SHALL store the selected slug through the injected `KeyValueStorage` and SHALL restore it on the next visit, and WHEN the stored value is missing or not a catalog slug, THE Console_Home SHALL select the first Playable_Entry.

### Requirement 8: Home radar and next-pass estimate

**User Story:** As a user, I want the home screen to show where the selected satellite is now and when it next comes over me, so that the first screen already tells me something live.

#### Acceptance Criteria

1. WHEN a Playable_Entry is selected and an Observer is known (from the landed observer store), THE Console_Home SHALL show the Radar_Panel with the current position of the Selected_Entry and the Next_Pass_Estimate with its Countdown_Ring, both computed through the landed S1 and S7 interfaces and the landed TLE source.
2. THE Console_Home SHALL show the Pass_Strip of the next passes of the Selected_Entry over the next 48 hours (Decision OQ-G), each mark placed by AOS time, sized by Maximum_Elevation, and carrying the S7 illumination badge as a mark or icon.
3. WHEN the user taps a Pass_Strip mark, THE Console_Home SHALL show that pass's AOS, peak and LOS in UTC through `formatUtc`, its Maximum_Elevation and a control that starts a session for it, in a Console_Sheet or inline panel.
4. WHEN no Observer is known, THE Console_Home SHALL show a large location control (the landed geolocation and manual input) in place of the radar, and SHALL NOT invent a position.
5. WHEN the entry is a Story_Only_Entry, THE Console_Home SHALL show no pass computation and SHALL show its lifeline and story entry instead.
6. THE computation of passes SHALL NOT block the first paint of the Console_Home; THE design SHALL state how it is scheduled and how a loading and an empty result are presented.
7. THE Console_Home SHALL show the times through `formatUtc` as the primary time; the Local_Time_Note MAY follow as a secondary line.

### Requirement 9: Home entry points (bottom navigation dropped)

**User Story:** As a user, I want obvious entry points on the home screen, so that I can reach everything without reading.

#### Acceptance Criteria

1. THE bottom navigation is dropped (Decision OQ-E): THE app SHALL keep the landed Global_Navigation as it is and SHALL NOT restyle it as a bottom bar.
2. THE Console_Home SHALL offer entry points to the QSL cards, the Listening_Log, the Pass_Planner of the Selected_Entry and the Listening_Guide of the Selected_Entry through Compact_Controls (Requirement 10), without placing their content on the First_Screen.

### Requirement 10: Compact controls for text-heavy panels

**User Story:** As a user, I want the tables, lists and guide behind small controls, so that the first screen stays visual and I open the detail only when I want it.

#### Acceptance Criteria

1. THE Session_Console SHALL place the Tuning_Table, the Minute_Table with its copy and CSV actions, the Pass_Planner list, the Listening_Guide entry, the Ground_Track_Map and the story text behind Console_Tabs or Console_Sheets, each reachable with one tap from the First_Screen.
2. THE Console_Home SHALL place the story, the history text and the First_Run_Guide behind Compact_Controls.
3. A Console_Sheet SHALL close with one clear control and by the back gesture or Escape key where the platform provides it, SHALL return focus to its opener, and SHALL NOT trap the user.
4. A Console_Tab bar SHALL expose its tab state to assistive technology (selected tab) and SHALL be operable by touch and keyboard.
5. THE content of a Compact_Control SHALL be the landed S7 content with the landed behavior; THE design SHALL state which S7 components are re-hosted unchanged and which need a layout prop.
6. THE app SHALL keep every Compact_Control's content reachable without the AR_View, the camera or the sensors.

### Requirement 11: Touch and motion

**User Story:** As a user on a phone outdoors, I want large controls and motion that respects my settings, so that the console is usable at night and comfortable.

#### Acceptance Criteria

1. EVERY interactive control that this spec adds or restyles SHALL be at least the Touch_Minimum in both dimensions, with a visible focus indicator.
2. THE console SHALL use motion (Radar_Sweep, ring fills, dial transitions, meter transitions) only as presentation, and WITH Reduced_Motion SHALL replace each motion with an instant or static equivalent that carries the same information.
3. THE console SHALL use no autoplaying motion that continues while its component is not visible; THE design SHALL state how animation loops stop.
4. THE Alignment_Meter SHALL keep updating with Reduced_Motion, without easing; Reduced_Motion SHALL NOT remove the meter.
5. THE console SHALL keep the Seance Observatory look (night palette, bone text, phosphor accent, brass for history, serif for stories, monospace for telemetry), SHALL use no web font, and SHALL keep text legible against the night background.

### Requirement 12: Honesty

**User Story:** As a user and a judge, I want the redesign to be as plain about the simulation as before, so that nothing suggests the app hears a real satellite.

#### Acceptance Criteria

1. THE Session_Console SHALL keep a visible label that the beacon is simulated, in the Doppler dial label family of S6 (for example "Simulated tone · real Doppler figure"), whenever the beacon or the Doppler figure is shown.
2. THE Alignment_Meter, the Radar_Panel, the Satellite_Dial and every new label SHALL NOT claim or imply that the app receives, hears or decodes a real radio-frequency signal, and SHALL NOT use the words "signal strength" for the Alignment_Meter.
3. THE copy of every new or changed S8 string SHALL live in a copy module as plain string literals (a new `CONSOLE_COPY` module, Decision OQ-I).
4. THE Unconfirmed_Claims red lines of the Story_Source SHALL stay respected in every moved or new text.

### Requirement 13: Landed interfaces and explicit extensions

**User Story:** As a maintainer, I want every change to a landed file named in the design with its reason, so that S1 to S7 stay trustworthy.

#### Acceptance Criteria

1. THE spec SHALL consume the landed S1 to S7 interfaces as they are; THE design SHALL list every landed file this spec changes, with the reason and the extent of the change.
2. THE design SHALL propose explicitly any extension of a landed interface, in particular any extension needed to expose the Pointing_Error to the components if the landed `LockResult` or pointing snapshot does not already carry it, and any layout prop added to a landed S7 component.
3. `src/lib/orbit` SHALL NOT be changed.
4. THE S2 catalog data SHALL NOT be changed.
5. THE app SHALL add no new package; IF the design judges one indispensable, THEN THE design SHALL ask the owner first.

### Requirement 14: Scaffold checks

**User Story:** As a maintainer, I want the scaffold checks to cover the new files by name, so that the guards stay strict.

#### Acceptance Criteria

1. THE Honesty_Scan SHALL cover the property strings of every copy module this spec adds or changes and the JSX text of every page and component file this spec adds or changes, by explicit enumeration in the style of S4 to S7.
2. WHEN a text fails the Honesty_Scan, THE text SHALL be reworded; THE Honesty_Scan SHALL NOT be weakened, and no assertion of checks 1.19 to 1.25 SHALL be removed, loosened or blanket-allowed.
3. THE Route_Check SHALL be extended to enumerate by name every route directory, page file and `.ts` file this spec adds under `src/app`, and every `.tsx` file this spec adds under `src`.
4. THE checks 1.20 and 1.21 SHALL keep applying to `src/app/layout.tsx` and `src/app/page.tsx`, and THE checks 1.22 and 1.23 SHALL keep asserting the Provenance_Sentences of the README unchanged.
5. THE tests of this spec SHALL be the example tests this document names, minimal and sufficient, with no multi-layer verification machinery, no low-level instrumentation and no negative instrumentation tests.
6. THE `pnpm test`, `pnpm run typecheck` and `pnpm run build` commands SHALL pass after every task and on the final tree.

### Requirement 15: Delivery tiers and task order

**User Story:** As the project owner, I want the most valuable parts delivered first, so that any cut before the deadline still leaves a coherent app and the video can be recorded.

#### Acceptance Criteria

1. THE requirements SHALL be ranked in these Delivery_Tiers:
   - Must: Requirement 1 (scope), Requirement 2 (Alignment_Meter), Requirement 3 (layering), Requirement 4 (Session_Console main area), Requirement 5 (Radar_Panel), Requirement 12 (honesty), Requirement 13 (landed interfaces), Requirement 14 (scaffold checks).
   - Should: Requirement 6 (Countdown_Ring and timeline), Requirement 7 (Satellite_Dial), Requirement 8 criteria 1 and 4 to 7 (home radar and Next_Pass_Estimate), Requirement 10 (Compact_Controls for the Session_Console), Requirement 11 (touch and motion).
   - Could: Requirement 8 criteria 2 and 3 (Pass_Strip), Requirement 10 criterion 2 (Compact_Controls on the Console_Home).
   - Dropped: the bottom navigation (Requirement 9, criterion 1; Decision OQ-E).
2. All three tiers are committed (the schedule leaves room, see criterion 4). THE task list SHALL deliver the Must tier first, then the Should tier, then the Could tier, then the owner's acceptance (Requirement 16).
3. AFTER every task, THE pushed tree SHALL build, pass its tests and leave a coherent app. THE Session_Console replaces `/session/[noradId]` in place (Decision OQ-C). THE Console_Home replaces `/` only after the Should tier is complete (Decision OQ-D); until then THE landed S7 Home_Page SHALL stay at `/`. THE S7 panels SHALL stay on the Session_Console as landed until the task that moves them behind Compact_Controls.
4. Today is 2026-11-16, so about 18 days remain until the internal target, the evening of 2026-12-04 (GMT+8), which precedes the Submission_Deadline of 2026-12-05 06:00 GMT+8. THE tasks SHALL deliver all three tiers in tier order and SHALL reserve the last 5 to 6 days before 2026-12-04 for the video, S6 tasks 7 and 11 and the S7 owner acceptance; WHEN a tier is at risk, THE agent SHALL report it to the owner instead of cutting a part silently.

### Requirement 16: Owner's acceptance on a real phone

**User Story:** As the project owner, I want to check the console on my phone at the end, so that what judges see is what I accepted.

#### Acceptance Criteria

1. THE task list SHALL end with a review task in which the project owner checks, on a real phone against the Live_URL, at least: the Alignment_Meter while moving the phone toward and away from the satellite in a demo session and a real-time pass; the Radar_Panel and the reticle; the AR_Entry; the Countdown_Ring; the Satellite_Dial gestures; the Compact_Controls; touch sizes; and Reduced_Motion.
2. THE tasks SHALL record each outcome with the owner's report; THE agent SHALL NOT automate, assume or fabricate these outcomes.
3. THE video SHALL be recorded only after this review; the S6 Final_Submission_Checklist SHALL run after this spec lands.

## Workflow constraints

- The three spec documents are committed together with task 1's first commit.
- After each task's tests pass, the task is committed and pushed immediately, staging by file name; never in the middle of a task. The local `next.config.ts` edit is never staged.
- Parallel sub-agent execution only for independent tasks with disjoint files, at most 2 to 3 at once; commits and pushes are done serially by the main agent.
- Guard and utility code gets the simplest sufficient verification; where in doubt, the implementation follows design.md, and a gap in the design is raised with the owner instead of widened in place.
- The requirements phase runs no code and no scan; the landed interfaces are cited as landed.

## Decisions recorded during requirements refinement

- OQ-1 (Alignment_Meter): approved. The dynamic "signal strength bar" is replaced by the Alignment_Meter driven by the landed lock geometry (Pointing_Error, 10° lock tolerance). It is honest: it measures pointing, not a received signal, and never implies reception (Requirement 2).
- OQ-2 (external links): approved. External links stay exactly as today; the guide and sources are unchanged (Requirement 1, criterion 4).
- OQ-3 (one mode): approved. One single mode only; no simple or professional modes in S8; the S7 Instrument_Detail stays as it is (Requirement 1, criteria 2 and 3).
- OQ-4 (presentation only): approved. S8 changes no orbit, session state machine, beacon audio, QSL, tuning or illumination logic (Requirement 1, criterion 1).
- OQ-5 (deadline and tiers): the Submission_Deadline is 2026-12-05 06:00 GMT+8, the internal target is the evening of 2026-12-04, the video is not yet recorded. Corrected schedule: today is 2026-11-16, about 18 days remain, and all three tiers are committed (Requirement 15).
- OQ-A (selection persistence): decided, follow the recommendation. The Selected_Entry persists across visits through the injected `KeyValueStorage` (Requirement 7, criterion 7).
- OQ-B (Pointing_Error exposure): decided. If the landed pointing snapshot lacks the Pointing_Error, a read-only field may be added as a minimal S3/S4 extension, proposed in the design (Requirement 13, criterion 2).
- OQ-C (session route): decided. The Session_Console replaces `/session/[noradId]` in place (Requirement 15, criterion 3).
- OQ-D (home route): decided. The Console_Home replaces `/` only after the Should tier is complete; until then the landed home stays (Requirement 15, criterion 3).
- OQ-E (bottom navigation): decided. Dropped; the Global_Navigation stays as landed (Requirement 9, criterion 1).
- OQ-F (story-only entries): decided. Only a "view story" action (Requirement 7, criterion 4).
- OQ-G (Pass_Strip window): decided. 48 hours (Requirement 8, criterion 2).
- OQ-H (demo session meter): decided. No scripted demo approach path; in a Demo_Session the Alignment_Meter follows the drag view.
- OQ-I (new copy module): decided. New strings go into a new `CONSOLE_COPY` module (Requirement 12, criterion 3).
