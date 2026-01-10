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
    keys: { w:0, a:0, s:0, d:0, space:0, f:0, r:0, e:0, shift:0 },
    mouse: { x:0, y:0 },
    freq: 150,
    focusLevel: 0,
    
    // UI消息系统
    currentMessage: '',
    messageTimer: 0,
    
    camera: { x: 0, y: 0 },
    entities: {
        walls: [], enemies: [], waves: [], echoes: [], particles: [], items: [], wallEchoes: [], radiations: [], base: null, baseEchoes: []
    },
    
    antennaSystem: null,
    slamSystem: null
};

// --- 初始化 ---

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
    // 初始化基地位置（地图中心）
    const baseX = canvas.width * CFG.mapScale / 2;
    const baseY = canvas.height * CFG.mapScale / 2;
    
    // 初始化玩家位置
    const playerOffsetY = 120; // 向上偏移120像素，确保在触发范围外
    state.p.x = baseX;
    state.p.y = baseY - playerOffsetY;
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
    state.entities.baseEchoes = [];
    
    // 初始化玩家频率
    initPlayerFrequency();

    // 初始化墙壁系统
    if (typeof initWalls === 'function') {
        initWalls();
    }

    // 生成敌人
    for(let i=0; i<CFG.numEnemy; i++) spawnEnemy();
    
    // 生成能量瓶
    for(let i=0; i<CFG.numEnergyBottle; i++) spawnItem('energy');
    
    // 生成信号源
    if (CFG.storySignals && CFG.storySignals.length > 0) {
        const baseX = canvas.width * CFG.mapScale / 2;
        const baseY = canvas.height * CFG.mapScale / 2;
        
        CFG.storySignals.forEach(signalConfig => {
            // 计算信号源的世界坐标
            const angleRad = signalConfig.direction * Math.PI / 180;
            const distanceMeters = signalConfig.distance * 1000;
            const signalX = baseX + Math.cos(angleRad) * distanceMeters;
            const signalY = baseY - Math.sin(angleRad) * distanceMeters;
            
            // 生成信号源物品
            spawnItem('signal_source', signalX, signalY, {
                frequency: signalConfig.frequency,
                message: signalConfig.message || '',
                callsign: signalConfig.callsign || `SIGNAL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                strength: signalConfig.strength || 50,
                waveEmitInterval: 5.0  // 每5秒发射一次
            });
        });
    }
    
    // 初始化相机位置为玩家位置
    state.camera.x = state.p.x;
    state.camera.y = state.p.y;
    
    // 初始化基地（在地图中心）
    if (typeof spawnBase === 'function') {
        spawnBase(baseX, baseY);
    }
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
    
    // 更新基地轮廓
    if (state.entities.baseEchoes) {
        state.entities.baseEchoes.forEach(be => be.life -= 0.02);
        state.entities.baseEchoes = state.entities.baseEchoes.filter(be => be.life>0);
    }
}

// 主更新函数
function update(deltaTime = 0.016) {
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
    
    // 更新天线系统：检测反弹波
    if (state.antennaSystem) {
        // 更新天线方向（跟随玩家朝向）
        state.antennaSystem.updateDirection(state.p.a);
        
        // 检测反弹波
        const reflections = state.antennaSystem.detectReflectedWaves(
            state.entities.waves,
            state.p.x,
            state.p.y
        );
        
        // 将反弹波记录到SLAM系统
        if (state.slamSystem && reflections.length > 0) {
            state.slamSystem.addPointsFromReflections(reflections);
        }
    }
    
    // 更新信号源（5.2：信号源定期释放波纹）
    if (typeof updateSignalSources === 'function') {
        updateSignalSources(deltaTime);
    }
    
    // 检查信号源是否被天线发现（5.2）
    if (typeof checkSignalSourceDiscovery === 'function') {
        checkSignalSourceDiscovery();
    }
    
    // 更新敌人和物品UI
    updateEnemies();
    updateItemsUI();
    
    // 更新基地
    if (typeof updateBase === 'function') {
        updateBase(deltaTime);
    }
    
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
        // 处理Shift键
        if(e.key === 'Shift') {
            state.keys.shift = true;
        }
        if(k==='e') tryInteract(); // E键通用交互
    };

    window.onkeyup = e => {
        const k = e.key.toLowerCase();
        if(state.keys.hasOwnProperty(k) || k===' ') {
            state.keys[k===' '?'space':k] = false;
            if(k===' ') releaseScan();
        }
        // 处理Shift键
        if(e.key === 'Shift') {
            state.keys.shift = false;
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
    // 使用全局deltaTime（在mainLoop中计算）
    update(deltaTime); 
    draw(); 
}

// ========================================
// 启动应用程序
// ========================================

function startApplication() {
    console.log('=== Resonance v0.2 ===');
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
    
    // 4. 初始化摩斯码系统
    if (typeof initMorseCodeSystem === 'function') {
        initMorseCodeSystem();
    }
    
    // 5. 初始化天线系统
    if (typeof initAntennaSystem === 'function') {
        state.antennaSystem = initAntennaSystem();
    }
    
    // 6. 初始化SLAM系统
    if (typeof initSLAMSystem === 'function') {
        state.slamSystem = initSLAMSystem();
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
            // 传递增强的事件对象，包含 action 信息
            currentScene.handleInput(event);
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

