// 敌人相关逻辑

function spawnEnemy() {
    let ex, ey, ok=false;
    while(!ok) {
        ex = rand(50, canvas.width-50); ey = rand(50, canvas.height-50);
        if(dist(ex,ey,state.p.x,state.p.y) > 300) ok=true;
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
    
    state.entities.enemies.push({
        id: Math.random().toString(36).substr(2,9),
        x: ex, y: ey, r: 16,
        freq: Math.floor(rand(CFG.freqMin, CFG.freqMax)),
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
        struggleHintElement: createStruggleHintUI()
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

// 敌人感知到玩家位置（统一触发入口）
function onEnemySensesPlayer(enemy, playerX, playerY) {
    if (!enemy || enemy.state === 'stunned') return;
    enemy.state = 'alert';
    enemy.targetX = playerX;
    enemy.targetY = playerY;
    enemy.searchTimer = 0;
}

// 更新敌人UI
function updateEnemyUI(e) {
    const ui = e.uiElement;
    const execHint = e.executeHintElement;
    const struggleHint = e.struggleHintElement;
    
    // analyze UI 只在 idle, patrol, alert, searching 状态中显示
    const canShowAnalyze = (e.state === 'idle' || e.state === 'patrol' || e.state === 'alert' || e.state === 'searching');
    
    // 更新 analyze UI
    if (canShowAnalyze && Date.now() - e.lastPingTime < 2000 && e.pingType === 'analyze') {
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
        
        if(freqDiff <= CFG.perfectResTol) {
            // 完美共振：亮绿色
            pip.style.backgroundColor = '#00ff00';
            text.innerHTML = "<span style='color:#00ff00'>[◆ PERFECT RESONANCE]</span>";
        } else if(freqDiff <= CFG.normalResTol) {
            // 普通共振：浅绿色
            pip.style.backgroundColor = '#88ff88';
            text.innerHTML = "<span style='color:#88ff88'>[● RESONANCE]</span>";
        } else if(diff < 0) {
            pip.style.backgroundColor = '#0088ff';
            text.innerHTML = "<span style='color:#0088ff'>▼ LOWER FREQ</span>"; 
        } else {
            pip.style.backgroundColor = '#ff4400';
            text.innerHTML = "<span style='color:#ff4400'>▲ HIGHER FREQ</span>";
        }
    } else {
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
}

// 更新敌人移动
function updateEnemyMovement(e) {
    // STUNNED、DETONATING 和 GRABBING 状态在 updateEnemies 中处理，这里直接返回
    if (e.state === 'stunned' || e.state === 'detonating' || e.state === 'grabbing') return;
    
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
            // 主动搜索波
            emitWave(e.x, e.y, 0, Math.PI * 2, e.freq, 'enemy', e.id);
            // 视觉 Ping：强调"正在搜索"
            state.entities.echoes.push({
                x: e.x, y: e.y, r: e.r * 2,
                type: 'enemy_search_ping',
                life: 0.8
            });
        }
        
        if (e.searchTimer <= 0) {
            e.state = 'patrol';
        }
        return;
    }
    
    let spd = CFG.eSpeedPatrol;
    let tx = null, ty = null;
    
    if (e.state === 'alert') {
        spd = CFG.eSpeedChase;
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
            // 没有路径点则使用原来的随机游走行为
            if (Math.random() < 0.01) {
                e.angle += (Math.random() - 0.5);
            }
        }
    } else {
        // 其他未知状态：退化为轻微游走
        if (Math.random() < 0.01) {
            e.angle += (Math.random() - 0.5);
        }
    }
    
    if (tx != null && ty != null) {
        let angleToTarget = Math.atan2(ty - e.y, tx - e.x);
        
        // 避障逻辑
        const lookAheadDist = 40;
        let avoidX = 0, avoidY = 0;
        let hasObs = false;
        
        const checkAngles = [0, -0.5, 0.5];
        for (let da of checkAngles) {
            const checkA = e.angle + da;
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
        e.angle += (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
    }
}

// 更新敌人
function updateEnemies() {
    const enemiesToRemove = []; // 需要移除的敌人
    
    state.entities.enemies.forEach(e => {
        if(e.resonanceCD > 0) e.resonanceCD--;
        if(e.grabCooldown > 0) e.grabCooldown--;
        
        const dToP = dist(e.x, e.y, state.p.x, state.p.y);
        
        if(e.state === 'grabbing') {
            // 抓取状态：停止移动，检查玩家是否挣脱
            if (!state.p.isGrabbed || state.p.grabberEnemy !== e) {
                // 玩家已挣脱，恢复正常状态
                e.state = 'alert';
                e.grabCooldown = CFG.grabCD; // 设置抓取冷却
            }
            // 抓取状态下不移动，不更新其他逻辑
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
            // 碰撞检测：抓取玩家
            if(dToP < 25 && !state.p.isGrabbed && e.grabCooldown <= 0 && 
               e.state !== 'stunned' && e.state !== 'detonating') {
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
    
    // 第二遍：更新所有敌人的UI
    state.entities.enemies.forEach(e => {
        updateEnemyUI(e);
    });
    
    // 移除死亡的敌人
    enemiesToRemove.forEach(e => {
        state.entities.enemies = state.entities.enemies.filter(x => x !== e);
        if(e.uiElement) e.uiElement.remove();
        if(e.executeHintElement) e.executeHintElement.remove();
        if(e.struggleHintElement) e.struggleHintElement.remove();
    });
}

