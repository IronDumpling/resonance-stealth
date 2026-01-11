/**
 * 无线电控制面板（原RadioUI）
 * Radio Control Panel (formerly RadioUI)
 */

import React, { useEffect, useRef } from 'react';
import { IRadioSystem } from '@/types/systems';
import { MORSE_CODE } from '@/config/gameConfig';
import { RadioControlRenderer } from '@/rendering/RadioControlRenderer';

// 扩展 IRadioSystem 以包含 RadioControlPanel 需要的属性和方法
interface ExtendedRadioSystem extends IRadioSystem {
  currentFrequency: number;
  antennaAngle: number;
  freqMin: number;
  freqMax: number;
  waterfallHistory: number[][];
  enemyFreqHistory: (number | null)[];
  waveContactHistory: Array<Array<{ freq: number; source: string; isReflected?: boolean }>>;
  receivedResponses: Array<{
    morse: string;
    delay: number;
    distance: number;
    callsign: string;
    strength: number;
    frequency: number;
  }>;
  tuneCoarse(dir: number): void;
  tuneFine(dir: number): void;
  rotateAntenna(dir: number): void;
  getStrongestSignal(): {
    receivedStrength: number;
    callsign: string;
    frequency: number;
    message: string;
    morseCode: string;
    getDegradedMessage(strength: number): {
      callsign: string;
      message: string;
      morseCode: string;
      quality: string;
    };
  } | null;
  emitPlayerWave(): void;
  frequencyToIndex(freq: number, width: number): number;
}

export class RadioControlPanel {
  radio: ExtendedRadioSystem | null = null;
  container: HTMLElement | null = null;
  isActive: boolean = false;
  isVisible: boolean = true;
  blinkTimer: number = 0;
  meterNeedleAngle: number = -45;
  paperTapeMessages: string[] = [];
  isPrinting: boolean = false;
  knobRotations: {
    coarse: number;
    fine: number;
    antenna: number;
  } = {
    coarse: 0,
    fine: 0,
    antenna: 0,
  };
  
  // Canvas 引用
  waterfallCanvas: HTMLCanvasElement | null = null;
  waterfallCtx: CanvasRenderingContext2D | null = null;
  compassCanvas: HTMLCanvasElement | null = null;
  compassCtx: CanvasRenderingContext2D | null = null;
  meterCanvas: HTMLCanvasElement | null = null;
  meterCtx: CanvasRenderingContext2D | null = null;
  
  // 渲染器
  renderer: RadioControlRenderer = new RadioControlRenderer();

  constructor(radioSystem?: IRadioSystem | null) {
    this.radio = radioSystem as ExtendedRadioSystem | null;
  }

  /**
   * 初始化DOM界面
   */
  init(parentElement?: HTMLElement | null): void {
    // 获取左侧无线电收发器容器
    const radioTransceiver = parentElement || document.getElementById('radio-transceiver');
    
    if (!radioTransceiver) {
      console.error('Radio transceiver container not found!');
      return;
    }
    
    // 创建主容器
    this.container = document.createElement('div');
    this.container.id = 'radio-interface';
    this.container.innerHTML = this.generateHTML();
    
    // 添加到左侧面板
    radioTransceiver.appendChild(this.container);
    
    // 等待DOM渲染完成后初始化
    setTimeout(() => {
      // 绑定事件
      this.bindEvents();
      
      // 初始化所有 canvas（瀑布图、指南针、信号表）
      this.initWaterfallCanvas();
      
      console.log('Radio UI DOM created and initialized in left panel');
    }, 0);
  }

  /**
   * 激活UI（允许交互）
   */
  activate(): void {
    this.isActive = true;
    if (this.container) {
      this.container.classList.remove('disabled');
    }
    console.log('Radio UI activated');
  }

  /**
   * 停用UI（禁止交互）
   */
  deactivate(): void {
    this.isActive = false;
    if (this.container) {
      this.container.classList.add('disabled');
    }
    console.log('Radio UI deactivated');
  }

