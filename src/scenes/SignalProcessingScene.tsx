/**
 * 信号处理场景（原RadioScene的morse code + signal record + signal editing）
 * Signal Processing Scene (morse code + signal record + signal editing part of former RadioScene)
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';

export class SignalProcessingScene extends Scene {
  constructor() {
    super(SCENES.SIGNAL_PROCESSING);
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
