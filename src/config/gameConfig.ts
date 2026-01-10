/**
 * 游戏配置
 * Game Configuration
 * 
 * 保留配置结构，移除具体业务逻辑值
 */

import { IGameConfig, ICoreTypes } from '@/types/game';

// 游戏配置对象（空结构，保留类型定义）
export const CFG: IGameConfig = {
  // 地图配置
  mapScale: undefined,
  
  // 玩家配置
  pSpeed: undefined,
  pViewDist: undefined,
  pViewAngle: undefined,
  playerRadius: undefined,
  maxEnergy: undefined,
  maxDurability: undefined,
  energyFlaskVal: undefined,
  
  // 耐久消耗
  struggleDurabilityLoss: undefined,
  beingStruggledDurabilityLoss: undefined,
  
  // 玩家抓取敌人
  playerGrabDistance: undefined,
  playerGrabEnergyDrain: undefined,
  enemyStruggleChance: undefined,
  enemyStruggleProgressGain: undefined,
  
  // 扫描与波
  forcedWaveCost: undefined,
  overloadDmgRatio: undefined,
  waveSpeed: undefined,
  waveMaxDist: undefined,
  parryDistanceThreshold: undefined,
  parryRewardNormal: undefined,
  parryRewardPerfect: undefined,
  
  // 聚焦参数
  focusSpeed: undefined,
  focusChargeDelay: undefined,
  minSpread: undefined,
  maxSpread: undefined,
  analyzeThreshold: undefined,
  
  // 频率
  freqMin: undefined,
  freqMax: undefined,
  perfectResTol: undefined,
  normalResTol: undefined,
  
  // 敌人
  eSpeedPatrol: undefined,
  eSpeedChase: undefined,
  stunTime: undefined,
  grabCD: undefined,
  grabCDAfterStruggle: undefined,
  playerGrabImmunityTime: undefined,
  enemyMaxEnergy: undefined,
  
  // 抓取与挣脱
  struggleProgressMax: undefined,
  struggleProgressDecay: undefined,
  struggleProgressGain: undefined,
  grabEnergyDrainRate: undefined,
  
  // 能量系统
  energyDecayRate: undefined,
  waveAbsorbRatio: undefined,
  
  // 能耗辐射系统
  radiationBaseRadius: undefined,
  radiationEnergyMultiplier: undefined,
  radiationDecayRate: undefined,
  
  // 能量感知系统
  energyDetectionRadius: undefined,
  energyDetectionSectorAngle: undefined,
  energyRemoteDetectionThresholdSensitive: undefined,
  energyRemoteDetectionThresholdBlind: undefined,
  energyAbsorbDetectionThreshold: undefined,
  
  // 过载系统
  overloadDecayRate: undefined,
  maxOverload: undefined,
  overloadStunMultiplier: undefined,
  
  // 抓取系统
  grabEnergyDrainRateEnemy: undefined,
  grabEnergyDrainRatePlayer: undefined,
  stealthGrabDistance: undefined,
  
  // 核心物品
  coreHotItemValue: undefined,
  coreColdItemValue: undefined,
  
  // 背包系统
  inventorySize: undefined,
  
  // 休眠敌人能量吸收
  dormantAbsorptionRange: undefined,
  dormantAbsorptionRate: undefined,
  dormantNaturalRegenRate: undefined,
  dormantWakeupThreshold: undefined,
  
  // 波纹能量
  baseWaveEnergy: undefined,
  energyThreshold: undefined,
  initialRadius: undefined,
  resonanceCD: undefined,
  minEnergyPerPoint: undefined,
  
  // 反弹波系统
  reflectionCoefficientWall: undefined,
  reflectionCoefficientEnemy: undefined,
  
  // 天线系统
  antennaRange: undefined,
  antennaAngle: undefined,
  
  // SLAM系统
  slamMaxPoints: undefined,
  slamPointLifetime: undefined,
  slamConnectPoints: undefined,
  
  // 波纹信息显示等级阈值
  infoLevelClear: undefined,
  infoLevelAnalyze: undefined,
  infoLevelLong: undefined,
  
  // 阻挡物
  wallFreqs: undefined,
  wallColors: undefined,
  numWalls: undefined,
  numEnemy: undefined,
  numEnergyBottle: undefined,
  
  // 信号源配置
  storySignals: undefined,
  
  // 相机
  cameraFOV: undefined,
  cameraFollowSpeed: undefined,
  cameraSmoothing: undefined,
};

// 核心类型定义（空结构，保留类型定义）
export const CORE_TYPES: ICoreTypes = {
  SCAVENGER: {
    id: '',
    name: '',
    freqMin: 0,
    freqMax: 0,
    energyMultiplier: 0,
    radiationMultiplier: 0,
    speedMultiplier: 0,
    description: '',
  },
  MIMIC: {
    id: '',
    name: '',
    freqMin: 0,
    freqMax: 0,
    energyMultiplier: 0,
    radiationMultiplier: 0,
    speedMultiplier: 0,
    description: '',
  },
  HEAVY: {
    id: '',
    name: '',
    freqMin: 0,
    freqMax: 0,
    energyMultiplier: 0,
    radiationMultiplier: 0,
    speedMultiplier: 0,
    description: '',
  },
};

// 指令定义（空结构）
export interface IInstruction {
  id: number;
  text: string;
}

export const INSTRUCTIONS: IInstruction[] = [];