  /**
   * 生成HTML结构
   */
  generateHTML(): string {
    return `
      <div class="radio-panel">
        <!-- 顶部标题 -->
        <div class="radio-header">
          <div class="screw"></div>
          <div class="screw"></div>
          <span>RF-9000 SPECTRUM ANALYZER</span>
          <div class="screw"></div>
          <div class="screw"></div>
        </div>
        
        <!-- 瀑布图显示区 -->
        <div class="spectrum-container">
          <canvas id="waterfall-canvas" width="600" height="200"></canvas>
          <div class="tuner-line"></div>
          <div class="freq-scale">
            <span>100</span>
            <span>120</span>
            <span>140</span>
            <span>160</span>
            <span>180</span>
            <span>200</span>
          </div>
        </div>
        
        <!-- 控制面板 -->
        <div class="control-row">
          <!-- 频率显示 -->
          <div class="digital-display">
            <div class="display-label">FREQUENCY</div>
            <div class="display-value" id="freq-display">150.0</div>
            <div class="display-unit">MHz</div>
          </div>
          
          <!-- 粗调旋钮 -->
          <div class="knob-group">
            <div class="knob-label">COARSE</div>
            <div class="knob" id="knob-coarse">
              <div class="knob-indicator"></div>
            </div>
            <div class="knob-buttons">
              <button class="knob-btn" data-knob="coarse" data-dir="-1">◄</button>
              <button class="knob-btn" data-knob="coarse" data-dir="1">►</button>
            </div>
          </div>
          
          <!-- 精调旋钮 -->
          <div class="knob-group">
            <div class="knob-label">FINE</div>
            <div class="knob knob-small" id="knob-fine">
              <div class="knob-indicator"></div>
            </div>
            <div class="knob-buttons">
              <button class="knob-btn" data-knob="fine" data-dir="-1">◄</button>
              <button class="knob-btn" data-knob="fine" data-dir="1">►</button>
            </div>
          </div>
        </div>
        
        <!-- 天线和信号表 -->
        <div class="control-row">
          <!-- 天线方向 -->
          <div class="instrument-group">
            <div class="instrument-label">ANTENNA DIRECTION</div>
            <div class="compass-meter">
              <canvas id="compass-canvas" width="120" height="120"></canvas>
            </div>
            <div class="knob knob-small" id="knob-ant" style="margin: 10px auto;">
              <div class="knob-indicator"></div>
            </div>
            <div class="knob-buttons">
              <button class="knob-btn" data-knob="antenna" data-dir="-1">◄</button>
              <span id="antenna-display">0°</span>
              <button class="knob-btn" data-knob="antenna" data-dir="1">►</button>
            </div>
          </div>
          
          <!-- 信号强度表 -->
          <div class="instrument-group">
            <div class="instrument-label">SIGNAL STRENGTH</div>
            <div class="meter">
              <canvas id="meter-canvas" width="160" height="100"></canvas>
            </div>
            <div class="signal-info" id="signal-info">
              <div id="signal-callsign">--</div>
              <div id="signal-freq">-- MHz</div>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="button-row">
          <button class="action-btn" id="btn-wave">
            <span class="btn-led"></span>
            EMIT WAVE [SPACE]
          </button>
        </div>
        
        <!-- 摩斯码纸带输出 -->
        <div class="paper-tape-container">
          <div class="tape-label">MORSE DECODER OUTPUT</div>
          <div class="paper-tape" id="paper-tape">
            <div class="tape-content" id="tape-content"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 生成摩斯码对照表
   */
  generateMorseTable(): string {
    let html = '<div class="morse-grid">';
    
    // 字母
    html += '<div class="morse-section"><h4>LETTERS</h4>';
    for (let char = 65; char <= 90; char++) {
      const letter = String.fromCharCode(char);
      const morse = MORSE_CODE[letter] || '';
      html += `<div class="morse-item">
        <span class="morse-char">${letter}</span>
        <span class="morse-code">${morse}</span>
      </div>`;
    }
    html += '</div>';
    
    // 数字
    html += '<div class="morse-section"><h4>NUMBERS</h4>';
    for (let i = 0; i <= 9; i++) {
      const morse = MORSE_CODE[i.toString()] || '';
      html += `<div class="morse-item">
        <span class="morse-char">${i}</span>
        <span class="morse-code">${morse}</span>
      </div>`;
    }
    html += '</div>';
    
    html += '</div>';
    return html;
  }

  /**
   * 绑定事件
   */
  bindEvents(): void {
    // 旋钮按钮
    document.querySelectorAll('.knob-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!this.isActive) return;  // 未激活时不响应
        const target = e.target as HTMLElement;
        const knob = target.dataset.knob;
        const dir = parseInt(target.dataset.dir || '0');
        if (knob) {
          this.handleKnobClick(knob, dir);
        }
        
        // 按钮动画
        target.classList.add('active');
        setTimeout(() => target.classList.remove('active'), 100);
      });
    });
    
    // 操作按钮
    document.getElementById('btn-wave')?.addEventListener('click', () => {
      if (!this.isActive) return;  // 未激活时不响应
      if (this.radio && typeof this.radio.emitPlayerWave === 'function') {
        this.radio.emitPlayerWave();
      }
      this.flashButton('btn-wave');
    });
    
    // 纸带点击显示摩斯码表
    document.getElementById('paper-tape')?.addEventListener('click', () => {
      this.showMorseReference();
    });
    
    // 关闭摩斯码表
    document.getElementById('close-morse')?.addEventListener('click', () => {
      this.hideMorseReference();
    });
  }

  /**
   * 处理旋钮点击
   */
  handleKnobClick(knob: string, dir: number): void {
    if (!this.radio) return;
    
    if (knob === 'coarse') {
      this.radio.tuneCoarse(dir);
      this.knobRotations.coarse += dir * 30;
      this.updateKnobRotation('knob-coarse', this.knobRotations.coarse);
    } else if (knob === 'fine') {
      this.radio.tuneFine(dir);
      this.knobRotations.fine += dir * 15;
      this.updateKnobRotation('knob-fine', this.knobRotations.fine);
    } else if (knob === 'antenna') {
      this.radio.rotateAntenna(dir * 1); // 从5度改为1度，更精细调节
      this.knobRotations.antenna += dir * 2; // 旋钮视觉旋转也相应减少
      this.updateKnobRotation('knob-ant', this.knobRotations.antenna);
    }
  }

  /**
   * 更新旋钮旋转
   */
  updateKnobRotation(knobId: string, angle: number): void {
    const knob = document.getElementById(knobId);
    if (knob) {
      knob.style.transform = `rotate(${angle}deg)`;
    }
  }

  /**
   * 按钮闪烁效果
   */
  flashButton(btnId: string): void {
    const btn = document.getElementById(btnId);
    if (btn) {
      const led = btn.querySelector('.btn-led');
      led?.classList.add('active');
      setTimeout(() => led?.classList.remove('active'), 500);
    }
  }

  /**
   * 显示摩斯码对照表
   */
  showMorseReference(): void {
    const paper = document.getElementById('morse-paper');
    if (paper) {
      paper.style.display = 'block';
      paper.classList.add('paper-show');
    }
  }

  /**
   * 隐藏摩斯码对照表
   */
  hideMorseReference(): void {
    const paper = document.getElementById('morse-paper');
    if (paper) {
      paper.classList.remove('paper-show');
      setTimeout(() => {
        paper.style.display = 'none';
      }, 300);
    }
  }

  /**
   * 初始化瀑布图canvas
   */
  initWaterfallCanvas(): void {
    // 瀑布图canvas
    this.waterfallCanvas = document.getElementById('waterfall-canvas') as HTMLCanvasElement;
    if (this.waterfallCanvas) {
      // 设置canvas实际绘制尺寸
      const rect = this.waterfallCanvas.getBoundingClientRect();
      this.waterfallCanvas.width = rect.width || 600;
      this.waterfallCanvas.height = rect.height || 200;
      this.waterfallCtx = this.waterfallCanvas.getContext('2d');
      console.log('Waterfall canvas initialized:', this.waterfallCanvas.width, 'x', this.waterfallCanvas.height);
    } else {
      console.error('Waterfall canvas not found!');
    }
    
    // 罗盘canvas
    this.compassCanvas = document.getElementById('compass-canvas') as HTMLCanvasElement;
    if (this.compassCanvas) {
      this.compassCtx = this.compassCanvas.getContext('2d');
      console.log('Compass canvas initialized');
    }
    
    // 信号表canvas
    this.meterCanvas = document.getElementById('meter-canvas') as HTMLCanvasElement;
    if (this.meterCanvas) {
      this.meterCtx = this.meterCanvas.getContext('2d');
      console.log('Meter canvas initialized');
    }
  }

  /**
   * 添加纸带消息
   */
  addTapeMessage(_message: string, morseCode: string): void {
    const tapeContent = document.getElementById('tape-content');
    const paperTape = document.getElementById('paper-tape');
    if (!tapeContent || !paperTape) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'tape-message';
    messageDiv.innerHTML = `
      <div class="tape-morse">${morseCode}</div>
    `;
    
    // 添加新消息
    tapeContent.appendChild(messageDiv);
    
    // 计算新的高度并触发伸长动画
    const newHeight = Math.min(tapeContent.scrollHeight, 300);
    paperTape.style.minHeight = `${newHeight}px`;
    
    // 自动滚动到底部
    setTimeout(() => {
      paperTape.scrollTop = paperTape.scrollHeight;
    }, 100);
    
    // 添加打印声音效果提示（可选）
    console.log('📠 New morse code printed on tape');
  }

  /**
   * 更新显示
   */
  update(deltaTime: number): void {
    if (!this.radio) return;
    
    this.blinkTimer += deltaTime;
    
    // 更新频率显示
    const freqDisplay = document.getElementById('freq-display');
    if (freqDisplay) {
      freqDisplay.textContent = this.radio.currentFrequency.toFixed(1);
    }
    
    // 更新天线显示
    const antennaDisplay = document.getElementById('antenna-display');
    if (antennaDisplay) {
      antennaDisplay.textContent = `${Math.round(this.radio.antennaAngle)}°`;
    }
    
    // 更新信号信息
    const signal = this.radio.getStrongestSignal();
    this.updateSignalInfo(signal);
    
    // 始终渲染瀑布图（包括敌人分析线）
    this.renderWaterfall();
    
    // 始终渲染指南针和信号表
    this.renderCompass();
    this.renderMeter(signal);
    
    // 更新游标位置和频率刻度
    this.updateTunerLine();
    this.updateFreqScale();
  }

  /**
   * 更新信号信息
   */
  updateSignalInfo(signal: ReturnType<ExtendedRadioSystem['getStrongestSignal']>): void {
    if (!this.radio) return;
    
    const callsignEl = document.getElementById('signal-callsign');
    const freqEl = document.getElementById('signal-freq');
    
    if (signal && signal.receivedStrength > 10) {
      // 获取根据信号强度降级的信息
      const degradedInfo = signal.getDegradedMessage(signal.receivedStrength);
      
      if (callsignEl) {
        callsignEl.textContent = degradedInfo.callsign;
        // 根据信号质量设置颜色
        if (degradedInfo.quality === 'clear') {
          callsignEl.style.color = '#00ff00';
        } else if (degradedInfo.quality === 'noisy') {
          callsignEl.style.color = '#ffff00';
        } else if (degradedInfo.quality === 'poor') {
          callsignEl.style.color = '#ff8800';
        } else {
          callsignEl.style.color = '#ff0000';
        }
      }
      
      if (freqEl) {
        freqEl.textContent = `${signal.frequency.toFixed(1)} MHz`;
      }
      
      // 根据信号强度决定是否添加到纸带
      const strengthKey = `_tape_${Math.floor(signal.receivedStrength / 10)}`;
      if (signal.message && !(signal as any)[strengthKey]) {
        this.addTapeMessage(degradedInfo.message, degradedInfo.morseCode);
        (signal as any)[strengthKey] = true;
        
        // 显示信号质量提示
        if (degradedInfo.quality !== 'clear') {
          const qualityMsg: Record<string, string> = {
            'noisy': 'SIGNAL NOISY - ADJUST TUNING',
            'poor': 'SIGNAL POOR - ADJUST FREQUENCY & ANTENNA',
            'weak': 'SIGNAL TOO WEAK'
          };
          // 简化 logMsg 调用，使用 console.log 作为占位符
          console.log(qualityMsg[degradedInfo.quality] || '');
        }
      }
    } else {
      if (callsignEl) {
        callsignEl.textContent = '--';
        callsignEl.style.color = '#00ff00';
      }
      if (freqEl) freqEl.textContent = '-- MHz';
    }
  }

  /**
   * 更新游标位置
   */
  updateTunerLine(): void {
    if (!this.radio) return;
    
    const tunerLine = document.querySelector('.tuner-line');
    if (!tunerLine) return;
    
    // 使用动态频率范围
    const range = this.radio.freqMax - this.radio.freqMin;
    const percent = ((this.radio.currentFrequency - this.radio.freqMin) / range) * 100;
    (tunerLine as HTMLElement).style.left = `${percent}%`;
  }

  /**
   * 更新频率刻度显示（动态适应核心范围）
   */
  updateFreqScale(): void {
    if (!this.radio) return;
    
    const freqScale = document.querySelector('.freq-scale');
    if (!freqScale) return;
    
    const min = this.radio.freqMin;
    const max = this.radio.freqMax;
    const step = (max - min) / 5; // 6个刻度点，5个间隔
    
    const spans = freqScale.querySelectorAll('span');
    if (spans.length === 6) {
      for (let i = 0; i < 6; i++) {
        spans[i].textContent = Math.round(min + step * i).toString();
      }
    }
  }

  /**
   * 渲染瀑布图
   */
  renderWaterfall(): void {
    if (!this.waterfallCtx || !this.waterfallCanvas || !this.radio) return;
    
    this.renderer.renderWaterfall(
      this.waterfallCtx,
      this.waterfallCanvas,
      this.radio
    );
  }

  /**
   * 渲染罗盘
   */
  renderCompass(): void {
    if (!this.compassCtx || !this.compassCanvas || !this.radio) return;
    
    this.renderer.renderCompass(
      this.compassCtx,
      this.compassCanvas,
      this.radio.antennaAngle
    );
  }

  /**
   * 渲染信号表
   */
  renderMeter(signal: ReturnType<ExtendedRadioSystem['getStrongestSignal']>): void {
    if (!this.meterCtx || !this.meterCanvas) return;
    
    // 更新指针角度（renderer 返回新的角度）
    this.meterNeedleAngle = this.renderer.renderMeter(
      this.meterCtx,
      this.meterCanvas,
      signal,
      this.meterNeedleAngle
    );
  }

  /**
   * 渲染主函数
   */
  render(): void {
    // render 方法在 update 中已经调用了所有渲染逻辑
    // 这里可以留空，或者调用 update(0) 来触发一次渲染
  }
}

// React组件包装器
export const RadioControlPanelComponent: React.FC<{ radioSystem?: IRadioSystem | null }> = ({
  radioSystem,
}) => {
  const panelRef = useRef<RadioControlPanel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelRef.current) {
      panelRef.current = new RadioControlPanel(radioSystem);
      if (containerRef.current) {
        panelRef.current.init(containerRef.current);
      }
    }

    return () => {
      // 清理
    };
  }, [radioSystem]);

  return <div id="radio-transceiver" ref={containerRef} />;
};
