// 波纹相关逻辑

function emitWave(x, y, angle, spread, freq, source, ownerId, isChain, isParry, isPerfectParry, energyMult) {
    // 频率影响基础能量：低频(100Hz)=0.5x，中频(200Hz)=1x，高频(300Hz)=1.5x
    const freqFactor = 0.5 + (freq - CFG.freqMin) / (CFG.freqMax - CFG.freqMin);
    let baseEnergy = CFG.baseWaveEnergy * freqFactor;
    
    // 应用弹反倍率 (完美=2x, 普通=1x)
    if (energyMult) {
        baseEnergy *= energyMult;
    }
    
    // 如果是连锁波，也有额外的倍率 (之前的逻辑)
    if (isChain) {
        baseEnergy *= 3;
    }
    
    state.entities.waves.push({
        x: x, y: y, r: CFG.initialRadius, maxR: CFG.waveMaxDist,
        angle: angle, spread: spread, freq: freq, 
        baseEnergy: baseEnergy,      // 频率决定的基础能量
        source: source, ownerId: ownerId,
        isOriginalWave: (source === 'player' && spread < CFG.analyzeThreshold), // 标记是否是分析波纹（在创建时确定）
        
        // 弹反相关属性
        isParryWave: isParry || false,       // 标记：我是吞噬者
        isPerfectParry: isPerfectParry || false // 标记：我的胃口很好 (100%吸收) 还是 一般 (50%)
    });
}

// 检测波纹与墙壁的碰撞
function checkWaveWallCollision(wave, wall) {
    // 检查波纹是否与墙壁相交
    // 对于扇形波纹，我们需要检查多个方向
    const numRays = Math.max(8, Math.ceil(wave.spread * 8 / Math.PI));
    const startAngle = wave.angle - wave.spread / 2;
    const angleStep = wave.spread / numRays;
    
    let closestHit = null;
    let closestDist = Infinity;
    let hitNormal = null;
    
    for (let i = 0; i <= numRays; i++) {
        const rayAngle = startAngle + angleStep * i;
        const dx = Math.cos(rayAngle);
        const dy = Math.sin(rayAngle);
        
        const hit = rayRectIntersect(wave.x, wave.y, dx, dy, wall.x, wall.y, wall.w, wall.h);
        // 检查碰撞点是否在波纹圆周附近（允许一定误差）
        if (hit !== null && hit > 0 && Math.abs(hit - wave.r) < CFG.waveSpeed * 2 && hit < closestDist) {
            closestDist = hit;
            const hitX = wave.x + dx * hit;
            const hitY = wave.y + dy * hit;
            
            // 计算法线方向（从墙壁中心指向碰撞点）
            const wallCenterX = wall.x + wall.w / 2;
            const wallCenterY = wall.y + wall.h / 2;
            const nx = hitX - wallCenterX;
            const ny = hitY - wallCenterY;
            const nLen = Math.hypot(nx, ny);
            
            // 确定是哪个面被击中
            const distToLeft = Math.abs(hitX - wall.x);
            const distToRight = Math.abs(hitX - (wall.x + wall.w));
            const distToTop = Math.abs(hitY - wall.y);
            const distToBottom = Math.abs(hitY - (wall.y + wall.h));
            
            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            
            if (minDist === distToLeft) hitNormal = { x: -1, y: 0 };
            else if (minDist === distToRight) hitNormal = { x: 1, y: 0 };
            else if (minDist === distToTop) hitNormal = { x: 0, y: -1 };
            else hitNormal = { x: 0, y: 1 };
            
            closestHit = { x: hitX, y: hitY, dist: hit };
        }
    }
    
    if (closestHit) {
        return {
            hit: true,
            point: { x: closestHit.x, y: closestHit.y },
            dist: closestHit.dist,
            normal: hitNormal
        };
    }
    return { hit: false };
}

// 计算波纹与墙壁碰撞时被阻挡的角度范围（相对于波纹的角度）
// 返回被阻挡的角度范围数组，每个范围是相对于波纹起始角度的偏移量
function getWaveBlockedAngles(wave, wall) {
    const numRays = Math.max(32, Math.ceil(wave.spread * 32 / Math.PI)); // 增加采样精度
    const startAngle = wave.angle - wave.spread / 2;
    const angleStep = wave.spread / numRays;
    
    const blockedIndices = [];
    
    // 检查每个角度是否被阻挡
    for (let i = 0; i <= numRays; i++) {
        const rayAngle = startAngle + angleStep * i;
        const dx = Math.cos(rayAngle);
        const dy = Math.sin(rayAngle);
        
        const hit = rayRectIntersect(wave.x, wave.y, dx, dy, wall.x, wall.y, wall.w, wall.h);
        // 检查碰撞点是否在波纹圆周附近
        if (hit !== null && hit > 0 && Math.abs(hit - wave.r) < CFG.waveSpeed * 2) {
            blockedIndices.push(i);
        }
    }
    
    if (blockedIndices.length === 0) {
        return null;
    }
    
    // 将连续的索引分组为范围
    const ranges = [];
    let rangeStart = blockedIndices[0];
    let rangeEnd = blockedIndices[0];
    
    for (let i = 1; i < blockedIndices.length; i++) {
        if (blockedIndices[i] === rangeEnd + 1) {
            // 连续，扩展范围
            rangeEnd = blockedIndices[i];
        } else {
            // 不连续，保存当前范围并开始新范围
            ranges.push({
                start: (rangeStart / numRays) * wave.spread, // 转换为相对于起始角度的偏移
                end: ((rangeEnd + 1) / numRays) * wave.spread
            });
            rangeStart = blockedIndices[i];
            rangeEnd = blockedIndices[i];
        }
    }
    
    // 添加最后一个范围
    ranges.push({
        start: (rangeStart / numRays) * wave.spread,
        end: ((rangeEnd + 1) / numRays) * wave.spread
    });
    
    return ranges;
}

