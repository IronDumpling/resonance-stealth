/**
 * 驾驶舱主场景
 * Drive Scene
 *
 * 负责驾驶舱整体视图（挡风玻璃声纳 + 仪表盘 + 收音机 + 驾驶UI）的画布渲染入口。
 * 目前先作为占位：仅设置输入上下文与基础渲染黑底，后续由各 UI 模块与 SonarRenderer 接入。
 */

import { Scene } from './Scene';
import { SCENES, SceneData, DISPLAY_MODES } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS } from '@/types/systems';
import { IGameState } from '@/types/game';
import { CameraSystem } from '@/systems/CameraSystem';

export class DriveScene extends Scene {
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  gameState: IGameState | null = null;
  cameraSystem: CameraSystem | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    gameState?: IGameState,
    cameraSystem?: CameraSystem
  ) {
    super(SCENES.DRIVE);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.gameState = gameState || null;
    this.cameraSystem = cameraSystem || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);

    // 设置输入上下文为 DRIVE（驾驶模式）
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.TACTICAL_RADAR as INPUT_CONTEXTS | 'drive');
      // 兼容旧的 TACTICAL_RADAR 上下文，后续会在 InputManager 中显式增加 DRIVE 上下文
    }

    // 显示 gameCanvas
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.display = 'block';
    }

    // 隐藏旧的无线电/装配等 UI 容器
    const radioModeDisplay = document.getElementById('radio-mode-display');
    if (radioModeDisplay) {
      radioModeDisplay.style.display = 'none';
    }
    const assemblyContainer = document.getElementById('assembly-container');
    if (assemblyContainer) {
      assemblyContainer.style.display = 'none';
    }

    // 显示世界 UI 容器（驾驶舱 HUD 会挂在这里）
    const worldUI = document.getElementById('world-ui-container');
    if (worldUI) {
      worldUI.style.display = 'block';
    }

    // 设置显示模式为 ROBOT_DISPLAY（后续可重命名为 COCKPIT_DISPLAY）
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.ROBOT_DISPLAY);
    }

    // 相机切换到驾驶模式，并使用驾驶舱相机作为主相机
    if (this.cameraSystem) {
      this.cameraSystem.setMode('cockpit', 'drive', 0.8);
      this.cameraSystem.setActiveCamera('cockpit');
    }

    // 显示底部中控台（仪表盘、收音机、驾驶台）
    const cockpitBottom = document.getElementById('cockpit-bottom');
    if (cockpitBottom) cockpitBottom.style.display = 'flex';
  }

  override exit(): void {
    super.exit();
    const cockpitBottom = document.getElementById('cockpit-bottom');
    if (cockpitBottom) cockpitBottom.style.display = 'none';
  }

  override update(_deltaTime: number): void {
    // 占位：后续由 SurvivalSystem/VehicleSystem 驱动仪表盘与驾驶 UI 更新
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // DriveScene 只负责在挡风玻璃区域画 SONAR 画面，页面级镜头由 CameraSystem + App.tsx 处理
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 占位绘制：挡风玻璃区域 + 一个简化的 SONAR 文本
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    const w = canvas.width * 0.6;
    const h = canvas.height * 0.5;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#00ff00';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SONAR VIEW', canvas.width / 2, y + 30);
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;

    // Tab 打开后备箱（切换到 Inventory 场景）
    if (action === 'open_inventory' || key === 'tab') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.INVENTORY, 'fade');
      }
      return true;
    }

    // 其余驾驶相关输入后续在 VehicleSystem + InputManager 中处理
    return false;
  }
}

