/**
 * 玩家实体
 * Player Entity
 * 
 * 保留结构，移除业务逻辑
 */

import { BaseEntity } from './Base';
import { IPlayer, ICore, IItem, IHotCore, IEnemy} from '@/types/entities';
import { CORE_TYPES } from '@/config/gameConfig';

export class Player extends BaseEntity implements IPlayer {
  a: number = 0; // 角度
  en: number = 0; // 能量
  invuln: number = 0; // 无敌时间
  isGrabbed: boolean = false;
  grabberEnemy: IEnemy | null = null;
  struggleProgress: number = 0;
  grabImmunity: number = 0;
  grabHintElement: HTMLElement | null = null;
  resonanceCD: number = 0; // 共振冷却时间
  
  // 背包系统
  inventory: (IItem | null)[] = [];
  isCharging: boolean = false;
  chargeStartTime: number = 0;
  grabParticleTimer: number = 0;
  shouldShowAimLine: boolean = false;
  overload: number = 0;
  isGrabbingEnemy: IEnemy | null = null;
  aimLineHit: unknown = null;
  overloadedStunTimer: number = 0; // 过载硬直计时器
  
  // 核心系统
  currentCore: ICore;
  durability: number = 0;
  isDormant: boolean = false;
  isDestroyed: boolean = false;

  constructor(x: number = 0, y: number = 0, core?: ICore) {
    super(x, y);
    // 初始化核心（默认使用拾荒者核心）
    this.currentCore = core || CORE_TYPES.SCAVENGER;
  }

  /**
   * 获取装备的核心（从inventory[0]读取）
   */
  getEquippedCore(): ICore | null {
    const firstItem = this.inventory[0];
    if (firstItem && firstItem.type === 'core_hot') {
      const hotCore = firstItem as IHotCore;
      return hotCore.coreData || null;
    }
    return null;
  }

  /**
   * 获取能量上限（从装备核心读取）
   */
  getMaxEnergy(): number {
    const core = this.getEquippedCore();
    if (core) {
      return core.maxEnergy;
    }
    // 如果没有装备核心，返回默认值（拾荒者核心的值）
    return CORE_TYPES.SCAVENGER.maxEnergy;
  }

  /**
   * 获取能量消耗速率（从装备核心读取）
   */
  getEnergyDecayRate(): number {
    const core = this.getEquippedCore();
    if (core) {
      return core.energyDecayRate;
    }
    return CORE_TYPES.SCAVENGER.energyDecayRate;
  }

  /**
   * 获取过载上限（从装备核心读取）
   */
  getMaxOverload(): number {
    const core = this.getEquippedCore();
    if (core) {
      return core.maxOverload;
    }
    return CORE_TYPES.SCAVENGER.maxOverload;
  }

  /**
   * 获取过载衰减速率（从装备核心读取）
   */
  getOverloadDecayRate(): number {
    const core = this.getEquippedCore();
    if (core) {
      return core.overloadDecayRate;
    }
    return CORE_TYPES.SCAVENGER.overloadDecayRate;
  }

  /**
   * 获取过载增长速率（从装备核心读取，如果有）
   */
  getOverloadGainRate(): number {
    const core = this.getEquippedCore();
    if (core && core.overloadGainRate !== undefined) {
      return core.overloadGainRate;
    }
    // 默认值（如果没有定义）
    return 1.0;
  }

  override init(): void {
    // 空实现，保留方法签名
  }

  override update(_deltaTime: number): void {
    // 空实现，保留方法签名
  }

  override render(_ctx: CanvasRenderingContext2D): void {
    // 空实现，保留方法签名
  }
}
