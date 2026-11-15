# Requirements Document

## Introduction

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). Users pick a real "zombie satellite" from a fixed catalog, the app predicts its passes over the user's location from public TLE data (SGP4), points the phone at the satellite in AR during a pass, plays a simulated beacon whose pitch follows the Doppler shift, and issues a digital QSL card after the pass. The primary audience is amateur radio and satellite listeners (SWL and SDR hobbyists): the app is their finding, pointing and Doppler-math aid, and the 60x demo mode is the newcomer entry point. The app is pure software: only the public orbital data is real, and the app receives no real radio-frequency signals.

This spec, shell-pwa-deploy (S6), is the final spec. It delivers:

1. The App_Shell and the Home_Page (Requirements 1 to 3).
2. The PWA minimum viable set: Web_App_Manifest, App_Icons and Service_Worker (Requirements 4 and 5).
3. The TLE_Proxy and the switch of the browser assembly to it (Requirements 6 and 7).
4. Geolocation as the default observer source (Requirement 8).
5. The Camera_Backdrop in the in-pass phase (Requirement 9).
6. The time-display decision (Requirement 10).
7. The scaffold-check extensions and the layering rules (Requirements 11 and 12).
8. The Deployment, a middle task, and the Device_Checklist run against the Deployed_Build (Requirements 13 and 14).
9. The Submission_Materials and the Final_Submission_Checklist (Requirements 15 to 19).

The orbit-engine (S1), zombie-catalog (S2), ar-pointing (S3), seance-session (S4) and qsl-card (S5) specs have landed and are closed. This spec changes no library logic of S1 to S5: every module under `src/lib/orbit`, `src/lib/catalog`, `src/lib/pointing`, `src/lib/session` and `src/lib/qsl`, and the S3 to S5 controllers under `src/components`, are consumed as landed. Page files under `src/app` and `src/components/session/browser-deps.ts` change only where a requirement of this spec names the change. If the design finds a landed interface insufficient, it SHALL propose the extension explicitly with reasons instead of changing code silently.

Landed interfaces consumed (cited as landed, not re-verified in the requirements phase):

- S1, `src/lib/orbit`: `createTleFetcher(options)` with the injected `FetchFunction` (`options.fetch`) and the injected clock (`options.now`). The fetcher builds the request URL `${CELESTRAK_GP_URL}?CATNR=${noradId}&FORMAT=tle` (`CELESTRAK_GP_URL` in `src/lib/orbit/constants.ts`), reads only `status` and `text()` of the response, and rejects every failure with an `EngineError`. The accepted NORAD range is the integers 1 to 99999.
- S4, `src/components/session/browser-deps.ts`: `createPickerBrowserDeps()` assembles `createTleFetcher({ now: clock.nowMs })` with the default fetch, so the browser requests celestrak.org directly today. The picker controller surfaces a fetcher rejection as the row status `'tle-unavailable'`, and the picker page renders "Orbit data unavailable." from `src/components/session/copy.ts`.
- S4, `src/components/session/observer-store.ts`: `createObserverStore(storage)` with `get()` and `set(position)`, key `zombieSatellite.session.observer`, validation and serialization through `parseStoredObserver` and `serializeObserver` of `src/lib/session`, fallback `DEFAULT_OBSERVER` (the Reference_Observer, latitude 39.9042, longitude 116.4074). Both session pages share this store; their manual coordinate inputs stay.
- S4, `src/lib/session`: the session phases `selecting`, `awaiting-pass`, `in-pass` and `completed`; `formatUtc(instantMs)` as the only UTC formatter.
- S2, `src/lib/catalog`: `listCatalogEntries`, `listPlayableEntries` and `getCatalogEntry`; entry fields `name`, `noradId`, `status`, `statusNote`, `hook`, `story`, `beacon.displayFrequency` and, on Story_Only_Entries, `unplayableReason`.
- S3, `.kiro/specs/ar-pointing/design.md`: the section "Manual_Device_Checklist" and risk R1.
- S1 to S5, `tests/scaffold/scaffold.test.ts`: checks 1.19 to 1.25 as they stand after S5.

### Normative sources

- Sections 2 and 4 of the Reference_Document are normative project-wide; no item of them is consumed by this spec, and no section 3 item applies.
- Times: all instants are UTC (project rule) and are displayed through `formatUtc` (Requirement 10).
- The app never claims to receive real RF signals; beacon audio is synthesized from public TLE data (project rule).
- S1 Requirement 1, criterion 11 (every test file runs in the Vitest `node` environment) stays in force; no DOM test environment is added.
- No new package is added. If the design judges one indispensable, it asks the project owner first.

