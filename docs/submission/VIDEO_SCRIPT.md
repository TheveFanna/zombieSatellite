# zombieSatellite: video script

## Judge editions with privacy, music and TTS timing (2026-11-17)

Use `docs/video/zombieSatellite_Judges_landscape_EN.mp4` (1920 x 1080) or `docs/video/zombieSatellite_Judges_portrait_EN.mp4` (1080 x 1920). Both use the same 173-second English explanation and are under three minutes. The portrait edition has its own layout; it is not a crop of the landscape video.

The observer-location segment uses two explicitly redacted still frames from the recording. Both latitude and longitude are covered with opaque masks before compositing; the original scrolling location footage is excluded. The previous 111-second export is superseded and is not the privacy-safe delivery.

`judges_music.wav` is a newly synthesized instrumental ambient score, generated locally by `render_judges.py`, with no sampled music or third-party recording. It is normalized to -30 LUFS to leave room for future narration. Source recording audio is lowered by 12 dB. No TTS voice has been added.

TTS handoff: `judges_tts_script.txt` contains the spoken English copy; `judges_tts_timing.csv` contains each sentence's exact start, end, word count and slot length. `judges.en.srt` matches the same timeline. Slots are calculated at approximately 130 words per minute plus at least one second of pause, rounded up to half a second. These are timing estimates, not durations measured from a generated voice. Generate each sentence independently and place it at the CSV start time; measure the actual voice before final mixing. Use the standalone music stem when replacing the soundtrack to avoid doubling the music.

Rebuild both editions with `python docs/video/render_judges.py` (FFmpeg, Pillow and NumPy). The original recording remains unchanged. The script and captions are versioned; generated media remains local.

## Edited recording (2026-11-17)

The delivered cut is `docs/video/zombieSatellite_Kiroween_EN.mp4`: approximately 111 seconds, 1920 x 1080, 30 fps, H.264/AAC. It uses the supplied `docs/ScreenRecording.mp4`, with English explanatory panels and burned-in English captions. Original recording audio is retained; no voice-over or music was added. The source remains untouched.

Editable captions: `docs/video/zombieSatellite.en.srt` and `.ass`. The exact source selections and copy are in `docs/video/timeline.json`; regenerate with `python docs/video/render.py` (FFmpeg and Pillow required). Generated media and intermediate renders are local deliverables, excluded from Git.

The edit shows the recorded phone UI, archive, AR and sky views, pass selection, a 60x demo, Doppler readout, results and QSL cards. It ends with repository-backed Kiro specs/steering information and the app URL. It does not depict unrecorded tuning tables, ground maps or a shadow transition. Demo and simulated reception labels are explicit.

