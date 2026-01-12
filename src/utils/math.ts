/**
 * 基础数学工具函数
 * Basic Math Utilities
 */

/**
 * 生成随机数
 */
export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 计算两点间距离
 */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

/**
 * 限制值在范围内
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 线性插值
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
