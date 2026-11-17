# zombieSatellite: project guide and submission materials

This guide is for the team and the judges. Chinese explains the project; the English blocks are text that can go straight into Devpost, the README or the video. Button labels are quoted from the app as it is deployed.

## 1. In one sentence

zombieSatellite is a mobile web app that helps an amateur find, point at and follow one of seven "zombie satellites": old spacecraft that were given up for dead and are still on orbit, or whose story deserves retelling. It computes passes from public orbital data and synthesizes a simulated beacon. It never receives a real signal.

English:

> zombieSatellite is a finding, pointing and Doppler aid for amateur radio and satellite hobbyists, built around seven zombie satellites. It predicts passes from public orbital data, points the phone at the sky, shows the Doppler shift, and plays a simulated beacon. It has no radio hardware and receives nothing.

## 2. Background

- **The story.** Some satellites were declared dead decades ago and still transmit. Amateurs found several of them again, not the agencies that built them. LES-1 was heard again in 2012 at about 237 MHz. IMAGE was found in 2018 by a Canadian amateur who was searching for another satellite. Transit 5B-5 is believed to be the oldest satellite still transmitting. These stories are documented in the app with sources, and they are attributed to the people who reported them.
- **The problem.** Following a satellite needs three answers: when it is overhead, where to look, and how far the frequency has moved. Desktop tools are for experienced operators; a newcomer cannot easily get the three answers on one phone.
- **The catalog.** Seven satellites: LES-1, Transit 5B-5, AMSAT-OSCAR 7 (AO-7), Prospero, IMAGE, Galaxy 15 and LES-5. Five are playable (they have passes over a typical observer). Two are story-only: Galaxy 15 (its geostationary slot is not visible from China) and LES-5 (it drifts in a graveyard orbit with no regular passes).

English:

> In 2012 a radio amateur heard LES-1, a satellite launched in 1965, again. In 2018 an amateur found IMAGE while searching for another satellite. zombieSatellite collects these stories, with their sources, and turns the orbital maths into a tool anyone can try on a phone.

## 3. Who it is for

- **Primary:** amateur radio operators, shortwave and satellite watchers, SDR owners and people who track satellites. They already know why a pass, a pointing direction and a Doppler figure matter.
- **Entry point for newcomers:** people with no radio and no antenna. The demo mode lets them practise the whole loop (pick a satellite, read the pass, point, follow the shift, collect the card) in a few minutes.
- **Not for:** anyone who expects the app to receive real signals. The app says so on the home page, in the footer and on each card.

English:

> The first audience is amateur radio and satellite hobbyists. The demo mode is the entry point for people without a radio: it practises the full loop on a 1960s spacecraft before they touch real equipment.

## 4. Pages and buttons

The app has one main navigation bar at the bottom with four entries: **Home**, **Passes**, **AR** and **QSL cards**.

| Page | What it is for | Main buttons and links |
|---|---|---|
| **Home** (`/`) | Introduction and routes. Shows the Kiroween 2026 note, the source and specs links, five entry cards and the first-run guide. | Entry cards: "Live AR view", "Passes", "Archive", "Your QSL cards", "Log" |
| **Passes** (`/session`) | Observer and the next pass of each satellite. One compact row per satellite with rise time, maximum elevation and length. | "Use my location" (observer); per row: "Open session", "Plan passes", "Story" |
| **Planner** (`/planner/[id]`) | All passes in the next seven days for one satellite. A list, and a sheet with the details of one pass. | "Minimum elevation" 0 / 10 / 20 / 30°; "Open session (it targets the next pass)", "Guide", "Story"; in the sheet: "Add to calendar", "Copy table", "Download CSV" |
| **Session** (`/session/[id]`) | The live loop for one satellite: wait for the pass, follow it, get the result. | "Start in real time", "Start demo (60×)", "Abort", "Sound" (enables audio), "Pointing", "Motion sensors", "All satellites"; dock: "Story", "Field", "Settings"; "View your QSL cards" after a pass |
| **AR** (`/ar`) | Camera picture with the live satellite direction, its orbit ring, a centre guide arrow, a 24-hour visibility bar and a camera-to-night-sky slider. | Satellite cards (swipe or tap); gear icon (settings: turn the view ±5°, restart the camera, allow motion sensors); tap the satellite or the selected card to read its story; "Allow" on the permission card; sliders: field of view (left), camera to sky (right) |
| **Archive** (`/catalog`) | Each satellite's documented history, lifeline, sources and illustrative model. | "Model" to draw the model; "Open session", "Plan passes", "Guide" for playable satellites |
| **Guide** (`/guide/[id]`) | Listening guide for one satellite: the documented downlink, the simplest setup supported by sources, and the sunlight condition. | Links to public recordings |
| **QSL cards** (`/cards`) | Cards issued after completed sessions, saved in the browser. | Open a card; "Download SVG" or "Download PNG" on the card page. With no cards yet, a link to the satellite picker |
| **Log** (`/log`) | A self-reported listening log, kept on the device only. | Add an entry |

English summary of the main flow:

> Pick a satellite in Passes, read its next pass, open the session and tap "Start demo (60×)". The demo runs the pass at 60 times speed. Point the phone at the sky in AR; when the lock ring turns on, follow the simulated beacon and the Doppler readout. At the end of the pass, collect the QSL card.

