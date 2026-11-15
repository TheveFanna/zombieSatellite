# Design Document: ar-pointing (S3)

## Overview

This design implements the pointing layer of requirements.md: device attitude in, pointing error out. It has two parts.

1. The Pointing_Core, `src/lib/pointing`: pure TypeScript functions with no React, no DOM and no package imports. It selects the Heading_Source, turns an attitude into a camera basis in one named frame, extracts heading and pitch, computes the WMM2025 Declination, normalizes the Calibration_Offset, builds Target_Vectors, evaluates the lock geometry, projects the marker and runs the permission transitions.
2. The Pointing_Components, `src/components/pointing`: framework-free Pointing_Controllers that own every side effect behind injected interfaces, one file that binds those interfaces to the real browser, and one thin `'use client'` page for the Pointing_Demo_Page at `/pointing`.

The core idea is one pipeline. Every sensor sample and every drag position becomes one `CameraBasis` in the World_Frame. The displayed heading, the Lock_Result and the Marker_Projection all read that same basis (Requirement 3, criterion 8). Declination and calibration each enter at exactly one place.

```text
DeviceOrientationEvent ─► toOrientationSample ─► selectHeadingSource ─► toSensorAttitude ─┐
  (controller)              (controller)          (core)                (core)           │
                                                                                         ▼
 Screen_Orientation_Angle ─► normalizeScreenOrientationDeg ─► cameraBasisFromSensor(attitude, σ, D)
 observer + clock ─► declinationDeg (only for "absolute"/"compass") ───────┘               │
 drag (controller) ─► applyDrag (core) ─► cameraBasisFromDrag(heading, pitch) ─────────────┤
                                                                                         ▼
                                                    CameraBasis { forward, up, right } (World_Frame)
                                                         │                     │
            target az/el + Calibration_Offset ─► evaluateLock ─► LockResult    projectMarker ─► NDC
```

### Normative inputs used by this design

| Source | Used for |
|---|---|
| requirements.md (this spec) | Everything below. Where this design and requirements.md differ, requirements.md wins. |
| Reference_Document §2: C40–C45, C52, C54, C56–C63, formulas 2.9.3–2.9.6 | Frames, target mapping, lock criterion, calibration sign, attitude chain. |
| Reference_Document §4.4 and §4.5 | Acceptance baselines. They win over formula text (requirements.md, Normative sources, "Precedence"). |
| NOAA NCEI WMM2025 coefficient file and calculator | Declination model and the four pinned acceptance values (section "Declination"). |

### Settled decisions carried over from requirements.md

Lock tolerance 10° (inclusive); Selection_Window 300 ms from the first Valid_Sample; Permission_Timeout 5 s and No_Sample_Timeout 3 s; denied only for a promise that resolves with `denied`; Declination only for "absolute" and "compass", WMM2025, altitude 0 km, dates clamped to the validity interval; Calibration_Offset normalized to [0, 360), non-finite input rejected, persisted in `localStorage`, ±5° buttons; Drag_Sensitivity 0.25°/px with device-steering direction, start at 0°/0°, auto-activation on unavailable or denied plus a manual toggle; Vertical_Forward when the horizontal length is below 1e-9, with heading and Azimuth_Difference both `null`; pure Marker_Projection with 75° vertical field of view; hand-written quaternions; Vitest `node` environment only; route `/pointing`.

### Design decisions made in this design

| ID | Decision | Rationale |
|---|---|---|
| D1 | The World_Frame is the Scene_Frame of C40 (+X east, +Y up, −Z north). Every exported vector type is a `SceneVector`. No East-North-Up vector type exists in code. | Formula 2.9.5 already outputs Scene_Frame vectors, C43 builds Scene_Frame targets, and the §4.4 and §4.5 baselines are printed as Scene_Frame components. Choosing it means the dot product needs no conversion at all; the only conversion is inside heading and pitch extraction (section "Frames"). |
| D2 | `SceneVector` carries a compile-time brand. Only the core's internal `sceneVector()` constructor can create one; plain `{x, y, z}` objects do not type-check where a `SceneVector` is required. | Makes "ENU components passed where scene components are expected" a type error rather than a silent bug. |
| D3 | All three sensor Heading_Sources go through one attitude chain (formula 2.9.5) with an effective alpha: "relative" uses α, "absolute" uses α − D, "compass" uses h₀(β, γ) − (H + D). | One chain means one place for screen orientation and one camera basis for heading, lock and marker. The derivation is in section "Attitude". |
| D4 | The "compass" Valid_Sample requires `webkitCompassHeading`, `beta` and `gamma`. Its formula never reads `alpha`. | The compass formula fixes the heading from `webkitCompassHeading`; alpha has no role. This is the list that the Valid_Sample glossary entry leaves to the design. |
| D5 | Locked iff `pointingErrorDeg <= LOCK_TOLERANCE_DEG + LOCK_COMPARISON_EPSILON_DEG` with the epsilon 1e-9°. | `Math.acos(Math.cos(10°))` returns 10.000000000000012° in Node 22, so a bare `<= 10` rejects a target that is exactly 10° away. The epsilon is a floating-point comparison tolerance, not a second threshold, and is 14 orders of magnitude below any physical meaning. |
| D6 | The WMM2025 coefficient file is embedded verbatim as a string in `wmm2025-cof.ts` and parsed once at module load. No package is added. | Copying the official text verbatim avoids transcription errors. Data about 4.5 KB plus code about 4 KB, far below the 30 KB budget. |
| D7 | The permission transition function adds one transition beyond the requirements: `unavailable` + `valid-sample-arrived` → `granted`. | A Valid_Sample that arrives after the 3 s No_Sample_Timeout means the sensor works after all. Approved (OQ-D2). The state granted therefore means: permission is given (or no Permission_API exists) and Valid_Samples are flowing or have not yet been ruled out by the No_Sample_Timeout. The drag compass is not deactivated by this transition. |
| D8 | The Pointing_Controllers use injected interfaces for every side effect; `browser-deps.ts` is the only component-layer file that touches `window`, `document`, `screen`, `localStorage` or `DeviceOrientationEvent`. | Tests run in the Vitest `node` environment with plain mocks (Requirement 13). |
| D9 | The React layer is one file, `src/app/pointing/page.tsx`, a `'use client'` page that subscribes to the session controller with `useSyncExternalStore` and forwards user events. There is no separate component file. | Requirement 13, criterion 3: React holds no pointing logic. One file keeps the change to the S1 `.tsx` list at exactly one entry (D10). |
| D10 | The S1 scaffold test `1.19` in `tests/scaffold/scaffold.test.ts` gains `app/pointing/page.tsx` in its `.tsx` list, and its expected `readdirSync('src/app')` list gains `'pointing'` (OQ-D5). No other assertion of that file changes. | Approved by the owner: the guard still rejects every unapproved addition; only the approved route enters the two expected lists. |
| D11 | Permission state is never persisted. | Requirement 11, criterion 3 forbids automatic requests on restore; with nothing restored, the old P04 path cannot occur. |
| D12 | Core functions do not validate argument types, except the Calibration_Offset input check (Requirement 7, criterion 5) and the Declination latitude and longitude range. All other inputs are typed `number` and assumed finite. | Keeps the core small. The controllers convert browser values (`null`, `undefined`, NaN) before calling the core. |

## Frames

The World_Frame is the Scene_Frame (D1). This section is the explicit conversion statement that requirements.md asks for before any heading, pitch or dot product (Normative sources, "Frames"; Requirement 5, criterion 7; Requirement 8, criterion 1).

### Axes

| Frame | Axes | Where it appears |
|---|---|---|
| World_Frame = Scene_Frame (C40) | right-handed; +X east, +Y up, −Z north (so +Z south) | every `SceneVector`: Forward_Vector, up, right, Target_Vector |
| ENU | +E east, +N north, +U up | the text of formula 2.9.5 for heading and pitch only; never a type in code |
| S-E-U (C33) | +S south, +E east, +U up | the Orbit_Engine's internal topocentric frame; not used here |

