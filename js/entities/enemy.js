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
        resCool: 0,
        lastPingTime: 0, pingType: null,
        targetX: null, targetY: null,
        searchTimer: 0,
        waypoints: waypoints,
        currentWPIndex: 0,
        uiElement: createAnalyzerUI()
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
    if (Date.now() - e.lastPingTime < 2000 && e.pingType === 'analyze') {
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
            text.innerHTML = "<span style='color:#0088ff'>▼ BLUE SHIFT</span>"; 
        } else {
            pip.style.backgroundColor = '#ff4400';
            text.innerHTML = "<span style='color:#ff4400'>▲ RED SHIFT</span>";
        }
    } else {
        ui.style.display = 'none';
    }
}

// 更新敌人移动
function updateEnemyMovement(e) {
    // STUNNED 状态在 updateEnemies 中处理，这里直接返回
    if (e.state === 'stunned') return;
    
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
    let hasExeTarget = false;
    const enemiesToRemove = []; // 需要移除的敌人（完美共振死亡）
    
    state.entities.enemies.forEach(e => {
        if(e.resCool > 0) e.resCool--;
        
        updateEnemyUI(e);
        
        const dToP = dist(e.x, e.y, state.p.x, state.p.y);
        
        if(e.state === 'stunned') {
            e.timer--;
            
            // 完美共振：持续发出受迫共振波
            if (e.isPerfectStun) {
                if (e.stunWaveCooldown <= 0) {
                    emitWave(e.x, e.y, 0, Math.PI * 2, e.freq, 'enemy', e.id);
                    e.stunWaveCooldown = 60; // 每60帧（约1秒）发一次波
                    spawnParticles(e.x, e.y, '#ff4400', 15); // 红色粒子表示危险
                } else {
                    e.stunWaveCooldown--;
                }
            }
            
            if(e.timer <= 0) {
                if (e.isPerfectStun) {
                    // 完美共振结束后：敌人死亡
                    enemiesToRemove.push(e);
                    spawnParticles(e.x, e.y, '#00ffff', 50);
                    logMsg("HOSTILE DISINTEGRATED");
                    setTimeout(spawnEnemy, 5000); // 5秒后重生新敌人
                } else {
                    // 普通共振结束后：恢复正常
                    e.state = 'alert';
                    e.isPerfectStun = false;
                }
            }
            
            if(dToP < 60) hasExeTarget = true;
        } else {
            if(dToP < 25) takeDamage(CFG.dmgVal);
            updateEnemyMovement(e);
        }
    });
    
    // 移除完美共振死亡的敌人
    enemiesToRemove.forEach(e => {
        state.entities.enemies = state.entities.enemies.filter(x => x !== e);
        if(e.uiElement) e.uiElement.remove();
    });
    
    return hasExeTarget;
}

