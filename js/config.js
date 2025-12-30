// --- 配置参数 ---
const CFG = {
    // 玩家
    pSpeed: 3,
    pViewDist: 280,
    pViewAngle: Math.PI / 2.5,
    playerRadius: 14,          // 玩家碰撞半径（用于波纹命中与分割）
    maxEnergy: 100,            // 能量上限
    maxDurability: 100,        // 耐久上限
    
    energyFlaskVal: 30,        // 能量瓶恢复量
    
    // 休眠与重启
    restartEnergyCost: 30,     // 重启消耗的备用能量
    restartEnergyGain: 30,     // 重启后获得的能量
    
    // 耐久消耗（仅在抓取/被抓取挣扎时消耗）
    struggleDurabilityLoss: 2,         // 被抓取挣脱时耐久损失（每次按F）
    beingStruggledDurabilityLoss: 1.5, // 抓取敌人时，敌人挣脱导致的耐久损失（每次）
    
    // 玩家抓取敌人
    playerGrabDistance: 30,            // 玩家抓取距离
    playerGrabEnergyDrain: 0.2,        // 玩家抓取敌人时吸取的能量速度（每帧）
    enemyStruggleChance: 0.02,         // 敌人每帧挣脱的概率
    enemyStruggleProgressGain: 20,     // 敌人挣脱进度增加量
    
    // 扫描与波
    forcedWaveCost: 15,
    overloadDmgRatio: 1.3,
    waveSpeed: 5,
    waveMaxDist: 1500,           // 增大扫描范围

    parryDistanceThreshold: 25,  // 弹反判定距离阈值（像素）
    parryRewardNormal: 20,       // 普通弹反回复量
    parryRewardPerfect: 40,      // 完美弹反回复量

    // 聚焦参数
    focusSpeed: 0.015,             // 蓄力增长速度
    focusChargeDelay: 0.15,        // 蓄力延迟时间（秒），期间角度不缩小
    minSpread: 0.08, 
    maxSpread: Math.PI * 2,
    analyzeThreshold: 0.5,
    
    // 频率
    freqMin: 100,
    freqMax: 300,
    perfectResTol: 5,  // 完美共振容差（±5Hz）
    normalResTol: 10,  // 普通共振容差（±10Hz） 
    
    // 敌人
    eSpeedPatrol: 0.6,
    eSpeedChase: 1.5,
    stunTime: 600, 
    grabCD: 180,                   // 抓取基础冷却时间（帧数，3秒）
    grabCDAfterStruggle: 360,      // 玩家挣脱后，敌人的额外冷却时间（6秒）
    playerGrabImmunityTime: 120,   // 玩家挣脱后的无敌时间（2秒，期间不能被抓）
    enemyMaxEnergy: 80,            // 敌人最大能量值
    
    // 抓取与挣脱
    struggleProgressMax: 100,      // 挣脱进度最大值
    struggleProgressDecay: 0.2,    // 挣脱进度每帧衰减量
    struggleProgressGain: 15,      // 每次按F增加的挣脱进度
    grabEnergyDrainRate: 0.1,      // 被抓取时每帧能量流失量
    
    // 能量系统
    energyDecayRate: 0.01,         // 能量自然衰减（每帧基础消耗）
    waveAbsorbRatio: 0.3,          // 波纹穿透时生物吸收的能量比例（对应穿透损失的30%）
    
    // 能耗辐射系统
    radiationBaseRadius: 50,        // 基础辐射半径（像素）
    radiationEnergyMultiplier: 1,   // 能量消耗到辐射半径的转换系数
    radiationDecayRate: 0.01,       // 辐射场衰减率（每帧）
    
    // 能量感知系统
    energyDetectionRadius: 200,                  // 能量感知范围半径（像素）
    energyDetectionSectorAngle: Math.PI / 2,     // 敏感扇区角度（90度）
    energyRemoteDetectionThresholdSensitive: 10,  // 远程能量感知阈值（敏感区）
    energyRemoteDetectionThresholdBlind: 200,     // 远程能量感知阈值（盲区）
    energyAbsorbDetectionThreshold: 10,          // 吸收能量感知阈值（生物波穿透时）
    
    // 过载系统
    overloadDecayRate: 0.2,         // 过载条自然衰减速度（每帧，降低以允许连击）
    maxOverload: 100,               // 过载最大值（玩家和敌人统一）
    overloadStunMultiplier: 2,      // 硬直时间倍率（过载增长 * 倍率 = 硬直帧数）
    
    // 抓取系统
    grabEnergyDrainRateEnemy: 0.15, // 玩家抓取敌人时的能量吸收速度
    grabEnergyDrainRatePlayer: 0.1, // 敌人抓取玩家时的能量吸收速度（已存在，确认值）
    stealthGrabDistance: 30,        // 暗杀抓取距离
    
    // 核心物品
    coreHotItemValue: 10,           // 热核心恢复的能量值（收集用）
    coreColdItemValue: 50,          // 冷核心恢复的能量值（立即吸收）
    
    // 背包系统
    inventorySize: 6,               // 背包容量
    
    // 休眠敌人能量吸收
    dormantAbsorptionRange: 50,     // 休眠敌人吸收范围
    dormantAbsorptionRate: 0.1,     // 每帧吸收速率
    dormantNaturalRegenRate: 0.02,  // 每帧自然恢复速率（比吸收慢5倍）
    dormantWakeupThreshold: 0.5,    // 恢复活动的能量阈值（总能量的一半）
    
    // 波纹能量
    baseWaveEnergy: 10000,       // 波纹固定基础能量N
    energyThreshold: 0.1,        // 过载能量阈值比例
    initialRadius: 5,            // 初始半径
    resonanceCD: 120,
    minEnergyPerPoint: 0.00001, // 波纹最小能量密度阈值，低于此值波纹消失
    
    // 波纹信息显示等级阈值
    infoLevelClear: 500,      // 高于此值：清晰轮廓（低于则为模糊轮廓）
    infoLevelAnalyze: 2000,   // 高于此值：显示分析UI
    infoLevelLong: 8000,      // 高于此值：长期显示（低于则为短暂显示）
    
    // 阻挡物
    wallFreqs: [150, 200, 250],  // 墙壁频率选项
    wallColors: {                // 墙壁颜色映射
        150: '#333333',
        200: '#666666', 
        250: '#999999'
    },
    
    // 相机
    cameraFOV: 1.4,             // 视野缩放（1.0 = 正常，>1.0 = 放大，<1.0 = 缩小）
    cameraFollowSpeed: 0.1,     // 相机跟随速度（0-1，越大跟随越快）
    cameraSmoothing: true       // 是否启用平滑跟随
};

