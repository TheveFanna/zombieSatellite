// Baseline_TLE_Snapshots and their expected fields (section 4.2), the Reference_Observer (section 4.1) and the
// section 4.3 instants, copied from docs/reference/TECHNICAL_ROUTE.md. Section 4 is normative: copy values from
// it, never recompute them. Later tasks add the section 4.6 and 4.7 values to this file.
import type { Observer, Vec3 } from './oracles';

/** The section 4.2 table of one Baseline_TLE_Snapshot, with the names of the TleRecord fields (D6). */
export interface BaselineFields {
  readonly NORAD_CAT_ID: number;
  readonly OBJECT_ID: string;
  /** "EPOCH（UTC ISO）"; compared at millisecond precision (Requirement 4, criterion 25). */
  readonly EPOCH_ISO: string;
  readonly MEAN_MOTION: number;
  readonly ECCENTRICITY: number;
  readonly INCLINATION: number;
  readonly RA_OF_ASC_NODE: number;
  readonly ARG_OF_PERICENTER: number;
  readonly MEAN_ANOMALY: number;
  /** "半长轴 a（km）". */
  readonly SEMIMAJOR_AXIS_KM: number;
  /** "卡片高度公式（km）". */
  readonly ALTITUDE_KM: number;
}

export interface BaselineTle {
  /** The object name line. */
  readonly name: string;
  /** TLE line 1, 69 characters. */
  readonly line1: string;
  /** TLE line 2, 69 characters. */
  readonly line2: string;
  /** Name line, line 1 and line 2 joined with LF, without a final terminator. */
  readonly text: string;
  readonly expected: BaselineFields;
}

function snapshot(name: string, line1: string, line2: string, expected: BaselineFields): BaselineTle {
  return { name, line1, line2, text: [name, line1, line2].join('\n'), expected };
}

export const ISS_BASELINE: BaselineTle = snapshot(
  'ISS (ZARYA)',
  '1 25544U 98067A   26312.17541007  .00012511  00000+0  23266-3 0  9990',
  '2 25544  51.6320 307.5621 0007219   1.6306 358.4705 15.49256954594075',
  {
    NORAD_CAT_ID: 25544,
    OBJECT_ID: '98067A',
    EPOCH_ISO: '2026-11-08T04:12:35.430Z',
    MEAN_MOTION: 15.49256954,
    ECCENTRICITY: 0.0007219,
    INCLINATION: 51.632,
    RA_OF_ASC_NODE: 307.5621,
    ARG_OF_PERICENTER: 1.6306,
    MEAN_ANOMALY: 358.4705,
    SEMIMAJOR_AXIS_KM: 6797.04,
    ALTITUDE_KM: 418.9,
  },
);

export const ZHTW_BASELINE: BaselineTle = snapshot(
  'ZHIHUI TIANWANG-1 01A',
  '1 59705U 24087A   26311.22081558  .00000078  00000+0  00000+0 0  9994',
  '2 59705  53.1294 164.6873 0030347 201.1538 158.8133  2.00561174 18176',
  {
    NORAD_CAT_ID: 59705,
    OBJECT_ID: '24087A',
    EPOCH_ISO: '2026-11-07T05:17:58.466Z',
    MEAN_MOTION: 2.00561174,
    ECCENTRICITY: 0.0030347,
    INCLINATION: 53.1294,
    RA_OF_ASC_NODE: 164.6873,
    ARG_OF_PERICENTER: 201.1538,
    MEAN_ANOMALY: 158.8133,
    SEMIMAJOR_AXIS_KM: 26560.56,
    ALTITUDE_KM: 20182.4,
  },
);

/** The Reference_Observer of section 4.1: latitude 39.9042° N, longitude 116.4074° E, altitude 0 km. */
export const REFERENCE_OBSERVER: Observer = {
  latitudeDeg: 39.9042,
  longitudeDeg: 116.4074,
  altitudeKm: 0,
};

/**
 * One row of the section 4.3 table ("中间坐标与视线角基线") for the Reference_Observer, with the Range_Rate of the
 * same satellite and instant from requirements.md (Requirement 8, criteria 5 to 7). The field names are those of the
 * Propagator results (D6).
 */
export interface BaselineInstant {
  /** The Baseline_TLE_Snapshot of the row. */
  readonly tle: BaselineTle;
  /** "UTC 时刻" as printed in the table. */
  readonly iso: string;
  /** The same instant in ms since 1970-01-01T00:00:00Z: `Date.parse(iso)`. */
  readonly timeMs: number;
  /** "ECI (x,y,z) km": the TEME position. */
  readonly eciPositionKm: Vec3;
  /** "ECF (x,y,z) km". */
  readonly ecfPositionKm: Vec3;
  /** "GMST (rad)". */
  readonly gmstRad: number;
  /** "方位角 (°)". */
  readonly azimuthDeg: number;
  /** "仰角 (°)". */
  readonly elevationDeg: number;
  /** "斜距 (km)". */
  readonly slantRangeKm: number;
  /** Range_Rate in km/s, negative while the satellite approaches. */
  readonly rangeRateKmPerS: number;
}

function instant(
  tle: BaselineTle,
  iso: string,
  values: Omit<BaselineInstant, 'tle' | 'iso' | 'timeMs'>,
): BaselineInstant {
  return { tle, iso, timeMs: Date.parse(iso), ...values };
}

/** Section 4.3, row 1 (Requirement 6, criterion 7; Requirement 7, criterion 5; Requirement 8, criterion 5). */
export const ISS_AT_1123Z: BaselineInstant = instant(ISS_BASELINE, '2026-11-09T11:23:00Z', {
  eciPositionKm: { x: 5024.1427, y: -2134.2621, z: 4035.675 },
  ecfPositionKm: { x: -2527.614, y: 4838.2075, z: 4035.675 },
  gmstRad: 3.8292582544,
  azimuthDeg: 163.736,
  elevationDeg: 45.4236,
  slantRangeKm: 570.1495,
  rangeRateKmPerS: -2.1094,
});

/** Section 4.3, row 2 (Requirement 6, criterion 8; Requirement 7, criterion 6; Requirement 8, criterion 6). */
export const ISS_AT_1200Z: BaselineInstant = instant(ISS_BASELINE, '2026-11-09T12:00:00Z', {
  eciPositionKm: { x: -4220.9077, y: 5203.2471, z: -1183.7229 },
  ecfPositionKm: { x: -1120.401, y: -6605.6448, z: -1183.7229 },
  gmstRad: 3.9911432255,
  azimuthDeg: 56.7028,
  elevationDeg: -67.3222,
  slantRangeKm: 12230.5878,
  rangeRateKmPerS: 2.6384,
});

/** Section 4.3, row 3 (Requirement 6, criterion 9; Requirement 7, criterion 7; Requirement 8, criterion 7). */
export const ZHTW_AT_1200Z: BaselineInstant = instant(ZHTW_BASELINE, '2026-11-09T12:00:00Z', {
  eciPositionKm: { x: 24845.0632, y: 289.989, z: -9164.0901 },
  ecfPositionKm: { x: -16623.4871, y: 18466.7521, z: -9164.0901 },
  gmstRad: 3.9911432255,
  azimuthDeg: 163.378,
  elevationDeg: 14.6746,
  slantRangeKm: 24124.2778,
  rangeRateKmPerS: 0.7132,
});

/** The three section 4.3 rows in table order. */
export const BASELINE_INSTANTS: readonly BaselineInstant[] = [ISS_AT_1123Z, ISS_AT_1200Z, ZHTW_AT_1200Z];
