import { WMM2025_COF } from './wmm2025-cof';

const N_MAX = 12;
const A_KM = 6378.137;
const E2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);
const A_REF_KM = 6371.2;
const RAD = Math.PI / 180;

/** Coefficient rows [n][m] = [g, h, gDot, hDot], parsed once at load. */
const COEF: number[][][] = (() => {
  const t: number[][][] = Array.from({ length: N_MAX + 1 }, () => []);
  let rows = 0;
  for (const line of WMM2025_COF.split(/\r?\n/).slice(1)) {
    if (line.startsWith('9')) break; // terminator line "9999..."; data rows start with spaces
    const s = line.trim();
    if (s === '') continue;
    const f = s.split(/\s+/).map(Number);
    const [n, m] = f;
    if (f.length !== 6 || f.some((v) => !Number.isFinite(v)) || !(n >= 1 && n <= N_MAX) || m !== t[n].length) {
      throw new Error(`WMM2025 coefficient row invalid: ${s}`);
    }
    t[n].push(f.slice(2));
    rows++;
  }
  if (rows !== 90 || t.slice(1).some((r, i) => r.length !== i + 2)) {
    throw new Error(`WMM2025 coefficient table must have 90 rows, got ${rows}`);
  }
  return t;
})();

function decimalYear(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  const y0 = Date.UTC(y, 0, 1);
  const dy = y + (ms - y0) / (Date.UTC(y + 1, 0, 1) - y0);
  return Math.min(Math.max(dy, 2025), 2030);
}

/** Magnetic declination in degrees (east positive), WMM2025, altitude 0 km. */
export function declinationDeg(latitudeDeg: number, longitudeDeg: number, time: Date | number): number {
  const ms = typeof time === 'number' ? time : time.getTime();
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) throw new RangeError('latitude must be finite and in [-90, 90]');
  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) throw new RangeError('longitude must be finite and in [-180, 180]');
  if (!Number.isFinite(ms)) throw new RangeError('time must be finite');
  const dt = decimalYear(ms) - 2025;

  // Geodetic to geocentric at height 0.
  const phi = latitudeDeg * RAD;
  const lam = longitudeDeg * RAD;
  const rc = A_KM / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
  const p = rc * Math.cos(phi);
  const z = rc * (1 - E2) * Math.sin(phi);
  const r = Math.hypot(p, z);
  const phiG = Math.asin(z / r);
  const s = Math.sin(phiG);
  const c = Math.cos(phiG);

  // Schmidt semi-normalized P(n,m)(sin phiG) and dP/dphiG.
  const P: number[][] = [[1]];
  const dP: number[][] = [[0]];
  for (let n = 1; n <= N_MAX; n++) {
    P.push([]);
    dP.push([]);
    for (let m = 0; m <= n; m++) {
      if (m === n) {
        const k = n === 1 ? 1 : Math.sqrt((2 * n - 1) / (2 * n));
        P[n][m] = k * c * P[n - 1][m - 1];
        dP[n][m] = k * (c * dP[n - 1][m - 1] - s * P[n - 1][m - 1]);
      } else {
        const q = Math.sqrt(n * n - m * m);
        const k2 = n - 1 > m ? Math.sqrt((n - 1) * (n - 1) - m * m) : 0;
        const p2 = k2 ? P[n - 2][m] : 0;
        const d2 = k2 ? dP[n - 2][m] : 0;
        P[n][m] = ((2 * n - 1) * s * P[n - 1][m] - k2 * p2) / q;
        dP[n][m] = ((2 * n - 1) * (c * P[n - 1][m] + s * dP[n - 1][m]) - k2 * d2) / q;
      }
    }
  }

  // Field in the geocentric frame (north, east, down), nT.
  let xg = 0;
  let yg = 0;
  let zg = 0;
  for (let n = 1; n <= N_MAX; n++) {
    const ar = (A_REF_KM / r) ** (n + 2);
    for (let m = 0; m <= n; m++) {
      const [g0, h0, gd, hd] = COEF[n][m];
      const g = g0 + dt * gd;
      const h = h0 + dt * hd;
      const cm = Math.cos(m * lam);
      const sm = Math.sin(m * lam);
      xg -= ar * (g * cm + h * sm) * dP[n][m];
      yg += (ar * m * (g * sm - h * cm) * P[n][m]) / c;
      zg -= (n + 1) * ar * (g * cm + h * sm) * P[n][m];
    }
  }

  // Rotate to the geodetic frame.
  const d = phiG - phi;
  const x = xg * Math.cos(d) - zg * Math.sin(d);
  return Math.atan2(yg, x) / RAD;
}
