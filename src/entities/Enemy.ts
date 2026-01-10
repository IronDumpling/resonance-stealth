/**
 * 敌人实体
 * Enemy Entity
 * 
 * 保留结构，移除业务逻辑
 */

import { BaseEntity } from './Base';
import { IEnemy } from '@/types/entities';

export class Enemy extends BaseEntity implements IEnemy {
  freq: number = 0;
  en: number = 0;
  isStunned: boolean = false;
  overload: number = 0;
  isDormant: boolean = false;

  constructor(x: number = 0, y: number = 0, freq: number = 0) {
    super(x, y);
    this.freq = freq;
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
