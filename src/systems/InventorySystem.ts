/**
 * 后备箱/物资系统
 * Trunk & Inventory System
 *
 * 管理后备箱网格、安全屋无限仓库、地面掉落物。
 * 支持拖拽、丢弃、拾取、使用物品。
 */

import type { IGameState } from '@/types/game';
import type { IItem, ITrunkItem, IGroundItem, ItemType } from '@/types/entities';
import { getItemDef } from '@/config/itemDefs';

const TRUNK_WIDTH = 4;
const TRUNK_HEIGHT = 6;

export interface IInventoryCallbacks {
  onInventoryUpdate?: () => void;
  onLogMessage?: (message: string) => void;
  onAddFuel?: (amount: number) => void;
  onAddBattery?: (amount: number) => void;
  onAddIntegrity?: (amount: number) => void;
}

export class InventorySystem {
  trunkItems: ITrunkItem[] = [];
  trunkWidth = TRUNK_WIDTH;
  trunkHeight = TRUNK_HEIGHT;
  safehouseWarehouse: ITrunkItem[] = [];
  gameState: IGameState | null = null;
  callbacks: IInventoryCallbacks = {};

  constructor(
    gameState?: IGameState | null,
    callbacks?: IInventoryCallbacks
  ) {
    this.gameState = gameState || null;
    if (callbacks) this.callbacks = callbacks;
  }

  private getOccupiedCells(items: ITrunkItem[]): Set<string> {
    const occupied = new Set<string>();
    for (const item of items) {
      const def = getItemDef(item.type as ItemType);
      if (!def) continue;
      for (let dy = 0; dy < def.height; dy++) {
        for (let dx = 0; dx < def.width; dx++) {
          occupied.add(`${item.gridX + dx},${item.gridY + dy}`);
        }
      }
    }
    return occupied;
  }

  private canPlaceAt(items: ITrunkItem[], item: ITrunkItem, gx: number, gy: number): boolean {
    const def = getItemDef(item.type as ItemType);
    if (!def) return false;
    if (gx + def.width > this.trunkWidth || gy + def.height > this.trunkHeight) return false;
    const occupied = this.getOccupiedCells(items.filter(i => i !== item));
    for (let dy = 0; dy < def.height; dy++) {
      for (let dx = 0; dx < def.width; dx++) {
        if (occupied.has(`${gx + dx},${gy + dy}`)) return false;
      }
    }
    return true;
  }

  /** 找到可放置物品的第一个空位 */
  private findPlacement(items: ITrunkItem[], item: ITrunkItem): { x: number; y: number } | null {
    const def = getItemDef(item.type as ItemType);
    if (!def) return null;
    for (let gy = 0; gy <= this.trunkHeight - def.height; gy++) {
      for (let gx = 0; gx <= this.trunkWidth - def.width; gx++) {
        if (this.canPlaceAt(items, item, gx, gy)) return { x: gx, y: gy };
      }
    }
    return null;
  }

  /** 添加物品到后备箱 */
  addToTrunk(type: ItemType, count: number = 1): boolean {
    const def = getItemDef(type);
    if (!def) return false;
    const existing = this.trunkItems.find(
      i => i.type === type && (def.stackMax > 1 ? i.count < def.stackMax : false)
    );
    if (existing && def.stackMax > 1) {
      const add = Math.min(count, def.stackMax - existing.count);
      existing.count += add;
      this.notifyUpdate();
      return add === count;
    }
    const newItem: ITrunkItem = {
      type,
      x: 0,
      y: 0,
      visibleTimer: 0,
      gridX: 0,
      gridY: 0,
      count: Math.min(count, def.stackMax),
    };
    const pos = this.findPlacement(this.trunkItems, newItem);
    if (!pos) {
      this.callbacks.onLogMessage?.('TRUNK FULL');
      return false;
    }
    newItem.gridX = pos.x;
    newItem.gridY = pos.y;
    this.trunkItems.push(newItem);
    this.notifyUpdate();
    return true;
  }

  /** 从后备箱移除物品（按 grid 位置） */
  removeFromTrunk(gridX: number, gridY: number): ITrunkItem | null {
    const idx = this.trunkItems.findIndex(
      i => gridX >= i.gridX && gridX < i.gridX + (getItemDef(i.type as ItemType)?.width ?? 1) &&
           gridY >= i.gridY && gridY < i.gridY + (getItemDef(i.type as ItemType)?.height ?? 1)
    );
    if (idx < 0) return null;
    const [item] = this.trunkItems.splice(idx, 1);
    this.notifyUpdate();
    return item;
  }

