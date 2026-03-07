/**
 * 随机区域生成
 * Region Generation
 *
 * 在给定矩形区域内随机生成障碍物与物资。
 */

import type { IObstacle, IGroundItem } from '@/types/entities';
import type { ItemType } from '@/types/entities';

/** 简易 seeded random（基于 seed 的伪随机，便于调试） */
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export interface RegionGenParams {
  bounds: { x: number; y: number; w: number; h: number };
  playerSpawn: { x: number; y: number };
  playerClearRadius: number;
  numObstacles: number;
  obstacleSize?: { min: number; max: number };
  items: Partial<Record<ItemType, number>>;
  seed: number;
}

const DEFAULT_OBSTACLE_SIZE = { min: 60, max: 100 };
const ITEM_SIZE = 24;
const ITEM_MIN_DIST = 36;

/**
 * 在给定区域内随机生成障碍物与物资
 */
export function generateRandomRegion(params: RegionGenParams): {
  obstacles: IObstacle[];
  groundItems: IGroundItem[];
} {
  const {
    bounds,
    playerSpawn,
    playerClearRadius,
    numObstacles,
    obstacleSize = DEFAULT_OBSTACLE_SIZE,
    items,
    seed,
  } = params;

  const rng = seededRandom(seed);
  const obstacles: IObstacle[] = [];
  const groundItems: IGroundItem[] = [];

  const isInClearZone = (x: number, y: number, w: number, h: number) => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const dist = Math.hypot(cx - playerSpawn.x, cy - playerSpawn.y);
    return dist < playerClearRadius + Math.max(w, h) / 2;
  };

  // 展开 items 为 [type, count][] 并 flatten 成按类型重复的数组
  const itemTypes: ItemType[] = [];
  for (const [type, count] of Object.entries(items)) {
    const n = count ?? 0;
    for (let i = 0; i < n; i++) {
      itemTypes.push(type as ItemType);
    }
  }

  const { x: bx, y: by, w: bw, h: bh } = bounds;

  // 生成障碍物（方形，边长 min–max）
  for (let i = 0; i < numObstacles; i++) {
    const sizeRange = obstacleSize.max - obstacleSize.min + 1;
    const size = obstacleSize.min + Math.floor(rng() * sizeRange);
    const width = size;
    const height = size;
    const x = bx + Math.floor(rng() * Math.max(0, bw - width));
    const y = by + Math.floor(rng() * Math.max(0, bh - height));

    if (isInClearZone(x, y, width, height)) continue;

    let overlap = false;
    for (const obs of obstacles) {
      if (x < obs.x + obs.width && x + width > obs.x && y < obs.y + obs.height && y + height > obs.y) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    obstacles.push({
      x,
      y,
      width,
      height,
      freq: 100,
    });
  }

  // 生成物资点
  for (const type of itemTypes) {
    const x = bx + Math.floor(rng() * Math.max(0, bw - ITEM_SIZE));
    const y = by + Math.floor(rng() * Math.max(0, bh - ITEM_SIZE));

    if (isInClearZone(x, y, ITEM_SIZE, ITEM_SIZE)) continue;

    let overlap = false;
    for (const obs of obstacles) {
      if (x < obs.x + obs.width && x + ITEM_SIZE > obs.x && y < obs.y + obs.height && y + ITEM_SIZE > obs.y) {
        overlap = true;
        break;
      }
    }
    for (const item of groundItems) {
      if (Math.hypot(item.x - (x + ITEM_SIZE / 2), item.y - (y + ITEM_SIZE / 2)) < ITEM_MIN_DIST) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    groundItems.push({
      type,
      x: x + ITEM_SIZE / 2,
      y: y + ITEM_SIZE / 2,
      count: 1,
      visibleTimer: 0,
    });
  }

  return { obstacles, groundItems };
}
