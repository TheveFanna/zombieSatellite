# Requirements Document

## Introduction

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). Users pick a real "zombie satellite" from a fixed catalog, the app predicts its passes over the user's location from public TLE data (SGP4), points the phone at the satellite in AR during a pass, plays a simulated beacon whose pitch follows the Doppler shift, and issues a digital QSL card after the pass. The primary audience is amateur radio and satellite listeners (SWL and SDR hobbyists). For them the app is an aid for finding, pointing at and computing Doppler for the real satellites; a 60x demo mode is the entry point for newcomers. The app is pure software: only the public orbital data is real, and the app receives no real radio-frequency signals.

This spec, zombie-catalog (S2), delivers the satellite catalog data layer only: the static data of the 7 catalog satellites and three pure access functions over that data. It delivers no UI. The orbit-engine spec (S1, `src/lib/orbit`) has landed; the Zombie_Catalog joins to it through the NORAD catalog number only.

### Join key and module conventions

- The Orbit_Engine keys satellites by NORAD catalog number as a TypeScript `number` holding an integer from 1 to 99,999 (`TleRecord.NORAD_CAT_ID`, `TleFetcher.fetchTle(noradId: number)`). The Zombie_Catalog uses the same key space and the same type.
- The Zombie_Catalog follows the module conventions of the Orbit_Engine: one directory under `src/lib`, one `index.ts` barrel as the only entry file, internal helpers kept out of the barrel. The design fixes the directory name and field names.
- The Zombie_Catalog is a standalone data layer. The Zombie_Catalog shares the NORAD key space with the Orbit_Engine and imports nothing from the Orbit_Engine or from UI code.

### Fact source

The Fact_Source, `docs/reference/POSITIONING_AND_STORY.md`, is the only fact source for catalog data and copy. The mandatory fact corrections of Requirement 5 restate corrections that the Fact_Source already records in its list of unconfirmed and disputed items; they override every other source, including model knowledge. The facts and values in this document were checked when the spec was written and are not re-verified during the requirements phase; the acceptance tests of the implementation phase verify them.

### Entry overview

| NORAD ID | Entry | Playable | Difficulty | Unplayable reason | Status |
|---|---|---|---|---|---|
| 1002 | LES-1 | yes | hard | – | still transmitting |
| 965 | Transit 5B-5 | yes | standard | – | still transmitting (identity disputed) |
| 7530 | AMSAT-OSCAR 7 (AO-7) | yes | standard | – | semi-operational |
| 5580 | Prospero | yes | standard | – | unconfirmed |
| 26113 | IMAGE | yes | hard | – | silent again |
| 28884 | Galaxy 15 | no | – | geostationary slot not visible from China | historical |
| 2866 | LES-5 | no | – | drifts in a near-geostationary graveyard orbit, no regular passes | still transmitting |

### Verification scope

The automated acceptance tests of this spec cover exactly the criteria that name a test in the requirements below: the catalog membership and playability checks (Requirement 1), the source URL check (Requirement 4, criterion 3), the mandatory correction checks (Requirement 5, criteria 1 to 9, where criterion 1 is tested on the launch year 1964 only), the beacon spot checks (Requirement 6), the access interface checks (Requirement 7, criteria 1, 2 and 3) and the source-boundary scan (Requirement 8). The remaining criteria are checked by review of the catalog data and code when the implementation task is completed. The review-checked criteria are: entry structure (Requirement 2), beacon field rules (Requirement 3), fact traceability, copy language and orbit labels (Requirement 4, criteria 1, 2, 4, 5, 6 and 7), the full Transit 5B-5 launch date `1964-12-13` beyond its year (Requirement 5, criterion 1), the LES-1 Downlink_Frequency value and the exclusion of the value 236.997 (Requirement 5, criteria 10 and 11), the unknown-NORAD_ID lookup result, deep freezing and the no-I/O rule (Requirement 7, criteria 4, 5 and 6), and the red line (Requirement 9). The red line has no automated phrase check.

The Difficulty `hard` of LES-1 (1002) is a given product decision. The catalog data and copy carry no numeric orbit justification for it, because the Fact_Source documents no LES-1 orbit figures.

### Implementation-phase workflow notes

