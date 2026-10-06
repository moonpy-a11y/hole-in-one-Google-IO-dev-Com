/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getDistance,
  normalizeVector,
  dotProduct,
  reflectVector,
  getAngleBetweenPoints,
  applyFriction,
  clamp,
  isCircleOverlappingRect,
  Vector2,
} from './physicsHelpers';

describe('physicsHelpers', () => {
  describe('getDistance', () => {
    it('should calculate distance between two points', () => {
      const dist = getDistance(0, 0, 3, 4);
      expect(dist).toBeCloseTo(5, 5);
    });

    it('should return 0 for identical points', () => {
      const dist = getDistance(5, 5, 5, 5);
      expect(dist).toBeCloseTo(0, 5);
    });

    it('should handle negative coordinates', () => {
      const dist = getDistance(-1, -1, 2, 3);
      expect(dist).toBeCloseTo(5, 5);
    });
  });

  describe('normalizeVector', () => {
    it('should normalize a vector to unit length', () => {
      const result = normalizeVector(3, 4);
      expect(result.x).toBeCloseTo(0.6, 5);
      expect(result.y).toBeCloseTo(0.8, 5);
    });

    it('should return zero vector for zero-length input', () => {
      const result = normalizeVector(0, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle negative components', () => {
      const result = normalizeVector(-3, -4);
      expect(result.x).toBeCloseTo(-0.6, 5);
      expect(result.y).toBeCloseTo(-0.8, 5);
    });
  });

  describe('dotProduct', () => {
    it('should calculate dot product of two vectors', () => {
      const result = dotProduct(1, 2, 3, 4);
      expect(result).toBe(11); // 1*3 + 2*4 = 11
    });

    it('should return 0 for perpendicular vectors', () => {
      const result = dotProduct(1, 0, 0, 1);
      expect(result).toBe(0);
    });

    it('should return negative for opposite vectors', () => {
      const result = dotProduct(1, 1, -1, -1);
      expect(result).toBe(-2);
    });
  });

  describe('reflectVector', () => {
    it('should reflect vector off a surface (unit normal)', () => {
      // Velocity (1, 1) off normal (0, 1) should reflect to (1, -1)
      const result = reflectVector(1, 1, 0, 1);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(-1, 5);
    });

    it('should normalize non-unit normal automatically', () => {
      // Same reflection with non-normalized normal (0, 2)
      const result = reflectVector(1, 1, 0, 2);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(-1, 5);
    });

    it('should handle degenerate zero-length normal', () => {
      // Zero-length normal should return velocity unchanged
      const result = reflectVector(1, 1, 0, 0);
      expect(result.x).toBe(1);
      expect(result.y).toBe(1);
    });

    it('should reflect off diagonal normal', () => {
      // Velocity (1, 0) off normal (1, 1) [normalized to ~0.707, 0.707]
      const result = reflectVector(1, 0, 1, 1);
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(1, 5);
    });
  });

  describe('getAngleBetweenPoints', () => {
    it('should return angle to point on positive x-axis', () => {
      const angle = getAngleBetweenPoints(0, 0, 1, 0);
      expect(angle).toBeCloseTo(0, 5);
    });

    it('should return angle to point on positive y-axis', () => {
      const angle = getAngleBetweenPoints(0, 0, 0, 1);
      expect(angle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should return angle to point on negative x-axis', () => {
      const angle = getAngleBetweenPoints(0, 0, -1, 0);
      expect(Math.abs(angle)).toBeCloseTo(Math.PI, 5);
    });
  });

  describe('applyFriction', () => {
    it('should reduce velocity by friction factor', () => {
      const result = applyFriction(10, 20, 0.8);
      expect(result.x).toBe(8);
      expect(result.y).toBe(16);
    });

    it('should handle zero friction', () => {
      const result = applyFriction(10, 20, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle friction > 1 (acceleration)', () => {
      const result = applyFriction(10, 20, 1.5);
      expect(result.x).toBe(15);
      expect(result.y).toBe(30);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should clamp value below minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should clamp value above maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('isCircleOverlappingRect', () => {
    it('should detect overlap when circle is inside rectangle', () => {
      const result = isCircleOverlappingRect(5, 5, 2, 0, 0, 10, 10);
      expect(result).toBe(true);
    });

    it('should detect overlap when circle center is outside but radius intersects', () => {
      const result = isCircleOverlappingRect(11, 5, 3, 0, 0, 10, 10);
      expect(result).toBe(true);
    });

    it('should not detect overlap when circle is far from rectangle', () => {
      const result = isCircleOverlappingRect(20, 20, 2, 0, 0, 10, 10);
      expect(result).toBe(false);
    });

    it('should detect overlap at rectangle corner', () => {
      const result = isCircleOverlappingRect(10, 10, 2, 0, 0, 10, 10);
      expect(result).toBe(true);
    });

    it('should not detect overlap at rectangle edge just beyond radius', () => {
      const result = isCircleOverlappingRect(13, 5, 2, 0, 0, 10, 10);
      expect(result).toBe(false);
    });
  });
});
