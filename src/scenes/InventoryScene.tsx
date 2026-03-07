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

const MOVE_DEBOUNCE_MS = 120; // 短按防抖，避免一次按键触发两次移动

export class InventoryScene extends Scene {
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  gameState: IGameState | null = null;
  cameraSystem: CameraSystem | null = null;
  inventorySystem: InventorySystem | null = null;
  trunkUI: TrunkUI | null = null;
  private captureHandler: ((e: MouseEvent) => void) | null = null;
  private lastMoveAction: string = '';
  private lastMoveTime: number = 0;

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
    if (gameCanvas) gameCanvas.style.display = 'block';
    // 3D 透视下 cockpit 可能渲染在 inventory 前方，整块禁用 pointer-events 让点击穿透
    const cockpitPanel = document.getElementById('cockpit-panel');
    if (cockpitPanel) cockpitPanel.style.pointerEvents = 'none';

    // 显示并初始化后备箱 UI
    const inventoryContainer = document.getElementById('inventory-container');
    if (inventoryContainer && this.inventorySystem) {
      inventoryContainer.style.display = 'flex';
      inventoryContainer.tabIndex = -1;
      inventoryContainer.focus();

      this.trunkUI = new TrunkUI();
      this.trunkUI.init(inventoryContainer, this.inventorySystem);
      this.captureHandler = (e: MouseEvent) => {
        if (this.trunkUI?.handleGridClick(e.clientX, e.clientY)) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener('mousedown', this.captureHandler, true);
    }

    // 切换显示模式为 MENU（或单独的 INVENTORY_DISPLAY，后续可细化）
    if (this.sceneManager) {
      this.sceneManager.switchDisplayMode(DISPLAY_MODES.MENU);
    }

    // 相机切换到 inventory 模式，并使用 inventory 相机作为主相机
    if (this.cameraSystem) {
      this.cameraSystem.setMode('inventory', 'inventory', 0.6);
      this.cameraSystem.setActiveCamera('inventory');
      this.cameraSystem.setPageMode('inventory');
    }
  }

  override exit(): void {
    super.exit();
    if (this.captureHandler) {
      document.removeEventListener('mousedown', this.captureHandler, true);
      this.captureHandler = null;
    }
    if (this.trunkUI) {
      this.trunkUI.destroy();
      this.trunkUI = null;
    }

    const inventoryContainer = document.getElementById('inventory-container');
    if (inventoryContainer) {
      inventoryContainer.style.display = 'none';
      inventoryContainer.removeAttribute('tabindex');
    }

    const cockpitPanel = document.getElementById('cockpit-panel');
    if (cockpitPanel) cockpitPanel.style.pointerEvents = 'auto';
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

    // Shift 返回 Drive 场景
    if (action === 'drive' || key === 'shift') {
      if (this.sceneManager) {
        this.sceneManager.switchScene(SCENES.DRIVE, 'fade');
      }
      return true;
    }

    // QE 旋转选中物品（优先于移动处理）
    if (this.trunkUI?.getSelectedItem()) {
      if (action === 'inv_rotate_left' || key === 'q') {
        this.trunkUI.handleRotate(-1);
        return true;
      }
      if (action === 'inv_rotate_right' || key === 'e') {
        this.trunkUI.handleRotate(1);
        return true;
      }
    }

    // WASD 移动选中物品
    if (this.trunkUI?.getSelectedItem()) {
      const now = Date.now();
      const moveActions = ['inv_move_up', 'inv_move_down', 'inv_move_left', 'inv_move_right'] as const;
      if (moveActions.includes(action as any)) {
        if (this.lastMoveAction === action && now - this.lastMoveTime < MOVE_DEBOUNCE_MS) {
          return true; // 防抖：忽略短时间内的重复移动
        }
        this.lastMoveAction = action ?? '';
        this.lastMoveTime = now;
      }
      if (action === 'inv_move_up') {
        this.trunkUI.handleMove(0, -1);
        return true;
      }
      if (action === 'inv_move_down') {
        this.trunkUI.handleMove(0, 1);
        return true;
      }
      if (action === 'inv_move_left') {
        this.trunkUI.handleMove(-1, 0);
        return true;
      }
      if (action === 'inv_move_right') {
        this.trunkUI.handleMove(1, 0);
        return true;
      }
    }

    return false;
  }
}

