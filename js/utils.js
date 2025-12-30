// -- 辅助函数 --
function rand(min,max){return Math.random()*(max-min)+min;}
function dist(x1,y1,x2,y2){return Math.hypot(x1-x2, y1-y2);}
function clamp(v,min,max){return Math.max(min, Math.min(max, v));}
function lerp(a,b,t){return a + (b-a)*t;}

function checkWall(x, y) {
    if(x<0||x>canvas.width||y<0||y>canvas.height) return true;
    for(let w of state.entities.walls) if(x>w.x && x<w.x+w.w && y>w.y && y<w.y+w.h) return true;
    return false;
}

function checkLineOfSight(x1, y1, x2, y2) {
    const steps = Math.ceil(dist(x1,y1,x2,y2)/10); const dx=(x2-x1)/steps; const dy=(y2-y1)/steps;
    for(let i=1;i<steps;i++){
        const cx=x1+dx*i; const cy=y1+dy*i;
        for(let w of state.entities.walls) if(cx>w.x&&cx<w.x+w.w&&cy>w.y&&cy<w.y+w.h) return false;
    }
    return true;
}

function isInCone(tx, ty) {
    const d = dist(tx,ty,state.p.x,state.p.y);
    if(d > CFG.pViewDist) return false;
    const angle = Math.atan2(ty-state.p.y, tx-state.p.x);
    let diff = angle - state.p.a;
    while(diff > Math.PI) diff-=Math.PI*2;
    while(diff < -Math.PI) diff+=Math.PI*2;
    return Math.abs(diff) < CFG.pViewAngle/2;
}

function rayRectIntersect(rx, ry, rdx, rdy, wx, wy, ww, wh) {
    let tMin=0, tMax=Infinity;
    if(Math.abs(rdx)<1e-5){ if(rx<wx||rx>wx+ww)return null; } else {
        let t1=(wx-rx)/rdx, t2=(wx+ww-rx)/rdx;
        tMin=Math.max(tMin, Math.min(t1,t2)); tMax=Math.min(tMax, Math.max(t1,t2));
    }
    if(Math.abs(rdy)<1e-5){ if(ry<wy||ry>wy+wh)return null; } else {
        let t1=(wy-ry)/rdy, t2=(wy+wh-ry)/rdy;
        tMin=Math.max(tMin, Math.min(t1,t2)); tMax=Math.min(tMax, Math.max(t1,t2));
    }
    if(tMin>tMax || tMax<0) return null;
    return tMin>0 ? tMin : tMax>0?tMax:null;
}

function getVisibiltyPolygon(px, py, angle) {
    const points=[{x:px,y:py}]; const num=120; const fov=CFG.pViewAngle; const start=angle-fov/2; const step=fov/num;
    for(let i=0;i<=num;i++){
        const th=start+step*i; const dx=Math.cos(th); const dy=Math.sin(th);
        let cDist=CFG.pViewDist;
        for(let w of state.entities.walls){
            const d=rayRectIntersect(px,py,dx,dy,w.x,w.y,w.w,w.h);
            if(d!==null && d<cDist) cDist=d;
        }
        points.push({x:px+dx*cDist, y:py+dy*cDist});
    }
    return points;
}

// 世界坐标转屏幕坐标（用于UI定位）
function worldToScreen(wx, wy) {
    const scale = CFG.cameraFOV;
    const screenX = (wx - state.camera.x) * scale + canvas.width / 2;
    const screenY = (wy - state.camera.y) * scale + canvas.height / 2;
    
    // 考虑canvas在页面中的偏移量（工作站布局中canvas不是全屏）
    const canvasRect = canvas.getBoundingClientRect();
    const pageX = screenX + canvasRect.left;
    const pageY = screenY + canvasRect.top;
    
    return { x: pageX, y: pageY };
}

// 屏幕坐标转世界坐标（用于鼠标交互）
function screenToWorld(sx, sy) {
    const scale = CFG.cameraFOV;
    const worldX = (sx - canvas.width / 2) / scale + state.camera.x;
    const worldY = (sy - canvas.height / 2) / scale + state.camera.y;
    return { x: worldX, y: worldY };
}

// 粒子系统
function spawnParticles(x,y,c,n) {
    for(let i=0;i<n;i++) state.entities.particles.push({x:x,y:y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:c,s:Math.random()*3});
}

// UI 辅助 - 显示消息
function logMsg(t) { 
    state.currentMessage = t;
    state.messageTimer = 180; // 显示3秒（60fps）
}

// edge-glow 闪烁效果
let edgeGlowFlashTimer = null;

function flashEdgeGlow(color, duration) {
    if (!edgeGlow) return;
    
    // 清除之前的闪烁定时器
    if (edgeGlowFlashTimer) {
        clearTimeout(edgeGlowFlashTimer);
    }
    
    // 设置颜色
    if (color === 'white') {
        edgeGlow.style.boxShadow = 'inset 0 0 20px 8px rgba(255, 255, 255, 0.8)';
    } else if (color === 'red') {
        edgeGlow.style.boxShadow = 'inset 0 0 20px 8px rgba(255, 0, 0, 0.8)';
    } else if (color === 'green') {
        edgeGlow.style.boxShadow = 'inset 0 0 20px 8px rgba(0, 255, 0, 0.8)';
    } else if (color === 'cyan') {
        edgeGlow.style.boxShadow = 'inset 0 0 20px 8px rgba(0, 255, 255, 0.8)';
    }
    
    // 显示闪烁
    edgeGlow.style.opacity = '1';
    
    // 设置淡出
    edgeGlowFlashTimer = setTimeout(() => {
        edgeGlow.style.opacity = '0';
        edgeGlowFlashTimer = null;
    }, duration);
}
