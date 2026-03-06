/**
 * 后备箱/物资管理场景
 * Inventory Scene
 *
 * 负责显示后备箱格子与相关物资操作。
 */

import { Scene } from './Scene';
import { SCENES, SceneData, DISPLAY_MODES } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS } from '@/types/systems';
import { IGameState } from '@/types/game';
import { CameraSystem } from '@/systems/CameraSystem';
import type { InventorySystem } from '@/systems/InventorySystem';
import { TrunkUI } from '@/ui/TrunkUI';

export class InventoryScene extends Scene {
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  gameState: IGameState | null = null;
  cameraSystem: CameraSystem | null = null;
  inventorySystem: InventorySystem | null = null;
  trunkUI: TrunkUI | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    gameState?: IGameState,
    cameraSystem?: CameraSystem,
    inventorySystem?: InventorySystem
  ) {
    super(SCENES.INVENTORY);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.gameState = gameState || null;
    this.cameraSystem = cameraSystem || null;
    this.inventorySystem = inventorySystem || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);

    // 回头看后备箱时隐藏底部中控台与方向盘
    const cockpitBottom = document.getElementById('cockpit-bottom');
    const cockpitSteering = document.getElementById('cockpit-steering');
    if (cockpitBottom) cockpitBottom.style.display = 'none';
    if (cockpitSteering) cockpitSteering.style.display = 'none';

    // 设置输入上下文为 INVENTORY（后备箱操作）
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.INVENTORY);
    }

    // 显示 gameCanvas（可用于未来在后视镜/后备箱上画东西）
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
      gameCanvas.style.display = 'block';
    }

    // 显示并初始化后备箱 UI
    const inventoryContainer = document.getElementById('inventory-container');
    if (inventoryContainer && this.inventorySystem) {
      inventoryContainer.style.display = 'flex';
      this.trunkUI = new TrunkUI();
      this.trunkUI.init(inventoryContainer, this.inventorySystem);
    }

    // 切换显示模式为 MENU（或单独的 INVENTORY_DISPLAY，后续可细化）
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.MENU);
    }

    // 相机切换到 inventory 模式，并使用 inventory 相机作为主相机
    if (this.cameraSystem) {
      this.cameraSystem.setMode('inventory', 'inventory', 0.6);
      this.cameraSystem.setActiveCamera('inventory');
    }
  }

  override exit(): void {
    super.exit();

    if (this.trunkUI) {
      this.trunkUI.destroy();
      this.trunkUI = null;
    }

    const inventoryContainer = document.getElementById('inventory-container');
    if (inventoryContainer) {
      inventoryContainer.style.display = 'none';
    }
  }

  override update(_deltaTime: number): void {
    // 占位：后续可在这里驱动物资 UI 的动画与状态刷新
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // Inventory 场景主要使用 DOM 渲染后备箱格子，这里提供一个暗色背景和占位标题
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff00';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TRUNK / INVENTORY', canvas.width / 2, canvas.height / 2);
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;

    // Tab 返回 Drive 场景（镜头向右 180° 的动画后续由 CameraSystem 处理）
    if (action === 'drive' || key === 'tab') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.DRIVE, 'fade');
      }
      return true;
    }

    return false;
  }
}

