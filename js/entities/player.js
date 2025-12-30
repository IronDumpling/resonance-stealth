/**
 * 处理玩家休眠状态
 */
function handlePlayerDormancy() {
    // 休眠时辐射场逐渐消失
    const playerRadiation = state.entities.radiations.find(r => r.ownerId === 'player' && r.ownerType === 'player');
    if (playerRadiation) {
        playerRadiation.radius *= 0.95;
        if (playerRadiation.radius < 5) {
            const index = state.entities.radiations.indexOf(playerRadiation);
            if (index !== -1) {
                state.entities.radiations.splice(index, 1);
            }
        }
    }
    
    // 按R键重启（使用能量瓶）
    if (state.keys.r) {
        // 检查是否有能量瓶
        if (getInventoryCount('energy_flask') > 0) {
            // 消耗能量瓶并使用addEnergy增加能量
            if (removeFromInventory('energy_flask')) {
                addEnergy(CFG.energyFlaskVal);
                state.p.isDormant = false;
                logMsg("SYSTEM REBOOTED");
                state.keys.r = false; // 防止连续触发
            }
        } else {
            logMsg("NO ENERGY FLASK - CANNOT RESTART");
            state.keys.r = false; // 防止连续触发
        }
    }
}

/**
 * 处理玩家报废
 */
function handlePlayerDestruction() {
    logMsg("ROBOT DESTROYED");
    // TODO: 触发场景切换到组装界面
    // sceneManager.switchScene(SCENES.ASSEMBLY);
}

// 更新玩家辐射场
function updatePlayerRadiation() {
    // 计算当前能量消耗率（受核心影响）
    const baseDecay = CFG.energyDecayRate * state.p.currentCore.energyMultiplier;
    let energyConsumption = baseDecay;
    
    // 检测移动状态
    if (!state.p.isGrabbed && !state.p.isGrabbingEnemy) {
        let dx=0, dy=0;
        if(state.keys.w) dy-=1; if(state.keys.s) dy+=1;
        if(state.keys.a) dx-=1; if(state.keys.d) dx+=1;
        if(dx||dy) {
            const isSprinting = state.keys.shift || false;
            if (isSprinting) {
                energyConsumption = baseDecay * 3.0; // 奔跑时3倍
            } else {
                energyConsumption = baseDecay * 2.0; // 移动时2倍
            }
        }
    }
    
    // 查找或创建玩家的辐射场
    let playerRadiation = state.entities.radiations.find(r => r.ownerId === 'player' && r.ownerType === 'player');
    
    if (energyConsumption > 0) {
        // 计算辐射半径（受核心辐射倍率影响）
        const maxRadius = (CFG.radiationBaseRadius + energyConsumption * CFG.radiationEnergyMultiplier) * state.p.currentCore.radiationMultiplier;
        
        if (playerRadiation) {
            // 更新现有辐射场
            playerRadiation.x = state.p.x;
            playerRadiation.y = state.p.y;
            playerRadiation.centerEnergy = energyConsumption;
            playerRadiation.maxRadius = maxRadius;
        } else {
            // 创建新辐射场
            playerRadiation = {
                x: state.p.x,
                y: state.p.y,
                centerEnergy: energyConsumption,
                maxRadius: maxRadius,
                ownerId: 'player',
                ownerType: 'player'
            };
            state.entities.radiations.push(playerRadiation);
        }
    } else {
        // 能量消耗为0，移除辐射场
        if (playerRadiation) {
            state.entities.radiations = state.entities.radiations.filter(r => r !== playerRadiation);
        }
    }
}

