> English translation of [`TECHNICAL_ROUTE.md`](TECHNICAL_ROUTE.md) (Chinese). Only section 2 (conventions) and section 4 (numeric baselines) are normative, as in the source.

# TECHNICAL_ROUTE, trimmed version for the repository (zombieSatellite)

> Source: the author's earlier personal project SatAware AR, "Technical Route and Acceptance Baselines" (baseline a0bc2d1, 2026-01-25). This file is the trimmed version for the repository; the original is archived outside the project.
> This file keeps only the three kinds of content that remain valid for zombieSatellite: **coordinate and angle conventions (section 2), the relevant known pitfalls (excerpt of section 3), and the numeric acceptance baselines (excerpt of section 4)**.
> Removed: the old project's feature list and the search / save / card / server API flows (the whole of section 1), the name-search acceptance samples (4.8), and the pitfalls about the IndexedDB satellite library, the server-side cache and the TLE auto-update threshold. zombieSatellite has a fixed catalog of 7 satellites, no custom backend and no user satellite library, so these features **must not be implemented**.
> Features that are specific to the new project and absent from this document (range rate / Doppler, WebAudio beacon, session state machine, QSL card, satellite catalog data, the pass-encryption algorithm) are governed by the requirements of the respective specs.
> Note on a difference in convention: the "alignment threshold 8°" in the table of 4.9 is the old project's value. The lock tolerance of zombieSatellite is ±10°; the spec governs.

---

# SatAware AR: Technical Route and Acceptance Baselines

> Code baseline: `a0bc2d1` (2026-01-25). Dependencies: Next.js 16.1.4, React 19.2.3, three 0.182.0, @react-three/fiber 9.5.0, @react-three/drei 10.7.7, satellite.js 6.0.2, idb-keyval, date-fns.
>
> Verification environment: Node v22.19.0, satellite.js 6.0.2; verification date 2026-11-09. This document gives only algorithms, conventions, formulas and pseudocode, and does not paste large blocks of source code.

---

## 2. Coordinate systems, angle zero points and positive directions, units, and the magnetic declination convention

> This section numbers every coordinate and angle that the project involves. The numbers C01 to C88 can be used as a code review and acceptance checklist. Unless stated otherwise, the UI shows angles in degrees (°) and the library computes internally in radians (rad).

### 2.1 Time and epoch

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C01 | Propagation time base | UTC instant | ISO 8601, milliseconds | All SGP4 propagation uses the UTC instant of a `Date`; local time is never treated as UTC |
| C02 | TLE epoch | Year + day of year | Year: two digits; day: 1.0 = 1 January 00:00 UTC, with fraction | `yy < 57 → 2000+yy`, otherwise `1900+yy`; `t0 = Date.UTC(y,0,0) + day*86400000` |
| C03 | Time display | Browser local time zone | `date-fns` local format | Epoch, fetch time and pass time are shown in the local time zone on cards and lists; the API and regression data use UTC |
| C04 | Time units | — | ms, s, min, h | Cache in ms; pass duration in min; simulation duration in h; timeouts in ms; throttling in s |
| C05 | Leap seconds / UT1 | Not modelled | — | `GMST` uses UTC directly; leap seconds, UT1-UTC and polar motion are not handled |
| C06 | Clock source | Device clock / server clock | — | AR and satellite cards use the device `new Date()`; the prediction API uses the server `new Date()` |

### 2.2 TLE orbital elements and units

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C07 | Inclination `i` | Equatorial plane | 0–180°, degrees | 0° equatorial; 90° polar; >90° retrograde |
| C08 | Right ascension of the ascending node `Ω` | Inertial reference direction (the vernal equinox direction in TEME) | 0–360°, degrees | Measured from the reference direction eastward / counter-clockwise to the ascending node |
| C09 | Eccentricity `e` | — | 0–1, dimensionless | The TLE uses 7 decimals; the code assembles `0.xxxxxxx` |
| C10 | Argument of perigee `ω` | Ascending node | 0–360°, degrees | In the orbital plane, measured along the direction of motion from the ascending node to perigee |
| C11 | Mean anomaly `M` | Perigee | 0–360°, degrees | Measured along the direction of motion from perigee |
| C12 | Mean motion `n` | — | rev/day (revolutions per day) | Raw TLE value; SGP4 applies its own correction internally; the card altitude formula uses the raw value |
| C13 | First derivative of mean motion | — | rev/day² | TLE line 1 field; set to 0 when the application parses it, the actual propagation uses the raw TLE |
| C14 | Second derivative of mean motion | — | rev/day³ | Same as above; set to 0 |
| C15 | `BSTAR` | — | 1/Earth radius | TLE drag term; set to 0 when the application parses it, the actual propagation uses the raw TLE |
| C16 | Revolutions / element set | — | revolutions, count | `REV_AT_EPOCH`, `ELEMENT_SET_NO`; placeholders when the application parses them |
| C17 | TLE checksum | — | — | The application does not verify the checksum; it only checks the line prefix `1 ` / `2 ` and the field slices |
| C18 | TLE line format | Fixed columns | Text | L1: NORAD `[2:7]`, international designator `[9:17]`, year `[18:20]`, day `[20:32]`; L2: inclination `[8:16]`, RAAN `[17:25]`, eccentricity `[26:33]`, argument of perigee `[34:42]`, mean anomaly `[43:51]`, mean motion `[52:63]` |
| C19 | Orbital altitude display | Earth equatorial radius | km | `h = a - 6378.137`; `a=(μ/n²)^(1/3)`; represents only the semi-major-axis altitude, not the instantaneous altitude |

