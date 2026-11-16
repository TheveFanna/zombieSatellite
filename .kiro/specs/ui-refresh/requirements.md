# Requirements: UI refresh and page responsibilities (S10)

## Introduction

The AR tab (S9) works, but its controls are plain and crowded, and the Passes page stacks its content. The Passes page and the home page both list every satellite with action links, so they overlap. S10 refines the AR tab, gives the app a softer visual language, and gives each page one job. The fixed catalog, UTC, satellite.js 6.0.2 and the honesty rules of the earlier specs keep applying.

## Glossary

- **Satellite_Wheel**: the row of satellite cards on the top of the AR tab, arranged on a half-wheel arc.
- **Visibility_Bar**: the 24-hour bar at the bottom of the AR tab (S9 Requirement 7).
- **NOW_Marker**: the marker on the Visibility_Bar at the current UTC time.
- **SAT_Marker**: the marker on the Visibility_Bar at the satellite's current state: the NOW_Marker while it is in view, otherwise its next AOS.
- **Archive**: the satellite archive page `/catalog`, with each satellite's story, lifeline, model and guide link.
- **Passes page**: the page `/session`.

## Requirements

### Requirement 1: Visual language

1. THE app SHALL give panels, cards, buttons and sheets a corner radius of at most 12px.
2. THE app SHALL draw the panels of the AR tab and the Passes page as translucent surfaces with a backdrop blur and a hairline border, in the style of iOS sheets.
3. THE app SHALL keep every control at least 44px high.

### Requirement 2: Satellite_Wheel

1. THE Satellite_Wheel SHALL place the satellite cards on an arc at the top of the AR tab: the selected card at the apex, and the other cards descending and tilting outward toward each side.
2. WHEN the user taps a card or swipes horizontally on the Satellite_Wheel, THE AR tab SHALL select that satellite and SHALL rotate the arc with a transition.
3. THE Satellite_Wheel SHALL NOT overlap the readouts, the Visibility_Bar or the controls.

### Requirement 3: Visibility_Bar

1. THE Visibility_Bar SHALL label every whole UTC hour from the start of the bar to 24 hours later, each label showing the hour only.
2. THE Visibility_Bar SHALL draw the NOW_Marker at the current UTC time and SHALL move it as time passes.
3. THE Visibility_Bar SHALL draw the SAT_Marker at the NOW_Marker while the satellite is in view, and otherwise at its next AOS.
4. THE Visibility_Bar SHALL write its state text (the current time, and the LOS or the next AOS with the maximum elevation) above the track, and SHALL write the hour labels below the track, so that no text overlaps another.

### Requirement 4: Field of view slider

1. THE AR tab SHALL set the vertical field of view with a horizontal slider from the minimum to the maximum of S7 in steps of one degree, and SHALL show the value.
2. THE AR tab SHALL persist the field of view through the existing store.
3. THE calibration buttons SHALL stay on the AR tab.

### Requirement 5: Page responsibilities

1. THE home page SHALL show the introduction, the entry points to the AR tab, the Passes page, the Archive, the QSL cards and the log, and the first-run guide. THE home page SHALL NOT list satellites with action buttons.
2. THE Archive SHALL show, for each playable and story-only satellite, its story, its lifeline, its model and its guide link.
3. THE Passes page SHALL show the observer and, for each satellite, one compact row with the next pass time, its maximum elevation and its duration, and two actions: open the session and plan the passes.
4. THE Passes page SHALL NOT show stories, models or pass profile drawings.
5. THE AR tab SHALL show only the live view.
6. THE tab bar SHALL keep the same four entries.