### Verification scope

The automated tests of this spec run in the Vitest `node` environment, offline under the existing network guard. They cover:

- The pure logic this spec introduces: the TLE_Proxy request validation and response shaping (Requirement 6), the Proxy_Fetch URL rewrite (Requirement 7) and, if Requirement 10 adopts it, the Local_Time_Note function.
- Mock-based tests of the component-layer controllers that carry logic worth testing: the Geolocation_Controller (Requirement 8) and the Camera_Controller (Requirement 9).
- The route handler of the TLE_Proxy against a mocked upstream fetch (Requirement 6).
- The extended scaffold checks 1.19 to 1.25 (Requirement 11).

The Deployment, the installability of the PWA, the device behavior and the Submission_Materials are verified by `pnpm run build`, by the Live_URL and by review items (Requirements 13, 14 and 19). No test simulates the Deployment. React components are checked by review only.

### Out of scope

- Any change to the library logic of S1 to S5, and any change to the S4 session state machine, the observer store contract or the stored observer format.
- Satellite search, a user satellite library, a custom backend API beyond the TLE_Proxy, user accounts and server-side storage of user data.
- Offline session support, background sync, push notifications, and caching of TLE responses or pass and session data by the Service_Worker.
- Solving the fixed 75-degree field of view of the pointing projection.
- A fallback for risk R1 inside this spec (Requirement 14, criterion 4).
- Camera capture, recording, upload or storage.
- Local development configuration, including the uncommitted `allowedDevOrigins` edit of `next.config.ts`.
- Recording and uploading the video, and submitting the Devpost form; the project owner does these.

### Known limitations

1. The pointing projection keeps its fixed 75-degree field of view, so the marker over the Camera_Backdrop does not match the true camera field of view of every phone.
2. The TLE_Proxy depends on CelesTrak accepting requests from the hosting platform's servers. CelesTrak can rate-limit with HTTP 403; the TLE_Proxy then answers with an error status, and the picker shows "Orbit data unavailable.".
3. The TLE_Proxy server-side cache can serve a TLE up to the Proxy_Cache_Duration old; TLE data changes on a scale of hours to days, so the age is within the accuracy the app needs.

## Glossary

- **App_Shell**: The global layout of every page: the Global_Navigation, the Service_Worker registration and the manifest link.
- **Global_Navigation**: The header or equivalent element on every page with links to the Home_Page, `/session` and `/cards`.
- **Home_Page**: The page at `/`, rendered by `src/app/page.tsx`.
- **App_Statement**: The one-line statement on the Home_Page of what the app is.
- **Catalog_Presentation**: The browsable presentation of all entries of `listCatalogEntries` on the Home_Page.
- **Playable_Entry**: A catalog entry with `playable: true`.
- **Story_Only_Entry**: A catalog entry with `playable: false`.
- **Catalog_Prose**: The catalog entry fields `statusNote`, `hook` and `story`.
- **Shell_Copy**: The copy module that holds every string of the App_Shell and the Home_Page as plain string literals; the design fixes its path.
- **Honesty_Scan**: Checks 1.24 and 1.25 of `tests/scaffold/scaffold.test.ts`.
- **Web_App_Manifest**: The W3C Web App Manifest of the app.
- **App_Icons**: The icon files the Web_App_Manifest references.
- **Service_Worker**: The service worker script of the app.
- **Shell_Assets**: The responses the Service_Worker may cache: the app shell documents and the static build and icon assets that the design enumerates.
- **TLE_Proxy**: The Next.js route handler that fetches a TLE from CelesTrak on the server and returns it to the page. Proposed path `/api/tle`; the design fixes the path and the request and response shape.
- **Upstream_Request**: The request of the TLE_Proxy to CelesTrak: `CELESTRAK_GP_URL` with `CATNR` set to the NORAD catalog number and `FORMAT=tle`.
- **Proxy_Cache_Duration**: The duration for which the TLE_Proxy reuses a successful Upstream_Request response; the design states it on an hours scale.
- **Proxy_Fetch**: The `FetchFunction` that the browser assembly injects into `createTleFetcher`; it rewrites the CelesTrak URL the fetcher built into a request to the TLE_Proxy.
- **Geolocation_Controller**: The component-layer controller that requests one position fix through the injected browser geolocation API.
- **Geolocation_Trigger**: The event on which the Geolocation_Controller may start an Automatic_Locate; the design fixes it.
- **Automatic_Locate**: A position request started by the Geolocation_Trigger, allowed only while the observer storage holds no valid value.
- **Explicit_Locate**: A position request started by the user's click on the "use my location" control; its fix overwrites the stored observer.
- **Reference_Observer**: `DEFAULT_OBSERVER`, latitude 39.9042, longitude 116.4074.
- **Camera_Backdrop**: The live device camera video shown behind the pointing UI during the `in-pass` phase of the Session_Page.
- **Camera_Controller**: The component-layer controller that starts and stops the camera stream through the injected `getUserMedia`.
- **Session_Page**: The S4 page at `/session/[noradId]`.
- **Picker_Page**: The S4 page at `/session`.
- **Local_Time_Note**: An optional parenthetical local-time text next to a UTC pass prediction on the Picker_Page (Requirement 10).
- **Deployment**: Publishing the production build to a public HTTPS host.
- **Hosting_Platform**: The host of the Deployment; proposal Vercel.
- **Live_URL**: The public HTTPS URL of the Deployment.
- **Deployed_Build**: The build served at the Live_URL.
- **Device_Checklist**: The section "Manual_Device_Checklist" of `.kiro/specs/ar-pointing/design.md`, with its iPhone pass and Android pass.
- **Reference_Document**: `docs/reference/TECHNICAL_ROUTE.md`, the trimmed technical route of the author's earlier personal project SatAware AR.
- **English_Route**: The English translation of the Reference_Document; the design fixes its file name in `docs/reference`.
- **Story_Source**: `docs/reference/POSITIONING_AND_STORY.md`.
- **Provenance_Sentences**: The two README sentences asserted verbatim by checks 1.22 and 1.23: "The coordinate conventions and numeric acceptance baselines come from the author's earlier personal project SatAware AR." and "All code in this repository was newly written during the Kiroween 2026 submission period."
- **Devpost_Copy**: The Devpost texts in `docs/submission/`; the design fixes the file names.
- **Video_Script**: The shot list of the submission video in `docs/submission/`.
- **Submission_Materials**: The English_Route, the README, the Devpost_Copy and the Video_Script.
- **Final_Submission_Checklist**: The closing review items of the task list (Requirement 19).
- **Submission_Deadline**: 2026-12-05 06:00 GMT+8 (2026-12-04 22:00 UTC). Internal target: everything wrapped by the evening of 2026-12-04.

