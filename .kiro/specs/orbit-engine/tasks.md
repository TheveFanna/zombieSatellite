# Implementation Plan: orbit-engine

## Overview

The plan builds the spec bottom-up in TypeScript, following the module layout, decisions D1–D26, Correctness Properties and Testing Strategy of design.md. The order is: Project_Scaffold and offline test guard, engine foundation and source-boundary scan, TLE_Parser, TLE_Cache and TLE_Fetcher, Propagator, refinement primitives, Pass_Predictor, baselines and stability, and finally the complete Public_Interface with the cross-cutting checks. Every engine module is exported from `src/lib/orbit/index.ts` in the task that creates it, so tests always import public functions through the entry module.

Each top-level task ends with a sub-task that runs the suite and makes exactly one local commit, staging files by name. The only push happens in the final checkpoint. Numeric expectations come from sections 2 and 4 of `docs/reference/TECHNICAL_ROUTE.md` and from requirements.md; they are normative and are copied, not recomputed. The developer machine is Windows with PowerShell, Node v22.19.0 and pnpm 10.30.3 (D26); command examples use PowerShell syntax, and package.json scripts stay cross-platform.

## Tasks

- [x] 1. Set up the project scaffold, toolchain and offline test guard
  - [x] 1.1 Create the npm project and toolchain configuration
    - Write `package.json` as in the design's package.json section: name `zombie-satellite`, version `0.1.0`, `private`, the description, `engines.node` `>=22.12.0`, `"packageManager": "pnpm@10.30.3"` (D26), and the scripts `dev`, `build`, `start`, `test` (`vitest run`) and `typecheck` (`tsc --noEmit`), each a single command without environment assignments, variable expansion, `rm`/`del` or shell operators
    - Install with the design's three commands: `pnpm add next@16 react@19 react-dom@19`, `pnpm add --save-exact satellite.js@6.0.2`, `pnpm add -D vitest@5 fast-check@4 typescript@5.9 @types/node@22 @types/react@19 @types/react-dom@19`
    - Convert the current repository state (D26): `package-lock.json` and `node_modules` were created by npm earlier. Move `package-lock.json` out of the repository to `C:\Users\ATHEVE\AppData\Local\Temp\zombieSatellite-backup\` (move it, do not delete it), delete `node_modules` and reinstall with `pnpm install --frozen-lockfile`. Keep the existing `pnpm-lock.yaml` if that command accepts it; otherwise regenerate it with `pnpm install`. Then check that `pnpm ls --depth 0` is consistent with `package.json`, that neither `node_modules/.ignored` nor `node_modules/.package-lock.json` exists, and that `pnpm-lock.yaml` contains no registry-mirror host (`npmmirror`)
    - Confirm the recorded ranges: `next` major 16 only, `react` and `react-dom` major 19 only, `satellite.js` exactly `6.0.2`, `typescript` 5.x only (D25), `vitest` and `fast-check` in `devDependencies`; every satellite.js entry of `pnpm-lock.yaml` (the importer entry, the `packages` key and the `snapshots` key) is 6.0.2; `packageManager` in `package.json` names pnpm (`pnpm@10.30.3`); none of `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `bun.lock` or `bun.lockb` exists
    - Write `tsconfig.json`, `next.config.ts` and `vitest.config.ts` exactly as in the design (`include: ['tests/**/*.test.ts']`, `environment: 'node'`, `pool: 'forks'`, `setupFiles: ['./tests/setup/network-guard.ts']`, `passWithNoTests: false`), and `.gitignore` with the design's entries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 1.10, 1.11, 1.13, 1.14, 1.16, 1.18_

  - [x] 1.2 Create the root layout, the placeholder page and README.md
    - `src/app/layout.tsx`: static `metadata` (title `zombieSatellite`, the design's description) and `RootLayout` rendering `<html lang="en"><body>{children}</body></html>`
    - `src/app/page.tsx`: a `<main>` with the heading `zombieSatellite` and the design's placeholder sentence; no `'use client'`, data fetching, dynamic APIs, `next/font` or images; no `public/` folder, CSS file, favicon, other component or other route
    - `README.md` in the design's order: the description paragraph, an "Origins" section with the two verbatim sentences (SatAware AR origin of the conventions and baselines; all code newly written during the Kiroween 2026 submission period), requirements and the pnpm commands (`pnpm install --frozen-lockfile`, `pnpm test`, `pnpm run build`, `pnpm run typecheck` after a build, `pnpm run dev`), and the Live_Test instructions for PowerShell, cmd.exe and POSIX shells, each running `pnpm exec vitest run tests/orbit/live-celestrak.test.ts` with `ZOMBIESAT_LIVE_TEST` set (D19)
    - Every README paragraph or list item that mentions a beacon, signal, radio or transmission also says "simulated" or "synthesized"; no sentence pairs a reception word (receive, capture, decode, listen, hear) with a radio term
    - _Requirements: 1.19, 1.20, 1.21, 1.22, 1.23, 1.24, 1.25_

  - [x] 1.3 Implement the built-in `fetch` blocker and its self-check test
    - `tests/setup/network-guard.ts` (D22): state `{ builtinFetch, blockedFetch, calls }` on `globalThis[Symbol.for('zombieSatellite.networkGuard')]`; at load save the built-in `fetch` once per worker and install `blockedFetch`, which records the URL and returns a rejected promise; `beforeEach` reinstalls the blocker without clearing `calls`; `afterEach` reinstalls it and throws, naming the URLs, when `calls` is non-empty; `afterAll` throws when `calls` is non-empty
    - `tests/orbit/network-guard.test.ts`: the self-check that calls `globalThis.fetch('https://celestrak.org/…')`, asserts that the promise rejected and that `calls` holds the URL, then clears `calls`
    - Run `pnpm exec vitest run tests/orbit/network-guard.test.ts`
    - _Requirements: 14.1, 14.2_

  - [x] 1.4 Write the scaffold static checks
    - `tests/scaffold/scaffold.test.ts` with the checks of the design's scaffold row: version ranges (`/^[\^~]?16\.\d+\.\d+$/`, `/^[\^~]?19\.\d+\.\d+$/`), `ts.getParsedCommandLineOfConfigFile` strict-family check, satellite.js pin in package.json and `pnpm-lock.yaml` (text matching, no YAML library, no new dependency), absence of the other lock files listed in task 1.1, `packageManager` starting with `pnpm@`, `engines.node`, devDependencies, no `@vitest-environment` in any test file, script syntax, the `src/app` file set, the TypeScript-AST checks of `layout.tsx` and `page.tsx`, the two verbatim README sentences and the simulated/synthesized wording rules
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 1.10, 1.11, 1.13, 1.19, 1.20, 1.21, 1.22, 1.23, 1.24, 1.25_

  - [x] 1.5 Verify the toolchain commands and commit task 1
    - Run `pnpm install --frozen-lockfile` (exit 0), `pnpm test` (single run, exit 0), `pnpm run build` (exit 0, `/` listed as static) and then `pnpm run typecheck` (zero errors; it runs after the build because `next-env.d.ts` and `.next/types` come from the build). If the build adjusted `tsconfig.json`, keep the adjusted file and run `pnpm run typecheck` again
    - Run `pnpm test no-such-test-file` once and confirm that `$LASTEXITCODE` is non-zero (no test file found)
    - Stage by name with `git add --`: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `README.md`, `src/app/layout.tsx`, `src/app/page.tsx`, `tests/setup/network-guard.ts`, `tests/orbit/network-guard.test.ts`, `tests/scaffold/scaffold.test.ts` (if 1.4 was done), and the spec documents `.kiro/specs/orbit-engine/requirements.md`, `.kiro/specs/orbit-engine/design.md`, `.kiro/specs/orbit-engine/tasks.md` and `.kiro/specs/orbit-engine/.config.kiro`
    - Run `git diff --cached --name-only` and confirm that only these files are staged and `.kiro/steering/workflow.md` is not; commit with a message such as `Add project scaffold and offline test guard`
    - Confirm that `git ls-files pnpm-lock.yaml` prints the file. Do not push
    - _Requirements: 1.6, 1.12, 1.14, 1.15, 1.16, 1.17, 1.18, 1.20, 1.21_

- [x] 2. Build the engine foundation and the source-boundary scan
  - [x] 2.1 Implement `errors.ts`, `constants.ts`, `time.ts` and the entry module `index.ts`
    - `errors.ts` (D4): `EngineErrorCategory`, `EngineErrorOptions`, `EngineError` with `name`, `category`, `status` and ES2022 `cause` (set whenever the `cause` key is present, also for `undefined`), `isEngineError`
    - `constants.ts`: every constant of the design's constants table, exported `TLE_CACHE_TTL_MS = 7_200_000` (D9) and `REQUEST_TIMEOUT_MS = 15_000` (D10), and `radToDeg(x) = (x / Math.PI) * 180` (D8)
    - `time.ts`: `TimeInput` and `toTimeMs(value, label)` (D3: a `Date` of any realm read with `Date.prototype.getTime.call`, or a finite number with absolute value ≤ 8.64 × 10¹⁵ truncated with `Math.trunc(value) + 0`; everything else `invalid-input`), and `isoOf` for messages, which uses only `toISOString()`
    - `index.ts` exports `EngineError`, `isEngineError`, `TLE_CACHE_TTL_MS`, `REQUEST_TIMEOUT_MS` and the types `EngineErrorCategory`, `EngineErrorOptions`, `TimeInput`; `toTimeMs`, `radToDeg` and the other constants stay internal
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.9, 5.2_

  - [x] 2.2 Implement the source scanner and the source-boundary test
    - `tests/helpers/source-scan.ts` (D24): walk `src/lib/orbit` recursively, fail on any non-source file extension, require `index.ts`, parse each file with `ts.createSourceFile`, collect the specifiers of import and export declarations (including `import type`), `import x = require(…)`, dynamic `import(…)` and `import('…')` type nodes, allow only `satellite.js` and relative paths that resolve inside `src/lib/orbit`, treat a non-literal dynamic import as a violation, and report every forbidden identifier of Requirement 2, criterion 10 and every forbidden or non-literal `globalThis[…]` element access
    - `tests/orbit/source-boundary.test.ts`: zero violations for the engine, the design's synthetic violation snippets are all reported, and a snippet that mentions `window` only in a comment and a string is not
    - Run `pnpm exec vitest run tests/orbit/source-boundary.test.ts`
    - _Requirements: 2.1, 2.2, 2.10, 14.12_

  - [x] 2.3 Run the suite and commit task 2
    - Run `pnpm test` (exit 0) and `pnpm run typecheck` (zero errors)
    - Stage by name: `src/lib/orbit/errors.ts`, `src/lib/orbit/constants.ts`, `src/lib/orbit/time.ts`, `src/lib/orbit/index.ts`, `tests/helpers/source-scan.ts`, `tests/orbit/source-boundary.test.ts`, `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`); commit, for example `Add engine errors, time handling and source-boundary scan`. Do not push
    - _Requirements: 2.1, 2.2, 2.10_