### 2.3 ECI/TEME and ECF

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C20 | ECI/TEME | Earth-centred inertial frame | km; velocity km/s | Right-handed; the Z axis points to the north pole; the X axis points to the mean equinox of TEME; Y completes the right-handed system |
| C21 | SGP4 output | TEME | km, km/s | Without nutation or polar motion; the Earth radius is 6378.135 km (SGP4 constant) |
| C22 | GMST | From the equinox to the Greenwich meridian | rad, 0–2π | Grows with UTC; the rotation angle for ECI→ECF |
| C23 | ECF/ECEF | Earth-centred Earth-fixed frame | km | Right-handed; the X axis passes through the equator and the Greenwich meridian; the Y axis points to 90°E; Z is the north pole |
| C24 | ECI→ECF rotation | About the Z axis | — | `x_ecf = x cosθ + y sinθ`; `y_ecf = -x sinθ + y cosθ`; `z_ecf = z` |
| C25 | Velocity | — | km/s | `propagate` also returns the velocity; this project uses only the position, the velocity takes no part in display or guidance |

### 2.4 Geodetic coordinates and the observer

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C26 | Latitude `φ` | Equator | -90° to +90°, degrees; north positive | Geodetic latitude (WGS84), not geocentric latitude |
| C27 | Longitude `λ` | Greenwich meridian | -180° to +180°, degrees; east positive | Observer longitude; the X axis of ECF is 0° |
| C28 | Observer height `h` | WGS84 ellipsoid surface | km; up positive | The `height` of satellite.js `geodeticToEcf` is in km; GPS metres are divided by 1000 first |
| C29 | WGS84 ellipsoid | — | a=6378.137 km; b=6356.7523142 km | Flattening `f=(a-b)/a`; first eccentricity squared `e²=2f-f²` |
| C30 | Observer ECF | Earth centre | km | `N=a/√(1-e²sin²φ)`; `x=(N+h)cosφcosλ`; `y=(N+h)cosφsinλ`; `z=(N(1-e²)+h)sinφ` |
| C31 | GPS altitude | Browser return value | m → km | An empty / 0 `altitude` is taken as 0 km; ellipsoidal height and geoid height are not distinguished, so platform differences can cause errors |
| C32 | Earth curvature / terrain | Not modelled | — | The horizon is judged by line-of-sight geometry only; obstruction, refraction and terrain are not considered |

### 2.5 Topocentric ENU and look angles

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C33 | Topocentric coordinates | Observer | km | `S` positive to the south; `E` positive to the east; `U` positive up |
| C34 | Topocentric transform | — | — | `S=sinφcosλΔx+sinφsinλΔy-cosφΔz`; `E=-sinλΔx+cosλΔy`; `U=cosφcosλΔx+cosφsinλΔy+sinφΔz` |
| C35 | Slant range `range` | Observer | km | `range=√(S²+E²+U²)`; the straight-line distance from the satellite to the observer |
| C36 | Elevation `el` | Local horizontal plane | -90° to +90°, degrees; up positive | `el=asin(U/range)`; 0° is the ideal horizon; no atmospheric refraction correction |
| C37 | Azimuth `az` | True north | 0°=north, 90°=east, 180°=south, 270°=west; clockwise positive | `az=atan2(-E,S)+π`; radians internally, degrees on output; mathematical range [0,2π), at the due-north boundary 2π, that is 360°, can occur |
| C38 | Visibility | Elevation 0° | Boolean | Only `el > 0` is marked visible; the trajectory below the horizon still exists but is drawn dashed |
| C39 | Line-of-sight distance | — | km | Not shown in the UI; used only for computation and acceptance |
### 2.6 Three.js world and camera

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C40 | Three.js world frame | Observer / camera origin | Scene units (arbitrary) | Right-handed; `+X` east, `+Y` up, `-Z` north |
| C41 | Camera | Origin `(0,0,0)` | Scene units | Default direction `-Z`; `+Y` is up; `fov=75°` is the vertical field of view; near/far use the R3F defaults |
| C42 | Satellite / trajectory radius | Fixed `R=20` | Scene units | Not scaled by the real slant range; only the direction (azimuth / elevation) is kept |
| C43 | Sphere → Cartesian | — | — | `x=R cos(el) sin(az)`; `y=R sin(el)`; `z=-R cos(el) cos(az)` |
| C44 | Scene azimuth mapping | `az=0` → `-Z` | — | `90°` → `+X`; `180°` → `+Z`; `270°` → `-X` |
| C45 | Scene elevation mapping | `el=0` → XZ plane | — | `+90°` → `+Y`; negative elevation lies below the plane |
| C46 | Trajectory time window | `now-10 min` to `now+H*60 min` | min | `H ∈ {1,12,24}`; `step=max(1,floor(H*60/200))` min; the actual number of points is about 71/244/208, not strictly ≤200 |
| C47 | Trajectory refresh | Computation instant fixed | — | Recomputed only when the observer object, `satRec` or `H` changes; the passage of time does not roll the window by itself, a parameter change or a re-mount is needed |
| C48 | Visible trajectory segment | Elevation 0° | — | `el>0` solid; `el≤0` dashed; same colour |
| C49 | Marker size | — | Scene units | Outer halo radius 1, core 0.3; the HTML label scales with distance (`distanceFactor=15`) |
| C50 | Compass | `y=-2` | Scene units | N at `-Z`, S at `+Z`, E at `+X`, W at `-X`, radius 10; grid 40×8 |
| C51 | HUD | 2 units in front of the camera | Scene units | `HUD = camera.position + 2*forward`; takes no part in depth occlusion |
| C52 | Alignment criterion | Camera forward and target direction | Degrees | `angle=acos(f·u)`; `angle<8°` shows the reticle; `f·u<0` counts as behind |
| C53 | Arrow orientation | `lookAt(target)` | — | The arrow child is rotated +90° about X so that the cylinder `+Y` aligns with the `+Z` of `lookAt`; the reticle uses `lookAt(camera)` |
| C54 | Calibration rotation | World group about `+Y` | Degrees | `rotation.y = headingOffset*π/180`; a positive offset makes the effective target azimuth `az' = az - offset` |
| C55 | Opacity | Video layer | 0–100% | `video.style.opacity = value/100`; 100 is full video, 0 hides the video and shows the starfield; the starfield is visible only at exactly 0 |