## Requirements

### Requirement 1: App shell and global navigation

**User Story:** As a satellite listener, I want the same header on every page, so that I can move between the catalog, the sessions and my cards without typing URLs.

#### Acceptance Criteria

1. THE App_Shell SHALL render the Global_Navigation on every page of the app, with links to the Home_Page, `/session` and `/cards`.
2. THE design SHALL decide whether `/pointing` joins the Global_Navigation; by default `/pointing` stays a utility page that remains reachable by its URL and is not in the Global_Navigation.
3. THE `src/app/layout.tsx` and `src/app/page.tsx` files SHALL keep satisfying checks 1.20 and 1.21: no `'use client'`, no `fetch`, no `async` function, no `next/font` and no `next/image`.
4. IF the App_Shell needs a client component (for example for the Service_Worker registration), THEN THE design SHALL state its file path and THE scaffold check 1.19 SHALL enumerate that file by name (Requirement 11).
5. THE Global_Navigation SHALL NOT change the behavior of the S3 to S5 pages beyond adding the navigation element around their content.

### Requirement 2: Home page

**User Story:** As a newcomer or a satellite listener, I want the first page to say plainly what the app is and to show me all the zombie satellites with their history, so that I know what I can try and why these satellites matter.

#### Acceptance Criteria

1. THE Home_Page SHALL replace the scaffold text "Orbit engine scaffold. The app interface arrives in later specs.".
2. THE Home_Page SHALL show the App_Statement: the app is a finding, pointing and Doppler aid for amateur radio and satellite hobbyists; the beacon is simulated; only public orbital data is real. THE App_Statement SHALL be worded to pass the Honesty_Scan: no sentence pairs a reception word with a radio term, and the audience is named with words such as "hobbyists" or "watchers" instead of "listeners" (Decision RQ-1).
3. THE Home_Page SHALL show the Catalog_Presentation with every entry of `listCatalogEntries`, Playable_Entries and Story_Only_Entries alike, each with its `name`.
4. THE Catalog_Presentation SHALL tell Playable_Entries and Story_Only_Entries apart, and SHALL show for each Story_Only_Entry why it cannot be played, as a Shell_Copy text mapped from its `unplayableReason`.
5. THE Catalog_Presentation MAY show the Catalog_Prose of every entry; the S4 and S5 bans on Catalog_Prose apply to the Session_Page, the Picker_Page, the S5 pages and the card face, not to the Home_Page.
6. WHERE the Home_Page shows Catalog_Prose, THE Home_Page SHALL present it as documented history, attributed as written in the Story_Source (named listeners, sourced events), and SHALL NOT phrase a historical reception as a capability of this app.
7. THE Home_Page SHALL link to `/session` and `/cards`.
8. WHERE the Home_Page links a Playable_Entry to a session, THE link SHALL target the existing `/session` or `/session/[noradId]` routes; THE Home_Page SHALL NOT start a session itself.