- [x] 3. Implement the TLE_Parser
  - [x] 3.1 Implement `parseTle` and the `TleRecord` type in `tle-parser.ts`
    - Define `TleRecord` as in the design's Data Models section and implement `parseTle(text)`: a non-string argument gives `invalid-input`; the nine checks run in the design's order (split on `\n`, `trimEnd()` per line, keep non-empty lines; exactly three lines; `1 `/`2 ` prefixes; 69 characters; digit-only NORAD, epoch-year and eccentricity fields; equal NORAD numbers; decimal fields of criterion 21; `MEAN_MOTION !== 0`; `twoline2satrec` error code, finite `no`, and finite `propagate` result at `new Date(EPOCH)`), each failure `invalid-tle`
    - Compute the fields by the design's field table (EPOCH by C02 and formula 2.9.1, not rounded, D2; `ECCENTRICITY = Number('0.' + digits)`; semi-major axis by formula 2.9.7; altitude `a − 6378.137`); no checksum verification (D1); none of the optional fields of D17; return the record with `Object.freeze`
    - Export `parseTle` and the `TleRecord` type from `index.ts`
    - _Requirements: 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14, 4.15, 4.16, 4.17, 4.20, 4.21, 4.22, 4.23, 4.24, 5.11_

  - [x] 3.2 Find the two satellite.js fixtures and write the parser example tests
    - Create `tests/helpers/baseline.ts` with the section 4.2 TLE texts of both Baseline_TLE_Snapshots (name line and the two 69-character lines) and their expected section 4.2 fields, copied from the Reference_Document without recomputation
    - Fixture for Requirement 4, criterion 16: with an untracked scratch Node script at the repository root (for example `fixture-search.mjs`, run with `node fixture-search.mjs`) that imports `twoline2satrec` and `propagate` from satellite.js 6.0.2, find a TLE that passes parser checks 1 to 8 but for which `twoline2satrec` returns a non-zero error code. Start with the ISS lines and mean motion `99.99999999` in line 2 columns [52:63]; record the error code
    - Fixture for Requirement 4, criterion 23: with the same script, find a TLE that passes checks 1 to 8, for which `twoline2satrec` returns error code 0, and for which the Satrec mean motion is not finite or `propagate` at EPOCH returns null or a non-finite component. Try the design's candidate (a perigee inside the Earth) and, if that already gives a non-zero error code in `twoline2satrec`, a field that the parser does not check, such as a non-numeric BSTAR field; record the observed result
    - Delete the scratch script; it is never staged
    - Write `tests/orbit/tle-parser.test.ts`: 4.18 and 4.19 with exact field equality, `toISOString()` of EPOCH compared at millisecond precision (4.25) and the stated tolerances for semi-major axis and altitude; the two fixtures as constants with a comment naming the satellite.js 6.0.2 result, plus assertions that satellite.js itself still gives that result and that `parseTle` rejects them with `invalid-tle`; `No GP data found` without terminator, with LF and with CRLF (4.17); mean motion `00.00000000` (4.22); none of the optional field keys present (4.10); `Object.isFrozen` (5.11)
    - Run `pnpm exec vitest run tests/orbit/tle-parser.test.ts`
    - _Requirements: 4.10, 4.16, 4.17, 4.18, 4.19, 4.22, 4.23, 4.25, 5.11_

  - [x] 3.3 Add the TLE generators to `tests/helpers/arbitraries.ts`
    - Create the file with `tleFieldsArb` and `formatTle(fields)` (C18 columns, `%05d` NORAD, 8-character designator, `yy`, `ddd.dddddddd`, `%8.4f` angles, 7 eccentricity digits below 0.25, `%11.8f` mean motion in [0.5, 17] rev/day, remaining columns copied from the ISS snapshot, no checksum recomputation) and `renderingArb(tle)` (name padding, trailing whitespace, LF/CRLF per line, blank and whitespace-only lines, optional final terminator)
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 3.4 Write the property test for TLE text normalisation
    - `tests/orbit/property-01-tle-normalisation.test.ts`
    - **Property 1: TLE text normalisation invariance**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.20**

  - [x] 3.5 Write the property test for the TLE column model
    - `tests/orbit/property-02-tle-columns.test.ts`; accept-or-reject decided against satellite.js `twoline2satrec` and `propagate` at the model EPOCH
    - **Property 2: Column model of the TLE fields**
    - **Validates: Requirements 2.8, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.24, 5.11**

  - [x] 3.6 Run the suite and commit task 3
    - Run `pnpm test` (exit 0) and `pnpm run typecheck` (zero errors)
    - Stage by name: `src/lib/orbit/tle-parser.ts`, `src/lib/orbit/index.ts`, `tests/helpers/baseline.ts`, `tests/orbit/tle-parser.test.ts`, the files of 3.3 to 3.5 that were written, `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`, no scratch script); commit, for example `Add TLE parser`. Do not push
    - _Requirements: 4.25_

