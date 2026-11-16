# Design: AR tab (S9)

## Overview

The AR_Tab is a client page at `/ar`. It owns no SessionController. It builds its own pointing session, camera, TLE source and observer, computes the Live_Target and the Orbit_Ring with Field_Core functions, and draws them with SVG over the camera `<video>`. It reuses the landed S3 pointing math, the S7 projection (`arMarker`, `projectTrackArc`, `horizonLine`, `cardinalMarks`) and the S7 FOV store. The S7 session AR_View stays as it is.

## Files

| File | Role |
|---|---|
| `src/lib/field/orbit-ring.ts` | `buildOrbitRing`, `ringSegments`, `blendRings`, `ringTicks` (Requirement 4, 2.4) |
| `src/lib/field/visibility-bar.ts` | `visibilityWindows`, `hourTicks` (Requirement 7) |
| `src/lib/field/ar.ts` (added) | `guideAngleRad`, `starField`, `projectStars` (Requirements 5, 8) |
| `src/lib/field/index.ts` | barrel exports of the above |
| `src/app/ar/page.tsx` | route, `<main data-tab="ar">` |
| `src/components/ar/ar-tab.tsx` | state, loop, camera, pointing, switcher, controls |
| `src/components/ar/ar-scene.tsx` | the SVG layer (ring, ticks, stars, horizon, dot, guide, halo) |
| `src/components/ar/visibility-bar.tsx` | the 24-hour bar |
| `src/app/layout.tsx`, `src/components/shell/copy.ts`, `src/app/globals.css`, `public/sw.js` | Tab_Bar entry, label, icon and active style, shell document |

## Decision S9-1: the Orbit_Ring is a frozen-Earth ring, refreshed every 5 s

A true az/el path over one period is not closed: the Earth turns by `360° × period / 1436 min` (about 22° for a 92 min orbit) while the satellite goes round. A closed ring needs one fixed Earth orientation. The ring therefore uses the ECI positions of one revolution and rotates all of them by the GMST of the Ring_Anchor `t0`:

```
for k in 0..180:  t_k = t0 + k · T/180,   T = 1440 / MEAN_MOTION min
  r_eci = propagateAt(satrec, t_k).eciPositionKm
  x' = x cosθ + y sinθ ,  y' = −x sinθ + y cosθ ,  z' = z          (θ = gmstRad(t0))
  d = r_ecf − o_ecf(observer)           (WGS84, height = altitudeKm)
  e = −sinλ dx + cosλ dy
  n = −sinφ cosλ dx − sinφ sinλ dy + cosφ dz
  u =  cosφ cosλ dx + cosφ sinλ dy + sinφ dz
  az = atan2(e, n) mod 360 ,   el = asin(u / |d|)
```

At `k = 0` this equals `observeAt` at `t0` (same GMST, same WGS84), so the ring passes exactly through the Live_Target. Every 5 s the ring is rebuilt with a new `t0`; because only the Earth-rotation term moves (0.0042°/s), the ring drifts by about 0.02° per refresh, while the Live_Target moves along it in real time. Rejected alternative: the true az/el path (honest time labels, but a gap of tens of degrees at the closing point, which the owner did not want). Consequence: the `+N min` tick labels mean the orbital position N minutes later in the frozen frame, not the true az/el at that time; the copy says "orbit ring", not "future track".

`buildOrbitRing` returns `null` when `MEAN_MOTION` is not a finite positive number. A sample whose propagation fails is `{ ok: false }` and splits the polyline.

```ts
export type RingSample = SkySample;                       // reuse: ok + az/el, or ok:false
export interface OrbitRing { readonly anchorMs: number; readonly periodMs: number; readonly samples: readonly RingSample[] } // 181
export function buildOrbitRing(satrec: Satrec, meanMotionRevPerDay: number, anchorMs: number, observer: Observer): OrbitRing | null;
export function ringSegments(ring: OrbitRing): Array<{ inShadow: false; belowHorizon: boolean; samples: SkySampleOk[] }>;
export function ringTicks(ring: OrbitRing, count?: number): Array<{ label: string; azimuthDeg: number; elevationDeg: number }>; // count 12, label `+N min`
export function blendRings(from: OrbitRing, to: OrbitRing, w: number): OrbitRing;
export function blendDirection(a: { azimuthDeg: number; elevationDeg: number }, b: ..., w: number): { azimuthDeg: number; elevationDeg: number };
```

`ringSegments` splits where the elevation sign changes (below 0° = dashed) and repeats the boundary sample. `projectTrackArc` (landed S7) projects the segments with the calibration offset, the FOV and the Behind rule; the ring needs no new projection code.

## Decision S9-2: the ring morph interpolates directions

`blendDirection` converts both directions to unit vectors (`x = cos el sin az`, `y = sin el`, `z = −cos el cos az`), mixes them linearly, normalises, and converts back (`el = asin y`, `az = atan2(x, −z)`). If the two vectors are opposite the result is the vector of `to`. `blendRings` blends sample by sample (same index, 181 samples each); where either sample is `ok: false` the sample of `to` is used. The AR_Tab holds the old ring for 600 ms after a satellite change and draws `blendRings(old, new, w)` with `w = min(1, elapsed / 600)` eased by `w²(3 − 2w)`; the Live_Target marker blends the same way. With `prefers-reduced-motion: reduce` the weight is 1 at once.

## Centre guide (Requirement 5)

```ts
export function guideAngleRad(az: number, el: number, offsetDeg: number, basis: CameraBasis): number;
// u = sceneDirection(effectiveAzimuthDeg(az, offset), el);  rx = u·right, ry = u·up
// atan2(ry, rx); 0 when both are under 1e-9 (exactly behind)
```

