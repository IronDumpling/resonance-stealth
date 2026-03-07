/**
 * 车辆物理计算
 * Vehicle Physics
 *
 * 档位、油门、刹车的速度更新公式。
 * - S 刹车：始终向 0 减速，不产生反向速度
 * - 松油门：缓慢滑行减速（COAST_DECEL）
 * - 踩刹车：快速减速（BRAKE_DECEL）
 */

export type VehicleGear = 'P' | 'R' | 'N' | 'D';

export interface VehiclePhysicsParams {
  maxSpeed: number;
  accel: number;
  coastDecel: number;
  brakeDecel: number;
  speedEpsilon: number;
}

export const DEFAULT_VEHICLE_PARAMS: VehiclePhysicsParams = {
  maxSpeed: 120,
  accel: 80,
  coastDecel: 0.4,
  brakeDecel: 4,
  speedEpsilon: 0.5,
};

/**
 * 计算下一帧速度
 *
 * @param currentSpeed 当前速度（正=前进，负=后退）
 * @param throttle 油门 0~1
 * @param brake 刹车 0~1
 * @param gear 档位
 * @param deltaTime 帧间隔（秒）
 * @param params 物理参数
 * @returns 新速度
 */
export function computeNextSpeed(
  currentSpeed: number,
  throttle: number,
  brake: number,
  gear: VehicleGear,
  deltaTime: number,
  params: VehiclePhysicsParams = DEFAULT_VEHICLE_PARAMS
): number {
  const { maxSpeed, accel, coastDecel, brakeDecel, speedEpsilon } = params;

  if (gear === 'P') {
    return 0;
  }

  if (gear === 'N') {
    // 空档：仅惯性滑行，缓慢减速
    const decay = Math.pow(1 - coastDecel * 0.01, deltaTime * 60);
    let next = currentSpeed * decay;
    if (Math.abs(next) < speedEpsilon) next = 0;
    return next;
  }

  // D/R 档
  const driveDir = gear === 'D' ? 1 : -1;

  if (brake > 0) {
    // 刹车：始终向 0 减速，不越过 0
    const decelAmount = brakeDecel * brake * deltaTime * 60; // 每帧减速量（约 60fps 归一化）
    if (currentSpeed > 0) {
      return Math.max(0, currentSpeed - decelAmount);
    }
    if (currentSpeed < 0) {
      return Math.min(0, currentSpeed + decelAmount);
    }
    return 0;
  }

  if (throttle > 0) {
    // 油门：向目标速度加速
    const targetSpeed = throttle * maxSpeed * driveDir;
    const accelFactor = Math.min(1, (accel / maxSpeed) * deltaTime);
    return currentSpeed + (targetSpeed - currentSpeed) * accelFactor;
  }

  // 松油门：缓慢滑行减速
  const decay = Math.pow(1 - coastDecel * 0.01, deltaTime * 60);
  let next = currentSpeed * decay;
  if (Math.abs(next) < speedEpsilon) next = 0;
  return next;
}
