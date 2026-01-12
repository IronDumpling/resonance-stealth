/**
 * CRT渲染器（原CrtDisplay）
 * CRT Renderer (formerly CrtDisplay)
 */

import React, { useEffect, useRef } from 'react';

interface CrtEffects {
  scanlines: boolean;
  curvature: boolean;
  vignette: boolean;
  flicker: boolean;
  jitter: boolean;
  noise: boolean;
  scanlineIntensity: number;
  curvatureAmount: number;
  vignetteStrength: number;
  flickerAmount: number;
  jitterAmount: number;
  noiseAmount: number;
}

type TransitionType = 'power_on' | 'power_off' | null;

export class CrtRenderer {
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  isPoweredOn: boolean = false;
  powerTransitionProgress: number = 0;
  isTransitioning: boolean = false;
  transitionType: TransitionType = null;
  powerTransitionDuration: number = 1.2; // 开机动画时长(秒)
  
  // CRT效果参数
  effects: CrtEffects = {
    scanlines: true,
    curvature: true,
    vignette: true,
    flicker: true,
    jitter: true,
    noise: false, // 默认关闭噪点(仅在无信号时开启)
    
    // 效果强度
    scanlineIntensity: 0.15,
    curvatureAmount: 0.05,
    vignetteStrength: 0.3,
    flickerAmount: 0.02,
    jitterAmount: 0.5,
    noiseAmount: 0.1
  };
  
  // 离屏canvas用于后处理
  offscreenCanvas: HTMLCanvasElement | null = null;
  offscreenCtx: CanvasRenderingContext2D | null = null;
  
  // 动画计时器
  time: number = 0;