- [x] 4. Implement the TLE_Cache and the TLE_Fetcher
  - [x] 4.1 Implement `TleCache` in `tle-cache.ts`
    - Internal `Map`-based cache of `{ record, storedAtMs }` entries keyed by NORAD number, created empty; `set` replaces an entry; entries are never deleted; no persistent storage; not exported from `index.ts`
    - _Requirements: 5.1, 5.5, 5.9_

  - [x] 4.2 Write the Mock_CelesTrak_Fetch helper
    - `tests/helpers/mock-celestrak.ts`: `createMockCelestrakFetch()` answering status 200, `text/plain`, the ISS TLE from `baseline.ts` with the name line right-padded to 24 characters and CRLF endings; configurable variants for other bodies, statuses, synchronous throws, rejections and never-settling requests; every variant records `{ url, init }` in its own array (no `vi.fn`)
    - _Requirements: 3.12, 3.13, 5.10_

  - [x] 4.3 Implement `createTleFetcher` in `tle-fetcher.ts`
    - Options check (`invalid-input` for a non-object `options` or a non-function `fetch` or `now`); the synchronous part of `fetchTle` in the design's order: catalog-number check without calling the Fetch_Function, In_Flight_Request lookup, Cache_Clock reading through `toTimeMs` with `nowMs − storedAtMs < TLE_CACHE_TTL_MS` as the freshness test (negative ages fresh), and synchronous registration of the request promise whose body starts in a later microtask (D11, D12)
    - `runRequest` as in the design's pseudocode: exact URL, init `{ method: 'GET', credentials: 'omit', signal }` without headers, Fetch_Function read per request and called as a plain function, `AbortController` plus a 15 s timer raced against the exchange and the body read with a no-op handler on the timeout promise, the error categories `network`, `http` (with `status`, body unread), `invalid-tle` and `catalog-mismatch`, cache store only on success, and timer clearing and map removal in `finally`
    - Export `createTleFetcher` and the types `FetchFunction`, `TleFetcher`, `TleFetcherOptions` from `index.ts`
    - _Requirements: 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.14, 3.15, 3.16, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.11, 5.12_

  - [x] 4.4 Write the fetcher example tests
    - `tests/orbit/tle-fetcher.test.ts`: 3.12 and 3.13 with the Mock_CelesTrak_Fetch; 5.10 with the Cache_Clock at Entry_Age TTL − 1 ms (served from the cache) and TTL (new request); 3.5 (two successive `globalThis.fetch` mocks installed after import); 3.10 bodies `No GP data found`, `''` and `[]`; the 3.15 variants; 3.16 with `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })`, a never-settling mock that ignores the signal, two waiting callers and `await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)`; 5.2; 5.5 (refetch with a later epoch replaces the entry); 5.9
    - Run `pnpm exec vitest run tests/orbit/tle-fetcher.test.ts`
    - _Requirements: 3.5, 3.10, 3.12, 3.13, 3.15, 3.16, 5.2, 5.3, 5.4, 5.5, 5.9, 5.10_

  - [x] 4.5 Write the Live_Test and run it once
    - `tests/orbit/live-celestrak.test.ts`: `it.skipIf(!process.env.ZOMBIESAT_LIVE_TEST)(…, 30_000)`; the body installs the guard's `builtinFetch` as `globalThis.fetch`, calls `createTleFetcher().fetchTle(25544)` once without a Fetch_Function, restores the blocker in `finally`, and asserts only `NORAD_CAT_ID === 25544`, `OBJECT_ID === '98067A'` and `OBJECT_NAME === 'ISS (ZARYA)'`
    - Run `pnpm exec vitest run tests/orbit/live-celestrak.test.ts` without the variable and confirm that the test is reported as skipped and the exit code is 0
    - Run the Live_Test exactly once for this spec: `$env:ZOMBIESAT_LIVE_TEST = "1"; pnpm exec vitest run tests/orbit/live-celestrak.test.ts; Remove-Item Env:ZOMBIESAT_LIVE_TEST`. Do not repeat it here or in any later task; if it fails with `network` or `http` (for example 403), report the result to the user instead of retrying
    - _Requirements: 14.3, 14.4, 14.5, 14.11_

  - [x] 4.6 Add the fetcher generators to `tests/helpers/arbitraries.ts`
    - `mutationArb(tle)` (the mutation operators of Property 3), `invalidNoradArb` (Property 13) and `failureScenarioArb` (the six failure scenarios of Property 14 with generated causes and statuses, built on the mock variants of 4.2); create the file if 3.3 was skipped
    - _Requirements: 3.7, 3.8, 3.9, 3.10, 3.11, 3.15_

  - [x] 4.7 Write the property test for malformed TLE text
    - `tests/orbit/property-03-malformed-tle.test.ts`; checks both `parseTle` and `fetchTle` with a status-200 mock returning the mutated body; uses `mutationArb` from 4.6 and the generated TLEs of 3.3
    - **Property 3: Malformed TLE text is rejected**
    - **Validates: Requirements 2.7, 3.10, 4.11, 4.12, 4.13, 4.14, 4.15, 4.21, 4.22**

  - [x] 4.8 Write the property test for successful fetches
    - `tests/orbit/property-12-fetch-success.test.ts`
    - **Property 12: Successful fetch for any catalog number**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.14**

  - [x] 4.9 Write the property test for invalid catalog numbers
    - `tests/orbit/property-13-invalid-catalog-numbers.test.ts`
    - **Property 13: Invalid catalog numbers never reach the Fetch_Function**
    - **Validates: Requirements 2.7, 3.7**

  - [x] 4.10 Write the property test for failed requests
    - `tests/orbit/property-14-fetch-failures.test.ts`
    - **Property 14: Failed requests are classified and leave the cache unchanged**
    - **Validates: Requirements 2.7, 3.8, 3.9, 3.11, 3.15, 5.6**

  - [x] 4.11 Write the property test for cache freshness
    - `tests/orbit/property-15-cache-freshness.test.ts`; offsets from −3·TTL to +3·TTL with TTL − 1 and TTL always included
    - **Property 15: Cache freshness follows Entry_Age**
    - **Validates: Requirements 5.3, 5.4, 5.8, 5.12**

  - [x] 4.12 Write the property test for concurrent callers
    - `tests/orbit/property-16-in-flight-dedupe.test.ts`
    - **Property 16: Concurrent callers share one In_Flight_Request**
    - **Validates: Requirements 5.7**

  - [x] 4.13 Run the suite and commit task 4
    - Run `pnpm test` (exit 0, Live_Test reported as skipped) and `pnpm run typecheck` (zero errors)
    - Stage by name: `src/lib/orbit/tle-cache.ts`, `src/lib/orbit/tle-fetcher.ts`, `src/lib/orbit/index.ts`, `tests/helpers/mock-celestrak.ts`, `tests/orbit/tle-fetcher.test.ts`, `tests/orbit/live-celestrak.test.ts`, the files of 4.6 to 4.12 that were written, `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`); commit, for example `Add TLE cache and CelesTrak fetcher`. Do not push
    - _Requirements: 14.1, 14.3_