// 计算波纹与圆形敌人碰撞时被阻挡的角度范围
function getWaveBlockedAnglesByCircle(wave, enemy) {
    const numRays = Math.max(32, Math.ceil(wave.spread * 32 / Math.PI));
    const startAngle = wave.angle - wave.spread / 2;
    const angleStep = wave.spread / numRays;
    
    const blockedIndices = [];
    
    // 检查每个角度是否被阻挡
    for (let i = 0; i <= numRays; i++) {
        const rayAngle = startAngle + angleStep * i;
        const dx = Math.cos(rayAngle);
        const dy = Math.sin(rayAngle);
        
        // 射线与圆的相交检测
        const cx = enemy.x - wave.x;
        const cy = enemy.y - wave.y;
        
        // 计算射线方向上最接近圆心的点的距离
        const dot = cx * dx + cy * dy;
        if (dot < 0) continue; // 圆在射线后方
        
        // 最近点到圆心的距离
        const closestX = wave.x + dx * dot;
        const closestY = wave.y + dy * dot;
        const distToCenter = Math.hypot(closestX - enemy.x, closestY - enemy.y);
        
        // 如果射线穿过圆，且距离在波纹圆周附近
        if (distToCenter <= enemy.r && Math.abs(dot - wave.r) < CFG.waveSpeed * 2) {
            blockedIndices.push(i);
        }
    }
    
    if (blockedIndices.length === 0) {
        return null;
    }
    
    // 将连续的索引分组为范围
    const ranges = [];
    let rangeStart = blockedIndices[0];
    let rangeEnd = blockedIndices[0];
    
    for (let i = 1; i < blockedIndices.length; i++) {
        if (blockedIndices[i] === rangeEnd + 1) {
            rangeEnd = blockedIndices[i];
        } else {
            ranges.push({
                start: (rangeStart / numRays) * wave.spread,
                end: ((rangeEnd + 1) / numRays) * wave.spread
            });
            rangeStart = blockedIndices[i];
            rangeEnd = blockedIndices[i];
        }
    }
    
    ranges.push({
        start: (rangeStart / numRays) * wave.spread,
        end: ((rangeEnd + 1) / numRays) * wave.spread
    });
    
    return ranges;
}

// 处理波纹反弹（分割波纹）
function handleWaveBounce(w, wall, energyOnBounce, waveIndex) {
    // 记录墙壁轮廓（仅玩家波纹，避免重复添加）
    if (w.source === 'player') {
        const existingEcho = state.entities.wallEchoes.find(we => we.wall === wall);
        if (!existingEcho) {
            state.entities.wallEchoes.push({
                wall: wall,
                life: 1.0,
                energy: energyOnBounce
            });
        } else {
            existingEcho.life = Math.min(1.0, existingEcho.life + 0.3);
        }
    }
    
    // 计算被阻挡的角度范围
    const blockedRanges = getWaveBlockedAngles(w, wall);
    
    if (blockedRanges && blockedRanges.length > 0) {
        blockedRanges.sort((a, b) => a.start - b.start);
        
        const waveStartAngle = w.angle - w.spread / 2;
        const newWaves = [];
        let currentAngle = 0; // 相对于waveStartAngle的偏移
        
        for (const blockedRange of blockedRanges) {
            const rangeStart = Math.max(0, Math.min(blockedRange.start, w.spread));
            const rangeEnd = Math.max(0, Math.min(blockedRange.end, w.spread));
            
            // 添加被阻挡范围之前的部分
            if (rangeStart > currentAngle) {
                const remainingSpread = rangeStart - currentAngle;
                if (remainingSpread > 0.01) {
                    const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                    let normalizedAngle = newAngle;
                    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                    
                    newWaves.push({
                        x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                        angle: normalizedAngle,
                        spread: remainingSpread,
                        freq: w.freq,
                        baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                        source: w.source,
                        ownerId: w.ownerId,
                        isOriginalWave: false // 分割后的片段不触发UI
                    });
                }
            }
            currentAngle = rangeEnd;
        }
        
        // 添加最后一个被阻挡范围之后的部分
        if (currentAngle < w.spread) {
            const remainingSpread = w.spread - currentAngle;
            if (remainingSpread > 0.01) {
                const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: remainingSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                    source: w.source,
                    ownerId: w.ownerId
                });
            }
        }
        
        // 添加新的波纹片段（原波纹会在updateWave中标记删除）
        for (const newWave of newWaves) {
            const isFullCircle = newWave.spread > Math.PI * 1.9;
            const circumference = isFullCircle ? (2 * Math.PI * newWave.r) : (newWave.r * newWave.spread);
            newWave.energyPerPoint = newWave.baseEnergy / (circumference > 0.01 ? circumference : 0.01);
            state.entities.waves.push(newWave);
        }
        
        return true; // 表示波纹已被分割/移除
    }
    return false; // 没有检测到被阻挡的角度
}