- After each task is complete and its tests pass, commit locally and push immediately. Stage files by name. Do not push in the middle of a task.
- Keep tests minimal and sufficient; plain example assertions over the static data, without multi-layer verification machinery.
- All times are UTC.

### Out of scope

- Any UI, including catalog screens, story pages and QSL card rendering.
- Beacon audio synthesis (S4), pass prediction, AR pointing and TLE fetching. The Zombie_Catalog provides beacon data for S4 but produces no audio.
- Satellite search, a user satellite library, a custom backend API, runtime fetching of catalog data, and persistent storage.
- Catalog entries beyond the 7 satellites of the Entry overview.

## Glossary

- **Zombie_Catalog**: The data layer delivered by this spec: the static in-repository data of the 7 Catalog_Entries and the Access_Interface over that data.
- **Orbit_Engine**: The library delivered by the orbit-engine spec (S1) under `src/lib/orbit`.
- **Catalog_Entry**: The record of one catalog satellite in the Zombie_Catalog.
- **NORAD_ID**: The NORAD catalog number of a satellite, a TypeScript `number` holding an integer from 1 to 99,999, the same key and type that the Orbit_Engine uses. The NORAD_ID is the join key between the Zombie_Catalog and the Orbit_Engine.
- **Slug**: A stable lowercase identifier of a Catalog_Entry made of the letters a to z, the digits 0 to 9 and single hyphens, for example `les-1`.
- **Playable_Entry**: A Catalog_Entry whose playable flag is true; the later specs offer pass gameplay for it.
- **Story_Only_Entry**: A Catalog_Entry whose playable flag is false; the later specs show its story but offer no pass gameplay.
- **Unplayable_Reason**: A machine-readable code on a Story_Only_Entry that states why the entry is not playable. The design fixes the code values; one code stands for "geostationary slot not visible from China" and one for "near-geostationary graveyard orbit drift without regular passes".
- **Difficulty**: A value on a Playable_Entry, either `standard` or `hard`.
- **Entry_Status**: The current status of a catalog satellite, one of: still transmitting, semi-operational, silent again, unconfirmed, historical. The design fixes the code values.
- **Beacon_Block**: The part of a Catalog_Entry that holds the beacon data for the later audio spec (S4): Downlink_Frequency, Display_Frequency, Beacon_Mode, Tumble_Period and Sunlit_Only flag.
- **Downlink_Frequency**: The beacon downlink frequency in MHz as a `number`, or `null` where the Fact_Source documents no frequency.
- **Display_Frequency**: The human-readable frequency text shown to users, for example "about 237 MHz", or `null` where the Downlink_Frequency is `null`.
- **Beacon_Mode**: The signal type of the beacon, for example CW beacon or telemetry carrier, or `null` where the Fact_Source documents none. The design fixes the code values.
- **Tumble_Period**: The tumble period of the satellite in seconds as a `number`, or `null` where the Fact_Source documents none.
- **Sunlit_Only**: A flag that is `true` where the Fact_Source documents that the satellite transmits only in sunlight, and `null` where the Fact_Source documents nothing about it.
- **Hook**: The one-line teaser copy of a Catalog_Entry.
- **Story**: The short story paragraph of a Catalog_Entry.
- **Status_Note**: The short copy that explains the Entry_Status of a Catalog_Entry.
- **Orbit_Label**: The short human-readable description of the orbit of a Catalog_Entry taken from the Fact_Source, or `null` where the Fact_Source does not describe the orbit of that satellite.
- **Entry_Text**: The union of all copy fields of a Catalog_Entry: display name, operator and origin, Status_Note, Display_Frequency, Hook, Story and Orbit_Label. Copy fields that are `null` contribute no text.
- **Fact_Source**: The document `docs/reference/POSITIONING_AND_STORY.md` in this repository.
- **Source_URL**: A URL that a Catalog_Entry lists as a source and that appears verbatim in the Fact_Source.
- **Access_Interface**: The three pure functions that the Zombie_Catalog exports: list all entries, look up one entry by NORAD_ID, and list Playable_Entries.
- **Catalog_Source_Module**: A module under the Zombie_Catalog directory that implements the Catalog_Entries or the Access_Interface. Test files and test helpers are not Catalog_Source_Modules.
- **Source_Boundary_Scan**: The test that parses every Catalog_Source_Module and checks its import and export specifiers, in the style of the Orbit_Engine scan in `tests/helpers/source-scan.ts` and `tests/orbit/source-boundary.test.ts`.

