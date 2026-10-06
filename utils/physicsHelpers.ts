/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export { Vector2 } from '../types';
import { Vector2 } from '../types';

/**
 * Calculates the Euclidean distance between two points.
 */
export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Normalizes a 2D vector to a unit vector.
 * 
 * @remarks
 * If the input vector has zero length (x === 0 && y === 0), returns { x: 0, y: 0 }.
 * Callers should handle this edge case as appropriate for their use case.
 */
export const normalizeVector = (x: number, y: number): Vector2 => {
  const length = Math.hypot(x, y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return { x: x / length, y: y / length };
};

/**
 * Calculates the dot product of two 2D vectors.
 */
export const dotProduct = (x1: number, y1: number, x2: number, y2: number): number => {
  return x1 * x2 + y1 * y2;
};

/**
 * Reflects a vector off a surface with a given normal.
 * 
 * @remarks
 * The normal is automatically normalized to ensure correct reflection behavior.
 * This allows callers to pass unnormalized normals without distorting the reflected velocity.
 * 
 * @param vx - Velocity x component
 * @param vy - Velocity y component
 * @param nx - Normal x component (will be normalized)
 * @param ny - Normal y component (will be normalized)
 * @returns Reflected velocity vector
 */
export const reflectVector = (vx: number, vy: number, nx: number, ny: number): Vector2 => {
  // Normalize the input normal to ensure unit-length
  const length = Math.hypot(nx, ny);
  if (length === 0) {
    // Degenerate case: zero-length normal, return velocity unchanged
    return { x: vx, y: vy };
  }

  const nxn = nx / length;
  const nyn = ny / length;
  const dot = 2 * (vx * nxn + vy * nyn);

  return { x: vx - dot * nxn, y: vy - dot * nyn };
};

/**
 * Returns the angle from the first point to the second point in radians.
 */
export const getAngleBetweenPoints = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1);
};

/**
 * Applies a friction multiplier to a velocity vector.
 */
export const applyFriction = (vx: number, vy: number, frictionFactor: number): Vector2 => ({
  x: vx * frictionFactor,
  y: vy * frictionFactor,
});

/**
 * Clamps a value between a minimum and maximum range.
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Checks whether a circle intersects a rectangle.
 * 
 * @remarks
 * This function only checks **axis-aligned rectangles (AABB)**.
 * For rotated obstacles or complex collision shapes, a more sophisticated
 * collision detection system will be needed.
 * 
 * @param cx - Circle center x
 * @param cy - Circle center y
 * @param radius - Circle radius
 * @param rx - Rectangle left edge x
 * @param ry - Rectangle top edge y
 * @param rw - Rectangle width
 * @param rh - Rectangle height
 * @returns true if the circle overlaps the rectangle, false otherwise
 */
export const isCircleOverlappingRect = (
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean => {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;

  return dx * dx + dy * dy <= radius * radius;
};
