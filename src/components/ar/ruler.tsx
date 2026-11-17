'use client';
// Ruler of the AR tab (S11 design): a vertical scale with tick marks and a white bar at the current value.
import { memo } from 'react';
import type { PointerEvent, KeyboardEvent } from 'react';

export interface RulerProps {
  readonly side: 'left' | 'right';
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly format: (value: number) => string;
  readonly onChange: (value: number) => void;
}

const TICKS = 40;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function RulerImpl({ side, label, value, min, max, step, format, onChange }: RulerProps) {
  const fraction = (value - min) / (max - min);
  const topPct = (1 - fraction) * 100;

  const setFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    const snapped = Math.round((min + f * (max - min)) / step) * step;
    onChange(clamp(snapped, min, max));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onChange(clamp(value + step, min, max));
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onChange(clamp(value - step, min, max));
    else if (e.key === 'Home') onChange(max);
    else if (e.key === 'End') onChange(min);
    else return;
    e.preventDefault();
  };

  return (
    <div className={`ruler ruler-${side}`}>
      <span className="ruler-label">{label}</span>
      <div
        className="ruler-track"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        {Array.from({ length: TICKS + 1 }, (_, i) => (
          <span key={i} className={i % 5 === 0 ? 'tick major' : 'tick'} style={{ top: `${(i / TICKS) * 100}%` }} />
        ))}
        <span className="ruler-bar" style={{ top: `${topPct}%` }} />
      </div>
      <span className="ruler-value" style={{ top: `${topPct}%` }}>
        {format(value)}
      </span>
    </div>
  );
}

export const Ruler = memo(RulerImpl);
