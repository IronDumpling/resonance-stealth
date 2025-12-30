/**
 * AssemblyScene.js
 * 机器人组装场景
 */

class AssemblyScene extends Scene {
    constructor() {
        super(SCENES.ASSEMBLY);
        
        this.container = null;
        this.warehouseGrid = null;
        this.inventoryGrid = null;
        this.instructionsList = null;
        this.departureBtn = null;
        this.robotCanvas = null;
        this.robotCtx = null;
        
        // 拖拽状态
        this.dragState = {
            isDragging: false,
            source: null, // 'warehouse' or 'inventory'
            sourceIndex: null,
            item: null,
            previewElement: null
        };
    }
    
    enter(data) {
        super.enter(data);
        
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
        this.robotCanvas = document.getElementById('robot-canvas');
        
        if (this.robotCanvas) {
            this.robotCtx = this.robotCanvas.getContext('2d');
        }
        
        // 初始化UI
        this.initWarehouseGrid();
        this.initInventoryGrid();
        this.initInstructions();
        this.bindEvents();
        
        // 显示workstation UI（确保CRT monitor可见）
        const workstationContainer = document.getElementById('workstation-container');
        if (workstationContainer) workstationContainer.style.display = 'flex';
        
        // 隐藏游戏canvas和其他UI
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) gameCanvas.style.display = 'none';
        
        const radioModeDisplay = document.getElementById('radio-mode-display');
        if (radioModeDisplay) radioModeDisplay.style.display = 'none';
        
        const worldUI = document.getElementById('world-ui-container');
        if (worldUI) worldUI.style.display = 'none';
        
        const inventoryContainer = document.getElementById('inventory-container');
        if (inventoryContainer) inventoryContainer.style.display = 'none';
        
