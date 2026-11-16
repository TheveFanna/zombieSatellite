# Models register

Research date: see "Research date" at the end. Task: field-companion 13.1 (Requirement 15).

Adoption rule: an Original_Model is committed only when redistribution is allowed, the file is `.obj`, and it is at most 150 KB. A licence that is unclear counts as not redistributable. No model is hotlinked.

## Decision per entry

| Entry | Decision | Source URL | Author | Licence | Format | Size | Redistribution | Notes |
|---|---|---|---|---|---|---|---|---|
| LES-1 (`les-1`) | Illustrative | none found | n/a | n/a | n/a | n/a | n/a | No model found in NASA 3D Resources, Smithsonian 3D, or the museum archives searched. |
| Transit 5B-5 (`transit-5b-5`) | Illustrative | none found | n/a | n/a | n/a | n/a | n/a | The Smithsonian "Time and Navigation" page shows a Transit satellite as a photo asset, not a downloadable 3D model. |
| AMSAT-OSCAR 7 (`ao-7`) | Illustrative | none found | n/a | n/a | n/a | n/a | n/a | No model found. |
| Prospero (`prospero`) | Illustrative | none found | n/a | n/a | n/a | n/a | n/a | The Science Museum Group Sketchfab open-access collection was searched; no Prospero or X-3 model was found. |
| IMAGE (`image`) | Illustrative | none found | n/a | n/a | n/a | n/a | n/a | NASA 3D Resources has no IMAGE model. |
| Galaxy 15 (`galaxy-15`) | Illustrative | none found | n/a | n/a | n/a | n/a | n/a | Only generic or paid "satellite" models on community sites; none identified as Galaxy 15 with a CC0 or CC BY licence. |
| LES-5 (`les-5`) | Illustrative | none found | n/a | n/a | n/a | n/a | n/a | No model found. |

No file is committed under `public/models/`. All seven entries get an Illustrative_Model.

## Model_Records (candidates examined)

Date checked for every row: see "Research date".

| Candidate | Source URL | Author | Licence | Format | Size | Redistribution allowed | Why not adopted |
|---|---|---|---|---|---|---|---|
| NASA 3D Resources, whole catalogue (mirror tree listed via the GitHub API) | https://nasa3d.arc.nasa.gov/models , https://github.com/nasa/NASA-3D-Resources | NASA | NASA media usage guidelines (https://www.nasa.gov/multimedia/guidelines/index.html) | `.glb`, `.stl` | n/a | yes | Contains none of the seven satellites (closest: Explorer 1 print files, TDRS, FUSE, HETE). Also `.glb`/`.stl`, not `.obj`. |
| Smithsonian Open Access 3D | https://3d.si.edu/ | Smithsonian | CC0 where marked | `.glb` | n/a | n/a | No model of any of the seven found by search. |
| Science Museum Group open-access 3D (Sketchfab) | https://sketchfab.com/sciencemuseum/collections/open-access-models | Science Museum Group | per-model | `.glb` via Sketchfab | n/a | not established | No Prospero/X-3 model found. |
| Community "satellite" models (Sketchfab, search results for Galaxy 15 and generic satellites) | https://sketchfab.com/3d-models/satellite-802a6db40ffc41afafbe7db4e96c9c0d (example) | various | not verified as CC0 or CC BY; several are paid | `.glb`/`.fbx` | n/a | no (unclear) | Generic satellites, not the catalogue entries; licences not verified. Treated as not redistributable. |
| ESA, JAXA archives | not searched beyond general web search | n/a | n/a | n/a | n/a | n/a | None of the seven is an ESA or JAXA satellite; the web search surfaced no model. |

## Dimension sources per Illustrative_Model

Only figures read from a page during this research are given as values. Entries marked "to confirm" have the listed pages as the source to take dimensions from; the values were not read and must be confirmed before use in `model-defs.ts`.

