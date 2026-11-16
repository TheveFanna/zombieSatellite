'use client';
// Satellite_Wheel of the AR tab (S10 design "Satellite_Wheel"): cards on a half-wheel arc at the top.
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';

export interface WheelItem {
  readonly id: number;
  readonly name: string;
  readonly sub: string;
}

export interface SatelliteWheelProps {
  readonly items: readonly WheelItem[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
}

const RADIUS_PX = 260;
const STEP_DEG = 20;
const PX_PER_STEP = 70;
const TAP_SLOP_PX = 6;
const FADE_DEG = 62;

export function SatelliteWheel({ items, selectedIndex, onSelect }: SatelliteWheelProps) {
  const [dragPx, setDragPx] = useState(0);
  const startRef = useRef<{ x: number } | null>(null);
  const lastDxRef = useRef(0);
  const movedRef = useRef(false);
  const dragging = dragPx !== 0;

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX };
    lastDxRef.current = 0;
    movedRef.current = false;
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (s === null) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > TAP_SLOP_PX) movedRef.current = true;
    if (!movedRef.current) return;
    lastDxRef.current = dx;
    setDragPx(dx);
  };

  const onUp = () => {
    if (startRef.current === null) return;
    startRef.current = null;
    if (movedRef.current) {
      const steps = Math.round(-lastDxRef.current / PX_PER_STEP);
      const next = Math.min(items.length - 1, Math.max(0, selectedIndex + steps));
      if (next !== selectedIndex) onSelect(next);
    }
    setDragPx(0);
  };

  return (
    <div
      className="ar-wheel"
      role="tablist"
      aria-label="Satellites"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {items.map((item, i) => {
        const theta = (i - selectedIndex - dragPx / PX_PER_STEP) * STEP_DEG;
        const abs = Math.abs(theta);
        const rad = (theta * Math.PI) / 180;
        const x = RADIUS_PX * Math.sin(rad);
        const y = RADIUS_PX * (1 - Math.cos(rad));
        const visible = abs < FADE_DEG;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            className="ar-card"
            style={{
              transform: `translate(calc(-50% + ${x.toFixed(1)}px), ${y.toFixed(1)}px) rotate(${theta.toFixed(1)}deg)`,
              opacity: Math.max(0, 1 - abs / FADE_DEG),
              pointerEvents: visible ? 'auto' : 'none',
              transition: dragging ? 'none' : undefined,
              zIndex: 10 - Math.round(abs / 10),
            }}
            onClick={() => {
              if (!movedRef.current) onSelect(i);
            }}
          >
            <strong>{item.name}</strong>
            <span>{item.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
