/**
 * CRT开启场景
 * CRT On Scene
 */

import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';

export class CrtOnScene extends Scene {
  constructor() {
    super(SCENES.CRT_ON);
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
}
