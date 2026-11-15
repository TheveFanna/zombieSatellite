# zombieSatellite

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). It is a finding, pointing and Doppler aid for amateur radio and satellite hobbyists, built around a fixed catalog of seven zombie satellites: old spacecraft that were given up for dead and then turned out to still be transmitting, or whose story deserves to be told. The beacon sound in the app is simulated; only the orbital data is real.

Live app: https://zombie-satellite.vercel.app/

## How to play

1. Pick a satellite. The home page presents all seven entries with their documented history; five of them are playable, two are story-only because they have no regular passes to play.
2. Predict the pass. The app computes the next pass over your position from public CelesTrak TLE data with SGP4. Your position comes from the browser geolocation, with manual coordinates as the fallback. All times are UTC, with a local start time shown on the picker.
3. Point the phone. During a pass, a marker shows where the satellite is in the sky, optionally over the camera picture. The pointing lock tolerance is ±10°.
4. Follow the simulated beacon. A tone synthesized in the browser follows the Doppler shift of the pass, and the real shift is shown in kHz next to it.
5. Collect the QSL card. Every completed pass issues a card that you can open and save as SVG or PNG.

New to satellites? Every session has a demo mode that plays the next complete real pass at 60× speed, so you can try the whole loop in a few minutes.

## Honesty

The beacon sound is simulated: the browser synthesizes it from public TLE data. zombieSatellite has no radio hardware and processes no real-world transmission; the only real input is public orbital data.

The stories on the home page are documented history, attributed to named amateurs and to their sources. None of them describes something this app does.

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

The project was specified and built spec by spec with Kiro. Each spec has its requirements, design and tasks in `.kiro/specs`, and the steering rules are in `.kiro/steering`.

## Origins

The coordinate conventions and numeric acceptance baselines come from the author's earlier personal project SatAware AR.

All code in this repository was newly written during the Kiroween 2026 submission period.

The conventions and baselines are kept in [docs/reference/TECHNICAL_ROUTE.md](docs/reference/TECHNICAL_ROUTE.md) (Chinese, trimmed) and in its English translation, [docs/reference/TECHNICAL_ROUTE.en.md](docs/reference/TECHNICAL_ROUTE.en.md).

## License

MIT, see [LICENSE](LICENSE).