// 聚焦逻辑
function updateFocus() {
    // 被抓取或硬直状态时无法蓄力或发波
    if(state.p.isGrabbed || (state.p.overloadedStunTimer && state.p.overloadedStunTimer > 0)) {
        if(state.p.isCharging) {
            // 如果正在蓄力，立即重置蓄力状态
            state.p.isCharging = false;
            state.focusLevel = 0;
            state.p.chargeStartTime = 0;
            state.p.shouldShowAimLine = false;
        }
        return;
    }
    
    if(state.keys.space) {
        if(!state.p.isCharging) {
            // 开始蓄力：记录开始时间，重置聚焦等级
            state.p.isCharging = true;
            state.focusLevel = 0;
            state.p.chargeStartTime = Date.now() / 1000; // 记录开始时间（秒）
        }
        
        if(state.p.isCharging) {
            // 计算已蓄力时间（秒）
            const chargeTime = (Date.now() / 1000) - state.p.chargeStartTime;
            
            // 蓄力延迟期角度不缩小，focusLevel 保持为 0
            if(chargeTime >= CFG.focusChargeDelay) {
                // 延迟期过后，开始缓慢增加 focusLevel
                // 使用更平滑的增长曲线增强蓄力感（平方根曲线）
                const effectiveChargeTime = chargeTime - CFG.focusChargeDelay;
                const normalizedTime = Math.min(1, effectiveChargeTime / 3); // 3秒达到最大聚焦
                state.focusLevel = Math.min(1, Math.sqrt(normalizedTime));
            }
            // 如果还在延迟期内，focusLevel 保持为 0（已在初始化时设置）
            
            // 计算当前蓄力状态下的预期波纹能量，判断是否显示辅助瞄准线
            const currentSpread = lerp(CFG.maxSpread, CFG.minSpread, state.focusLevel);
            
            // 逻辑计算 baseEnergy
            const freqFactor = 0.5 + (state.freq - CFG.freqMin) / (CFG.freqMax - CFG.freqMin);
            const baseEnergy = CFG.baseWaveEnergy * freqFactor;
            const energyPerPoint = calculateWaveEnergyPerPoint(baseEnergy, CFG.initialRadius, currentSpread);
             
            // 如果能量达到 infoLevelAnalyze，显示辅助瞄准线
            state.p.shouldShowAimLine = energyPerPoint >= CFG.infoLevelAnalyze;
        } else {
            // 不在蓄力时，不显示辅助瞄准线
            state.p.shouldShowAimLine = false;
        }
    } else {
        // 松开 Space 键时，重置蓄力状态
        if(state.p.isCharging) {
            state.p.isCharging = false;
            state.p.chargeStartTime = 0;
            state.p.shouldShowAimLine = false;
        }
    }
}

// 释放扫描
function releaseScan() {
    if(!state.p.isCharging) return;
    // 硬直状态无法发波
    if(state.p.overloadedStunTimer && state.p.overloadedStunTimer > 0) return;
    
    // 计算当前角度（弧度）
    const currentSpread = lerp(CFG.maxSpread, CFG.minSpread, state.focusLevel);
    
    // 能量消耗公式（0~10）：频率越高、角度越聚焦，消耗越大
    const freqNorm = (state.freq - CFG.freqMin) / (CFG.freqMax - CFG.freqMin); // 0~1
    const focusNorm = clamp(1 - currentSpread / CFG.maxSpread, 0, 1);          // 0~1（360°=0，极窄≈1）
    const rawCost = 5 * freqNorm + 5 * focusNorm;                              // 理论范围约0~10
    const energyCost = clamp(Math.round(rawCost), 0, 10);
    
    // 检查能量是否足够（检查最大消耗长按能量）
    if(state.p.en < energyCost) {
        logMsg("LOW ENERGY - CANNOT EMIT");
        state.p.isCharging = false;
        state.focusLevel = 0;
        return;
    }

    state.p.en -= energyCost;
    
    // --- 弹反判定逻辑 ---
    let isParry = false;
    let isPerfectParry = false;
    let energyMult = 1.0;
    
    // 寻找接近的敌方波纹
    // 判定条件：非玩家波，非pulse波，频率在共振范围内，且波纹边缘与玩家距离极近
    const hitWave = state.entities.waves.find(w => {
        if (w.source === 'player' || w.source === 'pulse') return false;
        if (Math.abs(w.freq - state.freq) > CFG.normalResTol) return false;
        
        // 计算波纹边缘与玩家的距离
        const distToPlayer = dist(w.x, w.y, state.p.x, state.p.y);
        const distToEdge = Math.abs(distToPlayer - w.r);
        
        return distToEdge < CFG.parryDistanceThreshold;
    });
    
    if (hitWave) {
        isParry = true;
        
        // 判定是否完美共振
        const freqDelta = Math.abs(hitWave.freq - state.freq);
        isPerfectParry = freqDelta <= CFG.perfectResTol;
        
        // 计算能量倍率：完美弹反2倍，普通弹反1倍
        energyMult = isPerfectParry ? 2.0 : 1.0;
        
        // 能量奖励
        const reward = isPerfectParry ? CFG.parryRewardPerfect : CFG.parryRewardNormal;
        addEnergy(reward);

        logMsg(isPerfectParry ? "PERFECT RESONANCE REFLECTION" : "WAVE DEFLECTED");
        
        // 为了保护玩家，触发弹反的瞬间，这道贴脸的波纹必须立刻消失
        hitWave._toRemove = true;
    }
    
    // --- 发射波纹 ---
    emitWave(
        state.p.x, state.p.y, 
        state.p.a, 
        currentSpread, 
        state.freq, 
        'player', 
        null, 
        false,          // isChain
        isParry,        // isParry
        isPerfectParry, // isPerfectParry
        energyMult      // energyMult
    );
    
    state.p.isCharging = false; 
    state.focusLevel = 0;
    state.p.shouldShowAimLine = false; // 释放时不显示辅助瞄准线
}

