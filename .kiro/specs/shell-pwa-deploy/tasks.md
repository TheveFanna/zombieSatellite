# Implementation Plan: shell-pwa-deploy (S6)

## Overview

Build S6 exactly as specified in `design.md`: the pure `src/lib/shell` core, the TLE_Proxy route and the browser switch to it, the App_Shell with the Home_Page and the PWA minimum set, the Deployment (a stop point in the middle), geolocation, the Sky_View with the Camera_Backdrop and the Local_Time_Note, the Device_Checklist on the Deployed_Build, and the Submission_Materials. Language: TypeScript (strict, ES modules); tests in Vitest, `node` environment.

Ground rules for the implementer:

- `requirements.md` and `design.md` in this folder are the specification. Read the design sections named in each sub-task before writing code. Do not deviate from the file layout, names, signatures, constants, statuses, headers and copy strings given there. Where design.md and requirements.md differ, requirements.md wins; if you find such a difference, or design.md seems insufficient, stop and ask instead of extending scope.
- Approved decisions DD-1 to DD-6 of design.md apply as written: the Sky_View with the marker is new UI built on the landed `projectMarker` (DD-1); Sky_View and Camera_Backdrop only in real-time `in-pass` (DD-2); Local_Time_Note on the Picker_Page, rise time only (DD-3); manifest values of DD-4; `UPSTREAM_GP_URL` duplicated with an equality test (DD-5); Automatic_Locate at most once per browser profile (DD-6).
- Copy: the four drafted texts (`SHELL_COPY.appStatement`, `SHELL_COPY.honestyFooter`, the README honesty statement and the Devpost tagline) are used verbatim as they stand in design.md. Every other new page string comes from `SHELL_COPY` as listed in design "Shell copy". If check 1.24 or 1.25 fails, reword the copy, never the check.
- Do not modify anything under `src/lib/orbit`, `src/lib/catalog`, `src/lib/pointing`, `src/lib/session`, `src/lib/qsl`, `src/components/pointing`, `src/components/qsl`, `src/app/pointing`, `src/app/cards`, or any existing test file other than `tests/scaffold/scaffold.test.ts`. The permitted edits of landed files are: `src/components/session/browser-deps.ts` (the one `fetch` option, task 2), `src/app/layout.tsx` and `src/app/page.tsx` (task 3), `src/app/session/page.tsx` and `src/app/session/[noradId]/page.tsx` (tasks 5 and 6), `tests/scaffold/scaffold.test.ts` (extensions only, tasks 2 and 3) and `README.md` (tasks 4 and 9).
- `next.config.ts` is never edited and never staged. It may carry a developer's uncommitted `allowedDevOrigins` edit; leave it as it is.
- Imports: inside `src/lib/shell` only relative paths inside that directory plus `../orbit/index` and `../pointing/index`; elsewhere relative paths (no `@/` alias). Tests import the shell core only through `src/lib/shell/index`, except the DD-5 equality test, which also imports `src/lib/orbit/constants.ts`.
- Tests: plain example assertions, exactly the cases of design "Testing Strategy". No fast-check, no extra cases, no scanner self-tests, no negative instrumentation, no real network, camera or geolocation. Every fetch is an injected mock; the network guard stays in force.
- Tests run in the Vitest `node` environment. Do not add jsdom, happy-dom, a React testing library or any other package. `package.json` and `pnpm-lock.yaml` stay unchanged.
- Times: every displayed UTC instant still comes from `formatUtc`; the only new time text is `formatLocalTimeNote` on the Picker_Page.
- Test command: `pnpm vitest run <paths>`; full suite: `pnpm test`; typecheck: `pnpm typecheck`; build: `pnpm run build`.
- Commit and push: the main agent commits locally once per top-level task, after that task's tests and `pnpm typecheck` pass, staging files by name (never `git add -A` or `git add .`), then pushes immediately. Never push in the middle of a task. The three spec documents and `.config.kiro` are committed with task 1. Commit message style: `feat(shell): <summary> (S6 task N)`, `test(shell): ...` or `docs(shell): ...`.
- Execution is serial by default; each code task depends on the one before it. Tasks 8 and 10 touch disjoint documentation files and may run as parallel sub-agents after task 7; sub-agents write only, the main agent commits and pushes serially.

## Tasks

