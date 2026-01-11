/**
 * 坐标转换工具函数
 * Coordinate Transformation Utilities
 */

import { CFG } from '@/config/gameConfig';

/**
 * 世界坐标转屏幕坐标（用于UI定位）
 */
export function worldToScreen(
  wx: number,
  wy: number,
  cameraX: number,
  cameraY: number,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const scale = CFG.cameraFOV ?? 2.0;
  const screenX = (wx - cameraX) * scale + canvas.width / 2;
  const screenY = (wy - cameraY) * scale + canvas.height / 2;
  
  // 考虑canvas在页面中的偏移量（工作站布局中canvas不是全屏）
  const canvasRect = canvas.getBoundingClientRect();
  const pageX = screenX + canvasRect.left;
  const pageY = screenY + canvasRect.top;
  
  return { x: pageX, y: pageY };
}

/**
 * 屏幕坐标转世界坐标（用于鼠标交互）
 */
export function screenToWorld(
  sx: number,
  sy: number,
  cameraX: number,
  cameraY: number,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const scale = CFG.cameraFOV ?? 2.0;
  const worldX = (sx - canvas.width / 2) / scale + cameraX;
  const worldY = (sy - canvas.height / 2) / scale + cameraY;
  return { x: worldX, y: worldY };
}
