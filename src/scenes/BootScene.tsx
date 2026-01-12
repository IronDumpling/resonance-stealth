/**
 * 启动场景
 * Boot Scene
 */

import React, { useEffect, useRef } from 'react';
import { Scene } from './Scene';
import { SCENES, SceneData } from '@/types/scenes';
import { InputManager } from '@/systems/InputManager';
import { SceneManager } from '@/systems/SceneManager';
import { CrtRenderer } from '@/rendering/CrtRenderer';
import { INPUT_CONTEXTS } from '@/types/systems';

export class BootScene extends Scene {
  bootTimer: number = 0;
  showPrompt: boolean = false;
  promptFadeIn: number = 0;
  
  // 依赖注入
  inputManager: InputManager | null = null;
  sceneManager: SceneManager | null = null;
  crtRenderer: CrtRenderer | null = null;

  constructor(
    inputManager?: InputManager,
    sceneManager?: SceneManager,
    crtRenderer?: CrtRenderer
  ) {
    super(SCENES.BOOT);
    this.inputManager = inputManager || null;
    this.sceneManager = sceneManager || null;
    this.crtRenderer = crtRenderer || null;
  }

  override enter(data?: SceneData): void {
    super.enter(data);
    this.bootTimer = 0;
    this.showPrompt = false;
    this.promptFadeIn = 0;
    
    // 设置输入上下文为CRT_CONTROL
    if (this.inputManager) {
      this.inputManager.setContext(INPUT_CONTEXTS.CRT_CONTROL);
    }
    
    // 注意：无线电系统和UI的初始化应该在App.tsx或GameContext中处理
    // 这里不直接初始化，避免循环依赖
  }

  override update(deltaTime: number): void {
    this.bootTimer += deltaTime;
    
    // 2秒后显示按键提示
    if (this.bootTimer >= 2.0) {
      this.showPrompt = true;
      this.promptFadeIn = Math.min(1, this.promptFadeIn + deltaTime * 2);
    }
  }

  override render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // 黑色背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 显示启动文字
    const alpha = Math.min(1, this.bootTimer * 0.8);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#33ccff';
    ctx.font = 'bold 32px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RESONANCE', canvas.width / 2, canvas.height / 2 - 60);
    ctx.font = '16px "Courier New"';
    ctx.fillText('v0.2', canvas.width / 2, canvas.height / 2 - 20);
    ctx.globalAlpha = 1;
    
    // 显示按键提示（闪烁效果）
    if (this.showPrompt) {
      const blink = Math.sin(this.bootTimer * 3) * 0.5 + 0.5;
      ctx.globalAlpha = this.promptFadeIn * blink;
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 20px "Courier New"';
      ctx.fillText('PRESS [ENTER] TO INITIALIZE', canvas.width / 2, canvas.height / 2 + 40);
      ctx.globalAlpha = 1;
    }
  }

  override handleInput(event: unknown): boolean {
    const inputEvent = event as { key?: string; action?: string; originalEvent?: KeyboardEvent };
    const key = (inputEvent.key || (inputEvent.originalEvent && inputEvent.originalEvent.key) || '').toLowerCase();
    const action = inputEvent.action;
    
    // 只有在提示显示后才能按Enter
    if (this.showPrompt && (action === 'confirm' || key === 'enter')) {
      // 触发CRT开机动画
      if (this.crtRenderer) {
        this.crtRenderer.powerOn();
      }
      // 等待一小段时间让开机动画开始，然后切换场景
      setTimeout(() => {
        if (this.sceneManager) {
          this.sceneManager.switchScene(SCENES.CRT_ON, 'fade');
        }
      }, 100);
      return true;
    }
    return false;
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