- [ ] 1. Shell core: proxy logic, URL rewrite, marker placement, local time, source boundary
  - Depends on: nothing (first task).
  - [ ] 1.1 Create `src/lib/shell/tle-proxy.ts`
    - `TLE_PROXY_PATH`, `UPSTREAM_GP_URL`, `PROXY_CACHE_SECONDS` (from `TLE_CACHE_TTL_MS`), `parseCatnr`, `upstreamUrl`, `createTleProxyHandler` per design "TLE proxy": the status, body and `Cache-Control` table row by row, `Content-Type: text/plain; charset=utf-8` on every response, upstream init `{ method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }`, body check with `parseTle` and the `NORAD_CAT_ID` match.
    - _Requirements: 6.1–6.8, 12.1_
  - [ ] 1.2 Create `src/lib/shell/proxy-url.ts`, `marker.ts`, `local-time.ts` and `index.ts`
    - `toProxyUrl` per design "Proxy fetch and the browser assembly".
    - `SKY_VIEW_ASPECT`, `MarkerPlacement`, `markerPlacement` per design "Camera backdrop and sky view" (target vector exactly as `evaluateLock` builds it).
    - `formatLocalTimeNote` per design "Time display".
    - `index.ts`: barrel of every name above.
    - _Requirements: 7.2, 7.3, 7.6, 9.6, 9.7, 10.3, 12.1_
  - [ ] 1.3 Create `tests/helpers/shell-source-scan.ts` and the core tests
    - `shell-source-scan.ts`: a copy of `tests/helpers/qsl-source-scan.ts` with root `src/lib/shell` and allowed outside files the `orbit` and `pointing` barrels.
    - `tests/shell/source-boundary.test.ts` (item 1), `tests/shell/tle-proxy.test.ts` (item 2, including the DD-5 equality), `tests/shell/proxy-url.test.ts` (item 3, `toProxyUrl` part only), `tests/shell/marker.test.ts` (item 6), `tests/shell/local-time.test.ts` (item 7) of design "Testing Strategy".
    - Run the `tests/shell` folder and `pnpm typecheck`.
    - _Requirements: 6.9, 7.6, 10.3, 12.2, 12.4, 12.5_
  - [ ] 1.4 Main agent: commit staging `.kiro/specs/shell-pwa-deploy/.config.kiro`, `requirements.md`, `design.md`, `tasks.md`, the five `src/lib/shell` files, `tests/helpers/shell-source-scan.ts` and the five test files by name, then push.

