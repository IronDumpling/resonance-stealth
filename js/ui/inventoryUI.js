/**
 * 背包UI渲染
 */

function createInventoryUI() {
    const container = document.getElementById('inventory-container');
    if (!container) {
        console.error('Inventory container not found');
        return;
    }
    
    container.innerHTML = '';
    
    // 创建6个物品槽
    for (let i = 0; i < CFG.inventorySize; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.id = `inv-slot-${i}`;
        slot.style.cssText = `
            width: 50px;
            height: 50px;
            border: 2px solid #333333;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #00ff00;
            box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.3);
        `;
        container.appendChild(slot);
    }
    
    // 更新容器位置（基于canvas位置）
    updateInventoryPosition();
}

// 更新背包UI位置（使其显示在CRT屏幕内的右侧）
function updateInventoryPosition() {
    const container = document.getElementById('inventory-container');
    const canvas = document.getElementById('gameCanvas');
    
    if (!container || !canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    // 定位到canvas右侧内部，距离右边20px，距离顶部120px
    container.style.cssText = `
        position: fixed;
        right: ${window.innerWidth - canvasRect.right + 20}px;
        top: ${canvasRect.top + 120}px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1100;
        pointer-events: none;
    `;
}

function updateInventoryUI() {
    // 更新位置（以防窗口大小改变）
    updateInventoryPosition();
    
    for (let i = 0; i < CFG.inventorySize; i++) {
        const slot = document.getElementById(`inv-slot-${i}`);
        if (!slot) continue;
        
        const item = state.p.inventory[i];
        
        if (item) {
            // 根据物品类型设置图标
            switch (item.type) {
                case 'energy_flask':
                    slot.textContent = '⚡';
                    slot.style.color = '#00ff00';
                    break;
                case 'core_hot':
                    slot.textContent = '◆';
                    slot.style.color = '#ff6600';
                    break;
                case 'core_cold':
                    slot.textContent = '◇';
                    slot.style.color = '#8888ff';
                    break;
                case 'core':
                    slot.textContent = '◉';
                    slot.style.color = '#ffaa00';
                    break;
                default:
                    slot.textContent = '?';
                    slot.style.color = '#ffffff';
                    break;
            }
            slot.style.borderColor = '#00ff00';
        } else {
            // 空槽位
            slot.textContent = '';
            slot.style.borderColor = '#333333';
        }
    }
}

function showInventoryUI() {
    const container = document.getElementById('inventory-container');
    if (container) container.style.display = 'flex';
}

function hideInventoryUI() {
    const container = document.getElementById('inventory-container');
    if (container) container.style.display = 'none';
}

