# zombieSatellite

zombieSatellite is a mobile-first web app for the Kiroween 2026 hackathon (category Resurrection). It predicts passes of seven zombie satellites from public CelesTrak TLE data. Only the orbital data is real: the beacon sound of later versions is simulated, synthesized in the browser from public TLE data.

## Live app

Live app: https://zombie-satellite.vercel.app/

## Origins

The coordinate conventions and numeric acceptance baselines come from the author's earlier personal project SatAware AR.

All code in this repository was newly written during the Kiroween 2026 submission period.

## Requirements

- Node.js 22.12 or later
- pnpm 10.30.3

## Commands

- `pnpm install --frozen-lockfile` installs the dependencies exactly as recorded in `pnpm-lock.yaml`.
- `pnpm test` runs the test suite once, without network access unless the live test below is enabled.
- `pnpm run build` creates the production build.
- `pnpm run typecheck` runs the TypeScript type check (`tsc --noEmit`). Run it after a build, because the build generates `next-env.d.ts` and the `.next/types` folder.
- `pnpm run dev` starts the development server.

## Live CelesTrak test

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