- [ ] 2. TLE proxy route and the browser switch
  - Depends on: task 1.
  - [ ] 2.1 Create `src/app/api/tle/route.ts` and `src/components/shell/proxy-fetch.ts`
    - `route.ts`: exactly the two lines of design "TLE proxy" (import and `export const GET`).
    - `proxy-fetch.ts`: `createProxyFetch(getFetch)` per design; rejection with `TypeError('Not a CelesTrak GP request')` without calling `getFetch`; no fallback branch.
    - _Requirements: 6.1, 7.2–7.4, 12.3_
  - [ ] 2.2 Switch `src/components/session/browser-deps.ts`
    - Change only the `createTleFetcher` call to `createTleFetcher({ now: clock.nowMs, fetch: createProxyFetch(() => globalThis.fetch.bind(globalThis)) })` and add the import. No other change to the file.
    - _Requirements: 7.1, 7.4, 7.5_
  - [ ] 2.3 Extend the tests
    - `tests/shell/proxy-url.test.ts`: add the `createProxyFetch` case of design "Testing Strategy" item 3.
    - `tests/scaffold/scaffold.test.ts`, check 1.19: the `src/app` listing becomes `['api', 'cards', 'layout.tsx', 'page.tsx', 'pointing', 'session']`; add the assertion that the `.ts` files under `src/app` are exactly `['api/tle/route.ts']` (task 3 adds `manifest.ts` to both lists). No other change.
    - Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass.
    - _Requirements: 7.6, 11.1, 11.2, 11.6_
  - [ ] 2.4 Main agent: commit staging `src/app/api/tle/route.ts`, `src/components/shell/proxy-fetch.ts`, `src/components/session/browser-deps.ts`, `tests/shell/proxy-url.test.ts` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 3. App shell, home page and PWA
  - Depends on: task 2.
  - [ ] 3.1 Create `src/components/shell/copy.ts`
    - `SHELL_COPY` exactly as design "Shell copy": plain string literals inside `Object.freeze({...})`, nested `unplayableReasons` frozen and `satisfies Record<UnplayableReason, string>`, the honesty rule comment at the top as in `src/components/session/copy.ts`.
    - _Requirements: 2.2, 2.4, 3.1, 3.2_
  - [ ] 3.2 Rewrite `src/app/page.tsx` and extend `src/app/layout.tsx`
    - `page.tsx`: server component per design "Home page", items 1 to 4; Catalog_Prose verbatim inside the "Documented history" block with its sources; no `statusNote`.
    - `layout.tsx`: header and navigation, `<ServiceWorkerRegistrar />`, the `metadata` additions and the `viewport` export per design "App shell and navigation". Both files keep checks 1.20 and 1.21.
    - _Requirements: 1.1–1.3, 1.5, 2.1–2.8, 4.4_
  - [ ] 3.3 Create the PWA files
    - `src/app/manifest.ts` exactly as design "Web App Manifest".
    - `scripts/generate-icons.mjs` per design "App icons"; run `node scripts/generate-icons.mjs` once and commit its three outputs in `public/icons/`.
    - `public/sw.js` per design "Service worker".
    - `src/components/shell/service-worker.ts` (`registerServiceWorker`) and `src/components/shell/service-worker-registrar.tsx` per design "Service worker registration".
    - _Requirements: 1.4, 4.1–4.3, 4.5, 5.1–5.3, 5.5_
  - [ ] 3.4 Extend the tests
    - `tests/shell/service-worker.test.ts`: design "Testing Strategy" item 8.
    - `tests/scaffold/scaffold.test.ts` per design "Scaffold check extensions": 1.19 listing adds `manifest.ts`, the `.tsx` inventory adds `components/shell/service-worker-registrar.tsx` (title updated), the `.ts` list becomes `['api/tle/route.ts', 'manifest.ts']`; `checkedTexts()` adds `shell copy strings`, `manifest strings` and the registrar's JSX text. No other change.
    - Run `pnpm test`, `pnpm typecheck` and `pnpm run build`; all must pass. Then `pnpm run start` locally and confirm by hand that `/` shows the home page and `/manifest.webmanifest` serves the manifest; stop the server.
    - _Requirements: 3.3, 3.4, 11.1–11.6, 12.4–12.6_
  - [ ] 3.5 Main agent: commit staging `src/components/shell/copy.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/manifest.ts`, `scripts/generate-icons.mjs`, the three `public/icons/*.png`, `public/sw.js`, `src/components/shell/service-worker.ts`, `src/components/shell/service-worker-registrar.tsx`, `tests/shell/service-worker.test.ts` and `tests/scaffold/scaffold.test.ts` by name, then push.

- [ ] 4. Deployment (stop point)
  - Depends on: task 3.
  - [ ] 4.1 Confirm the pushed `main` passes `pnpm test`, `pnpm typecheck` and `pnpm run build`, and that `git status` shows no staged or unpushed change (an unstaged `next.config.ts` edit is expected and stays).
    - _Requirements: 13.2, 13.6_
  - [ ] 4.2 STOP. Report to the project owner "ready to deploy" with the Vercel import points of design "Deployment" (steps 1 to 4). Do not deploy, do not install the Vercel CLI, and do not continue to task 5 until the owner reports the Live_URL.
    - _Requirements: 13.1, 13.3_
  - [ ] 4.3 After the owner reports the Live_URL: record it in this task with the date. Request `<Live_URL>/api/tle?CATNR=7530` once (PowerShell `Invoke-WebRequest`) and record the status; a 502 is reported to the owner (design Risk R-S6-1), not worked around. Add a "Live app" line with the Live_URL to `README.md`; run `pnpm vitest run tests/scaffold/scaffold.test.ts`.
    - _Requirements: 13.4, 13.5, 13.7_
  - [ ] 4.4 Main agent: commit staging `README.md` and `.kiro/specs/shell-pwa-deploy/tasks.md` by name, then push. From here on, every push redeploys the Deployed_Build.

