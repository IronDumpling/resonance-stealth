// 敌人相关逻辑

// 检查圆与墙壁是否重叠
function checkCircleWallCollision(cx, cy, cr) {
    // 检查圆心是否在墙内
    if (checkWall(cx, cy)) return true;
    
    // 检查圆的四个方向点是否在墙内（更精确的碰撞检测）
    const checkPoints = [
        { x: cx + cr, y: cy },      // 右
        { x: cx - cr, y: cy },      // 左
        { x: cx, y: cy + cr },      // 下
        { x: cx, y: cy - cr }       // 上
    ];
    
    for (const pt of checkPoints) {
        if (checkWall(pt.x, pt.y)) return true;
    }
    
    // 检查圆是否与墙壁矩形相交（更精确的检测）
    for (let wall of state.entities.walls) {
        // 找到矩形上距离圆心最近的点
        const closestX = Math.max(wall.x, Math.min(cx, wall.x + wall.w));
        const closestY = Math.max(wall.y, Math.min(cy, wall.y + wall.h));
        
        // 计算最近点到圆心的距离
        const distToClosest = Math.hypot(cx - closestX, cy - closestY);
        
        // 如果距离小于半径，则碰撞
        if (distToClosest < cr) return true;
    }
    
    return false;
}

// 检查圆与圆是否重叠
function checkCircleCircleCollision(x1, y1, r1, x2, y2, r2) {
    const d = dist(x1, y1, x2, y2);
    return d < (r1 + r2);
}

function spawnEnemy() {
    let ex, ey, ok=false;
    const enemyRadius = 16;
    const minDistanceFromPlayer = 300;
    const minDistanceFromEnemies = enemyRadius * 2 + 10; // 敌人之间最小距离（半径之和 + 10像素缓冲）
    let attempts = 0;
    const maxAttempts = 200; // 最大尝试次数，避免无限循环
    
    while(!ok && attempts < maxAttempts) {
        attempts++;
        ex = rand(50, canvas.width-50); 
        ey = rand(50, canvas.height-50);
        
        // 检查距离玩家是否足够远
        if(dist(ex, ey, state.p.x, state.p.y) <= minDistanceFromPlayer) {
            continue;
        }
        
        // 检查是否与墙壁重叠
        if (checkCircleWallCollision(ex, ey, enemyRadius)) {
            continue;
        }
        
        // 检查是否与其他敌人重叠
        let overlapsEnemy = false;
        for (let existingEnemy of state.entities.enemies) {
            if (checkCircleCircleCollision(ex, ey, enemyRadius, existingEnemy.x, existingEnemy.y, existingEnemy.r)) {
                overlapsEnemy = true;
                break;
            }
        }
        
        if (!overlapsEnemy) {
            ok = true;
        }
    }
    
    // 如果尝试次数过多仍未找到合适位置，跳过生成这个敌人
    if (!ok) {
        return;
    }
    
    // 为敌人生成巡逻路径点（2~3个）——在其周围一定范围内、且不在墙内
    const waypoints = [];
    const wpCount = 2 + Math.floor(Math.random() * 2); // 2~3 个
    let wpAttempts = 0;
    while (waypoints.length < wpCount && wpAttempts < 40) {
        wpAttempts++;
        const ang = rand(0, Math.PI * 2);
        const distMin = 80, distMax = 200;
        const d = rand(distMin, distMax);
        const wx = ex + Math.cos(ang) * d;
        const wy = ey + Math.sin(ang) * d;
        // 确保在画布内且不在墙体中
        if (wx < 40 || wx > canvas.width - 40 || wy < 40 || wy > canvas.height - 40) continue;
        if (checkWall(wx, wy)) continue;
        waypoints.push({ x: wx, y: wy });
    }
    
    // 随机分配核心类型
    const coreTypes = [CORE_TYPES.SCAVENGER, CORE_TYPES.MIMIC, CORE_TYPES.HEAVY];
    const randomCore = coreTypes[Math.floor(Math.random() * coreTypes.length)];
    
    // 根据核心类型调整频率范围
    const enemyFreq = Math.floor(rand(randomCore.freqMin, randomCore.freqMax));
    
    state.entities.enemies.push({
        id: Math.random().toString(36).substr(2,9),
        x: ex, y: ey, r: 16,
        freq: enemyFreq,
        state: 'patrol', timer: 0, angle: rand(0, Math.PI*2),
        resonanceCD: 0,
        grabCooldown: 0,           // 抓取冷却时间
        lastPingTime: 0, pingType: null,
        targetX: null, targetY: null,
        searchTimer: 0,
        waypoints: waypoints,
        currentWPIndex: 0,
        uiElement: createAnalyzerUI(),
        executeHintElement: createExecuteHintUI(),
        struggleHintElement: createStruggleHintUI(),
        grabHintElement: null,
        // 核心系统
        core: randomCore,
        isDormant: false,
        isDestroyed: false,
        struggleProgress: 0,       // 敌人的挣脱进度（当被玩家抓取时）
        // 能量系统
        en: CFG.enemyMaxEnergy,     // 当前能量
        overload: 0,                // 当前过载值
        maxOverload: CFG.maxOverload, // 过载阈值（统一为100）
        // 感知系统
        detectionRadius: CFG.energyDetectionRadius,      // 感知范围半径
        detectionSectorAngle: CFG.energyDetectionSectorAngle // 敏感扇区角度
    });
}