// 提升主能量（溢出部分直接消失，并显示绿色闪烁）
function addEnergy(amount) {
    if (amount <= 0) return;
    
    const spaceInMain = CFG.maxEnergy - state.p.en;
    const toMain = Math.min(spaceInMain, amount);
    
    if (toMain > 0) {
        state.p.en += toMain;
        // 主能量提升时，显示绿色边缘闪烁
        flashEdgeGlow('green', 150);
    }
    
    // 溢出部分直接消失，不存储
}

// 统一交互逻辑 (暗杀抓取 + 拾取 + 处决)
function tryInteract() {
    // 0. 优先尝试暗杀抓取（未警觉的敌人）
    if (!state.p.isGrabbed && !state.p.isGrabbingEnemy) {
        const stealthTargets = state.entities.enemies.filter(
            e => (e.state === 'patrol' || e.state === 'idle') &&
            dist(e.x, e.y, state.p.x, state.p.y) < CFG.stealthGrabDistance &&
            e.state !== 'dormant'
        );
        
        if (stealthTargets.length > 0) {
            const target = stealthTargets[0];
            state.p.isGrabbingEnemy = target;
            target.state = 'grabbed_by_player';
            logMsg("STEALTH GRAB INITIATED");
            return;
        }
    }
    
    // 1. 优先尝试处决
    const enemies = state.entities.enemies.filter(
        e => e.state === 'stunned' && 
        e.canBeDetonated && 
        dist(e.x,e.y,state.p.x,state.p.y) < 80
    );

    if(enemies.length > 0) {
        const Target = enemies[0];
        
        // 再次检查状态，防止在检查和处理之间状态被改变
        if (Target.state !== 'stunned' || !Target.canBeDetonated) {
            return;
        }
        
        // 设置敌人为激发态
        Target.state = 'detonating';
        // 立即清除可处决标记，防止重复触发
        Target.canBeDetonated = false;
        
        // 记录是否是休眠状态
        const wasDormant = Target.isDormant;
        
        // 根据敌人能量决定是否释放共振波
        if (Target.en > 0) {
            // 能量>0：保持现有逻辑释放共振波
            // 根据共振类型给予不同奖励
            if (Target.isPerfectStun) {
                // 完美共振：能量+100%
                addEnergy(CFG.maxEnergy);
                logMsg("ECHO BEACON DETONATED - CASCADE INITIATED");
            } else {
                // 普通共振：能量+50%
                addEnergy(CFG.maxEnergy * 0.5);
                logMsg("ECHO BEACON DETONATED - AREA REVEALED");
            }
        }
        
        // 根据敌人状态决定掉落核心类型
        if (wasDormant || Target.en <= 0) {
            // 休眠敌人或无能量：掉落冷核心（立即回复能量）
            spawnCoreAtEnemy(Target, 'core_cold');
            logMsg("COLD CORE EXTRACTED");
        } else {
            // 活跃敌人有能量：掉落热核心（收集）
            if (Target.en > CFG.enemyMaxEnergy * 0.5) {
                spawnCoreAtEnemy(Target, 'core_hot');
                logMsg("HOT CORE EXTRACTED");
            } else {
                spawnCoreAtEnemy(Target, 'core_cold');
                logMsg("DEPLETED CORE EXTRACTED");
            }
        }
        
        // 视觉反馈
        flashEdgeGlow('white', 100); // 边缘白闪
        spawnParticles(Target.x, Target.y, '#ff0000', 50); // 红色粒子
        
        // 不立即移除敌人，让 updateEnemies 在下一帧处理激发态并释放波
        return;
    }

    // 2. 尝试拾取物品（使用新的物品系统）
    if(tryPickupItem()) {
        return;
    }
}

