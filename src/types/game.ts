/**
 * 游戏状态类型定义
 * Game State Type Definitions
 */

import { IEntityCollection, IPlayer, ICore } from './entities';
import { IMouseState, IAntennaSystem } from './systems';

// 键盘状态接口
export interface IKeysState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
  f: boolean;
  r: boolean;
  e: boolean;
  shift: boolean;
}

// 相机接口
export interface ICamera {
  x: number;
  y: number;
}

// 车辆状态
export type VehicleGear = 'P' | 'R' | 'N' | 'D';

export interface IVehicleState {
  gear: VehicleGear;
  speed: number;       // 当前速度（像素/秒）
  steeringAngle: number;  // 转向角（弧度）
  engineOn: boolean;
  throttle: number;    // 0-1
  brake: number;       // 0-1
}

// 生存系统状态（生命/完整度/燃油/电量）
export interface ISurvivalState {
  life: number;        // 玩家生命 (0-100)
  integrity: number;   // 车完整度 (0-100)
  armorDropped: boolean;  // 完整度归零后护甲是否已掉落
  fuel: number;       // 燃油 (0-100)
  battery: number;    // 电量 (0-100)
}

// 游戏状态接口
export interface IGameState {
  // 生存状态
  survival: ISurvivalState;
  // 车辆状态
  vehicle: IVehicleState;
  // 玩家状态
  p: IPlayer;
  
  // 输入状态
  keys: IKeysState;
  mouse: IMouseState;
  
  // 频率和聚焦
  freq: number;
  focusLevel: number;
  
  // UI消息系统
  currentMessage: string;
  messageTimer: number;
  
  // 相机
  camera: ICamera;
  
  // 实体集合
  entities: IEntityCollection;
  
  // 系统引用
  antennaSystem: IAntennaSystem | null;

  /** 当前场景（用于判断是否执行驾驶逻辑） */
  currentScene?: string;
}

// 游戏配置接口（空结构，保留类型定义）
export interface IGameConfig {
  // 地图配置
  mapScale?: number;
  
  // 玩家配置
  pSpeed?: number;
  pViewDist?: number;
  pViewAngle?: number;
  playerRadius?: number;
  maxEnergy?: number;
  maxDurability?: number;
  
  // 频率配置
  freqMin?: number;
  freqMax?: number;
  perfectResTol?: number;
  normalResTol?: number;
  
  // 敌人配置
  eSpeedPatrol?: number;
  eSpeedChase?: number;
  stunTime?: number;
  enemyMaxEnergy?: number;
  
  // 波纹配置
  waveSpeed?: number;
  waveMaxDist?: number;
  forcedWaveCost?: number;
  
  // 相机配置
  cameraFOV?: number;
  cameraFollowSpeed?: number;
  cameraSmoothing?: boolean;
  
  // 其他配置...
  [key: string]: unknown;
}

// 核心类型定义
export interface ICoreTypes {
  SCAVENGER: ICore;
  MIMIC: ICore;
  HEAVY: ICore;
}

// 指令接口
export interface IInstruction {
  id: number;
  text: string;
}
