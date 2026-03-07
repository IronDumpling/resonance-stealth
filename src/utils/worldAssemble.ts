/**
 * 地图组装
 * World Assembly
 *
 * 根据 MapConfig 组合固定区域与随机区域，产出完整地图。
 */

import type { IObstacle, IGroundItem } from '@/types/entities';
import type { MapConfig, FixedObject } from '@/types/map';
import { generateRandomRegion } from './regionGen';

/**
 * 将 FixedObject 转为 IObstacle 或 IGroundItem
 */
function convertFixedObject(obj: FixedObject): IObstacle | IGroundItem {
  if (obj.kind === 'obstacle') {
    return {
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      freq: obj.freq ?? 100,
    };
  }
  return {
    type: obj.type!,
    x: obj.x,
    y: obj.y,
    count: obj.count ?? 1,
    visibleTimer: 0,
  };
}

/**
 * 根据 MapConfig 组装完整地图
 */
export function assembleMapFromConfig(
  config: MapConfig,
  _canvasWidth: number,
  _canvasHeight: number
): { obstacles: IObstacle[]; groundItems: IGroundItem[] } {
  const obstacles: IObstacle[] = [];
  const groundItems: IGroundItem[] = [];

  const playerSpawn = config.playerSpawn;
  const playerClearRadius = 200;

  // 固定区域
  for (const region of config.fixedRegions) {
    for (const obj of region.objects) {
      const converted = convertFixedObject(obj);
      if (obj.kind === 'obstacle') {
        obstacles.push(converted as IObstacle);
      } else {
        groundItems.push(converted as IGroundItem);
      }
    }
  }

  // 随机区域
  for (const region of config.randomRegions) {
    const { obstacles: ro, groundItems: rg } = generateRandomRegion({
      bounds: region.bounds,
      playerSpawn,
      playerClearRadius: region.playerClearRadius ?? playerClearRadius,
      numObstacles: region.numObstacles,
      obstacleSize: region.obstacleSize,
      items: region.items,
      seed: region.seed ?? Date.now(),
    });
    obstacles.push(...ro);
    groundItems.push(...rg);
  }

  return { obstacles, groundItems };
}