// --- 核心类型定义 ---
const CORE_TYPES = {
    SCAVENGER: {
        id: 'scavenger',
        name: '拾荒者核心',
        freqMin: 120,
        freqMax: 220,
        energyMultiplier: 0.8,      // 能耗降低20%
        radiationMultiplier: 0.9,   // 辐射半径降低10%
        speedMultiplier: 1.0,
        description: '节能高效，适合长期探索'
    },
    
    MIMIC: {
        id: 'mimic',
        name: '拟态者核心',
        freqMin: 100,
        freqMax: 300,               // 全频率覆盖
        energyMultiplier: 1.2,      // 能耗增加20%
        radiationMultiplier: 0.7,   // 辐射半径降低30%
        speedMultiplier: 1.1,        // 速度提升10%
        description: '高机动低辐射，擅长潜行'
    },
    
    HEAVY: {
        id: 'heavy',
        name: '重装核心',
        freqMin: 100,
        freqMax: 150,               // 极低频
        energyMultiplier: 1.5,      // 能耗增加50%
        radiationMultiplier: 1.3,   // 辐射半径增加30%
        speedMultiplier: 0.85,       // 速度降低15%
        description: '高耐久重装，正面突破'
    }
};

// --- Instruction 定义 ---
const INSTRUCTIONS = [
    { id: 0, text: "WASD移动\n鼠标移动转向\n对于波纹生物，能量就是生命", distance: 0 },
    { id: 1, text: "波纹生物都有自己的频率\n它们会被同频的波纹吸引", distance: 50 },
    { id: 2, text: "短按空格释放波，长按空格聚焦波\n波纹越聚焦，消耗能量越大", distance: 200 },
    { id: 3, text: "转动鼠标滚轮调整频率\n频率越高，消耗能量越大", distance: 350 },
    { id: 4, text: "低频会穿过\n高频会阻挡\n同频会共振", distance: 400 },
    { id: 5, text: "聚焦共振波能够使波纹生物过载\n利用这个机会靠近并解决它们", distance: 500 },
    { id: 6, text: "生物共振后会受迫释放波纹\n消耗能量", distance: 600 },
    { id: 7, text: "随时捡起能量瓶\n按R使用备用能量", distance: 650 },
    { id: 8, text: "被抓住时\n持续按F挣脱", distance: 750 },
];

