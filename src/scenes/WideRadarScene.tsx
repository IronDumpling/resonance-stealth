/**
 * 广域雷达场景（原RadioScene的radar map部分）
 * Wide Radar Scene (radar map part of former RadioScene)
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';

export class WideRadarScene extends Scene {
  constructor() {
    super(SCENES.WIDE_RADAR);
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    // 空实现，保留方法签名
  }

  override update(_deltaTime: number): void {
    // 空实现，保留方法签名
  }

  override render(_ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement): void {
    // 空实现，保留方法签名
  }

  override handleInput(_event: unknown): void {
    // 空实现，保留方法签名
  }
}
