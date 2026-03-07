/**
 * 后备箱格子 UI
 * Trunk Grid UI
 *
 * 渲染后备箱网格，支持物品选择、详情面板、移动、旋转、使用。
 */

import type { InventorySystem } from '@/systems/InventorySystem';
import type { ITrunkItem } from '@/types/entities';
import { getItemDef } from '@/config/itemDefs';
import type { ItemType } from '@/types/entities';

/** 格子基础尺寸（2x 原 48px），可根据容器缩放 */
const CELL_SIZE = 96;
const GRID_GAP = 8;

export class TrunkUI {
  container: HTMLElement | null = null;
  inventorySystem: InventorySystem | null = null;
  gridEl: HTMLElement | null = null;
  selectedItem: ITrunkItem | null = null;

  init(container: HTMLElement, inventorySystem: InventorySystem): void {
    this.container = container;
    this.inventorySystem = inventorySystem;
    this.render();
    inventorySystem.callbacks.onInventoryUpdate = () => this.render();
  }

  getSelectedItem(): ITrunkItem | null {
    return this.selectedItem;
  }

  /** WASD 移动选中物品 */
  handleMove(dx: number, dy: number): boolean {
    const item = this.selectedItem;
    if (!item || !this.inventorySystem) return false;
    const ok = this.inventorySystem.moveItem(item, item.gridX + dx, item.gridY + dy);
    if (ok) this.render();
    return ok;
  }

  /** QE 旋转选中物品，dir: -1=左 1=右 */
  handleRotate(dir: -1 | 1): boolean {
    const item = this.selectedItem;
    if (!item || !this.inventorySystem) return false;
    const ok = this.inventorySystem.rotateItem(item, dir as 1 | -1);
    if (ok) this.render();
    return ok;
  }