function createAnalyzerUI() {
    const div = document.createElement('div');
    div.className = 'analyzer-tag';
    div.innerHTML = `<div style="text-align:center;margin-bottom:2px;">FREQ ANALYSIS</div>
                    <div class="analyzer-bar">
                        <div class="analyzer-center"></div>
                        <div class="analyzer-pip" style="left:50%"></div>
                    </div>
                    <div class="analyzer-text" style="color:#aaa;">UNKNOWN</div>`;
    uiContainer.appendChild(div);
    return div;
}

function createExecuteHintUI() {
    const div = document.createElement('div');
    div.className = 'interact-hint execute-hint';
    div.innerHTML = '[E] EXECUTE';
    uiContainer.appendChild(div);
    return div;
}

function createStruggleHintUI() {
    const div = document.createElement('div');
    div.className = 'interact-hint struggle-hint';
    div.innerHTML = '[F] STRUGGLE';
    uiContainer.appendChild(div);
    return div;
}

function createGrabHintUI() {
    const div = document.createElement('div');
    div.className = 'interact-hint grab-hint';
    div.innerHTML = '[E] GRAB';
    uiContainer.appendChild(div);
    return div;
}

// 敌人感知到玩家位置（统一触发入口）
function onEnemySensesPlayer(enemy, playerX, playerY) {
    if (!enemy || enemy.state === 'stunned') return;
    enemy.state = 'alert';
    enemy.targetX = playerX;
    enemy.targetY = playerY;
    enemy.searchTimer = 0;
}

// 统一能量感知检测
function checkEnergyDetection(energySource, enemy) {
    // 1. 检查敌人是否在可感知状态（休眠敌人可以感知，但不能移动/发波/grab）
    if (enemy.state === 'stunned' || enemy.state === 'detonating') {
        return false;
    }
    
    let energyValue = 0;
    let sourceX = 0, sourceY = 0;
    let distToEnemy = 0;
    
    // 2. 根据能量源类型计算能量值
    if (energySource.type === 'radiation') {
        // 辐射场：计算敌人到辐射场中心的距离
        distToEnemy = dist(energySource.x, energySource.y, enemy.x, enemy.y);
        sourceX = energySource.x;
        sourceY = energySource.y;
        
        // 检查是否在感知范围内
        if (distToEnemy > enemy.detectionRadius) {
            return false;
        }
        
        // 计算该距离处的能量值：使用circumference计算方式
        if (distToEnemy > 0.01) {
            energyValue = energySource.centerEnergy / (2 * Math.PI * distToEnemy);
        } else {
            energyValue = energySource.centerEnergy; // 距离太近，使用中心能量
        }
    } else if (energySource.type === 'wave') {
        // 生物波：使用波的energyPerPoint
        distToEnemy = dist(energySource.x, energySource.y, enemy.x, enemy.y);
        sourceX = energySource.x;
        sourceY = energySource.y;
        
        // 检查是否在感知范围内
        if (distToEnemy > enemy.detectionRadius) {
            return false;
        }
        
        energyValue = energySource.energyPerPoint;
    } else if (energySource.type === 'core') {
        // 核心能量：直接使用核心能量值（不随距离衰减）
        distToEnemy = dist(energySource.x, energySource.y, enemy.x, enemy.y);
        sourceX = energySource.x;
        sourceY = energySource.y;
        
        // 检查是否在感知范围内
        if (distToEnemy > enemy.detectionRadius) {
            return false;
        }
        
        // 核心能量值：直接使用核心能量值（不随距离衰减，因为核心能量是储存在生物体内的）
        energyValue = energySource.coreEnergy;
    } else {
        return false;
    }
    
    // 3. 计算角度
    const angleToSource = Math.atan2(sourceY - enemy.y, sourceX - enemy.x);
    const enemyAngle = enemy.angle;
    let angleDiff = Math.abs(angleToSource - enemyAngle);
    while (angleDiff > Math.PI) {
        angleDiff = Math.abs(angleDiff - Math.PI * 2);
    }
    
    // 4. 判断是否在敏感扇区
    const inSensitiveSector = angleDiff < enemy.detectionSectorAngle / 2;
    
    // 5. 根据扇区选择阈值
    const threshold = inSensitiveSector ? CFG.energyRemoteDetectionThresholdSensitive : CFG.energyRemoteDetectionThresholdBlind;
    
    // 6. 如果能量值达到阈值，触发警觉
    if (energyValue >= threshold) {
        onEnemySensesPlayer(enemy, sourceX, sourceY);
        logMsg("ENEMY DETECTED ENERGY");
        return true;
    }
    
    return false;
}