### Conversions

```text
ENU   → Scene:  x = E,   y = U,   z = −N
Scene → ENU:    E = x,   N = −z,  U = y
SEU   → Scene:  x = E,   y = U,   z = S          (C33 → C40, for reference only)
```

### Target_Vector (C43, R = 1)

```text
sceneDirection(az, el) = ( cos(el)·sin(az),  sin(el),  −cos(el)·cos(az) )      Scene_Frame
```

C44 holds: az 0° → −Z, 90° → +X, 180° → +Z, 270° → −X. This is the same mapping as ENU (cos el sin az, cos el cos az, sin el) converted by the table above.

### Heading and pitch extraction

Formula 2.9.5 writes `heading = atan2(forward.x, forward.y)` and `pitch = asin(forward.z)`. Those read ENU components. Applied literally to Scene_Frame components, the first §4.5 row (forward (0, 0, −1), north, upright) would give pitch asin(−1) = −90°, which contradicts the §4.5 UI convention "beta = 90 gives pitch 0". The baselines win, so the design converts first:

```text
east = f.x ;  north = −f.z ;  up = f.y
horizontal = hypot(east, north)
headingDeg = horizontal < 1e-9 ? null : normalizeDeg360( atan2(east, north) · 180/π )
pitchDeg   = asin( clamp(up, −1, 1) ) · 180/π
```

This is the single heading extraction of Requirement 5, criterion 6: `evaluateLock` calls it and derives the Azimuth_Difference from its `headingDeg`, so both are `null` together.

Check against the §4.5 UI conventions (Requirement 5, criterion 9):

| alpha, beta, gamma | forward (scene) | east, north, up | heading | pitch |
|---|---|---|---|---|
| 0, 90, 0 | (0, 0, −1) | 0, 1, 0 | atan2(0, 1) = 0° | 0° |
| 90, 90, 0 | (−1, 0, 0) | −1, 0, 0 | atan2(−1, 0) = −90° → 270° | 0° |
| 270, 90, 0 | (1, 0, 0) | 1, 0, 0 | atan2(1, 0) = 90° | 0° |
| 0, 0, 0 | (0, −1, 0) | 0, 0, −1 | horizontal 0 → `null` | −90° |

### Dot product

`f` (Forward_Vector) and `u` (Target_Vector) are both `SceneVector`s, so `dot(f, u)` is taken directly. No conversion is applied to either side.

### Calibration rotation (C54, formula 2.9.4)

C54 rotates the world group by +offset about +Y. Formula 2.9.4 maps a point at azimuth az to az − offset. The design applies the offset to the target azimuth only: `az' = normalizeDeg360(az − offset)` and `u = sceneDirection(az', el)`. The camera basis is never rotated by the offset. This is the same relative geometry as the old project's rotated world group, without a second rotated space (P06).

## Attitude

### The chain (formula 2.9.5, C61)

Quaternions are (x, y, z, w), Hamilton product, active rotation `v' = q v q*`. `qAxis(axis, θ)` is the rotation by θ about a unit axis.

```text
q_cam = qAxis(Y, α_eff) ⊗ qAxis(X, β) ⊗ qAxis(Z, −γ) ⊗ qAxis(X, −90°) ⊗ qAxis(Z, −σ)
forward = rotate(q_cam, (0, 0, −1))
up      = rotate(q_cam, (0, 1, 0))
right   = rotate(q_cam, (1, 0, 0))
```

The first three factors are three.js `Quaternion.setFromEuler(Euler(β, α, −γ, 'YXZ'))` written as a product. σ is the normalized Screen_Orientation_Angle.

Closed form of `forward`, used only for the derivations in this document (the code uses the quaternion chain):

```text
forward.x = −cos α · sin γ − sin α · sin β · cos γ
forward.y = −cos β · cos γ
forward.z =  sin α · sin γ − cos α · sin β · cos γ
```

With γ = 0 this gives (−sin α sin β, −cos β, −cos α sin β), which reproduces the five §4.5 rows: (0, 0, −1), (−1, 0, 0), (0, 0, 1), (1, 0, 0) and (0, −1, 0).

Two consequences of the chain matter for the design:

1. **Screen orientation does not change `forward`.** `qAxis(Z, −σ)` is applied first and leaves (0, 0, −1) unchanged. σ rotates `up` and `right` about the viewing axis, so it affects only the Marker_Projection. This is physically right: turning the phone to landscape does not change where the rear camera points.
2. **Alpha shifts the heading rigidly.** `qAxis(Y, α)` is the outermost factor, a rotation about the vertical axis. For any β and γ with a non-vertical forward: `heading(α) = normalizeDeg360(h₀(β, γ) − α)`, where h₀ is the heading at α = 0. It rotates `forward`, `up` and `right` together.

### Effective alpha per Heading_Source (D3)

| Heading_Source | Required fields (Valid_Sample) | α_eff | Resulting heading |
|---|---|---|---|
| "relative" | alpha, beta, gamma | α | h₀ − α (no Declination, Requirement 6, criterion 4) |
| "absolute" | alpha, beta, gamma | α − D | h₀ − α + D = Magnetic_Heading + D |
| "compass" | webkitCompassHeading (H), beta, gamma (D4) | h₀(β, γ) − (H + D) | H + D, exactly, for every tilt |

h₀(β, γ) is the heading extraction applied to the chain's forward at α = 0. If that forward is Vertical_Forward, h₀ is taken as 0, so α_eff = −(H + D); the resulting heading is `null` anyway and only the roll of `up` and `right` depends on this choice.

For "compass" the formula meets Requirement 5, criterion 3: the heading is H corrected by D, the tilt comes from β and γ of the same sample. The constant α = 0 inside h₀ is a formula constant; no `null` alpha is ever replaced (Requirement 4, criterion 2), because the "compass" path never reads alpha.

### Drag basis

```text
forward = sceneDirection(heading, pitch)
right   = ( cos(heading), 0, sin(heading) )
up      = cross(right, forward)
```

No Declination (Requirement 6, criterion 4). Roll is always 0.

### Screen orientation normalization

`normalizeScreenOrientationDeg(raw: unknown): number` returns `normalizeDeg360(raw)` for a finite number and 0 otherwise. `screen.orientation.angle` gives 0/90/180/270; `window.orientation` gives 0/90/−90/180, and −90 becomes 270. Both mean the same physical rotation, and qAxis(Z, −270°) equals qAxis(Z, 90°) as a rotation. The browser binding reads `screen.orientation.angle`, then `window.orientation`, then `undefined` (desktop), at every sample (C61, "current").

## Declination

### Route (Requirement 6, criteria 5 to 7)

Bundled full WMM2025 coefficients with a hand-written spherical-harmonic synthesis to degree 12 (D6). A reduced approximation was not chosen: the full model is already far inside the size budget, and a truncated model would need its own accuracy argument for the 0.5° criterion.

| Item | Estimated size (minified, not gzipped) | How it is checked |
|---|---|---|
| Added dependency | 0 bytes (no package) | `package.json` unchanged |
| Coefficient data (`wmm2025-cof.ts`, the verbatim file text) | about 4.6 KB | Review: the source file size in bytes is an upper bound of its minified size; record it in the task |
| Synthesis code (`declination.ts`) | about 4 KB | Review: same rule |
| Total | about 9 KB, within 30 KB | |

### Coefficient source

