/**
 * 场景基类
 * Scene Base Class
 * 
 * 保留结构，移除业务逻辑
 */

import { IScene, SceneType, SceneData } from '@/types/scenes';

export abstract class Scene implements IScene {
  name: SceneType;
  isActive: boolean = false;

  constructor(name: SceneType) {
    this.name = name;
  }

  /**
   * 场景进入时调用
   */
  enter(_data?: SceneData): void {
    this.isActive = true;
    // 空实现，保留方法签名
  }

  /**
   * 场景退出时调用
   */
  exit(): void {
    this.isActive = false;
    // 空实现，保留方法签名
  }

  /**
   * 每帧更新
   */
  update(_deltaTime: number): void {
    // 空实现，保留方法签名
  }

  /**
   * 渲染场景
   */
  render(_ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement): void {
    // 空实现，保留方法签名
  }

  /**
   * 处理输入
   */
  handleInput?(_event: unknown): void {
    // 空实现，保留方法签名
  }
}