## Requirements

### Requirement 1: Catalog membership and playability

**User Story:** As a satellite listener, I want a fixed catalog of the real zombie satellites, so that I know exactly which satellites the app helps me hunt and which ones are told only as stories.

#### Acceptance Criteria

1. THE Zombie_Catalog SHALL contain exactly 7 Catalog_Entries, whose NORAD_IDs are exactly 1002, 965, 7530, 5580, 26113, 28884 and 2866.
2. THE Zombie_Catalog SHALL set the playable flag to `true` on exactly 5 Catalog_Entries, namely those with NORAD_IDs 1002, 965, 7530, 5580 and 26113.
3. THE Zombie_Catalog SHALL set the playable flag to `false` on the Catalog_Entries with NORAD_IDs 28884 (Galaxy 15) and 2866 (LES-5).
4. THE Zombie_Catalog SHALL set the Unplayable_Reason of Galaxy 15 (28884) to the code for a geostationary slot not visible from China, and the Unplayable_Reason of LES-5 (2866) to the code for near-geostationary graveyard orbit drift without regular passes.
5. THE Zombie_Catalog SHALL set the Difficulty of IMAGE (26113) and LES-1 (1002) to `hard`, and the Difficulty of Transit 5B-5 (965), AMSAT-OSCAR 7 (7530) and Prospero (5580) to `standard`.

### Requirement 2: Structured entry fields

**User Story:** As a developer of the later UI, audio and QSL specs, I want each Catalog_Entry to carry its facts as structured fields, so that later specs read values directly instead of parsing prose.

#### Acceptance Criteria

1. THE Zombie_Catalog SHALL give every Catalog_Entry a Slug, a display name, a NORAD_ID, an operator and origin text, an Entry_Status, a Status_Note, a playable flag, a Beacon_Block, a Hook, a Story, an Orbit_Label field and a list of Source_URLs, where the value of the Orbit_Label field is either an Orbit_Label text or `null` as set by Requirement 4.
2. WHERE the Fact_Source states a launch date for a catalog satellite, THE Zombie_Catalog SHALL record that launch date on the Catalog_Entry as an ISO 8601 calendar date (`YYYY-MM-DD`).
3. IF the Fact_Source states no launch date for a catalog satellite, THEN THE Zombie_Catalog SHALL leave the launch date of the Catalog_Entry unset.
4. THE Zombie_Catalog SHALL give each Playable_Entry a Difficulty and no Unplayable_Reason.
5. THE Zombie_Catalog SHALL give each Story_Only_Entry an Unplayable_Reason and no Difficulty.
6. THE Zombie_Catalog SHALL give every Catalog_Entry a Slug that differs from the Slug of every other Catalog_Entry.

### Requirement 3: Beacon data for the audio spec

**User Story:** As the developer of the beacon audio spec (S4), I want each entry's documented beacon characteristics as data, so that the synthesized beacon follows the real satellite's frequency and behaviour.

#### Acceptance Criteria

1. WHERE the Fact_Source documents a downlink frequency for a catalog satellite, THE Zombie_Catalog SHALL record that frequency in MHz as the Downlink_Frequency of the Beacon_Block.
2. IF the Fact_Source documents no downlink frequency for a catalog satellite, THEN THE Zombie_Catalog SHALL set the Downlink_Frequency and the Display_Frequency of the Beacon_Block to `null`.
3. WHERE the Fact_Source documents a tumble period for a catalog satellite, THE Zombie_Catalog SHALL record that period in seconds as the Tumble_Period; IF the Fact_Source documents no tumble period for a catalog satellite, THEN THE Zombie_Catalog SHALL set the Tumble_Period to `null`.
4. WHERE the Fact_Source documents that a catalog satellite transmits only in sunlight, THE Zombie_Catalog SHALL set Sunlit_Only to `true`; IF the Fact_Source does not document that a catalog satellite transmits only in sunlight, THEN THE Zombie_Catalog SHALL set Sunlit_Only to `null`.
5. WHERE the Fact_Source documents the signal type of a catalog satellite, THE Zombie_Catalog SHALL record as the Beacon_Mode the code that the design fixes for that signal type; IF the Fact_Source documents no signal type for a catalog satellite, THEN THE Zombie_Catalog SHALL set the Beacon_Mode to `null`.
6. THE Zombie_Catalog SHALL set the Beacon_Mode of LES-1 (1002), Prospero (5580) and Galaxy 15 (28884) to `null`, because the Fact_Source documents no signal type for these satellites.

