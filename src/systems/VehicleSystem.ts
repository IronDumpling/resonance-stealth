/**
 * 车辆驾驶系统
 * Vehicle System
 *
 * 管理发动机、档位、转向、油门刹车。
 * engine on/off：后续会做持续释放的声波。
 * 碰撞时调用 SurvivalSystem 扣完整度。
 */

import type { IGameState, VehicleGear } from '@/types/game';
import type { IObstacle } from '@/types/entities';
import type { SurvivalSystem } from './SurvivalSystem';

const MAX_SPEED = 120;
const ACCEL = 80;
const FRICTION = 2;
const STEER_RATE = 2.5;
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

    // 发动机：进入 Drive 时默认开启（后续可加点火键）
    if (!v.engineOn) v.engineOn = true;

    // 燃油耗尽禁止移动
    if (this.survivalSystem?.isFuelEmpty(state)) {
      v.throttle = 0;
      v.brake = 1;
    }

    // 油门刹车输入
    v.throttle = keys.w ? 1 : 0;
    v.brake = keys.s ? 1 : 0;

    // 档位切换（简化：仅用数字键）
    if (keys.e) v.gear = 'D';
    if (keys.r) v.gear = 'R';
    if (keys.f) v.gear = 'P';

    // 转向
    const steerInput = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    v.steeringAngle += steerInput * STEER_RATE * deltaTime;
    v.steeringAngle = Math.max(-0.5, Math.min(0.5, v.steeringAngle));

    // P/N 档：减速至停
    if (v.gear === 'P' || v.gear === 'N') {
      v.speed *= Math.pow(0.95, deltaTime * 60);
      if (Math.abs(v.speed) < 1) v.speed = 0;
    } else {
      // D/R 档：加速/减速
      const driveDir = v.gear === 'D' ? 1 : -1;
      const targetSpeed = (v.throttle - v.brake) * MAX_SPEED * driveDir;
      v.speed += (targetSpeed - v.speed) * Math.min(1, ACCEL * deltaTime / MAX_SPEED);
      v.speed *= Math.pow(1 - FRICTION * 0.01, deltaTime * 60);
    }

    // 更新玩家位置与朝向
    const moveDist = v.speed * deltaTime;
    if (Math.abs(moveDist) > 0.001) {
      p.a += v.steeringAngle * Math.abs(v.speed) / MAX_SPEED * deltaTime;
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
          this.survivalSystem.applyCollisionDamage(state);
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
}
