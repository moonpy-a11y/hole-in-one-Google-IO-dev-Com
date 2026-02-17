
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useEffect, useCallback } from 'react';
import { Ball, LevelData, Vector2, Wall, Decoration, PortalExitConfig } from '../types';
import { 
  TILE_SIZE, 
  CHAR_WALL, 
  CHAR_ARC, 
  CHAR_INSIDE_ARC, 
  CHAR_START, 
  CHAR_HOLE, 
  CHAR_ANDROID, 
  CHAR_TREX, 
  CHAR_BOUNCY_PAD, 
  CHAR_BOOST_LEFT, 
  CHAR_BOOST_RIGHT, 
  CHAR_BOOST_UP, 
  CHAR_BOOST_DOWN, 
  CHAR_WATER, 
  CHAR_WATER_ARC, 
  CHAR_SAND, 
  CHAR_SAND_ARC, 
  BALL_RADIUS, 
  FRICTION, 
  SAND_FRICTION, 
  VELOCITY_THRESHOLD, 
  HOLE_RADIUS, 
  TELEPORT_TIME 
} from '../constants';
import { getDistanceSqToRect, isPointInArc } from '../utils/physicsUtils';
import { getPath } from '../utils/path';

interface BoostTile extends Vector2 { dx: number; dy: number; }
interface WaterArcTile extends Vector2 { orientation: 'NW' | 'NE' | 'SW' | 'SE'; }
interface SandArcTile extends Vector2 { orientation: 'NW' | 'NE' | 'SW' | 'SE'; }
interface PortalTile extends Vector2 { id: string; }
interface PendingTeleport { targetPortal: PortalTile; exitConfig?: PortalExitConfig; }