### Requirement 4: Fact traceability and copy

**User Story:** As a satellite listener, I want the catalog copy to be accurate and sourced, so that I can trust the stories and follow the sources myself.

#### Acceptance Criteria

1. THE Zombie_Catalog SHALL take every factual claim of every Catalog_Entry, including copy and structured values, from the Fact_Source section about that satellite or from the Entry overview of this document.
2. THE Zombie_Catalog SHALL write each Hook as exactly one sentence and each Story as exactly one paragraph without line breaks, in English, addressed to radio and satellite listeners and adapted from the Fact_Source.
3. THE Zombie_Catalog SHALL give every Catalog_Entry at least one Source_URL, and the acceptance test SHALL verify that every Source_URL of every Catalog_Entry occurs character-for-character as a substring of the Fact_Source.
4. WHERE the Fact_Source describes the orbit of a catalog satellite, THE Zombie_Catalog SHALL take the Orbit_Label of that Catalog_Entry from the Fact_Source section about that satellite; this applies to exactly IMAGE (26113), Galaxy 15 (28884) and LES-5 (2866).
5. IF the Fact_Source does not describe the orbit of a catalog satellite, THEN THE Zombie_Catalog SHALL set the Orbit_Label of that Catalog_Entry to `null`; this applies to exactly LES-1 (1002), Transit 5B-5 (965), AMSAT-OSCAR 7 (7530) and Prospero (5580).
6. THE Zombie_Catalog SHALL keep the LES-1 orbit figures 2,800 km and 145.7-minute period, which the Fact_Source does not contain, out of every field of every Catalog_Entry, including every Entry_Text, in any number formatting (for example 2800, 2,800 or 145.7).
7. THE Zombie_Catalog SHALL write every Entry_Text in English only.

### Requirement 5: Mandatory fact corrections

**User Story:** As a satellite listener, I want the known errors and disputes about these satellites handled correctly, so that the app repeats no retracted or unconfirmed claim as fact.

#### Acceptance Criteria

1. THE Zombie_Catalog SHALL record the launch date of Transit 5B-5 (965) as the ISO 8601 calendar date `1964-12-13`, as stated in the Fact_Source; the acceptance test SHALL verify only that the year component of this launch date is 1964.
2. THE Zombie_Catalog SHALL state in the Entry_Text of Transit 5B-5 (965) that the signal identity is disputed and that listener analysis attributes the signal to Transit 5E-5; the acceptance test SHALL verify that the Entry_Text of Transit 5B-5 contains the substrings "disputed" and "5E-5".
3. THE Zombie_Catalog SHALL describe no catalog satellite as nuclear-powered; the acceptance test SHALL verify that no Entry_Text of any Catalog_Entry contains "nuclear" (case-insensitive).
4. THE Zombie_Catalog SHALL give IMAGE (26113) the Entry_Status silent again.
5. THE Zombie_Catalog SHALL keep every claim of current transmission out of the Entry_Text of IMAGE (26113); the acceptance test SHALL verify that the Entry_Text of IMAGE contains none of "still transmitting", "is transmitting" and "currently transmitting" (case-insensitive).
6. THE Zombie_Catalog SHALL give Prospero (5580) the Entry_Status unconfirmed.
7. THE Zombie_Catalog SHALL write the Story of Prospero (5580) as a hedged legend that states the official shutdown in 1996 and states that later reception reports are unconfirmed; the acceptance test SHALL verify that the Story of Prospero contains the substrings "1996" and "unconfirmed".
8. THE Zombie_Catalog SHALL set the Display_Frequency of LES-1 (1002) to "about 237 MHz".
9. THE Zombie_Catalog SHALL set the Tumble_Period of LES-1 (1002) to the number 4 (seconds).
10. THE Zombie_Catalog SHALL set the Downlink_Frequency of LES-1 (1002) to the number 237 (MHz).
11. THE Zombie_Catalog SHALL keep the value 236.997 out of every field of every Catalog_Entry, numeric or text, including every Entry_Text.

