/**
 * 场景管理器
 * Scene Manager System
 */

import { ISceneManager } from '@/types/systems';
import { 
  SCENES, 
  DISPLAY_MODES, 
  RADIO_STATE,
  SceneType,
  DisplayMode,
  RadioState,
  TransitionType,
  SceneData,
  IScene,
} from '@/types/scenes';

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
    // 初始化
  }

  /**
   * 注册场景
   */
  registerScene(sceneName: SceneType, sceneInstance: IScene): void {
    this.scenes[sceneName] = sceneInstance;
    console.log(`Scene registered: ${sceneName}`);
  }

  /**
   * 切换场景
   */
  switchScene(
    targetScene: SceneType,
    transitionType: TransitionType = 'fade',
    data: SceneData = {}
  ): boolean {
    if (this.isTransitioning) {
      console.warn('Scene transition already in progress');
      return false;
    }
    
    if (!this.scenes[targetScene]) {
      console.error(`Scene not found: ${targetScene}`);
      return false;
    }
    
    console.log(`Switching scene: ${this.currentScene} -> ${targetScene}`);
    
    // 保存当前场景
    this.previousScene = this.currentScene;
    
    // 设置过渡状态
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionType = transitionType;
    
    // 调用当前场景的exit
    if (this.scenes[this.currentScene]) {
      this.scenes[this.currentScene].exit();
    }
    
    // 触发过渡开始回调
    if (this.onTransitionStart) {
      this.onTransitionStart(this.currentScene, targetScene);
    }
    
    // 保存场景切换数据
    this.sceneData[targetScene] = data;
    
    // 更新当前场景
    this.currentScene = targetScene;
    
    // 立即调用新场景的enter，确保在过渡期间可以正确渲染
    if (this.scenes[this.currentScene]) {
      this.scenes[this.currentScene].enter(data);
    }
    
    return true;
  }

  /**
   * 切换显示模式
   */
  switchDisplayMode(mode: DisplayMode, _data: SceneData = {}): boolean {
    if (!Object.values(DISPLAY_MODES).includes(mode)) {
      console.error(`Invalid display mode: ${mode}`);
      return false;
    }
    
    this.previousDisplayMode = this.displayMode;
    this.displayMode = mode;
    
    console.log(`Display mode switched: ${this.previousDisplayMode} -> ${this.displayMode}`);
    
    // Update UI visibility
    const gameCanvas = document.getElementById('gameCanvas');
    const radioModeDisplay = document.getElementById('radio-mode-display');
    
    if (mode === DISPLAY_MODES.ROBOT_DISPLAY) {
      if (gameCanvas) gameCanvas.style.display = 'block';
      if (radioModeDisplay) radioModeDisplay.style.display = 'none';
    } else if (mode === DISPLAY_MODES.RADIO_DISPLAY) {
      if (gameCanvas) gameCanvas.style.display = 'none';
      if (radioModeDisplay) {
        radioModeDisplay.style.display = 'grid';
        radioModeDisplay.classList.add('active');
      }
    } else if (mode === DISPLAY_MODES.MENU) {
      // MENU模式需要显示gameCanvas（用于渲染菜单）
      if (gameCanvas) gameCanvas.style.display = 'block';
      if (radioModeDisplay) radioModeDisplay.style.display = 'none';
    } else if (mode === DISPLAY_MODES.BOOTING) {
      // BOOTING模式隐藏canvas（由CRT动画处理）
      if (gameCanvas) gameCanvas.style.display = 'none';
      if (radioModeDisplay) radioModeDisplay.style.display = 'none';
    }
    
    return true;
  }

  /**
   * 设置无线电状态
   */
  setRadioState(state: RadioState): boolean {
    if (!Object.values(RADIO_STATE).includes(state)) {
      console.error(`Invalid radio state: ${state}`);
      return false;
    }
    
    this.radioState = state;
    console.log(`Radio state changed: ${state}`);
    return true;
  }

  /**
   * 更新场景管理器
   */
  update(deltaTime: number): void {
    // 更新过渡动画
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.isTransitioning = false;
        
        // 触发过渡结束回调
        if (this.onTransitionEnd && this.previousScene) {
          this.onTransitionEnd(this.previousScene, this.currentScene);
        }
      }
    }
    
    // 更新当前场景
    const currentSceneInstance = this.scenes[this.currentScene];
    if (currentSceneInstance) {
      currentSceneInstance.update(deltaTime);
    }
  }

  /**
   * 渲染场景
   */
  render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // 获取当前场景
    const currentSceneInstance = this.scenes[this.currentScene];
    
    if (!currentSceneInstance) {
      // 如果没有场景，渲染黑色背景
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    
    // 如果有过渡动画，应用过渡效果
    if (this.isTransitioning && this.transitionType === 'fade') {
      ctx.save();
      ctx.globalAlpha = 1 - this.transitionProgress;
      
      // 渲染当前场景
      currentSceneInstance.render(ctx, canvas);
      
      ctx.restore();
    } else {
      // 正常渲染当前场景
      currentSceneInstance.render(ctx, canvas);
    }
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
    // 可以在这里实现场景状态保存逻辑
    this.sceneData[sceneName] = { ...this.sceneData[sceneName], ...(state as SceneData) };
  }

  /**
   * 加载场景状态
   */
  loadSceneState(sceneName: SceneType): unknown | null {
    return this.sceneData[sceneName] || null;
  }
}
