/**
 * 物品槽UI组件（统一管理物品图标显示）
 * Item Slot UI Component (unified item icon display)
 */

interface InventoryItem {
  type: string;
  coreType?: string;
  data?: unknown;
  id?: string;
}

export class ItemSlotUI {
  /**
   * 获取物品图标和颜色
   */
  static getItemIcon(item: InventoryItem | null): { icon: string; color: string } {
    if (!item) {
      return { icon: '', color: '#333333' };
    }

    switch (item.type) {
      case 'fuel_can_small':
        return { icon: '⛽', color: '#f97316' };
      case 'fuel_can_box':
        return { icon: '🛢', color: '#ea580c' };
      case 'repair_kit_small':
        return { icon: '🔧', color: '#22c55e' };
      case 'battery_small':
        return { icon: '▣', color: '#eab308' };
      default:
        return { icon: '?', color: '#ffffff' };
    }
  }

  /**
   * 创建物品槽元素（用于InventoryUI）
   */
  static createInventorySlot(index: number, item: InventoryItem | null): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    if (index === 0) {
      slot.classList.add('core-slot'); // 核心装备槽特殊标记
    }
    slot.id = `inv-slot-${index}`;
    
    const { icon, color } = this.getItemIcon(item);
    
    // 核心槽位（index 0）使用特殊边框颜色
    const borderColor = index === 0 ? '#ff6600' : (item ? '#00ff00' : '#333333');
    const boxShadow = index === 0 
      ? 'inset 0 0 10px rgba(255, 102, 0, 0.5), 0 0 5px rgba(255, 102, 0, 0.3)' 
      : 'inset 0 0 10px rgba(0, 255, 0, 0.3)';
    
    slot.style.cssText = `
      width: 50px;
      height: 50px;
      border: 2px solid ${borderColor};
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: ${color};
      box-shadow: ${boxShadow};
      position: relative;
    `;
    
    // 核心槽位添加标签
    if (index === 0) {
      const label = document.createElement('div');
      label.textContent = 'CORE';
      label.style.cssText = `
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 8px;
        color: #ff6600;
        text-shadow: 0 0 3px #ff6600;
        white-space: nowrap;
      `;
      slot.appendChild(label);
    }
    
    slot.textContent = icon;
    
    return slot;
  }

  /**
   * 创建物品槽元素（用于RobotAssemblyScene的拖拽网格）
   */
  static createAssemblySlot(index: number, source: string, item: InventoryItem | null): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'item-slot';
    if (index === 0 && source === 'inventory') {
      slot.classList.add('core-slot'); // 核心装备槽特殊标记
    }
    slot.dataset.index = index.toString();
    slot.dataset.source = source;
    
    // 核心槽位特殊样式
    if (index === 0 && source === 'inventory') {
      slot.style.border = '2px solid #ff6600';
      slot.style.boxShadow = '0 0 5px rgba(255, 102, 0, 0.5)';
    }
    
    if (item) {
      slot.classList.add('has-item');
      
      const { icon, color } = this.getItemIcon(item);
      
      // 根据物品类型设置背景色
      let backgroundColor = 'rgba(0, 0, 0, 0.3)';
      if (item.type === 'fuel_can_small' || item.type === 'fuel_can_box') {
        backgroundColor = 'rgba(249, 115, 22, 0.3)';
      } else if (item.type === 'repair_kit_small') {
        backgroundColor = 'rgba(34, 197, 94, 0.3)';
      } else if (item.type === 'battery_small') {
        backgroundColor = 'rgba(234, 179, 8, 0.3)';
      }
      
      slot.style.background = backgroundColor;
      
      // 创建图标元素
      const iconElement = document.createElement('div');
      iconElement.className = 'item-icon';
      iconElement.textContent = icon;
      iconElement.style.cssText = `
        font-size: 24px;
        color: ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      `;
      slot.appendChild(iconElement);
    }
    
    return slot;
  }

  /**
   * 创建拖拽预览元素
   */
  static createDragPreview(item: InventoryItem, x: number, y: number): HTMLElement {
    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    preview.style.left = (x - 25) + 'px';
    preview.style.top = (y - 25) + 'px';
    
    const { icon, color } = this.getItemIcon(item);
    
    const iconElement = document.createElement('div');
    iconElement.style.cssText = `
      font-size: 24px;
      color: ${color};
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
    `;
    iconElement.textContent = icon;
    
    preview.appendChild(iconElement);
    
    return preview;
  }

  /**
   * 更新物品槽显示（用于InventoryUI）
   */
  static updateInventorySlot(slot: HTMLElement, item: InventoryItem | null): void {
    const { icon, color } = this.getItemIcon(item);
    
    slot.textContent = icon;
    slot.style.color = color;
    
    // 检查是否是核心槽位（index 0）
    const isCoreSlot = slot.classList.contains('core-slot');
    if (isCoreSlot) {
      slot.style.borderColor = '#ff6600';
    } else {
      slot.style.borderColor = item ? '#00ff00' : '#333333';
    }
  }

  /**
   * 检查物品是否可以放置在指定槽位
   */
  static canPlaceInSlot(item: InventoryItem | null, _slotIndex: number, _source: string): boolean {
    // 所有槽位可放置四种物资类型
    if (!item) return true;
    const trunkTypes = ['fuel_can_small', 'fuel_can_box', 'repair_kit_small', 'battery_small'];
    return trunkTypes.includes(item.type);
  }
}
