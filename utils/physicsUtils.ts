
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Vector2 } from '../types';

/**
 * Returns the squared distance between a point and the closest point on a rectangle.
 */
export const getDistanceSqToRect = (px: number, py: number, rx: number, ry: number, rw: number, rh: number): { distSq: number; closestX: number; closestY: number } => {
  const closestX = Math.max(rx, Math.min(px, rx + rw));
  const closestY = Math.max(py, Math.min(py, ry + rh));
  const dx = px - closestX;
  const dy = py - closestY;
  return { distSq: dx * dx + dy * dy, closestX, closestY };
};

/**
 * Checks if a point is within a specific arc segment of a tile and returns the center of the arc.
 */
export const isPointInArc = (px: number, py: number, tx: number, ty: number, tileSize: number, orientation: 'NW' | 'NE' | 'SW' | 'SE'): { inBounds: boolean; cx: number; cy: number; startAngle: number } => {
  let cx = tx, cy = ty;
  let startAngle = 0;
  
  if (orientation === 'NE') { cx = tx + tileSize; startAngle = Math.PI / 2; }
  else if (orientation === 'SW') { cy = ty + tileSize; startAngle = 1.5 * Math.PI; }
  else if (orientation === 'SE') { cx = tx + tileSize; cy = ty + tileSize; startAngle = Math.PI; }

  const dx = px - cx;
  const dy = py - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  const inBounds = dist < tileSize && 
                   px >= tx && px <= tx + tileSize &&
                   py >= ty && py <= ty + tileSize;
                   
  return { inBounds, cx, cy, startAngle };
};
