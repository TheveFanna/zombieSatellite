# Requirements Document

## Introduction

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). Users pick a real "zombie satellite" from a fixed catalog of seven, the app predicts its passes over the user's location from public TLE data (SGP4), points the phone at the satellite during a pass, plays a simulated beacon whose pitch follows the Doppler shift, and issues a digital QSL card after the pass. The app is pure software: only the public orbital data is real, and the app receives no real radio-frequency signals.

S1 to S6 deliver a story-led, honest aid that newcomers enjoy. An experienced satellite listener (SWL, SDR or ham) still misses the steps that come before a real listening attempt: whether the satellite is sunlit during the pass, the exact frequencies to tune at AOS, TCA and LOS, where the pass rises and sets, the passes of the next days, a calendar reminder, and a short guide to setting up their own equipment. This spec, field-companion (S7), adds them, so that an experienced listener can plan a real session with the app while a newcomer can still play it. It also adds the satellite and its track drawn over the real sky through the camera, and its ground track on a world map.

The spec has ten parts, delivered in the order of the Delivery_Tiers (Requirement 26):

1. Sunlight and eclipse model, the pass Illumination_Profile, and Shadow_Silence of the simulated beacon (Requirements 2 to 4).
2. Tuning_Table (Requirement 5).
3. Pass_Planner and calendar export (Requirements 10 and 11).
4. Sky_Track (Requirement 6).
5. Ground_Track_Map (Requirements 12 and 13).
6. AR_View with FOV_Calibration (Requirements 7 to 9).
7. Satellite models: Models_Register, Model_Viewer and Model_Download (Requirements 15 and 16).
8. Listening_Guide (Requirement 14).
9. Listening_Log, self-reported (Requirement 17).
10. Two depths of use: Instrument_Detail, First_Run_Guide and the visual language (Requirements 18 to 20).

The orbit-engine (S1), zombie-catalog (S2), ar-pointing (S3), seance-session (S4), qsl-card (S5) and shell-pwa-deploy (S6) specs have landed. This spec consumes their interfaces as landed. Where a part needs a change to a landed interface or behavior, the design proposes the extension explicitly with reasons (Requirement 22); `src/lib/orbit` is never changed silently. The one landed behavior that this spec changes by the owner's decision is the S4 beacon of a Sunlit_Only_Entry (Requirement 4, Decision OQ-1).

Landed interfaces consumed (cited as landed, not re-verified in the requirements phase):

- S1, `src/lib/orbit`: `createSatrec(tle)`; `propagateAt(satrec, instant)`, whose success case carries `timeMs`, `gmstRad`, `eciPositionKm` (TEME, km), `eciVelocityKmPerS` and `ecfPositionKm`; `observeAt(satrec, instant, observer)`, whose success case adds `lookAngles` (`azimuthDeg`, `elevationDeg`, `slantRangeKm`) and `rangeRateKmPerS` (negative while the satellite approaches); `predictPasses(search)` with `durationHours` up to 168 and `minElevationDeg`, returning `Pass` objects `{ riseMs, peakMs, setMs, maxElevationDeg, durationMin, startTruncated, endTruncated }`, rise and set located to within 1 s and the peak to within 0.1 s; `TleRecord` with `MEAN_MOTION` in rev/day; the `Observer` type.
- S2, `src/lib/catalog`: `listCatalogEntries`, `listPlayableEntries`, `getCatalogEntry`; the entry fields `slug`, `name`, `noradId`, `playable`, `launchDate`, `sourceUrls`, and the `BeaconBlock` fields `downlinkMhz`, `displayFrequency`, `beaconMode`, `tumblePeriodS` and `sunlitOnly`.
- S3, `src/lib/pointing` and `src/components/pointing`: `sceneDirection`, `effectiveAzimuthDeg`, `evaluateLock` and `LockResult`, `LOCK_TOLERANCE_DEG` (10°), `projectMarker(target, basis, aspect)` with the fixed `VERTICAL_FOV_DEG` (75°), `CameraBasis`, the pointing session with its calibration offset, the drag compass, and the injected interfaces of `src/components/pointing/deps.ts` (`Clock`, `TimerApi`, `KeyValueStorage`). Risk R1 and the Manual_Device_Checklist of `.kiro/specs/ar-pointing/design.md`.
- S4, `src/lib/session` and `src/components/session`: the session phases `selecting`, `awaiting-pass`, `in-pass` and `completed`; the Session_Clock with `DEMO_RATE` (60); `physicalDopplerShiftKhz(downlinkMhz, rangeRateKmPerS)`, `dopplerReadout` and `formatDopplerReadout`; `beaconState` and the Audio_Binding; `formatUtc(instantMs)`, the only UTC formatter; `formatCountdown`; the observer store `createObserverStore(storage)` with the key `zombieSatellite.session.observer`; `SESSION_COPY` with `sunlitNote` and `noFrequency`.
- S5, `src/components/qsl`: the download controller pattern of `createCardDownloader(deps: DownloadDeps)` (object URL, download anchor and timers injected); the QSL_Card and its Simulated_Notice.
- S6, `src/lib/shell` and `src/components/shell`: `domePoint`, `domeRadius` and `passProfilePath` of `src/lib/shell/sky.ts` (azimuthal equidistant Sky_Dome, zenith at the centre, north up); `formatLocalTimeNote(instantMs, offsetMinutes)`; `createCameraController` with its outcomes `on`, `denied`, `unavailable`, `failed` and `cancelled`; the geolocation controller; the Global_Navigation; the visual components of `src/components/shell/visuals`; the Shell_Copy; the TLE_Proxy at `/api/tle` and the Proxy_Fetch; the Live_URL. The S6 design section "Camera backdrop and sky view" (DD-1, DD-2) and S6 tasks 7A to 7C (the Seance Observatory look).
- S1 to S6, `tests/scaffold/scaffold.test.ts`: checks 1.19 to 1.25 as they stand after S6.

### Normative sources

- Sections 2 and 4 of the Reference_Document are normative project-wide. This spec relies on C20 to C24 (ECI/TEME, GMST, ECF and the ECI→ECF rotation), C26 and C27 (geodetic latitude and longitude), C29 and C30 (the WGS84 ellipsoid), C32 (no terrain or refraction), C36 and C37 (elevation and azimuth), C40 to C45 (the scene frame and its mapping), C52 and formula 2.9.6 with the alignment constant replaced by 10° (project rule: `angle = acos(f·u)`, `f·u < 0` counts as behind), C70 (magnetic declination as landed in S3), and the ISS instant 2026-11-09T11:23:00Z of section 4.3 with its ECF position. No section 3 item applies, except that P19 (fixed field of view) is the motivation of Requirement 9.
- The pass lock tolerance is ±10° everywhere (project rule). The 8° alignment value of the Reference_Document applies nowhere.
- Times: all instants are UTC (project rule). UTC is the primary display everywhere, `formatUtc` stays the only UTC formatter, and the S6 Local_Time_Note may appear as a secondary line only (Requirement 10, criterion 5).
- The app never claims to receive real RF signals; beacon audio is synthesized from public TLE data (project rule).
- Catalog and story facts: the S2 catalog values and `docs/reference/POSITIONING_AND_STORY.md` (the Story_Source), including its list of unconfirmed claims (the Unconfirmed_Claims).
- satellite.js stays pinned to 6.0.2. No new package is added; the project owner declined a WebGL package (Decision OQ-4).
- S1 Requirement 1, criterion 11 (every test file runs in the Vitest `node` environment) stays in force; no DOM test environment is added.

### Verification scope

The automated tests of this spec run in the Vitest `node` environment, offline under the existing network guard. They are example tests over the Field_Core and, where a Field_Controller carries logic worth testing, mock-based tests of it. They cover exactly the cases this document names:

