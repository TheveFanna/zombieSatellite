// Baseline_TLE_Snapshots and their expected fields (section 4.2), the Reference_Observer (section 4.1), the
// section 4.3 instants, the section 4.6 pass tables and the 1 s reference of ISS pass 2 (section 4.7), copied from
// docs/reference/TECHNICAL_ROUTE.md, plus the 1 s peak of ISS pass 6 (Requirement 10, criterion 4), which that
// document does not contain. Section 4 is normative: copy values from it, never recompute them.
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

/**
 * One row of a section 4.6 table ("过境预测基线（1 min 采样）"), as printed. The tables hold the passes of the
 * Reference_Observer with window start 2026-11-09T00:00:00Z, window 24 h and Min_Elevation 0°. The start and the end
 * are 1-minute samples of 2026-11-09 UTC on a grid aligned with 00:00:00Z: the start is the first sample above 0° and
 * the end is the first later sample at or below 0°, so each true crossing lies at most 60 s before the listed time
 * (Requirement 13, criterion 2). The "#" column of the ISS table is the position in `ISS_PASS_TABLE` plus 1.
 */
export interface BaselinePassRow {
  /** "开始 UTC": HH:MM on 2026-11-09. */
  readonly startIso: string;
  /** The same instant in ms since 1970-01-01T00:00:00Z: `Date.parse(startIso)`. */
  readonly startMs: number;
  /** "结束 UTC": HH:MM on 2026-11-09. */
  readonly endIso: string;
  /** The same instant in ms since 1970-01-01T00:00:00Z: `Date.parse(endIso)`. */
  readonly endMs: number;
  /** "最大仰角 (°)". */
  readonly maxElevationDeg: number;
  /** "持续 (min)". */
  readonly durationMin: number;
}

/** A section 4.6 row from its printed columns; `start` and `end` are the printed "HH:MM" of 2026-11-09 UTC. */
function passRow(start: string, end: string, maxElevationDeg: number, durationMin: number): BaselinePassRow {
  const startIso = `2026-11-09T${start}:00Z`;
  const endIso = `2026-11-09T${end}:00Z`;
  return { startIso, startMs: Date.parse(startIso), endIso, endMs: Date.parse(endIso), maxElevationDeg, durationMin };
}

/** Section 4.6, "ISS（7 段）": rows 1 to 7 in table order (Requirement 13, criteria 1 to 3). */
export const ISS_PASS_TABLE: readonly BaselinePassRow[] = [
  passRow('09:45', '09:51', 3.66, 6),
  passRow('11:19', '11:29', 45.42, 10),
  passRow('12:56', '13:06', 23.64, 10),
  passRow('14:34', '14:43', 11.58, 9),
  passRow('16:12', '16:21', 15.39, 9),
  passRow('17:48', '17:59', 54.83, 11),
  passRow('19:26', '19:35', 14.96, 9),
];

/** Section 4.6, "ZHIHUI TIANWANG-1 01A（1 段，高轨长过境）": its single row (Requirement 13, criteria 5 and 9). */
export const ZHTW_PASS_TABLE: readonly BaselinePassRow[] = [passRow('05:25', '12:37', 89.79, 432)];

/**
 * The column "1 s 参考" of the section 4.7 table ("1 min 采样误差对照（ISS 第 2 段）"): rise, peak and set of ISS pass 2
 * for the Reference_Observer, found with 1 s sampling (window start 2026-11-09T00:00:00Z, window 24 h, Min_Elevation
 * 0°). Every instant is on 2026-11-09 UTC.
 */
export interface IssPass2Reference {
  /** "升起": 11:18:05 UTC. */
  readonly riseIso: string;
  /** The same instant in ms since 1970-01-01T00:00:00Z: `Date.parse(riseIso)`. */
  readonly riseMs: number;
  /** "最大仰角 … @ 11:23:24": 11:23:24 UTC. */
  readonly peakIso: string;
  readonly peakMs: number;
  /** "最大仰角": 48.6098°. */
  readonly maxElevationDeg: number;
  /** "落下": 11:28:47 UTC. */
  readonly setIso: string;
  readonly setMs: number;
}

const ISS_PASS_2_RISE_ISO = '2026-11-09T11:18:05Z';
const ISS_PASS_2_PEAK_ISO = '2026-11-09T11:23:24Z';
const ISS_PASS_2_SET_ISO = '2026-11-09T11:28:47Z';

/** Section 4.7, column "1 s 参考": ISS pass 2 (Requirement 10, criterion 4; Requirement 11, criteria 7 and 8). */
export const ISS_PASS_2_1S_REFERENCE: IssPass2Reference = {
  riseIso: ISS_PASS_2_RISE_ISO,
  riseMs: Date.parse(ISS_PASS_2_RISE_ISO),
  peakIso: ISS_PASS_2_PEAK_ISO,
  peakMs: Date.parse(ISS_PASS_2_PEAK_ISO),
  maxElevationDeg: 48.6098,
  setIso: ISS_PASS_2_SET_ISO,
  setMs: Date.parse(ISS_PASS_2_SET_ISO),
};

/**
 * The 1 s peak of ISS pass 6 for the Reference_Observer: the peak of the Brute_Force_Pass of that pass, with the inputs
 * of Requirement 13, criterion 1 (window start 2026-11-09T00:00:00Z, window 24 h, Min_Elevation 0°). Requirement 10,
 * criterion 4 states the value, computed on 2026-11-14; it is not in the Reference_Document.
 */
export interface IssPass6Reference {
  /** 17:53:20 UTC on 2026-11-09. */
  readonly peakIso: string;
  /** The same instant in ms since 1970-01-01T00:00:00Z: `Date.parse(peakIso)`. */
  readonly peakMs: number;
  /** The peak elevation: 58.5919°. */
  readonly maxElevationDeg: number;
}

const ISS_PASS_6_PEAK_ISO = '2026-11-09T17:53:20Z';

/** Requirement 10, criterion 4: the 1 s peak of ISS pass 6 (the Pass_Predictor is within ±0.5° of 58.5919°). */
export const ISS_PASS_6_1S_REFERENCE: IssPass6Reference = {
  peakIso: ISS_PASS_6_PEAK_ISO,
  peakMs: Date.parse(ISS_PASS_6_PEAK_ISO),
  maxElevationDeg: 58.5919,
};
