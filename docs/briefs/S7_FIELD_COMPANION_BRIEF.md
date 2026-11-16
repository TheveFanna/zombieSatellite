# S7 brief: field-companion (feature supplement)

Status: brief for a new spec session. Written 2026-11-17 by the S6 session; not yet a spec.
Language: the spec documents (requirements.md, design.md, tasks.md) are written in English; the conversation with the project owner is in Chinese.

## How to use this brief

Create a spec named **field-companion** (S7) in `.kiro/specs/field-companion/`, requirements-first. Turn the parts below into EARS requirements. Do not add acceptance cases beyond this brief; where a value or a decision is left open here, list it and ask the project owner before writing it into the requirements. Opus writes requirements and design; Sonnet implements the tasks. Human review gates sit between requirements, design and tasks.

Read first (normative and landed, do not re-verify in the requirements phase):

- `.kiro/steering/project-scope.md` and `.kiro/steering/workflow.md`.
- `docs/reference/TECHNICAL_ROUTE.md` (sections 2 and 4 are normative; the English translation is `TECHNICAL_ROUTE.en.md`).
- `docs/reference/POSITIONING_AND_STORY.md` (the sourced stories, the audience, and the list of unconfirmed claims).
- The landed specs S1 to S6 in `.kiro/specs/` (orbit-engine, zombie-catalog, ar-pointing, seance-session, qsl-card, shell-pwa-deploy), especially S6 design "Camera backdrop and sky view", tasks 7A to 7C (the "Seance Observatory" visual language) and S3 design risk R1.

## Why S7 exists

S1 to S6 deliver a story-led, honest aid: pick a zombie satellite, see its next pass, point the phone, follow a simulated beacon and its real Doppler figure, collect a QSL card. Newcomers like it. An experienced satellite listener (SWL, SDR or ham) would use it once for the stories and then return to Gpredict, Look4Sat or Heavens-Above, because the steps that come before a real listening attempt are missing:

- whether the satellite is in sunlight during the pass (AO-7, Transit 5B-5, LES-1 and LES-5 transmit only in sunlight; today the app has no eclipse model),
- the exact frequencies to program into a radio at AOS, TCA and LOS,
- where the pass rises and sets, so an antenna can be aimed in advance,
- the passes of the next days, not only the next one,
- a reminder, and a short guide to listening for real.

S7 makes the app a **field companion**: professional enough that an experienced listener plans a real session with it, and still playable for a newcomer. It also adds the visual moments a judge remembers: the satellite and its track over the real sky through the camera, and its ground track on a world map.

## Audience and the two depths

- **Listener (primary).** Has a radio or an RTL-SDR. Wants pass planning, illumination, a tuning table, rise and set azimuths, and an AR view that confirms where to look.
- **Newcomer (entry).** Has a phone only. Uses the demo mode, the AR view and the guide.
- **Design rule: progressive disclosure.** Every screen opens in a simple view with one main action. An "Instrument" detail (a sheet, a toggle or a second panel; the design decides) reveals the professional numbers: azimuth and elevation, slant range, range rate, Doppler, tuning frequencies, illumination. The newcomer is never shown a wall of numbers first; the listener is never more than one tap from them.

## Parts

### 1. Sunlight and eclipse model

- A pure lib module computes the Sun direction for a UTC instant (a low-precision solar ephemeris; the design states the formula and its accuracy) and whether the satellite is in sunlight, penumbra or Earth's shadow, from the satellite's landed ECI position (`propagateAt` returns `eciPositionKm` in TEME). The design states the shadow model (cylindrical or conical) and the frame approximation.
- Every predicted pass gets an illumination profile: sunlit, partly sunlit (with the instants of shadow entry and exit) or in shadow.
- For entries with `beacon.sunlitOnly`, the UI marks clearly when the satellite will be in shadow ("silent in Earth's shadow" in spirit; exact copy in the copy module, through the honesty scan).
- Open question for the owner (ask, do not decide): should the **simulated** beacon of a sunlit-only entry fall silent while the satellite is in shadow? This would change S4's audio behaviour and the S4 `sunlitNote`. If yes, the design must propose the S4 change explicitly.
- Tests: pinned Sun-direction values for fixed UTC instants against a stated reference, and pinned illumination for constructed positions (in sunlight, behind the Earth).

### 2. Tuning table (Doppler for the real radio)

