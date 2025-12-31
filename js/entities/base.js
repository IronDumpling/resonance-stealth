/**
 * 基地实体系统 (Base Entity System)
 */

// 创建基地
function spawnBase(x, y) {
    const base = {
        x: x,
        y: y,
        radius: 40,                     // 基地视觉半径
        triggerRadius: 80,              // 触发撤离的半径（小范围）
        evacuationTimer: 0,             // 撤离计时器（秒）
        evacuationDuration: 5.0,        // 撤离所需时间（5秒）
        isEvacuating: false,            // 是否正在撤离
        pulsePhase: 0,                  // 脉冲动画相位（用于视觉效果）
        blockFreq: CFG.freqMax,         // 阻挡频率（基地总是阻挡所有wave，使用最高频率）
        absorbedEnergy: 0               // 吸收的能量（用于显示）
    };
    
    state.entities.base = base;
    console.log(`Base spawned at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    return base;
}

// 更新基地状态
function updateBase(deltaTime) {
    if (!state.entities.base) return;
    
    const base = state.entities.base;
    const player = state.p;
    
    // 计算玩家与基地的距离
    const distance = dist(player.x, player.y, base.x, base.y);
    
    // 更新脉冲动画
    base.pulsePhase += deltaTime * 2; // 脉冲速度
    
    // 检查玩家是否在触发范围内
    if (distance <= base.triggerRadius && !player.isDormant && !player.isDestroyed) {
        // 开始/继续撤离计时
        if (!base.isEvacuating) {
            base.isEvacuating = true;
            logMsg("RETURNING TO BASE...");
        }
        
        base.evacuationTimer += deltaTime;
        
        // 检查是否达到撤离时间
        if (base.evacuationTimer >= base.evacuationDuration) {
            // 撤离成功
            handleEvacuationSuccess();
            return;
        }
    } else {
        // 玩家不在范围内，重置计时器
        if (base.isEvacuating) {
            base.isEvacuating = false;
            base.evacuationTimer = 0;
            logMsg("EVACUATION CANCELLED");
        }
    }
}

// 处理撤离成功
function handleEvacuationSuccess() {
    const base = state.entities.base;
    
    logMsg("EVACUATION SUCCESSFUL");
    
    // 转移背包物品到仓库
    if (typeof transferInventoryToWarehouse === 'function') {
        transferInventoryToWarehouse();
    }
    
    // 重置撤离状态
    base.isEvacuating = false;
    base.evacuationTimer = 0;
    
    // 切换到RobotAssemblyScene
    if (typeof sceneManager !== 'undefined' && sceneManager) {
        sceneManager.switchScene(SCENES.ROBOT_ASSEMBLY, 'fade');
    }
}

// 获取撤离进度（0-1）
function getEvacuationProgress() {
    if (!state.entities.base || !state.entities.base.isEvacuating) {
        return 0;
    }
    
    const base = state.entities.base;
    return Math.min(1, base.evacuationTimer / base.evacuationDuration);
}

// 检查玩家是否在基地范围内
function isPlayerNearBase() {
    if (!state.entities.base) return false;
    
    const base = state.entities.base;
    const player = state.p;
    const distance = dist(player.x, player.y, base.x, base.y);
    
    return distance <= base.triggerRadius;
}

