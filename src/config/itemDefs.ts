/**
 * 物品定义配置
 * Item Definitions
 */

import type { IItemDef, ItemType } from '@/types/entities';

export const ITEM_DEFS: Record<ItemType, IItemDef> = {
  // 小瓶87号燃油：高2格宽1格，不可堆叠，使用添加少量燃油
  fuel_can_small: {
    id: 'fuel_can_small',
    name: '小瓶87号燃油',
    width: 1,
    height: 2,
    stackMax: 1,
    icon: '⛽',
    color: '#f97316',
    useEffect: 'fuel_small',
    useAmount: 15,
  },
  // 小箱87号燃油：高2格宽2格，不可堆叠，使用添加中量燃油
  fuel_can_box: {
    id: 'fuel_can_box',
    name: '小箱87号燃油',
    width: 2,
    height: 2,
    stackMax: 1,
    icon: '🛢',
    color: '#ea580c',
    useEffect: 'fuel_medium',
    useAmount: 40,
  },
  // 小修复材料：高1格宽1格，最多堆叠10，用于修复车辆完整度
  repair_kit_small: {
    id: 'repair_kit_small',
    name: '小修复材料',
    width: 1,
    height: 1,
    stackMax: 10,
    icon: '🔧',
    color: '#22c55e',
    useEffect: 'repair',
    useAmount: 10,
  },
  // 小电池：高1格宽1格，最多堆叠5，用于给电瓶充电
  battery_small: {
    id: 'battery_small',
    name: '小电池',
    width: 1,
    height: 1,
    stackMax: 5,
    icon: '▣',
    color: '#eab308',
    useEffect: 'charge',
    useAmount: 15,
  },
};

export function getItemDef(type: ItemType | string): IItemDef | undefined {
  return type in ITEM_DEFS ? ITEM_DEFS[type as ItemType] : undefined;
}
