// S8 Satellite_Dial (design "Satellite dial", Requirement 7): a draggable circular dial of the catalog.
'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { listCatalogEntries } from '../../lib/catalog/index';
import {
  dialIndexFromDrag,
  dialNodeAngleDeg,
  dialRotationDeg,
  dialStep,
} from '../../lib/console/index';
import { SHELL_COPY } from '../shell/copy';
import { CONSOLE_COPY } from './copy';

export interface SatelliteDialProps {
  /** Slug of the selected catalog entry. */
  readonly selectedSlug: string;
  /** Called with the slug of the newly selected entry (tap, drag snap, buttons, arrow keys). */
  readonly onSelect: (slug: string) => void;
  /** Called when "View story" is pressed; the parent opens the story sheet. */
  readonly onViewStory: (slug: string) => void;
}

const CENTER = 50;
const RADIUS = 34;
const TAP_SLOP_PX = 6;

interface DragState {
  readonly pointerId: number;
  readonly startIndex: number;
  readonly tapIndex: number | null;
  lastAngle: number;
  accumulated: number;
  startX: number;
  startY: number;
  moved: boolean;
}

function pointerAngleDeg(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const box = svg.getBoundingClientRect();
  const dx = clientX - (box.left + box.width / 2);
  const dy = clientY - (box.top + box.height / 2);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function wrapDelta(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

export function SatelliteDial({ selectedSlug, onSelect, onViewStory }: SatelliteDialProps) {
  const entries = listCatalogEntries();
  const count = entries.length;
  const found = entries.findIndex((e) => e.slug === selectedSlug);
  const index = found < 0 ? 0 : found;
  const entry = entries[index];
  const drag = useRef<DragState | null>(null);
  const [dragDeg, setDragDeg] = useState<number | null>(null);

  const select = (i: number) => {
    const target = entries[i];
    if (target && target.slug !== selectedSlug) onSelect(target.slug);
  };

  const rotation = dragDeg ?? dialRotationDeg(index, count);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current) return;
    const nodeEl = (e.target as Element).closest('[data-index]');
    const raw = nodeEl?.getAttribute('data-index');
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startIndex: index,
      tapIndex: raw === null || raw === undefined ? null : Number(raw),
      lastAngle: pointerAngleDeg(e.currentTarget, e.clientX, e.clientY),
      accumulated: 0,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < TAP_SLOP_PX) return;
    d.moved = true;
    const angle = pointerAngleDeg(e.currentTarget, e.clientX, e.clientY);
    d.accumulated += wrapDelta(angle - d.lastAngle);
    d.lastAngle = angle;
    setDragDeg(dialRotationDeg(d.startIndex, count) + d.accumulated);
  };

  const finish = (e: PointerEvent<SVGSVGElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragDeg(null);
    if (cancelled) return;
    if (d.moved) select(dialIndexFromDrag(d.startIndex, d.accumulated, count));
    else if (d.tapIndex !== null && d.tapIndex >= 0 && d.tapIndex < count) select(d.tapIndex);
  };

  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') select(dialStep(index, 1, count));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') select(dialStep(index, -1, count));
    else if (e.key === ' ' || e.key === 'Enter') {
      const raw = (e.currentTarget as SVGGElement).getAttribute('data-index');
      if (raw !== null) select(Number(raw));
    } else return;
    e.preventDefault();
  };

  if (!entry) return null;
  const statusLabel = entry.playable ? SHELL_COPY.playableLabel : SHELL_COPY.storyOnlyLabel;

  return (
    <section className="dial">
      <div className="dialHead">
        <h2 className="dialName">{entry.name}</h2>
        <p className="dialStatus">{statusLabel}</p>
      </div>
      <div className="dialStage">
        <button
          type="button"
          className="dialStep"
          aria-label={CONSOLE_COPY.dialPrevious}
          onClick={() => select(dialStep(index, -1, count))}
        >
          ‹
        </button>
        <svg
          className="dialSvg"
          viewBox="0 0 100 100"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finish(e, false)}
          onPointerCancel={(e) => finish(e, true)}
        >
          <circle className="dialRing" cx={CENTER} cy={CENTER} r={RADIUS} />
          <g
            className="dialRotor"
            role="radiogroup"
            aria-label={CONSOLE_COPY.dialGroupLabel}
            data-dragging={dragDeg !== null ? 'true' : 'false'}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {entries.map((item, i) => {
              const selected = i === index;
              const angle = (dialNodeAngleDeg(i, count) * Math.PI) / 180;
              const cx = CENTER + RADIUS * Math.sin(angle);
              const cy = CENTER - RADIUS * Math.cos(angle);
              return (
                <g
                  key={item.slug}
                  className={`dialNode ${item.playable ? 'dialNode-playable' : 'dialNode-story'}`}
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${item.name}, ${item.playable ? SHELL_COPY.playableLabel : SHELL_COPY.storyOnlyLabel}`}
                  tabIndex={selected ? 0 : -1}
                  data-index={i}
                  onKeyDown={onKeyDown}
                >
                  <circle cx={cx} cy={cy} r={selected ? 7 : 4.5} />
                </g>
              );
            })}
          </g>
        </svg>
        <button
          type="button"
          className="dialStep"
          aria-label={CONSOLE_COPY.dialNext}
          onClick={() => select(dialStep(index, 1, count))}
        >
          ›
        </button>
      </div>
      {entry.playable ? (
        <>
          <Link className="dialAction" href={`/session/${entry.noradId}`}>
            {CONSOLE_COPY.dialStartSession}
          </Link>
          <button type="button" className="dialAction" onClick={() => onViewStory(entry.slug)}>
            {CONSOLE_COPY.dialViewStory}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="dialAction" onClick={() => onViewStory(entry.slug)}>
            {CONSOLE_COPY.dialViewStory}
          </button>
          <p className="dialReason">{SHELL_COPY.unplayableReasons[entry.unplayableReason]}</p>
        </>
      )}
    </section>
  );
}
