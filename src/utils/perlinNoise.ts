/**
 * 简化的 Perlin 风格噪声，用于引擎震动等平滑随机位移
 * Simplified Perlin-like noise for smooth organic camera shake
 */

/** 置换表（256 个随机排列的索引） */
const PERM = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
];

function perm(i: number): number {
  return PERM[i & 255];
}

/** 平滑插值 (5t^4 - 6t^3 + 1) */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/** 梯度函数 */
function grad(hash: number, x: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : 0;
  return (h & 1) === 0 ? u : -u;
}

/**
 * 1D Perlin 噪声，返回值约在 [-1, 1]
 * @param x 输入坐标（建议用时间 * 频率）
 */
export function perlin1D(x: number): number {
  const X = Math.floor(x) & 255;
  x -= Math.floor(x);
  const u = fade(x);
  const a = grad(perm(X), x);
  const b = grad(perm(X + 1), x - 1);
  return lerp(a, b, u);
}

/**
 * 获取引擎震动偏移量（用于 page camera）
 * 使用 1D Perlin 配合不同相位，产生平滑有机的 x/y 位移
 * @param time 累计时间（秒）
 * @param amplitude 振幅（像素）
 */
export function getEngineVibration(time: number, amplitude: number): { x: number; y: number } {
  const freq = 6;
  const x = perlin1D(time * freq) * amplitude;
  const y = perlin1D(time * freq + 127.3) * amplitude;
  return { x, y };
}
