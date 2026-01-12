/**
 * 背包系统
 * Inventory System
 */

import { IInventorySystem } from '@/types/systems';
import { CFG, CORE_TYPES } from '@/config/gameConfig';
import { IItem, IHotCore } from '@/types/entities';

// 仓库系统接口
export interface IWarehouse {
  items: (IItem | null)[];
  maxSize: number;
}

// 游戏状态接口（用于访问玩家背包）
export interface IGameStateForInventory {
  p: {
    inventory: (IItem | null)[];
    en: number;
    getMaxEnergy?: () => number;
  };
}

export class InventorySystem implements IInventorySystem {
  warehouse: IWarehouse = {
    items: [],
    maxSize: 36
  };
  
  gameState: IGameStateForInventory | null = null;
  onInventoryUpdate?: () => void;
  onLogMessage?: (message: string) => void;
  onAddEnergy?: (amount: number) => void;
  onSpawnParticles?: (x: number, y: number, color: string, count: number) => void;

  constructor(
    gameState?: IGameStateForInventory | null,
    callbacks?: {
      onInventoryUpdate?: () => void;
      onLogMessage?: (message: string) => void;
      onAddEnergy?: (amount: number) => void;
      onSpawnParticles?: (x: number, y: number, color: string, count: number) => void;
    }
  ) {
    this.gameState = gameState || null;
    if (callbacks) {
      this.onInventoryUpdate = callbacks.onInventoryUpdate;
      this.onLogMessage = callbacks.onLogMessage;
      this.onAddEnergy = callbacks.onAddEnergy;
      this.onSpawnParticles = callbacks.onSpawnParticles;
    }
  }

  /**
   * 初始化仓库
   */
  initWarehouse(): void {
    this.warehouse.items = new Array(36).fill(null);
    console.log('Warehouse initialized with 36 slots');
  }

  /**
   * 初始化玩家背包
   */
  initPlayerInventory(): void {
    if (!this.gameState) {
      console.error('Game state not set for InventorySystem');
      return;
    }
    
    const inventorySize = CFG.inventorySize || 6;
    this.gameState.p.inventory = new Array(inventorySize).fill(null);
    
    // 初始拾荒者核心（core_hot类型）
    this.gameState.p.inventory[0] = {
      type: 'core_hot',
      x: 0,
      y: 0,
      visibleTimer: 0,
      value: 0,
      coreData: CORE_TYPES.SCAVENGER
    } as IHotCore;
    
    console.log('Player inventory initialized with Scavenger core');
  }

