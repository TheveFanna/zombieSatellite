# Requirements Document
## Introduction
zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). Users pick a real "zombie satellite" from a fixed catalog, the app predicts its passes over the user's location from public TLE data (SGP4), points the phone at the satellite in AR during a pass, plays a simulated beacon whose pitch follows the Doppler shift, and issues a digital QSL card after the pass. The primary audience is amateur radio and satellite listeners (SWL and SDR hobbyists). The app is pure software: only the public orbital data is real, and the app receives no real radio-frequency signals.
This spec, qsl-card (S5), turns the completed Session_Results that S4 persists into collectible QSL_Cards. It has two parts:
1. The QSL_Core: framework-free pure functions under `src/lib/qsl` for the Card_Model, the Honesty_Marks, card eligibility, the Card_SVG builder, the Collection_Order with the Group_Ordinals, and the Pass_Number.
2. The QSL_Components under `src/components/qsl`: framework-free QSL_Controllers with injected dependencies (stored-result read, `.svg` and `.png` downloads, canvas rasterization), and the thin Collection_Page and Card_Detail_Page.
The orbit-engine (S1), zombie-catalog (S2), ar-pointing (S3) and seance-session (S4) specs have landed. This spec changes none of their source files, with the single exception of Requirement 7, criterion 10. It consumes these interfaces as landed:
- S4, `src/lib/session`: the `SessionResult` interface `{ noradId, aosMs, losMs, maxElevationDeg, lockedSeconds, bestPointingErrorDeg (number | null), lockedRatio (0..1), completed, mode ('real' | 'demo'), autoPointUsed }`; `isSessionResult`, `parseSessionResults` and `MAX_STORED_RESULTS` (50); `formatUtc(instantMs)`, which returns text such as `2026-11-09 11:18:05 UTC` and is the project's only time format.
- S4, `src/components/session`: `readSessionResults(storage)`, which returns the valid stored Session_Results under the key `zombieSatellite.session.results`, oldest first, and never throws; the `SESSION_COPY` precedent, including its `noFrequency` note.
- S2, `src/lib/catalog`: `getCatalogEntry(noradId)`, which returns a `CatalogEntry` or `undefined`, and the entry fields `name`, `noradId`, `status`, `statusNote`, `hook`, `story` and `beacon.displayFrequency` (`string | null`, null exactly when the entry has no documented downlink; the string already carries its qualifiers, for example `about 237 MHz` and `137.56 MHz (historical)`).
- S3, `src/components/pointing/deps.ts`: the injected `KeyValueStorage` interface.
A Session_Result carries no observer position and no TLE data. A QSL_Card shows only what one Session_Result and one catalog entry contain.
### Normative sources
- Sections 2 and 4 of the Reference_Document are normative project-wide; no item of them is consumed by this spec, and no section 3 item applies.
- Times: all instants are UTC (project rule) and are displayed through `formatUtc` only.
- The `SessionResult` interface, the S4 read path and the catalog values are cited as landed and are not re-verified in the requirements phase; the acceptance tests of the implementation phase exercise them.
- S1 Requirement 1, criterion 11 (every test file runs in the Vitest `node` environment) stays in force; no DOM test environment is added.
### Verification scope
The automated tests of this spec run in the Vitest `node` environment. They are unit tests over the QSL_Core and mock-based tests of the QSL_Controllers. They cover:
- QSL_Core: the Source_Boundary_Scan (Requirement 1); the Card_Model field mapping against one hand-computed complete fixture, field by field, and the null Best_Pointing_Error presentation (Requirement 2); the DEMO mark present exactly when `mode` is `demo` and the Auto_Point mark present exactly when `autoPointUsed` is true (Requirement 3); no card for `completed: false` and an unknown `noradId` skipped (Requirement 4); the Card_SVG text containing the required texts and marks, and XML escaping (Requirement 5); the Collection_Order newest AOS first including its tie-break, and the Group_Ordinal assignment and look-up (Requirement 7); the Pass_Number format, its stability, equal Pass_Numbers for one pass and distinct Pass_Numbers for distinct passes across the fixture set (Requirement 8).
- QSL_Controllers, with mocks: the stored-result read through injected storage (Requirement 7) and the `.svg` and `.png` download actions against mock browser objects, without producing a real file or image (Requirement 6).
- The extended Honesty_Scan and the extended route check of the S1 scaffold test (Requirement 9).
The React components of the pages are checked by review only. The Card_Visual_Check is a review item, not an automated test. Criteria not named here are checked by review.
### Out of scope
- The app shell, navigation from the home page, PWA, deployment and the camera view (S6). No link to the S5 pages is added to `src/app/page.tsx`.
- Submission materials (S6).
- Any change to the source files of S1, S2, S3 or S4, except Requirement 7, criterion 10.
- A card issuance registry, server-side numbering, sharing to social networks, card editing, deleting stored results, and any new package.
- Observer position, TLE data or any value not contained in a Session_Result or a catalog entry on the card.
- A DOM test environment (jsdom, happy-dom) and React component tests.
### Known limitations
1. S4 keeps only the newest `MAX_STORED_RESULTS` (50) Session_Results, so the oldest cards leave the collection when newer sessions are stored.
2. A Demo_Session can be run more than once on the same pass, and a demo run and a real-time run can follow the same pass. Such Session_Results share `noradId` and `aosMs`, and two demo runs can agree in every field. Their QSL_Cards share one Pass_Number by design (Requirement 8), and the Card_Address tells them apart by the Group_Ordinal (Requirement 7, criterion 6).
3. The Group_Ordinal of a QSL_Card is not permanent. It follows the Collection_Order, so when a Card_Source joins or leaves the group of its pass, the Group_Ordinals of the other cards of that pass can change, and an earlier Card_Address can then open another card of the same pass or no card. The design states exactly which changes shift Group_Ordinals.
4. In a demo card, `lockedSeconds` counts virtual seconds on the Session_Clock (S4 Requirement 8); the DEMO mark tells the reader so.
## Glossary
- **QSL_Core**: The framework-free pure functions delivered by this spec under `src/lib/qsl`.
- **QSL_Source_Module**: A module under `src/lib/qsl`. Test files and test helpers are not QSL_Source_Modules.
- **QSL_Components**: The component layer delivered by this spec under `src/components/qsl`: the QSL_Controllers, the browser dependency builder and, if the design places it there, the QSL_Copy module.
- **QSL_Controller**: A framework-free component-layer module that performs side effects (storage read, file download, canvas rasterization) with every side-effect source injected as a parameter, following the factory pattern of S3 and S4.
- **Session_Result**: The S4 `SessionResult` record.
- **Card_Source**: A Session_Result with `completed: true` whose `noradId` resolves through `getCatalogEntry` to a catalog entry.
- **QSL_Card**: The collectible card derived from one Card_Source.
- **Card_Model**: The plain data object the QSL_Core derives from one Session_Result and its catalog entry; it carries every value the card face shows and the Honesty_Marks.
- **Card_SVG**: The SVG text of a card face, produced from a Card_Model by a pure function of the QSL_Core (Requirement 5).
- **Honesty_Marks**: The Simulated_Notice, the Demo_Mark and the Auto_Point_Mark (Requirement 3).
- **Simulated_Notice**: The text on every card face stating that the card confirms a simulated session, not a real reception.
- **Demo_Mark**: The prominent mark on a card from a Session_Result with `mode: 'demo'`.
- **Auto_Point_Mark**: The mark on a card from a Session_Result with `autoPointUsed: true`, distinguishable from the Demo_Mark.
- **Card_Kind**: The combination of the Demo_Mark and the Auto_Point_Mark of a card. Real-time manual, demo manual and demo auto-point are the kinds S4 produces.
- **No_Frequency_Note**: The text shown in place of a frequency when `beacon.displayFrequency` is null, in the wording family of S4's `SESSION_COPY.noFrequency`.
- **Best_Pointing_Error**: The `bestPointingErrorDeg` field of a Session_Result.
- **Collection_Order**: The pure ordering of Card_Sources, newest AOS first, with a tie-break the design states.
- **Pass_Group**: The QSL_Cards whose Card_Sources share `noradId` and `aosMs`.
- **Group_Ordinal**: The 1-based position of a QSL_Card within its Pass_Group, assigned in the Collection_Order (Requirement 7, criterion 7).
- **Card_Address**: The triple of `noradId`, `aosMs` and Group_Ordinal that identifies one QSL_Card on the Card_Detail_Page.
- **Pass_Number**: The card number shown as "Pass No.", derived deterministically from `noradId` and `aosMs`; it identifies the pass, so every QSL_Card of one Pass_Group carries the same Pass_Number (Requirement 8).
- **Status_Label**: A short label for the catalog entry's `status` value, written in the QSL_Copy as a mapping of the `EntryStatus` values; the only status text the Card_Detail_Page may show.
- **Catalog_Prose**: The catalog entry fields `statusNote`, `hook` and `story`, and the raw `status` value.
- **Collection_Page**: The page that lists every QSL_Card. Proposed route `/cards`; the design fixes it.
- **Card_Detail_Page**: The page that shows one QSL_Card large, with all fields and the download actions. Addressed by the Card_Address; the design fixes the route.
- **QSL_Copy**: The copy module that holds every string of the S5 pages and of the Card_SVG as plain string literals.
- **Honesty_Scan**: Checks 1.24 and 1.25 of `tests/scaffold/scaffold.test.ts`.
- **Source_Boundary_Scan**: The test helper that parses every QSL_Source_Module with the TypeScript compiler API and reports import and export specifiers outside the allowed set, in the style of the S1 to S4 scans.
- **Reference_Document**: `docs/reference/TECHNICAL_ROUTE.md`, the trimmed technical route of the author's earlier personal project SatAware AR.
- **Card_Visual_Check**: The review of the card layout on a real phone screen.
## Requirements
### Requirement 1: Pure QSL core and source boundary
**User Story:** As a maintainer, I want all card logic in one framework-free directory with a guarded import boundary, so that it is testable in Node and cannot drift into the UI.
#### Acceptance Criteria
1. THE QSL_Core SHALL place the Card_Model function, the Honesty_Mark derivation, the card eligibility filter, the Card_SVG builder, the Collection_Order, the Group_Ordinal assignment and look-up, and the Pass_Number function in QSL_Source_Modules under `src/lib/qsl`, with one `index.ts` barrel as the only entry file, following the module conventions of S1 to S4.
2. THE QSL_Core SHALL use as import and export specifiers in every QSL_Source_Module only relative paths that resolve to a module inside `src/lib/qsl`, plus the `index.ts` barrels of `src/lib/session` and `src/lib/catalog`, so that no QSL_Source_Module imports React, Next.js, component-layer code or any package.
3. THE QSL_Core SHALL keep every QSL_Source_Module free of references to the DOM globals `window`, `document`, `navigator`, `localStorage`, `Blob`, `URL`, `Image` and `HTMLCanvasElement`, and SHALL perform no storage access, network access or file output and SHALL NOT read the system clock.
4. THE Source_Boundary_Scan SHALL report every import or export specifier of a QSL_Source_Module that violates criterion 2; the acceptance test SHALL verify that the scan reports no violation.
### Requirement 2: Card model
**User Story:** As a satellite listener, I want my card to show exactly what my session recorded about the satellite and the pass, so that the card is a faithful record and never shows a number the app did not have.
#### Acceptance Criteria
1. THE QSL_Core SHALL provide a pure function that maps one Session_Result and one catalog entry to a Card_Model, and every value of the Card_Model SHALL come from those two inputs only.
2. THE Card_Model SHALL carry the satellite `name` and `noradId` of the catalog entry.
3. WHEN `beacon.displayFrequency` is a string, THE Card_Model SHALL carry it verbatim; WHEN it is null, THE Card_Model SHALL carry the No_Frequency_Note, and THE QSL_Core SHALL NOT derive, round or invent a frequency.
4. THE Card_Model SHALL carry AOS and LOS as the texts `formatUtc(aosMs)` and `formatUtc(losMs)`.
5. THE Card_Model SHALL carry `maxElevationDeg`, `lockedSeconds`, `lockedRatio` and `bestPointingErrorDeg` of the Session_Result.
6. THE design SHALL state the display rules for `maxElevationDeg` (degree precision), `lockedSeconds` (seconds or minutes and seconds), `lockedRatio` (percent precision) and `bestPointingErrorDeg` (degree precision), and the acceptance tests SHALL pin them.
7. WHEN `bestPointingErrorDeg` is null, THE card face SHALL show the null presentation that the design states (for example an em dash), and the acceptance tests SHALL pin it.
8. THE Card_Model SHALL carry the Honesty_Marks of Requirement 3 and the Pass_Number of Requirement 8.
9. THE Card_Model and the Card_SVG SHALL NOT contain Catalog_Prose; the card face shows only the fields of this requirement, the Pass_Number and the Honesty_Marks.
10. THE acceptance test SHALL assert the Card_Model of one complete hand-computed Session_Result fixture field by field.
### Requirement 3: Honesty marks
**User Story:** As a satellite listener, I want the card to say on its face that it confirms a simulated session, and whether it came from demo mode or auto-point, so that nobody, including me, mistakes it for a confirmation of a real reception.
#### Acceptance Criteria
1. THE Card_Model and the Card_SVG of every QSL_Card SHALL carry the Simulated_Notice.
2. THE QSL_Copy SHALL hold the wording of the Simulated_Notice, and the wording SHALL pass the Honesty_Scan.
3. THE Card_Model SHALL carry the Demo_Mark exactly when the Session_Result has `mode: 'demo'`.
4. THE Card_Model SHALL carry the Auto_Point_Mark exactly when the Session_Result has `autoPointUsed: true`.
5. THE QSL_Core SHALL derive the Demo_Mark and the Auto_Point_Mark as fields of the Card_Model (booleans or mark kinds) from `mode` and `autoPointUsed`; THE pages SHALL NOT re-derive them.
6. THE Card_SVG SHALL render the Demo_Mark prominently and the Auto_Point_Mark distinguishably from it, so that the Card_Kinds real-time manual, demo manual and demo auto-point can be told apart at a glance in the Collection_Page.
### Requirement 4: Which results become cards
**User Story:** As a satellite listener, I want a card only for a session I saw through to LOS, so that the collection holds finished passes only.
#### Acceptance Criteria
1. THE QSL_Core SHALL make a QSL_Card only from a Session_Result with `completed: true`; a Session_Result with `completed: false` SHALL produce no QSL_Card.
2. WHEN `getCatalogEntry` returns `undefined` for the `noradId` of a Session_Result, THE QSL_Core SHALL skip that Session_Result without throwing.
3. THE design SHALL state whether and how the pages present Session_Results with `completed: false`; presenting none of them is acceptable.
4. THE QSL_Components SHALL obtain Session_Results only through `readSessionResults` or `parseSessionResults`, so that records that fail `isSessionResult` never reach the QSL_Core.
### Requirement 5: Card face as SVG
**User Story:** As a satellite listener, I want a crisp card face I can view at any size and keep as a file, so that the card looks like a card on my phone and in my collection folder.
#### Acceptance Criteria
1. THE QSL_Core SHALL provide a pure function that maps a Card_Model to Card_SVG text, deterministic for equal inputs. (Proposal; the design confirms it or replaces it with an alternative and states why the alternative is at least as testable as text assertions over an SVG string.)
2. THE Card_SVG of a plain card (`mode: 'real'`, `autoPointUsed: false`) SHALL contain the satellite name, the NORAD ID, both UTC instants, the displayed statistics of Requirement 2, criteria 5 to 7, the frequency text or the No_Frequency_Note, and the Simulated_Notice.
3. THE Card_SVG SHALL contain the Demo_Mark text exactly when the Card_Model carries the Demo_Mark, and the Auto_Point_Mark text exactly when the Card_Model carries the Auto_Point_Mark.
4. THE Card_SVG builder SHALL XML-escape every text it interpolates, including catalog text, so that catalog text is rendered as text and never as markup.
5. THE Card_SVG SHALL take every string it shows from the Card_Model or from the QSL_Copy.
### Requirement 6: Card downloads
**User Story:** As a satellite listener, I want to save my card as an image, so that I can keep or share it outside the app.
#### Acceptance Criteria
1. THE Card_Detail_Page SHALL offer a `.svg` download whose file content is the Card_SVG text.
2. THE Card_Detail_Page SHALL offer a `.png` download produced by rasterizing the Card_SVG through a canvas, without a new package.
3. THE QSL_Controllers SHALL perform the downloads and the rasterization with every browser object (object URLs, the download anchor, the image loader, the canvas) injected as a dependency; the design states the interfaces, the PNG size and the file names.
4. THE acceptance tests SHALL test the download actions and the rasterizer against mocks only and SHALL NOT produce a real image or file.
### Requirement 7: Collection and detail pages
**User Story:** As a satellite listener, I want one page with all my cards, newest first, and a detail view for each, so that I can browse my collection and open any card.
#### Acceptance Criteria
1. THE Collection_Page SHALL list one QSL_Card for every Card_Source of the stored Session_Results.
2. THE QSL_Core SHALL provide the Collection_Order as a pure function that orders Card_Sources newest `aosMs` first; the design SHALL state the tie-break for equal `aosMs`, and the acceptance tests SHALL pin it.
3. WHEN no Card_Source exists, THE Collection_Page SHALL show an empty state whose text comes from the QSL_Copy.
4. WHEN the user selects a QSL_Card on the Collection_Page, THE app SHALL open its Card_Detail_Page, which shows the card large, all Card_Model fields and the download actions of Requirement 6. THE Card_Detail_Page MAY additionally show the Status_Label of the entry, and SHALL NOT show Catalog_Prose.
5. THE design SHALL fix the routes of the Collection_Page and the Card_Detail_Page.
6. THE Card_Address SHALL consist of `noradId`, `aosMs` and the Group_Ordinal, and SHALL identify exactly one QSL_Card even when several Card_Sources share `noradId` and `aosMs` (Known limitation 2); THE app SHALL NOT overwrite, merge or drop any QSL_Card of a Pass_Group.
7. THE QSL_Core SHALL assign Group_Ordinals deterministically and in the Collection_Order: within each Pass_Group, the card listed first on the Collection_Page has Group_Ordinal 1, the next 2, and so on. THE Card_Detail_Page SHALL resolve a Card_Address by the same rule over the same Collection_Order, through one pure function of the QSL_Core.
8. WHEN a Card_Address does not identify a QSL_Card, THE Card_Detail_Page SHALL show a message from the QSL_Copy and a link back to the Collection_Page.
9. THE pages SHALL stay thin in the pattern of the `/pointing` and `/session` pages: they compose QSL_Controllers, render and forward events, and the stored-result read SHALL run inside a QSL_Controller with injected `KeyValueStorage`.
10. IF the design adds a "view your card" link to the completion screen of the S4 Session_Page, THEN the only change to `src/app/session/[noradId]/page.tsx` SHALL be that link element, with no logic, no state and no copy change beyond its label; otherwise the design SHALL defer the link to S6 and say so.
### Requirement 8: Pass number
**User Story:** As a collector, I want each card to carry a stable "Pass No." that names the pass it records, so that a card looks the same on every render and every device, and cards of the same pass are recognisably the same pass.
#### Acceptance Criteria
1. THE QSL_Core SHALL derive the Pass_Number by a pure function from `noradId` and `aosMs` only, with no randomness, no stored counter and no server; THE design SHALL state its format.
2. THE Pass_Number SHALL identify the pass: every QSL_Card of one Pass_Group SHALL carry the same Pass_Number, including a demo card and a real-time card of the same pass. This is the intended meaning, not a collision.
3. THE Pass_Number SHALL differ for distinct pairs of `noradId` and `aosMs`.
4. THE card face SHALL show the Pass_Number under the label "Pass No.".
5. THE acceptance tests SHALL pin the Pass_Number format, assert that equal inputs give equal Pass_Numbers, assert that the cards of one Pass_Group in the fixture set share one Pass_Number, and assert that the Pass_Numbers of the distinct passes in the fixture set are pairwise different.
6. THE Pass_Number SHALL NOT grow into an issuance registry: it is never stored, counted or reserved.
### Requirement 9: Copy honesty and scaffold checks
**User Story:** As a satellite listener, I want the card pages to be as plain about the simulation as the session pages, so that the card wording never claims a real reception.
#### Acceptance Criteria
1. THE QSL_Copy SHALL hold every string of the S5 pages and of the Card_SVG as plain string literals, following `SESSION_COPY`.
2. THE QSL_Copy and the S5 pages SHALL NOT claim or imply that the app receives, hears or decodes a real radio-frequency signal, and SHALL NOT present a QSL_Card as a confirmation of a real reception.
3. THE Honesty_Scan SHALL cover the property strings of the QSL_Copy module and the JSX text of the S5 page files, in the same way S4 added `src/components/session/copy.ts` and its pages.
4. THE route check 1.19 of `tests/scaffold/scaffold.test.ts` SHALL be updated to admit exactly the route directories and page files of this spec in addition to the existing ones.
### Requirement 10: Test environment and review
**User Story:** As a maintainer, I want the card layer pinned by small Node tests and one look at a phone, so that a regression is caught by `pnpm test` and the layout is judged by eye.
#### Acceptance Criteria
1. THE tests of this spec SHALL run in the Vitest `node` environment as `tests/**/*.test.ts` files, without jsdom, happy-dom or a React testing library, offline under the existing network guard.
2. THE acceptance tests SHALL be plain example assertions over the QSL_Core and mock-based tests of the QSL_Controllers, minimal and sufficient, with no multi-layer verification machinery.
3. THE Card_Visual_Check (the Collection_Page and one Card_Detail_Page of each Card_Kind on a phone) SHALL be a review item of the final task, not an automated test.
## Decisions recorded during requirements refinement
- Only completed Session_Results become QSL_Cards (Requirement 4, criterion 1). This is the decided default of the brief.
- RQ-1 (card number): the optional serial of the brief is adopted as the Pass_Number ("Pass No."), derived deterministically from `noradId` and `aosMs`. Cards of the same pass share it on purpose; uniqueness is required only between distinct passes, and both properties are asserted (Requirement 8). Adding `mode` to the derivation was rejected.
- RQ-2 (catalog prose): the card face and the Card_Detail_Page show no `status`, `statusNote`, `hook` or `story` text from the catalog. The card face shows only the Requirement 2 fields, the Pass_Number and the Honesty_Marks. The Card_Detail_Page may add one short Status_Label written in the QSL_Copy as a mapping of the `EntryStatus` values; `statusNote` is never passed through (Requirement 2, criterion 9; Requirement 7, criterion 4).
- RQ-3 (detail addressing): a QSL_Card is addressed by `noradId`, `aosMs` and its Group_Ordinal within the Pass_Group. Group_Ordinals are assigned deterministically in the Collection_Order, and the Card_Detail_Page resolves an address by the same rule (Requirement 7, criteria 6 and 7). The resulting shift of Group_Ordinals is recorded as Known limitation 3.