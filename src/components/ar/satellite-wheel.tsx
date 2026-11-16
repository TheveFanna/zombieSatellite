'use client';
// Satellite_Wheel of the AR tab (S11 design): tall certificate cards stacked in a row.
// The selected card is in front and a little larger. A change lifts the old card up and drops the new one from above.
import { useEffect, useRef, useState } from 'react';
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
const ANIM_MS = 420;
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
  const [dragPx, setDragPx] = useState(0);
  const [entering, setEntering] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<number | null>(null);
  const prevRef = useRef(selectedIndex);
  const startRef = useRef<{ x: number } | null>(null);
  const lastDxRef = useRef(0);
  const movedRef = useRef(false);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = selectedIndex;
    if (prev === selectedIndex) return;
    setEntering(selectedIndex);
    setLeaving(prev);
    const id = window.setTimeout(() => {
      setEntering(null);
      setLeaving(null);
    }, ANIM_MS);
    return () => window.clearTimeout(id);
  }, [selectedIndex]);

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
      {leaving !== null && leaving !== selectedIndex && items[leaving] !== undefined ? (
        <div className="ar-card ar-card-leave" aria-hidden="true" style={{ ...place(0), transition: 'none' }}>
          <Certificate item={items[leaving]} />
        </div>
      ) : null}
      {items.map((item, i) => {
        const offset = i - selectedIndex - dragPx / PX_PER_STEP;
        const selected = i === selectedIndex;
        const classes = ['ar-card'];
        if (selected) classes.push('is-selected');
        if (entering === i) classes.push('ar-card-enter');
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={classes.join(' ')}
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