// 处理波纹穿透（分割波纹）
function handleWavePenetration(w, wall, waveIndex) {
    const penetrationLoss = 0.3; // 穿透损失30%能量
    
    // 计算被阻挡的角度范围（穿透的部分）
    const blockedRanges = getWaveBlockedAngles(w, wall);
    
    if (blockedRanges && blockedRanges.length > 0) {
        blockedRanges.sort((a, b) => a.start - b.start);
        
        const waveStartAngle = w.angle - w.spread / 2;
        const newWaves = [];
        let currentAngle = 0; // 相对于waveStartAngle的偏移
        
        for (const blockedRange of blockedRanges) {
            const rangeStart = Math.max(0, Math.min(blockedRange.start, w.spread));
            const rangeEnd = Math.max(0, Math.min(blockedRange.end, w.spread));
            
            // 添加被阻挡范围之前的部分（未穿透，不损失能量）
            if (rangeStart > currentAngle) {
                const remainingSpread = rangeStart - currentAngle;
                if (remainingSpread > 0.01) {
                    const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                    let normalizedAngle = newAngle;
                    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                    
                    newWaves.push({
                        x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                        angle: normalizedAngle,
                        spread: remainingSpread,
                        freq: w.freq,
                        baseEnergy: w.baseEnergy * (remainingSpread / w.spread), // 不损失能量
                        source: w.source,
                        ownerId: w.ownerId,
                        isOriginalWave: false // 分割后的片段不触发UI
                    });
                }
            }
            
            // 添加被阻挡范围的部分（穿透，损失能量）
            const penetratedSpread = rangeEnd - rangeStart;
            if (penetratedSpread > 0.01) {
                const newAngle = waveStartAngle + rangeStart + penetratedSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: penetratedSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (penetratedSpread / w.spread) * (1 - penetrationLoss), // 损失30%能量
                    source: w.source,
                    ownerId: w.ownerId,
                    isOriginalWave: false // 分割后的片段不触发UI
                });
            }
            
            currentAngle = rangeEnd;
        }
        
        // 添加最后一个被阻挡范围之后的部分（未穿透，不损失能量）
        if (currentAngle < w.spread) {
            const remainingSpread = w.spread - currentAngle;
            if (remainingSpread > 0.01) {
                const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: remainingSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (remainingSpread / w.spread), // 不损失能量
                    source: w.source,
                    ownerId: w.ownerId
                });
            }
        }
        
        // 添加新的波纹片段（原波纹会在updateWave中标记删除）
        for (const newWave of newWaves) {
            const isFullCircle = newWave.spread > Math.PI * 1.9;
            const circumference = isFullCircle ? (2 * Math.PI * newWave.r) : (newWave.r * newWave.spread);
            newWave.energyPerPoint = newWave.baseEnergy / (circumference > 0.01 ? circumference : 0.01);
            state.entities.waves.push(newWave);
        }
        
        return true; // 表示波纹已被分割
    }
    return false; // 没有检测到被阻挡的角度
}

// 处理波纹与敌人的反弹（分割波纹）
function handleWaveEnemyBounce(w, enemy, energyOnBounce, waveIndex) {
    // 记录敌人轮廓（仅玩家波纹）
    if (w.source === 'player') {
        state.entities.echoes.push({
            x: enemy.x, y: enemy.y, r: enemy.r,
            type: 'enemy_bounce', // 新类型：敌人反弹回声
            life: 1.0,
            energy: energyOnBounce
        });
    }
    
    // 计算被阻挡的角度范围
    const blockedRanges = getWaveBlockedAnglesByCircle(w, enemy);
    
    if (blockedRanges && blockedRanges.length > 0) {
        blockedRanges.sort((a, b) => a.start - b.start);
        
        const waveStartAngle = w.angle - w.spread / 2;
        const newWaves = [];
        let currentAngle = 0;
        
        for (const blockedRange of blockedRanges) {
            const rangeStart = Math.max(0, Math.min(blockedRange.start, w.spread));
            const rangeEnd = Math.max(0, Math.min(blockedRange.end, w.spread));
            
            if (rangeStart > currentAngle) {
                const remainingSpread = rangeStart - currentAngle;
                if (remainingSpread > 0.01) {
                    const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                    let normalizedAngle = newAngle;
                    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                    
                    newWaves.push({
                        x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                        angle: normalizedAngle,
                        spread: remainingSpread,
                        freq: w.freq,
                        baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                        source: w.source,
                        ownerId: w.ownerId,
                        isOriginalWave: false // 分割后的片段不触发UI
                    });
                }
            }
            currentAngle = rangeEnd;
        }
        
        if (currentAngle < w.spread) {
            const remainingSpread = w.spread - currentAngle;
            if (remainingSpread > 0.01) {
                const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: remainingSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                    source: w.source,
                    ownerId: w.ownerId
                });
            }
        }
        
        if (waveIndex !== undefined && waveIndex >= 0) {
            state.entities.waves.splice(waveIndex, 1);
        }
        
        for (const newWave of newWaves) {
            const isFullCircle = newWave.spread > Math.PI * 1.9;
            const circumference = isFullCircle ? (2 * Math.PI * newWave.r) : (newWave.r * newWave.spread);
            newWave.energyPerPoint = newWave.baseEnergy / (circumference > 0.01 ? circumference : 0.01);
            state.entities.waves.push(newWave);
        }
        
        return true;
    }
    return false;
}

