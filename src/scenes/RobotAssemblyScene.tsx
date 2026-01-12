/**
 * 机器人组装场景
 * Robot Assembly Scene
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { INPUT_CONTEXTS } from '@/types/systems';
import { INSTRUCTIONS } from '@/config/gameConfig';
import { logMsg } from '@/utils';
import { IGameState } from '@/types/game';
import { RobotAssemblyUI } from '@/ui/RobotAssemblyUI';
import { ItemSlotUI } from '@/ui/ItemSlotUI';

interface InventoryItem {
  type: string;
  coreType?: string;
  data?: unknown;
  id?: string;
}

interface Warehouse {
  items: (InventoryItem | null)[];
  maxSize: number;
}

interface DragState {
  isDragging: boolean;
  source: string | null; // 'warehouse' or 'inventory'
  sourceIndex: number | null;
  item: InventoryItem | null;
  previewElement: HTMLElement | null;
}

export class RobotAssemblyScene extends Scene {
  container: HTMLElement | null = null;
  warehouseGrid: HTMLElement | null = null;
  inventoryGrid: HTMLElement | null = null;
  instructionsList: HTMLElement | null = null;
  departureBtn: HTMLElement | null = null;
  robotCanvas: HTMLCanvasElement | null = null;
  robotCtx: CanvasRenderingContext2D | null = null;
  
  // 拖拽状态
  dragState: DragState = {
    isDragging: false,
    source: null,
    sourceIndex: null,
    item: null,
    previewElement: null
  };
  
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  warehouse: Warehouse | null = null;
  playerInventory: (InventoryItem | null)[] | null = null;
  playerCurrentCore: unknown | null = null;
  gameState: IGameState | null = null;
  robotAssemblyUI: RobotAssemblyUI | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    warehouse?: Warehouse,
    playerInventory?: (InventoryItem | null)[],
    playerCurrentCore?: unknown,
    gameState?: IGameState
  ) {
    super(SCENES.ROBOT_ASSEMBLY);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.warehouse = warehouse || null;
    this.playerInventory = playerInventory || null;
    this.playerCurrentCore = playerCurrentCore || null;
    this.gameState = gameState || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    
    // 设置输入上下文为ROBOT_ASSEMBLY
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.ROBOT_ASSEMBLY);
    }
    
    // 显示Assembly容器
    this.container = document.getElementById('assembly-container');
    if (this.container) {
      this.container.classList.add('active');
      this.container.style.display = 'flex';
    }
    
    // 获取UI元素
    this.warehouseGrid = document.getElementById('warehouse-grid');
    this.inventoryGrid = document.getElementById('robot-inventory-grid');
    this.instructionsList = document.getElementById('instructions-list');
    this.departureBtn = document.getElementById('btn-departure');
    this.robotCanvas = document.getElementById('robot-canvas') as HTMLCanvasElement | null;
    
    if (this.robotCanvas) {
      this.robotCtx = this.robotCanvas.getContext('2d');
    }
    
    // 初始化UI
    this.initWarehouseGrid();
    this.initInventoryGrid();
    this.initInstructions();
    this.bindEvents();
    
    // 更新departure按钮状态
    this.updateDepartureButton();
    
    // 显示workstation UI（确保CRT monitor可见）
    const workstationContainer = document.getElementById('workstation-container');
    if (workstationContainer) workstationContainer.style.display = 'flex';
    
    // 隐藏游戏canvas和其他UI
    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) gameCanvas.style.display = 'none';
    
    const radioModeDisplay = document.getElementById('radio-mode-display');
    if (radioModeDisplay) radioModeDisplay.style.display = 'none';
    
    // 显示world-ui-container（用于显示状态和inventory）
    const worldUI = document.getElementById('world-ui-container');
    if (worldUI) worldUI.style.display = 'block';
    
    // 初始化并显示RobotAssemblyUI
    if (this.gameState) {
      this.robotAssemblyUI = new RobotAssemblyUI(this.gameState);
      this.robotAssemblyUI.init();
      this.robotAssemblyUI.show();
    }
    
    console.log('RobotAssembly scene entered');
    if (this.gameState) {
      logMsg("ROBOT ASSEMBLY | [ESC] RETURN TO MENU | DRAG ITEMS TO EQUIP", this.gameState);
    }
  }

  override exit(): void {
    super.exit();
    
    // 隐藏Assembly容器
    if (this.container) {
      this.container.classList.remove('active');
      this.container.style.display = 'none';
    }
    
    // 隐藏RobotAssemblyUI
    if (this.robotAssemblyUI) {
      this.robotAssemblyUI.hide();
      this.robotAssemblyUI.destroy();
      this.robotAssemblyUI = null;
    }
    
    // 解绑事件
    this.unbindEvents();
    
    console.log('Assembly scene exited');
  }

  initWarehouseGrid(): void {
    if (!this.warehouseGrid || !this.warehouse) return;
    
    this.warehouseGrid.innerHTML = '';
    
    for (let i = 0; i < this.warehouse.maxSize; i++) {
      const slot = this.createItemSlot(i, 'warehouse', this.warehouse.items[i]);
      this.warehouseGrid.appendChild(slot);
    }
  }

  initInventoryGrid(): void {
    if (!this.inventoryGrid || !this.playerInventory) return;
    
    this.inventoryGrid.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
      const item = this.playerInventory[i];
      const slot = this.createItemSlot(i, 'inventory', item);
      this.inventoryGrid.appendChild(slot);
    }
  }

  createItemSlot(index: number, source: string, item: InventoryItem | null): HTMLElement {
    // 使用ItemSlotUI创建物品槽
    return ItemSlotUI.createAssemblySlot(index, source, item);
  }

  initInstructions(): void {
    if (!this.instructionsList) return;
    
    this.instructionsList.innerHTML = '';
    
    // 从config获取instructions
    if (INSTRUCTIONS && INSTRUCTIONS.length > 0) {
      INSTRUCTIONS.forEach((inst, i) => {
        const item = document.createElement('div');
        item.className = 'instruction-item';
        
        const title = document.createElement('div');
        title.className = 'inst-title';
        title.textContent = `INSTRUCTION ${i + 1}`;
        
        const text = document.createElement('div');
        text.className = 'inst-text';
        text.textContent = inst.text;
        
        item.appendChild(title);
        item.appendChild(text);
        this.instructionsList!.appendChild(item);
      });
    } else {
      this.instructionsList.innerHTML = '<div class="instruction-item"><div class="inst-text">No instructions available.</div></div>';
    }
  }

  bindEvents(): void {
    // Departure按钮
    if (this.departureBtn) {
      this.departureBtn.addEventListener('click', () => this.onDeparture());
    }
    
    // 拖拽事件
    if (this.warehouseGrid) {
      this.warehouseGrid.addEventListener('mousedown', (e) => this.onDragStart(e));
    }
    if (this.inventoryGrid) {
      this.inventoryGrid.addEventListener('mousedown', (e) => this.onDragStart(e));
    }
    
    document.addEventListener('mousemove', (e) => this.onDragMove(e));
    document.addEventListener('mouseup', (e) => this.onDragEnd(e));
  }

  unbindEvents(): void {
    if (this.departureBtn) {
      this.departureBtn.removeEventListener('click', () => this.onDeparture());
    }
    
    document.removeEventListener('mousemove', (e) => this.onDragMove(e));
    document.removeEventListener('mouseup', (e) => this.onDragEnd(e));
  }

  onDeparture(): void {
    console.log('Departure button clicked');
    
    // 检查核心槽位是否有core_hot
    if (!this.playerInventory) return;
    const firstItem = this.playerInventory[0];
    const hasCore = firstItem && (firstItem.type === 'core_hot' || firstItem.type === 'core_hot');
    
    if (!hasCore) {
      console.warn('Cannot depart: Core slot is empty');
      if (this.gameState) {
        logMsg("CORE REQUIRED - Place a hot core in the first inventory slot", this.gameState);
      }
      return;
    }
    
    // 切换到TACTICAL_RADAR场景
    if (this.sceneManager) {
      this.sceneManager.switchScene(SCENES.TACTICAL_RADAR, 'fade');
    }
  }

  onDragStart(e: MouseEvent): void {
    const slot = (e.target as HTMLElement).closest('.item-slot') as HTMLElement | null;
    if (!slot || !slot.classList.contains('has-item')) return;
    
    const source = slot.dataset.source;
    const index = parseInt(slot.dataset.index || '0');
    
    // 获取物品数据
    let item: InventoryItem | null = null;
    if (source === 'warehouse' && this.warehouse) {
      item = this.warehouse.items[index];
    } else if (source === 'inventory' && this.playerInventory) {
      item = this.playerInventory[index];
    }
    
    if (!item) return;
    
    // 开始拖拽
    this.dragState.isDragging = true;
    this.dragState.source = source || null;
    this.dragState.sourceIndex = index;
    this.dragState.item = item;
    
    // 创建拖拽预览
    this.createDragPreview(item, e.clientX, e.clientY);
    
    // 标记原始slot
    slot.classList.add('dragging');
    
    e.preventDefault();
  }

  onDragMove(e: MouseEvent): void {
    if (!this.dragState.isDragging) return;
    
    // 更新预览位置
    if (this.dragState.previewElement) {
      this.dragState.previewElement.style.left = (e.clientX - 25) + 'px';
      this.dragState.previewElement.style.top = (e.clientY - 25) + 'px';
    }
  }

  onDragEnd(e: MouseEvent): void {
    if (!this.dragState.isDragging) return;
    
    // 查找目标slot
    const targetSlot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.item-slot') as HTMLElement | null;
    
    if (targetSlot) {
      const targetSource = targetSlot.dataset.source;
      const targetIndex = parseInt(targetSlot.dataset.index || '0');
      
      // 执行物品交换
      this.swapItems(
        this.dragState.source || '',
        this.dragState.sourceIndex || 0,
        targetSource || '',
        targetIndex
      );
    }
    
    // 清理拖拽状态
    this.cleanupDrag();
  }

  createDragPreview(item: InventoryItem, x: number, y: number): void {
    // 使用ItemSlotUI创建拖拽预览
    const preview = ItemSlotUI.createDragPreview(item, x, y);
    document.body.appendChild(preview);
    this.dragState.previewElement = preview;
  }

  cleanupDrag(): void {
    // 移除dragging样式
    document.querySelectorAll('.item-slot.dragging').forEach(slot => {
      slot.classList.remove('dragging');
    });
    
    // 移除预览元素
    if (this.dragState.previewElement) {
      this.dragState.previewElement.remove();
      this.dragState.previewElement = null;
    }
    
    // 重置拖拽状态
    this.dragState.isDragging = false;
    this.dragState.source = null;
    this.dragState.sourceIndex = null;
    this.dragState.item = null;
  }

  swapItems(sourceType: string, sourceIndex: number, targetType: string, targetIndex: number): void {
    if (!this.warehouse || !this.playerInventory) return;
    
    // 获取源和目标物品数组
    const sourceArray = sourceType === 'warehouse' ? this.warehouse.items : this.playerInventory;
    const targetArray = targetType === 'warehouse' ? this.warehouse.items : this.playerInventory;
    
    const sourceItem = sourceArray[sourceIndex];
    const targetItem = targetArray[targetIndex];
    
    // 验证：核心槽位（inventory slot 0）只能放置core_hot类型的物品
    if (targetType === 'inventory' && targetIndex === 0) {
      if (sourceItem && sourceItem.type !== 'core_hot' && sourceItem.type !== 'core_hot') {
        console.warn('Core slot only accepts core_hot items');
        return; // 拒绝交换
      }
    }
    
    // 如果从核心槽位移除物品，允许（可以移除核心）
    if (sourceType === 'inventory' && sourceIndex === 0 && targetIndex !== 0) {
      // 允许移除核心
    }
    
    // 交换
    sourceArray[sourceIndex] = targetItem;
    targetArray[targetIndex] = sourceItem;
    
    // 如果是inventory的变化，更新装备的核心
    if (sourceType === 'inventory' || targetType === 'inventory') {
      this.updateEquippedCore();
      this.updateDepartureButton(); // 更新departure按钮状态
    }
    
    // 刷新UI
    this.initWarehouseGrid();
    this.initInventoryGrid();
    
    console.log(`Swapped: ${sourceType}[${sourceIndex}] <-> ${targetType}[${targetIndex}]`);
  }

  updateEquippedCore(): void {
    if (!this.playerInventory || !this.gameState) return;
    
    // 检查inventory第一个slot是否有core_hot
    const firstItem = this.playerInventory[0];
    if (firstItem && (firstItem.type === 'core_hot' || firstItem.type === 'core_hot')) {
      const hotCore = firstItem as { coreData?: { name?: string; id?: string } };
      if (hotCore.coreData) {
        // 更新player的currentCore
        this.gameState.p.currentCore = hotCore.coreData as any;
        console.log(`Equipped core: ${hotCore.coreData.name || 'Unknown'}`);
      }
    } else {
      // 核心槽位为空，清除当前核心（使用默认值）
      console.log('Core slot is empty');
    }
  }

  /**
   * 更新departure按钮状态
   */
  updateDepartureButton(): void {
    if (!this.departureBtn || !this.playerInventory) return;
    
    // 检查核心槽位是否有core_hot
    const firstItem = this.playerInventory[0];
    const hasCore = firstItem && (firstItem.type === 'core_hot' || firstItem.type === 'core_hot');
    
    if (hasCore) {
      // 有核心，启用按钮
      this.departureBtn.removeAttribute('disabled');
      this.departureBtn.style.opacity = '1';
      this.departureBtn.style.cursor = 'pointer';
      if (this.departureBtn.title) {
        this.departureBtn.removeAttribute('title');
      }
    } else {
      // 无核心，禁用按钮
      this.departureBtn.setAttribute('disabled', 'true');
      this.departureBtn.style.opacity = '0.5';
      this.departureBtn.style.cursor = 'not-allowed';
      this.departureBtn.title = 'CORE REQUIRED - Place a hot core in the first inventory slot';
    }
  }

  override update(deltaTime: number): void {
    // 绘制机器人图
    this.renderRobotDiagram();
    
    // 更新RobotAssemblyUI
    if (this.robotAssemblyUI) {
      this.robotAssemblyUI.update(deltaTime);
    }
  }

  renderRobotDiagram(): void {
    if (!this.robotCtx || !this.robotCanvas) return;
    
    const ctx = this.robotCtx;
    const canvas = this.robotCanvas;
    
    // 清空画布
    ctx.fillStyle = '#001a00';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制机器人剖面图（简化版）
    ctx.save();
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 机器人轮廓
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    // 头部
    ctx.beginPath();
    ctx.arc(centerX, centerY - 80, 30, 0, Math.PI * 2);
    ctx.stroke();
    
    // 身体
    ctx.strokeRect(centerX - 40, centerY - 50, 80, 100);
    
    // 核心位置（胸口）
    ctx.fillStyle = '#00aa00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 显示当前核心信息
    if (this.playerCurrentCore && typeof this.playerCurrentCore === 'object') {
      const core = this.playerCurrentCore as { name?: string; freqMin?: number; freqMax?: number };
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(core.name || 'CORE', centerX, centerY + 80);
      
      ctx.font = '10px monospace';
      ctx.fillText(`Freq: ${core.freqMin || 0}-${core.freqMax || 0} Hz`, centerX, centerY + 95);
    }
    
    // 手臂
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY - 30);
    ctx.lineTo(centerX - 60, centerY + 20);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + 40, centerY - 30);
    ctx.lineTo(centerX + 60, centerY + 20);
    ctx.stroke();
    
    // 腿部
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY + 50);
    ctx.lineTo(centerX - 30, centerY + 120);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + 20, centerY + 50);
    ctx.lineTo(centerX + 30, centerY + 120);
    ctx.stroke();
    
    ctx.restore();
  }

  override render(ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement): void {
    // Assembly使用DOM渲染，这里清空canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, _canvas.width, _canvas.height);
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
    return false;
  }
}