// 创建玩家抓取提示UI
function createPlayerGrabHintUI() {
    const div = document.createElement('div');
    div.className = 'player-grab-hint';
    div.style.cssText = `
        position: absolute;
        background: rgba(0, 255, 255, 0.2);
        border: 2px solid #00ffff;
        padding: 8px 12px;
        font-size: 14px;
        color: #00ffff;
        pointer-events: none;
        white-space: nowrap;
        transform: translate(-50%, -100%);
        text-shadow: 0 0 5px #00ffff;
        z-index: 1000;
    `;
    div.textContent = '[E] DRAIN ENERGY';
    document.body.appendChild(div);
    return div;
}

// 更新玩家抓取提示UI
function updatePlayerGrabHint() {
    let canGrab = false;
    let targetEnemy = null;
    
    if (!state.p.isGrabbingEnemy && !state.p.isGrabbed && !state.p.isDormant && !state.p.isDestroyed) {
        for (const enemy of state.entities.enemies) {
            if (enemy.state === 'alert' || enemy.state === 'grabbed_by_player' || 
                enemy.state === 'grabbing' || enemy.isDormant || enemy.isDestroyed) {
                continue;
            }
            
            const distance = dist(state.p.x, state.p.y, enemy.x, enemy.y);
            const freqDiff = Math.abs(state.freq - enemy.freq);
            
            if (distance <= CFG.playerGrabDistance && freqDiff <= CFG.normalResTol) {
                canGrab = true;
                targetEnemy = enemy;
                break;
            }
        }
    }
    
    // 显示/隐藏UI提示
    if (canGrab && targetEnemy) {
        if (!state.p.grabHintElement) {
            state.p.grabHintElement = createPlayerGrabHintUI();
        }
        const screenPos = worldToScreen(targetEnemy.x, targetEnemy.y - 40);
        state.p.grabHintElement.style.display = 'block';
        state.p.grabHintElement.style.left = screenPos.x + 'px';
        state.p.grabHintElement.style.top = screenPos.y + 'px';
    } else {
        if (state.p.grabHintElement) {
            state.p.grabHintElement.style.display = 'none';
        }
    }
}

// 尝试抓取敌人（按E键触发）
function tryGrabEnemy() {
    // 条件检查
    if (state.p.isGrabbingEnemy || state.p.isGrabbed || state.p.isDormant || state.p.isDestroyed) {
        return;
    }
    
    // 寻找可以抓取的敌人
    for (const enemy of state.entities.enemies) {
        // 1. 敌人未警觉
        if (enemy.state === 'alert' || enemy.state === 'grabbed_by_player' || enemy.state === 'grabbing' || enemy.isDormant || enemy.isDestroyed) {
            continue;
        }
        
        // 2. 距离足够近
        const distance = dist(state.p.x, state.p.y, enemy.x, enemy.y);
        if (distance > CFG.playerGrabDistance) {
            continue;
        }
        
        // 3. 同频（在共振范围内）
        const freqDiff = Math.abs(state.freq - enemy.freq);
        if (freqDiff > CFG.normalResTol) {
            continue;
        }
        
        // 成功抓取
        state.p.isGrabbingEnemy = enemy;
        enemy.state = 'grabbed_by_player';
        enemy.struggleProgress = 0;
        logMsg("GRABBING TARGET");
        return;
    }
}

