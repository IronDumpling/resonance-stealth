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
      padding: 24px;
      pointer-events: auto;
    `;

    // 左侧：实体格子网格区，背景尺寸与格子严格匹配（无多余空白）
    const gridWrap = document.createElement('div');
    gridWrap.style.cssText = `
      width: fit-content;
      height: fit-content;
      background: #151515;
      border: 16px solid #18181b;
      border-radius: 12px;
      box-shadow: -20px 20px 50px rgba(0,0,0,1), inset 0 0 50px rgba(0,0,0,0.5);
      padding: 24px;
      position: relative;
    `;

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'inventory-trunk-grid';
    this.gridEl.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${this.inventorySystem.trunkWidth}, ${cellSize}px);
      grid-template-rows: repeat(${this.inventorySystem.trunkHeight}, ${cellSize}px);
      gap: ${gridGap}px;
      width: fit-content;
      background: rgba(0,0,0,0.8);
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #27272a;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
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
          const itemShadow = '2px 2px 5px rgba(0,0,0,0.8), inset 2px 2px 5px rgba(255,255,255,0.15), inset -2px -2px 5px rgba(0,0,0,0.5)';
          const selectedShadow = '0 0 12px rgba(0,255,0,0.6), ' + itemShadow;
          cell.style.cssText = `
            width: ${cellW}px;
            height: ${cellH}px;
            min-width: ${cellW}px;
            min-height: ${cellH}px;
            border: 2px solid ${isSelected ? '#00ff00' : (def?.color ?? '#333')};
            background: ${isSelected ? 'rgba(0,255,0,0.25)' : (def ? `rgba(0,80,0,0.4)` : 'rgba(0,20,0,0.5)')};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${isSelected ? selectedShadow : itemShadow};
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
            border: 1px solid rgba(39,39,42,0.5);
            background: #1a1a1a;
            box-shadow: inset 2px 2px 4px rgba(0,0,0,0.6);
            margin: 1px;
            border-radius: 2px;
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

    gridWrap.appendChild(this.gridEl);
    this.container.appendChild(gridWrap);

    // 右侧：CRT 物品信息检视屏（始终显示，在格子系统背景之外）
    const slotCount = this.inventorySystem.trunkWidth * this.inventorySystem.trunkHeight;
    const panel = document.createElement('div');
    panel.className = 'inventory-details-panel';
    panel.style.cssText = `
      width: 280px;
      min-width: 280px;
      background: #27272a;
      border: 12px solid #18181b;
      border-radius: 8px;
      box-shadow: 20px 20px 50px rgba(0,0,0,1);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
    `;
    const label = document.createElement('div');
    label.style.cssText = 'background: rgba(0,0,0,0.5); padding: 8px; border: 1px solid #3f3f46; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); margin-bottom: 8px;';
    label.innerHTML = `
      <div style="color: #71717a; font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 0.1em;">CARGO HOLD // A.E.S</div>
      <div style="color: #52525b; font-family: monospace; font-size: 10px;">CAPACITY: ${slotCount} SLOTS</div>
    `;
    panel.appendChild(label);
    const crtScreen = document.createElement('div');
    crtScreen.style.cssText = `
      min-height: 180px;
      background: #0a150a;
      border: 4px solid #09090b;
      border-radius: 8px;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
      padding: 16px;
      position: relative;
      overflow: hidden;
    `;
    if (this.selectedItem) {
      const def = getItemDef(this.selectedItem.type as ItemType);
      if (def) {
        crtScreen.innerHTML = `
          <div style="position: absolute; inset: 0; background: linear-gradient(rgba(0,255,0,0.03) 50%, rgba(0,0,0,0.2) 50%); background-size: 100% 4px; pointer-events: none;"></div>
          <div style="color: #22c55e; font-family: monospace; font-size: 12px; border-bottom: 1px solid rgba(0,100,0,0.5); padding-bottom: 8px; margin-bottom: 12px; font-weight: bold;">&gt; SELECT ITEM</div>
          <div style="color: rgba(34,197,94,0.8); font-family: monospace; font-size: 11px; line-height: 1.6;">
            <div style="font-weight: bold; margin-bottom: 4px;">${def.name}</div>
            <div>尺寸: ${this.inventorySystem.getRotatedDimensions(this.selectedItem).width}×${this.inventorySystem.getRotatedDimensions(this.selectedItem).height}</div>
            <div>数量: ${this.selectedItem.count}${def.stackMax > 1 ? ` / ${def.stackMax}` : ''}</div>
            <div style="font-size: 10px; opacity: 0.9; margin-top: 8px;">${def.useEffect ? `使用: ${def.useEffect} +${def.useAmount ?? 0}` : '不可使用'}</div>
          </div>
          <div style="position: absolute; bottom: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; background: #27272a; border: 2px solid #09090b; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
        `;
        if (def.useEffect) {
          const useBtn = document.createElement('button');
          useBtn.textContent = '使用';
          useBtn.style.cssText = `
            padding: 10px 20px;
            background: #22c55e;
            color: #000;
            border: 2px solid #16a34a;
            border-radius: 4px;
            cursor: pointer;
            font-family: monospace;
            font-weight: bold;
            margin-top: 8px;
            box-shadow: 0 4px 0 #15803d, 0 6px 10px rgba(0,0,0,0.4);
          `;
          useBtn.addEventListener('click', () => {
            this.inventorySystem?.useItem(this.selectedItem!);
            this.selectedItem = null;
            this.render();
          });
          panel.appendChild(useBtn);
        }
      }
    } else {
      crtScreen.innerHTML = `
        <div style="position: absolute; inset: 0; background: linear-gradient(rgba(0,255,0,0.03) 50%, rgba(0,0,0,0.2) 50%); background-size: 100% 4px; pointer-events: none;"></div>
        <div style="color: #22c55e; font-family: monospace; font-size: 12px; border-bottom: 1px solid rgba(0,100,0,0.5); padding-bottom: 8px; margin-bottom: 12px; font-weight: bold;">&gt; SELECT ITEM</div>
        <div style="color: rgba(34,197,94,0.8); font-family: monospace; font-size: 11px; line-height: 1.6; margin-top: 16px;">
          <p>NO ITEM SELECTED FOR INSPECTION.</p>
          <p>AWAITING INPUT...</p>
        </div>
        <div style="position: absolute; bottom: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; background: #27272a; border: 2px solid #09090b; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
      `;
    }
    panel.appendChild(crtScreen);
    this.container.appendChild(panel);
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
