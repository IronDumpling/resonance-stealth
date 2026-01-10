/**
 * 系统类型定义
 * System Type Definitions
 */

import { SceneType, DisplayMode, RadioState, TransitionType, SceneData, IScene } from './scenes';

// 输入上下文类型
export const INPUT_CONTEXTS = {
  NONE: 'none',
  CRT_CONTROL: 'crt_control',
  MENU: 'menu',
  ROBOT: 'robot',
  RADIO: 'radio',
  ROBOT_ASSEMBLY: 'robot_assembly',
} as const;

export type InputContext = typeof INPUT_CONTEXTS[keyof typeof INPUT_CONTEXTS];

// 输入事件类型
export interface InputEvent {
  originalEvent?: KeyboardEvent | MouseEvent | WheelEvent;
  key?: string;
  action?: string;
  context?: InputContext;
  x?: number;
  y?: number;
  delta?: number;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  button?: number;
}

// 输入管理器接口
export interface IInputManager {
  currentContext: InputContext;
  activeKeys: Set<string>;
  mouseState: IMouseState;
  
  setContext(context: InputContext): void;
  getContext(): InputContext;
  getAction(key: string): string | null;
  isKeyDown(key: string): boolean;
  isActionActive(action: string): boolean;
  on(eventType: string, context: InputContext | null, callback: (event: InputEvent) => void): void;
  off(eventType: string, context: InputContext | null, callback: (event: InputEvent) => void): void;
  getMouseState(): IMouseState;
  reset(): void;
}

// 鼠标状态接口
export interface IMouseState {
  x: number;
  y: number;
  buttons: boolean[];
  wheelDelta: number;
}

// 场景管理器接口
export interface ISceneManager {
  currentScene: SceneType;
  previousScene: SceneType | null;
  displayMode: DisplayMode;
  radioState: RadioState;
  isTransitioning: boolean;
  transitionProgress: number;
  
  registerScene(sceneName: SceneType, sceneInstance: IScene): void;
  switchScene(targetScene: SceneType, transitionType?: TransitionType, data?: SceneData): boolean;
  switchDisplayMode(mode: DisplayMode, data?: SceneData): boolean;
  setRadioState(state: RadioState): boolean;
  update(deltaTime: number): void;
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void;
  getCurrentScene(): SceneType;
  getScene(sceneName: SceneType): IScene | undefined;
  saveSceneState(sceneName: SceneType, state: unknown): void;
  loadSceneState(sceneName: SceneType): unknown | null;
}

// 游戏系统接口
export interface IGameSystem {
  update(deltaTime: number): void;
  init(): void;
}

// 无线电系统接口
export interface IRadioSystem {
  update(deltaTime: number): void;
  setFrequencyRange(min: number, max: number): void;
  syncWithRobotFrequency(freq: number): void;
}

// 背包系统接口
export interface IInventorySystem {
  addItem(item: unknown): boolean;
  removeItem(index: number): boolean;
  getItems(): unknown[];
}

// 天线系统接口
export interface IAntennaSystem {
  updateDirection(angle: number): void;
  detectReflectedWaves(waves: unknown[], x: number, y: number): unknown[];
}

// SLAM系统接口
export interface ISLAMSystem {
  addPointsFromReflections(reflections: unknown[]): void;
  getPoints(): unknown[];
}

// UI管理器接口
export interface IUIManager {
  createElement(id: string, options?: UIElementOptions): HTMLElement | null;
  getElement(id: string): HTMLElement | null;
  show(id: string, animation?: string): void;
  hide(id: string, animation?: string): void;
  toggle(id: string, animation?: string): void;
  updateContent(id: string, content: string, isHTML?: boolean): void;
  updateStyle(id: string, styles: Partial<CSSStyleDeclaration>): void;
  removeElement(id: string): void;
  clearLayer(layerName: string): void;
  showNotification(message: string, duration?: number, type?: string): void;
  update(deltaTime: number): void;
}

// UI元素选项接口
export interface UIElementOptions {
  tag?: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  html?: string;
  text?: string;
  layer?: string;
  interactive?: boolean;
  visible?: boolean;
}
