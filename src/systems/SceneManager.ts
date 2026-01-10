/**
 * 场景管理器
 * Scene Manager System
 * 
 * 保留结构，移除业务逻辑
 */

import {
  ISceneManager,
  SceneType,
  DisplayMode,
  RadioState,
  TransitionType,
  SceneData,
  IScene,
} from '@/types/systems';
import { SCENES, DISPLAY_MODES, RADIO_STATE } from '@/types/scenes';

export class SceneManager implements ISceneManager {
  currentScene: SceneType = SCENES.BOOT;
  previousScene: SceneType | null = null;
  displayMode: DisplayMode = DISPLAY_MODES.OFF;
  radioState: RadioState = RADIO_STATE.INACTIVE;
  previousDisplayMode: DisplayMode | null = null;
  isTransitioning: boolean = false;
  transitionProgress: number = 0;
  transitionDuration: number = 0.3;
  transitionType: TransitionType = 'fade';
  
  scenes: Record<SceneType, IScene> = {} as Record<SceneType, IScene>;
  sceneData: Record<SceneType, SceneData> = {} as Record<SceneType, SceneData>;
  
  onTransitionStart: ((from: SceneType, to: SceneType) => void) | null = null;
  onTransitionEnd: ((from: SceneType, to: SceneType) => void) | null = null;

  constructor() {
    // 空实现，保留结构
  }

  /**
   * 注册场景
   */
  registerScene(sceneName: SceneType, sceneInstance: IScene): void {
    this.scenes[sceneName] = sceneInstance;
    // 空实现，保留方法签名
  }

  /**
   * 切换场景
   */
  switchScene(
    targetScene: SceneType,
    transitionType: TransitionType = 'fade',
    data: SceneData = {}
  ): boolean {
    // 空实现，保留方法签名
    return false;
  }

  /**
   * 切换显示模式
   */
  switchDisplayMode(mode: DisplayMode, data: SceneData = {}): boolean {
    // 空实现，保留方法签名
    return false;
  }

  /**
   * 设置无线电状态
   */
  setRadioState(state: RadioState): boolean {
    // 空实现，保留方法签名
    return false;
  }

  /**
   * 更新场景管理器
   */
  update(deltaTime: number): void {
    // 空实现，保留方法签名
  }

  /**
   * 渲染场景
   */
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // 空实现，保留方法签名
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): SceneType {
    return this.currentScene;
  }

  /**
   * 获取场景实例
   */
  getScene(sceneName: SceneType): IScene | undefined {
    return this.scenes[sceneName];
  }

  /**
   * 保存场景状态
   */
  saveSceneState(sceneName: SceneType, state: unknown): void {
    // 空实现，保留方法签名
  }

  /**
   * 加载场景状态
   */
  loadSceneState(sceneName: SceneType): unknown | null {
    // 空实现，保留方法签名
    return null;
  }
}