- The Sun_Direction at fixed UTC instants against the reference the design states, and the Illumination_State of constructed positions in sunlight and behind the Earth (Requirement 2).
- The Tuning_Frequencies of one fixture pass (Requirement 5).
- Example tests of the AR projection math (Requirement 7, criterion 13; Requirement 9, criterion 6).
- The Sub_Satellite_Point at the Reference_ISS_Instant and the Visibility_Footprint radius formula (Requirement 12).
- The Source_Boundary_Scan of the new lib directory, and the extended scaffold checks 1.19, 1.24 and 1.25 (Requirements 1 and 21).

The React components, the drawing of every visual, the audio, the camera, the downloads in a real browser and the device behavior are checked by review, and finally by the project owner's acceptance on a real phone against the Live_URL (Requirement 25). Criteria not named here are checked by review. Further automated cases are added only with the owner's approval.

### Out of scope

- Satellite search, a user satellite library, any satellite outside the fixed catalog, a custom backend beyond the S6 TLE_Proxy, user accounts and any server-side storage of user data. The browser reaches CelesTrak only through `/api/tle`.
- Any real radio reception, recording, decoding or radio control (CAT); audio copied from recording archives.
- Camera capture, recording, upload or storage of frames.
- A WebGL renderer or any new package (Decision OQ-4).
- A fallback for risk R1 of S3, unless the S6 Device_Checklist shows the heading flip; R1's recorded policy applies (Requirement 7, criterion 15).
- A magnetic declination model beyond the landed S3 one; atmospheric refraction; terrain and obstruction (C32).
- Push notifications and background reminders; the reminder of this spec is the calendar event of Requirement 11.
- Uploading, sharing or syncing a Log_Entry; verifying a Log_Entry.
- The S6 Device_Checklist (S6 task 7) and the S6 Final_Submission_Checklist (S6 task 11); they stay S6 tasks and run after this spec lands.
- A DOM test environment (jsdom, happy-dom) and React component tests.

### Known limitations

1. The Sun_Direction comes from a low-precision solar ephemeris and the Shadow_Model is a geometric approximation; Shadow_Entry and Shadow_Exit carry the accuracy the design states, and the real switch-on and switch-off of a satellite's transmitter can differ from them (battery state, attitude, temperature).
2. The FOV_Calibration lets the user match the drawn overlay to their camera by eye; it does not read the camera intrinsics, and `object-fit: cover` cropping still differs between devices (P19).
3. The Visibility_Footprint is the geometric 0° elevation circle; terrain and refraction are not modelled (C32).
4. The Tuning_Frequency of LES-1 is computed from 237 MHz, the rounded value of "about 237 MHz", and that of Prospero from its historical downlink; both are approximate, and the Tuning_Table says so (Requirement 5, criteria 6 and 7).
5. Illustrative_Models are simplified shapes authored from documented photos and dimensions, not engineering models; the Model_Viewer labels them (Requirement 15, criterion 5).
6. A Log_Entry is the user's own statement; the app cannot verify it and marks it self-reported (Requirement 17).
7. The S4 Known limitation 1 (no eclipse model, the simulated beacon plays during every pass) is superseded by Requirement 4. The landed S4 spec documents are not edited; this spec records the supersession.

## Glossary

Terms defined by S1 to S6 keep their landed meaning and are not repeated here, among them Maximum_Elevation, Start_Truncated, End_Truncated, Target_Pass, Demo_Session, Pointing_Source, Physical_Doppler_Shift, Real_Clock, Virtual_Clock, Session_Page, Picker_Page, Home_Page, Sky_View, Camera_Controller, Local_Time_Note, Device_Checklist, Provenance_Sentences and Submission_Deadline.

