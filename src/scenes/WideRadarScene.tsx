/**
 * 广域雷达场景（原RadioScene的radar map部分）
 * Wide Radar Scene (radar map part of former RadioScene)
 */

import { Scene } from './Scene';
import { SCENES, SceneData, DISPLAY_MODES } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS, IRadioSystem } from '@/types/systems';
import { WideRadarUI } from '@/ui/WideRadarUI';

export class WideRadarScene extends Scene {
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  radioSystem: IRadioSystem | null = null;
  
  // 广域雷达UI
  wideRadarUI: WideRadarUI | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    radioSystem?: IRadioSystem
  ) {
    super(SCENES.WIDE_RADAR);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.radioSystem = radioSystem || null;
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
    
    // 隐藏signal-processing-display
    const signalProcessingDisplay = document.getElementById('signal-processing-display');
    if (signalProcessingDisplay) {
      signalProcessingDisplay.style.display = 'none';
    }
    
    // 初始化并显示广域雷达UI
    this.initWideRadarUI();
    
    // 设置显示模式为RADIO_DISPLAY
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.RADIO_DISPLAY);
    }
  }

  /**
   * 初始化广域雷达UI
   */
  private initWideRadarUI(): void {
    if (!this.wideRadarUI && this.radioSystem) {
      this.wideRadarUI = new WideRadarUI(this.radioSystem);
      this.wideRadarUI.init();
      this.wideRadarUI.show();
    }
  }

  override exit(): void {
    super.exit();
    
    // 隐藏广域雷达UI
    if (this.wideRadarUI) {
      this.wideRadarUI.hide();
    }
  }

  override update(deltaTime: number): void {
    // 更新广域雷达UI
    if (this.wideRadarUI) {
      this.wideRadarUI.update(deltaTime);
    }
  }

  override render(_ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement): void {
    // 渲染雷达地图
    if (this.wideRadarUI) {
      this.wideRadarUI.render();
    }
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