- [ ] 5. Geolocation
  - Depends on: task 4.
  - [ ] 5.1 Create `src/components/shell/geolocation.ts` and `src/components/shell/browser-deps.ts`
    - `createLocator`, `GeolocationLike`, `LocateOutcome`, `AUTO_LOCATE_FLAG_KEY`, `LOCATE_OPTIONS` per design "Geolocation": stored-value check through `OBSERVER_STORAGE_KEY` and `parseStoredObserver`, the flag rule, the re-check on arrival, the error mapping, 4-decimal rounding; never rejects.
    - `browser-deps.ts`: `browserGeolocation()` only (task 6 adds `browserMediaDevices`).
    - _Requirements: 8.1–8.4, 8.6, 8.8, 8.9, 8.11_
  - [ ] 5.2 Wire both session pages
    - In `src/app/session/page.tsx` and `src/app/session/[noradId]/page.tsx`: create the locator next to the page controller with the controller's storage, call `autoLocate` after the controller is created, add the "Use my location" button with the `locating` and `locationFailed` states under the observer inputs, pass `controller.setObserver` as `apply` and reset the raw input text on `'applied'`. No other change; the manual inputs stay as they are.
    - _Requirements: 8.1, 8.4, 8.5, 8.7_
  - [ ] 5.3 Write `tests/shell/geolocation.test.ts`
    - The six cases of design "Testing Strategy" item 4. Run it, `pnpm test`, `pnpm typecheck` and `pnpm run build`.
    - _Requirements: 8.10, 12.4, 12.5_
  - [ ] 5.4 Main agent: commit staging `src/components/shell/geolocation.ts`, `src/components/shell/browser-deps.ts`, `src/app/session/page.tsx`, `src/app/session/[noradId]/page.tsx` and `tests/shell/geolocation.test.ts` by name, then push.

- [ ] 6. Sky view, camera backdrop and local time note
  - Depends on: task 5.
  - [ ] 6.1 Create `src/components/shell/camera.ts` and extend `src/components/shell/browser-deps.ts`
    - `createCameraController`, `MediaStreamLike`, `MediaDevicesLike`, `CameraOutcome`, `CAMERA_CONSTRAINTS` per design: error mapping, generation counter, idempotent `stop`; never rejects; reads no frame.
    - `browserMediaDevices()`: `null` unless `window.isSecureContext` and `navigator.mediaDevices?.getUserMedia` exist.
    - _Requirements: 9.2–9.5, 12.3_
  - [ ] 6.2 Add the Sky_View to `src/app/session/[noradId]/page.tsx`
    - At the seam of design "Camera backdrop and sky view", real-time `in-pass` only: heading, camera checkbox, the 3:4 box, the video layer, the marker from `markerPlacement(...)` (green when `lock.locked`), the `markerOutOfView` and `noPointingYet` notes; the stop effect on phase and clock mode and the unmount cleanup. Silent fallback on any outcome other than `'on'`. No other change.
    - _Requirements: 9.1–9.4, 9.6, 9.7_
  - [ ] 6.3 Add the Local_Time_Note to `src/app/session/page.tsx`
    - In `PassInfo`, ready rows only: one line `{SHELL_COPY.localTimeLabel} {formatLocalTimeNote(pass.riseMs, -new Date(pass.riseMs).getTimezoneOffset())}` under the "Next pass" line. No other change.
    - _Requirements: 10.1–10.4_
  - [ ] 6.4 Write `tests/shell/camera.test.ts`
    - Design "Testing Strategy" item 5. Run it, `pnpm test`, `pnpm typecheck` and `pnpm run build`.
    - _Requirements: 9.8, 12.4, 12.5_
  - [ ] 6.5 Main agent: commit staging `src/components/shell/camera.ts`, `src/components/shell/browser-deps.ts`, `src/app/session/[noradId]/page.tsx`, `src/app/session/page.tsx` and `tests/shell/camera.test.ts` by name, then push.

- [ ] 7. Device checklist on the Deployed_Build (review items, executed by the project owner)
  - Depends on: task 6, with its push deployed (check that the Live_URL serves the Sky_View).
  - [ ] 7.1 Present the Device_Checklist of `.kiro/specs/ar-pointing/design.md` (iPhone pass steps 1 to 9, Android pass) to the owner against the Live_URL, and record the owner's report per step. Step 5: record the measured heading before and after tilting to about 60°. If the flip is real, record the data and note that a separate fix follows R1's policy; build nothing here.
    - _Requirements: 14.1, 14.3, 14.4_
  - [ ] 7.2 Present the remaining review items of design "Testing Strategy > Review items" (PWA install and standalone on Android and iOS, geolocation, camera, home page prose) and record the owner's report per item.
    - _Requirements: 5.4, 14.2, 14.3, 2.6_
  - [ ] 7.3 Main agent: commit staging `.kiro/specs/shell-pwa-deploy/tasks.md` by name, then push.