- Archive: `https://www.ncei.noaa.gov/sites/default/files/2024-12/WMM2025COF.zip`, downloaded 2026-11-15, SHA-256 `2E76569370D081F2CD7919490218BD094CA9AFDE347B198EFF5621E0AF460D03`.
- File used: `WMM2025COF/WMM.COF` (4554 bytes), SHA-256 `DFA8597825AF4E0B87FF4198A5B4FB661B3C49F4CD090CD0164E0259B075582F`. Its header `2025.0            WMM-2025     11/13/2024` matches the header that the archive's README asks users to verify.
- Model documentation: [The US/UK World Magnetic Model for 2025-2030 (NOAA technical report)](https://repository.library.noaa.gov/view/noaa/71569/noaa_71569_DS1.pdf). The product page states WMM2025 was released on December 17, 2024 and stays valid until late 2029 ([NCEI WMM page](https://ncei.noaa.gov/products/world-magnetic-model)); the NCEI metadata gives December 31, 2029 as the expiry ([NCEI metadata](https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ngdc:WMM2025/html)).
- The 90 coefficient rows are reproduced in the Appendix. WMM data is a US government work.

### WMM_Validity_Interval and clamping (Requirement 6, criterion 2)

- Lower boundary: 2025-01-01T00:00:00Z, decimal year 2025.0, the model epoch in the file header.
- Upper boundary: 2030-01-01T00:00:00Z, decimal year 2030.0, the end of December 31, 2029.
- The UTC instant is converted to a decimal year `y + (t − Date.UTC(y, 0, 1)) / (Date.UTC(y + 1, 0, 1) − Date.UTC(y, 0, 1))` with `y = getUTCFullYear()`, then clamped to [2025.0, 2030.0]. For 2026-11-15T00:00:00Z this gives 2026 + 318/365 = 2026.8712, the same decimal year that the NOAA calculator reports for that date.

### Algorithm

The equations of the WMM2025 technical report, Section 1, are normative for the implementation; where the summary below and the report differ, the report wins.

1. Geodetic to geocentric spherical at height h = 0 (WGS84 a = 6378.137 km, f = 1/298.257223563, e² = f(2 − f)): `Rc = a / sqrt(1 − e² sin²φ)`, `p = Rc cos φ`, `z = Rc (1 − e²) sin φ`, `r = hypot(p, z)`, `φ' = asin(z / r)`.
2. Time-adjusted coefficients: `g(t) = g + (t − 2025.0) ġ`, `h(t) = h + (t − 2025.0) ḣ`.
3. Schmidt semi-normalized associated Legendre functions P(n, m)(sin φ') and their derivatives for n = 1..12, m = 0..n, by the recursion of the report.
4. Field in the geocentric frame with reference radius 6371.2 km: X' (north), Y' (east), Z' (down) by the report's sums over n and m.
5. Rotate to geodetic: `X = X' cos(φ' − φ) − Z' sin(φ' − φ)`, `Y = Y'`.
6. `D = atan2(Y, X)` in degrees, east positive.

Latitude must be in [−90, 90] and longitude in [−180, 180], both finite; otherwise `declinationDeg` throws a `RangeError` (D12). The result at exactly ±90° latitude is unspecified (the synthesis divides by cos φ').

### Pinned acceptance values (Requirement 6, criteria 8 to 10)

Looked up in the NOAA NCEI magnetic field calculator on the Declination_Lookup_Date **2026-11-15** (UTC), model **WMM-2025** (calculator response field `"model": "WMM-2025"`, version 1.2.1), elevation **0 km**, date input 2026-11-15 (reported decimal year 2026.8712). Calculator: [NOAA NCEI Magnetic Field Calculators](https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml); the values were read from its declination service, for example `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=39.9042&lon1=116.4074&model=WMM&startYear=2026&startMonth=11&startDay=15&elevationUnits=K&elevation=0&coordinateSystem=D&resultFormat=json&key=zNEw7` (the other points change `lat1` and `lon1`).

| Point | Latitude | Longitude | Declination (°, east positive) | Calculator's stated uncertainty (°) |
|---|---|---|---|---|
| Beijing | 39.9042 | 116.4074 | −7.5631 | 0.3241 |
| Shanghai | 31.23 | 121.47 | −6.55898 | 0.3067 |
| Ürümqi | 43.83 | 87.62 | 2.49421 | 0.34255 |
| Guangzhou | 23.13 | 113.26 | −3.28683 | 0.2974 |

The test calls `declinationDeg(lat, lon, Date.UTC(2026, 10, 15))` and allows 0.5°. The calculator may read elevation 0 as mean sea level while the design uses the ellipsoid; the geoid separation in China (tens of metres) changes the declination by far less than 0.001°.

## Lock geometry

```text
evaluateLock(forward, target, calibrationOffsetDeg):
    azEff = normalizeDeg360(target.azimuthDeg − calibrationOffsetDeg)          C54
    u     = sceneDirection(azEff, target.elevationDeg)                         C43, R = 1
    d     = dot(forward, u)                                                     both Scene_Frame
    errorDeg = acos(clamp(d, −1, 1)) · 180/π                                    C52, 2.9.6
    locked   = errorDeg <= 10 + 1e-9                                            D5
    behind   = d < 0                                                            C52 (strict, no epsilon)
    { headingDeg, pitchDeg } = headingPitch(forward)                            one extraction
    azimuthDifferenceDeg   = headingDeg === null ? null : wrapDeg180(azEff − headingDeg)
    elevationDifferenceDeg = target.elevationDeg − pitchDeg
```

- `normalizeDeg360(v) = ((v % 360) + 360) % 360`. The second `%` turns a result of exactly 360 (for example from −1e-15) into 0.
- `wrapDeg180(v)`: `w = normalizeDeg360(v)`; return `w > 180 ? w − 360 : w`. Range (−180, 180]; 180 stays 180, −180 becomes 180.
- Azimuth_Difference > 0: the target is clockwise of the heading (to the right). Elevation_Difference > 0: the target is above.
- `Device_Heading` in the result is the heading after Declination and before the Calibration_Offset (glossary). The offset acts only through `azEff`.

The constant 8 does not appear in any lock or alignment role (Requirement 8, criterion 8); review greps `src/lib/pointing` and `src/components/pointing` for it.

### Correction order (Requirement 9)

Declination enters through α_eff (D3) when the basis is built; the Calibration_Offset enters through `azEff` when the lock is evaluated. The chain is the same for every Heading_Source and for the Drag_Compass. Both corrections are rotations about the vertical axis, so in this geometry they commute: the end-to-end test of Requirement 9, criterion 3 pins the sign and the single application of each correction, which is what an order error would break here.

## Marker projection

```text
projectMarker(target: SceneVector, basis: CameraBasis, aspect: number):
    zc = dot(target, basis.forward)                      depth
    if zc <= 0: return { inFront: false }
    t  = tan(75°/2)                                      C41, vertical field of view
    ndcX = dot(target, basis.right) / zc / (t · aspect)  aspect = viewport width / height
    ndcY = dot(target, basis.up)    / zc / t
    return { inFront: true, ndcX, ndcY, onScreen: |ndcX| <= 1 and |ndcY| <= 1 }
```

NDC follows C76: origin at the screen centre, +x right, +y up, the visible area is [−1, 1]². The function reads no lock state, and `evaluateLock` does not call it (Requirement 10, criterion 2). It is checked by review; requirements.md names no projection test.

## Architecture

```text
src/lib/pointing/                     Pointing_Core (pure; boundary-scanned)
  index.ts                            barrel, the only entry file
  types.ts                            exported types
  constants.ts                        exported constants
  angles.ts                           normalizeDeg360, wrapDeg180, clamp, deg↔rad (internal helpers exported via barrel where listed)
  vector.ts                           SceneVector brand, sceneVector (internal), dot, cross, sceneDirection, headingPitch
  quaternion.ts                       internal: qAxis, multiply, rotate
  heading-source.ts                   selectHeadingSource, pickHeadingSource, toSensorAttitude, normalizeScreenOrientationDeg
  attitude.ts                         cameraBasisFromSensor, cameraBasisFromDrag, applyDrag
  wmm2025-cof.ts                      internal: verbatim WMM.COF text
  declination.ts                      declinationDeg
  calibration.ts                      effectiveAzimuthDeg, applyCalibrationInput, stepCalibrationOffset
  lock.ts                             evaluateLock
  projection.ts                       projectMarker
  permission.ts                       permissionTransition

src/components/pointing/              Pointing_Components
  deps.ts                             injected interfaces
  orientation-stream.ts               Subscription, Selection_Window, Attitude, No_Sample_Timeout, visibility
  permission-flow.ts                  side effects of the permission flow
  calibration-store.ts                localStorage read/write, steps
  drag-compass.ts                     pointer tracking → applyDrag
  pointing-session.ts                 composition; snapshot for React
  browser-deps.ts                     the only binding to window/document/screen/localStorage/DeviceOrientationEvent

src/app/pointing/page.tsx             route /pointing; 'use client'; the thin view (D9)
```

Import rules:

- `src/lib/pointing/**`: relative imports inside `src/lib/pointing` only (Requirement 1, criterion 2). No DOM globals (criterion 3), no timers, no storage (criterion 4).
- `src/components/pointing/*.ts`: may import `../../lib/pointing/index` (relative path, because Vitest has no `@/` alias configured) and each other. Only `browser-deps.ts` touches browser globals; none of them imports React.
- `src/app/pointing/page.tsx`: imports React, `../../components/pointing/pointing-session` and `../../components/pointing/browser-deps` (relative paths, the same style as the controllers). It touches browser globals only through `browser-deps.ts`.

## Components and Interfaces

### Core types (`src/lib/pointing/types.ts`, re-exported)

```ts
declare const sceneFrame: unique symbol;
/** A direction or point in the World_Frame = Scene_Frame of C40: +X east, +Y up, −Z north. */
export type SceneVector = { readonly x: number; readonly y: number; readonly z: number; readonly [sceneFrame]: true };

export interface CameraBasis { readonly forward: SceneVector; readonly up: SceneVector; readonly right: SceneVector }

export type OrientationEventType = 'deviceorientation' | 'deviceorientationabsolute';
export interface OrientationSample {
  readonly type: OrientationEventType;
  readonly absolute: boolean;
  readonly alpha: number | null;
  readonly beta: number | null;
  readonly gamma: number | null;
  /** Present only when the event carries a finite numeric webkitCompassHeading. */
  readonly webkitCompassHeading?: number;
}

export type HeadingSource = 'absolute' | 'compass' | 'relative';

export type SensorAttitude =
  | { readonly source: 'absolute' | 'relative'; readonly alphaDeg: number; readonly betaDeg: number; readonly gammaDeg: number }
  | { readonly source: 'compass'; readonly compassHeadingDeg: number; readonly betaDeg: number; readonly gammaDeg: number };

export interface DragPose { readonly headingDeg: number; readonly pitchDeg: number }
export interface TargetDirection { readonly azimuthDeg: number; readonly elevationDeg: number }

export interface LockResult {
  readonly pointingErrorDeg: number;
  readonly locked: boolean;
  readonly behind: boolean;
  readonly deviceHeadingDeg: number | null;
  readonly devicePitchDeg: number;
  readonly effectiveAzimuthDeg: number;
  readonly azimuthDifferenceDeg: number | null;
  readonly elevationDifferenceDeg: number;
}

export type MarkerPosition =
  | { readonly inFront: false }
  | { readonly inFront: true; readonly ndcX: number; readonly ndcY: number; readonly onScreen: boolean };

export type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable';
export type PermissionEvent =
  | 'request-started' | 'permission-granted' | 'permission-denied' | 'permission-error'
  | 'no-permission-api' | 'no-sample-timeout' | 'valid-sample-arrived';
```

### Core constants (`src/lib/pointing/constants.ts`, re-exported)

```ts
export const LOCK_TOLERANCE_DEG = 10;
export const LOCK_COMPARISON_EPSILON_DEG = 1e-9;      // D5
export const VERTICAL_EPSILON = 1e-9;                 // Vertical_Forward
export const SELECTION_WINDOW_MS = 300;
export const NO_SAMPLE_TIMEOUT_MS = 3000;
export const PERMISSION_TIMEOUT_MS = 5000;
export const CALIBRATION_STEP_DEG = 5;
export const DRAG_SENSITIVITY_DEG_PER_PX = 0.25;
export const VERTICAL_FOV_DEG = 75;
export const WMM_VALIDITY_START_MS = Date.UTC(2025, 0, 1);
export const WMM_VALIDITY_END_MS = Date.UTC(2030, 0, 1);
```

The timer constants are plain numbers in the core; only the controllers run timers.

### Core functions (barrel exports)

| Function | Signature | Behaviour |
|---|---|---|
| `selectHeadingSource` | `(s: OrientationSample) => HeadingSource` | `s.type === 'deviceorientationabsolute' \|\| s.absolute === true` → `'absolute'`; else `s.webkitCompassHeading !== undefined` → `'compass'`; else `'relative'`. Requirement 2, criterion 1. |
| `HEADING_SOURCE_PRIORITY` | `readonly ['absolute', 'compass', 'relative']` | Requirement 2, criterion 2. |
| `pickHeadingSource` | `(sources: readonly HeadingSource[]) => HeadingSource \| null` | Highest priority present; `null` for an empty list. |
| `toSensorAttitude` | `(s: OrientationSample) => SensorAttitude \| null` | Selects the source and returns the attitude if `s` is a Valid_Sample for it (D4), else `null`. Never substitutes a number for `null`. |
| `normalizeScreenOrientationDeg` | `(raw: unknown) => number` | Section "Screen orientation normalization". |
| `cameraBasisFromSensor` | `(a: SensorAttitude, screenOrientationDeg: number, declinationDeg: number) => CameraBasis` | Chain with α_eff (D3). `declinationDeg` is ignored for `'relative'`. |
| `cameraBasisFromDrag` | `(pose: DragPose) => CameraBasis` | Section "Drag basis". |
| `applyDrag` | `(pose: DragPose, dxPx: number, dyPx: number) => DragPose` | `heading = normalizeDeg360(h + 0.25·dx)`, `pitch = clamp(p − 0.25·dy, −90, 90)`. CSS y grows downward, so a drag toward the top (dy < 0) raises the pitch (Requirement 12, criterion 1). |
| `INITIAL_DRAG_POSE` | `DragPose` | `{ headingDeg: 0, pitchDeg: 0 }`. |
| `sceneDirection` | `(azimuthDeg: number, elevationDeg: number) => SceneVector` | C43 with R = 1. |
| `headingPitch` | `(forward: SceneVector) => { headingDeg: number \| null; pitchDeg: number }` | Section "Heading and pitch extraction". |
| `declinationDeg` | `(latitudeDeg: number, longitudeDeg: number, time: Date \| number) => number` | Section "Declination". |
| `effectiveAzimuthDeg` | `(azimuthDeg: number, calibrationOffsetDeg: number) => number` | `normalizeDeg360(az − offset)`. |
| `applyCalibrationInput` | `(previousDeg: number, input: unknown) => number` | `typeof input === 'number' && Number.isFinite(input)` → `normalizeDeg360(input)`; otherwise `previousDeg` (Requirement 7, criteria 3 and 5). Strings, including numeric strings, are rejected. |
| `stepCalibrationOffset` | `(currentDeg: number, deltaDeg: number) => number` | `normalizeDeg360(current + delta)`; 0 − 5 → 355. |
| `evaluateLock` | `(forward: SceneVector, target: TargetDirection, calibrationOffsetDeg: number) => LockResult` | Section "Lock geometry". |
| `projectMarker` | `(target: SceneVector, basis: CameraBasis, aspect: number) => MarkerPosition` | Section "Marker projection". |
| `permissionTransition` | `(state: PermissionState, event: PermissionEvent) => PermissionState` | Table below. |
| `normalizeDeg360`, `wrapDeg180` | `(v: number) => number` | Section "Lock geometry". |

### Permission transitions (`permission.ts`)

| From | Event | To | Requirement |
|---|---|---|---|
| unknown | request-started | requesting | 11.4 |
| denied | request-started | requesting | 11.8 (retry) |
| requesting | permission-granted | granted | 11.5 |
| requesting | permission-denied | denied | 11.6 |
| requesting | permission-error | unknown | 11.7 (reject, other value, timeout) |
| unknown | no-permission-api | granted | 11.9 |
| granted | no-sample-timeout | unavailable | 11.10 |
| unavailable | valid-sample-arrived | granted | D7 (approved, OQ-D2) |
| any other pair | — | unchanged | total function |

Every state has an exit: unknown and denied by a gesture, requesting by any settlement or the 5 s timeout, granted by the No_Sample_Timeout, unavailable by the Drag_Compass (automatic) and by D7.

### Injected interfaces (`src/components/pointing/deps.ts`)

```ts
export interface EventSourceLike {
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
}
export interface TimerApi { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(handle: unknown): void }
export interface Clock { nowMs(): number }
export interface VisibilitySource { isHidden(): boolean; onChange(listener: () => void): () => void }
export interface ScreenOrientationSource { readAngle(): unknown }
export interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** `undefined` when DeviceOrientationEvent.requestPermission does not exist. */
export type PermissionRequester = (() => Promise<unknown>) | undefined;
export interface PointerInput { readonly pointerId: number; readonly clientX: number; readonly clientY: number }
```

### `orientation-stream.ts`

`createOrientationStream({ events, timers, visibility, onAttitude, onFirstValidSample, onNoSampleTimeout })` returns `{ start(), stop(), getAttitude(), getSource() }`.

```text
start():                                   // a Subscription starts (Requirement 3, criterion 1)
    wanted = true; if active or visibility.isHidden(): return
    active = true; locked = null; attitude = null; window = null; candidates = {} (last attitude per source)
    add listeners 'deviceorientationabsolute' and 'deviceorientation' → onEvent
    noSampleTimer = timers.setTimeout(() => onNoSampleTimeout(), 3000)      // runs from Subscription start (3.2)

onEvent(e):
    a = toSensorAttitude(toOrientationSample(e)); if a === null: return    // not valid: ignored (3.4, 4.1)
    if locked === null:
        if window === null:                                                   // first Valid_Sample (3.3)
            clear noSampleTimer; onFirstValidSample()
            window = timers.setTimeout(lock, 300)
        candidates[a.source] = a
    else if a.source === locked:
        attitude = a; onAttitude(a)                                           // other sources ignored (3.5)

lock():  locked = pickHeadingSource(keys of candidates); attitude = candidates[locked]; onAttitude(attitude)   (3.4)

stop():  wanted = false; end()
end():   remove both listeners; clear timers; active = false; locked = null; attitude = null; onAttitude(null)   (3.6)
visibility change: hidden → end() keeping `wanted`; visible and wanted → start()     (3.6, 3.7)
```

`toOrientationSample(e)` (internal to the stream module): `type` from `e.type`; `absolute = e.absolute === true`; each of alpha, beta, gamma is the value if `Number.isFinite`, else `null`; `webkitCompassHeading` is set only if finite. Silence never ends a stream (3.5).

### `permission-flow.ts`

`createPermissionFlow({ requestPermission, timers, stream, onState })` returns `{ start(), requestFromGesture(), getState() }`. Every state change is `state = permissionTransition(state, event)` (Requirement 11, criterion 2).

```text
start():                                    // on mount; never calls the Permission_API (11.3)
    if requestPermission === undefined: dispatch('no-permission-api'); stream.start()      (11.9)

requestFromGesture():                       // called synchronously from a click handler (11.3)
    if state not in {unknown, denied}: return
    dispatch('request-started'); gen += 1; my = gen
    timeout = timers.setTimeout(() => settle(my, 'permission-error'), 5000)               (11.7)
    promise = requestPermission()           // first statement after dispatch: iOS needs the call inside the gesture
    promise.then(v => settle(my, v === 'granted' ? 'permission-granted' : v === 'denied' ? 'permission-denied' : 'permission-error'),
                 () => settle(my, 'permission-error'))
settle(id, event): if id !== gen or state !== 'requesting': return    // stale results are ignored
    clear timeout; dispatch(event); if state === 'granted': stream.start()               (11.5)

stream callbacks: onNoSampleTimeout → dispatch('no-sample-timeout'); onFirstValidSample → dispatch('valid-sample-arrived')
```

A call to `requestPermission()` that throws synchronously is handled like a rejection.

### `calibration-store.ts`

Storage key `zombieSatellite.pointing.calibrationOffsetDeg`. `createCalibrationStore(storage)` returns `{ get(), set(input), step(delta) }`.

- Read on creation: `raw = storage.getItem(key)`; `parsed = raw === null || raw.trim() === '' ? undefined : Number(raw)`; `offset = applyCalibrationInput(0, parsed)`. A missing or non-numeric value gives the default 0 (Requirement 7, criterion 7); `Number('abc')` is NaN and is rejected.
- `set(input)`: `offset = applyCalibrationInput(offset, input)`; persist `String(offset)`.
- `step(delta)`: `offset = stepCalibrationOffset(offset, delta)`; persist. The demo buttons call `step(-5)` and `step(+5)`.
- `browser-deps.ts` wraps `localStorage` so that `getItem` and `setItem` exceptions (private browsing, disabled storage) become `null` and no-ops.

### `drag-compass.ts`

`createDragCompass({ onPose })` returns `{ activate(), deactivate(), isActive(), pointerDown(p), pointerMove(p), pointerUp(p), getPose() }`.

- `activate()`: pose = `INITIAL_DRAG_POSE` (Requirement 12, criterion 2).
- Tracks one pointer (the first `pointerDown` while none is tracked); `pointerMove` of that pointer calls `applyDrag(pose, x − lastX, y − lastY)`; `pointerUp` ends tracking. Moves of other pointers are ignored.
- `src/app/pointing/page.tsx` forwards React pointer events and calls `setPointerCapture`; the drag surface sets `touch-action: none` so touch drags do not scroll.

### `pointing-session.ts`

`createPointingSession(deps)` composes the stream, the permission flow, the calibration store and the drag compass, and exposes `{ subscribe(listener), getSnapshot(), requestPermission(), setDragEnabled(on), stepCalibration(delta), pointerDown/Move/Up(p), setObserver(o), setTarget(t), dispose() }`.

- Mode: drag when the drag compass is active, else sensor. Entering `unavailable` or `denied` activates the drag compass (Requirement 11, criterion 11). The manual toggle activates or deactivates it at any time (Requirement 12, criterion 4). Nothing deactivates it automatically.
- Basis: drag mode → `cameraBasisFromDrag(pose)`; sensor mode → `cameraBasisFromSensor(attitude, normalizeScreenOrientationDeg(screen.readAngle()), D)` when an attitude exists, else no basis (Requirement 4, criterion 3).
- D: `declinationDeg(observer.latitudeDeg, observer.longitudeDeg, clock.nowMs())` for "absolute" and "compass", recomputed when the observer changes or the UTC date changes; 0 is passed for "relative" (and ignored by the core).
- Snapshot: `{ permission, mode, source, basis, lock: evaluateLock(basis.forward, target, offset) | null, calibrationOffsetDeg, declinationAppliedDeg | null }`, a new frozen object on each change, as `useSyncExternalStore` requires. The displayed heading is `lock.deviceHeadingDeg`, so display and lock share one basis (Requirement 3, criterion 8).

### `browser-deps.ts`

Builds the real dependencies: `events = window`; `timers = { setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window) }`; `clock = { nowMs: () => Date.now() }`; `visibility` from `document.visibilityState` and `visibilitychange`; `screen.readAngle = () => screen.orientation?.angle ?? (window as { orientation?: unknown }).orientation`; the wrapped `localStorage`; `requestPermission` bound to `DeviceOrientationEvent.requestPermission` when `typeof DeviceOrientationEvent !== 'undefined'` and that property is a function, else `undefined`. It never references `AbsoluteOrientationSensor` (Requirement 3, criterion 9).

### `src/app/pointing/page.tsx` (route `/pointing`)

`'use client'` page, the only React file of this spec (D9). It creates the session in an effect (so the prerender touches no browser global), subscribes with `useSyncExternalStore`, and renders:

- Permission state. In unknown: a "Enable motion sensors" button whose `onClick` calls `session.requestPermission()` directly. In denied: an error message and a "Try again" button (Requirement 11, criterion 8). In requesting: a waiting note. In unavailable: a note that no orientation data arrived and the drag compass is active.
- A drag compass toggle and a drag surface.
- The ±5° calibration buttons and the current offset.
- A readout: Heading_Source, heading (or "—" when `null`), pitch, Declination applied, effective azimuth, Pointing_Error, Azimuth_Difference, Elevation_Difference, locked, behind.
- Four numeric inputs (OQ-D1, approved): observer latitude and longitude, defaulting to the Reference_Observer 39.9042 and 116.4074; target azimuth and elevation, defaulting to 90 and 30 (due east, 30° up, so both axes must move before the drag compass, which starts at 0°/0°, can lock). A value is passed to the session only when it is finite and in range (latitude [−90, 90], longitude [−180, 180], elevation [−90, 90], azimuth any finite number); otherwise the input is marked invalid and the session keeps the previous value. No geolocation API is used in S3.

The page text says nothing about radio signals or beacons. A client page cannot export `metadata`, so the title is rendered as a React 19 `<title>` element.

## Data Models

The types above are the data model. The only persistent datum is the Calibration_Offset string under `zombieSatellite.pointing.calibrationOffsetDeg`. The only bundled data is the WMM2025 coefficient text.

## Correctness Properties

All properties are checked with plain example assertions in Vitest (Requirement 13, criterion 2); fast-check is not used. Each property lists exactly the cases that requirements.md names.

### Property 1: Pointing source modules stay inside `src/lib/pointing`
Every import and export specifier of every `.ts` file under `src/lib/pointing` is a relative path that resolves inside that directory. Checked by `tests/helpers/pointing-source-scan.ts`. Validates Requirement 1, criteria 2 and 5.

### Property 2: One heading-source decision
| Sample | Expected |
|---|---|
| type `deviceorientationabsolute`, absolute false | absolute |
| type `deviceorientation`, absolute true | absolute |
| type `deviceorientationabsolute`, with `webkitCompassHeading` 120 | absolute |
| type `deviceorientation`, absolute false, `webkitCompassHeading` 120 | compass |
| type `deviceorientation`, absolute false, no compass field | relative |

Validates Requirement 2, criteria 1 and 3.

### Property 3: §4.5 forward baselines
`cameraBasisFromSensor({ source: 'relative', alphaDeg, betaDeg, gammaDeg }, 0, 0).forward`, each component within 1e-9:

| α, β, γ | forward |
|---|---|
| 0, 90, 0 | (0, 0, −1) |
| 90, 90, 0 | (−1, 0, 0) |
| 180, 90, 0 | (0, 0, 1) |
| 270, 90, 0 | (1, 0, 0) |
| 0, 0, 0 | (0, −1, 0) |

Validates Requirement 5, criterion 4.

### Property 4: Non-zero screen orientation (approved addition OQ-12a)
For each row of Property 3 and σ ∈ {90, 180, 270}, plus σ = `normalizeScreenOrientationDeg(-90)`, the forward equals the row's σ = 0 value within 1e-9. Derivation: qAxis(Z, −σ) is applied first and leaves (0, 0, −1) unchanged (section "Attitude", consequence 1). Validates Requirement 5, criterion 8.

Approved addition (OQ-D3): `cameraBasisFromSensor({ source: 'relative', alphaDeg: 0, betaDeg: 90, gammaDeg: 0 }, 90, 0).up` = (1, 0, 0) within 1e-9 per component. Derivation: qAxis(Z, −90°) maps (0, 1, 0) to (1, 0, 0); qAxis(X, −90°), qAxis(Z, 0), qAxis(X, 90°) and qAxis(Y, 0) leave (1, 0, 0) unchanged. This covers the only effect of σ, which acts on `up` and `right`.

### Property 5: §4.5 UI conventions (approved addition OQ-12b)
`headingPitch` of the Property 3 forwards: (90, 90, 0) → heading 270; (270, 90, 0) → 90; (0, 90, 0) → heading 0 and pitch 0; (0, 0, 0) → pitch −90; within 1e-9. Validates Requirement 5, criterion 9.

### Property 6: Compass with tilt (approved addition OQ-12d)
Attitude `{ source: 'compass', compassHeadingDeg: 45, betaDeg: 120, gammaDeg: 60 }`, σ = 0, Declination 0. Derivation: forward.y = −cos 120° · cos 60° = 0.25; horizontal length ρ = sqrt(1 − 0.25²) = sqrt(0.9375); h₀ = 296.565051177078° (forward at α = 0 is (−sin 60°, 0.25, −sin 120° · cos 60°)); α_eff = h₀ − 45 = 251.565051177078°. Expected, within 1e-9:

- forward = (ρ sin 45°, 0.25, −ρ cos 45°) = (0.6846531968814576, 0.25, −0.6846531968814578)
- heading 45
- pitch asin(0.25) = 14.477512185929925°

Validates Requirement 5, criterion 10.

### Property 7: Declination at the acceptance points
`declinationDeg(lat, lon, Date.UTC(2026, 10, 15))` within 0.5° of the pinned table: Beijing −7.5631, Shanghai −6.55898, Ürümqi 2.49421, Guangzhou −3.28683. Validates Requirement 6, criterion 10.

### Property 8: Calibration sample and normalization
- `effectiveAzimuthDeg(90, 10)` = 80 within 1e-9; `20 · sceneDirection(80, 0)` = (19.696155, 0, −3.472964) within 1e-6. Requirement 7, criterion 2.
- `applyCalibrationInput(0, -5)` = 355; `applyCalibrationInput(0, -365)` = 355; `effectiveAzimuthDeg(90, -5)` = `effectiveAzimuthDeg(90, 355)` = 95. Requirement 7, criteria 3 and 4.

### Property 9: §4.4 target rows (approved addition OQ-12c)
`20 · sceneDirection(az, el)`: (0, 0) → (0, 0, −20); (90, 0) → (20, 0, 0); (180, 0) → (0, 0, 20); (270, 0) → (−20, 0, 0); (0, 90) → (0, 20, 0); (90, 45) → (14.142136, 14.142136, 0); within 1e-6. Real-data rows within 1e-4: (163.3780, 14.6746) → (5.5345, 5.0666, 18.5391); (163.7360, 45.4236) → (3.9313, 14.2463, 13.4754); (56.7028, −67.3222) → (6.4451, −18.4538, −4.2332). Validates Requirement 8, criterion 10.

### Property 10: Lock geometry
Forward `sceneDirection(0, 0)` = (0, 0, −1), Calibration_Offset 0:

| Target (az, el) | Expected |
|---|---|
| (0, 0) | error 0, locked, not behind |
| (10, 0) | error 10 within 1e-9, locked (exact boundary; D5) |
| (10.001, 0) | not locked |
| (180, 0) | behind, not locked |

Vertical_Forward: forward `sceneDirection(0, 90)`, target (0, 85): `deviceHeadingDeg` and `azimuthDifferenceDeg` are `null`; `devicePitchDeg` 90, `pointingErrorDeg` 5, `locked` true, `behind` false and `elevationDifferenceDeg` −5, each within 1e-9. Validates Requirement 8, criterion 9.

### Property 11: End-to-end correction chain (approved addition OQ-12e)
Observer Beijing, time `Date.UTC(2026, 10, 15)`, attitude `{ source: 'compass', compassHeadingDeg: 30, betaDeg: 90, gammaDeg: 0 }`, σ = 0, D = `declinationDeg(39.9042, 116.4074, time)`, Calibration_Offset +10, target (24.4369, 0). Derived from the pinned D = −7.5631: Device_Heading 30 + D = 22.4369; Effective_Azimuth 24.4369 − 10 = 14.4369; Azimuth_Difference −8; Pointing_Error 8; locked; not behind. Tolerances: Effective_Azimuth within 1e-9 (independent of D); Device_Heading, Azimuth_Difference and Pointing_Error within 0.5° (they inherit the Declination tolerance); `locked` and `behind` exact (8 ± 0.5 is far from 10). A missing, doubled or sign-flipped Declination moves the heading by about 7.6° or 15.1°; a missing or sign-flipped offset moves the Azimuth_Difference by 10° or 20°; each fails the 0.5° checks. Validates Requirement 9, criterion 3.

### Property 12: Permission transitions
Every row of the permission transition table, plus one unchanged pair (granted + request-started → granted). Validates Requirement 11, criterion 12 (transition part).

### Controller example checks (mocks, fake timers)

| Test | Steps and expectation | Requirement |
|---|---|---|
| relative then absolute in the window | relative Valid_Sample at t = 0, absolute at t = 100 → no source at 299 ms; source absolute at 300 ms | 3.4, 3.10 |
| no switch after lock | relative only in the window → relative at 300 ms; absolute Valid_Sample at 500 ms → source stays relative, attitude unchanged | 3.5, 3.10 |
| late first sample | first relative Valid_Sample at 1000 ms → no source at 1299 ms; source at 1300 ms | 3.2, 3.3, 3.10 |
| all-null samples only (desktop Chrome) | `deviceorientation` events with alpha, beta, gamma `null` at 0 and 100 ms → no source, no window; `onNoSampleTimeout` fires at 3000 ms; flow state unavailable | 3.4, 3.10, 11.10 |
| page hidden and visible | after lock, hide → both listeners removed, attitude `null`; show → listeners added again, new window opens at the next Valid_Sample | 3.6, 3.7, 3.10 |
| null alpha after a valid sample | locked relative stream; sample with alpha `null` → attitude unchanged; before any Valid_Sample, `getAttitude()` is `null` | 4.1, 4.3, 4.4 |
| no request without gesture | requester present; `start()` → requester not called, state unknown | 11.3, 11.12 |
| never-settling request | `requestFromGesture()` with a never-settling promise → requesting; at 5000 ms → unknown | 11.7, 11.12 |
| silent subscription | no requester; `start()` → granted; no samples; at 3000 ms → unavailable | 11.9, 11.10, 11.12 |
| calibration storage | empty storage → 0; stored `'abc'` → 0; `step(-5)` from 0 → 355 and `setItem(key, '355')`; a new store over the same storage reads 355 | 7.6–7.9 |
| drag | activate → (0, 0); drag +40 px right → heading 10; from 0, drag −40 px → heading 350; drag 400 px toward the top → pitch 90 (clamped) | 12.1–12.3, 12.6 |

## Error Handling

| Situation | Behaviour |
|---|---|
| Orientation sample with a required field `null`, absent or non-finite | Ignored: not a Valid_Sample; no selection, no attitude change, does not stop the No_Sample_Timeout. |
| Sample of a non-selected Heading_Source after lock | Ignored. |
| Permission promise rejects, throws synchronously, resolves with another value, or does not settle in 5 s | `permission-error` → unknown; retry offered. |
| Permission promise settles after its timeout or after a newer request | Ignored (generation check). |
| No Valid_Sample 3 s after Subscription start | unavailable; drag compass activated. |
| Non-finite Calibration_Offset input | Rejected; previous value kept. |
| Stored Calibration_Offset missing, empty or non-numeric | Default 0. |
| `localStorage` throws | Read gives `null` (default 0); write is skipped. |
| Screen orientation unreadable or non-finite | 0. |
| Declination latitude or longitude non-finite or out of range | `RangeError` from `declinationDeg`; the session keeps its previous D and the demo input shows the value as invalid. |
| Date outside 2025.0–2030.0 | Clamped; no error. |
| Forward vertical | Heading and Azimuth_Difference `null`; other fields given. |
| Target behind the camera in projection | `{ inFront: false }`. |

## Testing Strategy

- Environment: Vitest `node`, files under `tests/pointing/**` matching `tests/**/*.test.ts`, network guard active, no jsdom or React testing library (Requirement 13). Controller tests use `vi.useFakeTimers()` and pass `{ setTimeout, clearTimeout }` and `{ nowMs: () => Date.now() }` as the injected timer and clock, plus small hand-written mocks for the event source, visibility, storage and requester in `tests/helpers/pointing-mocks.ts`.
- Files:
  - `tests/pointing/source-boundary.test.ts` (Property 1), with `tests/helpers/pointing-source-scan.ts`, a copy of the S2 scanner pointed at `src/lib/pointing`; the S1 and S2 helpers are not changed.
  - `tests/pointing/heading-source.test.ts` (Property 2).
  - `tests/pointing/attitude.test.ts` (Properties 3 to 6).
  - `tests/pointing/declination.test.ts` (Property 7).
  - `tests/pointing/calibration.test.ts` (Property 8).
  - `tests/pointing/lock.test.ts` (Properties 9 to 11).
  - `tests/pointing/permission.test.ts` (Property 12).
  - `tests/pointing/orientation-stream.test.ts`, `permission-flow.test.ts`, `calibration-store.test.ts`, `drag-compass.test.ts` (controller example checks).
- Changed existing test: in `tests/scaffold/scaffold.test.ts` test `1.19`, the expected `.tsx` list under `src` becomes `['app/layout.tsx', 'app/page.tsx', 'app/pointing/page.tsx']` (D10, approved). The expected `readdirSync('src/app')` list becomes `['layout.tsx', 'page.tsx', 'pointing']` (OQ-D5, approved). No other assertion of that file changes.
- Review-only items: Requirement 1, criteria 3 and 4 (no DOM globals, no I/O in the core); Requirement 3, criteria 8 and 9; Requirement 6, criteria 5 and 6 (bundled data, size); Requirement 8, criterion 8 (no 8° constant); Requirement 10; Requirement 11, criteria 2 and 11; Requirement 12, criteria 4 and 5; Requirement 13, criterion 3; the `/pointing` page.

### Manual_Device_Checklist (final task, review item)

Serve the app over HTTPS (orientation events require a secure context) and open `/pointing`.

iPhone pass (Safari):
1. On first load, no permission prompt appears; the "Enable motion sensors" button is shown (state unknown).
2. Tap it and allow → granted; Heading_Source shows "compass".
3. Hold the phone upright facing a direction of known true bearing (for example along a street whose bearing is read from a map). The heading readout agrees with it within a few degrees; note the difference.
4. Rotate to landscape and back; the heading does not jump.
5. Keep the bearing and tilt the camera up to about 60° elevation; the heading must not jump by about 180° (risk R1).
6. Press −5° and +5°; the offset changes by 5° per press and survives a reload.
7. Switch to another app and back; the readout resumes.
8. Deny path: after clearing the site's motion permission, tap and deny → error message and "Try again".
9. Turn the drag compass on and off with the toggle.

Android pass (Chrome):
1. No permission prompt; state granted; Heading_Source shows "absolute".
2. Steps 3 to 7 and 9 of the iPhone pass.

## Risks

- **R1 webkitCompassHeading under steep tilt.** The "compass" formula takes the heading straight from `webkitCompassHeading` for every tilt (Requirement 5, criterion 3). If iOS reports the heading of the device's top edge rather than of the rear camera when the phone is tilted far back, the heading flips by about 180° at high elevations, exactly where satellite passes peak. There is an old report of this behaviour for the native iPhone compass ([Stack Overflow 7741550](https://stackoverflow.com/questions/7741550/iphone-compass-presents-the-wrong-heading-pitch-angle-is-about-45)); its relevance to current Safari is unverified. Mitigation in this design: checklist step 5. A fallback (heading from alpha with an offset taken from `webkitCompassHeading` while upright) would change Requirement 5, criterion 3 and is deliberately not designed (OQ-D4): a compensation for an unverified fault could turn a correct heading into a wrong one. If step 5 shows the flip on a real iPhone, a separate change is opened with the measured data.
- **R2 Relative alpha drift** (Known limitation 2 of requirements.md): only a constant offset can be calibrated.

## Design decisions recorded during review

- OQ-D1: Four numeric inputs on `/pointing`; observer defaults to the Reference_Observer (39.9042, 116.4074); target defaults to azimuth 90°, elevation 30°; no geolocation API in S3.
- OQ-D2: `unavailable` + `valid-sample-arrived` → `granted` (D7). granted means permission given (or no Permission_API) and Valid_Samples flowing or not yet ruled out. The drag compass is never deactivated automatically; the manual toggle stays.
- OQ-D3: One `up` check is added: (0, 90, 0) at σ = 90 gives up = (1, 0, 0) (Property 4).
- OQ-D4: Requirement 5, criterion 3 is implemented as written; no fallback is designed. Checklist step 5 tests the risk on a real iPhone.
- S1 scaffold test 1.19: only `app/pointing/page.tsx` is added to the `.tsx` list (D10).
- OQ-D5: In the same test, the expected `readdirSync('src/app')` list becomes `['layout.tsx', 'page.tsx', 'pointing']`, the minimal consequence of the approved `/pointing` route. Every other assertion of test 1.19 and of the file stays unchanged.

## Appendix: WMM2025 coefficients (verbatim `WMM.COF`)

Columns: n, m, g (nT), h (nT), ġ (nT/yr), ḣ (nT/yr). Header line `    2025.0            WMM-2025     11/13/2024`; the file ends with two lines of `9`s. `wmm2025-cof.ts` embeds the file text exactly, including the header and the terminator lines.

```text
    2025.0            WMM-2025     11/13/2024
  1  0  -29351.8       0.0       12.0        0.0
  1  1   -1410.8    4545.4        9.7      -21.5
  2  0   -2556.6       0.0      -11.6        0.0
  2  1    2951.1   -3133.6       -5.2      -27.7
  2  2    1649.3    -815.1       -8.0      -12.1
  3  0    1361.0       0.0       -1.3        0.0
  3  1   -2404.1     -56.6       -4.2        4.0
  3  2    1243.8     237.5        0.4       -0.3
  3  3     453.6    -549.5      -15.6       -4.1
  4  0     895.0       0.0       -1.6        0.0
  4  1     799.5     278.6       -2.4       -1.1
  4  2      55.7    -133.9       -6.0        4.1
  4  3    -281.1     212.0        5.6        1.6
  4  4      12.1    -375.6       -7.0       -4.4
  5  0    -233.2       0.0        0.6        0.0
  5  1     368.9      45.4        1.4       -0.5
  5  2     187.2     220.2        0.0        2.2
  5  3    -138.7    -122.9        0.6        0.4
  5  4    -142.0      43.0        2.2        1.7
  5  5      20.9     106.1        0.9        1.9
  6  0      64.4       0.0       -0.2        0.0
  6  1      63.8     -18.4       -0.4        0.3
  6  2      76.9      16.8        0.9       -1.6
  6  3    -115.7      48.8        1.2       -0.4
  6  4     -40.9     -59.8       -0.9        0.9
  6  5      14.9      10.9        0.3        0.7
  6  6     -60.7      72.7        0.9        0.9
  7  0      79.5       0.0       -0.0        0.0
  7  1     -77.0     -48.9       -0.1        0.6
  7  2      -8.8     -14.4       -0.1        0.5
  7  3      59.3      -1.0        0.5       -0.8
  7  4      15.8      23.4       -0.1        0.0
  7  5       2.5      -7.4       -0.8       -1.0
  7  6     -11.1     -25.1       -0.8        0.6
  7  7      14.2      -2.3        0.8       -0.2
  8  0      23.2       0.0       -0.1        0.0
  8  1      10.8       7.1        0.2       -0.2
  8  2     -17.5     -12.6        0.0        0.5
  8  3       2.0      11.4        0.5       -0.4
  8  4     -21.7      -9.7       -0.1        0.4
  8  5      16.9      12.7        0.3       -0.5
  8  6      15.0       0.7        0.2       -0.6
  8  7     -16.8      -5.2       -0.0        0.3
  8  8       0.9       3.9        0.2        0.2
  9  0       4.6       0.0       -0.0        0.0
  9  1       7.8     -24.8       -0.1       -0.3
  9  2       3.0      12.2        0.1        0.3
  9  3      -0.2       8.3        0.3       -0.3
  9  4      -2.5      -3.3       -0.3        0.3
  9  5     -13.1      -5.2        0.0        0.2
  9  6       2.4       7.2        0.3       -0.1
  9  7       8.6      -0.6       -0.1       -0.2
  9  8      -8.7       0.8        0.1        0.4
  9  9     -12.9      10.0       -0.1        0.1
 10  0      -1.3       0.0        0.1        0.0
 10  1      -6.4       3.3        0.0        0.0
 10  2       0.2       0.0        0.1       -0.0
 10  3       2.0       2.4        0.1       -0.2
 10  4      -1.0       5.3       -0.0        0.1
 10  5      -0.6      -9.1       -0.3       -0.1
 10  6      -0.9       0.4        0.0        0.1
 10  7       1.5      -4.2       -0.1        0.0
 10  8       0.9      -3.8       -0.1       -0.1
 10  9      -2.7       0.9       -0.0        0.2
 10 10      -3.9      -9.1       -0.0       -0.0
 11  0       2.9       0.0        0.0        0.0
 11  1      -1.5       0.0       -0.0       -0.0
 11  2      -2.5       2.9        0.0        0.1
 11  3       2.4      -0.6        0.0       -0.0
 11  4      -0.6       0.2        0.0        0.1
 11  5      -0.1       0.5       -0.1       -0.0
 11  6      -0.6      -0.3        0.0       -0.0
 11  7      -0.1      -1.2       -0.0        0.1
 11  8       1.1      -1.7       -0.1       -0.0
 11  9      -1.0      -2.9       -0.1        0.0
 11 10      -0.2      -1.8       -0.1        0.0
 11 11       2.6      -2.3       -0.1        0.0
 12  0      -2.0       0.0        0.0        0.0
 12  1      -0.2      -1.3        0.0       -0.0
 12  2       0.3       0.7       -0.0        0.0
 12  3       1.2       1.0       -0.0       -0.1
 12  4      -1.3      -1.4       -0.0        0.1
 12  5       0.6      -0.0       -0.0       -0.0
 12  6       0.6       0.6        0.1       -0.0
 12  7       0.5      -0.1       -0.0       -0.0
 12  8      -0.1       0.8        0.0        0.0
 12  9      -0.4       0.1        0.0       -0.0
 12 10      -0.2      -1.0       -0.1       -0.0
 12 11      -1.3       0.1       -0.0        0.0
 12 12      -0.7       0.2       -0.1       -0.1
999999999999999999999999999999999999999999999999
999999999999999999999999999999999999999999999999
```

The appendix text drops trailing spaces of the original file; the SHA-256 above refers to the downloaded file. Whitespace differences do not change the parsed values.