### 2.7 Device attitude, heading and compass

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C56 | Device coordinate frame | Device screen | Right-handed | `+X` screen right, `+Y` screen up, `+Z` out of the screen (towards the user); the rear camera direction is `-Z` |
| C57 | `alpha` | About the device `+Z` | 0–360°, degrees | W3C device orientation; with the device flat, `alpha=0` means the top edge of the device points to the reference north; the positive direction is right-handed (counter-clockwise seen from above) |
| C58 | `beta` | About the device `+X` | -180° to +180°, degrees | Front-back pitch; 0° when flat, about +90° with the phone upright (right-handed) |
| C59 | `gamma` | About the device `+Y` | -90° to +90°, degrees | Left-right roll; right-handed |
| C60 | Attitude rotation order | Intrinsic Z-X'-Y'' | — | Equivalent to extrinsic Z-X-Y; W3C convention |
| C61 | three-stdlib camera mapping | — | — | `q_cam = Euler(beta, alpha, -gamma, 'YXZ')` corresponds to the quaternion × `Rx(-90°)` × `Rz(-screenOrientation)` |
| C62 | Measured camera direction | `beta=90°` is upright | — | `alpha=0`→`-Z` (north); `90`→`-X` (west); `180`→`+Z` (south); `270`→`+X` (east); `beta=0`→`-Y` (down) |
| C63 | Screen orientation | `window.orientation` | 0/90/-90/180°, degrees | 0 portrait; ±90 landscape; 180 upside down; three-stdlib compensates with `Rz(-orient)` |
| C64 | Scene attitude input | `deviceorientation` | — | `DeviceOrientationControls` subscribes only to `deviceorientation`; it does not use `deviceorientationabsolute` or `AbsoluteOrientationSensor` directly |
| C65 | Absolute attitude event | `deviceorientationabsolute` | — | Used only for the UI heading; when `absolute` is true, `heading=360-alpha` converts it to a clockwise heading |
| C66 | iOS compass heading | `webkitCompassHeading` | 0–360°, degrees | 0=north, 90=east, clockwise; UI only; may be magnetic north, see C70 |
| C67 | Absolute attitude sensor | `AbsoluteOrientationSensor` | Quaternion `[x,y,z,w]` | The code assumes ENU: X=east, Y=north, Z=up; `forward=(0,0,-1)`; `heading=atan2(x,y)` normalized to 0–360; `pitch=asin(z)` |
| C68 | UI pitch | Computed from the Z-X-Y quaternion | -90° to +90°, degrees; up positive | `q=qZ(alpha)qX(beta)qY(gamma)`; `forward=(0,0,-1)`; `pitch=asin(forward.z)`; without a computed value it falls back to showing `beta` |
| C69 | Heading normalization | North=0 | 0–360°, degrees | The sensor path is normalized; the `360-alpha` path can show 360.0; `webkitCompassHeading` is given by the system; the UI does not wrap uniformly |
| C70 | Magnetic declination | Not modelled | Degrees | The code has no WMM/IGRF and does not compute the declination from latitude / longitude / date; by default this is equivalent to a correction of 0 |
| C71 | Manual calibration offset | Global scalar `headingOffset` | Degrees; may be negative | Default 0; ±5° buttons; `(offset+delta)%360`, a negative value is not normalized to 0–360; written to `localStorage['ar_heading_offset']` |
| C72 | Declination sign suggestion | East positive | Degrees | An operating suggestion only: if the device is referenced to magnetic north and the declination is `D` east, try `headingOffset=+D`; if the system already outputs true north it should be 0; it must be verified in the field |
| C73 | Compass accuracy | Not used | — | `webkitCompassAccuracy` is not read; drawing a figure "8" is only a UI hint, there is no automatic calibration algorithm |
| C74 | "True north" wording | Nominal | — | The UI says "true north", but in practice it may be magnetic north / an uncalibrated heading; it cannot serve as the basis for true-north acceptance |
| C75 | CSS / screen coordinates | Top-left corner | `+x` right, `+y` down | Used only by the DOM / video layer; takes no part in the satellite projection |
| C76 | Three.js NDC | Screen centre | `x,y ∈ [-1,1]`; `+x` right, `+y` up | Output of the camera projection; there is no hand-written screen-coordinate conversion |

### 2.8 Passes and UI angles / units

