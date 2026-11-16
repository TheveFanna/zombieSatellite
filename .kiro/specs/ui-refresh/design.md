# Design: UI refresh and page responsibilities (S10)

## Visual tokens

Keep the night palette of `globals.css`. Replace the 2px square radii with 8px (controls, inputs) and 12px (panels, sheets, cards). Panels use `background: rgba(17, 26, 46, 0.55)` with `backdrop-filter: blur(20px) saturate(160%)` and `border: 1px solid rgba(233, 228, 216, 0.12)`. Touch targets are at least 44px high.

## Visibility_Bar (Requirement 3)

The bar origin is the instant of the last computation (every 60 s). Positions are fractions of the 24 h span from that origin.

- `hourTicks(origin)` returns one tick per whole UTC hour in `(origin, origin + 24 h]`, labelled `HH`.
- NOW_Marker at `(Date.now() − origin) / 24 h`, clamped to [0, 1]. It is recomputed on every render, so it moves.
- SAT_Marker: when the live elevation is at or above 0°, at the NOW_Marker, state "In view · LOS HH:MMZ" (LOS of the window that contains now). Otherwise at the first window whose `riseMs` is after now, state "AOS HH:MMZ · max N°". With no window, no marker and "No pass in 24 h".
- Layout: a head row (NOW text left, SAT state right), the track, and an hour row below the track. Each hour label is centred on its tick. No label shares a row with another text.

## Satellite_Wheel (Requirement 2)

Card `i` has offset `d = i − selectedIndex`, angle `θ = d × 22°`. The card is placed at `x = R sin θ`, `y = R (1 − cos θ)` with `R = 340 px`, centred horizontally and rotated by `θ`. Cards with `|θ| > 60°` are hidden. Pointer drags accumulate horizontal distance and on release step by `round(−dx / 70)`. A tap selects. Transitions use `transform 480ms cubic-bezier(.2,.8,.2,1)`; reduced motion removes the transition.

## FOV slider (Requirement 4)

`<input type="range">` from `FOV_MIN_DEG` to `FOV_MAX_DEG` with `FOV_STEP_DEG`. `onChange` sets state and calls `writeFov`.

## Page responsibilities (Requirement 5)

| Page | Job | Content |
|---|---|---|
| `/` | Introduction and routing | hero, four entry links, first-run guide, honesty footer |
| `/ar` | Live view | camera, wheel, live target, orbit ring, visibility bar |
| `/session` | Passes | observer, one compact row per satellite, open session and plan |
| `/catalog` | Archive | stories, lifelines, models, guide links |
| `/cards`, `/log` | Unchanged | |

`LandedHome` in `console-preview.tsx` loses the catalog list. The catalog list moves unchanged into `src/components/catalog/catalog-list.tsx` and is served by the new `src/app/catalog/page.tsx`. The service worker lists `/catalog` as a shell document and bumps its cache name.
