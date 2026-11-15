# zombieSatellite: Devpost copy

Written for the Devpost form, in the order of its fields. English only. Every field below is meant to be pasted as it stands.

## Project name

zombieSatellite

## Tagline

Find a zombie satellite's next pass, point your phone at it and follow its Doppler shift, with a simulated beacon built from public orbital data.

## Inspiration (the problem)

Some satellites were declared dead decades ago and are still in orbit. A few of them are still transmitting, and almost every one of those was found again by an amateur with an antenna, not by the agency that built it.

In January 2018 a Canadian radio amateur, Scott Tilley (VE7TIL), was searching his backyard sky for a missing secret satellite. He found an unknown signal instead, matched its Doppler curve against the public orbit catalog, and identified NASA's IMAGE spacecraft, silent since 2005.

Anyone who wants to follow a satellite like that needs three things at once: when it passes, where in the sky to point, and how far the frequency has shifted. The tools that give those three answers are either desktop programs for experienced operators or a ground station that you build yourself. A newcomer cannot get past the first step: the satellite is overhead and there is no easy way to know where to look.

## What it does

zombieSatellite is a finding, pointing and Doppler aid for amateur radio and satellite hobbyists, built around a fixed catalog of seven zombie satellites.

- **Find.** It predicts the next pass over your position (browser geolocation, or typed coordinates) from public CelesTrak TLE data with SGP4. All times are UTC, with a local start time next to each prediction.
- **Point.** During a pass, a marker follows the computed azimuth and elevation on a sky view, optionally over the live camera picture. The pointing lock tolerance is ±10°.
- **Follow the Doppler shift.** The app shows the Doppler shift of the pass in kHz in real time. A simulated beacon tone, synthesized in the browser, glides with it. The tone is an artistic simulation; the kHz figure is the real computed shift.
- **Collect.** Each completed pass issues a QSL card with the satellite, the UTC times, the maximum elevation, the frequency and an explicit note that the card confirms a simulated session.
- **Try it without hardware.** A 60× demo mode plays the next complete real pass in a few minutes and can aim for you.

zombieSatellite receives no RF. Beacon audio is synthesized live from public orbital data. Bring your own radio for the real thing; the app does the finding, pointing and Doppler math.

## Who it is for

The first audience is amateur radio and satellite hobbyists: shortwave and satellite watchers, SDR owners and people who track satellites. They already know why a pass table, a pointing direction and a Doppler figure matter, and the app puts all three on one phone screen.

The demo mode is the entry point for newcomers. It lets someone with no radio and no antenna practise the whole loop (pick a satellite, read the pass, point, follow the shift, collect the card) on a 1960s spacecraft, before they ever touch real equipment.

## Why it matters

The zombie-satellite hobby exists because amateurs did the work that institutions had stopped doing. A tool that makes the first steps easier brings more people into that community. The orbital data behind it is public, so nothing in the app depends on a private service: the server only forwards the public TLE and caches it for two hours.

## How we built it

- Orbit engine: SGP4 through satellite.js 6.0.2, with look angles, a pass finder with refinement, and range rate for the Doppler shift. It is checked against fixed TLE snapshots and numeric baselines carried over from the author's earlier personal project SatAware AR.
- Pointing: device orientation to camera direction, magnetic declination (WMM 2025) so that the heading is a true heading, a manual calibration offset, a drag compass fallback, and a pure marker projection with a fixed 75° vertical field of view.
- Session: a small state machine (selecting, awaiting pass, in pass, completed), a real-time clock and a 60× demo clock, and Web Audio synthesis of the beacon tone.
- QSL cards: SVG cards generated from the session result, saved as SVG or PNG, with the collection kept in the browser's local storage.
- App shell: Next.js 16 and React 19, an installable PWA (manifest, locally generated icons, a service worker that caches only the app shell), and a server route that fetches TLE data from CelesTrak for the browser, so that phones, in China in particular, never need a direct connection to celestrak.org.
- All code was newly written during the Kiroween 2026 submission period. Only the coordinate conventions and the numeric acceptance baselines come from SatAware AR.

## Kiro usage

The project was built spec by spec with Kiro, and the specs are in the repository under `.kiro/specs`.

