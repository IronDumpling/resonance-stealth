/**
 * 机器人组装UI（管理inventory）
 * Robot Assembly UI (manages inventory)
 */

import { IGameState } from '@/types/game';
import { InventoryUI } from './InventoryUI';

export class RobotAssemblyUI {
  gameState: IGameState | null = null;
  container: HTMLElement | null = null;
  inventoryUI: InventoryUI | null = null;
  isVisible: boolean = false;

  constructor(gameState?: IGameState | null) {
    this.gameState = gameState || null;
  }

  /**
   * 初始化机器人组装UI
   */
  init(): void {
    this.container = document.getElementById('world-ui-container');
    
    if (!this.container) {
      console.error('World UI container not found!');
      return;
    }

    // 初始化InventoryUI
    this.inventoryUI = new InventoryUI(this.gameState);
    this.inventoryUI.create();

    console.log('Robot Assembly UI initialized');
  }

  /**
   * 显示UI
   */
  show(): void {
    if (this.inventoryUI) {
      this.inventoryUI.show();
    }
    this.isVisible = true;
  }

  /**
   * 隐藏UI
   */
  hide(): void {
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
    if (this.inventoryUI) {
      this.inventoryUI.gameState = this.gameState;
      this.inventoryUI.update();
    }
  }

  /**
   * 清理UI
   */
  destroy(): void {
    if (this.inventoryUI) {
      this.inventoryUI.hide();
      this.inventoryUI = null;
    }
  }
}