        console.log('Assembly scene entered');
        logMsg("ROBOT ASSEMBLY | [ESC] RETURN TO MENU | DRAG ITEMS TO EQUIP");
    }
    
    exit() {
        super.exit();
        
        // 隐藏Assembly容器
        if (this.container) {
            this.container.classList.remove('active');
            this.container.style.display = 'none';
        }
        
        // 解绑事件
        this.unbindEvents();
        
        console.log('Assembly scene exited');
    }
    
    initWarehouseGrid() {
        if (!this.warehouseGrid || typeof warehouse === 'undefined') return;
        
        this.warehouseGrid.innerHTML = '';
        
        for (let i = 0; i < warehouse.maxSize; i++) {
            const slot = this.createItemSlot(i, 'warehouse', warehouse.items[i]);
            this.warehouseGrid.appendChild(slot);
        }
    }
    
    initInventoryGrid() {
        if (!this.inventoryGrid || typeof state === 'undefined') return;
        
        this.inventoryGrid.innerHTML = '';
        
        for (let i = 0; i < 6; i++) {
            const item = state.p.inventory[i];
            const slot = this.createItemSlot(i, 'inventory', item);
            this.inventoryGrid.appendChild(slot);
        }
    }
    
    createItemSlot(index, source, item) {
        const slot = document.createElement('div');
        slot.className = 'item-slot';
        slot.dataset.index = index;
        slot.dataset.source = source;
        
        if (item) {
            slot.classList.add('has-item');
            
            // 根据物品类型显示
            const label = document.createElement('div');
            label.className = 'item-label';
            
            if (item.type === 'core') {
                label.textContent = item.coreType ? item.coreType.toUpperCase() : 'CORE';
                slot.style.background = 'rgba(255, 100, 0, 0.3)';
            } else if (item.type === 'energy_flask') {
                label.textContent = 'ENERGY';
                slot.style.background = 'rgba(0, 255, 0, 0.3)';
            } else {
                label.textContent = item.type ? item.type.toUpperCase() : 'ITEM';
            }
            
            slot.appendChild(label);
        }
        
        return slot;
    }
    
    initInstructions() {
        if (!this.instructionsList) return;
        
        this.instructionsList.innerHTML = '';
        
        // 从config.js获取instructions
        if (typeof INSTRUCTIONS !== 'undefined') {
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
                this.instructionsList.appendChild(item);
            });
        } else {
            this.instructionsList.innerHTML = '<div class="instruction-item"><div class="inst-text">No instructions available.</div></div>';
        }
    }
    
    bindEvents() {
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
    
    unbindEvents() {
        if (this.departureBtn) {
            this.departureBtn.removeEventListener('click', () => this.onDeparture());
        }
        
        document.removeEventListener('mousemove', (e) => this.onDragMove(e));
        document.removeEventListener('mouseup', (e) => this.onDragEnd(e));
    }
    
    onDeparture() {
        console.log('Departure button clicked');
        // 切换到ROBOT场景
        if (sceneManager) {
            sceneManager.switchScene(SCENES.ROBOT, 'fade');
        }
    }
    
    onDragStart(e) {
        const slot = e.target.closest('.item-slot');
        if (!slot || !slot.classList.contains('has-item')) return;
        
        const source = slot.dataset.source;
        const index = parseInt(slot.dataset.index);
        
        // 获取物品数据
        let item = null;
        if (source === 'warehouse' && typeof warehouse !== 'undefined') {
            item = warehouse.items[index];
        } else if (source === 'inventory' && typeof state !== 'undefined') {
            item = state.p.inventory[index];
        }
        
        if (!item) return;
        
        // 开始拖拽
        this.dragState.isDragging = true;
        this.dragState.source = source;
        this.dragState.sourceIndex = index;
        this.dragState.item = item;
        
        // 创建拖拽预览
        this.createDragPreview(item, e.clientX, e.clientY);
        
        // 标记原始slot
        slot.classList.add('dragging');
        
        e.preventDefault();
    }
    
    onDragMove(e) {
        if (!this.dragState.isDragging) return;
        
        // 更新预览位置
        if (this.dragState.previewElement) {
            this.dragState.previewElement.style.left = (e.clientX - 25) + 'px';
            this.dragState.previewElement.style.top = (e.clientY - 25) + 'px';
        }
    }
    
    onDragEnd(e) {
        if (!this.dragState.isDragging) return;
        
        // 查找目标slot
        const targetSlot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.item-slot');
        
        if (targetSlot) {
            const targetSource = targetSlot.dataset.source;
            const targetIndex = parseInt(targetSlot.dataset.index);
            
            // 执行物品交换
            this.swapItems(
                this.dragState.source, this.dragState.sourceIndex,
                targetSource, targetIndex
            );
        }
        
        // 清理拖拽状态
        this.cleanupDrag();
    }
    
    createDragPreview(item, x, y) {
        const preview = document.createElement('div');
        preview.className = 'drag-preview';
        preview.style.left = (x - 25) + 'px';
        preview.style.top = (y - 25) + 'px';
        
        const label = document.createElement('div');
        label.style.color = '#00ff00';
        label.style.fontSize = '10px';
        label.style.textAlign = 'center';
        
        if (item.type === 'core') {
            label.textContent = item.coreType ? item.coreType.toUpperCase() : 'CORE';
        } else {
            label.textContent = item.type ? item.type.toUpperCase() : 'ITEM';
        }
        
        preview.appendChild(label);
        document.body.appendChild(preview);
        
        this.dragState.previewElement = preview;
    }
    
    cleanupDrag() {
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
    
    swapItems(sourceType, sourceIndex, targetType, targetIndex) {
        if (typeof warehouse === 'undefined' || typeof state === 'undefined') return;
        
        // 获取源和目标物品
        let sourceArray = sourceType === 'warehouse' ? warehouse.items : state.p.inventory;
        let targetArray = targetType === 'warehouse' ? warehouse.items : state.p.inventory;
        
        const sourceItem = sourceArray[sourceIndex];
        const targetItem = targetArray[targetIndex];
        
        // 交换
        sourceArray[sourceIndex] = targetItem;
        targetArray[targetIndex] = sourceItem;
        
        // 如果是inventory的变化，更新装备的核心
        if (sourceType === 'inventory' || targetType === 'inventory') {
            this.updateEquippedCore();
        }
        
        // 刷新UI
        this.initWarehouseGrid();
        this.initInventoryGrid();
        
        console.log(`Swapped: ${sourceType}[${sourceIndex}] <-> ${targetType}[${targetIndex}]`);
    }
    
    updateEquippedCore() {
        if (typeof state === 'undefined') return;
        
        // 检查inventory第一个slot是否有核心
        const firstItem = state.p.inventory[0];
        if (firstItem && firstItem.type === 'core' && firstItem.data) {
            state.p.currentCore = firstItem.data;
            console.log(`Equipped core: ${firstItem.data.name}`);
        }
    }
    
    update(deltaTime) {
        // 绘制机器人图
        this.renderRobotDiagram();
    }
    
    renderRobotDiagram() {
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
        if (typeof state !== 'undefined' && state.p && state.p.currentCore) {
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(state.p.currentCore.name, centerX, centerY + 80);
            
            ctx.font = '10px monospace';
            ctx.fillText(`Freq: ${state.p.currentCore.freqMin}-${state.p.currentCore.freqMax} Hz`, centerX, centerY + 95);
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
    
    render(ctx, canvas) {
        // Assembly使用DOM渲染，这里清空canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    handleInput(event) {
        if (event.key === 'Escape') {
            sceneManager.switchScene(SCENES.CRT_ON, 'fade');
            return true;
        }
        return false;
    }
}

