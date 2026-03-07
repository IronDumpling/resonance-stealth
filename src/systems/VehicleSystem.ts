/**
 * 车辆驾驶系统
 * Vehicle System
 *
 * 管理发动机、档位、转向、油门刹车。
 * engine on/off：后续会做持续释放的声波。
 * 碰撞时调用 SurvivalSystem 扣完整度。
 * 速度计算见 src/utils/vehiclePhysics.ts
 */

import type { IGameState, VehicleGear } from '@/types/game';
import type { IObstacle } from '@/types/entities';
import type { SurvivalSystem } from './SurvivalSystem';
import {
  computeNextSpeed,
  DEFAULT_VEHICLE_PARAMS,
  type VehicleGear as PhysicsGear,
} from '@/utils/vehiclePhysics';
import {
  STEERING_WHEEL_MAX_DEG,
  STEERING_WHEEL_RATE_DEG,
  STEERING_RATIO,
} from '@/config/gameConfig';

const MAX_SPEED = DEFAULT_VEHICLE_PARAMS.maxSpeed;
const PLAYER_RADIUS = 14;

export class VehicleSystem {
  survivalSystem: SurvivalSystem | null = null;
  collisionCooldown = 0;

  setSurvivalSystem(s: SurvivalSystem | null): void {
    this.survivalSystem = s;
  }

  /** 初始化车辆状态 */
  initVehicle(state: IGameState): void {
    state.vehicle = {
      gear: 'P',
      speed: 0,
      steeringAngle: 0,
      engineOn: false,
      throttle: 0,
      brake: 0,
    };
  }

  /** 更新驾驶逻辑 */
  update(state: IGameState, deltaTime: number): void {
    const v = state.vehicle;
    const p = state.p;
    const keys = state.keys;

    if (!v) return;

    // 熄火时：禁止油门、刹车、方向盘
    if (!v.engineOn) {
      v.throttle = 0;
      v.brake = 0;
      // 不更新 steeringAngle，保持当前值（或可归零）
    } else {
      // 燃油耗尽禁止移动
      if (this.survivalSystem?.isFuelEmpty(state)) {
        v.throttle = 0;
        v.brake = 1;
      } else {
        // 油门刹车输入（档位由 UI 档位杆控制，此处仅更新油门刹车值）
        v.throttle = keys.w ? 1 : 0;
        v.brake = keys.s ? 1 : 0;
      }

      // 转向：P 档锁死方向盘，其余档位可转动
      if (v.gear !== 'P') {
        const steerInput = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        v.steeringAngle += steerInput * STEERING_WHEEL_RATE_DEG * deltaTime;
        v.steeringAngle = Math.max(-STEERING_WHEEL_MAX_DEG, Math.min(STEERING_WHEEL_MAX_DEG, v.steeringAngle));
      }
    }

    // N 档：忽略油门刹车，仅惯性滑行
    const effectiveThrottle = v.gear === 'N' ? 0 : v.throttle;
    const effectiveBrake = v.gear === 'N' ? 0 : v.brake;

    // 速度更新（S 刹车始终向 0 减速；松油门缓慢滑行；踩刹车快速减速）
    v.speed = computeNextSpeed(
      v.speed,
      effectiveThrottle,
      effectiveBrake,
      v.gear as PhysicsGear,
      deltaTime
    );

    // 更新玩家位置与朝向（方向盘角度 → 前轮角 → 角速度）
    const moveDist = v.speed * deltaTime;
    if (Math.abs(moveDist) > 0.001) {
      const wheelAngleRad = (v.steeringAngle * Math.PI / 180) / STEERING_RATIO;
      p.a += wheelAngleRad * Math.abs(v.speed) / MAX_SPEED * deltaTime;
      const dx = Math.sin(p.a) * moveDist;
      const dy = -Math.cos(p.a) * moveDist;

      const prevX = p.x;
      const prevY = p.y;
      p.x += dx;
      p.y += dy;

      // 碰撞检测
      const hit = this.checkCollision(state);
      if (hit) {
        p.x = prevX;
        p.y = prevY;
        v.speed *= -0.3; // 反弹
        if (this.collisionCooldown <= 0 && this.survivalSystem) {
          this.survivalSystem.applyCollisionDamage(state, Math.abs(v.speed));
          this.collisionCooldown = 0.5;
        }
      }
    }

    if (this.collisionCooldown > 0) {
      this.collisionCooldown -= deltaTime;
    }
  }

  private checkCollision(state: IGameState): boolean {
    const p = state.p;
    const obstacles = state.entities.obstacles as IObstacle[];
    for (const obs of obstacles) {
      if (this.circleRectOverlap(p.x, p.y, PLAYER_RADIUS, obs.x, obs.y, obs.width, obs.height)) {
        return true;
      }
    }
    // 检查敌人（怪物：不会移动，碰到扣完整度）
    for (const e of state.entities.enemies) {
      if (this.circleRectOverlap(p.x, p.y, PLAYER_RADIUS, e.x - 15, e.y - 15, 30, 30)) {
        return true;
      }
    }
    return false;
  }

  private circleRectOverlap(
    cx: number, cy: number, cr: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= cr * cr;
  }

  getSpeed(state: IGameState): number {
    return state.vehicle?.speed ?? 0;
  }

  getGear(state: IGameState): VehicleGear {
    return state.vehicle?.gear ?? 'P';
  }

  /** 设置档位（由 UI 档位杆调用） */
  setGear(state: IGameState, gear: VehicleGear): void {
    if (state.vehicle) {
      state.vehicle.gear = gear;
    }
  }
}