| ID | Quantity / convention | Zero point and positive direction | Range / unit | Notes |
|---|---|---|---|---|
| C77 | Pass start / end | Sampling grid | 1 min granularity | The first sample with `el>0` is the start; the first sample with `el≤0` is the end; no interpolation |
| C78 | Maximum elevation | Sample point | Degrees | The maximum of the discrete samples, not the continuous maximum |
| C79 | Pass duration | Start to end | min | `(end-start)/60000`; shown rounded to whole minutes |
| C80 | Minimum pass elevation | 0° | Degrees | Fixed at 0° in the API; the UI does not expose a minimum-elevation parameter |
| C81 | Pass window | Query instant | h | API default 24; the component supports 24/48/72/168; the card is fixed at 24 |
| C82 | Pass time source | — | — | The API uses the server `new Date()`; the card uses the device `new Date()`; the two can differ |
| C83 | UI azimuth / elevation precision | — | 1 decimal, degrees | `toFixed(1)`; the direction `↑/↓` looks only at the elevation difference over the next 10 s |
| C84 | UI heading / pitch precision | — | 1 decimal, degrees | Heading 1 decimal; pitch 1 decimal; GPS latitude / longitude 4 decimals |
| C85 | UI altitude precision | — | 1 decimal, km | Card `toFixed(1)` |
| C86 | Cache / refresh | — | min, h | Search cache 5 min; cleanup period 1 h; TLE auto-update threshold 360 min; card freshness 24 h/72 h |
| C87 | Camera / geolocation parameters | — | ms, px | Ideal video 1920×1080; geolocation timeout 20 s, maximum age 1 s; video redraw retries 0/200/500/1000 ms |
| C88 | Trajectory / HUD parameters | — | Scene units, degrees, s | R=20; HUD 2; compass radius 10; grid 40/8; alignment 8°; future direction 10 s; UI throttling 0.2 s; calibration step 5° |
### 2.9 Core formulas and pseudocode

#### 2.9.1 TLE epoch

```text
yy = int(line1[18:20])
year = (yy < 57) ? 2000+yy : 1900+yy
day  = float(line1[20:32])
t0   = Date.UTC(year, 0, 0) + day*86400000 ms
```

#### 2.9.2 Look angles

```text
lookAngles(satrec, t, observer):
    (p_eci, v_eci) = SGP4(satrec, t)          # km, km/s, TEME
    θ = GMST(t)                                # rad
    p_ecf = Rz(-θ) * p_eci                     # km
    p_obs = WGS84toECF(observer)               # km
    Δ = p_ecf - p_obs
    (S,E,U) = ENU(observer.lat, observer.lon) * Δ
    r = sqrt(S² + E² + U²)
    el = asin(U / r)
    az = atan2(-E, S) + π                      # 0=north, clockwise
    if az >= 2π: az -= 2π                      # recommended normalization; the library may return 2π at the boundary
    return (az, el, r)
```

#### 2.9.3 Scene coordinates

```text
toScene(az, el, R=20):
    x = R * cos(el) * sin(az)
    y = R * sin(el)
    z = -R * cos(el) * cos(az)
    return (x,y,z)

inverse(x,y,z):
    el = asin(y / R)
    az = atan2(x, -z) mod 2π
```

#### 2.9.4 Calibration rotation

```text
R_y(offset):
    x' =  x*cos(offset) + z*sin(offset)
    z' = -x*sin(offset) + z*cos(offset)
Equivalent azimuth: az' = az - offset
```

#### 2.9.5 Device attitude to camera

```text
q_cam = quat(Euler(beta, alpha, -gamma, 'YXZ'))
        * Rx(-90°)
        * Rz(-screenOrientation)
forward = q_cam * (0,0,-1)
up      = q_cam * (0,1,0)
right   = q_cam * (1,0,0)

heading = atan2(forward.x, forward.y) mod 360   # 0=north, clockwise
pitch   = asin(forward.z)                       # up positive
```

#### 2.9.6 HUD guidance

```text
f = normalize(camera.forward)
u = normalize(target - camera.position)
angle = acos(clamp(dot(f,u), -1, 1))
aligned = angle < 8°
behind  = dot(f,u) < 0
hudPos  = camera.position + 2*f
arrow.lookAt(target)
reticle.lookAt(camera.position)
```

#### 2.9.7 Orbital altitude

```text
n = MEAN_MOTION * 2π / 86400          # rad/s
a = (398600.4418 / n²)^(1/3)          # km
h = a - 6378.137                      # km
```

#### 2.9.8 Pass prediction

```text
passes = []
inPass = false
for t = t0; t < t0 + duration; t += 1 min:
    a = lookAngles(satrec, t, observer)
    visible = (a != null && a.el > 0)
    if visible and not inPass:
        inPass = true; start = t; maxEl = a.el
    else if visible and inPass:
        maxEl = max(maxEl, a.el)
    else if not visible and inPass:
        inPass = false; push(start, t, maxEl, (t-start)/60000)
if inPass:
    push(start, end, maxEl, (end-start)/60000)   # truncated at the end of the window
```

---

## 3. Pitfalls met during development and how they were handled

> Every item below can be checked against the current code, the code comments or the commit history. Items marked "still present" are not historical problems but remaining risks that acceptance should watch for.

### P01 The camera must run in a secure context

- Symptom: over HTTP `navigator.mediaDevices` does not exist, or the camera fails outright.
- Handling: before entering AR, check `window.isSecureContext`; on failure show a clear message "HTTPS or localhost is required"; give separate Chinese error messages for `NotAllowedError` and `NotFoundError`.
- Acceptance: a non-secure context should show an error rather than a black screen; on localhost or HTTPS a stream can be obtained.

### P02 Black camera picture until the window size changes

- Symptom: the video is playing but the first frame is not shown; it appears only after a resize is triggered.
- Handling: call `play()` after `loadedmetadata`; right after the camera succeeds, run one "forced redraw": temporarily set the video transform to `scale(1.0001)`, restore it to `none` on the next frame, and dispatch `window.resize`; retry at 0, 200, 500 and 1000 ms.
- Acceptance: within 1 s after camera permission is granted the picture should be visible; rotating the screen or resizing the window must not be necessary for display.

### P03 Sub-path deployment causes 404 for the API and static assets

