/**
 * 背包UI组件
 * Inventory UI Component
 */

import { CFG } from '@/config/gameConfig';
import { ItemSlotUI } from './ItemSlotUI';

interface InventoryItem {
  type: string;
}

interface GameState {
  p: {
    inventory: (InventoryItem | null)[];
  };
}

export class InventoryUI {
  container: HTMLElement | null = null;
  slots: HTMLElement[] = [];
  gameState: GameState | null = null;

  constructor(gameState?: GameState | null) {
    this.gameState = gameState || null;
  }

  /**
   * 创建背包UI
   */
  create(): void {
    const container = document.getElementById('inventory-container');
    if (!container) {
      console.error('Inventory container not found');
      return;
    }
    
    this.container = container;
    container.innerHTML = '';
    
    // 创建物品槽（使用ItemSlotUI）
    const inventorySize = (typeof CFG.inventorySize === 'number' ? CFG.inventorySize : 6);
    for (let i = 0; i < inventorySize; i++) {
      const slot = ItemSlotUI.createInventorySlot(i, null);
      container.appendChild(slot);
      this.slots.push(slot);
    }
    
    // 更新容器位置（底部水平排列）
    this.updatePosition();
  }

  /**
   * 更新背包UI
   */
  update(): void {
    if (!this.gameState) return;
    
    // 更新位置（以防窗口大小改变）
    this.updatePosition();
    
    const inventorySize = (typeof CFG.inventorySize === 'number' ? CFG.inventorySize : 6);
    for (let i = 0; i < inventorySize; i++) {
      const slot = document.getElementById(`inv-slot-${i}`);
      if (!slot) continue;
      
      const item = this.gameState.p.inventory[i];
      
      // 使用ItemSlotUI更新槽位
      ItemSlotUI.updateInventorySlot(slot, item);
    }
  }

  /**
   * 显示背包UI
   */
  show(): void {
    const container = document.getElementById('inventory-container');
    if (container) container.style.display = 'flex';
  }

  /**
   * 隐藏背包UI
   */
  hide(): void {
    const container = document.getElementById('inventory-container');
    if (container) container.style.display = 'none';
  }

  /**
   * 更新背包位置（使其显示在CRT屏幕内的底部水平居中）
   */
  updatePosition(): void {
    const container = document.getElementById('inventory-container');
    const canvas = document.getElementById('gameCanvas');
    
    if (!container || !canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    // 定位到canvas底部水平居中，距离底部20px
    container.style.cssText = `
      position: fixed;
      left: ${canvasRect.left + (canvasRect.width / 2)}px;
      bottom: ${window.innerHeight - canvasRect.bottom + 20}px;
      transform: translateX(-50%);
      display: flex;
      flex-direction: row;
      gap: 8px;
      z-index: 1100;
      pointer-events: none;
    `;
  }
}