// 处理波纹与敌人的穿透（分割波纹）
function handleWaveEnemyPenetration(w, enemy, waveIndex) {
    const penetrationLoss = 0.3; // 穿透损失30%能量
    
    // 计算被阻挡的角度范围（穿透的部分）
    const blockedRanges = getWaveBlockedAnglesByCircle(w, enemy);
    
    if (blockedRanges && blockedRanges.length > 0) {
        blockedRanges.sort((a, b) => a.start - b.start);
        
        const waveStartAngle = w.angle - w.spread / 2;
        const newWaves = [];
        let currentAngle = 0;
        
        for (const blockedRange of blockedRanges) {
            const rangeStart = Math.max(0, Math.min(blockedRange.start, w.spread));
            const rangeEnd = Math.max(0, Math.min(blockedRange.end, w.spread));
            
            // 未穿透部分：不损失能量
            if (rangeStart > currentAngle) {
                const remainingSpread = rangeStart - currentAngle;
                if (remainingSpread > 0.01) {
                    const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                    let normalizedAngle = newAngle;
                    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                    
                    newWaves.push({
                        x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                        angle: normalizedAngle,
                        spread: remainingSpread,
                        freq: w.freq,
                        baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                        source: w.source,
                        ownerId: w.ownerId,
                        isOriginalWave: false // 分割后的片段不触发UI
                    });
                }
            }
            
            // 穿透部分：损失30%能量
            const penetratedSpread = rangeEnd - rangeStart;
            if (penetratedSpread > 0.01) {
                const newAngle = waveStartAngle + rangeStart + penetratedSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: penetratedSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (penetratedSpread / w.spread) * (1 - penetrationLoss),
                    source: w.source,
                    ownerId: w.ownerId,
                    isOriginalWave: false // 分割后的片段不触发UI
                });
            }
            
            currentAngle = rangeEnd;
        }
        
        if (currentAngle < w.spread) {
            const remainingSpread = w.spread - currentAngle;
            if (remainingSpread > 0.01) {
                const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: remainingSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                    source: w.source,
                    ownerId: w.ownerId
                });
            }
        }
        
        if (waveIndex !== undefined && waveIndex >= 0) {
            state.entities.waves.splice(waveIndex, 1);
        }
        
        for (const newWave of newWaves) {
            const isFullCircle = newWave.spread > Math.PI * 1.9;
            const circumference = isFullCircle ? (2 * Math.PI * newWave.r) : (newWave.r * newWave.spread);
            newWave.energyPerPoint = newWave.baseEnergy / (circumference > 0.01 ? circumference : 0.01);
            state.entities.waves.push(newWave);
        }
        
        return true;
    }
    return false;
}

// 处理波纹与玩家的反弹（分割波纹）
function handleWavePlayerBounce(w, energyOnBounce, waveIndex) {
    const player = { x: state.p.x, y: state.p.y, r: CFG.playerRadius };
    const blockedRanges = getWaveBlockedAnglesByCircle(w, player);
    
    // 记录玩家轮廓回声（仅非玩家波纹）
    if (w.source !== 'player') {
        state.entities.echoes.push({
            x: player.x, y: player.y, r: player.r,
            type: 'player_bounce',
            life: 1.0,
            energy: energyOnBounce
        });
    }
    
    if (blockedRanges && blockedRanges.length > 0) {
        blockedRanges.sort((a, b) => a.start - b.start);
        
        const waveStartAngle = w.angle - w.spread / 2;
        const newWaves = [];
        let currentAngle = 0;
        
        for (const blockedRange of blockedRanges) {
            const rangeStart = Math.max(0, Math.min(blockedRange.start, w.spread));
            const rangeEnd = Math.max(0, Math.min(blockedRange.end, w.spread));
            
            if (rangeStart > currentAngle) {
                const remainingSpread = rangeStart - currentAngle;
                if (remainingSpread > 0.01) {
                    const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                    let normalizedAngle = newAngle;
                    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                    
                    newWaves.push({
                        x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                        angle: normalizedAngle,
                        spread: remainingSpread,
                        freq: w.freq,
                        baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                        source: w.source,
                        ownerId: w.ownerId,
                        isOriginalWave: false
                    });
                }
            }
            currentAngle = rangeEnd;
        }
        
        if (currentAngle < w.spread) {
            const remainingSpread = w.spread - currentAngle;
            if (remainingSpread > 0.01) {
                const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: remainingSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                    source: w.source,
                    ownerId: w.ownerId
                });
            }
        }
        
        if (waveIndex !== undefined && waveIndex >= 0) {
            state.entities.waves.splice(waveIndex, 1);
        }
        
        for (const newWave of newWaves) {
            const isFullCircle = newWave.spread > Math.PI * 1.9;
            const circumference = isFullCircle ? (2 * Math.PI * newWave.r) : (newWave.r * newWave.spread);
            newWave.energyPerPoint = newWave.baseEnergy / (circumference > 0.01 ? circumference : 0.01);
            state.entities.waves.push(newWave);
        }
        
        return true;
    }
    return false;
}

