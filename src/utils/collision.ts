/**
 * 碰撞检测工具函数
 * Collision Detection Utilities
 */

import { CFG } from '@/config/gameConfig';
import { dist } from './math';

export interface IWall {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 检查点是否与墙壁碰撞
 */
export function checkWall(
  x: number,
  y: number,
  walls: IWall[],
  canvas: HTMLCanvasElement
): boolean {
  // 使用扩大的地图尺寸进行边界检测
  const mapScale = CFG.mapScale ?? 5.5;
  const mapWidth = canvas.width * mapScale;
  const mapHeight = canvas.height * mapScale;
  if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) return true;
  for (const w of walls) {
    if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
  }
  return false;
}

/**
 * 检查两点间是否有视线（不被墙壁阻挡）
 */
export function checkLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  walls: IWall[]
): boolean {
  const steps = Math.ceil(dist(x1, y1, x2, y2) / 10);
  const dx = (x2 - x1) / steps;
  const dy = (y2 - y1) / steps;
  for (let i = 1; i < steps; i++) {
    const cx = x1 + dx * i;
    const cy = y1 + dy * i;
    for (const w of walls) {
      if (cx > w.x && cx < w.x + w.w && cy > w.y && cy < w.y + w.h) return false;
    }
  }
  return true;
}

/**
 * 射线与矩形相交检测
 */
export function rayRectIntersect(
  rx: number,
  ry: number,
  rdx: number,
  rdy: number,
  wx: number,
  wy: number,
  ww: number,
  wh: number
): number | null {
  let tMin = 0;
  let tMax = Infinity;
  if (Math.abs(rdx) < 1e-5) {
    if (rx < wx || rx > wx + ww) return null;
  } else {
    const t1 = (wx - rx) / rdx;
    const t2 = (wx + ww - rx) / rdx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (Math.abs(rdy) < 1e-5) {
    if (ry < wy || ry > wy + wh) return null;
  } else {
    const t1 = (wy - ry) / rdy;
    const t2 = (wy + wh - ry) / rdy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (tMin > tMax || tMax < 0) return null;
  return tMin > 0 ? tMin : tMax > 0 ? tMax : null;
}