- [x] 5. Implement Satrec creation, SGP4 propagation, look angles and range rate
  - [x] 5.1 Implement `validate.ts` and `createSatrec` in `satrec.ts`
    - `assertObserver`, `assertTleRecord` and `assertSatrec` with the structural checks of the design's validation table (`assertSatrec` checks types only, because satellite.js 6.0.2 `sgp4` clears `error` on every call)
    - `createSatrec(tle)`: `assertTleRecord`, then `twoline2satrec(TLE_LINE1, TLE_LINE2)` with the stored strings unchanged; a thrown exception or a non-zero error code gives `invalid-tle` (D18 order)
    - Export `createSatrec` and the `Satrec` type from `index.ts`
    - _Requirements: 2.7, 2.11, 6.1, 6.10, 7.4_

  - [x] 5.2 Add the propagator test helpers
    - `tests/helpers/baseline.ts`: add the Reference_Observer (section 4.1) and the section 4.3 instants with their ECI, ECF, GMST, look-angle and range-rate values, copied from the Reference_Document and requirements.md
    - `tests/helpers/oracles.ts`: the independent look-angle oracle (C30, C34–C37 applied to an ECF position) and the range-rate oracle `(Rz(−θ)·v_teme − ω⊕ × r_ecf) · (r_ecf − r_obs) / ρ`
    - `tests/helpers/arbitraries.ts`: add `observerArb({ altitudeKm })` and `instantArb(fromMs, toMs)` with fractional variants; create the file if earlier generator sub-tasks were skipped. These generators are required because Properties 9, 11 and 23 use them
    - _Requirements: 7.1, 8.1, 8.2, 14.7_

  - [x] 5.3 Implement `propagateAt` in `propagator.ts`
    - Types `Vec3`, `PropagationSuccess`, `PropagationFailure`, `PropagationResult` (D5); `propagateAt` runs `assertSatrec`, `toTimeMs` and the internal `propagateMs`: `gstime`, `propagate` (an exception counts as a failure), the failure conditions of Requirement 6, criterion 5 with `satrecError`, `eciToEcf`, and fresh `Vec3` copies of position, velocity and ECF position
    - Export `propagateAt` and the propagation types from `index.ts`
    - _Requirements: 2.4, 2.7, 2.9, 6.2, 6.3, 6.4, 6.5, 6.6, 6.11, 6.12_

  - [x] 5.4 Implement `observeAt`, the range rate and `normalizeAzimuthDeg` in `propagator.ts`
    - Types `Observer`, `LookAngles`, `ObservationSuccess`, `ObservationResult`; `normalizeAzimuthDeg` exactly as in the design (D7); internal `prepareObserver` (`geodeticToEcf` once per Observer) and `observeMs` (`ecfToLookAngles`, `radToDeg`, Elevation clamp to [−90, 90], range rate with the Earth-rotation term)
    - `observeAt` runs `assertSatrec`, `toTimeMs` and `assertObserver` before any propagation, so an invalid Observer gives `invalid-input` also where SGP4 fails
    - Export `observeAt`, `normalizeAzimuthDeg` and the observation types from `index.ts`
    - _Requirements: 2.6, 2.11, 7.1, 7.2, 7.3, 7.4, 7.8, 7.10, 8.1, 8.2, 8.3, 8.4_

  - [x] 5.5 Write the propagator example tests
    - `tests/orbit/propagator.test.ts`: 6.7 to 6.9 (ECI and ECF within ±0.1 km per component, GMST within ±1 × 10⁻⁸ rad); 6.10 with a hand-built TleRecord whose line 2 has mean motion `00.00000000` (satellite.js error 2) passed to `createSatrec`; 6.13 (ISS at 2036-11-05T04:12:35.430Z gives `ok: false` with `satrecError` 6)
    - Run `pnpm exec vitest run tests/orbit/propagator.test.ts`
    - _Requirements: 6.7, 6.8, 6.9, 6.10, 6.13_

  - [x] 5.6 Write the look-angle example tests
    - `tests/orbit/look-angles.test.ts`: 7.5 to 7.7 (±0.01°, ±0.1 km); 7.8 (`normalizeAzimuthDeg(360)` is `+0`, `(2π / π) · 180 === 360`); 7.9 (1 km Observer altitude: same Azimuth ±0.01°, same horizontal distance ±0.1 km, vertical distance 1 km smaller ±0.1 km)
    - Run `pnpm exec vitest run tests/orbit/look-angles.test.ts`
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9_

  - [x] 5.7 Write the range-rate example tests
    - `tests/orbit/range-rate.test.ts`: 8.5 to 8.7 (±0.01 km/s); 8.3 (the rotate-only value, computed in the test with `eciToEcf` applied to the velocity, misses each baseline by more than 0.01 km/s while the engine's value meets it)
    - Run `pnpm exec vitest run tests/orbit/range-rate.test.ts`
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 5.8 Write the property test for agreement with satellite.js
    - `tests/orbit/property-08-satellitejs-agreement.test.ts`; records from the baselines and from `tleFieldsArb`/`formatTle` of 3.3
    - **Property 8: The Propagator agrees with satellite.js**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.11, 6.12**

  - [x] 5.9 Write the property test for look angles
    - `tests/orbit/property-09-look-angles.test.ts`; required by Requirement 14, criterion 7 (at least 100 cases, seed reported by fast-check)
    - **Property 9: Look angles follow formula 2.9.2 and stay in range**
    - **Validates: Requirements 7.1, 7.2, 7.3, 14.7**

  - [x] 5.10 Write the property test for azimuth normalisation
    - `tests/orbit/property-10-azimuth-normalisation.test.ts`; imports `radToDeg` from `constants.ts`
    - **Property 10: Azimuth normalisation**
    - **Validates: Requirements 7.8, 7.10**

  - [x] 5.11 Write the property test for the range rate
    - `tests/orbit/property-11-range-rate.test.ts`; required by Requirement 14, criterion 7 (at least 100 cases, seed reported by fast-check)
    - **Property 11: Range rate matches its definition and the measured range change**
    - **Validates: Requirements 8.1, 8.2, 8.4, 8.8, 8.9, 14.7**

  - [x] 5.12 Run the suite and commit task 5
    - Run `pnpm test` (exit 0) and `pnpm run typecheck` (zero errors)
    - Stage by name: `src/lib/orbit/validate.ts`, `src/lib/orbit/satrec.ts`, `src/lib/orbit/propagator.ts`, `src/lib/orbit/index.ts`, `tests/helpers/baseline.ts`, `tests/helpers/oracles.ts`, `tests/helpers/arbitraries.ts`, `tests/orbit/propagator.test.ts`, `tests/orbit/look-angles.test.ts`, `tests/orbit/range-rate.test.ts`, `tests/orbit/property-09-look-angles.test.ts`, `tests/orbit/property-11-range-rate.test.ts`, the files of 5.8 and 5.10 if written, `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`); commit, for example `Add SGP4 propagation, look angles and range rate`. Do not push
    - _Requirements: 14.7_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - If this checkpoint changes any file, commit those files by name in one commit (never `.kiro/steering/workflow.md`); do not push.

