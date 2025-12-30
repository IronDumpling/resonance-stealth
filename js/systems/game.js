// 主游戏逻辑

// 全局变量（在HTML中初始化）
let canvas, ctx, uiContainer, edgeGlow;

// 初始化全局变量
function initGlobals() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    uiContainer = document.getElementById('world-ui-container');
    edgeGlow = document.getElementById('edge-glow');
    
    // Get monitor screen container for sizing
    const monitorScreen = document.getElementById('monitor-screen');
    
    if (monitorScreen) {
        // Size canvas to fit monitor (60% of screen)
        canvas.width = monitorScreen.clientWidth;
        canvas.height = monitorScreen.clientHeight;
    } else {
        // Fallback to full screen
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    console.log(`Canvas sized: ${canvas.width}x${canvas.height}`);
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
        grabImmunity: 0,         // 抓取无敌时间（挣脱后的保护期）
        grabHintElement: null,   // 玩家抓取敌人的UI提示
        
        // 背包系统
        inventory: [],           // 背包数组，最多6个物品
        isCharging: false,
        chargeStartTime: 0,       // 开始蓄力的时间戳（秒）
        en: CFG.maxEnergy, 
        invuln: 0,
        resonanceCD: 0, 
        grabParticleTimer: 0,
        shouldShowAimLine: false,  // 是否显示辅助瞄准线
        overload: 0,               // 玩家过载值（与敌人一致）
        isGrabbingEnemy: null,     // 当前抓取的敌人引用
        grabHintElement: null,     // Grab Hint UI元素引用
        aimLineHit: null,          // 瞄准线raycast碰撞结果
        
        // 核心系统
        currentCore: CORE_TYPES.SCAVENGER,  // 当前装备的核心
        durability: CFG.maxDurability,      // 耐久值
        isDormant: false,                   // 是否休眠
        isDestroyed: false                  // 是否报废
    },
    keys: { w:0, a:0, s:0, d:0, space:0, f:0, r:0, e:0 },
    mouse: { x:0, y:0 },
    freq: 150,
    focusLevel: 0,
    
    // UI消息系统
    currentMessage: '',
    messageTimer: 0,
    
    camera: { x: 0, y: 0 },
    entities: {
        walls: [], enemies: [], waves: [], echoes: [], particles: [], items: [], wallEchoes: [], instructions: [], radiations: []
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

// 初始化玩家频率为核心范围中点
function initPlayerFrequency() {
    const core = state.p.currentCore;
    state.freq = (core.freqMin + core.freqMax) / 2;
    
    // 同步到无线电系统
    if (typeof radioSystem !== 'undefined' && radioSystem) {
        radioSystem.setFrequencyRange(core.freqMin, core.freqMax);
        radioSystem.syncWithRobotFrequency(state.freq);
    }
}

// 调整玩家频率（同时同步到无线电）
function adjustPlayerFrequency(delta, isFine = false) {
    const step = isFine ? 1 : 5; // shift键精调（±1Hz），否则粗调（±5Hz）
    const core = state.p.currentCore;
    
    state.freq += delta * step;
    state.freq = Math.max(core.freqMin, Math.min(core.freqMax, state.freq));
    state.freq = Math.round(state.freq * 10) / 10;
    
    // 同步到无线电
    if (typeof radioSystem !== 'undefined' && radioSystem) {
        radioSystem.syncWithRobotFrequency(state.freq);
    }
}

function init() {
    // 初始化玩家位置
    state.p.x = canvas.width * CFG.mapScale / 2;
    state.p.y = canvas.height * CFG.mapScale / 2;
    state.p.en = CFG.maxEnergy;
    state.p.isGrabbed = false;
    state.p.grabberEnemy = null;
    state.p.struggleProgress = 0;
    state.p.chargeStartTime = 0;
    state.p.shouldShowAimLine = false;
    state.p.overload = 0;
    state.p.isGrabbingEnemy = null;
    state.p.aimLineHit = null;
    
    state.entities.walls = [];
    state.entities.radiations = [];
    state.entities.items = [];
    state.entities.instructions = [];
    
    // 初始化玩家频率
    initPlayerFrequency();
    
    // Instructions移到Assembly场景显示
    state.entities.instructions = [];

    // 在地图四周生成边界墙，让玩家看不到画布边缘
    const borderThickness = 60;
    const mapWidth = canvas.width * CFG.mapScale;
    const mapHeight = canvas.height * CFG.mapScale;
    const borderFreq = CFG.wallFreqs[CFG.wallFreqs.length - 1]; // 使用最高频率作为边界阻挡
    const borderColor = CFG.wallColors[borderFreq];
    // 上边界
    state.entities.walls.push({
        x: -borderThickness, y: -borderThickness,
        w: mapWidth + borderThickness*2, h: borderThickness,
        blockFreq: borderFreq, color: borderColor
    });
    // 下边界
    state.entities.walls.push({
        x: -borderThickness, y: mapHeight,
        w: mapWidth + borderThickness*2, h: borderThickness,
        blockFreq: borderFreq, color: borderColor
    });
    // 左边界
    state.entities.walls.push({
        x: -borderThickness, y: 0,
        w: borderThickness, h: mapHeight,
        blockFreq: borderFreq, color: borderColor
    });
    // 右边界
    state.entities.walls.push({
        x: mapWidth, y: 0,
        w: borderThickness, h: mapHeight,
        blockFreq: borderFreq, color: borderColor
    });
    
    // 生成墙壁（增加数量并扩大生成范围）
    let attempts = 0;
    const numWalls = 18; // 增加墙壁数量以适应更大地图
    while(state.entities.walls.length < numWalls && attempts < 500) {
        attempts++;
        const w = rand(80, 200);
        const h = rand(80, 200);
        const x = rand(100, mapWidth-200);
        const y = rand(100, mapHeight-200);
        
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
            const px = mapWidth/2; const py = mapHeight/2;
            if (x < px + 150 && x + w > px - 150 && y < py + 150 && y + h > py - 150) overlap = true;
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

    // 增加敌人数量以适应更大地图
    for(let i=0; i<7; i++) spawnEnemy();
    
    // 生成能量瓶
    for(let i=0; i<12; i++) spawnItem('energy');
    
    // 初始化相机位置为玩家位置
    state.camera.x = state.p.x;
    state.camera.y = state.p.y;
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
    updateCamera();
    updateItemsVisibility();

    // 处理波纹与波纹的交互（弹反波吞噬敌方波纹）
    // 在波纹位置更新前调用，优先处理波与波的抵消
    handleWaveToWaveInteraction();

    // 更新波纹（标记-清理模式避免重叠）
    // 第一遍：更新所有波纹，标记需要删除的
    for(let i = 0; i < state.entities.waves.length; i++) {
        updateWave(state.entities.waves[i], i);
    }
    // 第二遍：清理标记为删除的波纹
    state.entities.waves = state.entities.waves.filter(w => !w._toRemove);
    
    // 更新敌人和物品UI
    updateEnemies();
    updateItemsUI();
    
    updateParticlesAndEchoes();
    
    // 更新消息计时器
    if (state.messageTimer > 0) {
        state.messageTimer--;
        if (state.messageTimer <= 0) {
            state.currentMessage = '';
        }
    }
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

    // 滚轮事件由新的 InputManager 系统处理（见 sceneManager.js）
    // 不再需要在这里绑定滚轮事件
}

// ========================================
// 新架构集成
// ========================================

// 主循环 - 现在由场景管理器驱动
let lastTime = Date.now();
let deltaTime = 0;

function mainLoop() {
    // 计算deltaTime
    const now = Date.now();
    deltaTime = (now - lastTime) / 1000; // 转换为秒
    lastTime = now;
    
    // 更新系统
    if (sceneManager) {
        sceneManager.update(deltaTime);
    }
    
    if (crtDisplay) {
        crtDisplay.update(deltaTime);
    }
    
    if (uiManager) {
        uiManager.update(deltaTime);
    }
    
    // 渲染
    if (crtDisplay && sceneManager) {
        crtDisplay.render(() => {
            sceneManager.render(ctx, canvas);
        });
    }
    
    requestAnimationFrame(mainLoop);
}

// 机器人游戏更新和渲染(由RobotScene调用)
function updateAndDrawRobot() { 
    update(); 
    draw(); 
}

// ========================================
// 启动应用程序
// ========================================

function startApplication() {
    console.log('=== Resonance Stealth Terminal ===');
    console.log('Initializing systems...');
    
    // 1. 初始化全局变量
    initGlobals();
    
    // 2. 初始化新系统
    const sm = initSceneManager();
    const crt = initCRTDisplay(canvas, ctx);
    const im = initInputManager();
    const um = initUIManager();
    
    // 3. 初始化库存系统（在游戏启动时就初始化，供Assembly场景使用）
    if (typeof initWarehouse === 'function') {
        initWarehouse();
    }
    if (typeof initPlayerInventory === 'function') {
        initPlayerInventory();
    }
    
    console.log('All systems initialized');
    
    // 4. 设置输入路由
    setupInputRouting();
    
    // 5. 启动主循环
    lastTime = Date.now();
    mainLoop();
    
    console.log('Application started');
    console.log('Current scene:', sceneManager.getCurrentScene());
}

// 设置输入路由 - 将输入管理器连接到场景管理器
function setupInputRouting() {
    // 全局输入处理(所有场景)
    inputManager.on('onKeyDown', null, (event) => {
        const currentScene = sceneManager.getScene(sceneManager.getCurrentScene());
        if (currentScene && currentScene.handleInput) {
            currentScene.handleInput(event.originalEvent);
        }
    });
    
    inputManager.on('onKeyUp', null, (event) => {
        // 处理keyup事件
    });
    
    inputManager.on('onMouseMove', null, (event) => {
        // 更新鼠标状态(用于现有游戏)
        const rect = canvas.getBoundingClientRect();
        const canvasX = event.x - rect.left;
        const canvasY = event.y - rect.top;
        const worldPos = screenToWorld(canvasX, canvasY);
        state.mouse.x = worldPos.x;
        state.mouse.y = worldPos.y;
    });
    
    // 滚轮事件由各个场景自己处理（RobotScene 和 RadioScene）
    // 不在这里注册全局滚轮处理器，避免重复处理
    
    // 设置初始输入上下文（BOOT场景使用CRT_CONTROL上下文）
    inputManager.setContext(INPUT_CONTEXTS.CRT_CONTROL);
}

// 等待DOM加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApplication);
} else {
    startApplication();
}