  render(): void {
    if (!this.container || !this.inventorySystem) return;

    // 根据容器尺寸缩放格子（页面较小时缩小，参考宽度 600px）
    const rect = this.container.getBoundingClientRect();
    const scale = rect.width > 0 ? Math.min(1, Math.max(0.5, rect.width / 600)) : 1;
    const cellSize = Math.round(CELL_SIZE * scale);
    const gridGap = Math.round(GRID_GAP * scale);

    this.container.innerHTML = '';
    this.container.style.cssText = `
      display: flex;
      flex-direction: row;
      align-items: stretch;
      gap: 24px;
      padding: 20px;
      background: rgba(0,0,0,0.85);
      border: 2px solid #00ff00;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(0,255,0,0.2);
      pointer-events: auto;
    `;

    const left = document.createElement('div');
    left.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
    const title = document.createElement('div');
    title.textContent = 'TRUNK';
    title.style.cssText = 'color: #00ff00; font-size: 18px; margin-bottom: 12px; font-family: monospace;';
    left.appendChild(title);

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'inventory-trunk-grid';
    this.gridEl.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${this.inventorySystem.trunkWidth}, ${cellSize}px);
      grid-template-rows: repeat(${this.inventorySystem.trunkHeight}, ${cellSize}px);
      gap: ${gridGap}px;
    `;

    const items = this.inventorySystem.getTrunkItems();
    const cellOwner = new Map<string, { item: ITrunkItem; isOrigin: boolean }>();

    for (const item of items) {
      const { width, height } = this.inventorySystem.getRotatedDimensions(item);
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          cellOwner.set(`${item.gridX + dx},${item.gridY + dy}`, {
            item,
            isOrigin: dx === 0 && dy === 0,
          });
        }
      }
    }

    for (let gy = 0; gy < this.inventorySystem.trunkHeight; gy++) {
      for (let gx = 0; gx < this.inventorySystem.trunkWidth; gx++) {
        const info = cellOwner.get(`${gx},${gy}`);
        if (info?.isOrigin) {
          const { item } = info;
          const { width, height } = this.inventorySystem.getRotatedDimensions(item);
          const def = getItemDef(item.type as ItemType);
          const cell = document.createElement('div');
          const isSelected = this.selectedItem === item;
          const cellW = width * cellSize;
          const cellH = height * cellSize;
          cell.style.cssText = `
            width: ${cellW}px;
            height: ${cellH}px;
            min-width: ${cellW}px;
            min-height: ${cellH}px;
            border: 2px solid ${isSelected ? '#00ff00' : '#333'};
            background: ${isSelected ? 'rgba(0,255,0,0.2)' : 'rgba(0,20,0,0.5)'};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${isSelected ? '0 0 8px rgba(0,255,0,0.5)' : 'none'};
          `;
          if (def) {
            cell.style.gridColumn = `span ${width}`;
            cell.style.gridRow = `span ${height}`;
            if (!isSelected) cell.style.background = `rgba(0,80,0,0.4)`;
            cell.style.borderColor = isSelected ? '#00ff00' : def.color;
            cell.style.color = def.color;
            cell.style.fontSize = `${Math.min(cellW, cellH) * 0.5}px`;
            cell.textContent = def.icon;
            if (item.count > 1) {
              const countEl = document.createElement('span');
              countEl.textContent = String(item.count);
              countEl.style.cssText = `position:absolute;bottom:4px;right:8px;font-size:${cellSize * 0.2}px;`;
              cell.style.position = 'relative';
              cell.appendChild(countEl);
            }
            cell.style.cursor = 'pointer';
            cell.title = def.name;
            cell.addEventListener('click', () => {
              this.selectedItem = item;
              this.render();
            });
          }
          this.gridEl.appendChild(cell);
        } else if (!info) {
          const cell = document.createElement('div');
          cell.style.cssText = `
            width: ${cellSize}px;
            height: ${cellSize}px;
            min-width: ${cellSize}px;
            min-height: ${cellSize}px;
            border: 1px solid #333;
            background: rgba(0,20,0,0.5);
            cursor: pointer;
          `;
          cell.addEventListener('click', () => {
            this.selectedItem = null;
            this.render();
          });
          this.gridEl.appendChild(cell);
        }
      }
    }

    left.appendChild(this.gridEl);
    this.container.appendChild(left);

    // 右侧详情面板
    if (this.selectedItem) {
      const def = getItemDef(this.selectedItem.type as ItemType);
      if (def) {
        const panel = document.createElement('div');
        panel.className = 'inventory-details-panel';
        panel.style.cssText = `
          min-width: 200px;
          padding: 16px;
          background: rgba(0,30,0,0.6);
          border: 1px solid #00ff00;
          border-radius: 6px;
          color: #00ff00;
          font-family: monospace;
          display: flex;
          flex-direction: column;
          gap: 12px;
        `;
        panel.innerHTML = `
          <div style="font-size: 16px; font-weight: bold;">${def.name}</div>
          <div>尺寸: ${this.inventorySystem.getRotatedDimensions(this.selectedItem).width}×${this.inventorySystem.getRotatedDimensions(this.selectedItem).height}</div>
          <div>数量: ${this.selectedItem.count}${def.stackMax > 1 ? ` / ${def.stackMax}` : ''}</div>
          <div style="font-size: 12px; opacity: 0.8;">${def.useEffect ? `使用: ${def.useEffect} +${def.useAmount ?? 0}` : '不可使用'}</div>
        `;
        if (def.useEffect) {
          const useBtn = document.createElement('button');
          useBtn.textContent = '使用';
          useBtn.style.cssText = `
            padding: 8px 16px;
            background: #00ff00;
            color: #000;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: monospace;
            font-weight: bold;
          `;
          useBtn.addEventListener('click', () => {
            this.inventorySystem?.useItem(this.selectedItem!);
            this.selectedItem = null;
            this.render();
          });
          panel.appendChild(useBtn);
        }
        this.container.appendChild(panel);
      }
    }
  }

  destroy(): void {
    if (this.inventorySystem) {
      this.inventorySystem.callbacks.onInventoryUpdate = undefined;
    }
    this.container = null;
    this.inventorySystem = null;
    this.gridEl = null;
    this.selectedItem = null;
  }
}