// 更新玩家抓取敌人
function updatePlayerGrab() {
    if (!state.p.isGrabbingEnemy) {
        return;
    }
    
    const enemy = state.p.isGrabbingEnemy;
    
    // 检查中断条件
    if (state.p.isGrabbed) {
        // 玩家被其他敌人抓取
        state.p.isGrabbingEnemy = null;
        enemy.state = 'patrol';
        enemy.struggleProgress = 0;
        logMsg("GRAB INTERRUPTED");
        return;
    }
    
    if (state.p.overload >= CFG.maxOverload) {
        // 玩家过载值上升并触发stunned
        state.p.isGrabbingEnemy = null;
        enemy.state = 'alert';
        enemy.struggleProgress = 0;
        logMsg("GRAB INTERRUPTED - OVERLOADED");
        return;
    }
    
    if (enemy.state !== 'grabbed_by_player') {
        // 敌人进入其他状态
        state.p.isGrabbingEnemy = null;
        enemy.struggleProgress = 0;
        return;
    }
    
    // 持续吸收能量
    const drainAmount = CFG.playerGrabEnergyDrain;
    enemy.en = Math.max(0, enemy.en - drainAmount);
    addEnergy(drainAmount);
    
    // 敌人挣脱机制
    if (Math.random() < CFG.enemyStruggleChance) {
        enemy.struggleProgress = Math.min(100, enemy.struggleProgress + CFG.enemyStruggleProgressGain);
        
        // 玩家消耗耐久度
        state.p.durability = Math.max(0, state.p.durability - CFG.beingStruggledDurabilityLoss);
        
        // 耐久度归零游戏结束
        if (state.p.durability <= 0) {
            state.p.isDestroyed = true;
            state.p.isGrabbingEnemy = null;
            enemy.state = 'alert';
            enemy.struggleProgress = 0;
            logMsg("DURABILITY DEPLETED - SYSTEM FAILURE");
            return;
        }
        
        // 挣脱成功
        if (enemy.struggleProgress >= 100) {
            state.p.isGrabbingEnemy = null;
            enemy.state = 'alert';
            enemy.struggleProgress = 0;
            logMsg("TARGET BROKE FREE!");
            return;
        }
    }
    
    // 如果敌人能量归零，进入休眠状态，结束抓取
    if (enemy.en <= 0) {
        enemy.isDormant = true;
        enemy.state = 'dormant';
        state.p.isGrabbingEnemy = null;
        enemy.struggleProgress = 0;
        logMsg("TARGET DRAINED - DORMANT");
    }
}

// 挣脱系统
function updateStruggle() {
    if (!state.p.isGrabbed) {
        state.p.struggleProgress = 0;
        state.p.grabParticleTimer = 0;
        return;
    }
    
    // 每帧衰减进度
    state.p.struggleProgress = Math.max(0, state.p.struggleProgress - CFG.struggleProgressDecay);
    
    // 按F增加进度（消耗耐久）
    if (state.keys.f) {
        state.p.struggleProgress = Math.min(CFG.struggleProgressMax, state.p.struggleProgress + CFG.struggleProgressGain);
        state.p.durability = Math.max(0, state.p.durability - CFG.struggleDurabilityLoss);
        state.keys.f = false; // 防止连续触发
        
        // 耐久度归零游戏结束
        if (state.p.durability <= 0) {
            state.p.isDestroyed = true;
            logMsg("DURABILITY DEPLETED - SYSTEM FAILURE");
        }
    }
    
    // 进度满时挣脱
    if (state.p.struggleProgress >= CFG.struggleProgressMax) {
        // 给玩家无敌时间
        state.p.grabImmunity = CFG.playerGrabImmunityTime;
        
        // 给抓取者设置更长的冷却时间
        if (state.p.grabberEnemy) {
            state.p.grabberEnemy.grabCooldown = CFG.grabCDAfterStruggle;
        }
        
        state.p.isGrabbed = false;
        state.p.grabberEnemy = null;
        state.p.struggleProgress = 0;
        logMsg("BREAK FREE");
        spawnParticles(state.p.x, state.p.y, '#00ffff', 20);
        return;
    }
    
    // 被抓取时持续流失能量，敌人吸收能量
    const drainAmount = CFG.grabEnergyDrainRatePlayer;
    state.p.en = Math.max(0, state.p.en - drainAmount);
    if (state.p.grabberEnemy) {
        state.p.grabberEnemy.en = Math.min(CFG.enemyMaxEnergy, state.p.grabberEnemy.en + drainAmount);
    }
    
    // 能量归零时，自动结束抓取状态（不消耗耐久度）
    if (state.p.en <= 0) {
        state.p.isGrabbed = false;
        const grabber = state.p.grabberEnemy;
        state.p.grabberEnemy = null;
        state.p.struggleProgress = 0;
        
        // 释放抓取者状态
        if (grabber) {
            grabber.state = 'alert';
            grabber.grabCooldown = CFG.grabCD;
        }
        
        logMsg("ENERGY DEPLETED - GRAB RELEASED");
        return;
    }
    
    // 每10帧生成一次青色粒子，表现能量流失
    state.p.grabParticleTimer++;
    if (state.p.grabParticleTimer >= 10) {
        spawnParticles(state.p.x, state.p.y, '#00ffff', 20);
        state.p.grabParticleTimer = 0;
    }
}