- [x] 7. Implement the refinement primitives
  - [x] 7.1 Implement `coarseScanInstants`, `bisectCrossing` and `maximizeOnGrid` in `refine.ts`
    - `coarseScanInstants(S, E)`: S, S + k · 60 000 while below E, then E when E > S
    - `bisectCrossing`: integer midpoints `lo + Math.floor((hi − lo) / 2)` while `hi − lo > 1000`, returning `hi` (D13, D16)
    - `maximizeOnGrid`: Brent's method for a maximum on integer instants with the design's adaptations (both ends evaluated first, start point `x0` or the golden-section point, parabolic step only with distinct points and finite values, rounding and the ±1 ms fallback strictly inside the bracket, loop while `b − a > 100`); returns every evaluated instant (D15)
    - Internal module, not exported from `index.ts`; the Pass_Predictor of task 8 uses it
    - _Requirements: 10.1, 10.2, 10.3, 10.11, 12.1, 12.5, 12.6_

  - [x] 7.2 Write the property test for the Coarse_Scan instants
    - `tests/orbit/property-17-coarse-scan.test.ts`; imports from `refine.ts`
    - **Property 17: Coarse_Scan instants**
    - **Validates: Requirements 10.1**

  - [x] 7.3 Write the property test for crossing bisection
    - `tests/orbit/property-18-bisection.test.ts`; imports from `refine.ts`
    - **Property 18: Crossing bisection**
    - **Validates: Requirements 10.2, 10.11, 12.5, 12.6**

  - [x] 7.4 Write the property test for the peak search
    - `tests/orbit/property-19-peak-search.test.ts`; adds `unimodalArb` (bell, cusp and monotone shapes, scaled and shifted, including x* at a bracket end) to `tests/helpers/arbitraries.ts`
    - **Property 19: Peak search on the integer grid**
    - **Validates: Requirements 10.3, 11.5**

  - [x] 7.5 Run the suite and commit task 7
    - Run `pnpm test` (exit 0) and `pnpm run typecheck` (zero errors)
    - Stage by name: `src/lib/orbit/refine.ts`, the files of 7.2 to 7.4 that were written (including `tests/helpers/arbitraries.ts` if 7.4 changed it), `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`); commit, for example `Add pass refinement primitives`. Do not push
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 8. Implement the Pass_Predictor
  - [x] 8.1 Implement `predictPasses` with validation, the Coarse_Scan and pass runs in `pass-predictor.ts`
    - Types `PassSearch` and `Pass` (D6); step 1 validation in the D18 order (`search` object, Observer, TleRecord, start through `toTimeMs`, `durationHours` and `minElevationDeg` tested with `=== undefined` for the defaults 24 h and 0°, window end `S + Math.round(h · 3 600 000)` within ±8.64 × 10¹⁵ ms (D14), then `createSatrec`)
    - Step 2 memoised elevation oracle on integer instants with one prepared Observer (`above` strict, `score` with −∞ for propagation failures); step 3 `coarseScanInstants`; step 4 passes from runs of samples above Min_Elevation with truncation flags, `bisectCrossing` for rise and set, the peak bracket rules including the window-edge brackets, and the peak as the earliest argmax of every instant evaluated by `maximizeOnGrid` inside [rise, set] (D15); step 6 sorting by rise and `durationMin = (setMs − riseMs) / 60_000`
    - Export `predictPasses` and the types `PassSearch`, `Pass` from `index.ts`
    - _Requirements: 2.4, 2.7, 2.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14, 9.15, 10.1, 10.2, 10.3, 10.8, 10.9, 10.10, 10.11, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 8.2 Add the refinement of sub-threshold Coarse_Scan_Maxima
    - Step 5 of the design: detect every Coarse_Scan_Maximum at or below Min_Elevation (failure samples never qualify and count as lowest), refine it with `maximizeOnGrid` inside the bracket of its neighbouring samples or window bounds, and for a refined instant above Min_Elevation report a Pass with that peak, rise and set by `bisectCrossing` from the peak to the bracket ends, and both flags false; merge these Passes into the step 6 assembly
    - _Requirements: 9.5, 11.3, 11.4, 12.1, 12.2, 12.3, 12.5, 12.6, 12.7_

  - [x] 8.3 Write the Pass_Predictor example tests
    - `tests/helpers/baseline.ts`: add the section 4.7 values of ISS pass 2 (rise 11:18:05Z, peak 11:23:24Z at 48.6098°, set 11:28:47Z)
    - `tests/orbit/pass-predictor.test.ts`: 9.1 to 9.3 (defaults equal explicit 24 h and 0°, by omission and by passing `undefined`); 9.11 (ISS window starting at EPOCH + 3650 days returns `[]`); 11.7 and 11.8 (Peak_Instant exactly at the window bound); 11.9
    - `tests/orbit/propagator.test.ts`: add the 9.15 case, the hand-built TleRecord of 5.5 passed to `predictPasses`, which gives `invalid-tle`
    - Run `pnpm exec vitest run tests/orbit/pass-predictor.test.ts tests/orbit/propagator.test.ts`
    - _Requirements: 9.1, 9.2, 9.3, 9.11, 9.15, 11.5, 11.7, 11.8, 11.9_

  - [x] 8.4 Write the property test for invalid pass parameters
    - `tests/orbit/property-06-invalid-pass-parameters.test.ts`; adds `invalidDurationArb` and `invalidMinElevationArb` to `tests/helpers/arbitraries.ts`
    - **Property 6: Invalid pass parameters are rejected**
    - **Validates: Requirements 2.7, 9.8, 9.9**

  - [x] 8.5 Write the property test for the pass list invariants
    - `tests/orbit/property-20-pass-invariants.test.ts`; generators composed inline from `observerArb` and `instantArb`
    - **Property 20: Pass list invariants**
    - **Validates: Requirements 2.8, 9.4, 9.5, 9.6, 9.7, 9.13, 10.2, 10.8, 10.11, 11.1, 11.2, 11.3, 11.4, 11.6, 12.5, 12.6, 12.7**

  - [x] 8.6 Write the property test for Min_Elevation +90°
    - `tests/orbit/property-21-no-pass-above-90.test.ts`
    - **Property 21: No passes above +90°**
    - **Validates: Requirements 9.14**

  - [x] 8.7 Run the suite and commit task 8
    - Run `pnpm test` (exit 0) and `pnpm run typecheck` (zero errors)
    - Stage by name: `src/lib/orbit/pass-predictor.ts`, `src/lib/orbit/index.ts`, `tests/helpers/baseline.ts`, `tests/orbit/pass-predictor.test.ts`, `tests/orbit/propagator.test.ts`, the files of 8.4 to 8.6 that were written (including `tests/helpers/arbitraries.ts` if 8.4 changed it), `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`); commit, for example `Add pass predictor`. Do not push
    - _Requirements: 9.1, 9.11, 11.7_