  /** 丢弃到地面（世界坐标） */
  dropToGround(item: ITrunkItem, worldX: number, worldY: number): boolean {
    if (!this.gameState) return false;
    const idx = this.trunkItems.indexOf(item);
    if (idx < 0) return false;
    this.trunkItems.splice(idx, 1);
    const ground: IGroundItem = {
      ...item,
      x: worldX,
      y: worldY,
      count: item.count,
    };
    this.gameState.entities.groundItems.push(ground);
    this.notifyUpdate();
    this.callbacks.onLogMessage?.('DROPPED');
    return true;
  }

  /** 从地面拾取到后备箱 */
  pickFromGround(groundItem: IGroundItem): boolean {
    if (!this.gameState) return false;
    const idx = this.gameState.entities.groundItems.indexOf(groundItem);
    if (idx < 0) return false;
    this.gameState.entities.groundItems.splice(idx, 1);
    const trunkItem: ITrunkItem = {
      ...groundItem,
      gridX: 0,
      gridY: 0,
      count: groundItem.count,
    };
    const pos = this.findPlacement(this.trunkItems, trunkItem);
    if (!pos) {
      this.gameState.entities.groundItems.push(groundItem);
      this.callbacks.onLogMessage?.('TRUNK FULL');
      return false;
    }
    trunkItem.gridX = pos.x;
    trunkItem.gridY = pos.y;
    this.trunkItems.push(trunkItem);
    this.notifyUpdate();
    return true;
  }

  /** 使用物品（燃油/电池/修复） */
  useItem(item: ITrunkItem): boolean {
    const def = getItemDef(item.type as ItemType);
    if (!def?.useEffect || !this.gameState) return false;
    const survival = this.gameState.survival;
    if (!survival) return false;

    switch (def.useEffect) {
      case 'fuel_small':
      case 'fuel_medium':
        survival.fuel = Math.min(100, survival.fuel + (def.useAmount ?? 0));
        this.callbacks.onAddFuel?.(def.useAmount ?? 0);
        break;
      case 'charge':
        survival.battery = Math.min(100, survival.battery + (def.useAmount ?? 0));
        this.callbacks.onAddBattery?.(def.useAmount ?? 0);
        break;
      case 'repair':
        survival.integrity = Math.min(100, survival.integrity + (def.useAmount ?? 0));
        this.callbacks.onAddIntegrity?.(def.useAmount ?? 0);
        break;
      default:
        return false;
    }

    item.count--;
    if (item.count <= 0) {
      const idx = this.trunkItems.indexOf(item);
      if (idx >= 0) this.trunkItems.splice(idx, 1);
    }
    this.notifyUpdate();
    this.callbacks.onLogMessage?.(`USED ${def.name}`);
    return true;
  }

  /** 转移到安全屋仓库 */
  transferToWarehouse(item: ITrunkItem): boolean {
    const idx = this.trunkItems.indexOf(item);
    if (idx < 0) return false;
    this.trunkItems.splice(idx, 1);
    this.safehouseWarehouse.push(item);
    this.notifyUpdate();
    return true;
  }

  /** 从仓库取回后备箱 */
  transferFromWarehouse(item: ITrunkItem): boolean {
    const idx = this.safehouseWarehouse.indexOf(item);
    if (idx < 0) return false;
    this.safehouseWarehouse.splice(idx, 1);
    const pos = this.findPlacement(this.trunkItems, item);
    if (!pos) {
      this.safehouseWarehouse.push(item);
      this.callbacks.onLogMessage?.('TRUNK FULL');
      return false;
    }
    item.gridX = pos.x;
    item.gridY = pos.y;
    this.trunkItems.push(item);
    this.notifyUpdate();
    return true;
  }

  getTrunkItems(): ITrunkItem[] {
    return this.trunkItems;
  }

  getWarehouseItems(): ITrunkItem[] {
    return this.safehouseWarehouse;
  }

  getGroundItems(): IGroundItem[] {
    return this.gameState?.entities.groundItems ?? [];
  }

  private notifyUpdate(): void {
    this.callbacks.onInventoryUpdate?.();
  }

  // --- 兼容旧接口（供现有代码调用）---
  addItem(item: unknown): boolean {
    const i = item as IItem;
    return this.addToTrunk(i.type as ItemType, 1);
  }

  removeItem(_index: number): boolean {
    return false; // 旧接口按索引，新系统按网格
  }

  getItems(): unknown[] {
    return this.trunkItems;
  }

  /** 初始化玩家背包（兼容：给后备箱放一些测试物品） */
  initPlayerInventory(): void {
    this.trunkItems = [];
    // 测试用：放几个物品
    this.addToTrunk('fuel_can_small', 1);
    this.addToTrunk('repair_kit_small', 3);
    this.addToTrunk('battery_small', 2);
    this.notifyUpdate();
  }

  /** 初始化仓库（兼容） */
  initWarehouse(): void {
    this.safehouseWarehouse = [];
  }
}
