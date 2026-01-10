/**
 * 障碍物实体（原Wall）
 * Obstacle Entity (formerly Wall)
 * 
 * 保留结构，移除业务逻辑
 */

import { BaseEntity } from './Base';
import { IObstacle } from '@/types/entities';

export class Obstacle extends BaseEntity implements IObstacle {
  freq: number = 0;
  width: number = 0;
  height: number = 0;
  blockFreq: number = 0; // 阻挡频率
  color: string = '#888';
  absorbedEnergy: number = 0;

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 0,
    height: number = 0,
    freq: number = 0
  ) {
    super(x, y);
    this.width = width;
    this.height = height;
    this.freq = freq;
    this.blockFreq = freq;
  }

  override init(): void {
    // 空实现，保留方法签名
  }

  override update(_deltaTime: number): void {
    // 空实现，保留方法签名
  }

  override render(_ctx: CanvasRenderingContext2D): void {
    // 空实现，保留方法签名
  }
}
