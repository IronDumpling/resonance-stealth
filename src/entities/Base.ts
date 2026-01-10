/**
 * 实体基类
 * Base Entity Class
 * 
 * 保留生命周期方法结构，移除业务逻辑
 */

import { IBaseEntity } from '@/types/entities';

export abstract class BaseEntity implements IBaseEntity {
  x: number = 0;
  y: number = 0;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * 初始化实体
   */
  init(): void {
    // 空实现，保留方法签名
  }

  /**
   * 更新实体状态
   * @param deltaTime 时间差（秒）
   */
  update(deltaTime: number): void {
    // 空实现，保留方法签名
  }

  /**
   * 渲染实体
   * @param ctx Canvas 2D 上下文
   */
  render(ctx: CanvasRenderingContext2D): void {
    // 空实现，保留方法签名
  }
}
