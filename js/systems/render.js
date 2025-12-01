// 渲染相关函数

function draw() {
    ctx.fillStyle = '#000510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 应用相机变换
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(CFG.cameraFOV, CFG.cameraFOV);
    ctx.translate(-state.camera.x, -state.camera.y);

    // 绘制回声
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
            // 敌人反弹回声：白色清晰轮廓
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); 
            ctx.stroke();
        } else if(e.type === 'enemy_blur') {
            // 敌人穿透回声：灰色模糊轮廓
            ctx.strokeStyle = '#666666';
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
    
    // 绘制墙壁轮廓（穿透时显示）
    state.entities.wallEchoes.forEach(we => {
        const alpha = we.life * 0.6; // 最大透明度60%
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = we.wall.color || '#888';
        ctx.lineWidth = 2;
        ctx.strokeRect(we.wall.x, we.wall.y, we.wall.w, we.wall.h);
    });
    ctx.globalAlpha = 1;

    // 绘制波纹
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
        } else {
            // 敌人波纹：红色，能量影响饱和度/亮度/透明度
            color = `hsla(0, ${saturation}%, ${lightness}%, ${alpha})`;
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = w.spread < 1 ? 5 : 3;
        ctx.stroke();
    });

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

    // 实体 (墙壁, 敌人, 物品)
    state.entities.walls.forEach(w => { 
        ctx.fillStyle = w.color || '#222'; 
        ctx.strokeStyle = w.color || '#555';
        ctx.fillRect(w.x, w.y, w.w, w.h); 
        ctx.strokeRect(w.x, w.y, w.w, w.h); 
    });

    // 绘制 instructions（像贴在地板上一样，先渲染以便被敌人和物品遮挡）
    state.entities.instructions.forEach(inst => {
        // 1. 检查距离（快速过滤）
        const d = dist(inst.x, inst.y, state.p.x, state.p.y);
        if (d > CFG.pViewDist) return;
        
        // 2. 检查是否被墙壁遮挡
        if (!checkLineOfSight(state.p.x, state.p.y, inst.x, inst.y)) return;
        
        // 3. 绘制instruction
        const lines = inst.text.split('\n');
        const lineHeight = 36;
        const fontSize = 28;
        
        // 计算文本尺寸
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textHeight = lines.length * lineHeight;
        
        // 绘制文本（白色，带黑色阴影增强可读性）
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        lines.forEach((line, i) => {
            ctx.fillText(
                line,
                inst.x,
                inst.y - textHeight/2 + (i + 0.5) * lineHeight
            );
        });
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    state.entities.items.forEach(i => {
        if(i.visibleTimer > 0) {
            ctx.fillStyle = '#00ff00'; ctx.shadowBlur = 10; ctx.shadowColor = '#00ff00';
            ctx.beginPath(); 
            // 简单的瓶子形状
            ctx.rect(i.x-3, i.y-6, 6, 12);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });

    state.entities.enemies.forEach(e => {
        // 绘制敌人本体
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        if(e.state === 'stunned') {
            ctx.fillStyle = '#333'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.stroke();
        } else {
            ctx.fillStyle = '#111'; ctx.strokeStyle = '#333'; ctx.stroke();
        }
        ctx.fill();
    });
    
    ctx.restore();

    // 玩家
    ctx.save();
    ctx.translate(state.p.x, state.p.y); ctx.rotate(state.p.a);
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

    state.entities.particles.forEach(p => {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // 恢复相机变换
    ctx.restore();
    
    // 绘制挣脱进度条（被抓取时显示）
    if (state.p.isGrabbed) {
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
    
    // 绘制红色边缘发光效果
    if (state.edgeGlowIntensity > 0) {
        const intensity = state.edgeGlowIntensity;
        const borderWidth = 8;
        const glowColor = `rgba(255, 0, 0, ${intensity * 0.8})`;
        
        ctx.fillStyle = glowColor;
        // 上边缘
        ctx.fillRect(0, 0, canvas.width, borderWidth);
        // 下边缘
        ctx.fillRect(0, canvas.height - borderWidth, canvas.width, borderWidth);
        // 左边缘
        ctx.fillRect(0, 0, borderWidth, canvas.height);
        // 右边缘
        ctx.fillRect(canvas.width - borderWidth, 0, borderWidth, canvas.height);
    }
}