// 更新敌人UI
function updateEnemyUI(e) {
    const ui = e.uiElement;
    const execHint = e.executeHintElement;
    const struggleHint = e.struggleHintElement;
    
    // analyze UI 只在瞄准线raycast碰撞时显示，不碰撞时立刻消失
    const canShowAnalyze = (e.state === 'idle' || e.state === 'patrol' || e.state === 'alert' || e.state === 'searching' || e.state === 'dormant');
    const isRaycastHit = state.p.aimLineHit && state.p.aimLineHit.type === 'enemy' && state.p.aimLineHit.enemy === e;
    
    // 更新 analyze UI：只在raycast碰撞时显示
    if (canShowAnalyze && isRaycastHit) {
        const screenPos = worldToScreen(e.x, e.y - 20);
        ui.style.display = 'block'; 
        ui.style.left = screenPos.x + 'px'; 
        ui.style.top = screenPos.y + 'px';
        
        let diff = clamp((e.freq - state.freq) / 100, -1, 1);
        const offset = 40 + (diff * 38);
        ui.querySelector('.analyzer-pip').style.left = offset + 'px';
        
        const text = ui.querySelector('.analyzer-text');
        const pip = ui.querySelector('.analyzer-pip');
        const freqDiff = Math.abs(state.freq - e.freq);
        
        // 构建显示文本，包含能量和过载信息
        let statusText = "";
        if(freqDiff <= CFG.perfectResTol) {
            // 完美共振：亮绿色
            pip.style.backgroundColor = '#00ff00';
            statusText = "<span style='color:#00ff00'>[◆ PERFECT RESONANCE]</span>";
        } else if(freqDiff <= CFG.normalResTol) {
            // 普通共振：浅绿色
            pip.style.backgroundColor = '#88ff88';
            statusText = "<span style='color:#88ff88'>[● RESONANCE]</span>";
        } else if(diff < 0) {
            pip.style.backgroundColor = '#0088ff';
            statusText = "<span style='color:#0088ff'>▼ LOWER FREQ</span>"; 
        } else {
            pip.style.backgroundColor = '#ff4400';
            statusText = "<span style='color:#ff4400'>▲ HIGHER FREQ</span>";
        }
        
        // 添加能量和过载信息（带颜色编码）
        const enText = `EN: ${Math.floor(e.en)}/${CFG.enemyMaxEnergy}`;
        
        // 过载值颜色编码：根据危险程度变化
        const overloadPercent = e.overload / CFG.maxOverload;
        let overloadColor = '#aaa';  // 默认灰色
        if (overloadPercent >= 1.0) {
            overloadColor = '#ff0000';  // 满过载：红色
        } else if (overloadPercent >= 0.66) {
            overloadColor = '#ff8800';  // 高过载：橙色
        } else if (overloadPercent >= 0.33) {
            overloadColor = '#ffff00';  // 中过载：黄色
        }
        
        const overloadValue = Math.floor(e.overload);
        const overloadBar = '█'.repeat(Math.floor(overloadPercent * 5)) + '░'.repeat(5 - Math.floor(overloadPercent * 5));
        const overloadText = `<span style='color:${overloadColor}'>OL: ${overloadValue}/${CFG.maxOverload} [${overloadBar}]</span>`;
        
        text.innerHTML = statusText + `<br><span style='font-size:0.8em;'>${enText}</span><br><span style='font-size:0.8em;'>${overloadText}</span>`;
    } else {
        // 不碰撞时立刻隐藏UI
        ui.style.display = 'none';
    }
    
    // execute hint UI 只在 stunned 状态且可处决时显示
    if (e.state === 'stunned' && e.canBeDetonated) {
        const screenPos = worldToScreen(e.x, e.y - 40);
        execHint.style.display = 'block';
        execHint.style.left = screenPos.x + 'px';
        execHint.style.top = screenPos.y + 'px';
    } else {
        execHint.style.display = 'none';
    }
    
    // struggle hint UI 只在 grabbing 状态时显示
    if (e.state === 'grabbing' && state.p.isGrabbed && state.p.grabberEnemy === e) {
        const screenPos = worldToScreen(e.x, e.y - 40);
        struggleHint.style.display = 'block';
        struggleHint.style.left = screenPos.x + 'px';
        struggleHint.style.top = screenPos.y + 'px';
    } else {
        struggleHint.style.display = 'none';
    }
    
    // grab hint UI 只在未警觉状态且可抓取时显示
    if ((e.state === 'patrol' || e.state === 'idle') && 
        dist(e.x, e.y, state.p.x, state.p.y) < CFG.stealthGrabDistance &&
        !state.p.isGrabbed && !state.p.isGrabbingEnemy) {
        if (!e.grabHintElement) {
            e.grabHintElement = createGrabHintUI();
        }
        const screenPos = worldToScreen(e.x, e.y - 40);
        e.grabHintElement.style.display = 'block';
        e.grabHintElement.style.left = screenPos.x + 'px';
        e.grabHintElement.style.top = screenPos.y + 'px';
    } else {
        if (e.grabHintElement) {
            e.grabHintElement.style.display = 'none';
        }
    }
}

