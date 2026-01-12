/**
 * 能量瓶实体
 * Energy Bottle Entity
 */

import { BaseEntity } from '../Base';
import { IEnergyBottle } from '@/types/entities';
import { CFG } from '@/config/gameConfig';

export class EnergyBottle extends BaseEntity implements IEnergyBottle {
  type: 'energy_bottle' = 'energy_bottle';
  visibleTimer: number = 0;
  value: number = 0;
  hintElement: HTMLElement | null = null;

  constructor(x: number = 0, y: number = 0, value?: number) {
    super(x, y);
    this.value = value ?? (typeof CFG.energyBottleVal === 'number' ? CFG.energyBottleVal : 30);
    this.visibleTimer = 0; // 默认不可见，需要被波纹扫描后才可见
  }

  override init(): void {
    // 能量瓶初始化逻辑
    this.createHintUI();
  }

  override update(deltaTime: number): void {
    // 能量瓶更新逻辑
    // visibleTimer 由外部系统更新（波纹扫描时）
    if (this.visibleTimer > 0) {
      this.visibleTimer -= deltaTime * 60; // 转换为帧数（假设60fps）
      if (this.visibleTimer < 0) {
        this.visibleTimer = 0;
      }
    }
  }

  override render(_ctx: CanvasRenderingContext2D): void {
    // 能量瓶渲染逻辑
    // 注意：实际渲染通常由渲染器统一处理，这里保留接口
  }

  /**
   * 创建交互提示UI
   */
  createHintUI(container?: HTMLElement): HTMLElement | null {
    if (this.hintElement) {
      return this.hintElement;
    }

    const div = document.createElement('div');
    div.className = 'interact-hint item-hint';
    div.innerHTML = '[E] ENERGY PACK';
    div.style.color = '#00ff00';
    div.style.borderColor = '#00ff00';
    div.style.textShadow = '0 0 5px #00ff00';
    div.style.display = 'none';

    if (container) {
      container.appendChild(div);
    } else {
      // 如果没有提供容器，尝试找到默认容器
      const uiContainer = document.getElementById('world-ui-container');
      if (uiContainer) {
        uiContainer.appendChild(div);
      }
    }

    this.hintElement = div;
    return div;
  }

  /**
   * 移除UI元素
   */
  removeHintUI(): void {
    if (this.hintElement) {
      this.hintElement.remove();
      this.hintElement = null;
    }
  }
}

/**
 * 创建能量瓶
 */
export function createEnergyBottle(
  x: number,
  y: number,
  value?: number
): EnergyBottle {
  return new EnergyBottle(x, y, value);
}