  constructor(canvas: HTMLCanvasElement | null = null, ctx: CanvasRenderingContext2D | null = null) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // 创建离屏canvas
    if (canvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      if (this.offscreenCanvas && this.offscreenCtx) {
        this.offscreenCanvas.width = canvas.width;
        this.offscreenCanvas.height = canvas.height;
      }
    }
  }

  /**
   * 调整画布大小
   */
  resize(width: number, height: number): void {
    if (!this.canvas || !this.offscreenCanvas) return;
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
  }

  /**
   * 更新CRT效果
   */
  update(deltaTime: number): void {
    this.time += deltaTime;
    
    // 更新开关机动画
    if (this.isTransitioning) {
      this.powerTransitionProgress += deltaTime / this.powerTransitionDuration;
      
      if (this.powerTransitionProgress >= 1.0) {
        this.powerTransitionProgress = 1.0;
        this.isTransitioning = false;
        
        if (this.transitionType === 'power_on') {
          this.isPoweredOn = true;
        } else if (this.transitionType === 'power_off') {
          this.isPoweredOn = false;
        }
        
        this.transitionType = null;
      }
    }
  }

  /**
   * 开机
   */
  powerOn(): void {
    if (this.isPoweredOn || this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.transitionType = 'power_on';
    this.powerTransitionProgress = 0;
    
    console.log('CRT powering on...');
  }

  /**
   * 关机
   */
  powerOff(): void {
    if (!this.isPoweredOn || this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.transitionType = 'power_off';
    this.powerTransitionProgress = 0;
    
    console.log('CRT powering off...');
  }

  /**
   * 扫描线效果
   */
  private applyScanlines(data: Uint8ClampedArray, width: number, height: number): void {
    const intensity = this.effects.scanlineIntensity;
    
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        data[index] *= (1 - intensity);     // R
        data[index + 1] *= (1 - intensity); // G
        data[index + 2] *= (1 - intensity); // B
      }
    }
  }

  /**
   * 闪烁效果
   */
  private applyFlicker(data: Uint8ClampedArray): void {
    const flicker = Math.sin(this.time * 60) * this.effects.flickerAmount;
    const factor = 1 + flicker;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] *= factor;
      data[i + 1] *= factor;
      data[i + 2] *= factor;
    }
  }

  /**
   * 曲率叠加(简化版)
   */
  private applyCurvatureOverlay(): void {
    if (!this.canvas || !this.ctx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const amount = this.effects.curvatureAmount;
    
    // 绘制边缘暗化
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.min(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${amount})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  /**
   * 晕影效果
   */
  private applyVignette(): void {
    if (!this.canvas || !this.ctx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${this.effects.vignetteStrength})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  /**
   * 噪点效果
   */
  private applyNoise(): void {
    if (!this.canvas || !this.ctx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const noiseAmount = this.effects.noiseAmount;
    
    // 创建噪点图像数据
    const imageData = this.ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 255 * noiseAmount;
      data[i] = noise;
      data[i + 1] = noise;
      data[i + 2] = noise;
      data[i + 3] = 255;
    }
    
    this.ctx.globalAlpha = noiseAmount;
    this.ctx.putImageData(imageData, 0, 0);
    this.ctx.globalAlpha = 1;
  }

  /**
   * 应用CRT后处理效果
   */
  private applyEffects(sourceCanvas: HTMLCanvasElement): void {
    if (!this.canvas || !this.ctx || !this.offscreenCanvas || !this.offscreenCtx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 确保离屏canvas尺寸与主canvas匹配
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
    
    // 1. 将源内容复制到离屏canvas
    this.offscreenCtx.clearRect(0, 0, width, height);
    this.offscreenCtx.drawImage(sourceCanvas || this.canvas, 0, 0);
    
    // 2. 获取图像数据
    const imageData = this.offscreenCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 3. 应用扫描线效果
    if (this.effects.scanlines) {
      this.applyScanlines(data, width, height);
    }
    
    // 4. 应用闪烁效果
    if (this.effects.flicker) {
      this.applyFlicker(data);
    }
    
    // 5. 写回
    this.offscreenCtx.putImageData(imageData, 0, 0);
    
    // 6. 清空主canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);
    
    // 7. 应用抖动
    let offsetX = 0, offsetY = 0;
    if (this.effects.jitter) {
      offsetX = (Math.random() - 0.5) * this.effects.jitterAmount;
      offsetY = (Math.random() - 0.5) * this.effects.jitterAmount;
    }
    
    // 8. 绘制处理后的图像
    this.ctx.drawImage(this.offscreenCanvas, offsetX, offsetY);
    
    // 9. 应用曲率效果(简化版，仅边缘暗化)
    if (this.effects.curvature) {
      this.applyCurvatureOverlay();
    }
    
    // 10. 应用晕影效果
    if (this.effects.vignette) {
      this.applyVignette();
    }
    
    // 11. 应用噪点(无信号时)
    if (this.effects.noise) {
      this.applyNoise();
    }
  }

  /**
   * 渲染开机动画
   */
  private renderPowerOnAnimation(): void {
    if (!this.canvas || !this.ctx) return;
    
    const progress = this.powerTransitionProgress;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);
    
    // 阶段1: 中心绿点闪现 (0-0.1s)
    if (progress < 0.083) {
      const dotProgress = progress / 0.083;
      const dotSize = 3 * dotProgress;
      const brightness = dotProgress;
      
      this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, dotSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
    // 阶段2: 垂直拉伸 (0.1-0.4s)
    else if (progress < 0.333) {
      const lineProgress = (progress - 0.083) / 0.25;
      const lineHeight = height * lineProgress;
      const lineWidth = 2;
      
      this.ctx.fillStyle = '#00cc00';
      this.ctx.fillRect(centerX - lineWidth / 2, centerY - lineHeight / 2, lineWidth, lineHeight);
    }
    // 阶段3: 水平展开 (0.4-0.9s)
    else if (progress < 0.75) {
      const expandProgress = (progress - 0.333) / 0.417;
      
      // 使用easeOut让展开更自然
      const eased = 1 - Math.pow(1 - expandProgress, 3);
      const finalWidth = width * eased;
      const rectHeight = height;
      
      this.ctx.fillStyle = '#00cc00';
      this.ctx.fillRect(centerX - finalWidth / 2, 0, finalWidth, rectHeight);
    }
    // 阶段4: 亮度稳定 (0.9-1.2s)
    else {
      const fadeProgress = (progress - 0.75) / 0.25;
      const brightness = 1 - fadeProgress * 0.2; // 从100%降到80%
      
      this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
      this.ctx.fillRect(0, 0, width, height);
      
      // 抖动效果
      if (fadeProgress < 0.8) {
        const shake = Math.sin(fadeProgress * 30) * (1 - fadeProgress) * 5;
        this.ctx.translate(shake, 0);
      }
    }
  }

  /**
   * 渲染关机动画
   */
  private renderPowerOffAnimation(): void {
    if (!this.canvas || !this.ctx) return;
    
    const progress = this.powerTransitionProgress;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 反向播放开机动画
    
    // 阶段1: 画面闪烁 (0-0.2s)
    if (progress < 0.2) {
      const flicker = Math.sin(progress * 50);
      const brightness = 0.5 + flicker * 0.5;
      
      this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
      this.ctx.fillRect(0, 0, width, height);
    }
    // 阶段2: 水平收缩 (0.2-0.4s)
    else if (progress < 0.4) {
      const shrinkProgress = (progress - 0.2) / 0.2;
      const rectWidth = width * (1 - shrinkProgress);
      
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, width, height);
      
      this.ctx.fillStyle = '#00cc00';
      this.ctx.fillRect(centerX - rectWidth / 2, 0, rectWidth, height);
    }
    // 阶段3: 垂直收缩 (0.4-0.6s)
    else if (progress < 0.6) {
      const shrinkProgress = (progress - 0.4) / 0.2;
      const lineHeight = height * (1 - shrinkProgress);
      const lineWidth = 2;
      
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, width, height);
      
      this.ctx.fillStyle = '#00cc00';
      this.ctx.fillRect(centerX - lineWidth / 2, centerY - lineHeight / 2, lineWidth, lineHeight);
    }
    // 阶段4: 绿点消失 (0.6-1.0s)
    else {
      const dotProgress = (progress - 0.6) / 0.4;
      const dotSize = 3 * (1 - dotProgress);
      const brightness = 1 - dotProgress;
      
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, width, height);
      
      if (dotSize > 0) {
        this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, dotSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * 渲染CRT效果
   */
  render(renderCallback?: () => void | ((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void)): void {
    if (!this.canvas || !this.ctx) return;
    
    // 处理开关机动画
    if (this.isTransitioning) {
      if (this.transitionType === 'power_on') {
        this.renderPowerOnAnimation();
      } else if (this.transitionType === 'power_off') {
        this.renderPowerOffAnimation();
      }
      return;
    }
    
    // 如果未开机，仍然允许场景渲染（如Boot场景），但不应用CRT效果
    if (!this.isPoweredOn) {
      // 先绘制黑色背景
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // 仍然调用场景渲染（允许Boot场景等显示内容）
      if (renderCallback) {
        if (typeof renderCallback === 'function') {
          // 检查回调函数参数数量
          if (renderCallback.length === 0) {
            // 无参数回调（App.tsx中的调用方式）
            renderCallback();
          } else {
            // 有参数回调（原始代码的调用方式）
            (renderCallback as (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void)(this.ctx, this.canvas);
          }
        }
      }
      return;
    }
    
    // 调用渲染回调（场景渲染）
    if (renderCallback) {
      if (typeof renderCallback === 'function') {
        // 检查回调函数参数数量
        if (renderCallback.length === 0) {
          // 无参数回调（App.tsx中的调用方式）
          // 先清空canvas，确保场景内容能正确渲染
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          renderCallback();
        } else {
          // 有参数回调（原始代码的调用方式）
          (renderCallback as (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void)(this.ctx, this.canvas);
        }
      }
    }
    
    // 应用CRT效果
    // 注意：这里需要场景内容已经渲染到canvas上
    // 如果需要后处理，应该在场景渲染到离屏canvas后再处理
    // 目前简化实现，直接在主canvas上应用效果
    if (this.isPoweredOn && this.canvas) {
      this.applyEffects(this.canvas);
    }
  }

  /**
   * 启用/禁用效果
   */
  toggleEffect(effectName: keyof CrtEffects, enabled: boolean): void {
    if (effectName in this.effects) {
      (this.effects[effectName] as boolean) = enabled;
    }
  }
}

// React组件包装器
export const CrtRendererComponent: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CrtRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new CrtRenderer(canvas, ctx);

    // 游戏循环（空实现）
    const gameLoop = () => {
      if (rendererRef.current) {
        rendererRef.current.update(0.016);
        rendererRef.current.render();
      }
      requestAnimationFrame(gameLoop);
    };

    gameLoop();
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} />
      {children}
    </div>
  );
};
