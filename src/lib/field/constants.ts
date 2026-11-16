// Shared constants of the Field_Core (design "Data Models").
export const ILLUMINATION_STEP_MS = 10_000;
export const MAX_ILLUMINATION_SAMPLES = 600;
export const ILLUMINATION_REFINE_MS = 1000;
export const SKY_STEP_MS = 10_000;
export const SKY_MAX_STEPS = 180;
/** AR Track_Arc extends this far before AOS and after LOS, sampled every SKY_PAD_STEP_MS. */
export const SKY_PAD_MS = 600_000;
export const SKY_PAD_STEP_MS = 30_000;
export const MAX_TICKS = 12;
/** AR tab (S9): Orbit_Ring steps per revolution, Ring_Refresh and Ring_Morph durations, star count. */
export const RING_STEPS = 180;
export const RING_REFRESH_MS = 5000;
export const RING_MORPH_MS = 600;
export const STAR_COUNT = 300;
export const STAR_SEED = 20_260_101;
export const GROUND_TRACK_STEPS = 180;
export const TERMINATOR_STEP_DEG = 2;
export const FOOTPRINT_EARTH_RADIUS_KM = 6371.0088;
export const SHADOW_EARTH_RADIUS_KM = 6378.137;
export const AR_NDC_LIMIT = 6;
export const AR_MAX_FPS = 30;
export const CALENDAR_ALARM_MIN = 10;
export const MODEL_SPIN_DEG_PER_S = 18;
