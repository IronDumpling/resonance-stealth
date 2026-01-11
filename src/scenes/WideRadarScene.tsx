/**
 * 广域雷达场景（原RadioScene的radar map部分）
 * Wide Radar Scene (radar map part of former RadioScene)
 */

import { Scene } from './Scene';
import { SCENES, SceneData, DISPLAY_MODES } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS } from '@/types/systems';

export class WideRadarScene extends Scene {
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager
  ) {
    super(SCENES.WIDE_RADAR);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    
    // 设置输入上下文为WIDE_RADAR
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.WIDE_RADAR);
    }
    
    // 隐藏gameCanvas
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.display = 'none';
    }
    
    // 显示radio-mode-display
    const radioModeDisplay = document.getElementById('radio-mode-display');
    if (radioModeDisplay) {
      radioModeDisplay.style.display = 'grid';
      radioModeDisplay.classList.add('active');
    }
    
    // 设置显示模式为RADIO_DISPLAY
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.RADIO_DISPLAY);
    }
  }

  override update(_deltaTime: number): void {
    // 空实现（使用DOM渲染）
  }

  override render(_ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement): void {
    // 空实现（使用DOM渲染）
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
    
    // 切换到TACTICAL_RADAR场景
    if (action === 'tactical_radar' || key === 'tab') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.TACTICAL_RADAR, 'fade');
      }
      return true;
    }
    
    return false;
  }
}
