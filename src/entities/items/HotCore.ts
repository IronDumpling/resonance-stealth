/**
 * 热核心实体
 * Hot Core Entity
 * 
 * 保留结构，移除业务逻辑
 */

import { BaseEntity } from '../Base';
import { IHotCore } from '@/types/entities';

export class HotCore extends BaseEntity implements IHotCore {
  type: 'hot_core' = 'hot_core';
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
