/**
 * 玩家状态UI（显示能量、过载、耐久度和log信息）
 * Player Status UI (displays energy, overload, durability and log messages)
 */

import { IGameState } from '@/types/game';
import { CFG } from '@/config/gameConfig';

export class PlayerStatusUI {
  container: HTMLElement | null = null;
  gameState: IGameState | null = null;
  isVisible: boolean = false;

  // DOM元素引用
  energyBarFill: HTMLElement | null = null;
  energyBarValue: HTMLElement | null = null;
  overloadBarFill: HTMLElement | null = null;
  overloadBarValue: HTMLElement | null = null;
  durabilityBarFill: HTMLElement | null = null;
  durabilityBarValue: HTMLElement | null = null;
  logMessage: HTMLElement | null = null;

  constructor(gameState?: IGameState | null) {
    this.gameState = gameState || null;
  }

  /**
   * 初始化玩家状态UI
   */
  init(): void {
    // 将容器添加到 monitor-screen 内部，而不是 world-ui-container
    const monitorScreen = document.getElementById('monitor-screen');
    if (!monitorScreen) {
      console.error('Monitor screen not found!');
      return;
    }

    // 创建状态UI容器
    this.container = document.createElement('div');
    this.container.className = 'player-status-ui';
    this.container.id = 'player-status-ui';
    monitorScreen.appendChild(this.container);

    // 创建DOM结构
    this.createDOMStructure();

    // 更新位置（相对于 monitor-screen）
    this.updatePosition();

    console.log('Player Status UI initialized');
  }