- For a predicted pass and an entry with a documented downlink, show the receive frequency the listener should tune at AOS, TCA and LOS: nominal downlink plus the physical Doppler shift, from the landed range rate (`observeAt` returns `rangeRateKmPerS`; S4's `physicalDopplerShiftKhz` gives the shift).
- An optional per-minute table across the pass, for programming memory channels; copy to clipboard and export as CSV. The design fixes the precision (for example 0.1 kHz) and the rounding.
- Entries without a documented downlink (IMAGE) show the no-frequency note, never an invented frequency.
- The frequency of LES-1 stays "about 237 MHz" in prose; the tuning table must state which nominal value it computes from and say that it is approximate (see the unconfirmed-claims list of the story file).
- Tests: the frequencies of one fixture pass, pinned.

### 3. Pass planner (several days)

- Per satellite, all passes in the next 7 days (the landed `predictPasses` supports up to 168 h), with a minimum-elevation filter (the design proposes the default and the choices) and the illumination badge of part 1.
- Each pass shows rise azimuth, maximum elevation and set azimuth, the UTC times (primary) and the local-time note of S6 (secondary). UTC stays primary everywhere.
- A pass can be exported as an `.ics` calendar event (pure text generation, downloaded through the established download-controller pattern, no package). The event text states that the beacon in the app is simulated.

### 4. Sky track (where to aim)

- For a selected pass, draw its full track on the S6 sky dome (azimuthal equidistant projection, `src/lib/shell/sky.ts`): the path sampled from `observeAt`, with AOS and LOS azimuth marks, the culmination point, and time ticks. During a pass, the satellite's current point moves along it.
- Shadow segments of the track (part 1) are drawn differently, so the listener sees at a glance where it will be quiet.
- This replaces the schematic S6 pass profile as the main pass visual, or sits next to it; the design decides and says why.

### 5. Ground track on a 2D world map

- A world map (equirectangular, or another projection the design states and justifies) with the satellite's current sub-satellite point, its past and future ground track (for example one orbit back and one forward; the design fixes it), its visibility footprint (the circle on Earth from which it is above the horizon), the observer's pin and the day and night terminator from part 1.
- The sub-satellite point (geodetic latitude, longitude, altitude) is computed by a new pure lib function from the landed ECF position, using the WGS84 constants of the reference (C29, C30). If an orbit-engine extension seems necessary instead, the design proposes it with reasons; `src/lib/orbit` is not changed silently.
- The coastline data is bundled in the repository, not fetched: a public-domain dataset (for example Natural Earth 1:110m), simplified to a stated size budget, with its licence and source recorded. The design states the size and the simplification.
- The map animates in real time and in the 60× demo clock. It must stay smooth on a mid-range phone; the design states the redraw strategy (SVG or Canvas 2D).
- Tests: the sub-satellite point for the reference ISS instant of section 4 of the reference document (the design states the expected values and their source), and the footprint radius formula.

### 6. AR sky view (camera, gyroscope, satellite and track over the real sky)

- A full-screen AR mode during a real-time pass and before it: the camera picture (S6 `getUserMedia` controller) with, drawn over it from the landed S3 camera basis and `projectMarker`:
  - the satellite marker with its name, and the ±10° lock ring (project rule: the pass lock tolerance is ±10°);
  - the pass track as a projected arc with time ticks, so the user sees where the satellite will move next;
  - the horizon line and the cardinal directions;
  - an edge arrow pointing to the satellite when it is off screen or behind (S3's behind test `f·u < 0` applies);
  - the lock state, the Doppler figure and the countdown to AOS in a small instrument strip.
- Before AOS, the AR view shows where the satellite will rise, so the user can turn to the right part of the sky early.
- Field of view: the fixed 75° vertical field of view stays the accepted known limitation unless the design adds a user field-of-view calibration (for example a slider with a stated range, saved locally); the owner decides (open question).
- The camera stays a visual layer only: no capture, no upload, no storage. Denial or no camera falls back to the dark sky background with the same overlay.
- The demo mode gets the same AR overlay against the drag view, clearly marked as demo.
- Risk R1 of S3 (the iOS compass under steep tilt) still applies; S7 does not build a fallback unless the S6 device checklist shows the flip (follow R1's policy).
- The overlay drawing is a presentational layer over pure projection functions; projection math gets example tests, the drawing is checked by review on a real phone.

### 7. Satellite models: find, view, download

- For each catalog entry, the S7 research step **finds** a 3D model and records for each: source URL, author, licence, file format and whether redistribution is allowed. Candidates to check include NASA 3D Resources (IMAGE may be there) and museum or agency archives. Only models whose licence allows redistribution are committed to the repository; nothing is hotlinked at runtime.
- Where no usable model exists (likely LES-1, LES-5, Transit 5B-5, AO-7, Prospero, Galaxy 15), the project authors a simple, honest low-poly model from documented shapes (photos and dimensions in the cited sources), drawn as geometry in code. The viewer labels a model as "illustrative" when it is authored, not original.
- A model viewer shows the model slowly rotating, in the Seance Observatory look (for example a lit wireframe or a shaded silhouette). Default renderer: a small hand-written projection to SVG or Canvas 2D, no package. If the design believes a WebGL library (for example three.js) is indispensable for quality, it asks the owner first (project rule: no new package without asking).
- **Download:** the user can download the model file (for example `.glb` or `.obj`; the design picks) together with a small text file of attribution and licence. Downloads use the established download-controller pattern with injected browser objects.
- The model viewer may appear on the home catalog entry and in the AR view as a small inset; the design decides.
- The record of sources and licences lives in the repository (for example `docs/reference/MODELS.md`) and the README's credits.

### 8. Listen for real: the guide

- Per playable entry: the downlink frequency and mode as documented, the simplest reception setup that the sources support (for example an RTL-SDR with a V-dipole for 136 to 137 MHz), the illumination condition, and links to real recordings in public archives (for example the DD1US space-sounds archive cited in the story file). Links only; no audio is copied into the app.
- Every fact is attributed to a source from `POSITIONING_AND_STORY.md` or a new source the requirements cite. The unconfirmed-claims list stays a red line (Transit identity dispute, no "nuclear battery", Prospero unconfirmed, IMAGE silent again, LES-1 "about 237 MHz").
- The guide never says that the app receives anything. It says that the listener's own radio does.

### 9. Optional: self-reported listening log (owner decides)

- If the owner approves: a listener who heard the satellite with their own radio can log it (UTC time, frequency, equipment, a note). The log entry and any card made from it are marked **self-reported** on their face, separate from the simulated-session QSL cards of S5, and never phrased as the app's reception.
- This touches the honesty red line; the requirements must state the exact marking rules and the copy must pass the honesty scan. If the owner declines, it is out of scope.

### 10. Experience for both depths

- A guided first run for a newcomer: one path from the home page to "your first pass" (demo or real), in three or four steps, skippable, shown once.
- The Instrument detail of the listener view (see "Audience and the two depths").
- The visual language of S6 task 7C stays: night palette, bone text, phosphor accent, brass for history, serif for stories, monospace for telemetry, hairlines and ticks; no web fonts.
- Use visuals over text wherever the information allows; long prose is reserved for stories and the guide.

## Constraints carried over (normative)

- Fixed catalog of 7 zombie satellites. No satellite search, no user satellite library, no custom backend beyond the S6 TLE proxy. The browser reaches CelesTrak only through `/api/tle`.
- All times UTC; UTC is the primary display, `formatUtc` the only UTC formatter; the S6 local-time note may be reused as secondary.
- satellite.js stays pinned to 6.0.2. Pass lock tolerance ±10°.
- The app never claims to receive real RF signals; the beacon is synthesized. Scaffold checks 1.24 and 1.25 cover every new copy module and every new page or component with JSX text, by explicit enumeration; checks are never weakened.
- Layering: pure logic in `src/lib/<module>` with a source-boundary scan in the established style for a new lib directory; browser access in component-layer controllers with injected dependencies; pages thin. Check 1.19 is extended by file name for every new route, `.tsx` file and app-directory entry.
- Landed S1 to S6 interfaces are consumed, not modified; any extension is proposed explicitly in the design with reasons.
- Tests: Vitest `node` environment, offline under the network guard, minimal and sufficient; no DOM environment, no React component tests, no multi-layer verification machinery. Device behaviour is checked by review items on a real phone against the Live_URL.
- No new package without asking the owner first.
- Workflow: commit and push once per task after its tests pass, staging by file name; the three spec documents are committed with task 1; `next.config.ts` is never staged.

## Priorities and the deadline

Submission deadline 2026-12-05 06:00 GMT+8; internal target the evening of 2026-12-04. S6 still has task 7 (device checklist) and task 11 (final acceptance and submission checklist) open, and the video must be recorded. The requirements must therefore rank the parts, and the task list must deliver them in this order so that a cut leaves a coherent app:

| Tier | Parts | Reason |
|---|---|---|
| Must | 1 sunlight model, 2 tuning table, 4 sky track, 6 AR track overlay | Real listening value, and the strongest demo moments |
| Should | 5 ground-track map, 3 pass planner with `.ics`, 8 guide | Professional depth and the path from newcomer to listener |
| Could | 7 models, 10 guided first run, 9 self-reported log (only if approved) | Delight; most dependent on research and licences |

## Interplay with S6

- S6 task 7 (device checklist) runs on the Live_URL. S7 pushes redeploy it, so the S7 task list ends with its own device review items on a real phone (AR overlay, map smoothness, model viewer, guide links).
- S6 task 11 (final acceptance and submission checklist) should run after S7 lands, and the README, `docs/submission/DEVPOST.md` and `docs/submission/VIDEO_SCRIPT.md` need an update for the S7 features. The owner decides whether those updates are S7 tasks or the start of S6 task 11.

## Open questions for the owner (ask in the requirements phase)

1. Should the simulated beacon of a sunlit-only entry fall silent in Earth's shadow (part 1)? This changes S4 behaviour.
2. Add a user field-of-view calibration to the AR view, or keep the fixed 75° (part 6)?
3. Approve the self-reported listening log (part 9)?
4. Models (part 7): accept "illustrative" authored low-poly models where no licensed original exists? Allow a WebGL package if the design asks for it?
5. Default minimum elevation of the planner and the length of the past and future ground track (parts 3 and 5).
6. Are the README, Devpost and video-script updates part of S7, or part of S6 task 11?
7. Which tiers to commit to, given the deadline.
