# Requirements: small-phone layout, AR permissions and story (S11)

## Introduction

On a small phone the AR tab's layout breaks and the Passes and Planner pages stack too much. The AR tab must show the camera picture (it currently shows only the star field), ask for the camera and motion permissions directly, and offer a satellite story. Dashed lines from the global `dl`, `dt`, `dd` and `label` styles must go. The fixed catalog, UTC, satellite.js 6.0.2 and the honesty rules keep applying.

## Glossary

- **Permission_Gate**: the one card on the AR tab that asks for the motion sensors when the browser requires a tap.
- **Ruler**: a vertical scale with tick marks and a white bar that marks the current value.
- **Settings_Sheet**: the sheet opened by the gear button on the AR tab.
- **Story_Card**: the small card that tells a satellite's story.
- **Pass_List**: the compact list of passes on the Planner page.

## Requirements

### Requirement 1: Small-phone layout

1. THE AR tab SHALL keep a fixed header, a fixed satellite wheel, a fixed bottom panel and a camera area between them, so that no element moves into another on a phone 360px wide.
2. THE AR tab SHALL show the readouts (azimuth, elevation, range, range rate) as one row inside the bottom panel, not over the picture.
3. THE Planner page SHALL show its passes as one list of compact rows; the details of one pass SHALL open in a sheet.
4. THE Passes page SHALL keep one compact row per satellite and SHALL show its facts in an aligned grid.

### Requirement 2: Permissions

1. WHEN the AR tab opens, THE AR tab SHALL start the camera without any extra button.
2. WHILE the browser requires a user gesture for the motion sensors, THE AR tab SHALL show one Permission_Gate with one button that requests both the camera and the motion sensors.
3. THE AR tab SHALL NOT show a separate "enable motion sensors" button.
4. IF the motion sensors are denied, THEN THE AR tab SHALL show the Permission_Gate again with a retry button.

### Requirement 3: Camera picture and panorama

1. THE camera `<video>` SHALL always be in the layout and SHALL start playing when a stream arrives.
2. WHILE the camera is on, THE AR tab SHALL show the camera picture under the overlay.
3. WHILE no orientation is available, THE AR tab SHALL still draw the horizon and the cardinal marks, labelled as not oriented.

### Requirement 4: Rulers

1. THE field of view SHALL be set on a vertical Ruler on the left side.
2. THE camera-to-night-sky blend SHALL be set on a vertical Ruler on the right side.
3. Each Ruler SHALL draw vertical tick marks and a white bar at the current value, and SHALL respond to drag and to the arrow keys.

### Requirement 5: Satellite wheel

1. THE satellite cards SHALL be tall and narrow, with the selected card in the centre, slightly larger, and the others stacked behind it.
2. WHEN the selection changes, THE outgoing card SHALL rise upward and fade out, and THE incoming card SHALL come down from above.
3. THE cards SHALL look like printed certificates: an inset frame and a decorative pattern, not dashed outlines.

### Requirement 6: Settings

1. THE AR tab SHALL show a gear button at the top right that opens the Settings_Sheet.
2. THE Settings_Sheet SHALL hold the calibration buttons (rotate counter-clockwise and clockwise by one step) with a short explanation of their use, and the sensor status.

### Requirement 7: Story

1. WHEN the user taps the satellite in the sky or the selected card, THE AR tab SHALL open a Story_Card with the satellite's name, its hook and its story.
2. THE Story_Card SHALL have a close control, and THE Passes page and the Archive SHALL link to the story of each satellite.