  /**
   * 更新位置（相对于 monitor-screen）
   */
  private updatePosition(): void {
    if (!this.container) return;

    const monitorScreen = document.getElementById('monitor-screen');
    if (!monitorScreen) return;

    // 使用绝对定位，相对于 monitor-screen
    this.container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 1101;
      pointer-events: none;
      font-family: 'Courier New', monospace;
      color: #ffffff;
    `;
  }

  /**
   * 创建DOM结构
   */
  private createDOMStructure(): void {
    if (!this.container) return;

    // 初始值会在update方法中动态更新
    const maxEnergy = 100; // 占位值，实际值在update中获取
    const maxDurability = typeof CFG.maxDurability === 'number' ? CFG.maxDurability : 100;
    const maxOverload = 100; // 占位值，实际值在update中获取

    // 能量条
    const energyBar = document.createElement('div');
    energyBar.className = 'status-bar energy-bar';
    const energyLabel = document.createElement('div');
    energyLabel.className = 'bar-label';
    energyLabel.textContent = 'ENERGY';
    const energyContainer = document.createElement('div');
    energyContainer.className = 'bar-container';
    this.energyBarFill = document.createElement('div');
    this.energyBarFill.className = 'bar-fill';
    energyContainer.appendChild(this.energyBarFill);
    this.energyBarValue = document.createElement('div');
    this.energyBarValue.className = 'bar-value';
    this.energyBarValue.textContent = `0/${maxEnergy}`;
    energyBar.appendChild(energyLabel);
    energyBar.appendChild(energyContainer);
    energyBar.appendChild(this.energyBarValue);
    this.container.appendChild(energyBar);

    // 过载条
    const overloadBar = document.createElement('div');
    overloadBar.className = 'status-bar overload-bar';
    const overloadLabel = document.createElement('div');
    overloadLabel.className = 'bar-label';
    overloadLabel.textContent = 'OVERLOAD';
    const overloadContainer = document.createElement('div');
    overloadContainer.className = 'bar-container';
    this.overloadBarFill = document.createElement('div');
    this.overloadBarFill.className = 'bar-fill';
    overloadContainer.appendChild(this.overloadBarFill);
    this.overloadBarValue = document.createElement('div');
    this.overloadBarValue.className = 'bar-value';
    this.overloadBarValue.textContent = `0/${maxOverload}`;
    overloadBar.appendChild(overloadLabel);
    overloadBar.appendChild(overloadContainer);
    overloadBar.appendChild(this.overloadBarValue);
    this.container.appendChild(overloadBar);

    // 耐久度条
    const durabilityBar = document.createElement('div');
    durabilityBar.className = 'status-bar durability-bar';
    const durabilityLabel = document.createElement('div');
    durabilityLabel.className = 'bar-label';
    durabilityLabel.textContent = 'DURABILITY';
    const durabilityContainer = document.createElement('div');
    durabilityContainer.className = 'bar-container';
    this.durabilityBarFill = document.createElement('div');
    this.durabilityBarFill.className = 'bar-fill';
    durabilityContainer.appendChild(this.durabilityBarFill);
    this.durabilityBarValue = document.createElement('div');
    this.durabilityBarValue.className = 'bar-value';
    this.durabilityBarValue.textContent = `0/${maxDurability}`;
    durabilityBar.appendChild(durabilityLabel);
    durabilityBar.appendChild(durabilityContainer);
    durabilityBar.appendChild(this.durabilityBarValue);
    this.container.appendChild(durabilityBar);

    // Log消息
    this.logMessage = document.createElement('div');
    this.logMessage.className = 'log-message';
    this.logMessage.id = 'log-message';
    this.container.appendChild(this.logMessage);
  }

  /**
   * 更新状态显示
   */
  update(): void {
    if (!this.gameState || !this.isVisible) return;

    // 更新位置（以防窗口大小改变）
    this.updatePosition();

    // 从player对象获取动态最大值（如果player有这些方法）
    const player = this.gameState.p as any;
    const maxEnergy = player.getMaxEnergy ? player.getMaxEnergy() : 100;
    const maxDurability = typeof CFG.maxDurability === 'number' ? CFG.maxDurability : 100;
    const maxOverload = player.getMaxOverload ? player.getMaxOverload() : 100;

    // 更新能量条
    if (this.energyBarFill && this.energyBarValue) {
      const energy = this.gameState.p.en;
      const energyPercent = Math.max(0, Math.min(1, energy / maxEnergy));
      const energyColor = energyPercent > 0.3 ? '#00ff00' : (energyPercent > 0.1 ? '#ffff00' : '#ff0000');
      
      this.energyBarFill.style.width = `${energyPercent * 100}%`;
      this.energyBarFill.style.background = energyColor;
      this.energyBarValue.textContent = `${Math.floor(energy)}/${maxEnergy}`;
    }

    // 更新过载条
    if (this.overloadBarFill && this.overloadBarValue) {
      const overload = this.gameState.p.overload;
      const overloadPercent = Math.max(0, Math.min(1, overload / maxOverload));
      // 过载颜色：低过载绿色，中过载黄色，高过载红色
      const overloadColor = overloadPercent < 0.3 ? '#00ff00' : (overloadPercent < 0.7 ? '#ffff00' : '#ff0000');
      
      this.overloadBarFill.style.width = `${overloadPercent * 100}%`;
      this.overloadBarFill.style.background = overloadColor;
      this.overloadBarValue.textContent = `${Math.floor(overload)}/${maxOverload}`;
    }

    // 更新耐久度条
    if (this.durabilityBarFill && this.durabilityBarValue) {
      const durability = this.gameState.p.durability;
      const durabilityPercent = Math.max(0, Math.min(1, durability / maxDurability));
      const durabilityColor = durabilityPercent > 0.5 ? '#00aaff' : (durabilityPercent > 0.2 ? '#ffaa00' : '#ff0000');
      
      this.durabilityBarFill.style.width = `${durabilityPercent * 100}%`;
      this.durabilityBarFill.style.background = durabilityColor;
      this.durabilityBarValue.textContent = `${Math.floor(durability)}/${maxDurability}`;
    }

    // 更新Log消息
    if (this.logMessage) {
      if (this.gameState.currentMessage && this.gameState.messageTimer > 0) {
        this.logMessage.textContent = this.gameState.currentMessage;
        // 消息快消失时添加闪烁效果
        if (this.gameState.messageTimer < 60) {
          this.logMessage.style.opacity = (this.gameState.messageTimer / 60).toString();
        } else {
          this.logMessage.style.opacity = '1';
        }
        this.logMessage.style.display = 'block';
      } else {
        this.logMessage.style.display = 'none';
      }
    }
  }

  /**
   * 显示UI
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * 隐藏UI
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * 清理UI
   */
  destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.energyBarFill = null;
    this.energyBarValue = null;
    this.overloadBarFill = null;
    this.overloadBarValue = null;
    this.durabilityBarFill = null;
    this.durabilityBarValue = null;
    this.logMessage = null;
  }
}
