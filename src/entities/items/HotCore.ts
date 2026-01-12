/**
 * 热核心实体
 * Hot Core Entity
 */

import { BaseEntity } from '../Base';
import { IHotCore, ICore } from '@/types/entities';
import { CFG } from '@/config/gameConfig';

export class HotCore extends BaseEntity implements IHotCore {
  type: 'core_hot' = 'core_hot';
  visibleTimer: number = 0;
  value: number = 0;
  coreData?: ICore;
  hintElement: HTMLElement | null = null;

  constructor(x: number = 0, y: number = 0, value?: number, coreData?: ICore) {
    super(x, y);
    this.value = value ?? (typeof CFG.coreHotItemValue === 'number' ? CFG.coreHotItemValue : 10);
    this.coreData = coreData;
    this.visibleTimer = 240; // 4秒可见
  }

  override init(): void {
    // 热核心初始化逻辑
    this.createHintUI();
  }

  override update(deltaTime: number): void {
    // 热核心更新逻辑
    if (this.visibleTimer > 0) {
      this.visibleTimer -= deltaTime * 60; // 转换为帧数（假设60fps）
      if (this.visibleTimer < 0) {
        this.visibleTimer = 0;
      }
    }
  }

  override render(_ctx: CanvasRenderingContext2D): void {
    // 热核心渲染逻辑
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
    div.innerHTML = '[E] HOT CORE';
    div.style.color = '#ff6600';
    div.style.borderColor = '#ff6600';
    div.style.textShadow = '0 0 5px #ff6600';
    div.style.display = 'none';

    if (container) {
      container.appendChild(div);
    } else {
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
 * 创建热核心
 */
export function createHotCore(
  x: number,
  y: number,
  value?: number,
  coreData?: ICore
): HotCore {
  return new HotCore(x, y, value, coreData);
}