- **Field_Core**: The framework-free pure functions delivered by this spec under one new lib directory; proposed `src/lib/field`, the design fixes the path.
- **Field_Source_Module**: A module of the Field_Core. Test files and test helpers are not Field_Source_Modules.
- **Field_Components**: The component layer of this spec: the Field_Controllers, the browser dependency builder, the Field_Copy and the presentational components; the design fixes their paths.
- **Field_Controller**: A framework-free component-layer module that performs side effects (timers, engine calls, storage, camera, clipboard, downloads) with every side-effect source injected, in the factory pattern of S3 to S6.
- **Field_Copy**: The copy module or modules that hold every string of the S7 pages, components, downloads and exported texts as plain string literals, following `SESSION_COPY`, `QSL_COPY` and `SHELL_COPY`.
- **Playable_Entry**: A catalog entry with `playable: true` (LES-1, Transit 5B-5, AO-7, Prospero, IMAGE).
- **Story_Only_Entry**: A catalog entry with `playable: false` (Galaxy 15, LES-5).
- **Sunlit_Only_Entry**: A catalog entry whose `beacon.sunlitOnly` is true (Transit 5B-5, AO-7 and the Story_Only_Entry LES-5, as landed).
- **Observer**: The S4 Session_Observer from the observer store, as filled by S6 geolocation or by manual input.
- **Sun_Direction**: The unit vector from the Earth's centre to the Sun at a UTC instant, in the ECI frame of S1 within the frame approximation the design states, with the Sun distance where the Shadow_Model needs it.
- **Shadow_Model**: The geometric model that decides from a satellite ECI position and the Sun_Direction whether the satellite is in sunlight; cylindrical or conical, the design states which.
- **Illumination_State**: The output of the Shadow_Model for one position and instant: Sunlit, Penumbra or Umbra. Under a cylindrical Shadow_Model Penumbra never occurs.
- **In_Shadow**: An Illumination_State that the design counts as shadow: Umbra, and Penumbra if the design so states.
- **Illumination_Profile**: The illumination of one Pass: Sunlit_Pass (never In_Shadow between rise and set), Shadowed_Pass (always In_Shadow) or Partly_Sunlit_Pass, which carries every Shadow_Entry and Shadow_Exit instant between rise and set.
- **Shadow_Entry**, **Shadow_Exit**: The instants at which the satellite enters and leaves In_Shadow during a Pass.
- **Shadow_Silence**: The behavior of Requirement 4: the simulated beacon of a Sunlit_Only_Entry is silent while the satellite is In_Shadow.
- **AOS**, **LOS**: The `riseMs` and `setMs` of a Pass.
- **TCA**: In this spec, the `peakMs` of a Pass.
- **Tuning_Point**: One of AOS, TCA and LOS of a Pass.
- **Nominal_Downlink**: The `beacon.downlinkMhz` of the entry, the value every Tuning_Frequency is computed from.
- **Tuning_Frequency**: The receive frequency for an instant of a Pass: the Nominal_Downlink plus the Physical_Doppler_Shift that `physicalDopplerShiftKhz` gives for the `rangeRateKmPerS` of `observeAt` at that instant.
- **Tuning_Table**: The Tuning_Frequencies of the three Tuning_Points of one Pass, with their UTC instants.
- **Minute_Table**: The optional table of Tuning_Frequencies at one-minute steps across a Pass, for programming memory channels.
- **Tuning_CSV**: The CSV text of a Minute_Table.
- **No_Frequency_Note**: The text shown in place of a frequency when `downlinkMhz` is null, in the wording family of `SESSION_COPY.noFrequency`.
- **Pass_Planner**: The view that lists every Pass of one Playable_Entry in the Planning_Window.
- **Planning_Window**: The 168 h from the current Real_Clock instant.
- **Planner_Min_Elevation**: The minimum Maximum_Elevation a Pass needs to be listed by the Pass_Planner (Requirement 10, criterion 3).
- **Calendar_Event**: The `.ics` text of one Pass (Requirement 11).
- **Sky_Dome**: The S6 azimuthal equidistant sky view of `src/lib/shell/sky.ts`.
- **Sky_Track**: The full path of one Pass drawn on the Sky_Dome (Requirement 6).
- **Culmination_Point**: The point of the Sky_Track at TCA.
- **Time_Tick**: A mark on the Sky_Track or the Track_Arc at a stated UTC instant.
- **Current_Point**: The point of the satellite at the current Session_Instant.
- **Session_Instant**: The S4 instant of the Session_Clock: the Real_Clock in real time, the Virtual_Clock at 60× in demo mode.
- **AR_View**: The full-screen mode of Requirement 7: the camera picture, or the dark sky background, with the AR_Overlay drawn over it.
- **AR_Overlay**: The satellite marker with its name, the Lock_Ring, the Track_Arc, the Horizon_Line, the Cardinal_Marks, the Edge_Arrow and the Instrument_Strip.
- **Lock_Ring**: The ring of angular radius `LOCK_TOLERANCE_DEG` (10°) around the satellite direction, drawn on screen at the current Vertical_FOV.
- **Track_Arc**: The projected path of the Pass in the AR_View, with Time_Ticks.
- **Horizon_Line**: The projected 0° elevation circle in the AR_View.
- **Cardinal_Marks**: The projected marks N, E, S and W on the Horizon_Line.
- **Edge_Arrow**: The arrow at the screen edge that points toward the satellite when it is off screen or behind the camera.
- **Behind**: The S3 test `f·u < 0` for the camera forward `f` and the unit target direction `u` (C52).
- **Instrument_Strip**: The small strip of the AR_View with the lock state, the Doppler figure and, before AOS, the countdown to AOS.
- **Demo_AR_View**: The AR_View of a Demo_Session, drawn over the drag view and marked as demo.
- **Vertical_FOV**: The vertical field of view the AR_View projection uses: 75° by default, or the user's FOV_Calibration value.
- **FOV_Calibration**: The user control that sets the Vertical_FOV within the stated range and saves it locally (Requirement 9).
- **Ground_Track_Map**: The 2D world map of Requirement 13.
- **Map_Projection**: The projection of the Ground_Track_Map; equirectangular unless the design states and justifies another.
- **Sub_Satellite_Point**: The geodetic latitude, longitude and altitude of the point on the WGS84 ellipsoid below the satellite, computed from the ECF position (C29, C30).
- **Ground_Track**: The Sub_Satellite_Points of the Track_Span before and after the current instant.
- **Track_Span**: One orbital period back and one orbital period forward from the current instant, the period taken from the TLE `MEAN_MOTION` as 1440 / `MEAN_MOTION` minutes (Decision OQ-5).
- **Visibility_Footprint**: The circle on the Earth from which the satellite is above 0° elevation.
- **Terminator**: The day and night boundary on the Ground_Track_Map, from the Sun_Direction.
- **Observer_Pin**: The mark of the Observer on the Ground_Track_Map.
- **Coastline_Data**: The bundled public-domain coastline dataset of Requirement 13, criterion 7.
- **Model_Record**: The record of one candidate or chosen 3D model: source URL, author, licence, file format, and whether redistribution is allowed.
- **Models_Register**: The file `docs/reference/MODELS.md` with one Model_Record per catalog entry and the record of the Coastline_Data source.
- **Original_Model**: A 3D model by its original source whose licence allows redistribution, committed to the repository.
- **Illustrative_Model**: A simple low-poly model authored by this project from documented shapes, drawn as geometry in code.
- **Model_Viewer**: The view that shows a model slowly rotating (Requirement 16).
- **Model_Download**: The download of a model file together with its Attribution_File.
- **Attribution_File**: The small text file with a model's source, author, licence and, for an Illustrative_Model, the statement that it is illustrative.
- **Download_Pattern**: The S5 download controller pattern: a Blob through an injected object URL factory, an injected download trigger and an injected timer for the revoke.
- **Listening_Guide**: The per-entry guide of Requirement 14.
- **Guide_Fact**: One fact the Listening_Guide states, each with a Guide_Source.
- **Guide_Source**: A source of a Guide_Fact: a source of the Story_Source, or a new source recorded with its URL as Requirement 14, criterion 7 states.
- **Listening_Log**: The local, self-reported log of Requirement 17.
- **Log_Entry**: One record of the Listening_Log.
- **Self_Reported_Mark**: The mark on every Log_Entry and every Log_Card stating that the record is the user's own statement and was not verified by the app.
- **Log_Card**: A card made from one Log_Entry, if the design provides one (Requirement 17, criterion 8).
- **Simple_View**: The first presentation of an S7 screen: one main action and no more than the essential numbers.
- **Instrument_Detail**: The professional detail of a screen, one tap from its Simple_View (Requirement 18).
- **First_Run_Guide**: The guided first run of Requirement 19.
- **Delivery_Tiers**: The ranking Must, Should and Could of Requirement 26.
- **Honesty_Scan**: Checks 1.24 and 1.25 of `tests/scaffold/scaffold.test.ts`. Check 1.24: a text that carries a radio term (`beacon…`, `signal…`, `radio…`, `transmission…`) also says `simulated` or `synthesized`. Check 1.25: no sentence pairs a reception word (`receiv…`, `captur…`, `decod…`, `listen…`, `hear`, `hears`, `heard`, `hearing`) with a radio term, even when negated.
- **Route_Check**: Check 1.19 of `tests/scaffold/scaffold.test.ts`.
- **Source_Boundary_Scan**: The test helper that parses every Field_Source_Module with the TypeScript compiler API and reports import and export specifiers outside the allowed set, in the style of the S1 to S6 scans.
- **Reference_Document**: `docs/reference/TECHNICAL_ROUTE.md`, the trimmed technical route of the author's earlier personal project SatAware AR; English translation `docs/reference/TECHNICAL_ROUTE.en.md`.
- **Reference_ISS_Instant**: 2026-11-09T11:23:00Z with the ISS ECF position (-2527.6140, 4838.2075, 4035.6750) km of Reference_Document section 4.3.
- **Story_Source**: `docs/reference/POSITIONING_AND_STORY.md`.
- **Unconfirmed_Claims**: The list at the end of the Story_Source: the Transit 5B-5 launch year 1964, the Transit 5B-5 identity dispute (possibly Transit 5E-5), no "nuclear battery", Prospero's post-1996 reception unconfirmed, IMAGE silent again since August 2018, LES-1 "about 237 MHz", LES-5 and Galaxy 15 as story-only entries.
- **Live_URL**: The public HTTPS URL of the S6 Deployment; every push to `main` redeploys it.
- **Submission_Materials**: `README.md`, `docs/submission/DEVPOST.md` and `docs/submission/VIDEO_SCRIPT.md`.

## Requirements

### Requirement 1: Pure field core and source boundary

**User Story:** As a maintainer, I want the new astronomy, tuning, planning and map logic in one framework-free directory with a guarded import boundary, so that it is testable in Node and cannot drift into the UI.

#### Acceptance Criteria

1. THE Field_Core SHALL place the Sun_Direction, the Shadow_Model, the Illumination_Profile, the Tuning_Table and Minute_Table computation, the Tuning_CSV and Calendar_Event text generation, the Pass_Planner filtering, the Sky_Track and Track_Arc sampling, the AR projection math, the Sub_Satellite_Point, the Ground_Track, the Visibility_Footprint and the Terminator in Field_Source_Modules under one new lib directory with one `index.ts` barrel as its only entry file, following the module conventions of S1 to S6.
2. THE design SHALL fix the path of the new lib directory and the allowed import set; the allowed set SHALL contain only relative paths inside the new directory and the `index.ts` barrels of landed lib directories that the design names.
3. THE Field_Core SHALL keep every Field_Source_Module free of references to the DOM globals `window`, `document`, `navigator`, `localStorage`, `Blob`, `URL`, `Image` and `HTMLCanvasElement`, SHALL perform no storage access, network access or file output, and SHALL NOT read the system clock; every instant is a parameter.
4. THE Source_Boundary_Scan SHALL report every import or export specifier of a Field_Source_Module outside the allowed set of criterion 2; the acceptance test SHALL verify that the scan reports no violation.
5. WHERE the design places a model's geometry or the Coastline_Data in a module, THE design SHALL state whether that module is a Field_Source_Module or a data module elsewhere, and the boundary rules of criteria 2 and 3 SHALL apply to it if it is under the new lib directory.

