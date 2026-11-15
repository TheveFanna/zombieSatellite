import {
  cameraBasisFromDrag,
  cameraBasisFromSensor,
  declinationDeg,
  evaluateLock,
  normalizeScreenOrientationDeg,
} from '../../lib/pointing/index';
import type {
  CameraBasis,
  HeadingSource,
  LockResult,
  PermissionState,
  SensorAttitude,
  TargetDirection,
} from '../../lib/pointing/index';
import { createCalibrationStore } from './calibration-store';
import type {
  Clock,
  EventSourceLike,
  KeyValueStorage,
  PermissionRequester,
  PointerInput,
  ScreenOrientationSource,
  TimerApi,
  VisibilitySource,
} from './deps';
import { createDragCompass } from './drag-compass';
import { createOrientationStream } from './orientation-stream';
import { createPermissionFlow } from './permission-flow';

export interface ObserverPosition {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
}

export interface PointingSessionDeps {
  readonly events: EventSourceLike;
  readonly timers: TimerApi;
  readonly clock: Clock;
  readonly visibility: VisibilitySource;
  readonly screen: ScreenOrientationSource;
  readonly storage: KeyValueStorage;
  readonly requestPermission: PermissionRequester;
}

export interface PointingSnapshot {
  readonly permission: PermissionState;
  readonly mode: 'sensor' | 'drag';
  /** Heading source of the locked sensor stream; `null` in drag mode or before a source is locked. */
  readonly source: HeadingSource | null;
  readonly basis: CameraBasis | null;
  readonly lock: LockResult | null;
  readonly calibrationOffsetDeg: number;
  /** Declination used for the basis; `null` when none applies (drag mode, no attitude, "relative"). */
  readonly declinationAppliedDeg: number | null;
  readonly observer: ObserverPosition;
  readonly target: TargetDirection;
  readonly dragActive: boolean;
}

export interface PointingSession {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PointingSnapshot;
  /** Gesture entry: calls the permission flow synchronously. */
  requestPermission(): void;
  setDragEnabled(on: boolean): void;
  stepCalibration(deltaDeg: number): void;
  pointerDown(p: PointerInput): void;
  pointerMove(p: PointerInput): void;
  pointerUp(p: PointerInput): void;
  setObserver(observer: ObserverPosition): void;
  setTarget(target: TargetDirection): void;
  dispose(): void;
}

export const DEFAULT_OBSERVER: ObserverPosition = Object.freeze({ latitudeDeg: 39.9042, longitudeDeg: 116.4074 });
export const DEFAULT_TARGET: TargetDirection = Object.freeze({ azimuthDeg: 90, elevationDeg: 30 });

const MS_PER_DAY = 86_400_000;

export function createPointingSession(deps: PointingSessionDeps): PointingSession {
  const { events, timers, clock, visibility, screen, storage, requestPermission } = deps;

  const listeners = new Set<() => void>();
  let disposed = false;
  let observer: ObserverPosition = DEFAULT_OBSERVER;
  let target: TargetDirection = DEFAULT_TARGET;
  let attitude: SensorAttitude | null = null;

  // Declination cache: recomputed on observer change or UTC date change.
  let declination = 0;
  let declinationDay: number | null = null;
  let declinationStale = true;

  let snapshot: PointingSnapshot;

  const store = createCalibrationStore(storage);
  const compass = createDragCompass({ onPose: () => rebuild() });

  let stream: { start(): void; stop(): void; getSource(): HeadingSource | null } | null = null;
  const flow = createPermissionFlow({
    requestPermission,
    timers,
    createStream: (cb) => {
      const real = createOrientationStream({
        events,
        timers,
        visibility,
        onAttitude: (a) => {
          attitude = a;
          rebuild();
        },
        ...cb,
      });
      stream = real;
      return {
        // A permission promise may settle after dispose; it must not restart the stream.
        start: () => {
          if (!disposed) real.start();
        },
        stop: () => real.stop(),
      };
    },
    onState: (state) => {
      if ((state === 'unavailable' || state === 'denied') && !compass.isActive()) {
        compass.activate(); // rebuilds through onPose
        return;
      }
      rebuild();
    },
  });

  function currentDeclination(): number {
    const now = clock.nowMs();
    const day = Math.floor(now / MS_PER_DAY);
    if (declinationStale || day !== declinationDay) {
      try {
        declination = declinationDeg(observer.latitudeDeg, observer.longitudeDeg, now);
      } catch {
        // keep the previous value
      }
      declinationStale = false;
      declinationDay = day;
    }
    return declination;
  }

  function build(): PointingSnapshot {
    const dragActive = compass.isActive();
    let basis: CameraBasis | null = null;
    let source: HeadingSource | null = null;
    let declinationAppliedDeg: number | null = null;

    if (dragActive) {
      basis = cameraBasisFromDrag(compass.getPose());
    } else if (attitude !== null) {
      source = attitude.source;
      const d = source === 'relative' ? 0 : currentDeclination();
      if (source !== 'relative') declinationAppliedDeg = d;
      basis = cameraBasisFromSensor(attitude, normalizeScreenOrientationDeg(screen.readAngle()), d);
    }

    const calibrationOffsetDeg = store.get();
    const lock = basis === null ? null : evaluateLock(basis.forward, target, calibrationOffsetDeg);
    return Object.freeze({
      permission: flow.getState(),
      mode: dragActive ? ('drag' as const) : ('sensor' as const),
      source,
      basis,
      lock,
      calibrationOffsetDeg,
      declinationAppliedDeg,
      observer,
      target,
      dragActive,
    });
  }

  function rebuild(): void {
    if (disposed) return;
    snapshot = build();
    for (const listener of [...listeners]) listener();
  }

  snapshot = build();
  flow.start();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    requestPermission() {
      flow.requestFromGesture();
    },
    setDragEnabled(on) {
      if (on) {
        if (!compass.isActive()) compass.activate(); // rebuilds through onPose
      } else if (compass.isActive()) {
        compass.deactivate();
        rebuild();
      }
    },
    stepCalibration(deltaDeg) {
      store.step(deltaDeg);
      rebuild();
    },
    pointerDown: (p) => compass.pointerDown(p),
    pointerMove: (p) => compass.pointerMove(p),
    pointerUp: (p) => compass.pointerUp(p),
    setObserver(next) {
      if (!Number.isFinite(next.latitudeDeg) || !Number.isFinite(next.longitudeDeg)) return;
      observer = Object.freeze({ latitudeDeg: next.latitudeDeg, longitudeDeg: next.longitudeDeg });
      declinationStale = true;
      rebuild();
    },
    setTarget(next) {
      if (!Number.isFinite(next.azimuthDeg) || !Number.isFinite(next.elevationDeg)) return;
      target = Object.freeze({ azimuthDeg: next.azimuthDeg, elevationDeg: next.elevationDeg });
      rebuild();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stream?.stop();
      compass.deactivate();
      listeners.clear();
    },
  };
}