// 使用能量瓶补充主能量（R键）
function updateEnergyFlask() {
    if (state.keys.r && state.p.en < CFG.maxEnergy) {
        // 使用背包中的能量瓶
        if (useEnergyFlask()) {
            state.keys.r = false;
        }
    }
}

// 更新玩家状态
function updatePlayer() {
    // 检查报废状态
    if (state.p.isDestroyed) {
        handlePlayerDestruction();
        return; // 报废后不再更新
    }
    
    // 检查休眠状态
    if (state.p.isDormant) {
        handlePlayerDormancy();
        return; // 休眠时不更新其他逻辑
    }
    
    // 能量自然衰减（受核心影响）
    const baseDecay = CFG.energyDecayRate * state.p.currentCore.energyMultiplier;
    state.p.en = Math.max(0, state.p.en - baseDecay);
    
    // 能量耗尽进入休眠（在处理之前先清除抓取状态）
    if (state.p.en <= 0 && !state.p.isDormant) {
        // 如果正在被抓取，先释放抓取状态
        if (state.p.isGrabbed) {
            state.p.isGrabbed = false;
            const grabber = state.p.grabberEnemy;
            state.p.grabberEnemy = null;
            state.p.struggleProgress = 0;
            
            // 释放抓取者状态
            if (grabber) {
                grabber.state = 'alert';
                grabber.grabCooldown = CFG.grabCD;
            }
        }
        
        // 进入休眠
        state.p.isDormant = true;
        state.p.en = 0;
        logMsg("SYSTEM DORMANT - PRESS [R] TO RESTART");
        return;
    }
    
    // 处理硬直状态
    if (state.p.overloadedStunTimer && state.p.overloadedStunTimer > 0) {
        state.p.overloadedStunTimer--;
    }
    
    // 更新辐射场
    updatePlayerRadiation();
    
    updateFocus(); 
    updateStruggle();
    updateEnergyFlask();
    updatePlayerGrab();
    updatePlayerGrabHint();
    
    // 按E键尝试抓取敌人
    if (state.keys.e && !state.p.isGrabbingEnemy && !state.p.isGrabbed) {
        tryGrabEnemy();
        state.keys.e = false; // 防止连续触发
    }
    
    // 被抓取、抓取敌人或硬直状态时无法移动
    if (!state.p.isGrabbed && !state.p.isGrabbingEnemy && (!state.p.overloadedStunTimer || state.p.overloadedStunTimer <= 0)) {
        // 移动
        let dx=0, dy=0;
        if(state.keys.w) dy-=1; if(state.keys.s) dy+=1;
        if(state.keys.a) dx-=1; if(state.keys.d) dx+=1;
        if(dx||dy) {
            const len = Math.hypot(dx,dy);
            let spd = (state.p.isCharging ? CFG.pSpeed * 0.3 : CFG.pSpeed) * state.p.currentCore.speedMultiplier;
            // 速度降低：过载值 >= 2/3 时，速度降低50%
            if (state.p.overload >= CFG.maxOverload * 2 / 3) {
                spd *= 0.5;
            }
            const nx = state.p.x + (dx/len)*spd; 
            const ny = state.p.y + (dy/len)*spd;
            
            // 碰撞检测（不再扣除耐久）
            if(!checkWall(nx, state.p.y)) state.p.x = nx;
            if(!checkWall(state.p.x, ny)) state.p.y = ny;
        }
    }
    
    // 角度跟随鼠标
    state.p.a = Math.atan2(state.mouse.y - state.p.y, state.mouse.x - state.p.x);
    
    // 冷却时间
    if(state.p.invuln > 0) state.p.invuln--;
    if(state.p.resonanceCD > 0) state.p.resonanceCD--;
    if(state.p.grabImmunity > 0) state.p.grabImmunity--;
    
    // 过载条自然衰减
    state.p.overload = Math.max(0, state.p.overload - CFG.overloadDecayRate);
    
    // 玩家过载满时，无法移动、发波（通过硬直状态实现，过载满时设置一个很长的硬直时间）
    if (state.p.overload >= CFG.maxOverload) {
        // 设置硬直时间，直到过载值降到2/3以下
        if (!state.p.overloadedStunTimer || state.p.overloadedStunTimer <= 0) {
            // 设置一个很长的硬直时间，每帧检查过载值
            state.p.overloadedStunTimer = 1; // 设置为1，每帧更新
        }
        // 如果过载值仍然满，保持硬直
        if (state.p.overload >= CFG.maxOverload) {
            state.p.overloadedStunTimer = 1; // 保持硬直
        }
    }
    
    // 瞄准线raycast检测
    updateAimLineRaycast();
}