### Requirement 3: Shell copy and honesty

**User Story:** As a satellite listener, I want the landing page and the header to be as plain about the simulation as the session pages, so that no wording suggests the app hears a real satellite.

#### Acceptance Criteria

1. THE Shell_Copy SHALL hold every string of the App_Shell and the Home_Page as plain string literals, following `SESSION_COPY` and `QSL_COPY`.
2. THE Shell_Copy, the App_Shell and the Home_Page SHALL NOT claim or imply that the app receives, hears or decodes a real radio-frequency signal.
3. THE Honesty_Scan SHALL cover the property strings of the Shell_Copy module and the JSX text of every page and client component file this spec adds or changes, by explicit enumeration in the style of S4 and S5.
4. WHEN a Shell_Copy text fails the Honesty_Scan, THE text SHALL be reworded; THE Honesty_Scan SHALL NOT be weakened.

### Requirement 4: Web App Manifest and icons

**User Story:** As a satellite listener, I want to add the app to my home screen, so that I can open it like an app when a pass is due.

#### Acceptance Criteria

1. THE app SHALL serve a Web_App_Manifest with `name`, `short_name`, `icons`, `theme_color`, `background_color` and `display: standalone`; the design states the values.
2. THE App_Icons SHALL be produced locally by a method the design states (drawn or generated in the repository) and SHALL be served from the app's own origin; THE app SHALL NOT hotlink an icon.
3. THE App_Icons SHALL include the sizes the design states as needed for installability on Android Chrome and for the iOS home-screen icon.
4. THE `src/app/layout.tsx` metadata SHALL link the Web_App_Manifest and declare the theme color, within the constraints of Requirement 1, criterion 3.
5. IF the Web_App_Manifest or the App_Icons are files under `src/app`, THEN THE scaffold check 1.19 SHALL enumerate them by name (Requirement 11).

### Requirement 5: Service worker

**User Story:** As a satellite listener, I want the installed app to open quickly, without ever showing me an old orbit as if it were current.

#### Acceptance Criteria

1. THE app SHALL register one Service_Worker from the App_Shell, in the browser only, and a failed or unsupported registration SHALL NOT break any page.
2. THE Service_Worker SHALL cache only Shell_Assets.
3. THE Service_Worker SHALL NOT cache, and SHALL NOT answer from a cache, any request to the TLE_Proxy, any request to CelesTrak, and any other request the design does not enumerate as a Shell_Asset.
4. THE acceptance bar of the PWA SHALL be exactly: the Deployed_Build is installable to the home screen and opens in a standalone window (review item of Requirement 14). Offline session support is not required.
5. THE design SHALL state how a new Deployment replaces the Shell_Assets cached by an earlier Service_Worker version.

### Requirement 6: TLE server-side proxy

**User Story:** As a satellite listener in China, I want the app to get orbit data without my phone connecting to celestrak.org, so that pass prediction works where that connection is slow or blocked.

#### Acceptance Criteria

1. THE app SHALL provide the TLE_Proxy as a Next.js route handler; THE design SHALL fix its path (proposal `/api/tle`), its request parameter and its response shape, and SHALL record the motivation: end users' browsers, phones in China in particular, must not depend on a direct connection to celestrak.org.
2. WHEN the TLE_Proxy receives a request, THE TLE_Proxy SHALL validate the NORAD catalog number as an integer from 1 to 99999 before any Upstream_Request.
3. IF the NORAD catalog number is missing or invalid, THEN THE TLE_Proxy SHALL answer with an explicit client-error status the design states and SHALL NOT send an Upstream_Request.
4. WHEN the NORAD catalog number is valid, THE TLE_Proxy SHALL send the Upstream_Request in the landed request shape: `CELESTRAK_GP_URL` with `CATNR` and `FORMAT=tle`.
5. WHEN the Upstream_Request succeeds, THE TLE_Proxy SHALL answer with status 200 and the TLE text as received.
6. IF the Upstream_Request fails (network failure, timeout or a status other than 200), THEN THE TLE_Proxy SHALL answer with an explicit error status the design states, and SHALL NOT answer with fabricated TLE text or with stale TLE text presented as fresh.
7. THE TLE_Proxy SHALL keep a server-side cache of successful Upstream_Request responses for the Proxy_Cache_Duration that the design states on an hours scale, matched to how often TLE data changes, and SHALL NOT cache a failed Upstream_Request.
8. THE design SHALL state whether the TLE_Proxy checks the upstream body before answering 200 (for example a CelesTrak "No GP data found" text with status 200), and the acceptance tests SHALL pin the stated behavior.
9. THE TLE_Proxy request validation and response shaping SHALL be pure functions in a testable module (Requirement 12), and THE acceptance tests SHALL cover a valid request, an invalid number, an upstream non-200 status and an upstream network failure against a mocked upstream fetch.