### Requirement 2: Sun direction and shadow model

**User Story:** As a satellite listener, I want the app to know where the Sun is and whether the satellite is in sunlight, so that I know when a sunlight-powered satellite can be on the air.

#### Acceptance Criteria

1. THE Field_Core SHALL provide a pure function that maps a UTC instant to the Sun_Direction by a low-precision solar ephemeris; THE design SHALL state the formula, its source and its accuracy in degrees over the years 2026 to 2030.
2. THE design SHALL state the frame approximation between the frame of the solar ephemeris and the TEME frame of `eciPositionKm` (C20, C21), and the angular error it adds.
3. THE Field_Core SHALL provide a pure function that maps a satellite ECI position in km (the `eciPositionKm` of `propagateAt` or `observeAt`) and the Sun_Direction to an Illumination_State: Sunlit, Penumbra or Umbra.
4. THE design SHALL state the Shadow_Model (cylindrical or conical), the Earth radius it uses, and which Illumination_States count as In_Shadow; WHERE the Shadow_Model is cylindrical, THE design SHALL state that Penumbra never occurs.
5. THE acceptance tests SHALL pin the Sun_Direction at fixed UTC instants that the design chooses against the reference values the design states, within the accuracy of criterion 1.
6. THE acceptance tests SHALL pin the Illumination_State of constructed positions: one position in sunlight (on the Sun side of the Earth) and one position behind the Earth on the anti-Sun axis within the shadow.

### Requirement 3: Pass illumination profile and shadow marking

**User Story:** As a satellite listener, I want every predicted pass to say whether the satellite is sunlit, partly sunlit or in Earth's shadow, so that I plan for the passes in which a sunlight-only satellite can be active.

#### Acceptance Criteria

1. THE Field_Core SHALL provide a pure function that maps a satrec and a Pass to its Illumination_Profile: Sunlit_Pass, Shadowed_Pass, or Partly_Sunlit_Pass with every Shadow_Entry and Shadow_Exit between AOS and LOS.
2. THE design SHALL state the sampling and refinement of the Illumination_Profile and the time resolution of Shadow_Entry and Shadow_Exit.
3. WHEN an observation of the satellite fails (`ok: false`) at an instant the Illumination_Profile needs, THE function SHALL report the failure without throwing; THE design SHALL state how such a Pass is presented.
4. EVERY Pass that the Pass_Planner lists, and the Target_Pass of a session, SHALL show an illumination badge from its Illumination_Profile, for every Playable_Entry.
5. WHERE the entry is a Sunlit_Only_Entry, THE app SHALL mark clearly when the satellite will be In_Shadow during a Pass, with a Field_Copy text in the spirit of "silent in Earth's shadow" that passes the Honesty_Scan, and SHALL give the Shadow_Entry and Shadow_Exit instants in UTC through `formatUtc`.
6. WHERE the entry is not a Sunlit_Only_Entry, THE app SHALL NOT state or imply that the satellite falls silent in shadow.

### Requirement 4: Shadow silence of the simulated beacon

**User Story:** As a satellite listener, I want the simulated beacon of a sunlight-only satellite to fall silent while that satellite is in Earth's shadow, so that practice in the app matches what my own equipment will meet.

#### Acceptance Criteria

1. WHILE a session of a Sunlit_Only_Entry is in the `in-pass` phase and the satellite is In_Shadow at the current Session_Instant, THE simulated beacon SHALL be silent; THE design SHALL state whether the noise floor keeps sounding during Shadow_Silence.
2. Shadow_Silence SHALL apply in real time and in demo mode, evaluated at the Session_Instant of the active Session_Clock.
3. WHEN the satellite leaves In_Shadow during the `in-pass` phase, THE simulated beacon SHALL resume.
4. WHILE Shadow_Silence is active, THE Session_Page SHALL show a Field_Copy or Session_Copy note that the satellite is in Earth's shadow and that the simulated beacon is silent for that reason.
5. Shadow_Silence SHALL NOT change the session phases, the transitions, the lock evaluation, the lock statistics or the Session_Result, and SHALL NOT change the beacon of an entry that is not a Sunlit_Only_Entry (LES-1, Prospero and IMAGE keep their landed beacons).
6. THE `SESSION_COPY.sunlitNote` text SHALL be replaced by a text that no longer says the app has no eclipse model, that states Shadow_Silence, and that passes the Honesty_Scan.
7. THE design SHALL propose the change to the landed S4 code explicitly: the files it touches, the new input of the beacon computation or of the session controller, and why the change is the smallest that meets criteria 1 to 6 (Requirement 22).

### Requirement 5: Tuning table

**User Story:** As a satellite listener, I want the receive frequencies to program into my radio at AOS, TCA and LOS, and optionally every minute, so that I can follow the Doppler shift with memory channels.

#### Acceptance Criteria

1. WHEN a Pass is selected for a Playable_Entry whose `downlinkMhz` is not null, THE app SHALL show the Tuning_Table: for AOS, TCA and LOS, the UTC instant through `formatUtc` and the Tuning_Frequency.
2. THE Field_Core SHALL compute every Tuning_Frequency as the Nominal_Downlink plus the shift of `physicalDopplerShiftKhz(downlinkMhz, rangeRateKmPerS)`, with `rangeRateKmPerS` from `observeAt` at that instant and the Observer of the page; THE Field_Core SHALL NOT reimplement the Doppler formula.
3. THE design SHALL fix the displayed precision of the Tuning_Frequency (for example 0.1 kHz), its unit and its rounding rule.
4. THE app SHALL offer the Minute_Table across the Pass; THE design SHALL fix its instants (alignment to whole UTC minutes or to AOS), its columns, which include the UTC instant and the Tuning_Frequency, and how it presents a Start_Truncated or End_Truncated Pass.
5. THE app SHALL offer to copy the Minute_Table to the clipboard through an injected clipboard object, and to download the Tuning_CSV as a `.csv` file through the Download_Pattern; THE design SHALL fix the CSV header, the column order and the file name.
6. THE Tuning_Table SHALL state the Nominal_Downlink it computes from. For LES-1 it SHALL state that 237 MHz is the rounded value of "about 237 MHz" and that the Tuning_Frequencies are approximate; the prose of the app SHALL keep "about 237 MHz".
7. For Prospero, THE Tuning_Table SHALL state that 137.56 MHz is its historical downlink and that later reception claims are unconfirmed (Unconfirmed_Claims).
8. WHEN the entry's `downlinkMhz` is null (IMAGE), THE app SHALL show the No_Frequency_Note in place of the Tuning_Table, the Minute_Table and the Tuning_CSV, and SHALL NOT compute, show or export any frequency.
9. THE acceptance test SHALL pin the Tuning_Frequencies at AOS, TCA and LOS of one fixture pass that the design states (TLE, Observer and Pass).

### Requirement 6: Sky track

**User Story:** As a satellite listener, I want the whole path of a pass drawn on the sky dome, with where it rises, where it culminates and where it sets, so that I can aim my antenna before the pass starts.

#### Acceptance Criteria

1. WHEN a Pass is selected, THE app SHALL draw its Sky_Track on the Sky_Dome with the landed `domePoint`, from `observeAt` samples between AOS and LOS at a step the design states.
2. THE Sky_Track SHALL show the AOS azimuth mark and the LOS azimuth mark on the horizon with their azimuths in degrees, the Culmination_Point with the Maximum_Elevation, and Time_Ticks at an interval the design states, labelled in UTC.
3. WHILE a session of the Pass runs (real time or demo), THE Current_Point SHALL move along the Sky_Track at the Session_Instant.
4. THE Sky_Track SHALL draw its In_Shadow segments (Requirement 3) differently from its sunlit segments, so that the shadow part of the Pass is visible at a glance.
5. THE design SHALL decide whether the Sky_Track replaces the S6 schematic pass profile as the main pass visual or sits next to it, and SHALL state why.
6. WHEN an observation fails at a sample, THE Sky_Track SHALL leave a gap at that sample and SHALL NOT draw an invented point.