- [ ] 8. English technical route
  - Depends on: task 7 (may run in parallel with task 10).
  - [ ] 8.1 Write `docs/reference/TECHNICAL_ROUTE.en.md` per design "Submission materials": section-by-section translation of the trimmed `docs/reference/TECHNICAL_ROUTE.md`, same headings and order, numbers, units, formulas, identifiers and code unchanged, the one-line translation note at the top, nothing added.
    - _Requirements: 15.1–15.3_
  - [ ] 8.2 Main agent: commit staging `docs/reference/TECHNICAL_ROUTE.en.md` by name, then push.

- [ ] 9. README final pass
  - Depends on: task 8.
  - [ ] 9.1 Rewrite `README.md` per design "Submission materials > README": the six sections in order, the Live_URL, the honesty statement verbatim from design, both Provenance_Sentences character for character, a link to the English_Route, the existing requirements, commands and live-test instructions kept accurate (add `node scripts/generate-icons.mjs` under commands). Check every paragraph against 1.24/1.25 while writing: no sentence pairs a reception word with a radio term; any block with a radio term also says simulated or synthesized.
    - Run `pnpm vitest run tests/scaffold/scaffold.test.ts`.
    - _Requirements: 16.1–16.5_
  - [ ] 9.2 Main agent: commit staging `README.md` by name, then push.

- [ ] 10. Devpost copy and video script
  - Depends on: task 7 (may run in parallel with task 8).
  - [ ] 10.1 Write `docs/submission/DEVPOST.md` per design "Submission materials": English only, the headings in form order, the tagline verbatim from design, story anchors from `docs/reference/POSITIONING_AND_STORY.md` within its unconfirmed-claims list, every historical reception attributed to its named listener or source, the Built with list, the Kiro usage facts (test count from a fresh `pnpm test` run). No claim that the app receives real signals; no "satellite tracker" positioning.
    - _Requirements: 17.1–17.6_
  - [ ] 10.2 Write `docs/submission/VIDEO_SCRIPT.md` per design: English only, the four-column table, the seven shots in the given arc and budget, a total row of at most 180 s (170 s planned), narration within the red lines.
    - _Requirements: 18.1–18.5_
  - [ ] 10.3 Main agent: commit staging `docs/submission/DEVPOST.md` and `docs/submission/VIDEO_SCRIPT.md` by name, then push.

- [ ] 11. Final acceptance and Final_Submission_Checklist
  - Depends on: tasks 9 and 10.
  - [ ] 11.1 Run `pnpm test`, `pnpm typecheck` and `pnpm run build` on the final tree; all must pass. Report any failure instead of changing tests. Confirm that every test of this spec is a `tests/**/*.test.ts` file in the `node` environment, runs offline under the network guard, and belongs to design "Testing Strategy" items 1 to 9. Open the Live_URL once and confirm it serves the final push.
    - _Requirements: 12.4–12.6, 13.7_
  - [ ] 11.2 Final_Submission_Checklist (review items with the owner): repository public with the MIT `LICENSE` (verify); `/.kiro` present in the repository and not gitignored (`git ls-files .kiro` lists the six specs' documents and the steering files; `git check-ignore .kiro/specs/shell-pwa-deploy/design.md` prints nothing); the Live_URL opens; the video link recorded here; the Devpost form fields match `docs/submission/DEVPOST.md` one to one; the red lines of Requirement 17, criteria 4 and 5, reviewed in `DEVPOST.md` and `VIDEO_SCRIPT.md` (Decision RQ-2). Record each outcome. Deadline 2026-12-05 06:00 GMT+8; internal target the evening of 2026-12-04.
    - _Requirements: 17.7, 19.1, 19.2_
  - [ ] 11.3 Mark every task of this file complete; main agent commits staging `.kiro/specs/shell-pwa-deploy/tasks.md` by name with `docs(shell): mark shell-pwa-deploy tasks complete (S6 task 11)`, then push.

## Notes

- Requirement coverage: every acceptance criterion of `requirements.md` is listed under at least one sub-task; criteria not listed under a test sub-task are checked by build, the Live_URL or review (requirements "Verification scope").
- Tests are only those of design "Testing Strategy", items 1 to 9.
- The Deployment is a stop point (task 4.2): the owner deploys, the agent records the reported Live_URL and continues against the Deployed_Build.
