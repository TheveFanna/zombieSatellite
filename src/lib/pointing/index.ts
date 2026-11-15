// Public interface of the AR pointing core and its only entry file.
// sceneVector and the quaternion helpers stay internal.
export type {
  SceneVector,
  CameraBasis,
  OrientationEventType,
  OrientationSample,
  HeadingSource,
  SensorAttitude,
  DragPose,
  TargetDirection,
  LockResult,
  MarkerPosition,
  PermissionState,
  PermissionEvent,
} from './types';
export {
  LOCK_TOLERANCE_DEG,
  LOCK_COMPARISON_EPSILON_DEG,
  VERTICAL_EPSILON,
  SELECTION_WINDOW_MS,
  NO_SAMPLE_TIMEOUT_MS,
  PERMISSION_TIMEOUT_MS,
  CALIBRATION_STEP_DEG,
  DRAG_SENSITIVITY_DEG_PER_PX,
  VERTICAL_FOV_DEG,
  WMM_VALIDITY_START_MS,
  WMM_VALIDITY_END_MS,
} from './constants';
export { normalizeDeg360, wrapDeg180 } from './angles';
export { sceneDirection, headingPitch } from './vector';
export { cameraBasisFromSensor, cameraBasisFromDrag, applyDrag, INITIAL_DRAG_POSE } from './attitude';
export {
  selectHeadingSource,
  HEADING_SOURCE_PRIORITY,
  pickHeadingSource,
  toSensorAttitude,
  normalizeScreenOrientationDeg,
} from './heading-source';