- Symptom: deployed under `/sat-aware`, the client still requests `/api/...`, or the manifest icon paths are wrong.
- Handling: `next.config.ts` sets `basePath` and `NEXT_PUBLIC_BASE_PATH`; every client fetch and the manifest `start_url` / icons are prefixed with `BASE_PATH`.
- Pitfall: `.env` writes `BASE_PATH=""`, but the configuration uses `process.env.BASE_PATH || "/sat-aware"`; an empty string is still falsy, so the value is still `/sat-aware`. To deploy at the root path it is not enough to clear the variable, the configuration has to change.
- Acceptance: under `/sat-aware/` all APIs return JSON and static assets return 200; a root-path deployment needs an explicitly empty basePath.

### P04 The iOS attitude permission must be triggered by a user gesture

- Symptom: automatically requesting `DeviceOrientationEvent.requestPermission()` is rejected; or after the user refuses, the page stays on the loading screen.
- Handling: add a `waiting_permission` state and a "tap to authorize sensors" button; request the permission in the button event and try full screen at the same time; on success write `localStorage['ar_permission_granted']`; provide an error retry.
- Pitfall: if `ar_permission_granted` is true but iOS rejects the automatic request outside a gesture, the catch of `requestOrientation(true)` sets no error, `orientation` may stay at `pending` for a long time, and the loading overlay has no retry button. Still present; during acceptance clear localStorage or reload the page.
- Acceptance: the first entry must show the authorization button; after authorization AR starts; after a refusal an error is shown and a retry is possible.

### P05 Heading "true north / magnetic north / relative north" is inconsistent

- Symptom: the references of iOS `webkitCompassHeading`, Android `alpha` and `AbsoluteOrientationSensor` differ; the UI heading and the scene direction can be out of sync.
- Handling: the scene uniformly uses `alpha/beta/gamma` through `DeviceOrientationControls`; the UI computes the heading separately; a manual ±5° world rotation calibration is added; the user is prompted to draw a figure "8" to calibrate the compass.
- Pitfall: `DeviceOrientationControls` subscribes only to `deviceorientation` and does not use `deviceorientationabsolute` or the sensor quaternion; on some Android / iOS devices `deviceorientation.alpha` may be a relative value, the scene drifts with the device start direction, and a manual constant offset cannot fix a dynamic drift. Still present.
- Acceptance: on the same device the UI heading and the scene north should agree within ±5°; if not, first confirm whether `alpha` is absolute, then calibrate manually.

### P06 The HUD arrow points the wrong way after the world is rotated

- Symptom: after the world group is rotated to align the compass and the satellite, the satellite marker and the trajectory turn, but the HUD arrow stays in the unrotated space and is off by the offset angle.
- Handling: the HUD target position uses `applyAxisAngle(Y, calibrationRotation)` to transform the satellite scene coordinates into the unrotated camera space; the world group wraps only the satellite, the trajectory and the compass.
- Acceptance: after calibrating +10°, the arrow and the satellite marker should keep the same direction; the reticle appears when the target comes within 8°.

### P07 With the target behind, the arrow still "looks" as if it points forward

- Symptom: the HUD is fixed in front of the camera, so with the target behind, the arrow is still shown near the screen centre and the user does not know to turn around.
- Handling: judge "behind" with `dot(forward,target)<0`; the arrow turns red and pulses faster (angular speed 10 vs 5); in front it is cyan.
- Pitfall: the arrow is still located in front of the HUD and does not automatically point in the "turn around" direction; this is a UX limitation, not a coordinate error.
- Acceptance: with the target behind, the colour is red and the pulse is faster; after turning around it returns to cyan.

### P08 The HUD is occluded by scene objects

- Symptom: the arrow / reticle is blocked by the satellite marker or the trajectory.
- Handling: the HUD material has `depthTest=false`, and some use additive blending; the HUD is fixed 2 units in front of the camera.
- Acceptance: the arrow / reticle is always visible; the satellite marker can be covered by the HUD.

### P09 The real slant range causes near/far and scale problems

- Symptom: the slant range of a satellite is hundreds to tens of thousands of km; using it directly as the scene radius exceeds the camera far plane or makes the marker too small to see.
- Handling: all satellites / trajectories use a scene sphere of `R=20` and keep only azimuth / elevation; the marker size is fixed.
- Pitfall: satellites of different altitudes show no distance difference on screen; the trajectory is a "direction trajectory", not an orbit to scale.
- Acceptance: both low-orbit and high-orbit satellites should lie on the same radius sphere; the UI still shows the real slant range (if shown).

### P10 The JSON/TLE format mismatch of the CelesTrak ID search (current defect)

- Symptom: the `id` branch requests `FORMAT=json`, but then parses the response as three-line TLE text; the actual response is a single line of JSON, the loop ends immediately, and an empty array is returned.
- Impact: an exact search by NORAD ID fails; the first default satellite `id=59705` is not loaded automatically either.
- Current handling: none (the code is still a JSON request with TLE parsing).
- Suggested fix: change the ID branch to `FORMAT=tle`, or run `JSON.parse` on the JSON response and map the fields; only one of the two, never mixed.
- Acceptance: `?id=25544` should return one ISS record; the current expectation is `[]` (HTTP 200), which is a known failing sample.

### P11 The CelesTrak "200 but no data" response

- Symptom: CelesTrak may return HTTP 200 with the body `No GP data found` or `No records found` instead of 404.
- Handling: check the body keywords first, then the status code; both are treated as 404.
- Pitfall: if an HTML error page is returned, the keywords do not match, parsing may yield an empty array and return 200 `[]`; the front end then shows "no search results" instead of "service error".
- Acceptance: the no-data keywords must return 404; an HTML error page should return 500 or an explicit error.

