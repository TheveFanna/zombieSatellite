'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FIELD_COPY,
  ILLUSTRATIVE_MODELS,
  MODEL_SPIN_DEG_PER_S,
  AR_MAX_FPS,
  buildAttributionText,
  buildStoredZip,
  getModelRecord,
  illustrativeObjHeader,
  modelAttributionName,
  modelObjName,
  modelZipName,
  parseObj,
  shadeModel,
  serializeObj,
} from '../../lib/field/index';
import type { ModelGeometry } from '../../lib/field/index';
import { createFieldBrowserDeps } from './browser-deps';
import { createFieldDownloader } from './field-downloader';

const PITCH_RAD = (20 * Math.PI) / 180;
const SIZE = 240;
const FRAME_MS = 1000 / AR_MAX_FPS;

function Canvas({ model }: { model: ModelGeometry }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas === null ? null : canvas.getContext('2d');
    if (canvas === null || ctx === null) return undefined;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = SIZE * ratio;
    canvas.height = SIZE * ratio;
    let onScreen = true;
    let handle: number | null = null;
    let last = 0;
    let yaw = 0;
    const draw = () => {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      // Night backdrop: a soft blue glow, not black.
      const sky = ctx.createRadialGradient(SIZE / 2, SIZE * 0.4, SIZE * 0.05, SIZE / 2, SIZE / 2, SIZE * 0.72);
      sky.addColorStop(0, '#2a4168');
      sky.addColorStop(1, '#0c1424');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, SIZE, SIZE);
      // Soft contact shadow under the model.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(SIZE / 2, SIZE * 0.82, SIZE * 0.26, SIZE * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      // Lit, filled faces, painted far to near.
      ctx.lineJoin = 'round';
      ctx.lineWidth = 0.8;
      for (const face of shadeModel(model, yaw, PITCH_RAD, SIZE / 2)) {
        ctx.beginPath();
        face.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(SIZE / 2 + p.x, SIZE / 2 + p.y);
          else ctx.lineTo(SIZE / 2 + p.x, SIZE / 2 + p.y);
        });
        ctx.closePath();
        ctx.fillStyle = face.fill;
        ctx.strokeStyle = face.fill;
        ctx.fill();
        ctx.stroke();
      }
    };
    const tick = (now: number) => {
      handle = null;
      if (!onScreen || document.visibilityState !== 'visible') return;
      if (last === 0) last = now;
      const dt = now - last;
      if (dt >= FRAME_MS) {
        yaw += (MODEL_SPIN_DEG_PER_S * Math.PI * dt) / 180000;
        last = now;
        draw();
      }
      handle = window.requestAnimationFrame(tick);
    };
    const start = () => {
      if (handle !== null || !onScreen || document.visibilityState !== 'visible') return;
      last = 0;
      draw();
      handle = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      if (handle !== null) window.cancelAnimationFrame(handle);
      handle = null;
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((records) => {
            onScreen = records[records.length - 1].isIntersecting;
            if (onScreen) start();
            else stop();
          });
    observer?.observe(canvas);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [model]);
  return <canvas ref={ref} className="model-canvas" style={{ width: SIZE, height: SIZE, borderRadius: 12 }} aria-hidden="true" />;
}

export function ModelViewer({ slug }: { slug: string }) {
  const record = getModelRecord(slug);
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<ModelGeometry | null>(null);
  const [originalText, setOriginalText] = useState<string | null>(null);

  useEffect(() => {
    if (!open || record === undefined) return undefined;
    const fallback = ILLUSTRATIVE_MODELS[slug] ?? null;
    if (record.decision !== 'Original') {
      setModel(fallback);
      return undefined;
    }
    let cancelled = false;
    fetch(`/models/${slug}.obj`)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error('status'))))
      .then((text) => {
        const parsed = parseObj(text);
        if (cancelled) return;
        if (parsed === null) setModel(fallback);
        else {
          setOriginalText(text);
          setModel(parsed);
        }
      })
      .catch(() => {
        if (!cancelled) setModel(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [open, record, slug]);

  if (record === undefined) return null;

  function download() {
    if (record === undefined || model === null) return;
    const encoder = new TextEncoder();
    const objText =
      record.decision === 'Original' && originalText !== null
        ? originalText
        : serializeObj(model, illustrativeObjHeader(record));
    const attribution = buildAttributionText(record, new Date().toISOString().slice(0, 10));
    const zip = buildStoredZip([
      { name: modelObjName(slug), data: encoder.encode(objText) },
      { name: modelAttributionName(slug), data: encoder.encode(attribution) },
    ]);
    createFieldDownloader(createFieldBrowserDeps().download).downloadBytes(zip, 'application/zip', modelZipName(slug));
  }

  return (
    <details onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
      <summary>{FIELD_COPY.modelHeading}</summary>
      {open && model !== null ? (
        <>
          <Canvas model={model} />
          <p>
            {record.decision === 'Illustrative'
              ? FIELD_COPY.modelIllustrative
              : `${FIELD_COPY.modelAuthorLabel}: ${record.author} · ${FIELD_COPY.modelLicenceLabel}: ${record.licence}`}
          </p>
          <p>
            <button type="button" onClick={download}>{FIELD_COPY.modelDownload}</button>
          </p>
        </>
      ) : null}
    </details>
  );
}
