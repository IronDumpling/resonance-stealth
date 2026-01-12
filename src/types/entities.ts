/**
 * 实体类型定义
 * Entity Type Definitions
 */

// 基础实体接口
export interface IBaseEntity {
  x: number;
  y: number;
  
  init?(): void;
  update?(deltaTime: number): void;
  render?(ctx: CanvasRenderingContext2D): void;
}

// 玩家实体接口
export interface IPlayer extends IBaseEntity {
  a: number; // 角度
  en: number; // 能量
  invuln: number; // 无敌时间
  isGrabbed: boolean;
  grabberEnemy: IEnemy | null; // 抓取玩家的敌人引用
  struggleProgress: number; // 挣脱进度 (0-100)
  grabImmunity: number; // 抓取无敌时间（挣脱后的保护期）
  grabHintElement: HTMLElement | null; // 玩家抓取敌人的UI提示
  isCharging: boolean;
  chargeStartTime: number; // 开始蓄力的时间戳（秒）
  resonanceCD: number; // 共振冷却时间
  grabParticleTimer: number; // 抓取粒子计时器
  shouldShowAimLine: boolean; // 是否显示辅助瞄准线
  overload: number; // 玩家过载值（与敌人一致）
  isGrabbingEnemy: IEnemy | null; // 当前抓取的敌人引用
  aimLineHit: unknown | null; // 瞄准线raycast碰撞结果
  isDormant: boolean;
  isDestroyed: boolean;
  currentCore: ICore;
  durability: number;
  inventory: (IItem | null)[]; // 背包数组，可能包含null
  overloadedStunTimer: number; // 过载硬直计时器
}

// 敌人实体接口
export interface IEnemy extends IBaseEntity {
  freq: number;
  en: number;
  isStunned: boolean;
  overload: number;
  isDormant: boolean;
}

// 障碍物实体接口（原Wall）
export interface IObstacle extends IBaseEntity {
  freq: number;
  width: number;
  height: number;
}

// 波纹实体接口
export interface IWave extends IBaseEntity {
  r: number; // 半径
  angle: number;
  spread: number;
  freq: number;
  energyPerPoint: number;
  source: 'player' | 'enemy' | 'signal';
}

// 核心类型接口
export interface ICore {
  id: string;
  name: string;
  freqMin: number;
  freqMax: number;
  // 直接数值配置
  maxEnergy: number;              // 能量上限
  energyDecayRate: number;        // 能量消耗速率（每帧）
  maxOverload: number;            // 过载上限
  overloadDecayRate: number;      // 过载衰减速率（每帧）
  overloadGainRate?: number;       // 过载增长速率（可选，如果有特殊机制）
  // 保留现有的multiplier
  energyMultiplier: number;        // 用于辐射系统等
  radiationMultiplier: number;
  speedMultiplier: number;
  description: string;
}

// 物品基类接口
export interface IItem extends IBaseEntity {
  type: ItemType;
  visibleTimer: number;
  hintElement?: HTMLElement | null;
}

// 物品类型
export type ItemType = 'energy_bottle' | 'cold_core' | 'core_hot' | 'signal_source';

// 能量瓶接口
export interface IEnergyBottle extends IItem {
  type: 'energy_bottle';
  value: number;
  hintElement?: HTMLElement | null;
}

// 冷核心接口
export interface IColdCore extends IItem {
  type: 'cold_core';
  value: number;
  hintElement?: HTMLElement | null;
}

// 热核心接口
export interface IHotCore extends IItem {
  type: 'core_hot';
  value: number;
  coreData?: ICore; // 存储核心配置数据
  hintElement?: HTMLElement | null;
}

// 信号源接口
export interface IWaveSource extends IItem {
  type: 'signal_source';
  frequency: number;
  message: string;
  callsign: string;
  strength: number;
  waveEmitInterval: number;
  lastWaveEmitTime?: number;
  waveEmitCount?: number;
  discovered?: boolean;
  morseCode?: string;
  hintElement?: HTMLElement | null;
}

// 实体集合接口
export interface IEntityCollection {
  obstacles: IObstacle[];
  enemies: IEnemy[];
  waves: IWave[];
  echoes: IEcho[];
  particles: IParticle[];
  items: IItem[];
  wallEchoes: IWallEcho[];
  radiations: IRadiation[];
  base: IBase | null;
  baseEchoes: IBaseEcho[];
}

// 回声接口
export interface IEcho extends IBaseEntity {
  type: 'item' | 'analyze' | 'enemy_bounce';
  life: number;
  r?: number;
  isPerfect?: boolean;
  isResonance?: boolean;
}

// 粒子接口
export interface IParticle extends IBaseEntity {
  vx: number;
  vy: number;
  life: number;
}

// 墙壁回声接口
export interface IWallEcho extends IBaseEntity {
  life: number;
}

// 辐射接口
export interface IRadiation extends IBaseEntity {
  radius: number;
  intensity: number;
}

// 基地接口
export interface IBase extends IBaseEntity {
  radius: number;
  triggerRadius: number;
  evacuationTimer: number;
  evacuationDuration: number;
  isEvacuating: boolean;
  pulsePhase: number;
  blockFreq: number;
  absorbedEnergy: number;
}

// 基地回声接口
export interface IBaseEcho extends IBaseEntity {
  life: number;
}