### Requirement 7: Browser assembly through the proxy

**User Story:** As a satellite listener, I want every orbit-data request of my browser to go to the app's own server, and a clear "unavailable" when that fails, so that I never get a silent detour or a fake orbit.

#### Acceptance Criteria

1. THE browser assembly in `src/components/session/browser-deps.ts` SHALL pass the Proxy_Fetch as `options.fetch` to `createTleFetcher`; `src/lib/orbit` SHALL NOT be modified.
2. WHEN the TLE_Fetcher calls the Proxy_Fetch with the CelesTrak URL it built, THE Proxy_Fetch SHALL take the NORAD catalog number from that URL and request the same-origin TLE_Proxy, forwarding the request init the fetcher passed.
3. IF the URL passed to the Proxy_Fetch does not have the landed CelesTrak request shape, THEN THE Proxy_Fetch SHALL reject without sending any request.
4. THE browser SHALL NOT send any request to celestrak.org; THE Proxy_Fetch SHALL NOT fall back to direct CelesTrak access when the TLE_Proxy fails.
5. WHEN the TLE_Proxy answers with an error status or is unreachable, THE failure SHALL surface exactly as today: fetcher rejection, row status `'tle-unavailable'`, and the text "Orbit data unavailable." on the Picker_Page.
6. THE URL rewrite of the Proxy_Fetch SHALL be a pure function with acceptance tests for the landed CelesTrak URL shape and for a URL of another shape.

### Requirement 8: Geolocation as the default observer source

**User Story:** As a satellite listener, I want the app to use my phone's position for pass predictions, so that I do not have to type my coordinates, while keeping manual entry when I prefer it.

#### Acceptance Criteria

1. WHEN the Geolocation_Trigger fires and the observer storage holds no valid value (the stored text fails `parseStoredObserver`), THE Geolocation_Controller SHALL request one position fix through the injected browser geolocation API (Automatic_Locate). The design fixes the Geolocation_Trigger within the picker and session flow.
2. WHILE the observer storage holds a valid value, THE Geolocation_Trigger SHALL NOT request a fix, so that coordinates entered manually are never overwritten by an Automatic_Locate.
3. THE Automatic_Locate SHALL NOT cause a permission prompt on every visit; THE design SHALL state the rule that prevents repeated prompts.
4. WHEN an Automatic_Locate fix arrives and the observer storage still holds no valid value, THE fix SHALL be written through the observer store (`createObserverStore(storage).set`, same key, same stored format), and THE observer shown on the page SHALL reflect it.
5. THE Picker_Page and the Session_Page SHALL show a "use my location" control at the existing observer inputs; WHEN the user clicks it, THE Geolocation_Controller SHALL request one fix (Explicit_Locate), and WHEN that fix arrives, THE fix SHALL overwrite the stored observer through the same observer store.
6. IF the user denies the permission, the request times out, or the geolocation API is unavailable, THEN THE observer SHALL stay the stored value, or the Reference_Observer when nothing valid is stored, and no error SHALL block the page.
7. THE existing manual coordinate inputs of both session pages SHALL stay and keep working.
8. THE Geolocation_Controller SHALL NOT change the stored format, the observer store contract or the S4 session state machine.
9. THE Geolocation_Controller SHALL be a framework-free component-layer module with every browser object injected, in the factory pattern of S3 to S5; pure logic SHALL move to the lib layer only if it is new beyond `parseStoredObserver`.
10. THE acceptance tests SHALL cover, with a mocked geolocation API: an Automatic_Locate fix written when nothing valid is stored; no request when a valid value is stored; an Explicit_Locate fix overwriting a stored value; a denial; a timeout; and an unavailable API.
11. THE design SHALL state the timeout and the accuracy options of the position request.

### Requirement 9: Camera backdrop

