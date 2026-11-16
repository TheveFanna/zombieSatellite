// Field_Core barrel: the only entry file of src/lib/field.
export {
  AR_MAX_FPS,
  AR_NDC_LIMIT,
  CALENDAR_ALARM_MIN,
  FOOTPRINT_EARTH_RADIUS_KM,
  GROUND_TRACK_STEPS,
  ILLUMINATION_REFINE_MS,
  ILLUMINATION_STEP_MS,
  MAX_ILLUMINATION_SAMPLES,
  MAX_TICKS,
  MODEL_SPIN_DEG_PER_S,
  SHADOW_EARTH_RADIUS_KM,
  SKY_MAX_STEPS,
  SKY_STEP_MS,
  TERMINATOR_STEP_DEG,
} from './constants';
export { gmstRad, julianDate } from './time';
export { subsolarPoint, sunDirection } from './sun';
export { illuminationState, isInShadow } from './shadow';
export type { IlluminationState } from './shadow';
export { illuminationProfile, shadowIntervals, shadowedAt } from './illumination';
export type { IlluminationProfile, ShadowTransition } from './illumination';
export { minuteTable, roundMhz, tuningCsv, tuningFileName, tuningTable } from './tuning';
export type { MinuteTableResult, TuningPoint, TuningResult } from './tuning';
export { buildSkyTrack, tickLabel, trackSegments } from './sky-track';
export type { SkySample, SkySampleOk, SkyTrack } from './sky-track';
export { FIELD_COPY } from './copy';