### Requirement 7: AR view and overlay

**User Story:** As a satellite listener, I want to hold up my phone and see the satellite, its path and the horizon drawn over the real sky, so that I know exactly where to look and where it will move next.

#### Acceptance Criteria

1. THE Session_Page SHALL offer the AR_View as a full-screen mode for a Playable_Entry in the `awaiting-pass` and `in-pass` phases, in real time and, as the Demo_AR_View, in demo mode.
2. THE AR_View SHALL draw the AR_Overlay over the camera picture of Requirement 8 from the landed S3 camera basis, the S3 calibration offset and the Vertical_FOV; THE target direction SHALL be the one the landed lock uses (`sceneDirection(effectiveAzimuthDeg(azimuth, offset), elevation)`), so that the marker and the lock agree.
3. THE AR_Overlay SHALL draw the satellite marker with the entry's `name` at the projected Current_Point direction.
4. THE AR_Overlay SHALL draw the Lock_Ring of angular radius `LOCK_TOLERANCE_DEG` (10°) around the satellite direction, scaled to the current Vertical_FOV.
5. THE lock state that the AR_View shows SHALL be the landed `LockResult.locked` of the session's Pointing_Source; THE AR_View SHALL define no lock threshold of its own.
6. THE AR_Overlay SHALL draw the Track_Arc of the Pass, projected point by point, with Time_Ticks labelled in UTC, so that the user sees where the satellite will move next; samples Behind the camera SHALL NOT be drawn as if they were in front.
7. THE AR_Overlay SHALL draw the Horizon_Line and the Cardinal_Marks N, E, S and W where they are in front of the camera.
8. WHEN the satellite direction is off screen or Behind, THE AR_Overlay SHALL draw the Edge_Arrow at the screen edge pointing toward the satellite direction; THE Behind test SHALL be `f·u < 0` (C52) and SHALL NOT be another criterion.
9. THE Instrument_Strip SHALL show the lock state, the Doppler figure of `formatDopplerReadout` (or the No_Frequency_Note for IMAGE), and in the `awaiting-pass` phase the countdown to AOS through `formatCountdown`.
10. WHILE the session is in the `awaiting-pass` phase, THE AR_View SHALL show the AOS direction on the Horizon_Line and the Track_Arc of the Target_Pass, so that the user can turn to the right part of the sky before AOS.
11. WHERE the entry is a Sunlit_Only_Entry, THE Track_Arc SHALL draw its In_Shadow segments differently, as the Sky_Track does (Requirement 6, criterion 4).
12. THE user SHALL be able to leave the AR_View at any time with one control, and leaving it SHALL return to the Session_Page in the same session phase.
13. THE AR projection math (projection at a given Vertical_FOV, Track_Arc projection with the Behind rule, Horizon_Line and Cardinal_Marks, Lock_Ring radius, Edge_Arrow direction) SHALL be pure functions of the Field_Core with example tests that the design states; THE drawing SHALL be a presentational layer over them, checked by review on a real phone.
14. THE AR_Overlay SHALL redraw at a rate the design states, and SHALL stay usable on a mid-range phone (review item).
15. Risk R1 of S3 (the iOS compass under steep tilt) SHALL keep applying; THE app SHALL NOT build a fallback for it unless the S6 Device_Checklist shows the heading flip, and then only under R1's recorded policy.
16. THE Track_Arc SHALL extend 10 minutes before AOS and 10 minutes after LOS; THE AR_Overlay SHALL draw the samples whose elevation is below 0° dashed and the samples at or above 0° solid. This supersedes the dash use of criterion 11 in the AR_Overlay; the Sky_Track on the dome (Requirement 6) is unchanged.
17. WHERE the entry is a Sunlit_Only_Entry, THE AR_Overlay SHALL tell In_Shadow segments from sunlit ones by colour only (brass against phosphor), because the dash now means below the horizon.
18. THE AR_Overlay SHALL draw the Current_Point as a filled dot with a halo, inside the Lock_Ring, whenever the satellite direction is in front of the camera.
19. THE AR_Overlay SHALL draw the Time_Ticks smaller than before: a dot of radius 1.5 and a label of font size 9.

### Requirement 8: AR view camera, fallback and demo

**User Story:** As a satellite listener, I want the camera behind the overlay when I allow it and the same overlay on a dark sky when I do not, so that the AR view always helps and never records anything.

#### Acceptance Criteria

1. WHEN the AR_View opens in real time, THE app SHALL request the rear camera through the landed S6 Camera_Controller and SHALL show the video behind the AR_Overlay.
2. IF the camera outcome is `denied`, `unavailable`, `failed` or `cancelled`, THEN THE AR_View SHALL show the dark sky background with the same AR_Overlay, without blocking the session.
3. WHEN the user leaves the AR_View, the session leaves the `awaiting-pass` and `in-pass` phases, or the user leaves the Session_Page, THE Camera_Controller SHALL stop every track of the camera stream.
4. THE camera picture SHALL be a visual layer only: THE app SHALL NOT capture, record, upload or store any frame.
5. THE Demo_AR_View SHALL draw the same AR_Overlay against the drag view of the demo session, at the demo Session_Instant, and SHALL show a demo mark from the Field_Copy at all times; THE Demo_AR_View SHALL NOT use the camera.
6. THE design SHALL state the seam: where the AR_View mounts on the Session_Page, how it obtains the camera basis in real time and in demo mode, and which landed S6 decision it extends (S6 DD-2 limits the camera backdrop to the real-time `in-pass` phase).

### Requirement 9: Field-of-view calibration

**User Story:** As a satellite listener, I want to match the overlay to my phone's camera, so that the drawn satellite and horizon sit on the real sky of my device.

#### Acceptance Criteria

1. THE AR_View SHALL offer the FOV_Calibration as a control (for example a slider) that sets the Vertical_FOV within a range the design states, with a default of 75°.
2. THE FOV_Calibration SHALL save the Vertical_FOV through the injected `KeyValueStorage` under a key the design states, and SHALL restore it on the next visit.
3. IF the stored value is missing, not a number or outside the range, THEN THE AR_View SHALL use 75°.
4. THE Vertical_FOV SHALL change only the projection of the AR_Overlay and the on-screen size of the Lock_Ring; it SHALL NOT change the lock evaluation, which stays the angular S3 lock with `LOCK_TOLERANCE_DEG`.
5. THE design SHALL state how the projection takes the Vertical_FOV (an explicit extension of the S3 `projectMarker` or a Field_Core projection that equals `projectMarker` at 75°), and whether the S6 Sky_View marker of the session page also uses the calibrated value.
6. THE example tests of Requirement 7, criterion 13 SHALL include a projection at the default 75° that agrees with the landed `projectMarker`, and a projection at another Vertical_FOV that the design states.

### Requirement 10: Pass planner

**User Story:** As a satellite listener, I want every usable pass of a satellite in the next seven days, with where it rises and sets and whether it is sunlit, so that I can choose the session worth setting up my equipment for.

#### Acceptance Criteria

