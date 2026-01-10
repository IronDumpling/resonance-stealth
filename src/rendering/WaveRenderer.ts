/**
 * 波纹渲染器
 * Wave Renderer
 * 
 * 独立的波纹渲染器，支持世界坐标和雷达坐标两种模式
 * 保留结构，移除业务逻辑
 */

export enum WaveRenderMode {
  WORLD = 'world',    // 世界坐标模式（用于TacticalRadarScene）
  RADAR = 'radar',    // 雷达坐标模式（用于WideRadarScene）
}

export class WaveRenderer {
  /**
   * 在世界坐标模式下渲染波纹
   * @param ctx Canvas 2D 上下文
   * @param waves 波纹数组
   */
  renderWorldMode(ctx: CanvasRenderingContext2D, waves: unknown[]): void {
    // 空实现，保留方法签名
  }

  /**
   * 在雷达坐标模式下渲染波纹
   * @param ctx Canvas 2D 上下文
   * @param waves 波纹数组
   * @param centerX 雷达中心X坐标
   * @param centerY 雷达中心Y坐标
   * @param scale 雷达缩放比例
   */
  renderRadarMode(
    ctx: CanvasRenderingContext2D,
    waves: unknown[],
    centerX: number,
    centerY: number,
    scale: number
  ): void {
    // 空实现，保留方法签名
  }

  /**
   * 通用渲染方法（根据模式选择）
   * @param ctx Canvas 2D 上下文
   * @param waves 波纹数组
   * @param mode 渲染模式
   * @param options 可选参数（雷达模式需要centerX, centerY, scale）
   */
  render(
    ctx: CanvasRenderingContext2D,
    waves: unknown[],
    mode: WaveRenderMode,
    options?: {
      centerX?: number;
      centerY?: number;
      scale?: number;
    }
  ): void {
    if (mode === WaveRenderMode.WORLD) {
      this.renderWorldMode(ctx, waves);
    } else if (mode === WaveRenderMode.RADAR) {
      const { centerX = 0, centerY = 0, scale = 50 } = options || {};
      this.renderRadarMode(ctx, waves, centerX, centerY, scale);
    }
  }
}
