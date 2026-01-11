/**
 * 战术雷达场景（原RobotScene）
 * Tactical Radar Scene (formerly RobotScene)
 */

import { Scene } from './Scene';
import { SCENES, SceneData, DISPLAY_MODES } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS } from '@/types/systems';

export class TacticalRadarScene extends Scene {
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager
  ) {
    super(SCENES.TACTICAL_RADAR);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    
    // 设置输入上下文为TACTICAL_RADAR
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.TACTICAL_RADAR);
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
    
    // 设置显示模式为ROBOT_DISPLAY
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.ROBOT_DISPLAY);
    }
  }

  override update(_deltaTime: number): void {
    // 空实现，暂时保留
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // 绘制黑色背景（暂时，后续会实现完整渲染）
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;
    
    // ESC键返回MonitorMenuScene
    if (action === 'menu' || key === 'escape') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.MONITOR_MENU, 'fade');
      }
      return true;
    }
    
    // 切换到WIDE_RADAR场景
    if (action === 'wide_radar' || key === 'm') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.WIDE_RADAR, 'fade');
      }
      return true;
    }
    
    // 切换到SIGNAL_PROCESSING场景
    if (action === 'signal_processing' || key === 'p') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.SIGNAL_PROCESSING, 'fade');
      }
      return true;
    }
    
    return false;
  }
}
