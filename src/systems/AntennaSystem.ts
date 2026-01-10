/**
 * 天线系统
 * Antenna System
 * 
 * 保留结构，移除业务逻辑
 */

import { IAntennaSystem } from '@/types/systems';

export class AntennaSystem implements IAntennaSystem {
  /**
   * 更新天线方向
   */
  updateDirection(angle: number): void {
    // 空实现，保留方法签名
  }

  /**
   * 检测反弹波
   */
  detectReflectedWaves(waves: unknown[], x: number, y: number): unknown[] {
    // 空实现，保留方法签名
    return [];
  }
}
