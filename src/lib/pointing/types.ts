declare const sceneFrame: unique symbol;
/** A direction or point in the World_Frame = Scene_Frame of C40: +X east, +Y up, −Z north. */
export type SceneVector = { readonly x: number; readonly y: number; readonly z: number; readonly [sceneFrame]: true };

export interface CameraBasis { readonly forward: SceneVector; readonly up: SceneVector; readonly right: SceneVector }

export type OrientationEventType = 'deviceorientation' | 'deviceorientationabsolute';
export interface OrientationSample {
  readonly type: OrientationEventType;
  readonly absolute: boolean;
  readonly alpha: number | null;
  readonly beta: number | null;
  readonly gamma: number | null;
  /** Present only when the event carries a finite numeric webkitCompassHeading. */
  readonly webkitCompassHeading?: number;
}

export type HeadingSource = 'absolute' | 'compass' | 'relative';

export type SensorAttitude =
  | { readonly source: 'absolute' | 'relative'; readonly alphaDeg: number; readonly betaDeg: number; readonly gammaDeg: number }
  | { readonly source: 'compass'; readonly compassHeadingDeg: number; readonly betaDeg: number; readonly gammaDeg: number };

export interface DragPose { readonly headingDeg: number; readonly pitchDeg: number }
export interface TargetDirection { readonly azimuthDeg: number; readonly elevationDeg: number }

export interface LockResult {
  readonly pointingErrorDeg: number;
  readonly locked: boolean;
  readonly behind: boolean;
  readonly deviceHeadingDeg: number | null;
  readonly devicePitchDeg: number;
  readonly effectiveAzimuthDeg: number;
  readonly azimuthDifferenceDeg: number | null;
  readonly elevationDifferenceDeg: number;
}

export type MarkerPosition =
  | { readonly inFront: false }
  | { readonly inFront: true; readonly ndcX: number; readonly ndcY: number; readonly onScreen: boolean };

export type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied' | 'unavailable';
export type PermissionEvent =
  | 'request-started' | 'permission-granted' | 'permission-denied' | 'permission-error'
  | 'no-permission-api' | 'no-sample-timeout' | 'valid-sample-arrived';