// 处理波纹与玩家的穿透（分割波纹）
function handleWavePlayerPenetration(w, waveIndex) {
    const penetrationLoss = 0.3;
    const player = { x: state.p.x, y: state.p.y, r: CFG.playerRadius };
    
    const blockedRanges = getWaveBlockedAnglesByCircle(w, player);
    if (blockedRanges && blockedRanges.length > 0) {
        blockedRanges.sort((a, b) => a.start - b.start);
        
        const waveStartAngle = w.angle - w.spread / 2;
        const newWaves = [];
        let currentAngle = 0;
        
        for (const blockedRange of blockedRanges) {
            const rangeStart = Math.max(0, Math.min(blockedRange.start, w.spread));
            const rangeEnd = Math.max(0, Math.min(blockedRange.end, w.spread));
            
            // 未穿透部分：不损失能量
            if (rangeStart > currentAngle) {
                const remainingSpread = rangeStart - currentAngle;
                if (remainingSpread > 0.01) {
                    const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                    let normalizedAngle = newAngle;
                    while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                    while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                    
                    newWaves.push({
                        x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                        angle: normalizedAngle,
                        spread: remainingSpread,
                        freq: w.freq,
                        baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                        source: w.source,
                        ownerId: w.ownerId,
                        isOriginalWave: false
                    });
                }
            }
            
            // 穿透玩家的部分：损失能量
            const penetratedSpread = rangeEnd - rangeStart;
            if (penetratedSpread > 0.01) {
                const newAngle = waveStartAngle + rangeStart + penetratedSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: penetratedSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (penetratedSpread / w.spread) * (1 - penetrationLoss),
                    source: w.source,
                    ownerId: w.ownerId,
                    isOriginalWave: false
                });
            }
            
            currentAngle = rangeEnd;
        }
        
        if (currentAngle < w.spread) {
            const remainingSpread = w.spread - currentAngle;
            if (remainingSpread > 0.01) {
                const newAngle = waveStartAngle + currentAngle + remainingSpread / 2;
                let normalizedAngle = newAngle;
                while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
                while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
                
                newWaves.push({
                    x: w.x, y: w.y, r: w.r, maxR: w.maxR,
                    angle: normalizedAngle,
                    spread: remainingSpread,
                    freq: w.freq,
                    baseEnergy: w.baseEnergy * (remainingSpread / w.spread),
                    source: w.source,
                    ownerId: w.ownerId
                });
            }
        }
        
        if (waveIndex !== undefined && waveIndex >= 0) {
            state.entities.waves.splice(waveIndex, 1);
        }
        
        for (const newWave of newWaves) {
            const isFullCircle = newWave.spread > Math.PI * 1.9;
            const circumference = isFullCircle ? (2 * Math.PI * newWave.r) : (newWave.r * newWave.spread);
            newWave.energyPerPoint = newWave.baseEnergy / (circumference > 0.01 ? circumference : 0.01);
            state.entities.waves.push(newWave);
        }
        
        return true;
    }
    return false;
}

