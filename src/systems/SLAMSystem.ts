/**
 * SLAM系统
 * SLAM System
 * 
 * 保留结构，移除业务逻辑
 */

import { ISLAMSystem } from '@/types/systems';

export class SLAMSystem implements ISLAMSystem {
  /**
   * 从反弹波添加点
   */
  addPointsFromReflections(reflections: unknown[]): void {
    // 空实现，保留方法签名
  }

  /**
   * 获取所有点
   */
  getPoints(): unknown[] {
    // 空实现，保留方法签名
    return [];
  }
}