1. THE app SHALL provide the Pass_Planner for every Playable_Entry, for the Observer, over the Planning_Window of 168 h from the current Real_Clock instant, through the landed `predictPasses` with `durationHours` 168.
2. THE Pass_Planner SHALL search with `minElevationDeg` 0° (C80), so that AOS and LOS stay the horizon crossings that the Tuning_Table and the Sky_Track use.
3. THE Pass_Planner SHALL list a Pass only when its `maxElevationDeg` is at least the Planner_Min_Elevation; THE user SHALL be able to choose the Planner_Min_Elevation from 0°, 10°, 20° and 30°, with 10° as the default (Decision OQ-5).
4. EACH listed Pass SHALL show the AOS azimuth, the Maximum_Elevation, the LOS azimuth, the AOS and LOS instants in UTC through `formatUtc` as the primary time, and the illumination badge of Requirement 3.
5. EACH listed Pass MAY show the S6 Local_Time_Note of `formatLocalTimeNote` as a secondary line after the UTC text; this extends S6 Requirement 10, criterion 3, which limits the note to the Picker_Page, and THE design SHALL record the extension (Requirement 22).
6. WHEN the user selects a listed Pass, THE app SHALL show its Sky_Track (Requirement 6) and its Tuning_Table or No_Frequency_Note (Requirement 5).
7. THE design SHALL state where the Pass_Planner lives (route or section), how it links to the session of a listed Pass, and how the Pass_Planner presents a Start_Truncated Pass and an empty result.
8. THE Pass_Planner SHALL compute without blocking the page from showing; THE design SHALL state how the computation of the Planning_Window and the Illumination_Profiles is scheduled.

### Requirement 11: Calendar export

**User Story:** As a satellite listener, I want to put a pass into my calendar, so that my phone reminds me before AOS.

#### Acceptance Criteria

1. THE Field_Core SHALL provide a pure function that maps one Pass and its entry to the Calendar_Event text in the iCalendar format (RFC 5545), with DTSTART at AOS and DTEND at LOS in UTC, and without a package.
2. THE Calendar_Event SHALL carry the entry name, the Maximum_Elevation, the AOS and LOS azimuths, the frequency text (`displayFrequency` verbatim, or the No_Frequency_Note) and the illumination of the Pass.
3. THE Calendar_Event text SHALL state that the beacon in the app is simulated; THE strings of the Calendar_Event SHALL come from the Field_Copy and SHALL pass the Honesty_Scan.
4. THE design SHALL state the UID rule, the escaping and line folding of RFC 5545, and whether the Calendar_Event carries an alarm (VALARM) and its lead time.
5. THE app SHALL download the Calendar_Event as an `.ics` file through the Download_Pattern with injected browser objects; THE design SHALL fix the file name.

### Requirement 12: Sub-satellite point, footprint and terminator

**User Story:** As a satellite listener, I want to see where on Earth the satellite is and from where it can be seen, so that I understand when it comes over my horizon.

#### Acceptance Criteria

1. THE Field_Core SHALL provide a pure function that maps an ECF position in km (the landed `ecfPositionKm`) to the Sub_Satellite_Point: geodetic latitude (C26), longitude (C27) in [−180, 180] and altitude in km above the WGS84 ellipsoid, using the WGS84 constants of C29 and C30; THE design SHALL state the algorithm and its accuracy.
2. IF the design judges an extension of `src/lib/orbit` necessary instead of criterion 1, THEN THE design SHALL propose it with reasons; `src/lib/orbit` SHALL NOT be changed silently.
3. THE Field_Core SHALL provide the Ground_Track over the Track_Span, sampled at a step the design states, with the split of the line at the antimeridian that the Map_Projection needs.
4. THE Field_Core SHALL provide the Visibility_Footprint of a satellite at an altitude as a circle on the Earth around the Sub_Satellite_Point; THE design SHALL state the radius formula (the Earth model and the 0° elevation condition).
5. THE Field_Core SHALL provide the Terminator at a UTC instant from the Sun_Direction of Requirement 2, through the subsolar point with the GMST rotation (C22, C24).
6. THE acceptance test SHALL assert the Sub_Satellite_Point at the Reference_ISS_Instant from the ECF position of Reference_Document section 4.3 against expected values whose source the design states.
7. THE acceptance test SHALL assert the Visibility_Footprint radius formula at values the design states.

### Requirement 13: Ground-track map and coastline data

**User Story:** As a satellite listener, I want a world map with the satellite, its track, its footprint, my position and day and night, so that I see the whole orbit and not only my sky.

#### Acceptance Criteria

1. THE app SHALL provide the Ground_Track_Map for every Playable_Entry, with the current Sub_Satellite_Point, the past and future Ground_Track over the Track_Span drawn so that past and future are distinguishable, the Visibility_Footprint, the Observer_Pin and the Terminator.
2. THE Ground_Track_Map SHALL use the Map_Projection; THE design SHALL state the projection and, if it is not equirectangular, why.
3. THE Ground_Track_Map SHALL animate at the current instant in real time and, during a Demo_Session, at the 60× demo Session_Instant.
4. THE design SHALL state the redraw strategy (SVG or Canvas 2D), the redraw rate and when the Ground_Track is recomputed; THE Ground_Track_Map SHALL stay smooth on a mid-range phone (review item).
5. WHEN a TLE is not available or an observation fails, THE Ground_Track_Map SHALL show a Field_Copy note in place of the satellite elements and SHALL NOT draw an invented position.
6. THE design SHALL state where the Ground_Track_Map appears (Pass_Planner, Session_Page or both).
7. THE Coastline_Data SHALL be bundled in the repository and SHALL NOT be fetched at runtime: a public-domain dataset (for example Natural Earth 1:110m), simplified to a size budget the design states, with the simplification method stated.
8. THE source and licence of the Coastline_Data SHALL be recorded in the Models_Register and in the README credits.

### Requirement 14: Listening guide

**User Story:** As a newcomer who wants to try for real, or a listener new to these satellites, I want a short sourced guide per satellite, so that I know what to tune, what simple setup has worked, when the satellite can be active, and where to hear real recordings.

#### Acceptance Criteria

1. THE app SHALL provide the Listening_Guide for every Playable_Entry, with: the downlink frequency (`displayFrequency` verbatim, or the No_Frequency_Note) and the mode as documented; the simplest reception setup that a Guide_Source documents; the illumination condition (Sunlit_Only_Entry or not); and links to real recordings in public archives where a Guide_Source names them.
2. WHERE no Guide_Source documents a setup or a recording for an entry, THE Listening_Guide SHALL say that none is documented and SHALL NOT invent one.
3. EVERY Guide_Fact SHALL carry its Guide_Source as a link.
4. THE Listening_Guide SHALL link to recordings only; THE app SHALL NOT copy, bundle, embed or proxy any recorded audio.
5. THE Listening_Guide SHALL keep the Unconfirmed_Claims as red lines: the Transit 5B-5 identity dispute is stated; no "nuclear battery" appears; Prospero's post-1996 reception is presented as unconfirmed; IMAGE is presented as silent again since August 2018 with no documented downlink frequency; LES-1 is "about 237 MHz".
6. THE Listening_Guide SHALL NOT say or imply that the app receives anything; it SHALL say that the user's own equipment is what can pick up the real downlink, worded so that it passes the Honesty_Scan as it stands (Decision RQ-1 of S6: reception words and radio terms never share a sentence).
7. WHERE a Guide_Fact needs a source that the Story_Source does not contain, THE source SHALL be recorded with its URL next to the fact in the guide data, and THE design SHALL list every such new source for the owner's review.
8. THE design SHALL state where the Listening_Guide lives and how it is reached from the entry and the session.

### Requirement 15: Satellite models: sources and licences

**User Story:** As a satellite fan, I want to know what each satellite looked like, from honest sources, so that a model in the app is either the real one with its credit or clearly marked as an illustration.

#### Acceptance Criteria