// 更新瞄准线raycast检测
function updateAimLineRaycast() {
    if (!state.p.shouldShowAimLine) {
        state.p.aimLineHit = null;
        return;
    }
    
    const maxLength = CFG.pViewDist * 2;
    const dx = Math.cos(state.p.a);
    const dy = Math.sin(state.p.a);
    
    let closestHit = null;
    let closestDist = Infinity;
    
    // 检测敌人碰撞
    for (const enemy of state.entities.enemies) {
        const hit = rayCircleIntersect(state.p.x, state.p.y, dx, dy, enemy.x, enemy.y, enemy.r);
        if (hit !== null && hit > 0 && hit < maxLength && hit < closestDist) {
            closestDist = hit;
            closestHit = {
                type: 'enemy',
                enemy: enemy,
                dist: hit,
                x: state.p.x + dx * hit,
                y: state.p.y + dy * hit
            };
        }
    }
    
    // 检测墙壁碰撞
    for (const wall of state.entities.walls) {
        const hit = rayRectIntersect(state.p.x, state.p.y, dx, dy, wall.x, wall.y, wall.w, wall.h);
        if (hit !== null && hit > 0 && hit < maxLength && hit < closestDist) {
            closestDist = hit;
            closestHit = {
                type: 'wall',
                wall: wall,
                dist: hit,
                x: state.p.x + dx * hit,
                y: state.p.y + dy * hit
            };
        }
    }
    
    state.p.aimLineHit = closestHit;
    
    // 如果碰撞到敌人，触发分析显示
    if (closestHit && closestHit.type === 'enemy') {
        const enemy = closestHit.enemy;
        enemy.lastPingTime = Date.now();
        enemy.pingType = 'analyze';
    }
    
    // 如果碰撞到墙壁，显示墙壁信息（通过更新wallEchoes）
    if (closestHit && closestHit.type === 'wall') {
        const wall = closestHit.wall;
        // 确保wallEcho存在
        let wallEcho = state.entities.wallEchoes.find(we => we.wall === wall);
        if (!wallEcho) {
            wallEcho = {
                wall: wall,
                life: 1.0,
                energy: 0,
                absorbedEnergy: wall.absorbedEnergy || 0  // 从墙壁对象读取已存储的能量
            };
            state.entities.wallEchoes.push(wallEcho);
        } else {
            // 同步墙壁对象的absorbedEnergy到wallEcho
            wallEcho.absorbedEnergy = wall.absorbedEnergy || 0;
        }
        // 更新显示时间
        wallEcho.life = 1.0;
    }
}

// 射线与圆的相交检测
function rayCircleIntersect(rx, ry, rdx, rdy, cx, cy, cr) {
    const toCircleX = cx - rx;
    const toCircleY = cy - ry;
    const dot = toCircleX * rdx + toCircleY * rdy;
    
    if (dot < 0) return null; // 圆在射线后方
    
    const closestX = rx + rdx * dot;
    const closestY = ry + rdy * dot;
    const distToCenter = Math.hypot(closestX - cx, closestY - cy);
    
    if (distToCenter > cr) return null; // 射线未击中圆
    
    // 计算交点距离
    const halfChord = Math.sqrt(cr * cr - distToCenter * distToCenter);
    return dot - halfChord; // 返回第一个交点
}

/**
 * 切换核心
 */
function switchCore(newCore) {
    state.p.currentCore = newCore;
    
    // 重置频率到新核心范围的中点
    state.freq = (newCore.freqMin + newCore.freqMax) / 2;
    
    // 更新无线电系统的频率范围
    if (typeof radioSystem !== 'undefined' && radioSystem) {
        radioSystem.setFrequencyRange(newCore.freqMin, newCore.freqMax);
        radioSystem.syncWithRobotFrequency(state.freq);
    }
    
    logMsg(`核心切换: ${newCore.name} | 频率范围: ${newCore.freqMin}-${newCore.freqMax} MHz`);
}