// 更新敌人移动
function updateEnemyMovement(e) {
    // STUNNED、DETONATING、GRABBING 和 DORMANT 状态在 updateEnemies 中处理，这里直接返回
    if (e.state === 'stunned' || e.state === 'detonating' || e.state === 'grabbing' || e.state === 'dormant' || e.state === 'grabbed_by_player') return;
    
    // 硬直状态无法移动
    if (e.overloadedStunTimer && e.overloadedStunTimer > 0) return;
    
    // 检查玩家是否挣脱（如果敌人处于 grabbing 状态但玩家已挣脱）
    if (e.state === 'grabbing' && (!state.p.isGrabbed || state.p.grabberEnemy !== e)) {
        e.state = 'alert';
    }
    
    // 搜寻状态：原地停顿并在中途发出搜索波
    if (e.state === 'searching') {
        if (e.searchTimer == null || e.searchTimer <= 0) {
            e.searchTimer = 60;
        }
        e.searchTimer--;
        
        if (e.searchTimer === 30) {
            // 主动搜索波（检查能量）
            const freqNorm = (e.freq - CFG.freqMin) / (CFG.freqMax - CFG.freqMin);
            const focusNorm = 1; // 敌人发波为全向
            const rawCost = 5 * freqNorm + 5 * focusNorm;
            const energyCost = clamp(Math.round(rawCost), 0, 10);
            
            if (e.en >= energyCost) {
                e.en = Math.max(0, e.en - energyCost);
                emitWave(e.x, e.y, 0, Math.PI * 2, e.freq, 'enemy', e.id);
                // 视觉 Ping：强调"正在搜索"
                state.entities.echoes.push({
                    x: e.x, y: e.y, r: e.r * 2,
                    type: 'enemy_search_ping',
                    life: 0.8
                });
            }
        }
        
        if (e.searchTimer <= 0) {
            e.state = 'patrol';
        }
        return;
    }
    
    let spd = CFG.eSpeedPatrol * e.core.speedMultiplier;
    let tx = null, ty = null;
    
    // 速度降低：过载值 >= 2/3 时，速度降低50%
    if (e.overload >= CFG.maxOverload * 2 / 3) {
        spd *= 0.5;
    }
    
    if (e.state === 'alert') {
        spd = CFG.eSpeedChase * e.core.speedMultiplier;
        // 再次应用速度降低（如果过载值高）
        if (e.overload >= CFG.maxOverload * 2 / 3) {
            spd *= 0.5;
        }
        tx = (e.targetX != null ? e.targetX : state.p.x);
        ty = (e.targetY != null ? e.targetY : state.p.y);
        
        const distToTarget = dist(e.x, e.y, tx, ty);
        if (distToTarget < 10) {
            // 到达最后已知位置，若仍未击中玩家，则进入搜寻阶段
            e.state = 'searching';
            e.searchTimer = 60;
            return;
        }
    } else if (e.state === 'patrol') {
        // 巡逻：沿 waypoints 循环
        if (e.waypoints && e.waypoints.length > 0) {
            const idx = e.currentWPIndex || 0;
            const wp = e.waypoints[idx];
            tx = wp.x;
            ty = wp.y;
            
            const distToWP = dist(e.x, e.y, tx, ty);
            if (distToWP < 5) {
                e.currentWPIndex = (idx + 1) % e.waypoints.length;
            }
        } else {
            // 如果没有路径点，创建默认路径点（当前位置周围）
            const defaultWaypoints = [];
            for (let i = 0; i < 3; i++) {
                const ang = (i * Math.PI * 2 / 3) + Math.random() * 0.5;
                const d = 100 + Math.random() * 50;
                const wx = e.x + Math.cos(ang) * d;
                const wy = e.y + Math.sin(ang) * d;
                if (wx >= 50 && wx <= canvas.width - 50 && wy >= 50 && wy <= canvas.height - 50 && !checkWall(wx, wy)) {
                    defaultWaypoints.push({ x: wx, y: wy });
                }
            }
            if (defaultWaypoints.length > 0) {
                e.waypoints = defaultWaypoints;
                e.currentWPIndex = 0;
            } else {
                // 如果无法创建路径点，至少设置一个目标（当前位置，不移动）
                tx = e.x;
                ty = e.y;
            }
        }
    } else {
        // 其他未知状态：也使用路径点系统
        if (e.waypoints && e.waypoints.length > 0) {
            const idx = e.currentWPIndex || 0;
            const wp = e.waypoints[idx];
            tx = wp.x;
            ty = wp.y;
            
            const distToWP = dist(e.x, e.y, tx, ty);
            if (distToWP < 5) {
                e.currentWPIndex = (idx + 1) % e.waypoints.length;
            }
        } else {
            // 如果没有路径点，创建默认路径点
            const defaultWaypoints = [];
            for (let i = 0; i < 3; i++) {
                const ang = (i * Math.PI * 2 / 3) + Math.random() * 0.5;
                const d = 100 + Math.random() * 50;
                const wx = e.x + Math.cos(ang) * d;
                const wy = e.y + Math.sin(ang) * d;
                if (wx >= 50 && wx <= canvas.width - 50 && wy >= 50 && wy <= canvas.height - 50 && !checkWall(wx, wy)) {
                    defaultWaypoints.push({ x: wx, y: wy });
                }
            }
            if (defaultWaypoints.length > 0) {
                e.waypoints = defaultWaypoints;
                e.currentWPIndex = 0;
            } else {
                tx = e.x;
                ty = e.y;
            }
        }
    }
    
    if (tx != null && ty != null) {
        let angleToTarget = Math.atan2(ty - e.y, tx - e.x);
        
        // 避障逻辑：检查目标方向是否有障碍物
        const lookAheadDist = 40;
        let avoidX = 0, avoidY = 0;
        let hasObs = false;
        
        const checkAngles = [0, -0.5, 0.5];
        for (let da of checkAngles) {
            const checkA = angleToTarget + da;  // 修复：检查目标方向，而不是当前角度
            const cx = e.x + Math.cos(checkA) * lookAheadDist;
            const cy = e.y + Math.sin(checkA) * lookAheadDist;
            if (checkWall(cx, cy)) {
                hasObs = true;
                avoidX -= Math.cos(checkA) * 2.0;
                avoidY -= Math.sin(checkA) * 2.0;
            }
        }
        
        if (hasObs) {
            const targetDx = Math.cos(angleToTarget);
            const targetDy = Math.sin(angleToTarget);
            const finalDx = targetDx + avoidX * 2.0;
            const finalDy = targetDy + avoidY * 2.0;
            e.angle = Math.atan2(finalDy, finalDx);
        } else {
            e.angle = angleToTarget;
        }
    }
    
    const mx = Math.cos(e.angle) * spd;
    const my = Math.sin(e.angle) * spd;
    if (!checkWall(e.x + mx, e.y + my)) {
        e.x += mx;
        e.y += my;
    } else {
        // 修复：尝试多个方向，而不是只旋转90度
        let foundDirection = false;
        const tryAngles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * 3 / 4, -Math.PI * 3 / 4, Math.PI, 0];
        for (let angleOffset of tryAngles) {
            const testAngle = e.angle + angleOffset;
            const testMx = Math.cos(testAngle) * spd;
            const testMy = Math.sin(testAngle) * spd;
            if (!checkWall(e.x + testMx, e.y + testMy)) {
                e.angle = testAngle;
                e.x += testMx;
                e.y += testMy;
                foundDirection = true;
                break;
            }
        }
        // 如果所有方向都被阻挡，保持当前角度（不移动）
        if (!foundDirection) {
            // 不移动，保持当前角度
        }
    }
}