1. THE research step of this spec SHALL look for a 3D model of every catalog entry (seven entries) and SHALL record a Model_Record for each candidate found: source URL, author, licence, file format, and whether redistribution is allowed. Candidates SHALL include NASA 3D Resources and museum or agency archives.
2. THE Models_Register `docs/reference/MODELS.md` SHALL hold the Model_Records and, for each entry, the decision: Original_Model or Illustrative_Model.
3. ONLY a model whose licence allows redistribution SHALL be committed as an Original_Model; THE app SHALL NOT hotlink any model at runtime.
4. WHERE no usable Original_Model exists, THE project SHALL author an Illustrative_Model from documented shapes (photos and dimensions in cited sources), drawn as geometry in code, and THE Models_Register SHALL cite those sources (Decision OQ-4).
5. THE Model_Viewer SHALL label every Illustrative_Model as illustrative, with a Field_Copy text.
6. THE design SHALL state the size budget of the committed model files and of the model geometry modules.
7. THE README credits SHALL list every Original_Model with its author and licence, and SHALL say that the other models are illustrative.

### Requirement 16: Model viewer and download

**User Story:** As a satellite fan, I want to turn the satellite in my hand on screen and keep the model file, so that I can look at it and use it elsewhere with the right credit.

#### Acceptance Criteria

1. THE Model_Viewer SHALL show the model of an entry slowly rotating, in the Seance Observatory look (for example a lit wireframe or a shaded silhouette).
2. THE Model_Viewer SHALL render by a small hand-written projection to SVG or Canvas 2D, without a package and without WebGL (Decision OQ-4).
3. THE app SHALL offer the Model_Download: the model file in a format the design picks (for example `.obj` or `.glb`) together with its Attribution_File, through the Download_Pattern with injected browser objects; THE design SHALL fix the file names and how the two files are delivered.
4. THE Attribution_File SHALL state the model's source, author and licence, or for an Illustrative_Model that it is illustrative and the sources it was drawn from.
5. THE design SHALL decide where the Model_Viewer appears (for example on the home catalog entry and as a small inset in the AR_View).
6. WHILE the Model_Viewer is not visible, THE app SHALL NOT keep animating it.

### Requirement 17: Self-reported listening log

**User Story:** As a satellite listener who picked up a satellite with my own equipment, I want to log that session, so that I keep my own record next to my practice cards, clearly marked as my own statement.

#### Acceptance Criteria

1. THE app SHALL provide the Listening_Log, in which the user creates a Log_Entry for a catalog entry with: the UTC instant, the frequency in MHz, the equipment as free text, and a note as free text (Decision OQ-3).
2. THE app SHALL take the instant of a Log_Entry as UTC and SHALL display it through `formatUtc`; THE design SHALL state the input format, the validation of every field, the field length limits and the maximum number of stored Log_Entries.
3. THE Listening_Log SHALL store Log_Entries only locally through the injected `KeyValueStorage`, under a key separate from the S4 Session_Results; THE app SHALL NOT upload, share or sync them.
4. THE app SHALL create a Log_Entry only from the user's explicit input; THE app SHALL NOT create, prefill as fact or suggest a Log_Entry from a simulated session.
5. EVERY presentation of a Log_Entry, and the face of every Log_Card, SHALL carry the Self_Reported_Mark prominently.
6. THE Listening_Log and the Log_Cards SHALL be presented separately from the S5 QSL_Cards; a Log_Entry SHALL NOT appear in the S5 collection order, and the S5 QSL_Cards and Session_Results SHALL NOT change.
7. THE Field_Copy of the Listening_Log SHALL NOT phrase a Log_Entry as a reception by the app, and SHALL pass the Honesty_Scan as it stands (reception words and radio terms never share a sentence).
8. THE design SHALL decide whether a Log_Entry yields a Log_Card. WHERE it does, THE Log_Card face SHALL carry the Self_Reported_Mark, the statement that the app did not verify the record, the user's fields shown as the user's own text, and a look that cannot be mistaken for an S5 QSL_Card.
9. THE app SHALL render the user's free text as text only (escaped where it enters SVG or another markup), never as markup.

### Requirement 18: Simple view and instrument detail

**User Story:** As a newcomer, I want each screen to start simple with one main action; as a listener, I want the professional numbers one tap away, so that neither of us is slowed down by the other's needs.

#### Acceptance Criteria

1. EVERY screen that this spec adds or changes SHALL open in its Simple_View with one main action.
2. THE Instrument_Detail SHALL reveal the professional numbers that apply to the screen: azimuth and elevation, slant range, range rate, the Doppler figure, the Tuning_Frequencies and the Illumination_Profile.
3. THE Instrument_Detail SHALL be reachable with one tap from the Simple_View; THE design SHALL choose its form (sheet, toggle or second panel) and state it.
4. THE Simple_View SHALL NOT open with a table of more than the essential numbers; THE design SHALL state per screen which numbers the Simple_View shows.

### Requirement 19: Guided first run

**User Story:** As a newcomer, I want a short guided path from the home page to my first pass, so that I can start without reading anything first.

#### Acceptance Criteria

1. THE First_Run_Guide SHALL lead from the Home_Page to a first pass (demo or real time) in three or four steps.
2. THE First_Run_Guide SHALL be skippable at every step.
3. THE First_Run_Guide SHALL be shown once: WHEN it is completed or skipped, THE app SHALL store that through the injected `KeyValueStorage`, and SHALL NOT show it again on that device.
4. THE First_Run_Guide SHALL start no session by itself; it SHALL link to the existing session routes.
5. THE strings of the First_Run_Guide SHALL come from the Field_Copy and SHALL pass the Honesty_Scan.

### Requirement 20: Visual language

**User Story:** As a judge or a user, I want the new screens to look like one instrument with the existing ones, so that the app feels finished.

#### Acceptance Criteria

1. THE S7 screens SHALL keep the Seance Observatory look of S6 task 7C: the night palette, bone text, the phosphor accent, brass for history, serif for stories, monospace for telemetry, hairlines and ticks.
2. THE app SHALL use no web font.
3. THE S7 screens SHALL prefer visuals over text wherever the information allows; long prose SHALL be reserved for stories and the Listening_Guide.

### Requirement 21: Copy honesty and scaffold checks

**User Story:** As a satellite listener, I want the new screens and files to be as plain about the simulation as the existing ones, so that no wording, export or card suggests the app hears a real satellite.

#### Acceptance Criteria

1. THE Field_Copy SHALL hold every string of the S7 pages, components, the Calendar_Event, the Tuning_CSV header, the Attribution_Files and the First_Run_Guide as plain string literals.
2. THE Field_Copy and the S7 pages and components SHALL NOT claim or imply that the app receives, hears or decodes a real radio-frequency signal.
3. THE Honesty_Scan SHALL cover the property strings of every Field_Copy module and the JSX text of every page and component file this spec adds or changes, by explicit enumeration in the style of S4 to S6.
4. WHEN a text fails the Honesty_Scan, THE text SHALL be reworded; THE Honesty_Scan SHALL NOT be weakened, and no assertion of checks 1.19 to 1.25 SHALL be removed, loosened or blanket-allowed.
5. THE Route_Check SHALL be extended to enumerate by name every route directory, page file and `.ts` file this spec adds under `src/app`, and every `.tsx` file this spec adds under `src`.
6. THE checks 1.20 and 1.21 SHALL keep applying to `src/app/layout.tsx` and `src/app/page.tsx`, and THE checks 1.22 and 1.23 SHALL keep asserting the Provenance_Sentences of the README unchanged.

### Requirement 22: Landed interfaces and explicit extensions

**User Story:** As a maintainer, I want every change to a landed spec's code or decision named in the design with its reason, so that S1 to S6 stay trustworthy.

#### Acceptance Criteria

