'use client';

// Ground_Track_Map (design.md, "Ground_Track_Map component"). Equirectangular SVG: x = lon, y = -lat.
import { memo, useMemo, useRef } from 'react';
import {
  COASTLINE_PATH,
  FIELD_COPY,
  footprintAngularRadiusDeg,
  footprintRing,
  groundTrack,
  orbitalPeriodMin,
  subSatellitePoint,
  terminator,
} from '../../lib/field/index';
import type { MapLine, MapPoint } from '../../lib/field/index';
import { propagateAt } from '../../lib/orbit/index';
import type { Satrec } from '../../lib/orbit/index';
import { InstrumentDetail } from './visuals/field-bits';

export interface GroundTrackMapProps {
  readonly satrec: Satrec | null;
  readonly observer: { readonly latitudeDeg: number; readonly longitudeDeg: number } | null;
  readonly instantMs: number;
  readonly meanMotion: number | null;
  readonly entryName: string;
}

const VIEWBOX = '-180 -90 360 180';

function pts(points: readonly MapPoint[]): string {
  return points.map((p) => `${p.lonDeg.toFixed(2)},${(-p.latDeg).toFixed(2)}`).join(' ');
}

function shifted(points: readonly MapPoint[], offsetDeg: number): string {
  return pts(points.map((p) => ({ lonDeg: p.lonDeg + offsetDeg, latDeg: p.latDeg })));
}

const GRATICULE: readonly { key: string; x1: number; y1: number; x2: number; y2: number; equator: boolean }[] = (() => {
  const out: { key: string; x1: number; y1: number; x2: number; y2: number; equator: boolean }[] = [];
  for (let lon = -180; lon <= 180; lon += 30) out.push({ key: `m${lon}`, x1: lon, y1: -90, x2: lon, y2: 90, equator: lon === 0 });
  for (let lat = -60; lat <= 60; lat += 30) out.push({ key: `p${lat}`, x1: -180, y1: -lat, x2: 180, y2: -lat, equator: lat === 0 });
  return out;
})();

/** Static layer: React never touches these attributes again. */
const StaticLayer = memo(function StaticLayer() {
  return (
    <g>
      <rect className="map-sea" x={-180} y={-90} width={360} height={180} />
      {GRATICULE.map((g) => (
        <line key={g.key} className={g.equator ? 'map-grid map-equator' : 'map-grid'} x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
      ))}
      <path className="map-coast" d={COASTLINE_PATH} />
    </g>
  );
});

interface TrackCache {
  satrec: Satrec;
  periodMin: number;
  centerMs: number;
  stepMs: number;
  past: readonly MapLine[];
  future: readonly MapLine[];
}

export function GroundTrackMap({ satrec, observer, instantMs, meanMotion, entryName }: GroundTrackMapProps) {
  const cache = useRef<TrackCache | null>(null);

  const period = meanMotion !== null && meanMotion > 0 ? orbitalPeriodMin(meanMotion) : null;

  // Track: recomputed when the instant leaves one grid step around the last center.
  let track: TrackCache | null = null;
  if (satrec !== null && period !== null) {
    const c = cache.current;
    if (c === null || c.satrec !== satrec || c.periodMin !== period || Math.abs(instantMs - c.centerMs) > c.stepMs) {
      const g = groundTrack(satrec, instantMs, period);
      cache.current = { satrec, periodMin: period, centerMs: instantMs, stepMs: g.stepMs, past: g.past, future: g.future };
    }
    track = cache.current;
  }

  // Terminator: once per UTC minute.
  const minute = Math.floor(instantMs / 60_000);
  const night = useMemo(() => {
    const t = terminator(minute * 60_000);
    const edge = -t.nightPoleLatDeg;
    return `${pts(t.curve)} 180,${edge} -180,${edge}`;
  }, [minute]);

  // Satellite: one propagation per redraw.
  let sat: { latitudeDeg: number; longitudeDeg: number; altitudeKm: number } | null = null;
  if (satrec !== null) {
    const r = propagateAt(satrec, instantMs);
    if (r.ok) {
      const g = subSatellitePoint(r.ecfPositionKm);
      if ([g.latitudeDeg, g.longitudeDeg, g.altitudeKm].every(Number.isFinite)) sat = g;
    }
  }

  const ring = sat === null ? null : footprintRing(sat.latitudeDeg, sat.longitudeDeg, sat.altitudeKm);
  const radiusDeg = sat === null ? null : footprintAngularRadiusDeg(sat.altitudeKm);
  const label = `${FIELD_COPY.mapLabel} ${entryName}`;

  return (
    <div className="map">
      <svg className="map-svg" viewBox={VIEWBOX} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <StaticLayer />
        <polygon className="map-night" points={night} />
        {track === null || sat === null
          ? null
          : track.past.map((l, i) => (l.length < 2 ? null : <polyline key={`p${i}`} className="map-past" points={pts(l)} />))}
        {track === null || sat === null
          ? null
          : track.future.map((l, i) => (l.length < 2 ? null : <polyline key={`f${i}`} className="map-future" points={pts(l)} />))}
        {ring === null
          ? null
          : [-360, 0, 360].map((o) => <polygon key={o} className="map-footprint" points={shifted(ring, o)} />)}
        {observer === null ? null : (
          <g transform={`translate(${observer.longitudeDeg} ${-observer.latitudeDeg})`}>
            <circle className="map-pin" r={1.6} />
            <path className="map-pin-cross" d="M-3.4 0H3.4M0 -3.4V3.4" />
          </g>
        )}
        {sat === null ? null : (
          <g transform={`translate(${sat.longitudeDeg} ${-sat.latitudeDeg})`}>
            <circle className="map-halo" r={4.5} />
            <circle className="map-sat" r={1.5} />
          </g>
        )}
      </svg>
      {sat === null ? <p>{FIELD_COPY.mapNoOrbit}</p> : null}
      <InstrumentDetail>
        <dl>
          <dt>{FIELD_COPY.mapLatitudeLabel}</dt>
          <dd>{sat === null ? '—' : `${sat.latitudeDeg.toFixed(2)}°`}</dd>
          <dt>{FIELD_COPY.mapLongitudeLabel}</dt>
          <dd>{sat === null ? '—' : `${sat.longitudeDeg.toFixed(2)}°`}</dd>
          <dt>{FIELD_COPY.mapAltitudeLabel}</dt>
          <dd>{sat === null ? '—' : `${sat.altitudeKm.toFixed(0)} km`}</dd>
          <dt>{FIELD_COPY.mapFootprintLabel}</dt>
          <dd>{radiusDeg === null ? '—' : `${radiusDeg.toFixed(1)}°`}</dd>
          <dt>{FIELD_COPY.mapSpanLabel}</dt>
          <dd>{period === null ? '—' : `±${period.toFixed(0)} min`}</dd>
        </dl>
      </InstrumentDetail>
    </div>
  );
}
