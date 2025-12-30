// 渲染相关函数

// 根据敌人频率计算颜色渐变
// 参数：
//   enemyFreq: 敌人频率
//   playerFreq: 玩家频率
//   freqRange: 频率范围 [min, max]
//   startColor: 起始颜色 [r, g, b]
//   endColor: 结束颜色 [r, g, b]
// 返回：颜色字符串 "rgb(r, g, b)"
function calculateEnemyEchoColor(enemyFreq, playerFreq, freqRange, startColor, endColor) {
    const [freqMin, freqMax] = freqRange;
    const [startR, startG, startB] = startColor;
    const [endR, endG, endB] = endColor;
    const perfectResTol = CFG.perfectResTol;
    const freqDiff = Math.abs(enemyFreq - playerFreq);
    
    // 计算最大频率差值
    let maxFreqDiff;
    if (enemyFreq < playerFreq) {
        // 高频：从敌人频率到最大频率
        maxFreqDiff = freqMax - enemyFreq;
    } else {
        // 低频：从最小频率到敌人频率
        maxFreqDiff = enemyFreq - freqMin;
    }
    
    // 计算渐变比例
    // 完美共振时 ratio = 1（最接近结束颜色）
    // 频率差值最大时 ratio = 0（最接近起始颜色）
    let ratio = 0;
    if (maxFreqDiff > perfectResTol) {
        ratio = Math.max(0, Math.min(1, 1 - (freqDiff - perfectResTol) / (maxFreqDiff - perfectResTol)));
    } else if (freqDiff <= perfectResTol) {
        ratio = 1; // 完美共振
    }
    
    // 颜色插值
    const r = Math.round(startR + (endR - startR) * ratio);
    const g = Math.round(startG + (endG - startG) * ratio);
    const b = Math.round(startB + (endB - startB) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// 绘制背景
function drawBackground() {
    ctx.fillStyle = '#000510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 绘制回声
function drawEchoes() {
    state.entities.echoes.forEach(e => {
        ctx.globalAlpha = e.life;
        
        if(e.type === 'item') {
            // 物品：绿色
            ctx.fillStyle = '#00ff00';
            ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#00ff00'; ctx.lineWidth=1; ctx.stroke();
        } else if(e.type === 'analyze') {
            // 分析回声：完美共振亮绿色，普通共振浅绿色，否则白色
            let color = '#ffffff';
            if (e.isPerfect) {
                color = '#00ff00'; // 完美共振：亮绿色
            } else if (e.isResonance) {
                color = '#88ff88'; // 普通共振：浅绿色
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); 
            ctx.stroke();
            ctx.fillStyle = color; 
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, 4, 0, Math.PI*2); 
            ctx.fill();
        } else if(e.type === 'enemy_bounce') {
            // 敌人反弹回声：根据频率渐变颜色（从白色到亮绿色）
            // 通过位置找到对应的敌人
            const enemy = state.entities.enemies.find(en => 
                Math.abs(en.x - e.x) < 1 && Math.abs(en.y - e.y) < 1
            );
            
            if (enemy && enemy.freq < state.freq && enemy.freq >= CFG.freqMin) {
                // 高频：从白色到亮绿色渐变（300Hz到完美共振）
                ctx.strokeStyle = calculateEnemyEchoColor(
                    enemy.freq,
                    state.freq,
                    [enemy.freq, CFG.freqMax],
                    [255, 255, 255],// 白色
                    [0, 255, 0]     // 亮绿色
                );
            } else {
                ctx.strokeStyle = '#ffffff';
            }
            
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); 
            ctx.stroke();
        } else if(e.type === 'enemy_blur') {
            // 敌人穿透回声：根据频率渐变颜色（从灰色虚线到亮绿色）
            // 通过位置找到对应的敌人
            const enemy = state.entities.enemies.find(en => 
                Math.abs(en.x - e.x) < 1 && Math.abs(en.y - e.y) < 1
            );
            
            if (enemy && enemy.freq > state.freq && enemy.freq <= CFG.freqMax) {
                // 低频：从灰色到亮绿色渐变（100Hz到完美共振）
                ctx.strokeStyle = calculateEnemyEchoColor(
                    enemy.freq,
                    state.freq,
                    [CFG.freqMin, enemy.freq],
                    [0, 255, 0],     // 亮绿色
                    [102, 102, 102]  // 灰色
                );
            } else {
                ctx.strokeStyle = '#666666';
            }
            
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // 虚线
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); 
            ctx.stroke();
            ctx.setLineDash([]); // 恢复实线
        } else if(e.type === 'enemy_resonance') {
            // 敌人共振回声：绿色轮廓（完美共振更亮）
            const color = e.isPerfect ? '#00ff00' : '#88ff88';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3; // 比反弹轮廓稍粗
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); 
            ctx.stroke();
        } else if(e.type === 'enemy_search_ping') {
            // 敌人主动搜索 Ping：橙色粗环
            ctx.strokeStyle = '#ff9900';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r * (1 + (1 - e.life) * 0.5), 0, Math.PI * 2);
            ctx.stroke();
        } else if(e.type === 'player_bounce') {
            // 玩家作为硬墙反弹：亮青色轮廓
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.stroke();
        } else if(e.type === 'player_resonance') {
            // 玩家被高能共振命中：青绿混色轮廓
            ctx.strokeStyle = '#33ffcc';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r * (1 + (1 - e.life) * 0.2), 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // 其他回声（墙壁等）：白色
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); 
            ctx.stroke();
        }
    });
    ctx.globalAlpha = 1;
}