### Requirement 6: Beacon spot checks

**User Story:** As the developer of the beacon audio spec (S4), I want the documented frequencies of key satellites pinned by tests, so that a data edit cannot silently shift a beacon.

#### Acceptance Criteria

1. THE Zombie_Catalog SHALL set the Beacon_Block of AMSAT-OSCAR 7 (7530) to the Downlink_Frequency 145.9775 (MHz), the Beacon_Mode code for CW beacon and Sunlit_Only `true`.
2. THE Zombie_Catalog SHALL set the Downlink_Frequency of Transit 5B-5 (965) to 136.65 MHz.
3. THE Zombie_Catalog SHALL set the Downlink_Frequency of LES-5 (2866) to 236.7487 MHz.
4. THE Zombie_Catalog SHALL set the Downlink_Frequency and the Display_Frequency of IMAGE (26113) to `null`.

### Requirement 7: Access interface

**User Story:** As a developer of the later specs, I want pure functions over the static catalog, so that I can list entries and join them to the Orbit_Engine by NORAD_ID without any I/O.

#### Acceptance Criteria

1. WHEN the list-all function of the Access_Interface is called, THE Access_Interface SHALL return an array that contains exactly the 7 Catalog_Entries, one Catalog_Entry per NORAD_ID 1002, 965, 7530, 5580, 26113, 28884 and 2866.
2. WHEN the lookup function of the Access_Interface is called with the NORAD_ID of a Catalog_Entry, THE Access_Interface SHALL return the Catalog_Entry whose NORAD_ID equals that argument; the acceptance test SHALL verify this for all 7 NORAD_IDs.
3. WHEN the playable-list function of the Access_Interface is called, THE Access_Interface SHALL return an array that contains exactly the Playable_Entries with NORAD_IDs 1002, 965, 7530, 5580 and 26113, each once, and no Story_Only_Entry.
4. IF the lookup function of the Access_Interface is called with a NORAD_ID that belongs to no Catalog_Entry, THEN THE Access_Interface SHALL return `undefined` without throwing.
5. THE Zombie_Catalog SHALL deeply freeze every Catalog_Entry and every array that the Access_Interface returns, so that every Catalog_Entry, every object and array nested in it at any depth (including the Beacon_Block and the list of Source_URLs), and every returned array is frozen.
6. THE Access_Interface SHALL compute every result from the static data in the repository, without network access, storage access, file system access or any other I/O at runtime.

### Requirement 8: Source boundary

**User Story:** As a maintainer, I want the catalog to stay a standalone data layer, so that the catalog can change without touching the Orbit_Engine or the UI and the other layers can change without touching the catalog.

#### Acceptance Criteria

1. THE Zombie_Catalog SHALL use only relative paths (starting with `./` or `../`) that resolve to a module inside the Zombie_Catalog directory as the import and export specifiers in every Catalog_Source_Module, so that no Catalog_Source_Module imports the Orbit_Engine, UI code or a package.
2. THE Source_Boundary_Scan SHALL parse every Catalog_Source_Module with the TypeScript compiler API and report every import or export specifier that violates criterion 1; the acceptance test SHALL verify that the scan reports no violation.

### Requirement 9: Red line for copy

**User Story:** As a satellite listener, I want the catalog copy to be honest about what the app does, so that I am never misled into thinking that the app hears these satellites.

#### Acceptance Criteria

1. THE Zombie_Catalog SHALL write every Entry_Text so that it contains no statement that the app receives, hears, detects or decodes a real radio signal, and so that it attributes every mentioned reception of a real signal to the named listener or listener group, never to the app, without adding any equipment description that the Fact_Source does not state.
2. THE Zombie_Catalog SHALL describe the in-app beacon as synthesized from public orbital data in every Entry_Text that refers to the in-app beacon.
