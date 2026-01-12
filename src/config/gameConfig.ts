/**
 * 游戏配置
 * Game Configuration
 */

import { IGameConfig, ICoreTypes, IInstruction } from '@/types/game';

// 游戏配置对象
export const CFG: IGameConfig = {
  // 地图配置
  // mapScale计算：雷达地图最大显示10km，需要确保世界地图能覆盖10km范围
  // 雷达地图：10km = 500px半径，需要1000px直径（scale=50 pixels/km）
  // 世界地图：10km = 10000米 = 10000像素（世界坐标1 pixel = 1米）
  // 如果canvas.width=1920，mapScale需要 = 10000/1920 ≈ 5.2
  // 但为了留有余地，设置为5，确保能覆盖所有信号位置（10km范围）
  mapScale: 5,
  
  // 玩家配置
  pSpeed: 3,
  pViewDist: 280,
  pViewAngle: Math.PI / 2.5,
  playerRadius: 14,          // 玩家碰撞半径（用于波纹命中与分割）
  maxDurability: 100,        // 耐久上限
  energyBottleVal: 30,        // 能量瓶恢复量
  
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
  perfectResTol: 1,  // 完美共振容差（±1Hz）
  normalResTol: 5,  // 普通共振容差（±5Hz）
  
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
  
  // 反弹波系统
  reflectionCoefficientWall: 0.8,   // 墙壁反射系数（80%能量）
  reflectionCoefficientEnemy: 0.6,  // 敌人反射系数（60%能量）
  
  // 天线系统
  antennaRange: 280,                // 天线接收半径
  antennaAngle: Math.PI / 2.5,      // 天线扇形角度
  
  // SLAM系统
  slamMaxPoints: 10000,              // 点云最大数量
  slamPointLifetime: Infinity,       // 点的生命周期（Infinity = 永久）
  slamConnectPoints: false,          // 是否连接相近的点形成轮廓线
  
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
  numWalls: 30,                 // 墙壁数量
  numEnemy: 15,                 // 敌人数量
  numEnergyBottle: 25,          // 能量瓶数量
  
  // 信号源配置
  // 每个信号源定义：{ type, frequency, direction(度), distance(km), message, callsign, strength, persistent }
  // direction: 0°=东, 45°=东北, 90°=南, 135°=东南, 180°=西, 225°=西南, 270°=北, 315°=西北
  // 注意：确保distance不会让信号超出地图边界（地图半径约为canvas.width*mapScale/2）
  // 建议：direction选择90°-180°（南到西）或0°-90°（东到南），避免Y坐标变成负数
  // 建议：distance不超过地图半径的70%（地图半径≈canvas.width*mapScale/2）
  storySignals: [
    {
      type: 'astronaut',
      frequency: 155.0,
      direction: 135,       // 东南方向（确保Y坐标为正，在地图内）
      distance: 2.5,         // 2.5km（减小距离确保在地图内）
      message: 'QUANTUM LINK ESTABLISHED',
      callsign: 'ASTRONAUT-01',
      strength: 70,
      persistent: true
    }
    // 可以在这里添加更多信号源
  ],
  
  // 相机
  cameraFOV: 2.0,             // 视野缩放（1.0 = 正常，>1.0 = 放大，<1.0 = 缩小）
  cameraFollowSpeed: 0.1,     // 相机跟随速度（0-1，越大跟随越快）
  cameraSmoothing: true       // 是否启用平滑跟随
};

// 核心类型定义
export const CORE_TYPES: ICoreTypes = {
  SCAVENGER: {
    id: 'scavenger',
    name: '拾荒者核心',
    freqMin: 120,
    freqMax: 220,
    maxEnergy: 120,              // 高能量上限
    energyDecayRate: 0.008,      // 低能耗（0.8倍基础值）
    maxOverload: 100,
    overloadDecayRate: 0.2,
    energyMultiplier: 0.8,       // 用于辐射系统等
    radiationMultiplier: 0.9,    // 辐射半径降低10%
    speedMultiplier: 1.0,
    description: '节能高效，适合长期探索'
  },
  MIMIC: {
    id: 'mimic',
    name: '拟态者核心',
    freqMin: 100,
    freqMax: 300,                 // 全频率覆盖
    maxEnergy: 80,                // 较低能量上限
    energyDecayRate: 0.012,       // 较高能耗（1.2倍基础值）
    maxOverload: 100,
    overloadDecayRate: 0.2,
    energyMultiplier: 1.2,        // 用于辐射系统等
    radiationMultiplier: 0.7,     // 辐射半径降低30%
    speedMultiplier: 1.1,         // 速度提升10%
    description: '高机动低辐射，擅长潜行'
  },
  HEAVY: {
    id: 'heavy',
    name: '重装核心',
    freqMin: 100,
    freqMax: 150,                 // 极低频
    maxEnergy: 150,               // 很高能量上限
    energyDecayRate: 0.015,       // 很高能耗（1.5倍基础值）
    maxOverload: 120,             // 更高的过载上限
    overloadDecayRate: 0.15,      // 较慢的过载衰减
    energyMultiplier: 1.5,        // 用于辐射系统等
    radiationMultiplier: 1.3,     // 辐射半径增加30%
    speedMultiplier: 0.85,        // 速度降低15%
    description: '高耐久重装，正面突破'
  }
};

// 指令定义
export const INSTRUCTIONS: IInstruction[] = [
  { id: 0, text: "WASD移动\n鼠标移动转向\nShift奔跑"},
  { id: 1, text: "短按空格，释放环形波；长按空格，释放聚焦波"},
  { id: 2, text: "转动鼠标滚轮调整频率\n频率越高，消耗能量越大"},
  { id: 3, text: "所有物体，包括波纹生物，都有固定频率"},
  { id: 4, text: "低频穿过，高频阻挡\n同频共振"},
  { id: 5, text: "敌人无视觉，只能感知能量\n控制辐射半径与频率进行潜行"},
  { id: 6, text: "聚焦共振波使敌人过载\n过载条满后按E处决\n掉落热核心"},
  { id: 7, text: "暗杀：绕背同频后按E吸取\n敌人休眠，获得能量与冷核心"},
  { id: 8, text: "被抓住时按F挣脱\n消耗耐久，保住能量"},
  { id: 9, text: "按E拾取物品\n按R使用能量瓶恢复"},
  { id: 10, text: "能量耗尽进入休眠\n按R使用能量瓶重启"},
  { id: 11, text: "机器人核心决定特性\n死亡失去当前核心"},
  { id: 12, text: "按Tab切换到无线电模式\n监听信号，查看雷达地图"},
  { id: 13, text: "无线电：鼠标滚轮调频\nShift+滚轮精调\n左右方向键调整天线方向"},
  { id: 14, text: "雷达地图显示已发现信号\n中心三角代表机器人位置\n信号源会生成任务道具"},
  { id: 15, text: "摩斯码解码：调整到信号频率\n按W发射波，接收响应\n前往地图标记位置收集任务道具"},
];

// 摩斯电码表
export const MORSE_CODE: Record<string, string> = {
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
  'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
  'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
  'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
  'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  ' ': '/'
};
