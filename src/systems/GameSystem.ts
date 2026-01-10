/**
 * 游戏主系统
 * Game System
 * 
 * 保留结构，移除业务逻辑
 */

import { IGameSystem } from '@/types/systems';

export class GameSystem implements IGameSystem {
  /**
   * 初始化游戏系统
   */
  init(): void {
    // 空实现，保留方法签名
  }

  /**
   * 更新游戏系统
   */
  update(deltaTime: number): void {
    // 空实现，保留方法签名
  }
}
