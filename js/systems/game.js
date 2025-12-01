// 主游戏逻辑

// 全局变量（在HTML中初始化）
let canvas, ctx, uiContainer, pickupHint, screenFlash, edgeGlow;

// 初始化全局变量
function initGlobals() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    uiContainer = document.getElementById('world-ui-container');
    pickupHint = document.getElementById('pickup-hint');
    screenFlash = document.getElementById('screen-flash');
    edgeGlow = document.getElementById('edge-glow');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// --- 游戏状态 ---
const state = {
    p: { 
        x: 0, 
        y: 0, 
        a: 0, 
        isGrabbed: false,
        grabberEnemy: null,      // 抓取玩家的敌人引用
        struggleProgress: 0,      // 挣脱进度 (0-100)
        isCharging: false,
        en: CFG.maxEnergy, 
        reserveEn: 0, 
        invuln: 0,
        resCool: 0, 
    },
    edgeGlowIntensity: 0,         // 红色边缘发光强度 (0-1)
    keys: { w:0, a:0, s:0, d:0, space:0, f:0, r:0, e:0 },
    mouse: { x:0, y:0 },
    freq: 150,
    focusLevel: 0,
    
    camera: { x: 0, y: 0 },
    entities: {
        walls: [], enemies: [], waves: [], echoes: [], particles: [], items: [], wallEchoes: [], instructions: []
    }
};

// --- 初始化 ---
function generateInstructions() {
    const spawnX = canvas.width / 2;
    const spawnY = canvas.height / 2;
    const instructions = [];
    
    for (let i = 0; i < INSTRUCTIONS.length; i++) {
        const inst = INSTRUCTIONS[i];
        let x, y, attempts = 0;
        let valid = false;
        
        // 尝试找到不重叠的位置
        while (!valid && attempts < 100) {
            attempts++;
            // 从出生点向外辐射生成（使用固定角度分布）
            const angle = (i * Math.PI * 2 / INSTRUCTIONS.length) + (Math.random() - 0.5) * 0.8;
            x = spawnX + Math.cos(angle) * inst.distance;
            y = spawnY + Math.sin(angle) * inst.distance;
            
            // 确保在画布内
            if (x < 100 || x > canvas.width - 100 || 
                y < 100 || y > canvas.height - 100) {
                continue;
            }
            
            // 检查是否与其他instruction重叠
            let overlapsInst = false;
            for (const other of instructions) {
                if (dist(x, y, other.x, other.y) < 150) {
                    overlapsInst = true;
                    break;
                }
            }
            
            if (!overlapsInst) {
                valid = true;
            }
        }
        
        if (valid) {
            instructions.push({
                id: inst.id,
                x: x,
                y: y,
                text: inst.text,
                distance: inst.distance
            });
        }
    }
    
    return instructions;
}

function spawnItem(type) {
    let ix, iy, ok=false;
    let safeLoop = 0;
    while(!ok && safeLoop < 100) {
        safeLoop++;
        ix = rand(50, canvas.width-50); iy = rand(50, canvas.height-50);
        
        // 检查是否在墙里
        if(checkWall(ix, iy)) continue;
        
        // 检查是否与instructions重叠（保持60像素距离）
        let overlapsInst = false;
        for (const inst of state.entities.instructions) {
            if (dist(ix, iy, inst.x, inst.y) < 60) {
                overlapsInst = true;
                break;
            }
        }
        
        if (!overlapsInst) ok = true;
    }
    if(ok) {
        state.entities.items.push({
            type: type, x: ix, y: iy, r: 10, visibleTimer: 0 // 默认不可见
        });
    }
}

function init() {
    // 初始化玩家位置
    state.p.x = canvas.width/2;
    state.p.y = canvas.height/2;
    state.p.en = CFG.maxEnergy;
    state.p.isGrabbed = false;
    state.p.grabberEnemy = null;
    state.p.struggleProgress = 0;
    state.edgeGlowIntensity = 0;
    
    state.entities.walls = [];
    state.entities.items = [];
    state.entities.instructions = [];
    
    // 先生成 instructions
    state.entities.instructions = generateInstructions();

    // 在地图四周生成边界墙，让玩家看不到画布边缘
    const borderThickness = 60;
    const borderFreq = CFG.wallFreqs[CFG.wallFreqs.length - 1]; // 使用最高频率作为边界阻挡
    const borderColor = CFG.wallColors[borderFreq];
    // 上边界
    state.entities.walls.push({
        x: -borderThickness, y: -borderThickness,
        w: canvas.width + borderThickness*2, h: borderThickness,
        blockFreq: borderFreq, color: borderColor
    });
    // 下边界
    state.entities.walls.push({
        x: -borderThickness, y: canvas.height,
        w: canvas.width + borderThickness*2, h: borderThickness,
        blockFreq: borderFreq, color: borderColor
    });
    // 左边界
    state.entities.walls.push({
        x: -borderThickness, y: 0,
        w: borderThickness, h: canvas.height,
        blockFreq: borderFreq, color: borderColor
    });
    // 右边界
    state.entities.walls.push({
        x: canvas.width, y: 0,
        w: borderThickness, h: canvas.height,
        blockFreq: borderFreq, color: borderColor
    });
    
    // 生成墙壁（增加数量到12个，并避免与instructions重叠）
    let attempts = 0;
    while(state.entities.walls.length < 12 && attempts < 300) {
        attempts++;
        const w = rand(80, 200);
        const h = rand(80, 200);
        const x = rand(100, canvas.width-200);
        const y = rand(100, canvas.height-200);
        
        let overlap = false;
        
        // 检查与其他墙壁重叠
        for (const other of state.entities.walls) {
            if (x < other.x + other.w + 20 && x + w + 20 > other.x && 
                y < other.y + other.h + 20 && y + h + 20 > other.y) {
                overlap = true; break;
            }
        }
        
        // 检查与出生点重叠
        if (!overlap) {
            const px = canvas.width/2; const py = canvas.height/2;
            if (x < px + 150 && x + w > px - 150 && y < py + 150 && y + h > py - 150) overlap = true;
        }
        
        // 检查与instructions重叠
        if (!overlap) {
            for (const inst of state.entities.instructions) {
                if (x < inst.x + 100 && x + w > inst.x - 100 &&
                    y < inst.y + 50 && y + h > inst.y - 50) {
                    overlap = true;
                    break;
                }
            }
        }
        
        if (!overlap) {
            const blockFreq = CFG.wallFreqs[Math.floor(Math.random() * CFG.wallFreqs.length)];
            state.entities.walls.push({
                x, y, w, h, 
                blockFreq: blockFreq,
                color: CFG.wallColors[blockFreq]
            });
        }
    }

    for(let i=0; i<5; i++) spawnEnemy();
    
    // 生成能量瓶
    for(let i=0; i<8; i++) spawnItem('energy');
    
    // 初始化相机位置为玩家位置
    state.camera.x = state.p.x;
    state.camera.y = state.p.y;
    
    updateUI();
    requestAnimationFrame(loop);
}

