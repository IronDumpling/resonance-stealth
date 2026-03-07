/**
 * 地图配置
 * Map Configuration
 */

import type { MapConfig } from '@/types/map';
import { CFG } from '@/config/gameConfig';

/**
 * 根据画布尺寸生成默认地图配置
 */
export function getDefaultMapConfig(canvasWidth: number, canvasHeight: number): MapConfig {
  const mapScale = CFG.mapScale ?? 5;
  const mapW = canvasWidth * mapScale;
  const mapH = canvasHeight * mapScale;
  return {
    mapScale,
    playerSpawn: { x: mapW / 2, y: mapH / 2 - 120 },
    fixedRegions: [],
    randomRegions: [
      {
        id: 'main',
        bounds: { x: 0, y: 0, w: mapW, h: mapH },
        numObstacles: typeof CFG.numWalls === 'number' ? CFG.numWalls : 30,
        obstacleSize: { min: 60, max: 100 },
        items: {
          fuel_can_small: 5,
          fuel_can_box: 3,
          repair_kit_small: 6,
          battery_small: 6,
        },
        playerClearRadius: 200,
      },
    ],
  };
}