// 绘制墙壁轮廓（穿透时显示）
function drawWallEchoes() {
    state.entities.wallEchoes.forEach(we => {
        const alpha = we.life * 0.6; // 最大透明度60%
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = we.wall.color || '#888';
        ctx.lineWidth = 2;
        ctx.strokeRect(we.wall.x, we.wall.y, we.wall.w, we.wall.h);
        
        // 如果瞄准线碰撞到墙壁，显示墙壁信息
        if (state.p.aimLineHit && state.p.aimLineHit.type === 'wall' && state.p.aimLineHit.wall === we.wall) {
            const centerX = we.wall.x + we.wall.w / 2;
            const centerY = we.wall.y + we.wall.h / 2;
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const blockFreqText = `BLOCK: ${we.wall.blockFreq}Hz`;
            // 优先使用墙壁对象上的absorbedEnergy（持久化存储），如果没有则使用wallEcho的
            const absorbedEnergy = we.wall.absorbedEnergy || we.absorbedEnergy || 0;
            const absorbedText = `ABSORBED: ${Math.floor(absorbedEnergy)}`;
            ctx.fillText(blockFreqText, centerX, centerY - 10);
            ctx.fillText(absorbedText, centerX, centerY + 10);
        }
    });
    ctx.globalAlpha = 1;
}

