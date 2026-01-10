/**
 * 无线电系统
 * Radio System
 * 
 * 保留结构，移除业务逻辑
 */

import { IRadioSystem } from '@/types/systems';

export class RadioSystem implements IRadioSystem {
  /**
   * 更新无线电系统
   */
  update(deltaTime: number): void {
    // 空实现，保留方法签名
  }

  /**
   * 设置频率范围
   */
  setFrequencyRange(min: number, max: number): void {
    // 空实现，保留方法签名
  }

  /**
   * 同步机器人频率
   */
  syncWithRobotFrequency(freq: number): void {
    // 空实现，保留方法签名
  }
}
