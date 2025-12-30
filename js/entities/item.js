// 物品相关逻辑 (Item System)

// 创建物品交互提示UI
function createItemHintUI(itemType) {
    const div = document.createElement('div');
    div.className = 'interact-hint item-hint';
    
    // 根据物品类型设置提示文本和样式
    switch(itemType) {
        case 'energy':
            div.innerHTML = '[E] ENERGY PACK';
            div.style.color = '#00ff00';
            div.style.borderColor = '#00ff00';
            div.style.textShadow = '0 0 5px #00ff00';
            break;
        case 'core_hot':
            div.innerHTML = '[E] HOT CORE';
            div.style.color = '#ff6600';
            div.style.borderColor = '#ff6600';
            div.style.textShadow = '0 0 5px #ff6600';
            break;
        case 'core_cold':
            div.innerHTML = '[E] COLD CORE';
            div.style.color = '#8888ff';
            div.style.borderColor = '#8888ff';
            div.style.textShadow = '0 0 5px #8888ff';
            break;
        default:
            div.innerHTML = '[E] PICKUP';
            div.style.color = '#ffffff';
            div.style.borderColor = '#ffffff';
            div.style.textShadow = '0 0 5px #ffffff';
    }
    
    uiContainer.appendChild(div);
    return div;
}

// 生成物品
function spawnItemEnhanced(type, x, y) {
    const mapWidth = canvas.width * CFG.mapScale;
    const mapHeight = canvas.height * CFG.mapScale;
    
    const item = {
        type: type,
        x: x || rand(50, mapWidth - 50),
        y: y || rand(50, mapHeight - 50),
        r: 10,
        visibleTimer: 0,
        hintElement: null  // UI元素引用
    };
    
    // 检查是否在墙里
    if (x === undefined && y === undefined) {
        let ok = false;
        let safeLoop = 0;
        while (!ok && safeLoop < 100) {
            safeLoop++;
            item.x = rand(50, mapWidth - 50);
            item.y = rand(50, mapHeight - 50);
            
            // 检查是否在墙里
            if (checkWall(item.x, item.y)) continue;
            
            // 检查是否与instructions重叠
            let overlapsInst = false;
            for (const inst of state.entities.instructions) {
                if (dist(item.x, item.y, inst.x, inst.y) < 60) {
                    overlapsInst = true;
                    break;
                }
            }
            
            if (!overlapsInst) ok = true;
        }
        
        if (!ok) return null; // 无法找到合适位置
    }
    
    // 创建UI元素
    item.hintElement = createItemHintUI(type);
    
    return item;
}

// 更新物品UI
function updateItemUI(item) {
    const hint = item.hintElement;
    if (!hint) return;
    
    // 检查物品是否可见且玩家在附近
    const distToPlayer = dist(item.x, item.y, state.p.x, state.p.y);
    const isNearby = distToPlayer < 50; // 50像素内显示提示
    const isVisible = item.visibleTimer > 0;
    
    if (isVisible && isNearby) {
        // 显示提示
        const screenPos = worldToScreen(item.x, item.y - 30);
        hint.style.display = 'block';
        hint.style.left = screenPos.x + 'px';
        hint.style.top = screenPos.y + 'px';
        
        // 根据距离调整透明度（距离越近越明显）
        const opacity = Math.min(1, (50 - distToPlayer) / 30);
        hint.style.opacity = opacity.toString();
    } else {
        // 隐藏提示
        hint.style.display = 'none';
    }
}

// 更新所有物品UI
function updateItemsUI() {
    state.entities.items.forEach(item => {
        if (item.hintElement) {
            updateItemUI(item);
        }
    });
}

// 移除物品（同时清理UI）
function removeItem(item) {
    // 移除UI元素
    if (item.hintElement) {
        item.hintElement.remove();
        item.hintElement = null;
    }
    
    // 从数组中移除
    const index = state.entities.items.indexOf(item);
    if (index > -1) {
        state.entities.items.splice(index, 1);
    }
}

// 重写spawnItem函数以使用增强版
function spawnItem(type, x, y) {
    const item = spawnItemEnhanced(type, x, y);
    if (item) {
        state.entities.items.push(item);
    }
}

// 在敌人位置生成核心物品（增强版）
function spawnCoreAtEnemy(enemy, coreType) {
    coreType = coreType || 'core_hot';
    const visibleTimer = coreType === 'core_cold' ? 60 : 120;
    
    const item = spawnItemEnhanced(coreType, enemy.x, enemy.y);
    if (item) {
        item.visibleTimer = visibleTimer;
        state.entities.items.push(item);
    }
}

// 在指定位置生成核心（用于机器人报废）
function spawnCoreAtPosition(x, y, coreType) {
    const item = spawnItemEnhanced(coreType, x, y);
    if (item) {
        item.visibleTimer = 180; // 3秒可见
        state.entities.items.push(item);
    }
}

// 清理所有物品UI（场景切换时使用）
function cleanupAllItemUI() {
    state.entities.items.forEach(item => {
        if (item.hintElement) {
            item.hintElement.remove();
            item.hintElement = null;
        }
    });
}

// 物品拾取逻辑（增强版）
function tryPickupItem() {
    // 查找附近可拾取的物品
    const nearbyItems = state.entities.items.filter(
        i => dist(i.x, i.y, state.p.x, state.p.y) < 40 && i.visibleTimer > 0
    );
    
    if (nearbyItems.length === 0) return false;
    
    // 拾取最近的物品
    nearbyItems.sort((a, b) => {
        return dist(a.x, a.y, state.p.x, state.p.y) - dist(b.x, b.y, state.p.x, state.p.y);
    });
    
    const item = nearbyItems[0];
    
    // 处理不同类型的物品
    switch(item.type) {
        case 'energy':
            // 添加到背包
            if (addToInventory('energy_flask')) {
                logMsg(`ENERGY FLASK COLLECTED`);
                spawnParticles(item.x, item.y, '#00ff00', 20);
                removeItem(item);
                return true;
            } else {
                logMsg("INVENTORY FULL");
                return false;
            }
            
        case 'core_hot':
            // 热核心：收集到背包，不回复能量
            if (addToInventory('core_hot')) {
                logMsg("HOT CORE COLLECTED");
                spawnParticles(item.x, item.y, '#ff6600', 30);
                removeItem(item);
                return true;
            } else {
                logMsg("INVENTORY FULL");
                return false;
            }
            
        case 'core_cold':
            // 冷核心：立即回复能量（不占背包）
            addEnergy(CFG.coreColdItemValue);
            logMsg(`COLD CORE ABSORBED (+${CFG.coreColdItemValue} ENERGY)`);
            spawnParticles(item.x, item.y, '#8888ff', 20);
            removeItem(item);
            return true;
    }
    
    return false;
}

// 检测是否有可拾取的物品（用于显示通用提示）
function hasPickupableItems() {
    return state.entities.items.some(
        i => dist(i.x, i.y, state.p.x, state.p.y) < 40 && i.visibleTimer > 0
    );
}

