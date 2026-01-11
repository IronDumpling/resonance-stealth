/**
 * 背包UI组件
 * Inventory UI Component
 */

import React, { useEffect, useRef } from 'react';
import { CFG } from '@/config/gameConfig';

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
    
    // 创建6个物品槽
    const inventorySize = (typeof CFG.inventorySize === 'number' ? CFG.inventorySize : 6);
    for (let i = 0; i < inventorySize; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.id = `inv-slot-${i}`;
      slot.style.cssText = `
        width: 50px;
        height: 50px;
        border: 2px solid #333333;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: #00ff00;
        box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.3);
      `;
      container.appendChild(slot);
      this.slots.push(slot);
    }
    
    // 更新容器位置（基于canvas位置）
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
      
      if (item) {
        // 根据物品类型设置图标
        switch (item.type) {
          case 'energy_bottle':
            slot.textContent = '⚡';
            slot.style.color = '#00ff00';
            break;
          case 'core_hot':
            slot.textContent = '◆';
            slot.style.color = '#ff6600';
            break;
          case 'core_cold':
            slot.textContent = '◇';
            slot.style.color = '#8888ff';
            break;
          case 'signal_source':
            slot.textContent = '◉';
            slot.style.color = '#ffaa00';
            break;
          default:
            slot.textContent = '?';
            slot.style.color = '#ffffff';
            break;
        }
        slot.style.borderColor = '#00ff00';
      } else {
        // 空槽位
        slot.textContent = '';
        slot.style.borderColor = '#333333';
      }
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
   * 更新背包位置（使其显示在CRT屏幕内的右侧）
   */
  updatePosition(): void {
    const container = document.getElementById('inventory-container');
    const canvas = document.getElementById('gameCanvas');
    
    if (!container || !canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    // 定位到canvas右侧内部，距离右边20px，距离顶部120px
    container.style.cssText = `
      position: fixed;
      right: ${window.innerWidth - canvasRect.right + 20}px;
      top: ${canvasRect.top + 120}px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1100;
      pointer-events: none;
    `;
  }
}

// React组件包装器
export const InventoryUIComponent: React.FC<{ gameState?: GameState | null }> = ({ gameState }) => {
  const uiRef = useRef<InventoryUI | null>(null);

  useEffect(() => {
    if (!uiRef.current) {
      uiRef.current = new InventoryUI(gameState);
      uiRef.current.create();
    } else {
      // 更新 gameState 引用
      uiRef.current.gameState = gameState || null;
    }

    return () => {
      // 清理
    };
  }, [gameState]);

  return <div id="inventory-container" style={{ display: 'none' }} />;
};
