# Project scope — zombieSatellite

- 本项目内请用中文回复。

- Fixed catalog of 7 zombie satellites. No satellite search feature, no user satellite library, no custom backend API. TLE data comes from CelesTrak directly, client-side.

- docs/reference/TECHNICAL_ROUTE.md: only section 2 (conventions) and section 4 (numeric baselines) are normative. Section 3 items apply only when a spec explicitly names them.

- All times UTC. satellite.js is pinned to 6.0.2.

- The app never claims to receive real RF signals; beacon audio is synthesized from public TLE data.

- Pass lock tolerance is ±10 deg (the reference doc's 8 deg alignment value is from the old project and does not apply anywhere, including C52, C88 and section 2.9.6). C52's criterion angle=acos(f·u) and its behind-camera test f·u<0 still apply; only the constant changes from 8 to 10 deg.