1. THE spec SHALL consume the landed S1 to S6 interfaces as they are; THE design SHALL list every landed file this spec changes, with the reason and the extent of the change.
2. THE design SHALL propose explicitly at least these extensions, or state why one is not needed: the S4 beacon change of Requirement 4; the Vertical_FOV of the projection (Requirement 9, criterion 5); the Local_Time_Note beyond the Picker_Page (Requirement 10, criterion 5); the camera in the AR_View beyond the real-time `in-pass` phase (Requirement 8, criterion 6); the `SESSION_COPY.sunlitNote` text (Requirement 4, criterion 6).
3. `src/lib/orbit` SHALL NOT be changed unless the design proposes the change with reasons and the owner approves the design.
4. THE S2 catalog data SHALL NOT be changed; facts that the catalog does not hold (setups, recording links, model sources) SHALL live in S7 data modules or documents.
5. THE app SHALL add no new package; IF the design judges one indispensable, THEN THE design SHALL ask the owner first.

### Requirement 23: Layering and tests

**User Story:** As a maintainer, I want the new logic small, pure where it can be and tested in Node, so that `pnpm test` stays the verification of the whole app.

#### Acceptance Criteria

1. THE pure logic of this spec SHALL live in the Field_Core (Requirement 1); browser access (camera, clipboard, downloads, storage, timers, animation frames) SHALL live in Field_Controllers with injected dependencies; pages SHALL stay thin in the pattern of the S4 to S6 pages.
2. THE tests of this spec SHALL run in the Vitest `node` environment as `tests/**/*.test.ts` files, offline under the network guard, without jsdom, happy-dom or a React testing library.
3. THE tests SHALL be the example tests that this document names, minimal and sufficient, with no multi-layer verification machinery, no low-level instrumentation and no negative instrumentation tests.
4. THE `pnpm test`, `pnpm run typecheck` and `pnpm run build` commands SHALL pass after every task and on the final tree.

### Requirement 24: Submission materials update

**User Story:** As the project owner, I want the README, the Devpost copy and the video script to show the field-companion features, so that judges see what S7 adds (Decision OQ-6).

#### Acceptance Criteria

1. THE README SHALL describe the S7 features (Illumination_Profile and Shadow_Silence, Tuning_Table, Pass_Planner and calendar export, Sky_Track, AR_View, Ground_Track_Map, Listening_Guide, models, Listening_Log, First_Run_Guide), and SHALL add the credits of the Coastline_Data and of every Original_Model.
2. THE README SHALL keep the Provenance_Sentences character for character, SHALL keep stating that the coordinate conventions and numeric acceptance baselines come from the author's earlier personal project SatAware AR and that all code was newly written during the Kiroween 2026 submission period, and SHALL pass the Honesty_Scan.
3. `docs/submission/DEVPOST.md` SHALL describe the S7 features and SHALL record the seven-spec workflow factually, without exaggeration; it SHALL keep the S6 red lines: no claim that the app receives real signals, every historical real reception attributed to a named listener or source, the Unconfirmed_Claims respected, English only.
4. `docs/submission/VIDEO_SCRIPT.md` SHALL include the strongest S7 moments (for example the AR_View with the Track_Arc over the real sky and the Ground_Track_Map), SHALL keep its shot durations summing to at most 180 seconds, and SHALL keep the red lines of criterion 3, English only.
5. THE red lines of `docs/submission/` SHALL be checked by review, as S6 Decision RQ-2 records.

### Requirement 25: Owner's final acceptance on a real phone

**User Story:** As the project owner, I want to check the new screens myself on my phone at the end, so that what judges see is what I accepted (Decision OQ-7).

#### Acceptance Criteria

1. THE task list SHALL end with a review task in which the project owner checks the S7 screens on a real phone against the Live_URL, including at least: the AR_View with the Track_Arc, the Lock_Ring, the Edge_Arrow and the FOV_Calibration; Shadow_Silence; the Sky_Track; the Tuning_Table, the copy and CSV actions; the Pass_Planner and an imported Calendar_Event; the smoothness of the Ground_Track_Map; the Model_Viewer and a Model_Download; the Listening_Guide links; the Listening_Log; the First_Run_Guide.
2. THE tasks SHALL record each outcome with the owner's report; THE agent SHALL NOT automate, assume or fabricate these outcomes.
3. THE S6 Device_Checklist (S6 task 7) and the S6 Final_Submission_Checklist (S6 task 11) SHALL stay S6 tasks; THE S6 Final_Submission_Checklist SHALL run after this spec lands.

### Requirement 26: Delivery tiers and task order

**User Story:** As the project owner, I want the most valuable parts delivered first, so that any cut before the deadline still leaves a coherent app.

#### Acceptance Criteria

1. THE parts SHALL be ranked in these Delivery_Tiers: Must: parts 1 (sunlight model and Shadow_Silence), 2 (Tuning_Table), 4 (Sky_Track) and 6 (AR_View with FOV_Calibration); Should: parts 5 (Ground_Track_Map), 3 (Pass_Planner with calendar export) and 8 (Listening_Guide); Could: parts 7 (models), 10 (First_Run_Guide, with the Instrument_Detail of Requirement 18 delivered inside each part's own screens) and 9 (Listening_Log).
2. THE task list SHALL deliver the Must tier first, then the Should tier, then the Could tier, then the Submission_Materials update (Requirement 24), then the owner's final acceptance (Requirement 25).
3. AFTER every task, THE pushed tree SHALL build, pass its tests and leave a coherent app, so that stopping after any task loses only the later parts.
4. THE tasks SHALL aim to finish by the internal target, the evening of 2026-12-04 (GMT+8), before the Submission_Deadline of 2026-12-05 06:00 GMT+8; WHEN a tier is at risk, THE agent SHALL report it to the owner instead of cutting a part silently.

## Workflow constraints

- The three spec documents are committed together with task 1's first commit.
- After each task's tests pass, the task is committed and pushed immediately, staging by file name; never in the middle of a task. The local `next.config.ts` edit is never staged.
- Parallel sub-agent execution only for independent tasks with disjoint files, at most 2 to 3 at once; commits and pushes are done serially by the main agent.
- Guard and utility code gets the simplest sufficient verification; where in doubt, the implementation follows design.md, and a gap in the design is raised with the owner instead of widened in place.

## Decisions recorded during requirements refinement

- OQ-1 (Shadow_Silence): approved. The simulated beacon of a Sunlit_Only_Entry falls silent while the satellite is In_Shadow, in real time and in demo mode. This changes S4 behavior; the design proposes the S4 change explicitly, and `SESSION_COPY.sunlitNote` is reworded (Requirement 4). S4 Known limitation 1 and S4 Requirement 9, criterion 6 ("`sunlitOnly` SHALL NOT gate the beacon") are superseded for the beacon only; the session flow and statistics stay as landed.
- OQ-2 (field of view): approved. The AR_View gets the FOV_Calibration with a stated range, saved locally (Requirement 9).
- OQ-3 (self-reported log): approved. The Listening_Log is in scope with the marking rules of Requirement 17.
- OQ-4 (models): no WebGL package and no other package; the default hand-written SVG or Canvas 2D renderer is used. Where no licensed original exists, an Illustrative_Model is authored and labelled. Priority is on completing the spec. (Interpretation of the owner's answer "先不加扩展，优先完成"; to be confirmed at the requirements review.)
- OQ-5 (values delegated to the requirements author): the Planner_Min_Elevation defaults to 10° with the choices 0°, 10°, 20° and 30°. Reason: a pass whose peak stays below 10° is short and low over the horizon, where buildings and terrain block it (C32: no terrain model), so it is rarely worth setting up for; 0° stays available. The filter selects by Maximum_Elevation, and the search stays at 0°, so AOS and LOS remain the horizon crossings of S4 (C80). The Track_Span is one orbital period back and one forward, from the TLE mean motion, so every entry shows exactly one full revolution on each side of the current point (for IMAGE its whole elliptical orbit) whatever its altitude.
- OQ-6 (submission materials): the README, Devpost and video-script updates are part of S7 (Requirement 24).
- OQ-7 (tiers and acceptance): all three tiers are committed, delivered in tier order (Requirement 26); the owner accepts the interface at the end on a real phone (Requirement 25).
