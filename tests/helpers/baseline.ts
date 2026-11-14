// Baseline_TLE_Snapshots and their expected fields, copied from section 4.2 of
// docs/reference/TECHNICAL_ROUTE.md. Section 4 is normative: copy values from it, never recompute them.
// Later tasks add the Reference_Observer and the section 4.3, 4.6 and 4.7 values to this file.

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
