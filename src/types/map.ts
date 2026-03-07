/**
 * 地图配置类型
 * Map Configuration Types
 */

import type { ItemType } from './entities';

/** 固定区域内的单个实体（障碍物或物资） */
export type FixedObject =
  | { kind: 'obstacle'; x: number; y: number; width: number; height: number; freq?: number }
  | { kind: 'item'; type: ItemType; x: number; y: number; count?: number };

/** 固定区域（精确放置） */
export interface FixedRegion {
  id: string;
  objects: FixedObject[];
}

/** 随机区域配置（与 FixedRegion 对称） */
export interface RandomRegion {
  id: string;
  bounds: { x: number; y: number; w: number; h: number };
  numObstacles: number;
  obstacleSize?: { min: number; max: number };
  items: Partial<Record<ItemType, number>>;
  playerClearRadius?: number;
  seed?: number;
}

/** 完整地图配置 */
export interface MapConfig {
  mapScale: number;
  playerSpawn: { x: number; y: number };
  fixedRegions: FixedRegion[];
  randomRegions: RandomRegion[];
}

export type { ItemType };
