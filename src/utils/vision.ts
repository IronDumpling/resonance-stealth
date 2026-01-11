/**
 * 视野相关工具函数
 * Vision Utilities
 */

import { CFG } from '@/config/gameConfig';
import { dist } from './math';
import { rayRectIntersect } from './collision';
import type { IWall } from './collision';

/**
 * 检查目标点是否在玩家的扇形视野内
 */
export function isInCone(
  tx: number,
  ty: number,
  px: number,
  py: number,
  pa: number
): boolean {
  const pViewDist = CFG.pViewDist ?? 280;
  const d = dist(tx, ty, px, py);
  if (d > pViewDist) return false;
  const angle = Math.atan2(ty - py, tx - px);
  let diff = angle - pa;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const pViewAngle = CFG.pViewAngle ?? Math.PI / 2.5;
  return Math.abs(diff) < pViewAngle / 2;
}

/**
 * 获取可见性多边形（视野范围）
 */
export function getVisibilityPolygon(
  px: number,
  py: number,
  angle: number,
  walls: IWall[]
): Array<{ x: number; y: number }> {
  const points = [{ x: px, y: py }];
  const num = 120;
  const pViewAngle = CFG.pViewAngle ?? Math.PI / 2.5;
  const pViewDist = CFG.pViewDist ?? 280;
  const fov = pViewAngle;
  const start = angle - fov / 2;
  const step = fov / num;
  for (let i = 0; i <= num; i++) {
    const th = start + step * i;
    const dx = Math.cos(th);
    const dy = Math.sin(th);
    let cDist = pViewDist;
    for (const w of walls) {
      const d = rayRectIntersect(px, py, dx, dy, w.x, w.y, w.w, w.h);
      if (d !== null && d < cDist) {
        cDist = d;
      }
    }
    points.push({ x: px + dx * cDist, y: py + dy * cDist });
  }
  return points;
}
