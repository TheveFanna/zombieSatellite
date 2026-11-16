'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FIELD_COPY } from '../../lib/field/index';
import type { KeyValueStorage } from '../pointing/deps';
import { createFieldBrowserDeps } from './browser-deps';
import { readFirstRunDone, writeFirstRunDone } from './first-run-store';

const STEPS = [
  { text: FIELD_COPY.firstRunStep1, label: FIELD_COPY.firstRunLink1, href: '#catalog' },
  { text: FIELD_COPY.firstRunStep2, label: FIELD_COPY.firstRunLink2, href: '/session' },
  { text: FIELD_COPY.firstRunStep3, label: FIELD_COPY.firstRunLink3, href: '/session' },
  { text: FIELD_COPY.firstRunStep4, label: FIELD_COPY.firstRunLink4, href: '/cards' },
] as const;

export function FirstRunGuide() {
  const storageRef = useRef<KeyValueStorage | null>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    storageRef.current = createFieldBrowserDeps().storage;
    setVisible(!readFirstRunDone(storageRef.current));
  }, []);

  if (!visible) return null;

  const finish = () => {
    if (storageRef.current) writeFirstRunDone(storageRef.current);
    setVisible(false);
  };
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <section className="card first-run">
      <h2>{FIELD_COPY.firstRunHeading}</h2>
      <p>{`${String(step + 1)} / ${String(STEPS.length)}`}</p>
      <p>{current.text}</p>
      <p>
        {current.href.startsWith('#') ? (
          <a className="button" href={current.href}>{current.label}</a>
        ) : (
          <Link className="button" href={current.href}>{current.label}</Link>
        )}{' '}
        {last ? (
          <button type="button" className="button primary" onClick={finish}>{FIELD_COPY.firstRunDone}</button>
        ) : (
          <button type="button" className="button primary" onClick={() => { setStep(step + 1); }}>{FIELD_COPY.firstRunNext}</button>
        )}{' '}
        <button type="button" className="button" onClick={finish}>{FIELD_COPY.firstRunSkip}</button>
      </p>
    </section>
  );
}
