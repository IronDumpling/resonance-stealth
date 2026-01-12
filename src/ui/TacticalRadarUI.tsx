/**
 * 战术雷达UI（管理状态信息、log和inventory）
 * Tactical Radar UI (manages status info, log and inventory)
 */

import { IGameState } from '@/types/game';
import { PlayerStatusUI } from './PlayerStatusUI';
import { InventoryUI } from './InventoryUI';

export class TacticalRadarUI {
  gameState: IGameState | null = null;
  container: HTMLElement | null = null;
  playerStatusUI: PlayerStatusUI | null = null;
  inventoryUI: InventoryUI | null = null;
  isVisible: boolean = false;

  constructor(gameState?: IGameState | null) {
    this.gameState = gameState || null;
  }

  /**
   * 初始化战术雷达UI
   */
  init(): void {
    this.container = document.getElementById('world-ui-container');
    
    if (!this.container) {
      console.error('World UI container not found!');
      return;
    }

    // 初始化PlayerStatusUI
    this.playerStatusUI = new PlayerStatusUI(this.gameState);
    this.playerStatusUI.init();

    // 初始化InventoryUI
    this.inventoryUI = new InventoryUI(this.gameState);
    this.inventoryUI.create();

    console.log('Tactical Radar UI initialized');
  }

  /**
   * 显示UI
   */
  show(): void {
    if (this.playerStatusUI) {
      this.playerStatusUI.show();
    }
    if (this.inventoryUI) {
      this.inventoryUI.show();
    }
    this.isVisible = true;
  }

  /**
   * 隐藏UI
   */
  hide(): void {
    if (this.playerStatusUI) {
      this.playerStatusUI.hide();
    }
    if (this.inventoryUI) {
      this.inventoryUI.hide();
    }
    this.isVisible = false;
  }

  /**
   * 更新UI
   */
  update(_deltaTime: number): void {
    if (!this.isVisible) return;

    // 更新gameState引用（以防外部更新）
    if (this.playerStatusUI) {
      this.playerStatusUI.gameState = this.gameState;
      this.playerStatusUI.update();
    }
    if (this.inventoryUI) {
      this.inventoryUI.gameState = this.gameState;
      this.inventoryUI.update();
    }
  }

  /**
   * 清理UI
   */
  destroy(): void {
    if (this.playerStatusUI) {
      this.playerStatusUI.destroy();
      this.playerStatusUI = null;
    }
    if (this.inventoryUI) {
      this.inventoryUI.hide();
      this.inventoryUI = null;
    }
  }
}