- [ ] 9. Verify the Pass_Predictor against the Brute_Force_Reference and the baselines
  - [x] 9.1 Write the Brute_Force_Reference helper and the pass baseline data
    - `tests/helpers/brute-force.ts`: `bruteForceSamples(satrec, observer, startMs, endMs)` evaluating `observeAt` at the start, every 1 s step before the end and the end into a `Float64Array` (NaN for a failure), never calling `predictPasses`; `bruteForcePasses(samples, minEl)` returning the maximal runs with `riseMs`, `lastAboveMs`, `setMs`, `peakDeg`, `peakMs`, `beforeMs`; and the overlap rule `riseMs ≤ pass.setMs && lastAboveMs ≥ pass.riseMs` used for the exemption of passes without exactly one Brute_Force_Pass
    - `tests/helpers/baseline.ts`: add the section 4.6 ISS and ZHIHUI TIANWANG-1 01A pass tables and the 58.5919° peak of ISS pass 6 from Requirement 10, criterion 4
    - _Requirements: 10.12, 14.6_

  - [x] 9.2 Write the pass baseline tests
    - `tests/orbit/pass-baselines.test.ts`: one `it` per criterion of 13.1 to 13.9, none skipped (13.10), with every stated value and tolerance; 10.4 (passes 2 and 6 within ±0.5° of 48.61° and 58.59°); 13.6 against Brute_Force_References of the three runs (13.1, 13.5, 13.7) computed in a `beforeAll` hook with a 120 000 ms timeout (D20)
    - Run `pnpm exec vitest run tests/orbit/pass-baselines.test.ts`
    - _Requirements: 10.4, 10.5, 10.6, 10.7, 12.1, 12.2, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 14.6, 14.11_

  - [x] 9.3 Write the property test for agreement with the Brute_Force_Reference
    - `tests/orbit/property-22-brute-force-agreement.test.ts`; samples for the six satellite–Observer pairs computed once in a 120 000 ms `beforeAll` and reused for every generated Min_Elevation; passes without exactly one Brute_Force_Pass exempted (10.12)
    - **Property 22: Agreement with the Brute_Force_Reference**
    - **Validates: Requirements 10.5, 10.6, 10.7, 10.12, 12.1, 12.2, 12.3**

  - [x] 9.4 Write the property test for window-shift stability
    - `tests/orbit/property-23-window-shift.test.ts`; required by Requirement 14, criterion 7 (at least 100 cases, seed reported by fast-check); Min_Elevation biased toward [−10°, 60°], composed inline from `observerArb` and `instantArb`; 60 000 ms timeout (D20)
    - **Property 23: Window-shift stability**
    - **Validates: Requirements 12.4, 14.7**

  - [-] 9.5 Run the suite and commit task 9
    - Run `pnpm test` (exit 0) and `pnpm run typecheck` (zero errors)
    - Stage by name: `tests/helpers/brute-force.ts`, `tests/helpers/baseline.ts`, `tests/orbit/pass-baselines.test.ts`, `tests/orbit/property-23-window-shift.test.ts`, `tests/orbit/property-22-brute-force-agreement.test.ts` if written, `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`); commit, for example `Add pass baseline and stability tests`. Do not push
    - _Requirements: 13.10_