// 敌人波纹击中玩家的统一处理（物理 / 共振 / AI / 波形反馈）
function handleWavePlayerInteraction(w, oldR, waveIndex) {
    // 忽略玩家自己的波纹
    if (w.source === 'player') return 'none';
    
    const dToP = dist(state.p.x, state.p.y, w.x, w.y);
    // 使用 oldR / w.r 判断扩散环本帧是否扫过玩家
    if (dToP < oldR || dToP > w.r) return 'none';
    
    // 角度检查：玩家必须在扇形范围内，或波近似全向
    const angleToP = Math.atan2(state.p.y - w.y, state.p.x - w.x);
    let angleDiff = Math.abs(angleToP - w.angle);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
    if (!(w.spread > Math.PI || angleDiff < w.spread / 2)) return 'none';
    
    // 物理与共振判定
    const playerFreq = state.freq;
    const freqDelta = Math.abs(w.freq - playerFreq);
    const isPerfectResonance = freqDelta <= CFG.perfectResTol;
    const isNormalResonance = freqDelta <= CFG.normalResTol;
    const willBounce = w.freq > playerFreq;
    
    // AI 感知层：仅在反弹或发生共振时，敌人记住玩家坐标
    if ((willBounce || isNormalResonance) && w.ownerId) {
        const enemy = state.entities.enemies.find(e => e.id === w.ownerId);
        if (enemy && enemy.state !== 'stunned') {
            onEnemySensesPlayer(enemy, state.p.x, state.p.y);
            logMsg("HOSTILE LOCKED ON");
            spawnParticles(state.p.x, state.p.y, '#00ffff', 12);
        }
    }
    
    // 受迫共振：只在发生共振且冷却就绪时触发
    if (isNormalResonance && state.p.resonanceCD <= 0) {
        // 估算击中玩家的总能量
        const playerDiameter = CFG.playerRadius * 2;
        const maxArcLength = w.r * (w.spread > 0.001 ? w.spread : 0.001);
        const coveredArcLength = Math.min(playerDiameter, maxArcLength);
        const totalEnergyOnPlayer = w.energyPerPoint * coveredArcLength;
        
        let energyCost = CFG.forcedWaveCost;
        
        // 消耗能量（能量不足时归零）
        if (state.p.en < energyCost) {
            state.p.en = 0;
            logMsg("CRITICAL OVERLOAD: ENERGY DEPLETED");
        } else {
            state.p.en -= energyCost;
            logMsg("SYSTEM OVERLOAD: ENERGY DRAIN");
        }
        
        // 高能量密度下的视觉反馈（触发边缘红光闪烁）
        const overloadThreshold = CFG.baseWaveEnergy * CFG.energyThreshold;
        if (totalEnergyOnPlayer >= overloadThreshold) {
            flashEdgeGlow('red', 150); // 高能量：较长的红色闪烁
        } else {
            flashEdgeGlow('red', 100); // 普通能量：较短的红色闪烁
        }
        
        // 玩家被迫发出自发波（与敌人受迫共振对称）
        emitWave(state.p.x, state.p.y, 0, Math.PI * 2, state.freq, 'player');
        state.p.resonanceCD = CFG.resonanceCD;
        updateUI();
    }
    
    // 波形反馈：根据"硬度"决定反弹或穿透的几何行为
    if (willBounce) {
        const energyOnBounce = w.energyPerPoint;
        const handled = handleWavePlayerBounce(w, energyOnBounce, waveIndex);
        return handled ? 'bounced' : 'none';
    } else {
        const handled = handleWavePlayerPenetration(w, waveIndex);
        return handled ? 'penetrated' : 'none';
    }
}

// 处理波纹与墙壁的碰撞
function handleWaveWallInteraction(w, oldR, waveIndex) {
    for (let wall of state.entities.walls) {
        const collision = checkWaveWallCollision(w, wall);
        if (collision.hit) {
            const distToWall = collision.dist;
            if (distToWall >= oldR - CFG.waveSpeed && distToWall <= w.r + CFG.waveSpeed) {
                if (w.freq > wall.blockFreq) {
                    // 反弹
                    const energyOnBounce = w.energyPerPoint;
                    const wasHandled = handleWaveBounce(w, wall, energyOnBounce, waveIndex);
                    return wasHandled ? 'bounced' : 'removed';
                } else {
                    // 穿透
                    const wasHandled = handleWavePenetration(w, wall, waveIndex);
                    if (wasHandled) {
                        return 'penetrated'; // 表示波纹已被分割
                    }
                }
            }
        }
    }
    return 'none';
}

// 检查波纹与物品的碰撞
function checkWaveItemCollisions(w) {
    state.entities.items.forEach(item => {
        const d = dist(item.x, item.y, w.x, w.y);
        if(Math.abs(d - w.r) < CFG.waveSpeed) {
            item.visibleTimer = 120; // 可见2秒
            state.entities.echoes.push({
                x: item.x, y: item.y, r: 2, type: 'item', life: 1.0
            });
        }
    });
}

