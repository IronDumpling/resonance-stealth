/**
 * 随机地图生成
 * World Generation
 *
 * 生成障碍物与物资点，用于声纳屏幕显示。
 */

import type { IObstacle, IGroundItem } from '@/types/entities';
import type { ItemType } from '@/types/entities';
import { CFG } from '@/config/gameConfig';

const ITEM_TYPES: ItemType[] = ['fuel_can_small', 'fuel_can_box', 'repair_kit_small', 'battery_small'];

/** 简易 seeded random（基于 seed 的伪随机，便于调试） */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export interface WorldGenParams {
  canvasWidth: number;
  canvasHeight: number;
  mapScale: number;
  playerX: number;
  playerY: number;
  /** 玩家周围不生成实体的半径 */
  playerClearRadius: number;
  numObstacles: number;
  numItems: number;
  seed?: number;
}

const DEFAULT_PARAMS = {
  playerClearRadius: 200,
  numObstacles: 30,
  numItems: 20,
};

/**
 * 生成障碍物与物资
 */
export function generateWorld(params: Partial<WorldGenParams> & { canvasWidth: number; canvasHeight: number }) {
  const mapScale = params.mapScale ?? CFG.mapScale ?? 5;
  const mapW = params.canvasWidth * mapScale;
  const mapH = params.canvasHeight * mapScale;
  const playerX = params.playerX ?? mapW / 2;
  const playerY = params.playerY ?? mapH / 2 - 120;
  const clearRadius = params.playerClearRadius ?? DEFAULT_PARAMS.playerClearRadius;
  const numObstacles = params.numObstacles ?? DEFAULT_PARAMS.numObstacles;
  const numItems = params.numItems ?? DEFAULT_PARAMS.numItems;
  const seed = params.seed ?? Date.now();

  const rng = seededRandom(seed);
  const obstacles: IObstacle[] = [];
  const groundItems: IGroundItem[] = [];

  const isInClearZone = (x: number, y: number, w: number, h: number) => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const dist = Math.hypot(cx - playerX, cy - playerY);
    return dist < clearRadius + Math.max(w, h) / 2;
  };

  // 生成障碍物
  for (let i = 0; i < numObstacles; i++) {
    const width = 40 + Math.floor(rng() * 80);
    const height = 40 + Math.floor(rng() * 80);
    let x = Math.floor(rng() * (mapW - width));
    let y = Math.floor(rng() * (mapH - height));

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
  for (let i = 0; i < numItems; i++) {
    const type = ITEM_TYPES[Math.floor(rng() * ITEM_TYPES.length)];
    const size = 40;
    let x = Math.floor(rng() * (mapW - size));
    let y = Math.floor(rng() * (mapH - size));

    if (isInClearZone(x, y, size, size)) continue;

    let overlap = false;
    for (const obs of obstacles) {
      if (x < obs.x + obs.width && x + size > obs.x && y < obs.y + obs.height && y + size > obs.y) {
        overlap = true;
        break;
      }
    }
    for (const item of groundItems) {
      if (Math.hypot(item.x - x, item.y - y) < 60) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    groundItems.push({
      type,
      x: x + size / 2,
      y: y + size / 2,
      count: 1,
      visibleTimer: 0,
    });
  }

  return { obstacles, groundItems };
}
