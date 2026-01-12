/**
 * 粒子系统工具函数
 * Particle System Utilities
 */

/**
 * 粒子接口
 */
export interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
  s: number;
}

/**
 * 生成粒子
 */
export function spawnParticles(
  x: number,
  y: number,
  c: string,
  n: number,
  particles: IParticle[]
): void {
  for (let i = 0; i < n; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 1,
      c,
      s: Math.random() * 3
    });
  }
}