**User Story:** As a satellite listener, I want to see the sky through my camera behind the pointing marker during a pass, so that pointing feels like looking for the satellite in the real sky.

#### Acceptance Criteria

1. WHILE the Session_Page is in the `in-pass` phase, THE Session_Page SHALL offer a control to turn the Camera_Backdrop on and off.
2. WHEN the user turns the Camera_Backdrop on, THE Camera_Controller SHALL request the rear camera through the injected `getUserMedia`, and THE Session_Page SHALL show the video behind the existing pointing marker.
3. IF the permission is denied, no camera exists, the API is unavailable or the context is not secure, THEN THE Session_Page SHALL keep the existing plain background without blocking the session; THE design SHALL state whether a short Shell_Copy or Session_Page note is shown.
4. WHEN the `in-pass` phase ends, the user turns the Camera_Backdrop off, or the user leaves the Session_Page, THE Camera_Controller SHALL stop every track of the camera stream.
5. THE Camera_Backdrop SHALL be a visual layer only: THE app SHALL NOT capture, record, upload or store any frame.
6. THE design SHALL state the seam: where the video layer mounts relative to the existing pointing UI of the Session_Page and how it is toggled; S3's projection functions and S4's session controller and state machine SHALL NOT change.
7. THE Camera_Backdrop SHALL keep the fixed 75-degree field of view as the accepted Known limitation 1.
8. THE acceptance tests SHALL cover, with a mocked `getUserMedia`, a started stream, a denial, an unavailable API and the stop of every track.

### Requirement 10: Time display

**User Story:** As a satellite listener, I want UTC times as listeners use them, and at most a small local-time hint, so that the convention never changes under me.

#### Acceptance Criteria

1. THE app SHALL keep UTC as the primary display of every instant, and `formatUtc` SHALL remain the only UTC formatter.
2. THE design SHALL decide whether the Picker_Page adds a Local_Time_Note to the pass predictions, and SHALL record the decision with its reason.
3. WHERE the Local_Time_Note is adopted, THE Local_Time_Note SHALL appear only on the Picker_Page pass predictions, after the UTC text, as a separate small pure function with its own acceptance tests.
4. THE app SHALL NOT change the time convention silently; no other page changes its time display.

### Requirement 11: Scaffold check extensions

**User Story:** As a maintainer, I want every new file shape named explicitly in the scaffold checks, so that a stray route or client file is caught and no check gets weaker.

#### Acceptance Criteria

1. THE check 1.19 SHALL be extended to enumerate by name every entry this spec adds to the `src/app` directory listing (for example an `api` directory for the TLE_Proxy, or a manifest file) and every `.tsx` file this spec adds under `src`.
2. THE design SHALL state how check 1.19 names the TLE_Proxy route handler, which is a `.ts` file and therefore outside the `.tsx` inventory, and any Web_App_Manifest file.
3. THE checks 1.20 and 1.21 SHALL keep applying to `src/app/layout.tsx` and `src/app/page.tsx`.
4. THE checks 1.22 and 1.23 SHALL keep asserting the Provenance_Sentences in `README.md` unchanged.
5. THE coverage lists of checks 1.24 and 1.25 SHALL be extended by explicit enumeration for every page, client component and copy module this spec adds or changes.
6. THE extensions SHALL NOT weaken, remove or blanket-allow any existing assertion.

### Requirement 12: Layering and tests

**User Story:** As a maintainer, I want the new logic small, pure where it can be and tested in Node, so that `pnpm test` stays the verification of the whole app.

#### Acceptance Criteria

1. THE new pure logic of this spec (TLE_Proxy validation and response shaping, the Proxy_Fetch URL rewrite and, if adopted, the Local_Time_Note) SHALL live in testable modules whose location the design fixes.
2. IF the design creates a new directory under `src/lib`, THEN THE design SHALL add a source-boundary scan for it in the style of S1 to S5.
3. THE TLE_Proxy route handler, the Service_Worker registration, the Geolocation_Controller and the Camera_Controller SHALL be platform or component-layer code with injected dependencies, tested with mocks where they carry logic worth testing.
4. THE tests of this spec SHALL run in the Vitest `node` environment as `tests/**/*.test.ts` files, offline under the network guard, without jsdom, happy-dom or a React testing library.
5. THE tests SHALL be minimal and sufficient, with no multi-layer verification machinery and no test that simulates the Deployment.
6. THE `pnpm test`, `pnpm run typecheck` and `pnpm run build` commands SHALL pass on the final tree.

### Requirement 13: Deployment

**User Story:** As a hackathon judge, I want to open the app from a public HTTPS link, so that I can try it on my own phone.