// 更新敌人辐射场
function updateEnemyRadiation(enemy) {
    // 计算敌人能量消耗率（基础衰减 + 移动）
    const baseDecay = CFG.energyDecayRate;
    let energyConsumption = baseDecay;
    
    // 如果敌人在移动，增加消耗（简化处理，使用状态判断）
    if (enemy.state === 'alert' || enemy.state === 'patrol' || enemy.state === 'searching') {
        energyConsumption = baseDecay * 1.5; // 移动时1.5倍
    }
    
    // 查找或创建敌人的辐射场
    let enemyRadiation = state.entities.radiations.find(r => r.ownerId === enemy.id && r.ownerType === 'enemy');
    
    if (energyConsumption > 0 && enemy.state !== 'dormant') {
        // 计算辐射半径（受核心辐射倍率影响）
        const maxRadius = (CFG.radiationBaseRadius + energyConsumption * CFG.radiationEnergyMultiplier) * enemy.core.radiationMultiplier;
        
        if (enemyRadiation) {
            // 更新现有辐射场
            enemyRadiation.x = enemy.x;
            enemyRadiation.y = enemy.y;
            enemyRadiation.centerEnergy = energyConsumption;
            enemyRadiation.maxRadius = maxRadius;
        } else {
            // 创建新辐射场
            enemyRadiation = {
                x: enemy.x,
                y: enemy.y,
                centerEnergy: energyConsumption,
                maxRadius: maxRadius,
                ownerId: enemy.id,
                ownerType: 'enemy'
            };
            state.entities.radiations.push(enemyRadiation);
        }
    } else {
        // 能量消耗为0或休眠状态，移除辐射场
        if (enemyRadiation) {
            state.entities.radiations = state.entities.radiations.filter(r => r !== enemyRadiation);
        }
    }
}