  /**
   * 添加物品到背包
   */
  addItem(item: unknown): boolean {
    if (!this.gameState) {
      console.error('Game state not set for InventorySystem');
      return false;
    }
    
    const itemType = (item as IItem).type;
    if (!itemType) {
      console.error('Invalid item type');
      return false;
    }
    
    // 检查是否有空位（null槽位），但跳过slot 0（核心槽位）
    let emptySlotIndex = -1;
    for (let i = 1; i < this.gameState.p.inventory.length; i++) {
      if (this.gameState.p.inventory[i] === null) {
        emptySlotIndex = i;
        break;
      }
    }
    
    // 如果slot 0为空，且物品是core_hot，可以放入slot 0
    if (this.gameState.p.inventory[0] === null && itemType === 'core_hot') {
      emptySlotIndex = 0;
    }
    
    if (emptySlotIndex === -1) {
      if (this.onLogMessage) {
        this.onLogMessage("INVENTORY FULL");
      }
      return false;
    }
    
    // 验证：如果目标槽位是0，只允许core_hot
    if (emptySlotIndex === 0 && itemType !== 'core_hot') {
      if (this.onLogMessage) {
        this.onLogMessage("CORE SLOT ONLY ACCEPTS HOT CORE");
      }
      return false;
    }
    
    const newItem: IItem = {
      ...(item as IItem),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    // 放入槽位
    this.gameState.p.inventory[emptySlotIndex] = newItem;
    
    // 更新UI
    if (this.onInventoryUpdate) {
      this.onInventoryUpdate();
    }
    
    return true;
  }

  /**
   * 从背包移除物品（按索引）
   */
  removeItem(index: number): boolean {
    if (!this.gameState) {
      console.error('Game state not set for InventorySystem');
      return false;
    }
    
    if (index < 0 || index >= this.gameState.p.inventory.length) {
      return false;
    }
    
    // 将该槽位设置为null而不是删除，保持背包大小固定
    this.gameState.p.inventory[index] = null;
    
    // 更新UI
    if (this.onInventoryUpdate) {
      this.onInventoryUpdate();
    }
    
    return true;
  }

  /**
   * 从背包移除物品（按类型，移除第一个匹配的）
   */
  removeItemByType(itemType: string): boolean {
    if (!this.gameState) {
      console.error('Game state not set for InventorySystem');
      return false;
    }
    
    const index = this.gameState.p.inventory.findIndex(
      item => item && item.type === itemType
    );
    
    if (index !== -1) {
      return this.removeItem(index);
    }
    
    return false;
  }

  /**
   * 获取所有物品
   */
  getItems(): unknown[] {
    if (!this.gameState) {
      return [];
    }
    
    return this.gameState.p.inventory.filter(item => item !== null);
  }

  /**
   * 获取背包中某类型物品的数量
   */
  getInventoryCount(itemType: string): number {
    if (!this.gameState) {
      return 0;
    }
    
    return this.gameState.p.inventory.filter(
      item => item && item.type === itemType
    ).length;
  }

  /**
   * 使用能量瓶
   */
  useenergyBottle(): boolean {
    if (!this.gameState) {
      console.error('Game state not set for InventorySystem');
      return false;
    }
    
    if (this.getInventoryCount('energy_bottle') === 0) {
      if (this.onLogMessage) {
        this.onLogMessage("NO ENERGY FLASK");
      }
      return false;
    }
    
    // 使用player的getMaxEnergy方法（如果可用），否则使用默认值
    const maxEnergy = this.gameState.p.getMaxEnergy ? this.gameState.p.getMaxEnergy() : 100;
    if (this.gameState.p.en >= maxEnergy) {
      if (this.onLogMessage) {
        this.onLogMessage("ENERGY FULL");
      }
      return false;
    }
    
    if (this.removeItemByType('energy_bottle')) {
      const energyValue = CFG.energyBottleVal || 30;
      if (this.onAddEnergy) {
        this.onAddEnergy(energyValue);
      }
      if (this.onLogMessage) {
        this.onLogMessage(`ENERGY RESTORED (+${energyValue})`);
      }
      if (this.onSpawnParticles && this.gameState.p) {
        // 需要玩家位置，这里暂时使用 (0, 0)
        // 实际使用时应该从 gameState 获取玩家位置
        this.onSpawnParticles(0, 0, '#00ff00', 20);
      }
      return true;
    }
    
    return false;
  }

  /**
   * 将背包物品转移到仓库
   */
  transferInventoryToWarehouse(): number {
    if (!this.gameState) {
      console.error('Game state not set for InventorySystem');
      return 0;
    }
    
    let transferredCount = 0;
    
    // 遍历玩家背包
    for (let i = 0; i < this.gameState.p.inventory.length; i++) {
      const item = this.gameState.p.inventory[i];
      
      // 跳过空槽位
      if (!item) continue;
      
      // 在仓库中寻找空位
      const emptySlotIndex = this.warehouse.items.findIndex(slot => slot === null);
      
      if (emptySlotIndex !== -1) {
        // 找到空位，转移物品
        this.warehouse.items[emptySlotIndex] = item;
        this.gameState.p.inventory[i] = null;
        transferredCount++;
      } else {
        // 仓库已满，保留在背包中
        console.warn('Warehouse is full, item remains in inventory');
      }
    }
    
    // 更新UI
    if (this.onInventoryUpdate) {
      this.onInventoryUpdate();
    }
    
    if (this.onLogMessage) {
      this.onLogMessage(`TRANSFERRED ${transferredCount} ITEMS TO WAREHOUSE`);
    }
    
    return transferredCount;
  }

  /**
   * 获取仓库
   */
  getWarehouse(): IWarehouse {
    return this.warehouse;
  }
}
