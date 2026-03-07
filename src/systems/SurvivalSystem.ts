/**
 * 生存系统
 * Survival System
 *
 * 管理生命/完整度/燃油/电量，驾驶消耗燃油，声纳 ping 消耗电量，
 * 碰撞扣完整度，完整度归零后扣生命。
 */

import type { IGameState, ISurvivalState } from '@/types/game';

export interface SurvivalConfig {
  maxLife: number;
  maxIntegrity: number;
  maxFuel: number;
  maxBattery: number;
  fuelConsumePerSecond: number;   // 驾驶时每秒消耗
  batteryConsumePerPing: number;  // 每次 ping 消耗
  integrityLossPerCollision: number;
  lifeLossPerCollision: number;   // 完整度归零后的碰撞扣生命
}

export interface SurvivalCallbacks {
  /** 碰撞扣完整度时触发（用于 edge glow 蓝光） */
  onIntegrityHit?: () => void;
  /** 碰撞扣生命时触发（用于 edge glow 红光） */
  onLifeHit?: () => void;
}

const DEFAULT_CONFIG: SurvivalConfig = {
  maxLife: 100,
  maxIntegrity: 100,
  maxFuel: 100,
  maxBattery: 100,
  fuelConsumePerSecond: 2,
  batteryConsumePerPing: 5,
  integrityLossPerCollision: 10,
  lifeLossPerCollision: 15,
};

export class SurvivalSystem {
  config: SurvivalConfig;
  callbacks: SurvivalCallbacks;

  constructor(config: Partial<SurvivalConfig> = {}, callbacks: SurvivalCallbacks = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /** 初始化生存状态 */
  initSurvival(state: IGameState): void {
    state.survival = {
      life: this.config.maxLife,
      integrity: this.config.maxIntegrity,
      armorDropped: false,
      fuel: this.config.maxFuel,
      battery: this.config.maxBattery,
    };
  }

  /** 驾驶消耗燃油（每秒调用） */
  consumeFuelForDriving(state: IGameState, deltaTime: number, isMoving: boolean): void {
    const s = state.survival;
    if (!s || !isMoving) return;
    s.fuel = Math.max(0, s.fuel - this.config.fuelConsumePerSecond * deltaTime);
  }

  /** 声纳 ping 消耗电量 */
  consumeBatteryForPing(state: IGameState): boolean {
    const s = state.survival;
    if (!s) return false;
    if (s.battery < this.config.batteryConsumePerPing) return false;
    s.battery = Math.max(0, s.battery - this.config.batteryConsumePerPing);
    return true;
  }

  /** 碰撞扣完整度/生命，speed 越大扣得越多 */
  applyCollisionDamage(state: IGameState, speed: number = 0): void {
    const s = state.survival;
    if (!s) return;
    const speedFactor = Math.min(2, Math.max(0.5, Math.abs(speed) / 60 + 0.5));
    const integrityLoss = Math.ceil(this.config.integrityLossPerCollision * speedFactor);
    const lifeLoss = Math.ceil(this.config.lifeLossPerCollision * speedFactor);
    if (s.integrity > 0) {
      s.integrity = Math.max(0, s.integrity - integrityLoss);
      this.callbacks.onIntegrityHit?.();
      if (s.integrity <= 0) {
        s.armorDropped = true;
      }
    } else {
      s.life = Math.max(0, s.life - lifeLoss);
      this.callbacks.onLifeHit?.();
    }
  }

  /** 燃油是否耗尽（禁止移动） */
  isFuelEmpty(state: IGameState): boolean {
    const s = state.survival;
    return !s || s.fuel <= 0;
  }

  /** 电量是否耗尽（禁止 ping） */
  isBatteryEmpty(state: IGameState): boolean {
    const s = state.survival;
    return !s || s.battery < this.config.batteryConsumePerPing;
  }

  /** 是否存活 */
  isAlive(state: IGameState): boolean {
    const s = state.survival;
    return !!s && s.life > 0;
  }

  /** 获取生存状态（用于 UI） */
  getState(state: IGameState): ISurvivalState | null {
    return state.survival ?? null;
  }
}