#### Acceptance Criteria

1. THE app SHALL be deployed to a public HTTPS Live_URL on the Hosting_Platform; THE design SHALL confirm Vercel (native Next.js hosting, free tier, HTTPS and a public link) or state why another platform is chosen.
2. THE Deployment task SHALL sit in the middle of the task list: after the App_Shell, the PWA and the TLE_Proxy have landed, and before the Device_Checklist and the final acceptance run.
3. WHEN the Deployment task is reached, THE agent SHALL stop, report that the build is ready to deploy and give the Vercel import points; THE project owner SHALL connect the GitHub repository to Vercel and deploy, and SHALL report the Live_URL back. THE agent SHALL NOT deploy itself and SHALL continue with the later tasks only against the reported Live_URL (Decision RQ-5).
4. THE Deployed_Build SHALL serve the TLE_Proxy, and a TLE request through the Live_URL SHALL succeed for at least one Playable_Entry (review item).
5. THE Live_URL SHALL be recorded in the README (Requirement 16).
6. THE Deployment SHALL NOT include the local `allowedDevOrigins` edit of `next.config.ts`; that edit SHALL never be staged or committed.
7. THE Deployment SHALL be verified by the build, by opening the Live_URL and by the review items of Requirement 14; no automated test simulates it.

### Requirement 14: Device checklist on the deployed build

**User Story:** As the project owner, I want the S3 device checklist run on the real deployment, so that the pointing behavior judges see is the behavior I checked.

#### Acceptance Criteria

1. WHEN the Deployment is complete, THE project owner SHALL run the Device_Checklist against the Live_URL: the full iPhone pass, including step 5 (tilt the camera up to about 60 degrees elevation; the heading must not jump by about 180 degrees), and the Android pass.
2. THE project owner SHALL also check on the Deployed_Build that the PWA installs to the home screen and opens in a standalone window (Requirement 5, criterion 4), that geolocation fills the observer (Requirement 8) and that the Camera_Backdrop shows and stops (Requirement 9).
3. THE tasks SHALL record each outcome as a review item with the owner's report; THE agent SHALL NOT automate or fabricate these outcomes.
4. IF step 5 shows the heading flip on a real iPhone, THEN THE tasks SHALL record the measured data and THE flip SHALL be handled by a separate fix opened under R1's recorded policy; THE design and tasks of this spec SHALL NOT design or build a fallback.

### Requirement 15: English technical route

**User Story:** As a judge who does not read Chinese, I want the technical route in English, so that I can follow the conventions and baselines the app is built on.

#### Acceptance Criteria

1. THE English_Route SHALL be placed in `docs/reference/` under the file name the design fixes.
2. THE English_Route SHALL translate the Reference_Document as it is in the repository, section by section, and SHALL NOT add content the Reference_Document does not contain.
3. THE English_Route SHALL keep every number, unit, formula, identifier and code element of the Reference_Document unchanged.

### Requirement 16: README final pass

**User Story:** As a judge or a listener arriving at the repository, I want one README that says what the app is, how to play, how to run it and where it is live, so that I can try it in minutes.

#### Acceptance Criteria

1. THE README SHALL contain a project introduction, the play loop (pick a satellite, predict the pass, point the phone, hear the simulated beacon, collect the QSL card), how to run locally, and the Live_URL.
2. THE README SHALL contain the honesty statement: the beacon is simulated, only public orbital data is used, and the app performs no real reception, worded so that no sentence pairs a reception word with a radio term (Decision RQ-1).
3. THE README SHALL contain the SatAware AR provenance, and the Provenance_Sentences SHALL survive character for character.
4. THE README SHALL keep the existing local-run, test and live-CelesTrak-test instructions accurate for the final tree.
5. THE README SHALL pass the Honesty_Scan, which already covers its paragraphs and list items.

### Requirement 17: Devpost copy

**User Story:** As a judge, I want a Devpost page that tells who the app is for and how it was built, without overclaiming, so that I can score it fairly.

#### Acceptance Criteria