// 处理波纹与敌人碰撞（分割波纹）
function handleWaveEnemyInteraction(w, oldR, waveIndex) {
    for (let enemy of state.entities.enemies) {
        if(w.ownerId === enemy.id) continue;
        
        const d = dist(enemy.x, enemy.y, w.x, w.y);
        // 使用上一帧半径 oldR 和当前半径 w.r，判断扩散环是否"扫过"敌人
        if(d >= oldR && d <= w.r) {
            const angleToE = Math.atan2(enemy.y - w.y, enemy.x - w.x);
            let angleDiff = Math.abs(angleToE - w.angle);
            while(angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI*2);
            
            if(w.spread > Math.PI || angleDiff < w.spread/2) {
                // 计算打到敌人的总能量
                const enemyDiameter = 2 * enemy.r;
                const maxArcLength = w.r * w.spread;
                const coveredArcLength = Math.min(enemyDiameter, maxArcLength);
                const totalEnergy = w.energyPerPoint * coveredArcLength;
                
                // 检测共振
                const freqDelta = Math.abs(w.freq - enemy.freq);
                const isPerfectResonance = freqDelta <= CFG.perfectResTol;
                const isNormalResonance = freqDelta <= CFG.normalResTol;
                
                // 判断是穿透还是反弹
                const willBounce = w.freq > enemy.freq;
                
                // 根据能量决定信息等级
                const isLongDuration = totalEnergy >= CFG.infoLevelLong;
                const showAnalyzeUI = totalEnergy >= CFG.infoLevelAnalyze;
                const isClearOutline = totalEnergy >= CFG.infoLevelClear;
                
                // 玩家波纹才显示信息
                if (w.source === 'player') {
                    if (willBounce) {
                        // 反弹：根据能量显示清晰轮廓或分析UI
                        if (showAnalyzeUI) {
                            // 高能量：显示分析UI
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r, 
                                type: 'analyze',
                                life: isLongDuration ? 5.0 : 2.0,
                                enemyId: enemy.id,
                                isResonance: isNormalResonance,
                                isPerfect: isPerfectResonance
                            });
                            enemy.lastPingTime = Date.now();
                            enemy.pingType = 'analyze';
                        } else {
                            // 中低能量：显示清晰轮廓
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r,
                                type: 'enemy_bounce',
                                life: isClearOutline ? 1.0 : 0.5
                            });
                        }
                    } else {
                        // 穿透：显示模糊轮廓（短暂）
                        if (showAnalyzeUI) {
                            // 高能量穿透（低频聚焦）：短暂分析UI
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r, 
                                type: 'analyze',
                                life: isLongDuration ? 2.0 : 1.0,
                                enemyId: enemy.id,
                                isResonance: isNormalResonance,
                                isPerfect: isPerfectResonance
                            });
                            enemy.lastPingTime = Date.now();
                            enemy.pingType = 'analyze';
                        } else {
                            // 低能量穿透：模糊轮廓
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r,
                                type: 'enemy_blur',  // 新类型：模糊轮廓
                                life: 0.3
                            });
                        }
                    }
                }
                
                // 触发共振效果
                if (isNormalResonance) {
                    // 先计算能量阈值
                    const minCircumference = CFG.initialRadius * CFG.minSpread;
                    const minEnergyPerPoint = CFG.baseWaveEnergy / minCircumference;
                    const standardEnemyR = 16;
                    const standardEnemyAngleSpan = 2 * Math.asin(Math.min(1.0, standardEnemyR / CFG.initialRadius));
                    const standardCoveredArcLength = CFG.initialRadius * Math.min(standardEnemyAngleSpan, CFG.minSpread);
                    const minTotalEnergy = minEnergyPerPoint * standardCoveredArcLength;
                    const overloadThreshold = minTotalEnergy * 0.1;
                    
                    // 层次1：视觉反馈（总是显示，让玩家知道发生了共振）
                    // 如果冷却中且能量不足，只显示视觉反馈，不执行任何效果
                    state.entities.echoes.push({
                        x: enemy.x, y: enemy.y, r: enemy.r,
                        type: 'enemy_resonance',
                        life: 1.0,
                        isPerfect: isPerfectResonance
                    });
                    
                    // 层次2：高能量效果（忽略冷却，允许立即进入stun）
                    if (totalEnergy >= overloadThreshold) {
                        // 进入stun状态，不发出受迫共振波，不设置冷却
                        enemy.state = 'stunned';
                        enemy.isPerfectStun = isPerfectResonance;
                        enemy.timer = isPerfectResonance ? CFG.stunTime : CFG.stunTime / 2; // 完美共振10秒，普通共振5秒
                        enemy.canBeDetonated = true; // 标记可处决
                        
                        // 日志消息
                        if (isPerfectResonance) {
                            logMsg("TARGET CRITICAL - READY TO DETONATE");
                        } else {
                            logMsg("TARGET STUNNED");
                        }
                    }
                    // 层次3：低能量效果（检查冷却，防止频繁发波）
                    else if (enemy.resonanceCD <= 0) {
                        // 能量不足，只进行普通的受迫发波，设置冷却
                        emitWave(enemy.x, enemy.y, 0, Math.PI*2, enemy.freq, 'enemy', enemy.id);
                        enemy.resonanceCD = CFG.resonanceCD;
                        
                        // 敌人会警觉并追踪波纹来源位置
                        if (enemy.state === 'idle' || enemy.state === 'alert' || enemy.state === 'patrol' || enemy.state === 'searching') {
                            onEnemySensesPlayer(enemy, w.x, w.y);
                        }
                    }
                }
                
                // 非共振时的警报逻辑（高能量波纹会触发警报）
                if (!isNormalResonance && w.source === 'player' && showAnalyzeUI) {
                    if (enemy.state !== 'stunned') {
                        onEnemySensesPlayer(enemy, state.p.x, state.p.y);
                        logMsg("HOSTILE ALERTED (HIGH ENERGY BEAM)");
                    }
                }
                
                // 然后判断穿透或反弹（使用敌人的freq作为blockFreq）
                if (willBounce) {
                    // 反弹
                    const energyOnBounce = w.energyPerPoint;
                    const wasHandled = handleWaveEnemyBounce(w, enemy, energyOnBounce, waveIndex);
                    return wasHandled ? 'bounced' : 'none';
                } else {
                    // 穿透
                    const wasHandled = handleWaveEnemyPenetration(w, enemy, waveIndex);
                    if (wasHandled) {
                        return 'penetrated';
                    }
                }
            }
        }
    }
    return 'none';
}

// 计算波纹在指定半径和角度下的能量密度
// 复用 updateWave 中的计算逻辑
function calculateWaveEnergyPerPoint(baseEnergy, radius, spread) {
    const isFullCircle = spread > Math.PI * 1.9;
    const circumference = isFullCircle ? (2 * Math.PI * radius) : (radius * spread);
    const energyPerPoint = baseEnergy / (circumference > 0.01 ? circumference : 0.01);
    return energyPerPoint;
}

