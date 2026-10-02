/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
 */
export const reflectVector = (vx: number, vy: number, nx: number, ny: number): Vector2 => {
  const dot = 2 * (vx * nx + vy * ny);
  return { x: vx - dot * nx, y: vy - dot * ny };
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