- [ ] 10. Complete the Public_Interface and add the cross-cutting checks
  - [ ] 10.1 Align `index.ts` with the design's Public_Interface table
    - Confirm that `index.ts` exports exactly the functions, the class, the two constants and the types of the table, and none of the internals (`TleCache`, `toTimeMs`, the `assert*` validators, `propagateMs`, `observeMs`, `prepareObserver`, the `refine.ts` functions, `radToDeg`, other constants); add or remove exports as needed
    - _Requirements: 2.1, 2.2, 7.10_

  - [ ] 10.2 Write the no-DOM environment test
    - `tests/orbit/environment.test.ts`: save the own property descriptors of `window`, `document`, `navigator`, `localStorage` and `indexedDB` on `globalThis`, delete the existing ones, assert that all five are `undefined`, call every Public_Interface function with valid inputs (`fetchTle` with the Mock_CelesTrak_Fetch, `predictPasses` over 24 h), and restore the descriptors in `finally`
    - Run `pnpm exec vitest run tests/orbit/environment.test.ts`
    - _Requirements: 2.3, 14.9_

  - [ ] 10.3 Write the time-zone repeat test
    - `tests/orbit/timezone.test.ts` (60 000 ms timeout, D20, D23): `computeAll()` builds fresh inputs and returns plain data for 4.18, 4.19, 6.7 to 6.9, 7.5 to 7.7, 8.5 to 8.7 and the `predictPasses` runs of 13.1, 13.5 and 13.7, with errors captured as `{ category, message }`; set `process.env.TZ = 'UTC'`, assert the offset 0 for 2026-11-09T00:00:00Z, compute; set `'Asia/Shanghai'`, assert −480, compute; assert `toStrictEqual`; restore or delete `TZ` in `finally`
    - Run `pnpm exec vitest run tests/orbit/timezone.test.ts`
    - _Requirements: 2.5, 14.8, 14.10, 14.11_

  - [ ] 10.4 Add the invalid-input generators to `tests/helpers/arbitraries.ts`
    - `invalidInstantArb`, `invalidObserverArb`, `invalidRecordArb` and `invalidSatrecArb` as described in Properties 4 and 5 (including numeric strings such as `"39.9"`)
    - _Requirements: 2.9, 2.11, 7.4_

  - [ ] 10.5 Write the property test for invalid instants
    - `tests/orbit/property-04-invalid-instants.test.ts`
    - **Property 4: Invalid instants are rejected**
    - **Validates: Requirements 2.7, 2.9, 6.6, 9.10**

  - [ ] 10.6 Write the property test for invalid structured inputs
    - `tests/orbit/property-05-invalid-structures.test.ts`; includes `observeAt` at ISS EPOCH + 3650 days
    - **Property 5: Invalid structured inputs are rejected**
    - **Validates: Requirements 2.7, 2.11, 7.4, 9.12**

  - [ ] 10.7 Write the property test for Date and millisecond inputs
    - `tests/orbit/property-07-date-ms-equivalence.test.ts`
    - **Property 7: Date and millisecond inputs are interchangeable**
    - **Validates: Requirements 2.4**

  - [ ] 10.8 Run the suite and commit task 10
    - Run `pnpm test` (exit 0) and `pnpm run typecheck` (zero errors)
    - Stage by name: `src/lib/orbit/index.ts` (if 10.1 changed it), `tests/orbit/environment.test.ts`, `tests/orbit/timezone.test.ts`, the files of 10.4 to 10.7 that were written, `.kiro/specs/orbit-engine/tasks.md`; check `git diff --cached --name-only` (no `.kiro/steering/workflow.md`); commit, for example `Add public interface and cross-cutting engine checks`. Do not push
    - _Requirements: 2.3, 2.5_