// 判断敌人波纹中心是否在玩家波纹扇形内
function isAngleOverlap(pWave, eWave) {
    const angleToEnemyWave = Math.atan2(eWave.y - pWave.y, eWave.x - pWave.x);
    let angleDiff = Math.abs(angleToEnemyWave - pWave.angle);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
    return (angleDiff < pWave.spread / 2 + 0.2); // 0.2 弧度作为边缘宽容度
}

// 处理波纹与波纹的交互（弹反波吞噬敌方波纹）
function handleWaveToWaveInteraction() {
    // 1. 筛选角色
    // 只有玩家发出的"弹反波"才有资格吞噬
    const parryWaves = state.entities.waves.filter(w => w.source === 'player' && w.isParryWave);
    // 所有非玩家波（敌人波、连锁波）都是食物
    const enemyWaves = state.entities.waves.filter(w => w.source !== 'player' && w.source !== 'pulse');
    
    parryWaves.forEach(pWave => {
        enemyWaves.forEach(eWave => {
            if (eWave._toRemove) return; // 已经被吃掉了
            
            // 2. 碰撞检测
            // 简化模型：两个圆环的距离 < 两者半径之和，且 > 半径之差 (即圆环线有重叠可能)
            // 为了手感爽快，我们只要判定"波前相遇"即可
            const d = dist(pWave.x, pWave.y, eWave.x, eWave.y);
            const radiusSum = pWave.r + eWave.r;
            const touchThreshold = CFG.waveSpeed * 2.5; // 宽容度
            
            // 如果波纹接触了
            if (Math.abs(d - radiusSum) < touchThreshold) {
                
                // 3. 频率匹配检测
                const freqDelta = Math.abs(pWave.freq - eWave.freq);
                
                // 只有在普通共振范围内才能发生干涉/吞噬
                if (freqDelta <= CFG.normalResTol) {
                    
                    // 4. 角度重叠检测 (避免背后吸能)
                    // 只有当敌人波纹在玩家波纹的扇形覆盖范围内才算
                    if (isAngleOverlap(pWave, eWave)) {
                        
                        // === 触发吞噬 (ABSORPTION) ===
                        
                        // A. 计算食物的总能量
                        // 估算敌方波纹当前的剩余总能量
                        // energyPerPoint * (周长 * spread)
                        const isFullCircle = eWave.spread > Math.PI * 1.9;
                        const eCircumference = isFullCircle ? (2 * Math.PI * eWave.r) : (eWave.r * (eWave.spread > 0.01 ? eWave.spread : 0.01));
                        const eTotalEnergy = eWave.energyPerPoint * eCircumference;
                        
                        // B. 决定吸收效率
                        // 完美弹反吸收 100% (1.0)，普通弹反吸收 50% (0.5)
                        const efficiency = pWave.isPerfectParry ? 1.0 : 0.5;
                        const absorbedEnergy = eTotalEnergy * efficiency;
                        
                        // C. 注入能量
                        // 直接增加 baseEnergy。
                        // updateWave 函数在下一帧会自动用新的 baseEnergy / circumference 来计算新的 energyPerPoint
                        // 从而实现"平均分配到每个点"的效果
                        pWave.baseEnergy += absorbedEnergy;
                        
                        // D. 销毁敌方波纹
                        eWave._toRemove = true;
                        
                        // E. 视觉特效
                        // 在两波接触点生成粒子
                        const midX = pWave.x + Math.cos(pWave.angle) * pWave.r;
                        const midY = pWave.y + Math.sin(pWave.angle) * pWave.r;
                        spawnParticles(midX, midY, pWave.isPerfectParry ? '#ffffff' : '#00ffff', 15);
                    }
                }
            }
        });
    });
}

// 更新单个波纹
function updateWave(w, i) {
    // 如果波纹已被标记删除（例如弹反触发），直接返回，不进行任何交互
    if (w._toRemove) return;
    
    const oldR = w.r;
    w.r += CFG.waveSpeed;
    
    // 能量稀释
    const isFullCircle = w.spread > Math.PI * 1.9;
    const circumference = isFullCircle ? (2 * Math.PI * w.r) : (w.r * w.spread);
    w.energyPerPoint = w.baseEnergy / (circumference > 0.01 ? circumference : 0.01);
    
    // 检查是否超出范围或能量耗尽
    if(w.r > w.maxR || w.energyPerPoint <= 0) {
        w._toRemove = true;
        return;
    }
    
    // 先检测与敌人的碰撞（分割波纹）
    const enemyCollisionResult = handleWaveEnemyInteraction(w, oldR, i);
    if (enemyCollisionResult === 'bounced' || enemyCollisionResult === 'penetrated') {
        // 波纹已被分割，标记删除
        w._toRemove = true;
        return;
    }
    
    // 检测与玩家的交互（物理 / 共振 / AI / 分割）
    const playerCollisionResult = handleWavePlayerInteraction(w, oldR, i);
    if (playerCollisionResult === 'bounced' || playerCollisionResult === 'penetrated') {
        w._toRemove = true;
        return;
    }
    
    // 检测与墙壁的碰撞
    const wallCollisionResult = handleWaveWallInteraction(w, oldR, i);
    if (wallCollisionResult === 'bounced' || wallCollisionResult === 'penetrated') {
        w._toRemove = true;
        return;
    }
    
    // 检查与物品的交互（不分割波纹）
    checkWaveItemCollisions(w);
}

