/**
 * 场景类型定义
 * Scene Type Definitions
 */

import { InputEvent } from './systems';

// 场景类型枚举
export const SCENES = {
  BOOT: 'boot',
  CRT_OFF: 'crt_off',
  CRT_ON: 'crt_on',
  MONITOR_MENU: 'monitor_menu',

  DRIVE: 'drive',          // 驾驶舱主场景（挡风玻璃声纳 + 仪表盘 + 收音机 + 驾驶UI）
  INVENTORY: 'inventory',  // 后备箱/物资管理场景
} as const;

export type SceneType = typeof SCENES[keyof typeof SCENES];

// 显示器显示模式
export const DISPLAY_MODES = {
  OFF: 'off',
  BOOTING: 'booting',
  MENU: 'menu',
  RADIO_DISPLAY: 'radio_display',
  COCKPIT_DISPLAY: 'cockpit_display',  // 驾驶舱显示（原 ROBOT_DISPLAY）
} as const;

export type DisplayMode = typeof DISPLAY_MODES[keyof typeof DISPLAY_MODES];

// 无线电系统状态
export const RADIO_STATE = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
} as const;

export type RadioState = typeof RADIO_STATE[keyof typeof RADIO_STATE];

// 场景过渡类型
export type TransitionType = 'fade' | 'slide' | 'instant';

// 场景数据接口
export interface SceneData {
  [key: string]: unknown;
}

// 场景接口
export interface IScene {
  name: SceneType;
  isActive: boolean;
  
  enter(data?: SceneData): void;
  exit(): void;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void;
  handleInput?(event: InputEvent): void;
}
