/**
 * 波纹实体
 * Wave Entity
 * 
 * 保留结构，移除业务逻辑
 */

import { BaseEntity } from './Base';
import { IWave } from '@/types/entities';

export class Wave extends BaseEntity implements IWave {
  r: number = 0; // 半径
  angle: number = 0;
  spread: number = 0;
  freq: number = 0;
  energyPerPoint: number = 0;
  source: 'player' | 'enemy' | 'signal' = 'player';

  constructor(
    x: number = 0,
    y: number = 0,
    r: number = 0,
    angle: number = 0,
    spread: number = 0,
    freq: number = 0,
    source: 'player' | 'enemy' | 'signal' = 'player'
  ) {
    super(x, y);
    this.r = r;
    this.angle = angle;
    this.spread = spread;
    this.freq = freq;
    this.source = source;
  }

  override init(): void {
    // 空实现，保留方法签名
  }

  override update(deltaTime: number): void {
    // 空实现，保留方法签名
  }

  override render(ctx: CanvasRenderingContext2D): void {
    // 空实现，保留方法签名
  }
}
