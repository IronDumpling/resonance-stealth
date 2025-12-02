// 玩家相关逻辑

// 聚焦逻辑
function updateFocus() {
    // 被抓取时无法蓄力或发波
    if(state.p.isGrabbed) {
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
    updateUI();
}

// 提升主能量（自动处理溢出到备用，并显示绿色闪烁）
function addEnergy(amount) {
    if (amount <= 0) return;
    
    const spaceInMain = CFG.maxEnergy - state.p.en;
    const toMain = Math.min(spaceInMain, amount);
    
    if (toMain > 0) {
        state.p.en += toMain;
        // 主能量提升时，显示绿色边缘闪烁
        flashEdgeGlow('green', 150);
    }
    
    // 溢出部分存入备用
    const overflow = amount - toMain;
    if (overflow > 0) {
        addReserveEnergy(overflow);
    }
}

// 提升备用能量
function addReserveEnergy(amount) {
    if (amount <= 0) return;
    state.p.reserveEn += amount;
}

// 统一交互逻辑 (拾取 + 处决)
function tryInteract() {
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
        
        // 视觉反馈
        flashEdgeGlow('white', 100); // 边缘白闪
        spawnParticles(Target.x, Target.y, '#ff0000', 50); // 红色粒子
        
        // 不立即移除敌人，让 updateEnemies 在下一帧处理激发态并释放波
        updateUI();
        return;
    }

    // 2. 尝试拾取
    const items = state.entities.items.filter(
        i => dist(i.x, i.y, state.p.x, state.p.y) < 40 && 
        i.visibleTimer > 0
    );
    
    if(items.length > 0) {
        const item = items[0];
        if(item.type === 'energy') {
            // 能量瓶直接补充到备用能量
            addReserveEnergy(CFG.energyFlaskVal);
            logMsg(`RESERVE ENERGY RESTORED (+${CFG.energyFlaskVal})`);
            spawnParticles(item.x, item.y, '#00ff00', 20);
            // 移除物品
            state.entities.items = state.entities.items.filter(i => i !== item);
            updateUI();
        }
        return;
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
    
    // 按F增加进度
    if (state.keys.f) {
        state.p.struggleProgress = Math.min(CFG.struggleProgressMax, state.p.struggleProgress + CFG.struggleProgressGain);
        state.keys.f = false; // 防止连续触发
    }
    
    // 进度满时挣脱
    if (state.p.struggleProgress >= CFG.struggleProgressMax) {
        state.p.isGrabbed = false;
        state.p.grabberEnemy = null;
        state.p.struggleProgress = 0;
        logMsg("BREAK FREE");
        spawnParticles(state.p.x, state.p.y, '#00ffff', 20);
        return;
    }
    
    // 被抓取时持续流失能量
    state.p.en = Math.max(0, state.p.en - CFG.grabEnergyDrainRate);
    
    // 每10帧生成一次青色粒子，表现能量流失
    state.p.grabParticleTimer++;
    if (state.p.grabParticleTimer >= 10) {
        spawnParticles(state.p.x, state.p.y, '#00ffff', 20);
        state.p.grabParticleTimer = 0;
    }
    
    // Energy zero death
    // Death will be handled by checkPlayerDeath()
}

// 使用备用能量补充主能量（R键）
function updateReserveEnergy() {
    if (state.keys.r && state.p.reserveEn > 0 && state.p.en < CFG.maxEnergy) {
        const needed = CFG.maxEnergy - state.p.en;
        const used = Math.min(needed, state.p.reserveEn);
        
        if (used > 0) {
            // 从备用能量中扣除
            state.p.reserveEn -= used;
            // 使用 addEnergy 提升主能量
            addEnergy(used);
            
            state.keys.r = false;
            logMsg(`RESERVE TRANSFERRED (+${Math.floor(used)} ENERGY)`);
            spawnParticles(state.p.x, state.p.y, '#33ccff', 15);
            updateUI();
        }
    }
}

// 更新玩家状态
function updatePlayer() {
    updateFocus(); 
    updateStruggle();
    updateReserveEnergy();
    
    // 被抓取时无法移动
    if (!state.p.isGrabbed) {
        // 移动
        let dx=0, dy=0;
        if(state.keys.w) dy-=1; if(state.keys.s) dy+=1;
        if(state.keys.a) dx-=1; if(state.keys.d) dx+=1;
        if(dx||dy) {
            const len = Math.hypot(dx,dy);
            const spd = state.p.isCharging ? CFG.pSpeed * 0.3 : CFG.pSpeed;
            const nx = state.p.x + (dx/len)*spd; const ny = state.p.y + (dy/len)*spd;
            if(!checkWall(nx, state.p.y)) state.p.x = nx;
            if(!checkWall(state.p.x, ny)) state.p.y = ny;
        }
    }
    
    // 角度跟随鼠标
    state.p.a = Math.atan2(state.mouse.y - state.p.y, state.mouse.x - state.p.x);
    
    // 冷却时间
    if(state.p.invuln > 0) state.p.invuln--;
    if(state.p.resonanceCD > 0) state.p.resonanceCD--;
}

