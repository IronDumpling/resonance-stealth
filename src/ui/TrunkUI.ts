/**
 * 后备箱格子 UI
 * Trunk Grid UI
 *
 * 渲染后备箱网格，支持物品显示与使用。
 */

import type { InventorySystem } from '@/systems/InventorySystem';
import type { ITrunkItem } from '@/types/entities';
import { getItemDef } from '@/config/itemDefs';
import type { ItemType } from '@/types/entities';

const CELL_SIZE = 48;
const GRID_GAP = 4;

export class TrunkUI {
  container: HTMLElement | null = null;
  inventorySystem: InventorySystem | null = null;
  gridEl: HTMLElement | null = null;

  init(container: HTMLElement, inventorySystem: InventorySystem): void {
    this.container = container;
    this.inventorySystem = inventorySystem;
    this.render();
    inventorySystem.callbacks.onInventoryUpdate = () => this.render();
  }

  render(): void {
    if (!this.container || !this.inventorySystem) return;

    this.container.innerHTML = '';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      background: rgba(0,0,0,0.85);
      border: 2px solid #00ff00;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(0,255,0,0.2);
      pointer-events: auto;
    `;

    const title = document.createElement('div');
    title.textContent = 'TRUNK';
    title.style.cssText = 'color: #00ff00; font-size: 18px; margin-bottom: 12px; font-family: monospace;';
    this.container.appendChild(title);

    this.gridEl = document.createElement('div');
    this.gridEl.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${this.inventorySystem.trunkWidth}, ${CELL_SIZE}px);
      grid-template-rows: repeat(${this.inventorySystem.trunkHeight}, ${CELL_SIZE}px);
      gap: ${GRID_GAP}px;
    `;

    const items = this.inventorySystem.getTrunkItems();
    const cellOwner = new Map<string, { item: ITrunkItem; isOrigin: boolean }>();

    for (const item of items) {
      const def = getItemDef(item.type as ItemType);
      if (!def) continue;
      for (let dy = 0; dy < def.height; dy++) {
        for (let dx = 0; dx < def.width; dx++) {
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
          const def = getItemDef(item.type as ItemType);
          const cell = document.createElement('div');
          cell.style.cssText = `
            width: ${CELL_SIZE}px;
            height: ${CELL_SIZE}px;
            border: 1px solid #333;
            background: rgba(0,20,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          if (def) {
            cell.style.gridColumn = `span ${def.width}`;
            cell.style.gridRow = `span ${def.height}`;
            cell.style.background = `rgba(0,80,0,0.4)`;
            cell.style.borderColor = def.color;
            cell.style.color = def.color;
            cell.style.fontSize = '24px';
            cell.textContent = def.icon;
            if (item.count > 1) {
              const countEl = document.createElement('span');
              countEl.textContent = String(item.count);
              countEl.style.cssText = 'position:absolute;bottom:2px;right:4px;font-size:12px;';
              cell.style.position = 'relative';
              cell.appendChild(countEl);
            }
            if (def.useEffect) {
              cell.style.cursor = 'pointer';
              cell.title = `使用 ${def.name}`;
              cell.addEventListener('click', () => {
                this.inventorySystem?.useItem(item);
              });
            }
          }
          this.gridEl.appendChild(cell);
        } else if (!info) {
          const cell = document.createElement('div');
          cell.style.cssText = `
            width: ${CELL_SIZE}px;
            height: ${CELL_SIZE}px;
            border: 1px solid #333;
            background: rgba(0,20,0,0.5);
          `;
          this.gridEl.appendChild(cell);
        }
      }
    }

    this.container.appendChild(this.gridEl);
  }

  destroy(): void {
    if (this.inventorySystem) {
      this.inventorySystem.callbacks.onInventoryUpdate = undefined;
    }
    this.container = null;
    this.inventorySystem = null;
    this.gridEl = null;
  }
}