// 休眠敌人吸收能量
function updateDormantEnemyAbsorption(enemy) {
    const absorptionRange = CFG.dormantAbsorptionRange;
    const absorptionRate = CFG.dormantAbsorptionRate;
    
    let absorbedFromPlayer = false;
    
    // 0. 自然恢复（非常缓慢，比吸收慢得多）
    const naturalRegen = CFG.dormantNaturalRegenRate;
    enemy.en = Math.min(CFG.enemyMaxEnergy, enemy.en + naturalRegen);
    
    // 1. 吸收玩家能量
    const distToPlayer = dist(enemy.x, enemy.y, state.p.x, state.p.y);
    if (distToPlayer < absorptionRange && state.p.en > 0) {
        const absorbed = Math.min(absorptionRate, state.p.en);
        state.p.en -= absorbed;
        enemy.en = Math.min(CFG.enemyMaxEnergy, enemy.en + absorbed);
        absorbedFromPlayer = true;
    }
    
    // 如果吸收了玩家能量，显示红色边缘警告
    if (absorbedFromPlayer) {
        flashEdgeGlow('red', 50); // 短暂的红色闪烁警告
    }
    
    // 2. 吸收其他敌人能量
    state.entities.enemies.forEach(other => {
        if (other === enemy || other.isDormant || other.isDestroyed) return;
        
        const distToOther = dist(enemy.x, enemy.y, other.x, other.y);
        if (distToOther < absorptionRange && other.en > 0) {
            const absorbed = Math.min(absorptionRate, other.en);
            other.en -= absorbed;
            enemy.en = Math.min(CFG.enemyMaxEnergy, enemy.en + absorbed);
            
            // 被吸收的敌人也可能进入休眠
            if (other.en <= 0) {
                other.isDormant = true;
                other.state = 'dormant';
                other.en = 0;
            }
        }
    });
    
    // 3. 吸收辐射场能量
    state.entities.radiations.forEach(rad => {
        if (rad.ownerType === 'enemy' && rad.ownerId === enemy.id) return;
        
        const distToRad = dist(enemy.x, enemy.y, rad.x, rad.y);
        if (distToRad < absorptionRange && rad.centerEnergy > 0) {
            const absorbed = Math.min(absorptionRate, rad.centerEnergy);
            rad.centerEnergy -= absorbed;
            enemy.en = Math.min(CFG.enemyMaxEnergy, enemy.en + absorbed);
        }
    });
}