export function useGamePhysics(
  level: LevelData, 
  onStroke: () => void, 
  onHole: () => void, 
  playForeground: (path: string) => void
) {
  const ballRef = useRef<Ball | null>(null);
  const wallsRef = useRef<Wall[]>([]);
  const decorationsRef = useRef<Decoration[]>([]);
  const boostTilesRef = useRef<BoostTile[]>([]);
  const waterTilesRef = useRef<Vector2[]>([]);
  const waterArcsRef = useRef<WaterArcTile[]>([]);
  const sandTilesRef = useRef<Vector2[]>([]);
  const sandArcsRef = useRef<SandArcTile[]>([]);
  const portalsRef = useRef<PortalTile[]>([]);
  const holeRef = useRef<Vector2 | null>(null);
  const startPosRef = useRef<Vector2 | null>(null);
  
  const portalCooldownRef = useRef<number>(0);
  const pendingTeleportRef = useRef<PendingTeleport | null>(null);

  useEffect(() => {
    const walls: Wall[] = [];
    const decorations: Decoration[] = [];
    const boostTiles: BoostTile[] = [];
    const waterTiles: Vector2[] = [];
    const waterArcs: WaterArcTile[] = [];
    const sandTiles: Vector2[] = [];
    const sandArcs: SandArcTile[] = [];
    const portals: PortalTile[] = [];
    let start: Vector2 = { x: 0, y: 0 };
    let hole: Vector2 = { x: 0, y: 0 };

    const isSolid = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char === CHAR_WALL || char === CHAR_ARC || char === CHAR_INSIDE_ARC;
    };

    const isWatery = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char === CHAR_WATER || char === CHAR_WATER_ARC || char === CHAR_SAND_ARC;
    };

    const isSandy = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char === CHAR_SAND || char === CHAR_SAND_ARC || char === CHAR_WATER_ARC;
    };
    
    level.grid.forEach((row, rowIndex) => {
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const char = row[colIndex];
        const x = colIndex * TILE_SIZE;
        const y = rowIndex * TILE_SIZE;

        if (char === CHAR_WALL) {
          walls.push({ x, y, w: TILE_SIZE, h: TILE_SIZE, type: 'SQUARE' });
        } else if (char === CHAR_ARC || char === CHAR_INSIDE_ARC) {
          let N = isSolid(rowIndex - 1, colIndex), S = isSolid(rowIndex + 1, colIndex);
          let W = isSolid(rowIndex, colIndex - 1), E = isSolid(rowIndex, colIndex + 1);
          if(char === CHAR_INSIDE_ARC) { N=!N; S=!S; W=!W; E=!E; }
          let orientation: 'NW' | 'NE' | 'SW' | 'SE' = 'NW';
          if (N && W) orientation = 'NW'; else if (N && E) orientation = 'NE'; else if (S && W) orientation = 'SW'; else if (S && E) orientation = 'SE';
          walls.push({ x, y, w: TILE_SIZE, h: TILE_SIZE, type: char === CHAR_ARC ? 'ARC' : 'INSIDE_ARC', orientation });
        } else if (char === CHAR_START) {
          start = { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 };
        } else if (char === CHAR_HOLE) {
          hole = { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 };
        } else if (char === CHAR_ANDROID) {
          decorations.push({ type: 'ANDROID', pos: { x: x + TILE_SIZE/2, y: y + TILE_SIZE/2 }, radius: TILE_SIZE/2, vel: { x: 0, y: 1.2 } });
        } else if (char === CHAR_TREX) {
          decorations.push({ type: 'TREX', pos: { x: x + TILE_SIZE/2, y: y + TILE_SIZE/2 }, radius: TILE_SIZE/2, vel: { x: 1.5, y: 0 } });
        } else if (char === CHAR_BOUNCY_PAD) {
          decorations.push({ type: 'BOUNCY_PAD', pos: { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 }, radius: TILE_SIZE / 2, scale: 1, targetScale: 1 });
        } else if (char === CHAR_BOOST_LEFT || char === CHAR_BOOST_RIGHT || char === CHAR_BOOST_UP || char === CHAR_BOOST_DOWN) {
          let dx = 0, dy = 0;
          if (char === CHAR_BOOST_LEFT) dx = -1; else if (char === CHAR_BOOST_RIGHT) dx = 1; else if (char === CHAR_BOOST_UP) dy = -1; else if (char === CHAR_BOOST_DOWN) dy = 1;
          boostTiles.push({ x, y, dx, dy });
        } else if (char === CHAR_WATER) {
          waterTiles.push({ x, y });
        } else if (char === CHAR_WATER_ARC) {
          const N = isWatery(rowIndex - 1, colIndex), S = isWatery(rowIndex + 1, colIndex), W = isWatery(rowIndex, colIndex - 1), E = isWatery(rowIndex, colIndex + 1);
          let orientation: 'NW' | 'NE' | 'SW' | 'SE' = 'NW';
          if (N && W) orientation = 'NW'; else if (N && E) orientation = 'NE'; else if (S && W) orientation = 'SW'; else if (S && E) orientation = 'SE';
          waterArcs.push({ x, y, orientation });
        } else if (char === CHAR_SAND) {
          sandTiles.push({ x, y });
        } else if (char === CHAR_SAND_ARC) {
          const N = isSandy(rowIndex - 1, colIndex), S = isSandy(rowIndex + 1, colIndex), W = isSandy(rowIndex, colIndex - 1), E = isSandy(rowIndex, colIndex + 1);
          let orientation: 'NW' | 'NE' | 'SW' | 'SE' = 'NW';
          if (N && W) orientation = 'NW'; else if (N && E) orientation = 'NE'; else if (S && W) orientation = 'SW'; else if (S && E) orientation = 'SE';
          sandArcs.push({ x, y, orientation });
        } else if (/[1-9]/.test(char)) {
          portals.push({ x: x + TILE_SIZE/2, y: y + TILE_SIZE/2, id: char });
        }
      }
    });

    wallsRef.current = walls; decorationsRef.current = decorations; boostTilesRef.current = boostTiles;
    waterTilesRef.current = waterTiles; waterArcsRef.current = waterArcs; sandTilesRef.current = sandTiles;
    sandArcsRef.current = sandArcs; portalsRef.current = portals; holeRef.current = hole; startPosRef.current = start;
    
    ballRef.current = {
      pos: { ...start },
      vel: { x: 0, y: 0 },
      radius: BALL_RADIUS,
      isMoving: false,
      sunk: false,
      teleportTimer: 0
    };
  }, [level]);

  const update = useCallback(() => {
    const b = ballRef.current;
    if (!b || b.sunk) return;

    if (portalCooldownRef.current > 0) portalCooldownRef.current--;

    if (b.teleportTimer > 0) {
      b.teleportTimer--;
      if (b.teleportTimer === 0 && pendingTeleportRef.current) {
        playForeground(getPath("/media/audio/sfx/minigolf/outofholehole.mp3"));
        const { targetPortal, exitConfig } = pendingTeleportRef.current;
        b.pos.x = targetPortal.x; b.pos.y = targetPortal.y;
        portalCooldownRef.current = 60;
        if (exitConfig) {
          const currentSpeed = Math.sqrt(b.vel.x**2 + b.vel.y**2), newSpeed = currentSpeed * exitConfig.boost, rad = (exitConfig.angle * Math.PI) / 180;
          b.vel.x = Math.cos(rad) * newSpeed; b.vel.y = Math.sin(rad) * newSpeed;
        }
        b.isMoving = true; pendingTeleportRef.current = null;
      }
      return;
    }

    decorationsRef.current.forEach(d => {
      if (d.type === 'BOUNCY_PAD') {
        if (d.scale !== undefined && d.targetScale !== undefined) {
          d.scale += (d.targetScale - d.scale) * 0.15;
          if (Math.abs(d.scale - 1) < 0.01) d.scale = 1;
        }
      }
      if (d.type === 'TREX' && d.pauseTimer !== undefined && d.pauseTimer > 0) {
        d.pauseTimer--;
        if (d.pauseTimer > 30) { b.pos.x = d.pos.x; b.pos.y = d.pos.y - 10; b.vel.x = 0; b.vel.y = 0; b.isMoving = false; }
        if (d.pauseTimer === 30) { b.vel.y = 25; b.vel.x = d.originalVel!.x * 3; b.isMoving = true; playForeground(getPath("/media/audio/sfx/minigolf/putt.mp3")); }
        if (d.pauseTimer === 0 && d.originalVel) { d.vel = { ...d.originalVel }; d.originalVel = undefined; }
      }
      if (d.vel && (d.vel.x !== 0 || d.vel.y !== 0)) {
        d.pos.x += d.vel.x; d.pos.y += d.vel.y;
        wallsRef.current.forEach(w => {
          const { distSq } = getDistanceSqToRect(d.pos.x, d.pos.y, w.x, w.y, w.w, w.h);
          if (distSq < (d.radius * 0.8) ** 2) {
            if (d.vel!.x !== 0) { d.vel!.x *= -1; d.pos.x += d.vel!.x; }
            if (d.vel!.y !== 0) { d.vel!.y *= -1; d.pos.y += d.vel!.y; }
          }
        });
        const gridH = level.grid.length * TILE_SIZE, gridW = level.grid[0].length * TILE_SIZE;
        if (d.pos.y < 0 || d.pos.y > gridH) d.vel.y *= -1;
        if (d.pos.x < 0 || d.pos.x > gridW) d.vel.x *= -1;
      }
    });

    for (let i = 0; i < decorationsRef.current.length; i++) {
        const d1 = decorationsRef.current[i];
        if (d1.type !== 'ANDROID' || !d1.vel) continue;
        for (let j = i + 1; j < decorationsRef.current.length; j++) {
            const d2 = decorationsRef.current[j];
            if (d2.type !== 'ANDROID' || !d2.vel) continue;
            const dx = d1.pos.x - d2.pos.x, dy = d1.pos.y - d2.pos.y, distSq = dx * dx + dy * dy, minDist = d1.radius + d2.radius;
            if (distSq < minDist * minDist) {
                d1.vel.x *= -1; d1.vel.y *= -1; d2.vel.x *= -1; d2.vel.y *= -1;
                const dist = Math.sqrt(distSq), overlap = (minDist - dist) / 2, nx = dx / (dist || 1), ny = dy / (dist || 1);
                d1.pos.x += nx * overlap; d1.pos.y += ny * overlap; d2.pos.x -= nx * overlap; d2.pos.y -= ny * overlap;
            }
        }
    }

    if (!holeRef.current) return;
    let appliedFriction = FRICTION;
    const gridWidth = level.grid[0].length * TILE_SIZE, gridHeight = level.grid.length * TILE_SIZE;

    decorationsRef.current.forEach(d => {
        if (d.type === 'ANDROID' && d.vel) {
            const dx = b.pos.x - d.pos.x, dy = b.pos.y - d.pos.y, distSq = dx * dx + dy * dy, minDist = b.radius + d.radius * 0.6;
            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq), nx = dx / dist, ny = dy / dist;
                let newX = b.pos.x + nx * (minDist - dist), newY = b.pos.y + ny * (minDist - dist);
                b.pos.x = Math.max(b.radius, Math.min(gridWidth - b.radius, newX));
                b.pos.y = Math.max(b.radius, Math.min(gridHeight - b.radius, newY));
                b.vel.x = d.vel.x * 2; b.vel.y = d.vel.y * 2; b.isMoving = true;
                playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
            }
        }
    });

    if (b.isMoving) {
        const SUBSTEPS = 12;
        let collided = false;
        for (let i = 0; i < SUBSTEPS; i++) {
            b.pos.x += b.vel.x / SUBSTEPS; b.pos.y += b.vel.y / SUBSTEPS;
            if (b.pos.x - b.radius < 0) { b.pos.x = b.radius; b.vel.x = -b.vel.x * 0.8; playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3")); }
            else if (b.pos.x + b.radius > gridWidth) { b.pos.x = gridWidth - b.radius; b.vel.x = -b.vel.x * 0.8; playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3")); }
            if (b.pos.y - b.radius < 0) { b.pos.y = b.radius; b.vel.y = -b.vel.y * 0.8; playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3")); }
            else if (b.pos.y + b.radius > gridHeight) { b.pos.y = gridHeight - b.radius; b.vel.y = -b.vel.y * 0.8; playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3")); }

            const speed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
            sandTilesRef.current.forEach(t => { if (b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE && b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE) appliedFriction = SAND_FRICTION; });
            sandArcsRef.current.forEach(t => { if (isPointInArc(b.pos.x, b.pos.y, t.x, t.y, TILE_SIZE, t.orientation).inBounds) appliedFriction = SAND_FRICTION; });

            if (portalCooldownRef.current === 0) {
              for (const p of portalsRef.current) {
                const dx = b.pos.x - p.x, dy = b.pos.y - p.y, distSq = dx * dx + dy * dy;
                if (distSq < (HOLE_RADIUS * 1.5) ** 2) {
                  const sibling = portalsRef.current.find(sp => sp.id === p.id && sp !== p);
                  if (sibling) {
                    b.teleportTimer = TELEPORT_TIME; b.isMoving = false;
                    pendingTeleportRef.current = { targetPortal: sibling, exitConfig: level.portalExitConfigs ? level.portalExitConfigs[parseInt(p.id) - 1] : undefined };
                    playForeground(getPath("/media/audio/sfx/minigolf/intohole.mp3"));
                    break;
                  }
                }
              }
            }
            if (b.teleportTimer > 0) break;

            const SINK_THRESHOLD = 6.0;
            waterTilesRef.current.forEach(t => { if (b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE && b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE && speed < SINK_THRESHOLD) { b.pos.x = startPosRef.current!.x; b.pos.y = startPosRef.current!.y; b.vel.x = 0; b.vel.y = 0; b.isMoving = false; onStroke(); } });
            waterArcsRef.current.forEach(t => { if (isPointInArc(b.pos.x, b.pos.y, t.x, t.y, TILE_SIZE, t.orientation).inBounds && speed < SINK_THRESHOLD) { b.pos.x = startPosRef.current!.x; b.pos.y = startPosRef.current!.y; b.vel.x = 0; b.vel.y = 0; b.isMoving = false; onStroke(); } });

            boostTilesRef.current.forEach(t => { if (b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE && b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE) { b.vel.x += t.dx * 0.4; b.vel.y += t.dy * 0.4; const speedSq = b.vel.x**2 + b.vel.y**2; if (speedSq > 30 * 30) { const sp = Math.sqrt(speedSq); b.vel.x = (b.vel.x / sp) * 30; b.vel.y = (b.vel.y / sp) * 30; } b.isMoving = true; } });

            wallsRef.current.forEach(w => {
                if (w.type === 'SQUARE' && !collided) {
                  const { distSq, closestX, closestY } = getDistanceSqToRect(b.pos.x, b.pos.y, w.x, w.y, w.w, w.h);
                  if (distSq < b.radius * b.radius && distSq > 0) {
                      const dist = Math.sqrt(distSq), normalX = (b.pos.x - closestX) / dist, normalY = (b.pos.y - closestY) / dist;
                      b.pos.x += normalX * (b.radius - dist); b.pos.y += normalY * (b.radius - dist);
                      playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                      collided = true;
                      if (Math.abs(b.pos.x - closestX) > Math.abs(b.pos.y - closestY)) b.vel.x = -b.vel.x * 0.8; else b.vel.y = -b.vel.y * 0.8;
                  }
                } else if (w.type === 'ARC' || w.type === 'INSIDE_ARC') {
                  const { inBounds, cx, cy } = isPointInArc(b.pos.x, b.pos.y, w.x, w.y, TILE_SIZE, w.orientation!);
                  const dx = b.pos.x - cx, dy = b.pos.y - cy, dist = Math.sqrt(dx * dx + dy * dy), radius = TILE_SIZE;
                  if (w.type === 'ARC' && dist < radius + b.radius && dist > radius - b.radius && inBounds) {
                        const normalX = dx / dist, normalY = dy / dist, overlap = (radius + b.radius) - dist;
                        b.pos.x += normalX * overlap; b.pos.y += normalY * overlap;
                        const dot = b.vel.x * normalX + b.vel.y * normalY;
                        playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                        b.vel.x = (b.vel.x - 2 * dot * normalX) * 0.8; b.vel.y = (b.vel.y - 2 * dot * normalY) * 0.8;
                  } else if (w.type === 'INSIDE_ARC' && dist > radius - b.radius && inBounds) {
                        const normalX = -dx / dist, normalY = -dy / dist, overlap = dist - (radius - b.radius);
                        b.pos.x += normalX * overlap; b.pos.y += normalY * overlap;
                        const dot = b.vel.x * normalX + b.vel.y * normalY;
                        playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                        b.vel.x = (b.vel.x - 2 * dot * normalX) * 0.8; b.vel.y = (b.vel.y - 2 * dot * normalY) * 0.8;
                  }
                }
            });

            decorationsRef.current.forEach(d => {
                const dx = b.pos.x - d.pos.x, dy = b.pos.y - d.pos.y, distSq = dx * dx + dy * dy;
                if (d.type === 'BOUNCY_PAD' && distSq < (b.radius + d.radius) ** 2 && distSq > 0) {
                      const dist = Math.sqrt(distSq), nx = dx / dist, ny = dy / dist;
                      b.vel.x = nx * 18; b.vel.y = ny * 18;
                      b.pos.x = d.pos.x + nx * (b.radius + d.radius + 2); b.pos.y = d.pos.y + ny * (b.radius + d.radius + 2);
                      b.isMoving = true; d.scale = 1.4; d.targetScale = 1;
                      playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                } else if (d.type === 'TREX' && distSq < (b.radius + d.radius * 0.6) ** 2 && distSq > 0 && (!d.pauseTimer || d.pauseTimer === 0)) {
                      d.pauseTimer = 70; d.originalVel = { ...d.vel! }; d.vel = { x: 0, y: 0 };
                      b.pos.x = d.pos.x; b.pos.y = d.pos.y; b.vel.x = 0; b.vel.y = 0; b.isMoving = false;
                      playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                }
            });
        }

        const h = holeRef.current, dx = b.pos.x - h.x, dy = b.pos.y - h.y;
        if (Math.sqrt(dx*dx + dy*dy) < HOLE_RADIUS && Math.sqrt(b.vel.x**2 + b.vel.y**2) < 15) {
            b.pos.x = h.x; b.pos.y = h.y; b.vel.x = 0; b.vel.y = 0; b.isMoving = false; b.sunk = true;
            playForeground(getPath("/media/audio/sfx/minigolf/intohole.mp3")); onHole();
        }
        b.vel.x *= appliedFriction; b.vel.y *= appliedFriction;
        if (Math.abs(b.vel.x) < VELOCITY_THRESHOLD && Math.abs(b.vel.y) < VELOCITY_THRESHOLD) { b.vel.x = 0; b.vel.y = 0; b.isMoving = false; }
    }
  }, [onHole, level, onStroke, playForeground]);

  return { ballRef, wallsRef, decorationsRef, boostTilesRef, waterTilesRef, waterArcsRef, sandTilesRef, sandArcsRef, portalsRef, holeRef, startPosRef, update };
}
