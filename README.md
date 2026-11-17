# zombieSatellite

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). It is a finding, pointing and Doppler aid for amateur radio and satellite hobbyists, built around a fixed catalog of seven zombie satellites: old spacecraft that were given up for dead and then turned out to still be transmitting, or whose story deserves to be told. The beacon sound in the app is simulated; only the orbital data is real.

Live app: https://zombie-satellite.vercel.app/
Demo video: https://youtu.be/Bf7HQ5XEycQ

## How to play

1. Pick a satellite. The Archive page (/catalog) presents all seven entries with their documented history; five of them are playable, two are story-only because they have no regular passes to play.
2. Predict the pass. The app computes the next pass over your position from public CelesTrak TLE data with SGP4. Your position comes from the browser geolocation, with manual coordinates as the fallback. All times are UTC, with a local start time shown on the picker.
3. Point the phone. During a pass, a marker shows where the satellite is in the sky, optionally over the camera picture. The pointing lock tolerance is ±10°.
4. Follow the simulated beacon. A tone synthesized in the browser follows the Doppler shift of the pass, and the real shift is shown in kHz next to it.
5. Collect the QSL card. Every completed pass issues a card that you can open and save as SVG or PNG.

New to satellites? Every session has a demo mode that plays the next complete real pass at 60× speed, so you can try the whole loop in a few minutes.

## Field companion features

The field companion update adds these tools around each pass. All of them are computed in the browser from public TLE data.

- **Illumination and Shadow_Silence.** A sunlight model shows whether the satellite is lit or in Earth's shadow. While it is in shadow, the simulated beacon goes silent.
- **Tuning table.** A table of the Doppler-shifted frequencies over the pass, which you can copy or export as CSV.
- **Pass planner and calendar export.** Lists upcoming passes with a minimum peak elevation filter (default 10°) and exports a pass as a calendar event.
- **Sky track.** The path of the satellite across the sky, drawn for one orbit back and one forward.
- **AR view.** The camera picture with the track arc, a lock ring, an edge arrow that points toward an off-screen satellite, and a field-of-view calibration.
- **Ground track map.** A world map with the ground track and the current sub-satellite point.
- **Listening guide.** Links to documented listening sources for each satellite. The in-app beacon stays simulated.
- **Models.** An illustrative model of each spacecraft that you can view and download.
- **Listening log.** A local log of your own sessions, stored on your device only.
- **First-run guide.** A short walkthrough on the first visit.

## Credits

- Coastline data: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- Spacecraft models are illustrative. They were authored by this project, not taken from agency or vendor files. See [docs/reference/MODELS.md](docs/reference/MODELS.md).

## Honesty

The beacon sound is simulated: the browser synthesizes it from public TLE data. zombieSatellite has no radio hardware and processes no real-world transmission; the only real input is public orbital data.

The stories in the Archive are documented history, attributed to named amateurs and to their sources. None of them describes something this app does.

## Run locally

### Requirements

- Node.js 22.12 or later
- pnpm 10.30.3

### Commands

- `pnpm install --frozen-lockfile` installs the dependencies exactly as recorded in `pnpm-lock.yaml`.
- `pnpm test` runs the test suite once, without network access unless the live test below is enabled.
- `pnpm run build` creates the production build.
- `pnpm run typecheck` runs the TypeScript type check (`tsc --noEmit`). Run it after a build, because the build generates `next-env.d.ts` and the `.next/types` folder.
- `pnpm run dev` starts the development server.
- `node scripts/generate-icons.mjs` regenerates the app icons in `public/icons`. The icons are drawn by this script and are committed.

The browser never contacts celestrak.org. It requests `/api/tle` on its own origin, and that server route fetches the TLE from CelesTrak. On Vercel the answer is cached for 2 hours. Camera and geolocation need a secure context, which means HTTPS or localhost.

### Live CelesTrak test

One opt-in test requests the TLE of the ISS (NORAD 25544) from the real CelesTrak endpoint once per run and checks the returned NORAD number, object ID and object name. It runs only while the environment variable `ZOMBIESAT_LIVE_TEST` holds a non-empty value. Otherwise `pnpm test` reports it as skipped. CelesTrak can answer with HTTP 403 when it rate-limits requests, so run the live test only when needed.

PowerShell:

```powershell
$env:ZOMBIESAT_LIVE_TEST = "1"; pnpm exec vitest run tests/orbit/live-celestrak.test.ts; Remove-Item Env:ZOMBIESAT_LIVE_TEST
```

cmd.exe:

```bat
set ZOMBIESAT_LIVE_TEST=1
pnpm exec vitest run tests/orbit/live-celestrak.test.ts
set ZOMBIESAT_LIVE_TEST=
```

POSIX shells (bash, zsh, sh):

```sh
ZOMBIESAT_LIVE_TEST=1 pnpm exec vitest run tests/orbit/live-celestrak.test.ts
```

These lines document shell usage and are not package.json scripts, because pnpm runs scripts through cmd.exe on Windows and through a POSIX shell elsewhere.

## Built with Kiro

The project was specified and built spec by spec with Kiro. The 11 spec folders in `.kiro/specs` hold each feature's requirements (EARS), design and tasks, and tasks are committed one at a time. The two steering files in `.kiro/steering` fix the project scope and the workflow rules. Kiro hooks, MCP servers, powers and Kiro Crew are not used.

## Origins

The coordinate conventions and numeric acceptance baselines come from the author's earlier personal project SatAware AR.

All code in this repository was newly written during the Kiroween 2026 submission period.

The conventions and baselines are kept in [docs/reference/TECHNICAL_ROUTE.md](docs/reference/TECHNICAL_ROUTE.md) (Chinese, trimmed) and in its English translation, [docs/reference/TECHNICAL_ROUTE.en.md](docs/reference/TECHNICAL_ROUTE.en.md).

## License

MIT, see [LICENSE](LICENSE).