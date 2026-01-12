/**
 * 无线电控制面板渲染器
 * Radio Control Panel Renderer
 * 
 * 负责渲染无线电控制面板中的 Canvas 元素：
 * - 瀑布图（频谱、敌人频率条纹、波纹接触频率条纹）
 * - 罗盘（天线方向指示器）
 * - 信号表（信号强度表盘）
 */

import { CFG } from '@/config/gameConfig';

// 扩展 IRadioSystem 以包含渲染需要的属性和方法
export interface RadioSystemForRendering {
  waterfallHistory: number[][];
  enemyFreqHistory: (number | null)[];
  waveContactHistory: Array<Array<{
    freq: number;
    source: string;
    isReflected?: boolean;
  }>>;
  antennaAngle: number;
  frequencyToIndex(freq: number, width: number): number;
}

export interface SignalForRendering {
  receivedStrength: number;
}

export class RadioControlRenderer {
  /**
   * 渲染瀑布图
   * @param ctx Canvas 2D 上下文
   * @param canvas Canvas 元素
   * @param radio 无线电系统数据
   */
  renderWaterfall(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    radio: RadioSystemForRendering
  ): void {
    const history = radio.waterfallHistory;
    
    if (history.length === 0) return;
    
    const rowHeight = canvas.height / Math.min(history.length, 50);
    const colWidth = canvas.width / history[0].length;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制频谱瀑布图
    for (let row = 0; row < Math.min(history.length, 50); row++) {
      const spectrum = history[row];
      for (let col = 0; col < spectrum.length; col++) {
        const intensity = spectrum[col];
        
        // 绿色渐变
        let color: string;
        if (intensity < 0.2) {
          color = `rgb(0, ${Math.floor(intensity * 255)}, 0)`;
        } else if (intensity < 0.6) {
          const t = (intensity - 0.2) / 0.4;
          color = `rgb(${Math.floor(t * 200)}, ${Math.floor(50 + t * 155)}, 0)`;
        } else {
          const t = (intensity - 0.6) / 0.4;
          color = `rgb(${Math.floor(200 + t * 55)}, ${Math.floor(205 + t * 50)}, ${Math.floor(t * 100)})`;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(
          col * colWidth,
          row * rowHeight,
          Math.ceil(colWidth),
          Math.ceil(rowHeight)
        );
      }
    }
    
    // 绘制敌人分析频率条纹历史（橙色，宽度为共振范围）
    const enemyHistory = radio.enemyFreqHistory || [];
    const resonanceRange = CFG.normalResTol || 5; // 使用配置的普通共振容差
    
    if (enemyHistory.length > 0) {
      // 使用混合模式让橙色条纹叠加在瀑布图上
      ctx.globalCompositeOperation = 'lighter';
      
      const displayRows = Math.min(history.length, 50);
      const rowHeight2 = canvas.height / displayRows;
      
      // 遍历每一行历史记录
      for (let row = 0; row < Math.min(enemyHistory.length, displayRows); row++) {
        const enemyFreq = enemyHistory[row];
        
        // 如果该行有敌人频率（不是 null），则绘制橙色条纹
        if (enemyFreq !== null && enemyFreq !== undefined) {
          const freqMin = enemyFreq - resonanceRange;
          const freqMax = enemyFreq + resonanceRange;
          
          const xStart = radio.frequencyToIndex(freqMin, canvas.width);
          const xEnd = radio.frequencyToIndex(freqMax, canvas.width);
          const width = xEnd - xStart;
          
          // 绘制橙色条纹
          for (let x = xStart; x < xEnd; x++) {
            const distFromCenter = Math.abs(x - (xStart + width / 2)) / (width / 2);
            const alpha = 0.5 + (1 - distFromCenter) * 0.3; // 中心更亮
            
            ctx.fillStyle = `rgba(255, 153, 0, ${alpha})`;
            ctx.fillRect(
              x,
              row * rowHeight2,
              1,
              Math.ceil(rowHeight2)
            );
          }
          
          // 在第一行（最新的）添加标签
          if (row === 0) {
            const xCenter = radio.frequencyToIndex(enemyFreq, canvas.width);
            
            // 画中心标记线
            ctx.strokeStyle = '#ff9900';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xCenter, 0);
            ctx.lineTo(xCenter, rowHeight2);
            ctx.stroke();
            
            // 添加标签
            ctx.fillStyle = '#ff9900';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3;
            ctx.fillText('TARGET', xCenter, 12);
            ctx.shadowBlur = 0;
          }
        }
      }
      
      // 恢复混合模式
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // 绘制波纹接触频率条纹历史
    const waveHistory = radio.waveContactHistory || [];
    const waveResonanceRange = CFG.normalResTol || 5; // 使用配置的普通共振容差
    
    if (waveHistory.length > 0) {
      ctx.globalCompositeOperation = 'lighter';
      
      const displayRows = Math.min(history.length, 50);
      const rowHeight3 = canvas.height / displayRows;
      
      // 遍历每一行历史记录
      for (let row = 0; row < Math.min(waveHistory.length, displayRows); row++) {
        const waveFreqs = waveHistory[row]; // 数组，可能包含多个波纹
        
        if (!waveFreqs || waveFreqs.length === 0) continue;
        
        // 绘制每个波纹的条纹
        for (const wave of waveFreqs) {
          const freq = wave.freq;
          const source = wave.source;
          const isReflected = wave.isReflected || false;
          
          // 根据来源选择颜色
          let baseColor: [number, number, number];
          if (isReflected || source === 'reflection') {
            baseColor = [0, 255, 0];  // 反弹波：绿色
          } else if (source === 'player') {
            baseColor = [0, 255, 255];  // 玩家波：青色
          } else if (source === 'enemy') {
            baseColor = [255, 100, 100];  // 敌人波：红色
          } else if (source === 'pulse') {
            baseColor = [255, 255, 0];  // 脉冲波：黄色
          } else if (source === 'signal') {
            baseColor = [255, 255, 0];  // 信号源波：黄色
          } else {
            baseColor = [255, 153, 0];  // 其他：橙色（兼容旧系统）
          }
          
          const freqMin = freq - waveResonanceRange;
          const freqMax = freq + waveResonanceRange;
          
          const xStart = radio.frequencyToIndex(freqMin, canvas.width);
          const xEnd = radio.frequencyToIndex(freqMax, canvas.width);
          const width = xEnd - xStart;
          
          // 绘制条纹
          for (let x = xStart; x < xEnd; x++) {
            const distFromCenter = Math.abs(x - (xStart + width / 2)) / (width / 2);
            const alpha = 0.4 + (1 - distFromCenter) * 0.3; // 中心更亮
            
            ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`;
            ctx.fillRect(
              x,
              row * rowHeight3,
              1,
              Math.ceil(rowHeight3)
            );
          }
        }
      }
      
      // 恢复混合模式
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * 渲染罗盘
   * @param ctx Canvas 2D 上下文
   * @param canvas Canvas 元素
   * @param antennaAngle 天线角度（度）
   */
  renderCompass(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    antennaAngle: number
  ): void {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 50;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 外圈
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 刻度（与雷达图一致：0度=右，90度=下，180度=左，270度=上）
    for (let i = 0; i < 360; i += 45) {
      const angle = i * Math.PI / 180;
      const x1 = cx + Math.cos(angle) * (radius - 5);
      const y1 = cy + Math.sin(angle) * (radius - 5);
      const x2 = cx + Math.cos(angle) * radius;
      const y2 = cy + Math.sin(angle) * radius;
      
      ctx.strokeStyle = '#777';
      ctx.lineWidth = i % 90 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // 指针（与雷达图使用相同的角度系统）
    const angle = antennaAngle * Math.PI / 180;
    const x = cx + Math.cos(angle) * (radius - 10);
    const y = cy + Math.sin(angle) * (radius - 10);
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 中心点
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 渲染信号表
   * @param ctx Canvas 2D 上下文
   * @param canvas Canvas 元素
   * @param signal 信号数据（可选）
   * @param meterNeedleAngle 指针当前角度（用于平滑动画）
   * @returns 更新后的指针角度
   */
  renderMeter(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    signal: SignalForRendering | null,
    meterNeedleAngle: number
  ): number {
    const cx = canvas.width / 2;
    const cy = canvas.height - 10;
    const radius = 70;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 表盘弧线
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
    ctx.stroke();
    
    // 刻度
    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI + (i / 10) * Math.PI;
      const x1 = cx + Math.cos(angle) * (radius - 5);
      const y1 = cy + Math.sin(angle) * (radius - 5);
      const x2 = cx + Math.cos(angle) * radius;
      const y2 = cy + Math.sin(angle) * radius;
      
      ctx.strokeStyle = '#555';
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // 数字
      if (i % 2 === 0) {
        ctx.fillStyle = '#777';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const tx = cx + Math.cos(angle) * (radius - 15);
        const ty = cy + Math.sin(angle) * (radius - 15);
        ctx.fillText((i * 10).toString(), tx, ty + 3);
      }
    }
    
    // 指针
    const strength = signal ? signal.receivedStrength : 0;
    const targetAngle = Math.PI + (Math.min(strength, 100) / 100) * Math.PI;
    
    // 平滑过渡
    const newNeedleAngle = meterNeedleAngle + (targetAngle - meterNeedleAngle) * 0.1;
    
    const nx = cx + Math.cos(newNeedleAngle) * (radius - 10);
    const ny = cy + Math.sin(newNeedleAngle) * (radius - 10);
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    
    // 中心螺丝
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    
    return newNeedleAngle;
  }
}
