/**
 * 障碍物实体（原Wall）
 * Obstacle Entity (formerly Wall)
 */

import { BaseEntity } from './Base';
import { IObstacle } from '@/types/entities';
import { CFG } from '@/config/gameConfig';
import { rand } from '@/utils';

export class Obstacle extends BaseEntity implements IObstacle {
  freq: number = 0;
  width: number = 0;
  height: number = 0;
  blockFreq: number = 0; // 阻挡频率（高于此频率的wave会被反弹）
  color: string = '#888';
  absorbedEnergy: number = 0; // 吸收的能量（用于显示）

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 0,
    height: number = 0,
    blockFreq: number = 0,
    color?: string
  ) {
    super(x, y);
    this.width = width;
    this.height = height;
    this.freq = blockFreq;
    this.blockFreq = blockFreq;
    this.color = color || this.getColorForFreq(blockFreq);
  }

  /**
   * 根据频率获取颜色
   */
  private getColorForFreq(freq: number): string {
    const wallColors = CFG.wallColors;
    if (wallColors && typeof wallColors === 'object') {
      return wallColors[freq as keyof typeof wallColors] || '#888';
    }
    return '#888';
  }

  override init(): void {
    // 障碍物初始化逻辑（如果需要）
  }

  override update(_deltaTime: number): void {
    // 障碍物更新逻辑（如果需要）
    // 可以在这里处理能量衰减等
  }

  override render(_ctx: CanvasRenderingContext2D): void {
    // 障碍物渲染逻辑
    // 注意：实际渲染通常由渲染器统一处理，这里保留接口
  }

  /**
   * 检查点是否在障碍物内
   */
  containsPoint(px: number, py: number): boolean {
    return (
      px > this.x &&
      px < this.x + this.width &&
      py > this.y &&
      py < this.y + this.height
    );
  }

  /**
   * 检查是否与其他障碍物重叠
   */
  overlaps(other: Obstacle, margin: number = 20): boolean {
    return (
      this.x < other.x + other.width + margin &&
      this.x + this.width + margin > other.x &&
      this.y < other.y + other.height + margin &&
      this.y + this.height + margin > other.y
    );
  }
}

/**
 * 创建障碍物
 */
export function createObstacle(
  x: number,
  y: number,
  width: number,
  height: number,
  blockFreq: number,
  color?: string
): Obstacle {
  return new Obstacle(x, y, width, height, blockFreq, color);
}

/**
 * 生成随机障碍物
 */
export function spawnRandomObstacle(
  mapWidth: number,
  mapHeight: number,
  existingObstacles: Obstacle[],
  spawnCenterX?: number,
  spawnCenterY?: number,
  spawnRadius?: number
): Obstacle | null {
  const wallFreqs = CFG.wallFreqs;
  const wallColors = CFG.wallColors;

  if (!Array.isArray(wallFreqs) || wallFreqs.length === 0) {
    return null;
  }

  const w = rand(80, 200);
  const h = rand(80, 200);
  const x = rand(100, mapWidth - 200);
  const y = rand(100, mapHeight - 200);

  // 检查与其他障碍物重叠
  let overlap = false;
  const tempObstacle = new Obstacle(x, y, w, h, 0);
  for (const other of existingObstacles) {
    if (tempObstacle.overlaps(other)) {
      overlap = true;
      break;
    }
  }

  // 检查与出生点重叠
  if (!overlap && spawnCenterX !== undefined && spawnCenterY !== undefined) {
    const radius = spawnRadius || 150;
    if (
      x < spawnCenterX + radius &&
      x + w > spawnCenterX - radius &&
      y < spawnCenterY + radius &&
      y + h > spawnCenterY - radius
    ) {
      overlap = true;
    }
  }

  if (overlap) {
    return null;
  }

  const blockFreq =
    wallFreqs[Math.floor(Math.random() * wallFreqs.length)];
  const color =
    wallColors && typeof wallColors === 'object'
      ? wallColors[blockFreq as keyof typeof wallColors]
      : '#888';

  return new Obstacle(x, y, w, h, blockFreq, color);
}

/**
 * 生成边界障碍物
 */
export function spawnBorderObstacles(
  mapWidth: number,
  mapHeight: number
): Obstacle[] {
  const borderThickness = 60;
  const wallFreqs = CFG.wallFreqs;
  const wallColors = CFG.wallColors;

  if (!Array.isArray(wallFreqs) || wallFreqs.length === 0) {
    return [];
  }

  const borderFreq = wallFreqs[wallFreqs.length - 1]; // 使用最高频率作为边界阻挡
  const borderColor =
    wallColors && typeof wallColors === 'object'
      ? wallColors[borderFreq as keyof typeof wallColors]
      : '#888';

  const obstacles: Obstacle[] = [];

  // 上边界
  obstacles.push(
    new Obstacle(
      -borderThickness,
      -borderThickness,
      mapWidth + borderThickness * 2,
      borderThickness,
      borderFreq,
      borderColor
    )
  );

  // 下边界
  obstacles.push(
    new Obstacle(
      -borderThickness,
      mapHeight,
      mapWidth + borderThickness * 2,
      borderThickness,
      borderFreq,
      borderColor
    )
  );

  // 左边界
  obstacles.push(
    new Obstacle(
      -borderThickness,
      0,
      borderThickness,
      mapHeight,
      borderFreq,
      borderColor
    )
  );

  // 右边界
  obstacles.push(
    new Obstacle(
      mapWidth,
      0,
      borderThickness,
      mapHeight,
      borderFreq,
      borderColor
    )
  );

  return obstacles;
}
