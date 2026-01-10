/**
 * 监视器菜单场景
 * Monitor Menu Scene
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';

export class MonitorMenuScene extends Scene {
  constructor() {
    super(SCENES.MONITOR_MENU);
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
