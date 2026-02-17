
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LevelData, Vector2 } from '../types';
import { 
  TILE_SIZE, 
  COLORS, 
  CHAR_WALL, 
  CHAR_ARC,
  CHAR_INSIDE_ARC,
  CHAR_VOID,
  HOLE_RADIUS,
  MAX_POWER, 
  POWER_MULTIPLIER, 
  USE_ANDROID_SVG,
  CHAR_WATER_ARC
} from '../constants';
import useAudio from "../hooks/useAudio";
import { getPath } from "../utils/path";
import { ICON_PATHS } from './Icons';
import { PORTRAIT_SCALE_OVERRIDES } from '../levels';
import { useGamePhysics } from '../hooks/useGamePhysics';

interface GameCanvasProps {
  level: LevelData;
  onStroke: () => void;
  onHole: () => void;
}

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

const GameCanvas: React.FC<GameCanvasProps> = ({ level, onStroke, onHole }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureRef = useRef<HTMLImageElement | null>(null);
  const offsetRef = useRef<Vector2>({ x: 0, y: 0 });
  const physicalScaleRef = useRef<number>(1);
  const requestRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<Vector2 | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Vector2 | null>(null);
  
  const { playForeground } = useAudio();
  const { 
    ballRef, wallsRef, decorationsRef, boostTilesRef, 
    waterTilesRef, waterArcsRef, sandTilesRef, sandArcsRef, 
    portalsRef, holeRef, update 
  } = useGamePhysics(level, onStroke, onHole, playForeground);

  useEffect(() => {
    const img = new Image();
    const isHorizontal = level.grid[0].length > level.grid.length;
    img.src = getPath(isHorizontal ? '/media/images/builds/brand-gradient-horizontal.png' : '/media/images/builds/brand-gradient-vertical.png');
    img.onload = () => { textureRef.current = img; };
  }, [level]);

  const calculateLayout = useCallback((width: number, height: number) => {
    if (width === 0 || height === 0) return { x: 0, y: 0 };
    const dpr = window.devicePixelRatio || 1;
    const gridWidth = level.grid[0].length * TILE_SIZE, gridHeight = level.grid.length * TILE_SIZE;
    const isPortrait = height > width && width < 640;
    
    if (isPortrait) {
      let baseScale = Math.min(width / gridWidth, height / gridHeight);
      const scaleOverride = PORTRAIT_SCALE_OVERRIDES[level.id];
      if (scaleOverride !== undefined) baseScale *= scaleOverride;
      const physicalTileSize = Math.max(1, Math.ceil(TILE_SIZE * baseScale * dpr));
      physicalScaleRef.current = physicalTileSize / TILE_SIZE;
      return { x: Math.floor((width - (gridWidth * (physicalTileSize / (TILE_SIZE * dpr)))) / 2), y: Math.floor((height - (gridHeight * (physicalTileSize / (TILE_SIZE * dpr)))) / 2) };
    } else {
      const baseScale = Math.min(width / gridWidth, (height - 264) / gridHeight, 1);
      const physicalTileSize = Math.max(1, Math.floor(TILE_SIZE * baseScale * dpr));
      physicalScaleRef.current = physicalTileSize / TILE_SIZE;
      return { x: Math.floor((width - (gridWidth * (physicalTileSize / (TILE_SIZE * dpr)))) / 2), y: Math.floor((height - (gridHeight * (physicalTileSize / (TILE_SIZE * dpr)))) / 2) };
    }
  }, [level]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        offsetRef.current = calculateLayout(width, height);
      }
    });
    resizeObserver.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
    offsetRef.current = calculateLayout(rect.width, rect.height);
    return () => resizeObserver.disconnect();
  }, [calculateLayout]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const cssScale = physicalScaleRef.current / dpr;
    return { x: (clientX - rect.left - offsetRef.current.x) / cssScale, y: (clientY - rect.top - offsetRef.current.y) / cssScale };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ballRef.current || ballRef.current.sunk || ballRef.current.teleportTimer > 0) return;
    const touch = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    setIsAiming(true); setDragStart({ x, y }); setDragCurrent({ x, y });
    playForeground(getPath("/media/audio/sfx/global/buttonclick.mp3"));
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isAiming || !dragStart) return;
    const touch = 'touches' in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    setDragCurrent({ x, y });
  }, [isAiming, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (!isAiming || !dragStart || !dragCurrent || !ballRef.current) { setIsAiming(false); return; }
    const dx = dragStart.x - dragCurrent.x, dy = dragStart.y - dragCurrent.y, power = Math.sqrt(dx*dx + dy*dy) * POWER_MULTIPLIER;
    if (power > 1) { 
        const angle = Math.atan2(dy, dx), cappedPower = Math.min(power, MAX_POWER);
        ballRef.current.vel.x = Math.cos(angle) * cappedPower; ballRef.current.vel.y = Math.sin(angle) * cappedPower;
        ballRef.current.isMoving = true; playForeground(getPath("/media/audio/sfx/minigolf/putt.mp3")); onStroke();
    }
    setIsAiming(false); setDragStart(null); setDragCurrent(null);
  }, [isAiming, dragStart, dragCurrent, onStroke, ballRef, playForeground]);

  useEffect(() => {
    if (isAiming) {
        window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove); window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove); window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isAiming, handleMouseMove, handleMouseUp]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ballRef.current || !holeRef.current || dimensions.width === 0) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(dimensions.width * dpr); canvas.height = Math.floor(dimensions.height * dpr);

    const isFloor = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char !== CHAR_VOID && char !== CHAR_WALL && char !== CHAR_ARC && char !== CHAR_INSIDE_ARC;
    };

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(Math.floor(offsetRef.current.x * dpr), Math.floor(offsetRef.current.y * dpr));
    const finalScale = physicalScaleRef.current; ctx.scale(finalScale, finalScale);

    ctx.save();
    ctx.beginPath();
    level.grid.forEach((row, r) => { row.split('').forEach((char, c) => { if (char !== CHAR_VOID && char !== CHAR_WALL && char !== CHAR_ARC && char !== CHAR_INSIDE_ARC && char !== CHAR_WATER_ARC ) ctx.rect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE); }); });
    wallsRef.current.forEach(w => {
        if (w.type === 'INSIDE_ARC') {
          let cx = w.x, cy = w.y, startAngle = 0;
          if (w.orientation === 'NE') { cx = w.x + w.w; startAngle = Math.PI/2; } else if (w.orientation === 'SW') { cy = w.y + w.h; startAngle = 1.5*Math.PI; } else if (w.orientation === 'SE') { cx = w.x + w.w; cy = w.y + w.h; startAngle = Math.PI; }
          ctx.moveTo(cx, cy); ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2); ctx.lineTo(cx, cy);
        } else if (w.type === 'ARC') {
          const r = Math.floor(w.y / TILE_SIZE), c = Math.floor(w.x / TILE_SIZE);
          if (isFloor(r-1, c) || isFloor(r+1, c) || isFloor(r, c-1) || isFloor(r, c+1)) ctx.rect(w.x, w.y, w.w, w.h);
        }
    });
    ctx.clip();
    if (textureRef.current) ctx.drawImage(textureRef.current, 0, 0, level.grid[0].length * TILE_SIZE, level.grid.length * TILE_SIZE);
    else { ctx.fillStyle = COLORS.GRASS_LIGHT; ctx.fillRect(0, 0, level.grid[0].length * TILE_SIZE, level.grid.length * TILE_SIZE); }
    ctx.restore();

    sandTilesRef.current.forEach(t => { ctx.fillStyle = COLORS.SAND; ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE); });
    sandArcsRef.current.forEach(t => {
      ctx.fillStyle = COLORS.SAND; let cx = t.x, cy = t.y, startAngle = 0;
      if (t.orientation === 'NE') { cx = t.x + TILE_SIZE; startAngle = Math.PI/2; } else if (t.orientation === 'SW') { cy = t.y + TILE_SIZE; startAngle = 1.5*Math.PI; } else if (t.orientation === 'SE') { cx = t.x + TILE_SIZE; cy = t.y + TILE_SIZE; startAngle = Math.PI; }
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2); ctx.closePath(); ctx.fill();
    });

    waterTilesRef.current.forEach(t => { ctx.fillStyle = COLORS.WATER; ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE); });
    waterArcsRef.current.forEach(t => {
      ctx.fillStyle = COLORS.WATER; let cx = t.x, cy = t.y, startAngle = 0;
      if (t.orientation === 'NE') { cx = t.x + TILE_SIZE; startAngle = Math.PI/2; } else if (t.orientation === 'SW') { cy = t.y + TILE_SIZE; startAngle = 1.5*Math.PI; } else if (t.orientation === 'SE') { cx = t.x + TILE_SIZE; cy = t.y + TILE_SIZE; startAngle = Math.PI; }
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#FFFFFF44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, TILE_SIZE * 0.8, startAngle, startAngle + Math.PI/2); ctx.stroke();
    });

    portalsRef.current.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, HOLE_RADIUS, 0, Math.PI * 2); ctx.fillStyle = '#111111'; ctx.fill(); ctx.strokeStyle = '#4B008288'; ctx.lineWidth = 1; ctx.stroke(); });

    boostTilesRef.current.forEach(t => {
      ctx.fillStyle = COLORS.BOOST; ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
      ctx.save(); ctx.translate(t.x + TILE_SIZE / 2, t.y + TILE_SIZE / 2);
      if (t.dx === 1) ctx.rotate(0); else if (t.dx === -1) ctx.rotate(Math.PI); else if (t.dy === -1) ctx.rotate(-Math.PI / 2); else if (t.dy === 1) ctx.rotate(Math.PI / 2);
      ctx.strokeStyle = '#FFFFFF88'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) { const ox = -5 + i * 10; ctx.beginPath(); ctx.moveTo(ox - 5, -8); ctx.lineTo(ox + 5, 0); ctx.lineTo(ox - 5, 8); ctx.stroke(); }
      ctx.restore();
    });

    wallsRef.current.forEach(w => {
        if (w.type === 'ARC') {
          let cx = w.x, cy = w.y, startAngle = 0;
          if (w.orientation === 'NE') { cx = w.x + w.w; startAngle = Math.PI/2; } else if (w.orientation === 'SW') { cy = w.y + w.h; startAngle = 1.5*Math.PI; } else if (w.orientation === 'SE') { cx = w.x + w.w; cy = w.y + w.h; startAngle = Math.PI; }
          ctx.fillStyle = COLORS.GRASS_DARK; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2); ctx.closePath(); ctx.fill();
        } else if (w.type === 'SQUARE') {
          ctx.fillStyle = COLORS.GRASS_DARK; ctx.fillRect(w.x, w.y, w.w, w.h);
        }
    });

    decorationsRef.current.forEach(d => {
        if (d.type === 'ANDROID') {
            if (USE_ANDROID_SVG) {
                ctx.save(); ctx.translate(d.pos.x-13, d.pos.y-15); ctx.scale(1.5,1.5);
                ctx.fillStyle = COLORS.ANDROID; ctx.fill(new Path2D(ICON_PATHS.android)); ctx.restore();
            } else {
                ctx.fillStyle = COLORS.ANDROID; ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y - 5, 12, Math.PI, 0); ctx.fill();
                ctx.fillStyle = COLORS.GRASS_LIGHT; ctx.beginPath(); ctx.arc(d.pos.x - 5, d.pos.y - 10, 2, 0, Math.PI * 2); ctx.arc(d.pos.x + 5, d.pos.y - 10, 2, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = COLORS.ANDROID; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.pos.x - 8, d.pos.y - 15); ctx.lineTo(d.pos.x - 12, d.pos.y - 22); ctx.moveTo(d.pos.x + 8, d.pos.y - 15); ctx.lineTo(d.pos.x + 12, d.pos.y - 22); ctx.stroke();
                ctx.beginPath(); ctx.rect(d.pos.x - 12, d.pos.y - 5, 24, 20); ctx.fill();
            }
        } else if (d.type === 'TREX') {
            const isFlipped = (d.vel && d.vel.x < 0) || (d.originalVel && d.originalVel.x < 0);
            ctx.save(); ctx.translate(d.pos.x+2, d.pos.y); if (isFlipped) ctx.scale(-1, 1);
            if (USE_ANDROID_SVG) { ctx.scale(0.4,0.4); ctx.translate(-30,-35); ctx.fillStyle = COLORS.ANDROID; ctx.fill(new Path2D(ICON_PATHS.dino)); } 
            else { 
                ctx.fillStyle = COLORS.DINO; ctx.fillRect(-10, -5, 15, 15); ctx.fillRect(-5, -15, 15, 10); ctx.fillRect(-8, 10, 4, 6); ctx.fillRect(-2, 10, 4, 6);
                ctx.fillStyle = '#FFF'; ctx.fillRect(2, -12, 2, 2); ctx.fillStyle = COLORS.DINO; ctx.fillRect(-14, 0, 4, 4);
                if (d.pauseTimer && d.pauseTimer > 30) { ctx.fillStyle = '#FF4444'; ctx.beginPath(); ctx.arc(0, -20, 3, 0, Math.PI * 2); ctx.fill(); }
            }
            ctx.restore();
        } else if (d.type === 'BOUNCY_PAD') {
            ctx.save(); ctx.translate(d.pos.x, d.pos.y); ctx.scale(d.scale || 1, d.scale || 1);
            ctx.beginPath(); ctx.ellipse(0, 3, 18, 18, 0, 0, Math.PI * 2); ctx.fillStyle = COLORS.BOUNCY_PAD_SHADOW; ctx.fill();
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fillStyle = COLORS.WHITE; ctx.fill(); ctx.restore();
        }
    });

    const h = holeRef.current, b = ballRef.current;
    ctx.beginPath(); ctx.arc(h.x, h.y, HOLE_RADIUS, 0, Math.PI * 2); ctx.fillStyle = COLORS.BLACK; ctx.fill();
    if (!b.sunk && b.teleportTimer === 0) {
        ctx.beginPath(); ctx.ellipse(b.pos.x + 3, b.pos.y + 7, b.radius, b.radius * 0.6, 0, 0, Math.PI * 2); ctx.fillStyle = COLORS.SHADOW; ctx.fill();
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.fillStyle = COLORS.BALL_WHITE; ctx.fill();
    }

    if (isAiming && dragStart && dragCurrent && !b.sunk && b.teleportTimer === 0) {
        const dx = dragStart.x - dragCurrent.x, dy = dragStart.y - dragCurrent.y, rawLen = Math.sqrt(dx*dx + dy*dy);
        if (rawLen > 5) {
            const angle = Math.atan2(dy, dx), powerRatio = Math.min(rawLen, 150) / 150, arcRadius = 14 / finalScale;
            const factor = Math.min(rawLen, 150) / (rawLen || 1), arcX = b.pos.x + Math.cos(angle) * arcRadius, arcY = b.pos.y + Math.sin(angle) * arcRadius;
            const endX = arcX + dx * factor, endY = arcY + dy * factor;
            ctx.beginPath(); ctx.moveTo(arcX, arcY); ctx.lineTo(endX, endY); ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.5 / finalScale; ctx.setLineDash([6 / finalScale, 6 / finalScale]); ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(endX, endY, 3 / finalScale, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill();
            ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, arcRadius, angle - powerRatio * Math.PI, angle + powerRatio * Math.PI); ctx.strokeStyle = COLORS.WHITE; ctx.lineWidth = 1.5 / finalScale; ctx.lineCap = 'round'; ctx.stroke();
        }
    }

    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x, h.y - 40); ctx.strokeStyle = COLORS.WHITE; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h.x + 2, h.y - 40); ctx.lineTo(h.x + 18, h.y - 32); ctx.lineTo(h.x + 2, h.y - 24); ctx.closePath(); ctx.fillStyle = COLORS.FLAG; ctx.fill(); ctx.strokeStyle = COLORS.WHITE; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }, [isAiming, dragStart, dragCurrent, level, dimensions, ballRef, holeRef, wallsRef, decorationsRef, boostTilesRef, waterTilesRef, waterArcsRef, sandTilesRef, sandArcsRef, portalsRef]);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= FRAME_DURATION) {
        lastFrameTimeRef.current = timestamp - ((timestamp - lastFrameTimeRef.current) % FRAME_DURATION);
        update(); render();
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update, render]);

  return (
    <div ref={containerRef} className="w-full h-[calc(100%-100px)] fixed top-0 left-0 overflow-hidden bg-transparent">
      <canvas 
        ref={canvasRef} style={{width: '100%', height: '100%', display: 'block' }}
        className="cursor-crosshair touch-none select-none" 
        onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}
      />
    </div>
  );
};

export default GameCanvas;