## 5. What the app does, feature by feature

- **Pass prediction.** SGP4 (satellite.js 6.0.2) on public CelesTrak TLE data, through the app's own server route, cached for two hours. Times are UTC, with the local start time next to it.
- **Sunlight and shadow.** The model shows when a satellite is in Earth's shadow. For satellites documented as transmitting only in sunlight, the simulated beacon is silent in shadow.
- **Tuning table.** The receive frequency and the Doppler shift at AOS, the closest approach and LOS, with a per-minute table that can be copied or downloaded as CSV. LES-1 is marked as approximate; IMAGE shows no frequency because none is documented.
- **AR pointing.** The phone's heading (with magnetic declination from WMM 2025) places the satellite on the camera picture. The lock is within ±10°. A calibration step of 5° corrects a visible offset.
- **Simulated beacon.** Web Audio synthesizes the tone; its pitch follows the Doppler shift. The loudness depends on how well the phone points at the satellite, which models a directional antenna. This is a simulation, labelled as such.
- **QSL card.** An SVG card with the satellite, UTC times, maximum elevation, frequency and a line that says the card confirms a simulated session. Saved as SVG or PNG.
- **Demo mode.** A 60× clock plays the next complete pass in a few minutes, with auto-point on.
- **Stories.** Each satellite has a documented history with sources, a hook and a story card that opens from the AR view.
- **Models.** Vector sketches of each satellite, drawn from published descriptions. Transit 5B-5 is a sphere because no shape was found in the sources.
- **First-run guide.** A short guide on the first visit.

English:

> Passes come from public orbital data computed in the browser with SGP4. The AR view places the satellite on the camera picture. The beacon tone is synthesized and labelled as simulated; the Doppler figure is the real computed shift. Each completed pass issues a QSL card.

## 6. Honest limits (say these in every piece of material)

- zombieSatellite receives no radio signal and has no radio hardware. It processes no real transmission.
- The beacon sound is simulated. The Doppler figure is computed from public orbital data.
- Historical reports are attributed to the people who made them. Unconfirmed reports are labelled unconfirmed.
- The illustrative models are sketches, not engineering models.
- The camera is a visual layer only. Nothing is captured, uploaded or stored.
- The listening log is self-reported and not verified.
- Sensor headings have errors; magnetic declination is modelled, but a calibration may still be needed.

## 7. Technology

- Next.js 16 and React 19 with TypeScript, deployed on Vercel as an installable PWA.
- satellite.js 6.0.2 (SGP4), a WMM 2025 declination model, Web Audio for the tone, DeviceOrientation and getUserMedia for AR.
- Tests: 384 passing tests in 81 files, with fast-check property tests and scaffold tests that scan the app's text for wording that could suggest real reception. The live CelesTrak test is opt-in.
- Coordinate conventions and numeric acceptance baselines come from the author's earlier personal project, SatAware AR. All code was written during the Kiroween 2026 submission period.

## 8. Kiro

- 11 spec folders in `.kiro/specs`, each with requirements (EARS), design and tasks where written.
- 2 steering files in `.kiro/steering`: the project scope and the workflow rules.
- 113 commits from 14 November 2026, tasks committed one at a time.
- Not used: Kiro hooks, MCP servers, Kiro powers and Kiro Crew.

English:

> The project was built spec by spec with Kiro: eleven spec folders with requirements, design and tasks, two steering files that fix the project scope and workflow, and 113 commits, one per task. We did not use hooks, MCP servers, powers or Kiro Crew.

## 9. Short texts for the submission

**Tagline (about 15 words):** Find a zombie satellite's next pass, point your phone at it, and follow its Doppler shift with a simulated beacon.

**Category:** Resurrection.

**One paragraph (about 80 words):**

> zombieSatellite is a mobile web app for amateur radio and satellite hobbyists, built around seven zombie satellites: old spacecraft that were given up for dead and that still transmit or whose stories deserve telling. It predicts the next pass over your position from public orbital data with SGP4, shows when to look and where, follows the Doppler shift, and plays a beacon sound that is simulated in the browser. Each completed pass issues a QSL card. It receives no radio signal: bring your own radio for the real thing.

**Judging-facing note (about 60 words):**

> The project is a Kiro showcase as well as an app. It was specified spec by spec in eleven feature folders, guided by two steering files, and committed one task at a time. Honesty rules are enforced by scaffold tests that scan the app's own text.

## 10. Video

- The narration script is `docs/submission/VIDEO_SCRIPT.md`, planned at 175 seconds. The limit is three minutes.
- Red lines for every shot: the beacon sound is simulated; the app never claims to hear a real satellite; every historical reception is attributed to a named person.
- Keep the video link in Devpost ("Video demo link") and in the README once the video is public.

## 11. Before the submission closes

- [ ] Upload the video and replace the placeholder in `docs/submission/DEVPOST.md` ("Demo video") and in this guide.
- [ ] Check the Devpost category and the official rules (the official rules page was not reachable from the build environment).
- [ ] Confirm that the GitHub repository is public and the MIT licence is visible.
- [ ] Check the live URL once more on a phone and a desktop.
- [ ] Check that the three statements about the team's process in the Devpost "Kiro usage" section are true before submitting (author, review gates, device checklist).