- **Six specs:** orbit-engine, zombie-catalog, ar-pointing, seance-session, qsl-card and shell-pwa-deploy. Each has its own requirements, design and tasks documents.
- **Models:** Opus wrote the requirements and the designs; Sonnet did the implementation of the tasks.
- **Review gates:** a human review between stages. The requirements, the design and the task list of each spec were approved by the author before the next stage started, and several designs were changed after review.
- **Steering:** two steering files in `.kiro/steering` hold the project scope (a fixed catalog, no custom backend, UTC everywhere, no claim of real reception) and the workflow rules.
- **Commits:** one commit per task, made after that task's tests passed, staging files by name.
- **Verification:** the landed test suite, which has 348 passing tests in 72 test files at the time of writing, plus one opt-in test against the live CelesTrak endpoint. It includes property-based tests (fast-check) for the orbit engine and scaffold checks that scan the app's own text for wording that could suggest real reception.
- **What Kiro did not do:** deploy the app, or run the device checks. The author deployed to Vercel and runs the device checklist on real phones.

## Challenges

- **Honest wording.** The app must never suggest that it hears a real satellite. Two scaffold checks scan every page text, the copy modules and the README: a text that mentions a beacon, signal or radio must also say simulated or synthesized, and no sentence may pair a reception word with a radio term. They shaped the copy: for example, the app names its audience hobbyists and watchers, because the word listeners next to a radio term fails the scan.
- **Orbit data in China.** A direct connection to celestrak.org is not reliable from many phones, so the browser talks only to the app's own server route.
- **Phone sensors.** Heading comes from different sources on iOS and Android and needs a declination correction to be a true heading. On iPhone the motion sensors have to be enabled again after the user returns from another app; this is an iOS permission limitation that we recorded and did not work around.
- **A fixed field of view.** The marker uses a fixed 75° vertical field of view, so it can sit slightly off over the camera picture on some phones.

## What we learned

Writing the numeric baselines down first, and then building tests against them, made the orbit and pointing code much easier to trust. The same holds for the honesty rules: turning them into a scan made them part of the build instead of a promise in a document.

## What's next

- Calibrating the camera field of view for each device.
- An eclipse model, so that satellites that work only in sunlight are silent in the shadow during a simulated session.
- Exports of the collection of QSL cards.

## Built with

- Next.js 16, React 19, TypeScript
- satellite.js 6.0.2 (SGP4)
- Web Audio API, DeviceOrientation, Geolocation and getUserMedia browser APIs
- CelesTrak public GP data
- Vitest and fast-check
- Vercel
- Kiro

## Story anchors

Each story below is documented history, attributed to the people and sources who reported it. None of it is something the app does.

- **LES-1 (NORAD 1002).** Launched in 1965 by MIT Lincoln Laboratory and silent after its planned shutdown in 1967. On 18 December 2012, the radio amateur Phil Williams (G3YPQ) in Cornwall, England, reported hearing it again at about 237 MHz, and amateurs in Brazil (PY2ZX) and Germany (DD1US) later confirmed it. It tumbles about once every four seconds, and its signal fades in and out with the spin.
- **Transit 5B-5 (NORAD 965).** A US Navy navigation satellite launched on 13 December 1964, a forerunner of GPS. Its navigation job failed after about 19 days, but amateurs report its telemetry transmitter at 136.65 MHz whenever sunlight reaches it, which would make it the oldest satellite still known to transmit. Some SDR analysts think the signal may actually come from Transit 5E-5, so its identity is disputed.
- **AO-7 (NORAD 7530).** Launched by AMSAT in 1974, dead after a battery failure in 1981. On 21 June 2002 the British amateur Pat Gowen (G3IOR) reported its CW beacon on 145.9775 MHz. It works only in sunlight, AMSAT lists it as semi-operational, and amateurs still use it.
- **Prospero (NORAD 5580).** Launched on 28 October 1971 from Woomera, Australia, on a Black Arrow rocket, the only satellite put into orbit by a British launcher. It was formally closed down in 1996. Later claims that its 137.56 MHz beacon was heard again are unconfirmed, and the signal may have come from other satellites on the same frequency. It is the catalog's urban legend and it is labelled that way.
- **IMAGE (NORAD 26113).** NASA's magnetosphere imager, launched on 25 March 2000 and lost on 18 December 2005. On 20 January 2018 Scott Tilley found its signal while looking for another satellite, and NASA confirmed the identification on 30 January 2018. It fell silent again after August 2018, and no public reports have followed. It is the hard target of the catalog.
- **Galaxy 15 (NORAD 28884).** An Intelsat geostationary satellite that stopped responding to commands on 5 April 2010 while its transponders stayed on, and drifted along the geostationary belt. The press called it a "zombie satellite", and the term stuck. It rebooted on 23 December 2010. It is a story-only entry in the app, because its orbital slot is not visible from our reference location in China.
- **LES-5 (NORAD 2866).** A sister of LES-1, launched on 1 July 1967 and moved to a graveyard orbit in 1972. On 24 March 2020 Scott Tilley reported a modulated carrier at 236.7487 MHz and identified it as LES-5. It is a story-only entry, because a drifting near-geostationary object has no regular passes to play.