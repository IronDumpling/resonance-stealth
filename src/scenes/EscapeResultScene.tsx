/**
 * 撤离结果场景
 * Escape Result Scene
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS } from '@/types/systems';

export class EscapeResultScene extends Scene {
  success: boolean = false;
  message: string = '';
  
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  gameState: { currentMessage: string; messageTimer: number } | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    gameState?: { currentMessage: string; messageTimer: number }
  ) {
    super(SCENES.ESCAPE_RESULT);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.gameState = gameState || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    
    // 设置输入上下文为ESCAPE_RESULT
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.ESCAPE_RESULT);
    }
    
    // 从data中读取结果状态
    if (data) {
      this.success = (data.success as boolean) ?? false;
      this.message = (data.message as string) || '';
    }
    
    // 显示gameCanvas
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.display = 'block';
    }
    
    // 隐藏radio-mode-display
    const radioModeDisplay = document.getElementById('radio-mode-display');
    if (radioModeDisplay) {
      radioModeDisplay.style.display = 'none';
    }
  }

  override update(_deltaTime: number): void {
    // 空实现
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // 清空画布
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制结果标题
    ctx.fillStyle = this.success ? '#00ff00' : '#ff0000';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const titleText = this.success ? 'ESCAPE SUCCESS' : 'ESCAPE FAILED';
    ctx.fillText(titleText, canvas.width / 2, canvas.height * 0.3);
    
    // 绘制消息（如果有）
    if (this.message) {
      ctx.fillStyle = '#00aa00';
      ctx.font = '24px monospace';
      ctx.fillText(this.message, canvas.width / 2, canvas.height * 0.45);
    }
    
    // 绘制提示信息
    ctx.fillStyle = '#00ff00';
    ctx.font = '20px monospace';
    ctx.fillText('Press ENTER to return to Robot Assembly', canvas.width / 2, canvas.height * 0.7);
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;
    
    // 切换到ROBOT_ASSEMBLY场景
    if (action === 'robot_assembly' || key === 'enter') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.ROBOT_ASSEMBLY, 'fade');
      }
      return true;
    }
    
    return false;
  }
}
