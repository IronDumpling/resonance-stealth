/**
 * 启动场景
 * Boot Scene
 * 
 * React组件形式，保留结构，移除业务逻辑
 */

import React, { useEffect, useRef } from 'react';
import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';

export class BootScene extends Scene {
  bootTimer: number = 0;
  showPrompt: boolean = false;
  promptFadeIn: number = 0;

  constructor() {
    super(SCENES.BOOT);
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    this.bootTimer = 0;
    this.showPrompt = false;
    this.promptFadeIn = 0;
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

// React组件包装器
export const BootSceneComponent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BootScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 初始化场景
    if (!sceneRef.current) {
      sceneRef.current = new BootScene();
      sceneRef.current.enter({});
    }

    // 游戏循环（空实现）
    const gameLoop = () => {
      // 空实现
      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      sceneRef.current?.exit();
    };
  }, []);

  return <canvas ref={canvasRef} />;
};