// 更新相机位置（跟随玩家）
function updateCamera() {
    const targetX = state.p.x;
    const targetY = state.p.y;
    
    if (CFG.cameraSmoothing) {
        // 平滑跟随
        const dx = targetX - state.camera.x;
        const dy = targetY - state.camera.y;
        state.camera.x += dx * CFG.cameraFollowSpeed;
        state.camera.y += dy * CFG.cameraFollowSpeed;
    } else {
        // 直接跟随
        state.camera.x = targetX;
        state.camera.y = targetY;
    }
}

// 更新物品可见性
function updateItemsVisibility() {
    state.entities.items.forEach(i => {
        if(i.visibleTimer > 0) i.visibleTimer--;
        if(isInCone(i.x, i.y) && checkLineOfSight(state.p.x, state.p.y, i.x, i.y)) {
            i.visibleTimer = 10; // 只要在视野里，就保持可见
        }
    });
}

// 检查拾取物
function checkPickups() {
    let hasPickupTarget = false;
    state.entities.items.forEach(i => {
        if(i.visibleTimer > 0 && dist(i.x, i.y, state.p.x, state.p.y) < 40) {
            hasPickupTarget = true;
        }
    });
    return hasPickupTarget;
}

// 更新交互提示
function updateInteractionHints(hasPickupTarget) {
    if(hasPickupTarget) {
        // 显示 pickup hint 在玩家位置
        const screenPos = worldToScreen(state.p.x, state.p.y - 40);
        pickupHint.style.display = 'block';
        pickupHint.style.left = screenPos.x + 'px';
        pickupHint.style.top = screenPos.y + 'px';
    } else {
        pickupHint.style.display = 'none';
    }
}

// 更新粒子和回声
function updateParticlesAndEchoes() {
    state.entities.particles.forEach(p => {
        p.x += p.vx; 
        p.y += p.vy; 
        p.life -= 0.05;
    });
    state.entities.particles = state.entities.particles.filter(p=>p.life>0);
    
    state.entities.echoes.forEach(e => e.life -= 0.015);
    state.entities.echoes = state.entities.echoes.filter(e => e.life>0);
    
    state.entities.wallEchoes.forEach(we => we.life -= 0.02);
    state.entities.wallEchoes = state.entities.wallEchoes.filter(we => we.life>0);
}

// 主更新函数
function update() {
    updatePlayer();
    checkPlayerDeath(); // 检查能量归零死亡
    updateCamera();
    updateItemsVisibility();

    // 更新波纹（标记-清理模式避免重叠）
    // 第一遍：更新所有波纹，标记需要删除的
    for(let i = 0; i < state.entities.waves.length; i++) {
        updateWave(state.entities.waves[i], i);
    }
    // 第二遍：清理标记为删除的波纹
    state.entities.waves = state.entities.waves.filter(w => !w._toRemove);
    
    // 更新敌人和检查交互
    updateEnemies();
    const hasPickupTarget = checkPickups();
    updateInteractionHints(hasPickupTarget);
    
    updateParticlesAndEchoes();
    
    // 边缘红光衰减
    if(state.edgeGlowIntensity > 0) {
        state.edgeGlowIntensity = Math.max(0, state.edgeGlowIntensity - 0.05);
    }
    
    updateUI();
}

// --- 输入处理 ---
function initInputHandlers() {
    window.onkeydown = e => {
        const k = e.key.toLowerCase();
        if(state.keys.hasOwnProperty(k) || k===' ') {
            state.keys[k===' '?'space':k] = true;
        }
        if(k==='e') tryInteract(); // E键通用交互
    };

    window.onkeyup = e => {
        const k = e.key.toLowerCase();
        if(state.keys.hasOwnProperty(k) || k===' ') {
            state.keys[k===' '?'space':k] = false;
            if(k===' ') releaseScan();
        }
    };

    canvas.onmousemove = e => { 
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const worldPos = screenToWorld(canvasX, canvasY);
        state.mouse.x = worldPos.x; 
        state.mouse.y = worldPos.y; 
    };

    window.onwheel = e => {
        const d = Math.sign(e.deltaY) * -5;
        state.freq = clamp(state.freq+d, CFG.freqMin, CFG.freqMax);
        updateUI();
    };
}

function loop() { 
    update(); 
    draw(); 
    requestAnimationFrame(loop); 
}

// 启动游戏
initGlobals();
initInputHandlers();
init();