The lock is `evaluateLock(basis.forward, { azimuthDeg, elevationDeg }, offsetDeg)` of S3 (`pointingErrorDeg ≤ 10°` plus the landed epsilon). The scene draws, in screen pixels: when not locked, an arrow of 56 px at the centre rotated by `−angle` (screen y points down), white with a dark outline, red when `behind`; when locked, the Lock_Halo from the landed `lockRing` with stroke opacity 0.35 and no arrow. The AR_Tab calls `pointing.setObserver(observer)` for the declination and does not call `pointing.setTarget`.

## Star field (Requirement 8)

```ts
export function starField(count: number, seed: number): Array<{ azimuthDeg: number; elevationDeg: number; magnitude: number }>;
// mulberry32(seed): az = 360 u1, el = asin(2 u2 − 1) in degrees (uniform on the sphere), magnitude = 0.3 + 0.7 u3^3
export function projectStars(stars, offsetDeg, basis, aspect, fovDeg): Array<{ ndcX: number; ndcY: number; magnitude: number }>; // only drawable points
```

300 stars, seed 20260101. Radius `0.6 + 1.2 · magnitude` px, opacity `magnitude · (1 − cameraOpacity)`. Stars are fixed at azimuth and elevation (not rotated by sidereal time) because they only give the sense of a sky.

## Visibility bar (Requirement 7)

```ts
export function visibilityWindows(passes: readonly Pass[], nowMs: number, spanMs = 86_400_000):
  Array<{ startFrac: number; endFrac: number; riseMs: number; setMs: number; maxElevationDeg: number; running: boolean }>;
// startFrac = max(0, (riseMs − now)/span), endFrac = min(1, (setMs − now)/span); passes outside [0,1] are dropped
export function hourTicks(nowMs: number, spanMs?: number, stepHours = 6): Array<{ frac: number; label: string }>; // UTC hours, label `HHZ`
```

The component calls `predictPasses({ observer, tle, start: now, durationHours: 24, minElevationDeg: 0 })` on a change and every 60 s, inside `try/catch` (it throws `EngineError`). The bar is a 100 %-wide track with absolutely positioned blocks and a "now" mark at 0.

## Layout of the AR_Tab

`position: fixed; inset: 0; bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom))`, `z-index` 10 (below the Tab_Bar at 50). From back to front: night background, `<video>` (opacity = slider), SVG scene, drag layer (only when the pointing session is in drag mode), HUD. HUD: the Satellite_Switcher strip at the top (`scroll-snap-type: x mandatory`, one card per entry, cards 8.5 rem wide); a left column and a right column of small readouts; the vertical Sky_Slider on the right edge (`<input type="range">` rotated with `writing-mode: vertical-lr; direction: rtl`, so the top end is the full camera picture); the button row (enable sensors, ↺ ↻, FOV − +); the Visibility_Bar and its text at the bottom. The frame loop is the S7 one (30 fps, paused while the document is hidden); the Ring_Refresh runs on the same loop when `now − anchor ≥ 5000`.

## Data flow

```
useEffect(mount):  pointing, camera, locator, tleFetcher, observerStore, fovStore
useEffect([noradId]):  createTleSource(fetcher, id).load() → { tle, satrec } (cached in a ref map)
frame loop (30 fps):  now → observeAt → live target
                      if ring is stale (5 s) or new satellite → buildOrbitRing(anchor = now)
                      blend with the old ring during the morph
                      projectTrackArc(ringSegments(ring)) , ticks , stars , horizon , cardinals
every 60 s / on change: predictPasses → visibilityWindows
```

## Tests (`tests/field/ar-tab.test.ts`, example cases)

1. `buildOrbitRing` with the ISS fixture of `tests/helpers/baseline.ts` and the baseline observer: the first sample equals `observeAt` at the anchor within 0.01° (azimuth and elevation); there are 181 samples; the last sample is within 3° of the first for a LEO fixture (near-closed).
2. `buildOrbitRing` returns `null` for `MEAN_MOTION` 0 and for NaN.
3. `ringSegments` on a synthetic ring with elevations `[-5, 5, 10, -3]` gives `belowHorizon` `[true, false, true]` with shared boundary samples.
4. `blendDirection` at `w = 0` and `w = 1` returns the inputs; the midpoint of (0°, 0°) and (90°, 0°) is (45°, 0°); `blendRings` at `w = 0` equals `from`.
5. `guideAngleRad` for the north-looking level basis: a target at azimuth 40°, elevation 0° gives 0; at elevation 70°, azimuth 0° gives π/2; exactly behind (azimuth 180°, elevation 0°) gives 0.
6. `starField(300, seed)` is deterministic (two calls equal), all elevations in [−90, 90] and azimuths in [0, 360).
7. `visibilityWindows`: a pass from now−10 min to now+10 min gives `startFrac` 0, `running` true; a pass that ends after 24 h is clipped to `endFrac` 1; a pass at now+30 h is dropped. `hourTicks` at 11:23Z gives ticks with labels `12Z`, `18Z`, `00Z`, `06Z` and `frac` `(37 min)/(24 h)` for the first.

## Risks

- R9-1: the ring in the frozen frame is correct for the satellite's current orbital phase and plane direction; the far side of the ring is offset from the true az/el of that moment by up to the Earth rotation over the period. The copy and labels avoid "future track".
- R9-2: iOS sensor permission needs a click; the button stays visible until the permission is granted.
- R9-3: a satellite whose TLE cannot be fetched (offline) shows an error note; no cached fallback is added.
