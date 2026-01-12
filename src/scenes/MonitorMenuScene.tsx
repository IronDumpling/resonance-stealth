/**
 * 监视器菜单场景
 * Monitor Menu Scene - 模式选择
 */

import { Scene } from './Scene';
import { SCENES, SceneData, DISPLAY_MODES } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { CrtRenderer } from '@/rendering/CrtRenderer';
import { INPUT_CONTEXTS } from '@/types/systems';
import { logMsg } from '@/utils';

interface MenuOption {
  id: string;
  label: string;
}

export class MonitorMenuScene extends Scene {
  selectedOption: number = 0;
  options: MenuOption[] = [
    { id: 'robot_assembly', label: '1. ROBOT_ASSEMBLY' },
    { id: 'power_off', label: '2. POWER_OFF' }
  ];
  blinkTimer: number = 0;
  showCursor: boolean = true;
  
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  crtRenderer: CrtRenderer | null = null;
  gameState: { currentMessage: string; messageTimer: number } | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    crtRenderer?: CrtRenderer,
    gameState?: { currentMessage: string; messageTimer: number }
  ) {
    super(SCENES.MONITOR_MENU);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.crtRenderer = crtRenderer || null;
    this.gameState = gameState || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    this.selectedOption = 0;
    
    // 设置输入上下文为MENU
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.MENU);
    }
    
    // 确保gameCanvas可见（MENU模式需要显示canvas）
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.display = 'block';
    }
    
    // 隐藏其他UI元素
    const radioModeDisplay = document.getElementById('radio-mode-display');
    if (radioModeDisplay) radioModeDisplay.style.display = 'none';
    
    const assemblyContainer = document.getElementById('assembly-container');
    if (assemblyContainer) {
      assemblyContainer.classList.remove('active');
      assemblyContainer.style.display = 'none';
    }
    
    // Set display mode to MENU
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.MENU);
    }
    
    if (this.gameState) {
      logMsg("SELECT: [1] ROBOT_ASSEMBLY | [2] POWER_OFF", this.gameState);
    }
  }

  override update(deltaTime: number): void {
    // Blink cursor
    this.blinkTimer += deltaTime;
    if (this.blinkTimer >= 0.5) {
      this.showCursor = !this.showCursor;
      this.blinkTimer = 0;
    }
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // Clear screen
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ARC_OS v4.0.2', canvas.width / 2, canvas.height * 0.25);
    
    // Draw separator
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.3, canvas.height * 0.3);
    ctx.lineTo(canvas.width * 0.7, canvas.height * 0.3);
    ctx.stroke();
    
    // Draw options
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    
    const startY = canvas.height * 0.4;
    const lineHeight = 50;
    
    this.options.forEach((option, index) => {
      const y = startY + index * lineHeight;
      const isSelected = index === this.selectedOption;
      
      // Draw cursor for selected option
      if (isSelected && this.showCursor) {
        ctx.fillStyle = '#00ff00';
        ctx.fillText('>', canvas.width * 0.3 - 30, y);
      }
      
      // Draw option text
      ctx.fillStyle = isSelected ? '#00ff00' : '#00aa00';
      if (isSelected) {
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
      }
      ctx.fillText(option.label, canvas.width * 0.3, y);
      ctx.shadowBlur = 0;
    });
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;
    
    // 使用 action 或 key 处理输入
    if (action === 'select_robot_assembly' || key === '1') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.ROBOT_ASSEMBLY, 'fade');
      }
      return true;
    }
    
    if (action === 'select_power_off' || key === '2') {
      // 触发CRT关机动画
      if (this.crtRenderer) {
        this.crtRenderer.powerOff();
      }
      // 等待关机动画完成后切换场景
      setTimeout(() => {
        if (this.sceneManager) {
          this.sceneManager.switchScene(SCENES.CRT_OFF, 'instant');
        }
      }, 1000);
      return true;
    }
    
    // Arrow key navigation
    if (action === 'navigate_up' || key === 'arrowup') {
      this.selectedOption = Math.max(0, this.selectedOption - 1);
      return true;
    }
    if (action === 'navigate_down' || key === 'arrowdown') {
      this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
      return true;
    }
    
    // Enter to confirm selected option
    if (action === 'confirm' || key === 'enter') {
      const option = this.options[this.selectedOption];
      if (option.id === 'robot_assembly') {
        if (this.sceneManager) {
          this.sceneManager.switchScene(SCENES.ROBOT_ASSEMBLY, 'fade');
        }
      } else if (option.id === 'power_off') {
        // 触发CRT关机动画
        if (this.crtRenderer) {
          this.crtRenderer.powerOff();
        }
        // 等待关机动画完成后切换场景
        setTimeout(() => {
          if (this.sceneManager) {
            this.sceneManager.switchScene(SCENES.CRT_OFF, 'instant');
          }
        }, 1000);
      }
      return true;
    }
    
    return false;
  }
}
