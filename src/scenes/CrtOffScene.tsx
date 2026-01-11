/**
 * CRT关闭场景
 * CRT Off Scene
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS } from '@/types/systems';
import { logMsg } from '@/utils';

export class CrtOffScene extends Scene {
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  gameState: { currentMessage: string; messageTimer: number } | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    gameState?: { currentMessage: string; messageTimer: number }
  ) {
    super(SCENES.CRT_OFF);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.gameState = gameState || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    
    // 设置输入上下文为CRT_CONTROL
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.CRT_CONTROL);
    }
    
    // 显示提示信息
    if (this.gameState) {
      logMsg("PRESS [ENTER] TO RESTART", this.gameState);
    }
  }

  override update(_deltaTime: number): void {
    // 等待用户按键开机
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // 黑屏
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 显示微弱的待机指示灯
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(0, 255, 0, ${pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(20, 20, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;
    
    // Enter键重启到BootScene
    if (action === 'confirm' || key === 'enter') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.BOOT, 'fade');
      }
      return true;
    }
    return false;
  }
}