### P13 The TLE parse fields are only "display metadata"

- Symptom: `parseTLE` sets `EPHEMERIS_TYPE`, `CLASSIFICATION_TYPE`, `ELEMENT_SET_NO`, `REV_AT_EPOCH`, `BSTAR`, `MEAN_MOTION_DOT` and `MEAN_MOTION_DDOT` to fixed placeholder values (0/U/999 and so on) instead of really parsing them.
- Handling: propagation always hands the raw `TLE_LINE1`/`TLE_LINE2` to satellite.js and does not depend on these placeholder fields.
- Pitfall: if these fields are later used for drag / lifetime analysis, the result is wrong; the UI must not present them as real values.
- Acceptance: the propagation result agrees with the raw TLE; the placeholder fields must not be used in computation.

### P16 The error of the 1-minute pass sampling

- Symptom: the pass start / end / maximum elevation are all taken on a 1 min grid; the maximum elevation can be clearly lower than the true maximum.
- Handling: accept the 1 min resolution; the card and the API use the same algorithm; there is no interpolation.
- Measured: for one ISS pass the 1 min result is 11:19–11:29 with a maximum of 45.42°; the 1 s reference is rise 11:18:05, maximum 11:23:24, set 11:28:47 and a maximum of 48.61°. The maximum elevation is underestimated by about 3.19° and the boundaries differ by about 13–55 s.
- Pitfall: if a pass is still visible at the end of the window, `endTime` is truncated to the end of the window and the duration is too short; for a pass that is already above the horizon at query time, `startTime` is truncated to the query instant.
- Acceptance: for the same TLE / observer, the 1 min algorithm should reproduce the sample in this document; do not use the 1 s reference to demand 0.1° precision.

### P17 Client-side pass computation can block the UI

- Symptom: every card runs 1440 propagations over 24 h in the browser; with many satellites the first screen stutters.
- Handling: use `setTimeout(100)` to postpone the computation until after rendering; the full pass API is implemented and can move to the server; but the current page does not mount `PassPredictions`, so the cards still run on the client.
- Pitfall: with many satellites it is still an O(satellites×1440) main-thread computation; there is no Web Worker, cache or cancellation mechanism.
- Acceptance: 5 satellites should not cause an obvious long task on the first screen; if one appears, first move the card prediction to the server / a Worker.

### P19 The camera FOV does not match the video picture

- Symptom: the satellite marker position in the picture is offset from the real camera picture, especially in landscape / wide-angle / telephoto.
- Handling: the Canvas has a fixed `fov=75°` vertical field of view; the video is filled with CSS `object-cover`; the camera intrinsics / real FOV are not read.
- Pitfall: `object-cover` crops, and the real horizontal / vertical FOV varies with the device aspect ratio; a fixed 75° cannot cover all devices. Still present.
- Acceptance: on the same device the satellite should be near the correct azimuth; absolute angle alignment across devices cannot be a hard metric unless an FOV calibration is added.

### P20 The device attitude input sources are not unified

- Symptom: the scene uses `deviceorientation`, while the UI may use `webkitCompassHeading`, `deviceorientationabsolute` or `AbsoluteOrientationSensor`; the three differ in reference frame and refresh rate.
- Handling: the scene depends only on `DeviceOrientationControls`; the other sources are for UI display only; manual calibration is added.
- Pitfall: the `alpha` on iOS may be a relative value and `webkitCompassHeading` is the compass, but the scene does not use the latter, so the UI heading and the scene direction disagree. The relation between the `referenceFrame:'device'` of `AbsoluteOrientationSensor` and the screen orientation also takes no part in the scene.
- Acceptance: do not use the UI heading to assert the scene direction directly; verify in the field with a known landmark or the compass N label in the picture.

### P21 Jumps caused by `alpha=0`, null values and screen orientation

- Symptom: when the sensor briefly returns `null` or `alpha=0`, three-stdlib handles it with `device.alpha ? ... : 0`, which may treat a momentary null as 0 and make the picture jump.
- Handling: currently no extra filtering / holding of the previous frame; it relies on the stability of browser events.
- Pitfall: jumps occur on fast rotation, background switching and permission changes; there is no low-pass filter or quaternion interpolation.
- Acceptance: after fast turning the picture should be stable; if the jump is obvious, an attitude filter is needed.

### P22 The sign of the calibration offset and negative modulo

- Symptom: the positive direction of `headingOffset` is "the world rotates about +Y", not "device heading plus offset"; when the user presses +5°, the effective target azimuth decreases by 5°.
- Handling: the UI lets the user try with "↺ -5° / ↻ +5°"; the value is written to localStorage; the world group and the HUD target rotate together.
- Pitfall: `(offset+delta)%360` does not normalize negative numbers to 0–360 and may show -5°; a value read with `parseFloat` from an invalid input becomes NaN, which is not checked.
- Acceptance: after +10°, the effective scene azimuth of a due-east target (az=90°) becomes 80°; see the synthetic samples in section 4.

### P23 A placeholder satellite / empty TLE is also judged "ready"

- Symptom: `satelliteData` is judged pending only when NORAD=0 and the name is "loading..."; if a real satellite object exists but its TLE is empty / corrupt, it is still `success`.
- Handling: when `getSatRec` fails inside the Scene it returns null and the satellite marker is not shown; the loading overlay gives no hint.
- Pitfall: the user may enter AR and see no satellite, and there is no error message. Still present.
- Acceptance: an empty TLE should show an explicit error or stay on the loading page; it must not show only a blank AR view.

### P25 Missing PWA icons and deployment details