Official requirements checked on 2026-11-17: [rules](https://kiroween.devpost.com/rules), [submission requirements and judging criteria](https://kiroween.devpost.com/). The video should be under three minutes and show the intended device in use, and must be public on YouTube. The submission also needs a public licensed GitHub repository containing `.kiro`, a working app link, a functionality description and a Kiro usage write-up. Deadline: 2026-12-05 06:00 China Standard Time (2026-12-04 14:00 PST). This local export has not been uploaded or submitted.

## Original recording plan

A shot list for a video of at most 3 minutes (180 s). English only: narration, on-screen text and captions. The owner records and uploads the video; this file is the script.

Arc: the story hook (LES-1, heard again in 2012), a real pass on the ground-track map, the tuning table, the AR view with the track arc over the real sky, the beacon sound and the Doppler readout, shadow silence, the QSL card, and the demo mode as the closing beat.

Red lines for every shot: say that the beacon sound is simulated, never present the app as hearing a real satellite, and attribute every historical reception to the named person. The app is a finding, pointing and Doppler aid, not a generic satellite tracker.

| Shot | Picture | Narration points | Duration (s) |
|---|---|---|---|
| 1. Story hook | Night sky, slow push-in. On-screen text: "LES-1, 1965". Then a waveform that brightens and fades about every four seconds, with the caption "Phil Williams, G3YPQ, December 2012". | A satellite launched in 1965 went silent in 1967. In December 2012 a radio amateur in Cornwall, Phil Williams, heard it again at about 237 MHz, and amateurs in Brazil and Germany confirmed it. It tumbles once every four seconds, so its signal fades in and out. | 20 |
| 2. The catalog | Screen recording of the home page on a phone: hero, the "Find a pass" button, scrolling the seven catalog cards, opening one "Documented history" row. | zombieSatellite is a finding, pointing and Doppler aid for amateur radio and satellite hobbyists, around seven zombie satellites. Each card is documented history with its sources. Five are playable; two are story-only. | 10 |
| 3. A real pass and the ground map | The picker with pass rows in UTC and the local start time under them. Then the Ground_Track_Map: the coastline, the satellite's track over the Earth, the day and night terminator, and the observer's pin. | The app predicts the next pass over your position from public TLE data. All times are UTC, with the local start time next to it. The map shows where the satellite is over the Earth now, and where it has been and will go. It is real orbital data and real geometry. | 20 |
| 4. Tuning table | The Tuning_Table for one pass: three rows (AOS, TCA, LOS) with the receive frequency in MHz and the Doppler shift in kHz. Then open the "Instrument detail" to show the minute-by-minute table below it. | For a satellite with a documented downlink, the app gives a tuning table with three rows: the receive frequency to set on your own receiver at the start, the closest approach and the end of the pass. The instrument detail adds a table for every minute of the pass. | 15 |
| 5. AR view | Outdoors, dusk or night. The phone raised to the real sky. The AR_View: the camera picture with the Track_Arc drawn across it, the marker moving along the arc, the azimuth, elevation and pointing error readouts, and the lock turning green. | Raise the phone. The camera shows the real sky, and the app draws the satellite's path over it as an arc, with a marker for where the satellite is now. Follow the marker until the lock turns green, within ten degrees. If you have a radio, this is the direction to point your antenna. | 35 |
| 6. Beacon and Doppler | Close on the phone: the Doppler readout in kHz changing through the pass. Audio: the simulated tone gliding down as the readout crosses zero. On-screen caption: "Simulated beacon. Real Doppler figure." | The tone is simulated: the browser synthesizes it from public orbital data. The pitch glides on an artistic curve, and the kHz figure is the real Doppler shift. The app has no radio hardware and does not pick anything up. | 25 |
| 7. Shadow silence | A satellite whose model says it is in the Earth's shadow: the badge reads "Silent in Earth's shadow", the simulated beacon falls silent, and the note reads "The satellite is in Earth's shadow, so the simulated beacon is silent." Then the satellite returns to sunlight and the tone resumes. | Some of these satellites are documented as transmitting only in sunlight. The app models when the satellite is in sunlight from the sun's position and the orbit, and the simulated beacon goes silent in shadow. It is a model from public data, not a measurement. | 15 |
| 8. The QSL card | Pass ends. The result screen, then "View your QSL cards", then a card in the collection; open it large and save it as PNG. Show the line that says the card confirms a simulated session. | When the pass ends, the app issues a QSL card in the amateur tradition: satellite, UTC times, maximum elevation, frequency. The card says plainly that it confirms a simulated session. | 15 |
| 9. Demo mode, closing | Start a session in demo mode: the 60× clock running, auto-point on, the marker locking, the card appearing minutes later. Final frame: the logo with the text "zombieSatellite: Resurrection" and the address https://zombie-satellite.vercel.app/. | No radio and no antenna? Every session has a 60× demo mode that plays the next real pass in a few minutes. Practise the whole loop on a satellite from the 1960s, then try the real pass. The orbit is real. The beacon sound is simulated. | 20 |
| Total | | | 175 |
## Recording notes

- Film shots 5 and 6 during one real pass. Pick a pass with a maximum elevation of at least 30° from the picker before the day, and check the weather.
- If no real pass can be filmed, show the demo mode in shots 5 and 6 instead, and say in the narration that this is the demo mode. Do not present demo footage as a real pass.
- Record the audio of shot 6 from the phone, so the tone is the one the app plays.
- Keep the camera backdrop on in shot 5 only if the camera permission was granted; otherwise film the phone from outside and keep the sky view.
- Margin: the shots add up to 175 s, which leaves 5 s under the limit of 180 s.
