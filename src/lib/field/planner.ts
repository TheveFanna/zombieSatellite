// Pass planner core (design.md, "Pass planner core"). Pure.
import type { Pass } from '../orbit/index';

export const PLANNER_WINDOW_HOURS = 168;
export const PLANNER_SEARCH_MIN_ELEVATION_DEG = 0;
export const PLANNER_MIN_ELEVATIONS: readonly number[] = [0, 10, 20, 30];
export const DEFAULT_PLANNER_MIN_ELEVATION_DEG = 10;

/** Keeps the passes whose maximum elevation reaches the threshold; order preserved. */
export function filterPassesByElevation(passes: readonly Pass[], minElevationDeg: number): Pass[] {
  return passes.filter((pass) => pass.maxElevationDeg >= minElevationDeg);
}
