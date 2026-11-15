import { applyDrag, INITIAL_DRAG_POSE } from '../../lib/pointing/index';
import type { DragPose } from '../../lib/pointing/index';
import type { PointerInput } from './deps';

export interface DragCompassOptions {
  readonly onPose: (pose: DragPose) => void;
}

export interface DragCompass {
  /** Activates the drag compass and resets the pose to `INITIAL_DRAG_POSE`. */
  activate(): void;
  /** Deactivates and stops tracking any pointer. */
  deactivate(): void;
  isActive(): boolean;
  pointerDown(p: PointerInput): void;
  pointerMove(p: PointerInput): void;
  pointerUp(p: PointerInput): void;
  getPose(): DragPose;
}

export function createDragCompass(options: DragCompassOptions): DragCompass {
  const { onPose } = options;
  let active = false;
  let pose: DragPose = INITIAL_DRAG_POSE;
  let trackedId: number | null = null;
  let lastX = 0;
  let lastY = 0;

  return {
    activate(): void {
      active = true;
      trackedId = null;
      pose = INITIAL_DRAG_POSE;
      onPose(pose);
    },
    deactivate(): void {
      active = false;
      trackedId = null;
    },
    isActive: () => active,
    pointerDown(p: PointerInput): void {
      if (!active || trackedId !== null) return;
      trackedId = p.pointerId;
      lastX = p.clientX;
      lastY = p.clientY;
    },
    pointerMove(p: PointerInput): void {
      if (!active || trackedId === null || p.pointerId !== trackedId) return;
      const dx = p.clientX - lastX;
      const dy = p.clientY - lastY;
      lastX = p.clientX;
      lastY = p.clientY;
      pose = applyDrag(pose, dx, dy);
      onPose(pose);
    },
    pointerUp(p: PointerInput): void {
      if (!active || trackedId === null || p.pointerId !== trackedId) return;
      trackedId = null;
    },
    getPose: () => pose,
  };
}
