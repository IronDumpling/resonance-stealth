/**
 * 能量瓶实体
 * Energy Bottle Entity
 * 
 * 保留结构，移除业务逻辑
 */

import { BaseEntity } from '../Base';
import { IEnergyBottle } from '@/types/entities';

export class EnergyBottle extends BaseEntity implements IEnergyBottle {
  type: 'energy' = 'energy';
  visibleTimer: number = 0;
  value: number = 0;
  hintElement: HTMLElement | null = null;

  constructor(x: number = 0, y: number = 0, value: number = 0) {
    super(x, y);
    this.value = value;
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