// 绘制波纹
function drawWaves() {
    // 计算最大能量（300Hz、5度角、初始半径）
    const maxEnergySpread = 5 * Math.PI / 180; // 5度
    const maxEnergyCircumference = CFG.initialRadius * maxEnergySpread;
    // 最高频率(300Hz)的能量系数为1.5
    const maxFreqFactor = 1.5;
    const maxEnergyTotal = CFG.baseWaveEnergy * maxFreqFactor;
    const maxEnergyPerPoint = maxEnergyTotal / maxEnergyCircumference;
    
    ctx.lineWidth = 2;
    state.entities.waves.forEach(w => {
        ctx.beginPath();
        const startA = w.angle - w.spread/2; const endA = w.angle + w.spread/2;
        ctx.arc(w.x, w.y, w.r, w.spread > Math.PI*1.9 ? 0 : startA, w.spread > Math.PI*1.9 ? Math.PI*2 : endA);
        
        // 计算能量归一化值（用于视觉属性）
        const energyRatio = Math.min(1.0, w.energyPerPoint / maxEnergyPerPoint);
        
        // 使用非线性映射增强对比度（平方根让中低能量差异更明显）
        const visualRatio = Math.sqrt(energyRatio);
        
        // 同时调整饱和度、亮度和透明度
        // 饱和度：30% -> 100% （低能量保持一定饱和度，避免完全灰白）
        const saturation = Math.round(30 + visualRatio * 70);
        // 亮度：40% -> 75% （低能量较暗，高能量明亮）
        const lightness = Math.round(40 + visualRatio * 35);
        // 透明度：0.4 -> 0.95 （低能量半透明，高能量几乎不透明）
        const alpha = 0.4 + visualRatio * 0.55;
        
        // 根据波纹来源决定颜色
        let color;
        if (w.source === 'player') {
            // 玩家波纹：青色，能量影响饱和度/亮度/透明度
            color = `hsla(180, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.strokeStyle = color;
            ctx.lineWidth = w.spread < 1 ? 5 : 3;
        } else {
            // 敌人波纹：红色，能量影响饱和度/亮度/透明度
            color = `hsla(0, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.strokeStyle = color;
            ctx.lineWidth = w.spread < 1 ? 5 : 3;
        }
        
        ctx.stroke();
    });
}

// 绘制视野裁剪和光照
function drawVisibilityAndLighting() {
    // 视野裁剪区
    const visPoly = getVisibiltyPolygon(state.p.x, state.p.y, state.p.a);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(visPoly[0].x, visPoly[0].y);
    for(let i=1; i<visPoly.length; i++) ctx.lineTo(visPoly[i].x, visPoly[i].y);
    ctx.closePath();
    ctx.clip();

    // 光照
    const grad = ctx.createRadialGradient(state.p.x, state.p.y, 10, state.p.x, state.p.y, CFG.pViewDist);
    grad.addColorStop(0, 'rgba(200, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad; ctx.fill();
    // 注意：不在这里恢复，让调用者决定何时恢复clip
}

// 绘制实体（墙壁、物品、敌人）
function drawEntities() {
    // 绘制墙壁
    state.entities.walls.forEach(w => { 
        ctx.fillStyle = w.color || '#222'; 
        ctx.strokeStyle = w.color || '#555';
        ctx.fillRect(w.x, w.y, w.w, w.h); 
        ctx.strokeRect(w.x, w.y, w.w, w.h); 
    });

    // 绘制物品
    state.entities.items.forEach(i => {
        if(i.visibleTimer > 0) {
            if (i.type === 'core_hot') {
                // 热核心：橙红色
                ctx.fillStyle = '#ff6600'; 
                ctx.shadowBlur = 10; 
                ctx.shadowColor = '#ff6600';
                ctx.beginPath(); 
                ctx.arc(i.x, i.y, i.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else if (i.type === 'core_cold') {
                // 冷核心：淡蓝色/灰色，带破碎效果
                ctx.fillStyle = '#8888ff'; 
                ctx.shadowBlur = 5; 
                ctx.shadowColor = '#8888ff';
                ctx.beginPath(); 
                ctx.arc(i.x, i.y, i.r, 0, Math.PI * 2);
                ctx.fill();
                // 绘制破碎效果（几条裂纹线）
                ctx.strokeStyle = '#6666aa';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(i.x - i.r * 0.7, i.y - i.r * 0.5);
                ctx.lineTo(i.x + i.r * 0.3, i.y + i.r * 0.6);
                ctx.moveTo(i.x + i.r * 0.4, i.y - i.r * 0.6);
                ctx.lineTo(i.x - i.r * 0.5, i.y + i.r * 0.4);
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else {
                // 其他物品（能量瓶等）：绿色
                ctx.fillStyle = '#00ff00'; 
                ctx.shadowBlur = 10; 
                ctx.shadowColor = '#00ff00';
                ctx.beginPath(); 
                // 简单的瓶子形状
                ctx.rect(i.x-3, i.y-6, 6, 12);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    });

    // 绘制敌人
    state.entities.enemies.forEach(e => {
        // 只显示被瞄准敌人的感知范围
        const isTargeted = state.p.aimLineHit && 
                           state.p.aimLineHit.type === 'enemy' && 
                           state.p.aimLineHit.enemy === e;
        
        if (isTargeted && e.detectionRadius && e.detectionSectorAngle) {
            ctx.save();
            
            // 绘制敏感扇区（扇形填充）
            ctx.fillStyle = 'rgba(255, 255, 0, 0.15)';
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            const startAngle = e.angle - e.detectionSectorAngle / 2;
            const endAngle = e.angle + e.detectionSectorAngle / 2;
            ctx.arc(e.x, e.y, e.detectionRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            
            // 绘制扇区边界线
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(startAngle) * e.detectionRadius, e.y + Math.sin(startAngle) * e.detectionRadius);
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(endAngle) * e.detectionRadius, e.y + Math.sin(endAngle) * e.detectionRadius);
            ctx.stroke();
            
            // 绘制盲区（完整圆圈，淡淡的红色）
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.detectionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.restore();
        }
        
        // 绘制敌人本体
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        if(e.state === 'stunned') {
            ctx.fillStyle = '#333'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
        } else if(e.state === 'dormant') {
            // 休眠状态：灰色/半透明
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#666'; ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke();
        } else {
            ctx.fillStyle = '#111'; ctx.strokeStyle = '#333'; ctx.stroke();
        }
        ctx.fill();
        ctx.globalAlpha = 1;
    });
}

// 绘制辅助瞄准线
function drawAimLine() {
    if(!state.p.shouldShowAimLine) return;
    
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'; // 红色半透明
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // 起点：玩家位置（世界坐标）
    ctx.moveTo(state.p.x, state.p.y);
    
    // 终点：根据raycast结果或最大长度
    const maxLength = CFG.pViewDist;
    let endX, endY;
    
    if (state.p.aimLineHit) {
        endX = state.p.aimLineHit.x;
        endY = state.p.aimLineHit.y;
    } else {
        endX = state.p.x + Math.cos(state.p.a) * maxLength;
        endY = state.p.y + Math.sin(state.p.a) * maxLength;
    }
    
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

// 绘制玩家
function drawPlayer() {
    ctx.save();
    ctx.translate(state.p.x, state.p.y); ctx.rotate(state.p.a);
    
    // 无敌时间护盾效果
    if (state.p.grabImmunity > 0) {
        const pulsePhase = (Date.now() / 200) % 1; // 0-1循环
        const radius = 20 + pulsePhase * 10;
        const opacity = 0.3 + pulsePhase * 0.3;
        
        ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.fillStyle = state.p.invuln > 0 ? '#fff' : '#00ffff';
    ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-8, 6); ctx.lineTo(-8, -6); ctx.fill();
    
    if(state.p.isCharging) {
        const spread = lerp(CFG.maxSpread, CFG.minSpread, state.focusLevel);
        ctx.fillStyle = `rgba(0, 255, 255, ${0.1 + state.focusLevel*0.2})`;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.arc(0,0, 100 + state.focusLevel*200, -spread/2, spread/2);
        ctx.fill();
    }
    
    ctx.restore();
}

// 绘制辐射场
function drawRadiations() {
    state.entities.radiations.forEach(rad => {
        if (rad.centerEnergy <= 0 || rad.maxRadius <= 0) return;
        
        // 敌人的辐射场只在玩家视觉范围内渲染
        if (rad.ownerType === 'enemy') {
            const distToPlayer = dist(rad.x, rad.y, state.p.x, state.p.y);
            // 检查是否在视觉范围内（考虑辐射场半径）
            if (distToPlayer > CFG.pViewDist + rad.maxRadius) {
                return; // 超出视觉范围，不渲染
            }
            
            // 检查是否在视野扇形内
            if (!isInCone(rad.x, rad.y)) {
                return; // 不在视野角度内，不渲染
            }
            
            // 检查是否在视野多边形内（更精确的视野检查，包括墙壁遮挡）
            if (!checkLineOfSight(state.p.x, state.p.y, rad.x, rad.y)) {
                return; // 被墙壁遮挡，不渲染
            }
        }
        // 玩家的辐射场始终渲染（或者也可以添加视野检查，但通常玩家自己的辐射场应该可见）
        
        // 创建径向渐变：从中心（高能量）到边缘（能量为0）
        const gradient = ctx.createRadialGradient(rad.x, rad.y, 0, rad.x, rad.y, rad.maxRadius);
        
        // 计算中心透明度（基于能量强度）
        const maxEnergy = CFG.energyDecayRate * 3.0; // 最大能量消耗（奔跑时）
        const energyRatio = Math.min(1.0, rad.centerEnergy / maxEnergy);
        const centerAlpha = 0.1 + energyRatio * 0.15; // 中心透明度 0.1-0.25
        
        // 渐变：中心较亮，边缘透明
        gradient.addColorStop(0, `rgba(100, 200, 255, ${centerAlpha})`);
        gradient.addColorStop(0.5, `rgba(100, 200, 255, ${centerAlpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(rad.x, rad.y, rad.maxRadius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 绘制粒子
function drawParticles() {
    state.entities.particles.forEach(p => {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// 绘制挣脱进度条
function drawStruggleBar() {
    if (!state.p.isGrabbed) return;
    
    const barWidth = 400;
    const barHeight = 30;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height - 100;
    const progress = state.p.struggleProgress / CFG.struggleProgressMax;
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // 进度条
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4);
    
    // 边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('[F] STRUGGLE', canvas.width / 2, barY - 25);
}

// 绘制玩家状态UI
function drawPlayerStatusUI() {
    const padding = 20;
    const barWidth = 200;
    const barHeight = 20;
    const gap = 10;
    
    // 休眠提示
    if (state.p.isDormant) {
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillText('SYSTEM DORMANT', canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillText('PRESS [R] TO RESTART', canvas.width / 2, canvas.height / 2 + 50);
        ctx.restore();
        return;
    }
    
    // 报废提示
    if (state.p.isDestroyed) {
        ctx.save();
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#880000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillText('ROBOT DESTROYED', canvas.width / 2, canvas.height / 2);
        ctx.restore();
        return;
    }
    
    ctx.save();
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    
    // 核心信息
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`CORE: ${state.p.currentCore.name}`, padding, padding);
    
    // 能量条
    const energyY = padding + 25;
    ctx.fillStyle = '#333333';
    ctx.fillRect(padding, energyY, barWidth, barHeight);
    
    const energyPercent = state.p.en / CFG.maxEnergy;
    const energyColor = energyPercent > 0.3 ? '#00ff00' : (energyPercent > 0.1 ? '#ffff00' : '#ff0000');
    ctx.fillStyle = energyColor;
    ctx.fillRect(padding, energyY, barWidth * energyPercent, barHeight);
    
    ctx.strokeStyle = '#00ff00';
    ctx.strokeRect(padding, energyY, barWidth, barHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ENERGY: ${Math.floor(state.p.en)}/${CFG.maxEnergy}`, padding + 5, energyY + 14);
    
    // 耐久条
    const durabilityY = energyY + barHeight + gap;
    ctx.fillStyle = '#333333';
    ctx.fillRect(padding, durabilityY, barWidth, barHeight);
    
    const durabilityPercent = state.p.durability / CFG.maxDurability;
    const durabilityColor = durabilityPercent > 0.5 ? '#00aaff' : (durabilityPercent > 0.2 ? '#ffaa00' : '#ff0000');
    ctx.fillStyle = durabilityColor;
    ctx.fillRect(padding, durabilityY, barWidth * durabilityPercent, barHeight);
    
    ctx.strokeStyle = '#00aaff';
    ctx.strokeRect(padding, durabilityY, barWidth, barHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`DURABILITY: ${Math.floor(state.p.durability)}/${CFG.maxDurability}`, padding + 5, durabilityY + 14);
    
    // 消息日志（左下角）
    if (state.currentMessage && state.messageTimer > 0) {
        const messageY = canvas.height - 30;
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffaa00';
        
        // 闪烁效果（消息快消失时）
        if (state.messageTimer < 60) {
            ctx.globalAlpha = state.messageTimer / 60;
        }
        
        ctx.fillText(state.currentMessage, padding, messageY);
        ctx.globalAlpha = 1;
    }
    
    ctx.restore();
}

// 主绘制函数
function draw() {
    // 绘制背景
    drawBackground();

    // 应用相机变换
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(CFG.cameraFOV, CFG.cameraFOV);
    ctx.translate(-state.camera.x, -state.camera.y);

    // 绘制回声
    drawEchoes();
    
    // 绘制墙壁轮廓
    drawWallEchoes();

    // 绘制辐射场（在波纹之前）
    drawRadiations();

    // 绘制波纹
    drawWaves();

    // 绘制视野裁剪和光照（设置clip）
    drawVisibilityAndLighting();

    // 绘制实体（墙壁、instructions、物品、敌人，在clip内）
    drawEntities();
    
    // 恢复视野裁剪（恢复clip）
    ctx.restore();
    
    // 绘制玩家（在clip外，但在相机变换内）
    drawPlayer();
    
    // 绘制辅助瞄准线（在相机变换内）
    drawAimLine();

    // 绘制粒子（在相机变换内）
    drawParticles();
    
    // 恢复相机变换
    ctx.restore();
    
    // 绘制UI（挣脱进度条，不受相机变换影响）
    drawStruggleBar();
    
    // 绘制玩家状态UI（能量、耐久、核心信息）
    drawPlayerStatusUI();
}