- Symptom: `manifest.ts` references `/icon-192.png` and `/icon-512.png`, but these two files are currently not in `public/`.
- Handling: the manifest logic is correct but the assets are not provided; installing to the home screen may show no icon or a 404.
- Acceptance: `/sat-aware/manifest.webmanifest` is reachable; both icon URLs should return 200.

### P26 There are no automated tests

- Symptom: the repository has no test script / test directory; regression relies on manual work.
- Handling: section 4 of this document gives a set of numeric baselines with fixed TLEs, fixed UTC times and a fixed observer; it is suggested to turn them into unit tests (look angles, scene coordinates, passes, TLE parsing, ID search format).
- Acceptance: with the same dependency versions the numbers should be reproduced within the given tolerances.

---
## 4. Measured / verified data samples usable as acceptance references

### 4.1 Verification conditions

- Dependency: `satellite.js@6.0.2`.
- Runtime environment: Node v22.19.0.
- Observer: latitude `39.9042°N`, longitude `116.4074°E`, height `0 km` (near Beijing, easy to reproduce).
- Time: UTC; the TLEs are real snapshots obtained from CelesTrak on 2026-11-09.
- Computation: the same satellite.js API as the project is called directly, together with the same `predictPasses` 1 min sampling logic as the project.
- Suggested tolerances: for the same TLE and the same dependency version, azimuth / elevation ±0.01°, slant range ±0.1 km; UI display ±0.1°; pass time ±1 min; altitude ±0.1 km.

### 4.2 TLE parsing and altitude baseline

Input TLEs:

```text
ISS (ZARYA)
1 25544U 98067A   26312.17541007  .00012511  00000+0  23266-3 0  9990
2 25544  51.6320 307.5621 0007219   1.6306 358.4705 15.49256954594075

ZHIHUI TIANWANG-1 01A
1 59705U 24087A   26311.22081558  .00000078  00000+0  00000+0 0  9994
2 59705  53.1294 164.6873 0030347 201.1538 158.8133  2.00561174 18176
```

| Field | ISS (ZARYA) | ZHIHUI TIANWANG-1 01A |
|---|---|---|
| NORAD_CAT_ID | 25544 | 59705 |
| OBJECT_ID (application parse) | 98067A | 24087A |
| EPOCH (UTC ISO) | 2026-11-08T04:12:35.430Z | 2026-11-07T05:17:58.466Z |
| MEAN_MOTION (rev/day) | 15.49256954 | 2.00561174 |
| ECCENTRICITY | 0.0007219 | 0.0030347 |
| INCLINATION (°) | 51.6320 | 53.1294 |
| RA_OF_ASC_NODE (°) | 307.5621 | 164.6873 |
| ARG_OF_PERICENTER (°) | 1.6306 | 201.1538 |
| MEAN_ANOMALY (°) | 358.4705 | 158.8133 |
| Card altitude formula (km) | 418.9 | 20182.4 |
| Semi-major axis a (km) | 6797.04 | 26560.56 |

### 4.3 Intermediate coordinates and look-angle baseline

Fixed instants, the observer above:

| Satellite | UTC instant | ECI (x,y,z) km | ECF (x,y,z) km | GMST (rad) | Azimuth (°) | Elevation (°) | Slant range (km) |
|---|---|---|---|---|---|---|---|
| ISS | 2026-11-09T11:23:00Z | (5024.1427, -2134.2621, 4035.6750) | (-2527.6140, 4838.2075, 4035.6750) | 3.8292582544 | 163.7360 | 45.4236 | 570.1495 |
| ISS | 2026-11-09T12:00:00Z | (-4220.9077, 5203.2471, -1183.7229) | (-1120.4010, -6605.6448, -1183.7229) | 3.9911432255 | 56.7028 | -67.3222 | 12230.5878 |
| ZHTW | 2026-11-09T12:00:00Z | (24845.0632, 289.9890, -9164.0901) | (-16623.4871, 18466.7521, -9164.0901) | 3.9911432255 | 163.3780 | 14.6746 | 24124.2778 |

> Note: the ISS elevation at 12:00 is negative and the scene `y` is negative; the trajectory should be drawn dashed. ZHTW is a high-orbit satellite (about 20182 km) with a positive elevation.

### 4.4 Scene coordinate baseline (R=20)

| Input | Scene coordinates (x,y,z) | Meaning |
|---|---|---|
| az=0°, el=0° | (0, 0, -20) | Due north, horizon |
| az=90°, el=0° | (20, 0, 0) | Due east, horizon |
| az=180°, el=0° | (0, 0, 20) | Due south, horizon |
| az=270°, el=0° | (-20, 0, 0) | Due west, horizon |
| az=0°, el=90° | (0, 20, 0) | Zenith |
| az=90°, el=45° | (14.142136, 14.142136, 0) | East, 45° up |
| az=90°, el=0°, offset=+10° | (19.696155, 0, -3.472964) | Effective azimuth 80°; verifies the calibration sign |

Conversion of real data:

| Satellite / instant | Azimuth / elevation / slant range | Scene coordinates (x,y,z) |
|---|---|---|
| ZHTW / 2026-11-09T12:00:00Z | 163.3780°, 14.6746°, 24124.2778 km | (5.5345, 5.0666, 18.5391) |
| ISS / 2026-11-09T11:23:00Z | 163.7360°, 45.4236°, 570.1495 km | (3.9313, 14.2463, 13.4754) |
| ISS / 2026-11-09T12:00:00Z | 56.7028°, -67.3222°, 12230.5878 km | (6.4451, -18.4538, -4.2332) |

### 4.5 Device attitude to camera direction baseline

With `q_cam = Euler(beta, alpha, -gamma, 'YXZ') * Rx(-90°) * Rz(-screenOrientation)` and screen orientation 0°:

| alpha | beta | gamma | Camera forward (x,y,z) | Meaning |
|---|---|---|---|---|
| 0° | 90° | 0° | (0, 0, -1) | North |
| 90° | 90° | 0° | (-1, 0, 0) | West |
| 180° | 90° | 0° | (0, 0, 1) | South |
| 270° | 90° | 0° | (1, 0, 0) | East |
| 0° | 0° | 0° | (0, -1, 0) | Straight down (phone flat, screen up) |

Accompanying UI conventions:

- With `alpha=0`, `360-alpha` gives 360.0, not 0.0; acceptance allows 0/360 as equivalent.
- `alpha=90` shows heading 270° (west); `alpha=270` shows 90° (east).
- With `beta=90` the UI pitch should be 0°; with `beta=0` the pitch is -90° (down).

### 4.6 Pass prediction baseline (1 min sampling)

Start instant: `2026-11-09T00:00:00Z`; window 24 h; minimum elevation 0°; observer as above.

**ISS (7 segments)**

| # | Start UTC | End UTC | Maximum elevation (°) | Duration (min) |
|---|---|---|---|---|
| 1 | 09:45 | 09:51 | 3.66 | 6 |
| 2 | 11:19 | 11:29 | 45.42 | 10 |
| 3 | 12:56 | 13:06 | 23.64 | 10 |
| 4 | 14:34 | 14:43 | 11.58 | 9 |
| 5 | 16:12 | 16:21 | 15.39 | 9 |
| 6 | 17:48 | 17:59 | 54.83 | 11 |
| 7 | 19:26 | 19:35 | 14.96 | 9 |

**ZHIHUI TIANWANG-1 01A (1 segment, long high-orbit pass)**

| Start UTC | End UTC | Maximum elevation (°) | Duration (min) |
|---|---|---|---|
| 05:25 | 12:37 | 89.79 | 432 |

### 4.7 Comparison of the 1 min sampling error (ISS segment 2)

| Metric | 1 min algorithm (as in the project) | 1 s reference | Difference |
|---|---|---|---|
| Rise | 11:19:00 | 11:18:05 | +55 s |
| Maximum elevation | 45.4236° @ 11:23:00 | 48.6098° @ 11:23:24 | -3.1862° |
| Azimuth at maximum elevation | 163.7360° | 137.5302° | -26.2058° |
| Slant range at maximum elevation | 570.1495 km | 544.7364 km | +25.4131 km |
| Set | 11:29:00 | 11:28:47 | +13 s |

> This table shows that the pass interface / card results of the project should be accepted at 1 min sampling, and the 1 s reference should not be used to demand a smaller error. To improve the precision, bisection / parabolic interpolation should be done near the pass boundaries and the maximum elevation.

### 4.9 Constants and thresholds acceptance table

| Item | Value | Unit | Location / meaning |
|---|---|---|---|
| Scene radius R | 20 | Scene units | Satellite / trajectory |
| Camera FOV | 75 | ° (vertical) | Canvas |
| HUD distance | 2 | Scene units | In front of the camera |
| Alignment threshold | 8 | ° | Reticle appears |
| Behind criterion | dot < 0 | — | Arrow turns red |
| Calibration step | 5 | ° | Button |
| Trajectory window | -10 to H×60 | min | H=1/12/24 |
| Trajectory step | max(1, floor(H×60/200)) | min | 1/3/7 min for 1/12/24 h |
| Trajectory points | about 71/244/208 | count | 1/12/24 h |
| Future direction sampling | 10 | s | ↑/↓ |
| UI telemetry throttling | 0.2 | s | About 5 Hz |
| Search cache | 5 | min | Server memory |
| Cache cleanup | 60 | min | Timer |
| TLE auto-update | 360 | min | `fetchedAt` age |
| Card freshness | 24 / 72 | h | Yellow / red |
| Pass step | 1 | min | `predictPasses` |
| API default duration | 24 | h | Prediction |
| Geolocation timeout | 20000 | ms | `watchPosition` |
| Geolocation maximum age | 1000 | ms | `maximumAge` |
| Video redraw retries | 0/200/500/1000 | ms | Black-screen fix |
| Opacity | 0–100 | % | Video layer |
| Earth μ | 398600.4418 | km³/s² | Altitude formula |
| Earth equatorial radius | 6378.137 | km | Altitude formula / WGS84 |
| SGP4 Earth radius | 6378.135 | km | Inside satellite.js |
| WGS84 semi-major axis | 6378.137 | km | Observer |
| WGS84 semi-minor axis | 6356.7523142 | km | Observer |

### 4.10 Acceptance suggestions

1. **Unit level**: fix the TLEs of 4.2, the instants of 4.3 and the observer, and assert ECI/ECF, azimuth / elevation / slant range, scene coordinates and altitude. Tolerances as in 4.1.
2. **Pass level**: fix `t0=2026-11-09T00:00:00Z` and assert the number of segments, the start / end and the maximum elevation of 4.6; ±1 min is allowed.
3. **Attitude level**: use the table of 4.5 to drive tests of the mapping from `alpha/beta/gamma` to the camera forward direction; verify the 0/360 equivalence in particular.
4. **Calibration level**: assert that `az=90°, offset=+10°` gives an effective azimuth of 80° and the scene point (19.696155, 0, -3.472964).
5. **Interface level**: the name search is positive; the ID search is currently negative (P10) and turns positive after the fix.
6. **Field level**: the absolute alignment between the camera picture and the satellite marker is affected by the FOV, magnetic north and device differences; verify it by hand with a known landmark or the compass N label, and do not make the absolute angle across devices a hard automated metric.