'use client';
// Satellite_Wheel of the AR tab (S11, S11 round 2): tall certificate cards in a row.
// The selected card sits in front and is a little larger. Moving the selection slides the row sideways.
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

const SPACING_PX = 58;
const PX_PER_STEP = 70;
const TAP_SLOP_PX = 6;
const HIDE_AT = 2.6;

function Certificate({ item }: { item: WheelItem }) {
  return (
    <>
      <span className="cert-no">NORAD {item.id}</span>
      <svg className="cert-emblem" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" />
        <ellipse cx="20" cy="20" rx="15" ry="6" transform="rotate(-28 20 20)" />
        <circle cx="20" cy="20" r="2.4" className="cert-core" />
        <circle cx="32.6" cy="11.3" r="1.6" className="cert-sat" />
      </svg>
      <strong>{item.name}</strong>
      <em>{item.sub}</em>
    </>
  );
}

export function SatelliteWheel({ items, selectedIndex, onSelect }: SatelliteWheelProps) {
  // dragPx is the finger offset while a drag is in progress; it is 0 at rest.
  const [dragPx, setDragPx] = useState(0);
  const startRef = useRef<{ x: number } | null>(null);
  const lastDxRef = useRef(0);
  const movedRef = useRef(false);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    startRef.current = { x: e.clientX };
    lastDxRef.current = 0;
    movedRef.current = false;
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (s === null) return;
    const dx = e.clientX - s.x;
    if (!movedRef.current && Math.abs(dx) <= TAP_SLOP_PX) return;
    movedRef.current = true;
    lastDxRef.current = dx;
    setDragPx(dx);
  };

  const onUp = () => {
    if (startRef.current === null) return;
    startRef.current = null;
    if (movedRef.current) {
      // Finger to the right (dx > 0) brings the previous card to the centre.
      const steps = Math.round(-lastDxRef.current / PX_PER_STEP);
      const next = Math.min(items.length - 1, Math.max(0, selectedIndex + steps));
      if (next !== selectedIndex) onSelect(next);
    }
    setDragPx(0);
  };
  const place = (offset: number) => {
    const abs = Math.abs(offset);
    return {
      transform: `translate(calc(-50% + ${(offset * SPACING_PX).toFixed(1)}px), ${(abs * 6).toFixed(1)}px) scale(${Math.max(0.8, 1.08 - 0.2 * abs).toFixed(3)})`,
      opacity: Math.max(0, 1 - abs * 0.4),
      zIndex: 10 - Math.round(abs * 3),
      pointerEvents: abs < HIDE_AT ? ('auto' as const) : ('none' as const),
    };
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
        // The finger moves the row with it: a rightward drag shifts each card rightward.
        const offset = i - selectedIndex + dragPx / PX_PER_STEP;
        const selected = i === selectedIndex;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? 'ar-card is-selected' : 'ar-card'}
            style={{ ...place(offset), transition: dragPx !== 0 ? 'none' : undefined }}
            onClick={() => {
              if (!movedRef.current) onSelect(i);
            }}
          >
            <Certificate item={item} />
          </button>
        );
      })}
    </div>
  );
}
