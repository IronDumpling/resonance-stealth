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
    container.style.cssText = `
        position: absolute;
        right: 20px;
        top: 120px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 100;
    `;
    
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
}

function updateInventoryUI() {
    for (let i = 0; i < CFG.inventorySize; i++) {
        const slot = document.getElementById(`inv-slot-${i}`);
        if (!slot) continue;
        
        if (i < state.p.inventory.length) {
            const item = state.p.inventory[i];
            
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
            }
            slot.style.borderColor = '#00ff00';
        } else {
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