1. THE Devpost_Copy SHALL be committed in `docs/submission/` under the file names the design fixes.
2. THE Devpost_Copy SHALL contain the project name zombieSatellite, a tagline and the full description in the established narrative structure: the problem; who it is for (amateur radio and satellite listeners first, the 60x demo mode as the newcomer entry point); why it matters; per-satellite story anchors taken from the Story_Source; a Built with list; and the Kiro usage record.
3. THE Kiro usage record SHALL state factually: the six-spec workflow with per-spec requirements, design and tasks; Opus for requirements and design and Sonnet for implementation; human review gates between stages; per-task commits; the landed test suite as verification. It SHALL NOT exaggerate.
4. THE Devpost_Copy SHALL NOT claim or imply that the app receives real signals, and SHALL NOT position the app as a generic satellite tracker.
5. THE story anchors SHALL stay within the Story_Source, including its list of unconfirmed claims; every historical real reception SHALL be attributed to a named listener or a named source, and no statement of the app's own capability SHALL claim the reception of a real signal.
6. THE Devpost_Copy SHALL be written in English only.
7. THE Devpost_Copy and the Video_Script are outside the Honesty_Scan by deliberate decision (Decision RQ-2); THE red lines of criteria 4 and 5 SHALL be checked by review in the Final_Submission_Checklist.

### Requirement 18: Video script

**User Story:** As the project owner, I want a shot list I can record in one sitting, so that the video tells the story in at most three minutes.

#### Acceptance Criteria

1. THE Video_Script SHALL be committed in `docs/submission/` under the file name the design fixes.
2. THE Video_Script SHALL list shots, each with picture, narration points and duration in seconds, and THE durations SHALL sum to at most 180 seconds.
3. THE Video_Script SHALL follow the arc: the story hook (LES-1, heard again in 2012), a real pass with the phone raised and pointed, the beacon sound and the Doppler readout, the QSL card, and the demo mode as the closing beat.
4. THE narration points SHALL keep the red lines of Requirement 17, criteria 4 and 5.
5. THE Video_Script, including its narration, SHALL be written in English only.

### Requirement 19: Final submission checklist

**User Story:** As the project owner, I want one closing checklist before the deadline, so that nothing required by the hackathon is missing.

#### Acceptance Criteria

1. THE task list SHALL close with the Final_Submission_Checklist as review items: the repository is public with the MIT license (verify), `/.kiro` is present in the repository and not gitignored (verify after this spec's documents land), the Live_URL opens, the video link is recorded, and the Devpost form fields match the committed Devpost_Copy one to one.
2. THE Final_Submission_Checklist SHALL be completed before the Submission_Deadline, with the internal target of the evening of 2026-12-04.

## Workflow constraints

- The three spec documents are committed together with task 1's first commit.
- After each task's tests pass, the task is committed and pushed immediately, staging by file name. The uncommitted `allowedDevOrigins` edit of `next.config.ts` is never staged.
- Parallel sub-agent execution only for independent tasks with disjoint files, at most 2 to 3 at once; commits and pushes are done serially by the main agent.

## Decisions recorded during requirements refinement

- RQ-1 (honesty wording vs. scan): the copy is reworded and checks 1.24 and 1.25 stay exactly as they are. Check 1.25 flags any sentence that pairs a reception word (`listen…`, `hear…`, `receiv…`, `captur…`, `decod…`) with a radio term (`radio`, `beacon`, `signal`, `transmission`), even when negated; check 1.24 requires `simulated` or `synthesized` in any text that carries a radio term. The App_Statement and the README honesty statement are written accordingly: reception words and radio terms never share a sentence, and the audience is named "hobbyists" or "watchers" rather than "listeners" (Requirement 2, criterion 2; Requirement 3, criterion 4; Requirement 16, criterion 2).
- RQ-2 (submission documents and the scan): `docs/submission/` is not added to the Honesty_Scan; the Devpost_Copy and the Video_Script are checked by review, and the design records this as a deliberate decision. The red lines stay: a historical real reception is always attributed to a named listener or source, and no statement of the app's own capability claims the reception of a real signal (Requirement 17, criteria 5 and 7).
- RQ-3 (geolocation priority): an Automatic_Locate runs and writes only while the observer storage holds no valid value, so manually entered coordinates are never overwritten automatically. A "use my location" control at the existing observer inputs starts an Explicit_Locate, whose fix overwrites the stored observer (Requirement 8).
- RQ-4 (manifest values): the design proposes `name` (zombieSatellite), `short_name`, `theme_color` and `background_color`, with the colors taken from the app's existing palette; the values are approved together with the design (Requirement 4, criterion 1).
- RQ-5 (deployment): at the Deployment task the agent stops, reports that the build is ready and gives the Vercel import points; the project owner connects the GitHub repository to Vercel and deploys, then reports the Live_URL. The agent records it in the README and runs the later tasks and acceptance against the Deployed_Build (Requirement 13, criterion 3).
- RQ-6 (language): the Submission_Materials of `docs/submission/` (Devpost_Copy, Video_Script and its narration) are English only; no Chinese version is made (Requirement 17, criterion 6; Requirement 18, criterion 5).