| Entry | Documented sources | Dimensions |
|---|---|---|
| LES-1 | https://en.wikipedia.org/wiki/Lincoln_Experimental_Satellite ; https://spacedaily.com/t-les-1-satellite-radio-return-rooftop-antenna/ | to confirm |
| Transit 5B-5 | https://timeandnavigation.si.edu/multimedia-asset/transit-satellite (photo) ; https://en.wikipedia.org/wiki/Transit_(satellite) | to confirm |
| AO-7 | https://www.amsat.org/two-way-satellites/ao-7/ ; https://amsat-dl.org/en/amsat-oscar-7/ ; https://amsat.org/wordpress/wp-content/uploads/2024/10/AO-7-History-Lesson-Complete_241015.pdf | to confirm |
| Prospero | https://space.skyrocket.de/doc_sdat/prospero.htm ; https://amsat-uk.org/2011/11/15/prospero-x-3-satellite-blog/ | Pumpkin-like polyhedron, equatorial diameter 1.2 m, height 0.7 m, four antennas, mass 66 kg (read from the skyrocket page) |
| IMAGE | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2000-017A ; https://image.gsfc.nasa.gov/ | to confirm |
| Galaxy 15 | https://space.skyrocket.de/doc_sdat/galaxy-15.htm | to confirm |
| LES-5 | https://en.wikipedia.org/wiki/Lincoln_Experimental_Satellite | to confirm |

## Coastline_Data

| Field | Value |
|---|---|
| Dataset | Natural Earth 110m coastline |
| Source | https://github.com/nvkelso/natural-earth-vector |
| Terms | https://www.naturalearthdata.com/about/terms-of-use/ |
| Licence | Public domain |
| Author | Natural Earth contributors |
| Redistribution | yes |

## Research date

Researched during the Kiroween 2026 build for task 13.1. Research date: 2026-11-16.

## Items for owner review

1. All seven entries are Illustrative; no `.obj` was adopted.
2. Dimensions for six entries are unconfirmed (fetches of several skyrocket pages returned 404 or empty).
3. Reconciliation (task 13.3, 2026-11-16): the Wikipedia LES page was fetched and gives no dimensions for LES-1 or LES-5; the skyrocket Galaxy 15, NSSDC IMAGE, Wikipedia Transit and AMSAT AO-7 fetches returned nothing usable; the IMAGE mission page gave no dimensions. Six entries (LES-1, Transit 5B-5, AO-7, IMAGE, Galaxy 15, LES-5) remain unconfirmed: their shapes are schematic and the attribution text says 'schematic, dimensions not confirmed'. Prospero's shape uses the confirmed 1.2 m diameter, 0.7 m height and 4 antennas.

## Shape sources (round 3, 2026-11-16)

The Illustrative_Models of `src/lib/field/model-defs.ts` are vector sketches drawn from the descriptions below. Where no description gave a shape, the model is a sphere.

| Entry | Source read | What it gave | Model |
|---|---|---|---|
| AO-7 (`ao-7`) | https://en.wikipedia.org/wiki/AMSAT-OSCAR_7 | Octagonal prism, 360 mm high, 424 mm across; four radio masts at 90° on the base; turnstile antenna | Octagonal prism with four base masts and a crossed antenna |
| Prospero (`prospero`) | https://space.skyrocket.de/doc_sdat/prospero.htm ; https://en.wikipedia.org/wiki/Prospero_X-3 | 1.2 m across, 0.7 m high, four antennas | Ten-sided body with four antennas |
| LES-1 (`les-1`) | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-008C ; https://space.skyrocket.de/doc_sdat/les-1.htm | 26-sided polyhedron, 61 cm diameter; eight-horn antenna | Twelve-sided prism, 0.61 m across, four horns on top (the horns are a simplification of the eight) |
| LES-5 (`les-5`) | https://space.skyrocket.de/doc_sdat/les-5.htm | Cylinder with a platform near the centre; antenna elements around the surface | Sixteen-sided cylinder with a platform and six antenna elements |
| IMAGE (`image`) | https://en.wikipedia.org/wiki/Imager_for_Magnetopause-to-Aurora_Global_Exploration | Spin-stabilised; 225 × 152 cm in the infobox; long radio antenna (502 m, not to scale) | Octagonal drum with crossed booms (not to scale) and one panel |
| Galaxy 15 (`galaxy-15`) | https://en.wikipedia.org/wiki/Galaxy_15 | GEOStar-2 bus, 2033 kg at launch; reflector antenna; solar wings | Octagonal bus with two solar wings and a reflector dish |
| Transit 5B-5 (`transit-5b-5`) | https://en.wikipedia.org/wiki/Transit_(satellite) | Spin-stabilised; no shape in the sources read | Sphere (fallback) |