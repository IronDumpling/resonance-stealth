/**
 * CRT开启场景
 * CRT On Scene - 开机动画
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { CrtRenderer } from '@/rendering/CrtRenderer';
import { INPUT_CONTEXTS } from '@/types/systems';

export class CrtOnScene extends Scene {
  animationStarted: boolean = false;
  animationComplete: boolean = false;
  
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  crtRenderer: CrtRenderer | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    crtRenderer?: CrtRenderer
  ) {
    super(SCENES.CRT_ON);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.crtRenderer = crtRenderer || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    this.animationStarted = false;
    this.animationComplete = false;
    
    // 设置输入上下文为CRT_CONTROL
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.CRT_CONTROL);
    }
    
    // 触发CRT开机动画
    if (this.crtRenderer) {
      if (!this.crtRenderer.isPoweredOn && !this.crtRenderer.isTransitioning) {
        this.crtRenderer.powerOn();
        this.animationStarted = true;
      } else if (this.crtRenderer.isPoweredOn && !this.crtRenderer.isTransitioning) {
        // 如果已经开机且不在过渡中，直接完成并切换
        this.animationComplete = true;
        this.animationStarted = true;
        // 延迟一帧切换，确保场景正确初始化
        setTimeout(() => {
          if (this.sceneManager && this.sceneManager.getCurrentScene() === SCENES.CRT_ON) {
            this.sceneManager.switchScene(SCENES.MONITOR_MENU, 'fade');
          }
        }, 50);
      } else if (this.crtRenderer.isTransitioning) {
        this.animationStarted = true;
      }
    }
  }

  override update(deltaTime: number): void {
    // 检查开机动画是否完成
    if (this.crtRenderer && this.animationStarted && !this.animationComplete) {
      const isComplete = this.crtRenderer.isPoweredOn && !this.crtRenderer.isTransitioning;
      
      if (isComplete) {
        // 动画完成，自动跳转到主菜单
        this.animationComplete = true;
        // 使用 setTimeout 确保在下一帧切换，避免在同一帧中多次调用
        setTimeout(() => {
          if (this.sceneManager && this.sceneManager.getCurrentScene() === SCENES.CRT_ON) {
            this.sceneManager.switchScene(SCENES.MONITOR_MENU, 'fade');
          }
        }, 50);
      }
    }
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // 开机动画由 crtRenderer 系统渲染
    // 这里只渲染黑色背景（动画会覆盖）
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;
    
    // 允许按任意键（confirm action 或任意键）跳过动画，直接进入主菜单
    if (this.crtRenderer && this.crtRenderer.isTransitioning && (action === 'confirm' || key)) {
      // 如果动画正在进行，可以跳过
      if (this.sceneManager) {
        // 强制完成动画
        this.crtRenderer.isTransitioning = false;
        this.crtRenderer.isPoweredOn = true;
        this.crtRenderer.powerTransitionProgress = 1.0;
        this.sceneManager.switchScene(SCENES.MONITOR_MENU, 'fade');
      }
      return true;
    }
    return false;
  }
}