- [ ] 11. Final checkpoint - Verify the whole project and push once
  - Ensure all tests pass, ask the user if questions arise.
  - Run, in this order: `pnpm install --frozen-lockfile` (exit 0), `pnpm test` (single run, exit 0, Live_Test reported as skipped), `pnpm run build` (exit 0, `/` listed as static), `pnpm run typecheck` (zero errors; after the build, as Requirement 1, criterion 18 requires). Do not run the Live_Test again.
  - If any fix was needed, commit the changed files by name in one commit; never stage `.kiro/steering/workflow.md`.
  - Run `git status`: apart from `.kiro/steering/workflow.md`, the only allowed uncommitted change is the task status in `.kiro/specs/orbit-engine/tasks.md`; if it changed, commit it by name. Then push once with `git push origin main`.
  - _Requirements: 1.12, 1.14, 1.15, 1.17, 1.18, 13.10, 14.1, 14.3_

## Notes

- Sub-tasks marked with `*` are optional and can be skipped for a faster MVP. Test sub-tasks without `*` are required because a requirement makes the test a deliverable (Requirement 4, criterion 25; Requirement 5, criterion 10; Requirement 13, criterion 10; Requirement 14, including the property tests that criterion 7 demands: Properties 9, 11 and 23) or because the steering rule places the verification of the section 4 baselines in the acceptance tests of the implementation phase.
- An optional sub-task can depend on an earlier optional generator sub-task: 3.4, 3.5 and 5.8 use 3.3; 4.7 to 4.10 use 4.6 (4.7 also uses 3.3); 10.5 and 10.6 use 10.4. Enable them together.
- Each property test lives in its own file `tests/orbit/property-NN-<topic>.test.ts`, in one `it` block tagged `// Feature: orbit-engine, Property N: <title>`, uses `fc.assert(…, { numRuns })` and the timeouts of the design's "Property test settings" table (D20, D21), and awaits every async assertion.
- Parallel sub-tasks run only their own test files with `pnpm exec vitest run <path>`; the commit sub-task of each top-level task runs the whole suite. `pnpm test` stays offline: the network guard of 1.3 fails any test that reaches the built-in `fetch`, and the Live_Test runs exactly once, in 4.5.
- Package manager: the project uses pnpm 10.30.3 (D26), decided by the project owner on 2026-11-15 in place of npm. The commands are `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm run build`, `pnpm run typecheck` and `pnpm exec <bin>`. `pnpm-lock.yaml` is committed; `package-lock.json` is never committed.
- Git: one local commit per top-level task, staging files by name with `git add -- <paths>` and checking `git diff --cached --name-only` before committing. The first commit (1.5) includes the spec documents. `.kiro/steering/workflow.md` holds an uncommitted change by the user and is never staged. Later commits include `.kiro/specs/orbit-engine/tasks.md` for the task status. The only push is the one in task 11.
- Expected values come from sections 2 and 4 of the Reference_Document and from requirements.md, and are copied, not recomputed. satellite.js stays pinned to 6.0.2, and all instants are UTC.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4"] },
    { "id": 3, "tasks": ["1.5"] },
    { "id": 4, "tasks": ["2.1"] },
    { "id": 5, "tasks": ["2.2"] },
    { "id": 6, "tasks": ["2.3"] },
    { "id": 7, "tasks": ["3.1"] },
    { "id": 8, "tasks": ["3.2", "3.3"] },
    { "id": 9, "tasks": ["3.4", "3.5"] },
    { "id": 10, "tasks": ["3.6"] },
    { "id": 11, "tasks": ["4.1", "4.2"] },
    { "id": 12, "tasks": ["4.3"] },
    { "id": 13, "tasks": ["4.4", "4.5", "4.6"] },
    { "id": 14, "tasks": ["4.7", "4.8", "4.9", "4.10", "4.11", "4.12"] },
    { "id": 15, "tasks": ["4.13"] },
    { "id": 16, "tasks": ["5.1", "5.2"] },
    { "id": 17, "tasks": ["5.3"] },
    { "id": 18, "tasks": ["5.4"] },
    { "id": 19, "tasks": ["5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11"] },
    { "id": 20, "tasks": ["5.12"] },
    { "id": 21, "tasks": ["7.1"] },
    { "id": 22, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 23, "tasks": ["7.5"] },
    { "id": 24, "tasks": ["8.1"] },
    { "id": 25, "tasks": ["8.2"] },
    { "id": 26, "tasks": ["8.3", "8.4", "8.5", "8.6"] },
    { "id": 27, "tasks": ["8.7"] },
    { "id": 28, "tasks": ["9.1"] },
    { "id": 29, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 30, "tasks": ["9.5"] },
    { "id": 31, "tasks": ["10.1", "10.4"] },
    { "id": 32, "tasks": ["10.2", "10.3", "10.5", "10.6", "10.7"] },
    { "id": 33, "tasks": ["10.8"] }
  ]
}
```
