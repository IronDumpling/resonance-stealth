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
import { InventorySystem } from '@/systems/InventorySystem';
import { CFG, STEERING_RATIO } from '@/config/gameConfig';

const PICKUP_RANGE = 80;

export class DriveScene extends Scene {
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  gameState: IGameState | null = null;
  cameraSystem: CameraSystem | null = null;
  inventorySystem: InventorySystem | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    gameState?: IGameState,
    cameraSystem?: CameraSystem,
    inventorySystem?: InventorySystem
  ) {
    super(SCENES.DRIVE);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.gameState = gameState || null;
    this.cameraSystem = cameraSystem || null;
    this.inventorySystem = inventorySystem || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);

    if (this.gameState) {
      this.gameState.currentScene = SCENES.DRIVE;
    }

    // 设置输入上下文为 DRIVE（驾驶模式）
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.DRIVE);
    }

    // 显示 gameCanvas
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.display = 'block';
    }

    // 隐藏旧的无线电 UI 容器
    const radioModeDisplay = document.getElementById('radio-mode-display');
    if (radioModeDisplay) {
      radioModeDisplay.style.display = 'none';
    }

    // 显示世界 UI 容器（驾驶舱 HUD 会挂在这里）
    const worldUI = document.getElementById('world-ui-container');
    if (worldUI) {
      worldUI.style.display = 'block';
    }

    // 设置显示模式为驾驶舱
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.COCKPIT_DISPLAY);
    }

    // 相机切换到驾驶模式，并使用驾驶舱相机作为主相机
    if (this.cameraSystem) {
      this.cameraSystem.setMode('cockpit', 'drive', 0.8);
      this.cameraSystem.setActiveCamera('cockpit');
      this.cameraSystem.setPageMode('drive');
    }

    // 显示底部中控台与方向盘（Drive 模式）
    const cockpitBottom = document.getElementById('cockpit-bottom');
    const cockpitSteering = document.getElementById('cockpit-steering');
    if (cockpitBottom) cockpitBottom.style.display = 'block';
    if (cockpitSteering) cockpitSteering.style.display = 'block';
  }

  override exit(): void {
    super.exit();
    if (this.gameState) {
      this.gameState.currentScene = undefined;
    }
    const cockpitBottom = document.getElementById('cockpit-bottom');
    const cockpitSteering = document.getElementById('cockpit-steering');
    if (cockpitBottom) cockpitBottom.style.display = 'none';
    if (cockpitSteering) cockpitSteering.style.display = 'none';
  }

  override update(_deltaTime: number): void {
    // 占位：后续由 SurvivalSystem/VehicleSystem 驱动仪表盘与驾驶 UI 更新
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 优先使用 SceneManager 传入的最新 gameState（每帧更新），避免闭包陈旧
    const state = (this.sceneManager as { gameState?: IGameState | null })?.gameState ?? this.gameState;
    const scale = CFG.cameraFOV ?? 2.0;
    const cam = this.cameraSystem?.getCamera('sonar') ?? this.cameraSystem?.getCamera('world') ?? state?.camera;
    const camX = cam?.x ?? 0;
    const camY = cam?.y ?? 0;
    const p = state?.p;
    const entities = state?.entities;
    const viewMode = state?.sonarViewMode ?? 'fog';
    if (!p) return;

    ctx.save();
    ctx.translate(canvas.width / 2 - camX * scale, canvas.height / 2 - camY * scale);
    ctx.scale(scale, scale);

    // 明亮模式：绘制障碍物与物资
    if (viewMode === 'bright' && entities) {
      // 障碍物
      ctx.fillStyle = '#444444';
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2 / scale;
      for (const obs of entities.obstacles) {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      }
      // 物资点
      for (const item of entities.groundItems) {
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#aaaaaa';
        ctx.stroke();
        // 玩家靠近时显示 E
        const dist = Math.hypot(item.x - p.x, item.y - p.y);
        if (dist < PICKUP_RANGE) {
          ctx.fillStyle = '#00ff00';
          ctx.font = `${24 / scale}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('E', item.x, item.y - 28);
        }
      }
    }

    // 玩家：等腰三角形，顶点指向车辆朝向（p.a 行驶时更新；静止时叠加方向盘角）
    const size = 12;
    const vehicle = state?.vehicle;
    const steeringRad = vehicle ? (vehicle.steeringAngle * Math.PI / 180) / STEERING_RATIO : 0;
    const displayAngle = (p?.a ?? 0) + steeringRad;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(displayAngle);
    ctx.beginPath();
    ctx.moveTo(0, -size);      // 顶点（车头方向）
    ctx.lineTo(-size * 0.6, size);
    ctx.lineTo(size * 0.6, size);
    ctx.closePath();
    ctx.fillStyle = '#00ff00';
    ctx.fill();
    ctx.strokeStyle = '#00cc00';
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;

    // Shift 打开后备箱（切换到 Inventory 场景）
    if (action === 'inventory' || key === 'shift') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.INVENTORY, 'fade');
      }
      return true;
    }

    // L 键：明亮/迷雾模式切换（开发者专用）
    if (action === 'toggle_map_visibility' || key === 'l') {
      if (this.gameState) {
        this.gameState.sonarViewMode = this.gameState.sonarViewMode === 'bright' ? 'fog' : 'bright';
      }
      return true;
    }

    // E 键：拾取物资
    if (action === 'interact' || key === 'e') {
      const nearest = this.getNearestPickableItem();
      if (nearest && this.inventorySystem) {
        this.inventorySystem.pickFromGround(nearest);
        return true;
      }
    }

    // 其余驾驶相关输入后续在 VehicleSystem + InputManager 中处理
    return false;
  }

  private getNearestPickableItem() {
    const p = this.gameState?.p;
    const items = this.gameState?.entities?.groundItems;
    if (!p || !items?.length) return null;
    let nearest: (typeof items)[0] | null = null;
    let minDist = PICKUP_RANGE;
    for (const item of items) {
      const d = Math.hypot(item.x - p.x, item.y - p.y);
      if (d < minDist) {
        minDist = d;
        nearest = item;
      }
    }
    return nearest;
  }
}

