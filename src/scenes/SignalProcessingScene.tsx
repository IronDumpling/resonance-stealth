/**
 * 信号处理场景（原RadioScene的morse code + signal record + signal editing）
 * Signal Processing Scene (morse code + signal record + signal editing part of former RadioScene)
 */

import { Scene } from './Scene';
import { SCENES, SceneData, DISPLAY_MODES } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS, IRadioSystem } from '@/types/systems';
import { SignalProcessingUI } from '@/ui/SignalProcessingUI';

export class SignalProcessingScene extends Scene {
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  radioSystem: IRadioSystem | null = null;
  
  // 信号处理UI
  signalProcessingUI: SignalProcessingUI | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    radioSystem?: IRadioSystem
  ) {
    super(SCENES.SIGNAL_PROCESSING);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.radioSystem = radioSystem || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    
    // 设置输入上下文为SIGNAL_PROCESSING
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.SIGNAL_PROCESSING);
    }
    
    // 隐藏gameCanvas
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.display = 'none';
    }
    
    // 隐藏wide-radar-display
    const wideRadarDisplay = document.getElementById('wide-radar-display');
    if (wideRadarDisplay) {
      wideRadarDisplay.style.display = 'none';
    }
    
    // 显示signal-processing-display
    const signalProcessingDisplay = document.getElementById('signal-processing-display');
    if (signalProcessingDisplay) {
      signalProcessingDisplay.style.display = 'grid';
      signalProcessingDisplay.classList.add('active');
    }
    
    // 初始化信号处理UI
    this.initSignalProcessingUI();
    
    // 设置显示模式为RADIO_DISPLAY
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.RADIO_DISPLAY);
    }
  }

  /**
   * 初始化信号处理UI
   */
  private initSignalProcessingUI(): void {
    if (!this.signalProcessingUI && this.radioSystem) {
      this.signalProcessingUI = new SignalProcessingUI(this.radioSystem);
      this.signalProcessingUI.init();
      this.signalProcessingUI.show();
    }
  }

  override exit(): void {
    super.exit();
    
    // 隐藏信号处理UI
    if (this.signalProcessingUI) {
      this.signalProcessingUI.hide();
    }
  }

  override update(deltaTime: number): void {
    // 更新信号处理UI
    if (this.signalProcessingUI) {
      this.signalProcessingUI.update(deltaTime);
    }
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
    if (action === 'tactical_radar' || key === 'capslock' || key === 'caps') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.TACTICAL_RADAR, 'fade');
      }
      return true;
    }
    
    return false;
  }
}
