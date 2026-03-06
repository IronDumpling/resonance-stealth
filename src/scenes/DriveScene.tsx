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
import { CFG } from '@/config/gameConfig';

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
      this.inputManager.setContext(INPUT_CONTEXTS.TACTICAL_RADAR);
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
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 声纳画布镜头：仅跟随玩家，使用 world 相机的 x/y
    const scale = CFG.cameraFOV ?? 2.0;
    const cam = this.cameraSystem?.getCamera('world') ?? this.gameState?.camera;
    const camX = cam?.x ?? 0;
    const camY = cam?.y ?? 0;

    ctx.save();
    ctx.translate(canvas.width / 2 - camX * scale, canvas.height / 2 - camY * scale);
    ctx.scale(scale, scale);

    // 占位绘制：以玩家为中心，后续由 SonarRenderer 接入
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2 / scale;
    const halfW = 80;
    const halfH = 60;
    ctx.strokeRect(-halfW, -halfH, halfW * 2, halfH * 2);

    ctx.fillStyle = '#00ff00';
    ctx.font = `${20 / scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SONAR VIEW', 0, -halfH + 25);

    ctx.restore();
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