// 更新敌人
function updateEnemies() {
    const enemiesToRemove = []; // 需要移除的敌人
    
    state.entities.enemies.forEach(e => {
        // 检查报废状态
        if (e.isDestroyed) {
            enemiesToRemove.push(e);
            spawnParticles(e.x, e.y, '#666666', 30);
            // 掉落核心（可以后续实现）
            return;
        }
        
        // 检查休眠状态
        if (e.isDormant) {
            // 休眠敌人主动吸收能量
            updateDormantEnemyAbsorption(e);
            
            // 检查是否达到恢复阈值
            if (e.en >= CFG.enemyMaxEnergy * CFG.dormantWakeupThreshold) {
                e.isDormant = false;
                e.state = 'patrol';
                logMsg("DORMANT ENEMY REACTIVATED");
            }
            
            // 休眠敌人仍然可以被共振累积过载值（后续处理）
            return;
        }
        
        // 能量自然衰减（受核心影响）
        const baseDecay = CFG.energyDecayRate * e.core.energyMultiplier;
        e.en = Math.max(0, e.en - baseDecay);
        
        // 能量耗尽进入休眠
        if (e.en <= 0 && !e.isDormant) {
            e.isDormant = true;
            e.en = 0;
            e.state = 'dormant';
            // 休眠敌人会保留在场景中，不会被移除
            return;
        }
        
        if(e.resonanceCD > 0) e.resonanceCD--;
        if(e.grabCooldown > 0) e.grabCooldown--;
        
        // 处理硬直状态
        if (e.overloadedStunTimer && e.overloadedStunTimer > 0) {
            e.overloadedStunTimer--;
            // 硬直期间无法移动、发波、抓取，直接跳过移动逻辑
            if (e.overloadedStunTimer > 0) {
                // 硬直期间仍然可以更新其他逻辑（如过载衰减）
            }
        }
        
        // 能量自然衰减（非休眠状态）
        if (e.state !== 'dormant') {
            e.en = Math.max(0, e.en - CFG.energyDecayRate);
            // 能量归零时进入休眠状态
            if (e.en <= 0 && e.state !== 'dormant') {
                e.state = 'dormant';
                logMsg("TARGET DORMANT");
            }
        }
        
        // 更新敌人辐射场
        updateEnemyRadiation(e);
        
        // 过载条自然衰减
        e.overload = Math.max(0, e.overload - CFG.overloadDecayRate);
        
        const dToP = dist(e.x, e.y, state.p.x, state.p.y);
        
        if(e.state === 'grabbing') {
            // 抓取状态：停止移动，检查玩家是否挣脱
            if (!state.p.isGrabbed || state.p.grabberEnemy !== e) {
                // 玩家已挣脱，恢复正常状态
                e.state = 'alert';
                e.grabCooldown = CFG.grabCD; // 设置抓取冷却
            }
            // 检查过载中断条件
            if (e.overload >= CFG.maxOverload) {
                e.state = 'stunned';
                e.isPerfectStun = false;
                e.timer = CFG.stunTime / 2;
                e.canBeDetonated = true;
                state.p.isGrabbed = false;
                state.p.grabberEnemy = null;
                logMsg("GRAB INTERRUPTED - TARGET OVERLOADED");
            }
            // 抓取状态下不移动，不更新其他逻辑
            return;
        } else if(e.state === 'dormant') {
            // 休眠状态：停止AI移动、不发波、不抓取
            // 但可以感知能耗辐射、吸收生物波能量、被共振
            // 如果能量恢复到1/2以上，唤醒敌人
            if (e.en >= CFG.enemyMaxEnergy / 2) {
                e.state = 'patrol';
                logMsg("TARGET AWAKENED");
            }
            
            // 休眠敌人吸收与之接触的能耗辐射
            state.entities.radiations.forEach(radiation => {
                const distToRadiation = dist(e.x, e.y, radiation.x, radiation.y);
                if (distToRadiation <= radiation.maxRadius) {
                    // 计算该距离处的能量值
                    let energyValue = 0;
                    if (distToRadiation > 0.01) {
                        energyValue = radiation.centerEnergy / (2 * Math.PI * distToRadiation);
                    } else {
                        energyValue = radiation.centerEnergy; // 距离太近，使用中心能量
                    }
                    
                    // 将能量值转换为敌人能量恢复（使用转换率，避免恢复过快）
                    const conversionRate = 0.1; // 10%的转换率
                    const energyGain = energyValue * conversionRate;
                    e.en = Math.min(CFG.enemyMaxEnergy, e.en + energyGain);
                    
                    // 如果能量达到1/2，唤醒敌人（上面的检查会处理）
                }
            });
            
            return;
        } else if(e.state === 'grabbed_by_player') {
            // 被玩家抓取状态：停止移动
            return;
        } else if(e.state === 'stunned') {
            e.timer--;
            
            // stun状态不发出任何波，也不造成伤害
            
            if(e.timer <= 0) {
                // 倒计时结束，恢复正常状态
                e.state = 'alert';
                e.canBeDetonated = false;
                e.isPerfectStun = false;
                logMsg("TARGET RECOVERED");
            }
        } else if(e.state === 'detonating') {
            // 激发态处理
            // detonating状态不造成伤害
            
            if (!e.isPerfectStun) {
                // 普通共振：立即释放一次波，然后死亡
                emitWave(e.x, e.y, 0, Math.PI*2, e.freq, 'pulse', e.id);
                enemiesToRemove.push(e);
                spawnParticles(e.x, e.y, '#ff0000', 50);
            } else {
                // 完美共振：持续释放多次波，频率递减
                // 初始化属性
                if (e.detonatePulseTimer === undefined) {
                    e.detonatePulseTimer = 0;
                    e.detonateCurrentFreq = e.freq;
                }
                
                // 每隔60帧释放一次波
                if (e.detonatePulseTimer <= 0) {
                    emitWave(e.x, e.y, 0, Math.PI*2, e.detonateCurrentFreq, 'pulse', e.id);
                    spawnParticles(e.x, e.y, '#ff0000', 30);
                    
                    // 频率递减50Hz，最低100Hz
                    e.detonateCurrentFreq = Math.max(100, e.detonateCurrentFreq - 50);
                    
                    // 如果频率已经降到100Hz，释放完最后一波后死亡
                    if (e.detonateCurrentFreq <= 100) {
                        enemiesToRemove.push(e);
                        spawnParticles(e.x, e.y, '#ff0000', 100);
                    } else {
                        e.detonatePulseTimer = 60; // 重置计时器（1秒）
                    }
                } else {
                    e.detonatePulseTimer--;
                }
            }
        } else {
            // 碰撞检测：抓取玩家（硬直期间、无敌期间无法抓取）
            if(dToP < 25 && !state.p.isGrabbed && e.grabCooldown <= 0 && 
               state.p.grabImmunity <= 0 &&  // 检查玩家是否处于无敌时间
               e.state !== 'stunned' && e.state !== 'detonating' &&
               (!e.overloadedStunTimer || e.overloadedStunTimer <= 0)) {
                // 抓取玩家
                state.p.isGrabbed = true;
                state.p.grabberEnemy = e;
                state.p.struggleProgress = 0;
                e.state = 'grabbing';
                e.grabCooldown = CFG.grabCD; // 设置抓取冷却
                logMsg("GRABBED!");
            }
            updateEnemyMovement(e);
        }
    });
    
    // 第二遍：检测所有辐射场，对每个敌人进行能量感知（休眠敌人也可以感知）
    state.entities.radiations.forEach(radiation => {
        state.entities.enemies.forEach(e => {
            if (e.state !== 'stunned' && e.state !== 'detonating') {
                checkEnergyDetection({ type: 'radiation', x: radiation.x, y: radiation.y, centerEnergy: radiation.centerEnergy }, e);
            }
        });
    });
    
    // 第二点五遍：检测核心能量（玩家和敌人）
    // 检测玩家核心能量
    state.entities.enemies.forEach(e => {
        if (e.state !== 'stunned' && e.state !== 'detonating') {
            const distToPlayer = dist(state.p.x, state.p.y, e.x, e.y);
            if (distToPlayer <= e.detectionRadius && state.p.en > 0) {
                checkEnergyDetection({ 
                    type: 'core', 
                    x: state.p.x, 
                    y: state.p.y, 
                    coreEnergy: state.p.en 
                }, e);
            }
        }
    });
    
    // 检测其他敌人核心能量（敌人之间互相感知）
    state.entities.enemies.forEach(e => {
        if (e.state !== 'stunned' && e.state !== 'detonating') {
            state.entities.enemies.forEach(otherEnemy => {
                // 跳过自己
                if (otherEnemy === e) return;
                // 跳过stunned和detonating状态的敌人
                if (otherEnemy.state === 'stunned' || otherEnemy.state === 'detonating') return;
                
                const distToOther = dist(otherEnemy.x, otherEnemy.y, e.x, e.y);
                if (distToOther <= e.detectionRadius && otherEnemy.en > 0) {
                    checkEnergyDetection({ 
                        type: 'core', 
                        x: otherEnemy.x, 
                        y: otherEnemy.y, 
                        coreEnergy: otherEnemy.en 
                    }, e);
                }
            });
        }
    });
    
    // 第三遍：更新所有敌人的UI
    state.entities.enemies.forEach(e => {
        updateEnemyUI(e);
    });
    
    // 移除死亡的敌人（同时移除其辐射场）
    enemiesToRemove.forEach(e => {
        state.entities.enemies = state.entities.enemies.filter(x => x !== e);
        // 移除敌人的辐射场
        state.entities.radiations = state.entities.radiations.filter(r => r.ownerId !== e.id);
        if(e.uiElement) e.uiElement.remove();
        if(e.executeHintElement) e.executeHintElement.remove();
        if(e.struggleHintElement) e.struggleHintElement.remove();
        if(e.grabHintElement) e.grabHintElement.remove();
    });
}

