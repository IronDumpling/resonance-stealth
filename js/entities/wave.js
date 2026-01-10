// 波纹相关逻辑

function emitWave(x, y, angle, spread, freq, source, ownerId, isChain, isParry, isPerfectParry, energyMult, isReflectedWave, originalSourceX, originalSourceY) {
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
    
    const wave = {
        id: `wave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 添加唯一ID
        x: x, y: y, r: CFG.initialRadius, maxR: CFG.waveMaxDist,
        angle: angle, spread: spread, freq: freq, 
        baseEnergy: baseEnergy,      // 频率决定的基础能量
        source: source, ownerId: ownerId,
        isOriginalWave: (source === 'player' && spread < CFG.analyzeThreshold), // 标记是否是分析波纹（在创建时确定）
        
        // 弹反相关属性
        isParryWave: isParry || false,       // 标记：我是吞噬者
        isPerfectParry: isPerfectParry || false, // 标记：我的胃口很好 (100%吸收) 还是 一般 (50%)
        _contactedPlayer: false, // 追踪是否已接触玩家
        
        // 反弹波相关属性
        isReflectedWave: isReflectedWave || false,  // 是否是反弹波
        originalSourceX: originalSourceX,           // 原始波纹发射源X坐标
        originalSourceY: originalSourceY,           // 原始波纹发射源Y坐标
        reflectionOriginX: x,                       // 反弹波起点X（碰撞点）
        reflectionOriginY: y,                       // 反弹波起点Y（碰撞点）
        
        // 摩斯码
        morseCode: ''  // 将在下面生成
    };
    
    // 生成摩斯码（如果摩斯码系统已初始化）
    if (typeof morseCodeSystem !== 'undefined' && morseCodeSystem) {
        wave.morseCode = morseCodeSystem.generateCodeForWave(wave);
    }
    
    state.entities.waves.push(wave);
    return wave;  // 返回波纹对象以便后续使用
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

// 处理波纹反弹（分割波纹 + 生成反弹波）
function handleWaveBounce(w, wall, energyOnBounce, waveIndex) {
    // 检查是否是base（base有radius属性，wall有w和h属性）
    const isBase = wall.radius !== undefined;
    
    // 记录轮廓（仅玩家波纹，避免重复添加）
    if (w.source === 'player') {
        if (isBase) {
            // Base echo（蓝色荧光）
            if (!state.entities.baseEchoes) {
                state.entities.baseEchoes = [];
            }
            const existingEcho = state.entities.baseEchoes.find(be => be.base === wall);
            if (!existingEcho) {
                state.entities.baseEchoes.push({
                    base: wall,
                    life: 1.0,
                    energy: energyOnBounce
                });
            } else {
                existingEcho.life = Math.min(1.0, existingEcho.life + 0.3);
            }
        } else {
            // Wall echo
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
    }
    
    // === 生成反弹波 ===
    // 只有非反弹波才生成反弹波（避免无限反弹）
    if (!w.isReflectedWave && w.originalSourceX !== undefined && w.originalSourceY !== undefined) {
        // 计算被阻挡的角度范围
        const blockedRanges = isBase ? 
            getWaveBlockedAnglesByCircle(w, { x: wall.x, y: wall.y, r: wall.radius }) :
            getWaveBlockedAngles(w, wall);
        
        if (blockedRanges && blockedRanges.length > 0) {
            // 收集所有碰撞点（每个被阻挡的角度范围对应一个碰撞点）
            const collisionPoints = [];
            const waveStartAngle = w.angle - w.spread / 2;
            
            blockedRanges.forEach(range => {
                // 计算这个范围的中点角度
                const midAngle = waveStartAngle + (range.start + range.end) / 2;
                // 计算碰撞点（波纹边缘上的点）
                const collisionX = w.x + Math.cos(midAngle) * w.r;
                const collisionY = w.y + Math.sin(midAngle) * w.r;
                
                collisionPoints.push({
                    x: collisionX,
                    y: collisionY,
                    angle: midAngle,
                    rangeStart: range.start,
                    rangeEnd: range.end
                });
            });
            
            // 计算反弹波的平均起点（用于生成反弹波对象）
            let avgX = 0, avgY = 0;
            collisionPoints.forEach(p => {
                avgX += p.x;
                avgY += p.y;
            });
            avgX /= collisionPoints.length;
            avgY /= collisionPoints.length;
            
            // 计算反弹波的方向（指向原始发射源）
            const dx = w.originalSourceX - avgX;
            const dy = w.originalSourceY - avgY;
            const reflectionAngle = Math.atan2(dy, dx);
            
            // 反射系数
            const reflectionCoefficient = isBase ? 0.9 : (CFG.reflectionCoefficientWall || 0.8);
            
            // 生成反弹波（携带所有碰撞点信息）
            const reflectedWave = emitWave(
                avgX,
                avgY,
                reflectionAngle,
                w.spread,  // 保持相同的扩散角度
                w.freq,    // 保持相同的频率
                'reflection',  // 标记为反弹波来源
                'wall',  // 墙壁反弹，使用特殊标记
                false,  // isChain
                false,  // isParry
                false,  // isPerfectParry
                reflectionCoefficient,  // 能量衰减
                true,   // isReflectedWave
                w.originalSourceX,  // 保持原始发射源坐标
                w.originalSourceY
            );
            
            // 将碰撞点队列附加到反弹波对象
            if (reflectedWave) {
                reflectedWave.collisionPoints = collisionPoints;
            }
        }
    }
    
    // 计算被阻挡的角度范围
    let blockedRanges;
    if (isBase) {
        // 对于base，需要创建一个临时对象，将radius映射为r
        const tempBase = { x: wall.x, y: wall.y, r: wall.radius };
        blockedRanges = getWaveBlockedAnglesByCircle(w, tempBase);
    } else {
        blockedRanges = getWaveBlockedAngles(w, wall);
    }
    
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
    
    // 记录墙壁吸收的能量（用于raycast分析显示）
    if (w.source === 'player') {
        // 初始化墙壁对象的absorbedEnergy（如果不存在）
        if (!wall.absorbedEnergy) wall.absorbedEnergy = 0;
        
        const existingEcho = state.entities.wallEchoes.find(we => we.wall === wall);
        if (!existingEcho) {
            state.entities.wallEchoes.push({
                wall: wall,
                life: 1.0,
                energy: 0,
                absorbedEnergy: wall.absorbedEnergy  // 从墙壁对象读取
            });
        }
    }
    
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
                
                // 计算穿透损失的能量
                const lostEnergy = w.baseEnergy * penetrationLoss * (penetratedSpread / w.spread);
                
                // 记录墙壁吸收的能量（持久化存储在墙壁对象上）
                if (w.source === 'player') {
                    // 直接存储在墙壁对象上，确保数据不会因为wallEcho被移除而丢失
                    if (!wall.absorbedEnergy) wall.absorbedEnergy = 0;
                    wall.absorbedEnergy += lostEnergy;
                    
                    // 同时更新wallEcho（如果存在）
                    const existingEcho = state.entities.wallEchoes.find(we => we.wall === wall);
                    if (existingEcho) {
                        existingEcho.absorbedEnergy = wall.absorbedEnergy;
                    }
                }
                
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

// 处理波纹与敌人的反弹（分割波纹 + 生成反弹波）
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
    
    // === 新增：生成反弹波（包含所有碰撞点） ===
    // 只有非反弹波才生成反弹波（避免无限反弹）
    if (!w.isReflectedWave && w.originalSourceX !== undefined && w.originalSourceY !== undefined) {
        const blockedRanges = getWaveBlockedAnglesByCircle(w, enemy);
        
        if (blockedRanges && blockedRanges.length > 0) {
            // 收集所有碰撞点
            const collisionPoints = [];
            const waveStartAngle = w.angle - w.spread / 2;
            
            blockedRanges.forEach(range => {
                const midAngle = waveStartAngle + (range.start + range.end) / 2;
                const collisionX = w.x + Math.cos(midAngle) * w.r;
                const collisionY = w.y + Math.sin(midAngle) * w.r;
                
                collisionPoints.push({
                    x: collisionX,
                    y: collisionY,
                    angle: midAngle,
                    rangeStart: range.start,
                    rangeEnd: range.end
                });
            });
            
            // 计算反弹波的平均起点
            let avgX = 0, avgY = 0;
            collisionPoints.forEach(p => {
                avgX += p.x;
                avgY += p.y;
            });
            avgX /= collisionPoints.length;
            avgY /= collisionPoints.length;
            
            // 计算反弹波的方向（指向原始发射源）
            const dx = w.originalSourceX - avgX;
            const dy = w.originalSourceY - avgY;
            const reflectionAngle = Math.atan2(dy, dx);
            
            // 反射系数（敌人的反射系数较低）
            const reflectionCoefficient = CFG.reflectionCoefficientEnemy || 0.6;
            
            // 生成反弹波
            const reflectedWave = emitWave(
                avgX,
                avgY,
                reflectionAngle,
                w.spread,
                w.freq,
                'reflection',
                enemy.id,
                false, false, false,
                reflectionCoefficient,
                true,
                w.originalSourceX,
                w.originalSourceY
            );
            
            // 将碰撞点队列附加到反弹波对象
            if (reflectedWave) {
                reflectedWave.collisionPoints = collisionPoints;
            }
        }
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
                
                // 计算穿透损失的能量
                const lostEnergy = w.baseEnergy * penetrationLoss * (penetratedSpread / w.spread);
                // 生物吸收的能量
                const absorbedEnergy = lostEnergy * CFG.waveAbsorbRatio;
                
                // 恢复敌人能量
                const oldEn = enemy.en;
                enemy.en = Math.min(CFG.enemyMaxEnergy, enemy.en + absorbedEnergy);
                
                // 如果敌人处于休眠状态且能量恢复，唤醒敌人
                if (enemy.state === 'dormant' && oldEn <= 0 && enemy.en > 0) {
                    enemy.state = 'patrol';
                    logMsg("TARGET AWAKENED");
                }
                
                // 检测吸收能量是否达到察觉阈值
                if (absorbedEnergy >= CFG.energyAbsorbDetectionThreshold && w.source === 'player') {
                    onEnemySensesPlayer(enemy, w.x, w.y);
                    logMsg("ENEMY DETECTED WAVE ABSORPTION");
                }
                
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

// 处理波纹与玩家的反弹（分割波纹 + 生成反弹波）
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
    
    // === 新增：生成反弹波（包含所有碰撞点） ===
    // 只有非反弹波才生成反弹波（避免无限反弹）
    if (!w.isReflectedWave && w.originalSourceX !== undefined && w.originalSourceY !== undefined) {
        if (blockedRanges && blockedRanges.length > 0) {
            // 收集所有碰撞点
            const collisionPoints = [];
            const waveStartAngle = w.angle - w.spread / 2;
            
            blockedRanges.forEach(range => {
                const midAngle = waveStartAngle + (range.start + range.end) / 2;
                const collisionX = w.x + Math.cos(midAngle) * w.r;
                const collisionY = w.y + Math.sin(midAngle) * w.r;
                
                collisionPoints.push({
                    x: collisionX,
                    y: collisionY,
                    angle: midAngle,
                    rangeStart: range.start,
                    rangeEnd: range.end
                });
            });
            
            // 计算反弹波的平均起点
            let avgX = 0, avgY = 0;
            collisionPoints.forEach(p => {
                avgX += p.x;
                avgY += p.y;
            });
            avgX /= collisionPoints.length;
            avgY /= collisionPoints.length;
            
            // 计算反弹波的方向（指向原始发射源）
            const dx = w.originalSourceX - avgX;
            const dy = w.originalSourceY - avgY;
            const reflectionAngle = Math.atan2(dy, dx);
            
            // 玩家反射系数（与墙壁相同）
            const reflectionCoefficient = CFG.reflectionCoefficientWall || 0.8;
            
            // 生成反弹波
            const reflectedWave = emitWave(
                avgX,
                avgY,
                reflectionAngle,
                w.spread,
                w.freq,
                'reflection',
                'player',
                false, false, false,
                reflectionCoefficient,
                true,
                w.originalSourceX,
                w.originalSourceY
            );
            
            // 将碰撞点队列附加到反弹波对象
            if (reflectedWave) {
                reflectedWave.collisionPoints = collisionPoints;
            }
        }
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
                
                // 计算穿透损失的能量
                const lostEnergy = w.baseEnergy * penetrationLoss * (penetratedSpread / w.spread);
                // 生物吸收的能量
                const absorbedEnergy = lostEnergy * CFG.waveAbsorbRatio;
                
                // 恢复玩家能量
                state.p.en = Math.min(CFG.maxEnergy, state.p.en + absorbedEnergy);
                
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
    
    // 通知无线电系统波纹接触
    if (!w._contactedPlayer && w.source !== 'player') {
        if (typeof radioSystem !== 'undefined' && radioSystem) {
            radioSystem.addWaveContact(w.id, w.freq, w.source);
            w._contactedPlayer = true; // 标记已接触
        }
    }
    
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
        
        // 根据波能量动态计算玩家过载值增长
        // 计算基础能量阈值（与敌人相同）
        const minCircumference = CFG.initialRadius * CFG.minSpread;
        const minEnergyPerPoint = CFG.baseWaveEnergy / minCircumference;
        const playerDiam = CFG.playerRadius * 2;
        const standardCoveredArcLength = CFG.initialRadius * Math.min(playerDiam / CFG.initialRadius, CFG.minSpread);
        const minTotalEnergy = minEnergyPerPoint * standardCoveredArcLength;
        
        // 玩家过载值增长（与敌人使用相同的公式）
        const energyRatio = totalEnergyOnPlayer / minTotalEnergy;
        const dampedRatio = Math.sqrt(Math.max(0, energyRatio));
        
        let overloadGain = 0;
        if (isPerfectResonance) {
            overloadGain = CFG.maxOverload * dampedRatio;
        } else {
            overloadGain = (CFG.maxOverload / 3) * dampedRatio;
        }
        
        // 计算实际增加的过载值（限制不超过最大值）
        const oldOverload = state.p.overload;
        state.p.overload = Math.min(CFG.maxOverload, state.p.overload + overloadGain);
        const actualGain = state.p.overload - oldOverload;
        
        // 设置玩家硬直时间
        if (actualGain > 0) {
            if (!state.p.overloadedStunTimer) state.p.overloadedStunTimer = 0;
            const stunDuration = actualGain * CFG.overloadStunMultiplier;
            state.p.overloadedStunTimer = Math.max(state.p.overloadedStunTimer, stunDuration);
        }
        
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
        emitWave(state.p.x, state.p.y, 0, Math.PI * 2, state.freq, 'player', null, false, false, false, 1, false, state.p.x, state.p.y);
        state.p.resonanceCD = CFG.resonanceCD;
    }
    
    // 玩家过载条自然衰减
    state.p.overload = Math.max(0, state.p.overload - CFG.overloadDecayRate);
    
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

// 检测波纹与基地的碰撞
function checkWaveBaseCollision(wave, base) {
    if (!base) return { hit: false };
    
    // base是方形的，类似于wall
    // base.radius是边长的一半，所以总尺寸是 base.radius * 2
    const baseSize = base.radius * 2;
    const baseX = base.x - base.radius;
    const baseY = base.y - base.radius;
    const baseW = baseSize;
    const baseH = baseSize;
    
    // 使用与wall相同的检测方法：射线与矩形相交
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
        
        const hit = rayRectIntersect(wave.x, wave.y, dx, dy, baseX, baseY, baseW, baseH);
        // 检查碰撞点是否在波纹圆周附近（允许一定误差）
        if (hit !== null && hit > 0 && Math.abs(hit - wave.r) < CFG.waveSpeed * 2 && hit < closestDist) {
            closestDist = hit;
            const hitX = wave.x + dx * hit;
            const hitY = wave.y + dy * hit;
            
            // 计算法线方向（确定是哪个面被击中）
            const distToLeft = Math.abs(hitX - baseX);
            const distToRight = Math.abs(hitX - (baseX + baseW));
            const distToTop = Math.abs(hitY - baseY);
            const distToBottom = Math.abs(hitY - (baseY + baseH));
            
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

// 处理波纹与基地的碰撞
function handleWaveBaseInteraction(w, oldR, waveIndex) {
    if (!state.entities.base) return 'none';
    
    const base = state.entities.base;
    const collision = checkWaveBaseCollision(w, base);
    
    if (collision.hit) {
        const distToBase = collision.dist;
        // 检查碰撞是否发生在当前帧（波纹扩散环扫过base）
        if (distToBase >= oldR - CFG.waveSpeed && distToBase <= w.r + CFG.waveSpeed) {
            // 基地总是阻挡所有wave（使用最高频率）
            // 对于base，我们总是反弹（不穿透）
            const energyOnBounce = w.energyPerPoint;
            const wasHandled = handleWaveBounce(w, base, energyOnBounce, waveIndex);
            return wasHandled ? 'bounced' : 'removed';
        }
    }
    
    return 'none';
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
                        // 反弹：根据能量显示清晰轮廓（不再显示分析UI）
                        if (showAnalyzeUI) {
                            // 高能量：显示清晰轮廓
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r,
                                type: 'enemy_bounce',
                                life: isClearOutline ? 1.0 : 0.5
                            });
                        } else {
                            // 中低能量：显示清晰轮廓
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r,
                                type: 'enemy_bounce',
                                life: isClearOutline ? 1.0 : 0.5
                            });
                        }
                    } else {
                        // 穿透：显示模糊轮廓（不再显示分析UI）
                        if (showAnalyzeUI) {
                            // 高能量穿透：模糊轮廓
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r,
                                type: 'enemy_blur',
                                life: 0.3
                            });
                        } else {
                            // 低能量穿透：模糊轮廓
                            state.entities.echoes.push({
                                x: enemy.x, y: enemy.y, r: enemy.r,
                                type: 'enemy_blur',
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
                    
                    // 重新设计的过载值增长系统
                    // 使用平方根衰减避免高能量密度导致过载暴增
                    // 目标：完美共振+最小spread = 100（一次满），普通共振 = 30-40（需2-3次）
                    
                    const energyRatio = totalEnergy / minTotalEnergy;
                    const dampedRatio = Math.sqrt(Math.max(0, energyRatio)); // 平方根衰减
                    
                    let overloadGain = 0;
                    if (isPerfectResonance) {
                        // 完美共振：能量比1.0时达到100（一次满）
                        // 能量比0.25时达到50（两次满）
                        overloadGain = CFG.maxOverload * dampedRatio;
                    } else {
                        // 普通共振：最高约33（需要3次），能量低时更少
                        overloadGain = (CFG.maxOverload / 3) * dampedRatio;
                    }
                    
                    // 计算实际增加的过载值（限制不超过最大值）
                    const oldOverload = enemy.overload;
                    enemy.overload = Math.min(CFG.maxOverload, enemy.overload + overloadGain);
                    const actualGain = enemy.overload - oldOverload;
                    
                    // 设置硬直时间：过载增长越多，硬直越久（给玩家准备时间）
                    // actualGain * 2 帧 = 约 0.03-2秒 的硬直
                    if (actualGain > 0) {
                        if (!enemy.overloadedStunTimer) enemy.overloadedStunTimer = 0;
                        const stunDuration = actualGain * CFG.overloadStunMultiplier;
                        enemy.overloadedStunTimer = Math.max(enemy.overloadedStunTimer, stunDuration);
                    }
                    
                    // 层次1：视觉反馈（总是显示，让玩家知道发生了共振）
                    state.entities.echoes.push({
                        x: enemy.x, y: enemy.y, r: enemy.r,
                        type: 'enemy_resonance',
                        life: 1.0,
                        isPerfect: isPerfectResonance
                    });
                    
                    // 层次2：过载检查（先检查是否过载满，满了则进入stunned）
                    // 必须在发波前检查，避免 stunned 状态下还发波
                    if (enemy.overload >= CFG.maxOverload) {
                        if (enemy.isDormant) {
                            // 休眠敌人过载后仍保持休眠，但可以被处决
                            enemy.state = 'stunned';
                            enemy.canBeDetonated = true;
                            enemy.isPerfectStun = false; // 休眠敌人不会有完美共振
                            enemy.timer = CFG.stunTime;
                        } else {
                            // 正常敌人的过载逻辑
                            enemy.state = 'stunned';
                            enemy.isPerfectStun = isPerfectResonance;
                            enemy.timer = isPerfectResonance ? CFG.stunTime : CFG.stunTime / 2;
                            enemy.canBeDetonated = true;
                        }
                        
                        // 日志消息
                        if (isPerfectResonance) {
                            logMsg("TARGET CRITICAL - READY TO DETONATE");
                        } else {
                            logMsg("TARGET STUNNED");
                        }
                    }
                    
                    // 层次3：受迫共振波（铺板现象，只要共振就发波）
                    // 条件：冷却完毕、有足够能量、不在stunned/detonating状态
                    // 注意：硬直期间也可以发波（物理现象，与敌人行动能力无关）
                    if (enemy.resonanceCD <= 0 && 
                        enemy.state !== 'stunned' && 
                        enemy.state !== 'detonating') {
                        
                        // 计算能量消耗
                        const freqNorm = (enemy.freq - CFG.freqMin) / (CFG.freqMax - CFG.freqMin);
                        const focusNorm = 1; // 敌人发波为全向
                        const rawCost = 5 * freqNorm + 5 * focusNorm;
                        const energyCost = clamp(Math.round(rawCost), 0, 10);
                        
                        if (enemy.en >= energyCost) {
                            enemy.en = Math.max(0, enemy.en - energyCost);
                            emitWave(enemy.x, enemy.y, 0, Math.PI*2, enemy.freq, 'enemy', enemy.id, false, false, false, 1, false, enemy.x, enemy.y);
                            enemy.resonanceCD = CFG.resonanceCD;
                            
                            // 敌人会警觉并追踪波纹来源位置（硬直状态下不会移动，但仍会记录玩家位置）
                            if (enemy.state === 'idle' || enemy.state === 'alert' || enemy.state === 'patrol' || enemy.state === 'searching') {
                                onEnemySensesPlayer(enemy, w.x, w.y);
                            }
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
    if(w.r > w.maxR || w.energyPerPoint <= 0 || w.energyPerPoint < CFG.minEnergyPerPoint) {
        w._toRemove = true;
        return;
    }
    
    // 感知范围内波能量检测：对每个生物波，检查是否在敌人的感知范围内
    if (w.source === 'player' || w.source === 'enemy') {
        for (let enemy of state.entities.enemies) {
            if (enemy.state === 'stunned' || enemy.state === 'dormant' || enemy.state === 'detonating') {
                continue;
            }
            
            const d = dist(enemy.x, enemy.y, w.x, w.y);
            // 检查波是否在敌人的感知范围内
            if (d <= enemy.detectionRadius) {
                // 检查波是否扫过敌人（使用oldR和w.r判断扩散环是否扫过）
                if (d >= oldR && d <= w.r) {
                    checkEnergyDetection({ type: 'wave', x: w.x, y: w.y, energyPerPoint: w.energyPerPoint }, enemy);
                }
            }
        }
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
    
    // 检测与基地的碰撞
    const baseCollisionResult = handleWaveBaseInteraction(w, oldR, i);
    if (baseCollisionResult === 'bounced' || baseCollisionResult === 'penetrated') {
        w._toRemove = true;
        return;
    }
    
    // 检查与物品的交互（不分割波纹）
    checkWaveItemCollisions(w);
}

