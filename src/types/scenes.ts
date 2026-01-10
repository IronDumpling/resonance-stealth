/**
 * 场景类型定义
 * Scene Type Definitions
 */

// 场景类型枚举
export const SCENES = {
  BOOT: 'boot',
  CRT_OFF: 'crt_off',
  CRT_ON: 'crt_on',
  TACTICAL_RADAR: 'tactical_radar',  // 原 ROBOT
  WIDE_RADAR: 'wide_radar',          // 原 RADIO 的 radar map 部分
  SIGNAL_PROCESSING: 'signal_processing', // 原 RADIO 的 morse code + signal record + signal editing
  ROBOT_ASSEMBLY: 'robot_assembly',
  MONITOR_MENU: 'monitor_menu',
} as const;

export type SceneType = typeof SCENES[keyof typeof SCENES];

// 显示器显示模式
export const DISPLAY_MODES = {
  OFF: 'off',
  BOOTING: 'booting',
  MENU: 'menu',
  RADIO_DISPLAY: 'radio_display',
  ROBOT_DISPLAY: 'robot_display',
  ASSEMBLY_DISPLAY: 'assembly_display',
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
