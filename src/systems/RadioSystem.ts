/**
 * 无线电系统
 * Radio System
 */

import { IRadioSystem } from '@/types/systems';
import { MORSE_CODE } from '@/config/gameConfig';
import { IGameState } from '@/types/game';
import { IAntennaSystem } from '@/types/systems';

// 无线电配置
const RADIO_CONFIG = {
  FREQ_MIN: 100,          // 最低频率 (MHz)
  FREQ_MAX: 200,          // 最高频率 (MHz)
  COARSE_STEP: 5,         // 粗调步进 (MHz)
  FINE_STEP: 0.1,         // 精调步进 (MHz)
  SIGNAL_BANDWIDTH: 2.0,  // 信号带宽 (MHz)
  NOISE_LEVEL: 0.15,      // 基础噪声等级
  SPEED_OF_LIGHT: 300,    // 光速 (简化为 300 m/μs)
  WATERFALL_HEIGHT: 100,  // 瀑布图历史行数
  ANTENNA_SPEED: 5,       // 天线旋转速度 (度/秒)
};

// 信号类型定义
const SIGNAL_TYPES = {
  ASTRONAUT: 'astronaut',    // 宇航员信号（剧情）
  SURVIVOR: 'survivor',       // 幸存者信号
  BEACON: 'beacon',          // 信标信号
  INTERFERENCE: 'interference' // 干扰信号
} as const;

// 无线电信号接口
export interface IRadioSignal {
  id: string;
  type: string;
  frequency: number;
  direction: number; // 0-360度
  distance: number;  // km
  message: string;
  callsign: string;
  strength: number;   // 基础强度 0-100
  persistent: boolean;
  lifespan: number;
  discovered: boolean;
  x: number | null;
  y: number | null;
  receivedStrength: number;
  morseCode: string;
  questItemCreated?: boolean;
  measuredDirection?: number | null;
  measuredDistance?: number | null;
  markedX?: number;
  markedY?: number;
  waveEmitInterval?: number;
  lastWaveEmitTime?: number;
  waveEmitCount?: number;
  getDegradedMessage(strength: number): {
    callsign: string;
    message: string;
    morseCode: string;
    quality: string;
  };
  update(deltaTime: number): boolean;
}

// 无线电系统回调接口
export interface IRadioSystemCallbacks {
  logMsg?: (message: string) => void;
  spawnItem?: (type: string, x: number, y: number, config?: unknown) => void;
  emitWave?: (
    x: number, y: number, angle: number, spread: number,
    freq: number, source: string, ownerId?: string,
    isForced?: boolean, isFocused?: boolean, isPerfect?: boolean,
    energyMultiplier?: number, isReflectedWave?: boolean,
    originalSourceX?: number, originalSourceY?: number
  ) => unknown;
  onFrequencyChange?: (freq: number) => void;
  showPingWave?: () => void;
  addMarker?: (x: number, y: number, signal: IRadioSignal) => void;
}

export class RadioSystem implements IRadioSystem {
  currentFrequency: number = 150.0;
  antennaAngle: number = 270; // 天线指向角度（270度=朝上/北）
  signals: IRadioSignal[] = [];
  waterfallHistory: number[][] = [];
  enemyFreqHistory: (number | null)[] = []; // 敌人频率历史记录
  lastSignalSpawnTime: number = 0;
  signalSpawnInterval: number = 120; // 2分钟生成一个信号
  
  // 动态频率范围（由机器人核心决定）
  freqMin: number = 100;  // 初始值，会被核心范围覆盖
  freqMax: number = 200;
  onFrequencyChange: ((freq: number) => void) | null = null; // 回调函数，用于通知机器人系统
  
  // 玩家位置（避难所位置）
  shelterX: number = 0;
  shelterY: number = 0;
  
  // UI状态
  mode: string = 'MONITOR'; // MONITOR, DIRECTION, DECODE
  selectedSignal: IRadioSignal | null = null;
  
  // Ping状态
  isPinging: boolean = false;
  pingStartTime: number = 0;
  
  // 敌人频率分析
  enemyAnalysisFreq: number | null = null;
  
  // 波纹接触跟踪系统
  activeWaveContacts: Array<{ id: string; freq: number; source: string; timer: number }> = []; // 当前活跃的波纹接触
  waveContactHistory: Array<Array<{ freq: number; source: string; isReflected?: boolean }>> = []; // 波纹频率历史记录（用于瀑布图）
  
  // 波纹系统
  emittedWaves: Array<{
    id: string;
    x: number;
    y: number;
    r: number;
    maxR: number;
    speed: number;
    freq: number;
    emitTime: number;
    signal?: IRadioSignal;
    targetX?: number;
    targetY?: number;
    distance?: number;
  }> = []; // 玩家发出的波
  receivedResponses: Array<{
    morse: string;
    delay: number;
    distance: number;
    callsign: string;
    strength: number;
    frequency: number;
    signal?: IRadioSignal;
    timestamp?: number;
  }> = []; // 接收到的响应波

  // 依赖注入
  gameState: IGameState | null = null;
  antennaSystem: IAntennaSystem | null = null;
  callbacks: IRadioSystemCallbacks = {};

  constructor(
    gameState?: IGameState | null,
    antennaSystem?: IAntennaSystem | null,
    callbacks?: IRadioSystemCallbacks
  ) {
    this.gameState = gameState || null;
    this.antennaSystem = antennaSystem || null;
    if (callbacks) {
      this.callbacks = callbacks;
      this.onFrequencyChange = callbacks.onFrequencyChange || null;
    }
    
    console.log('Radio System initialized');
  }

  /**
   * 更新无线电系统
   */
  update(deltaTime: number): void {
    // 同步避难所位置到机器人当前位置
    if (this.gameState && this.gameState.p) {
      this.shelterX = this.gameState.p.x;
      this.shelterY = this.gameState.p.y;
    }
    
    // 同步天线方向（5.3：从场景到Radio UI）
    this.syncAntennaDirection();
    
    // 更新信号生命周期
    for (let i = this.signals.length - 1; i >= 0; i--) {
      const signal = this.signals[i];
      
      // 更新信号生命周期
      if (!signal.update(deltaTime)) {
        this.removeSignal(signal.id);
        continue;
      }
    }
    
    // 更新波纹系统
    this.updateWaves(deltaTime);
    
    // 更新波纹接触计时器
    for (let i = this.activeWaveContacts.length - 1; i >= 0; i--) {
      this.activeWaveContacts[i].timer--;
      if (this.activeWaveContacts[i].timer <= 0) {
        this.activeWaveContacts.splice(i, 1);
      }
    }
    
    // 更新瀑布图（每帧更新）
    this.updateWaterfall();
    
    // 动态生成信号
    this.lastSignalSpawnTime += deltaTime;
    if (this.lastSignalSpawnTime >= this.signalSpawnInterval) {
      this.spawnRandomSignal();
      this.lastSignalSpawnTime = 0;
    }
  }

  /**
   * 设置频率范围（由机器人核心决定）
   */
  setFrequencyRange(min: number, max: number): void {
    this.freqMin = min;
    this.freqMax = max;
    // 确保当前频率在新范围内
    this.currentFrequency = Math.max(min, Math.min(max, this.currentFrequency));
    this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
    this.updateSignalStrengths();
  }

  /**
   * 同步机器人频率
   */
  syncWithRobotFrequency(freq: number): void {
    this.currentFrequency = freq;
    this.updateSignalStrengths();
  }

  /**
   * 粗调频率
   */
  tuneCoarse(delta: number): void {
    this.currentFrequency += delta * RADIO_CONFIG.COARSE_STEP;
    this.currentFrequency = Math.max(this.freqMin, Math.min(this.freqMax, this.currentFrequency));
    this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
    
    // 通知机器人系统
    if (this.onFrequencyChange) {
      this.onFrequencyChange(this.currentFrequency);
    }
    
    this.updateSignalStrengths();
  }

  /**
   * 精调频率
   */
  tuneFine(delta: number): void {
    this.currentFrequency += delta * RADIO_CONFIG.FINE_STEP;
    this.currentFrequency = Math.max(this.freqMin, Math.min(this.freqMax, this.currentFrequency));
    this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
    
    // 通知机器人系统
    if (this.onFrequencyChange) {
      this.onFrequencyChange(this.currentFrequency);
    }
    
    this.updateSignalStrengths();
  }

  /**
   * 旋转天线（5.3：同步到场景中的天线方向）
   */
  rotateAntenna(delta: number): void {
    this.antennaAngle += delta;
    this.antennaAngle = (this.antennaAngle + 360) % 360;
    
    // 同步到场景中的天线系统（5.3）
    if (this.antennaSystem) {
      // 将角度转换为弧度并更新
      const angleRad = this.antennaAngle * Math.PI / 180;
      this.antennaSystem.updateDirection(angleRad);
    }
    
    this.updateSignalStrengths();
  }

  /**
   * 同步天线方向（从场景到Radio UI，5.3）
   */
  syncAntennaDirection(): void {
    if (this.antennaSystem) {
      // 从场景中的天线系统获取方向（弧度），转换为角度
      // 注意：IAntennaSystem 可能没有 direction 属性，需要扩展接口或通过回调获取
      // 这里暂时跳过，实际使用时需要根据具体实现调整
    } else if (this.gameState && this.gameState.p) {
      // 回退：从玩家朝向获取
      const angleRad = this.gameState.p.a;
      this.antennaAngle = (angleRad * 180 / Math.PI + 360) % 360;
    }
  }

  /**
   * 更新信号强度
   */
  updateSignalStrengths(): void {
    for (const signal of this.signals) {
      // 频率匹配度（高斯衰减）- 调整使其更容易达到高值
      const freqDiff = Math.abs(signal.frequency - this.currentFrequency);
      let frequencyMatch = 0;
      if (freqDiff < RADIO_CONFIG.SIGNAL_BANDWIDTH) {
        // 增加容差，更容易达到高匹配度
        frequencyMatch = Math.exp(-Math.pow(freqDiff / (RADIO_CONFIG.SIGNAL_BANDWIDTH * 2), 2));
      }
      
      // 方向匹配度（余弦函数）- 优化使其在正确方向时更强
      const angleDiff = Math.abs(this.normalizeAngle(signal.direction - this.antennaAngle));
      // 使用更窄的波束宽度，但峰值更高
      const directionMatch = Math.pow(Math.cos(angleDiff * Math.PI / 180), 2) * 0.7 + 0.3; // 平方使峰值更尖锐
      
      // 距离衰减
      const distanceAttenuation = 1 / (1 + signal.distance * 0.03);
      
      // 计算接收强度
      signal.receivedStrength = signal.strength * frequencyMatch * directionMatch * distanceAttenuation * 1.5;
    }
  }

  /**
   * 获取最强信号
   */
  getStrongestSignal(): IRadioSignal | null {
    if (this.signals.length === 0) return null;
    
    let strongest = this.signals[0];
    for (const signal of this.signals) {
      if (signal.receivedStrength > strongest.receivedStrength) {
        strongest = signal;
      }
    }
    
    return strongest.receivedStrength > 10 ? strongest : null;
  }

  /**
   * 频率转索引
   */
  frequencyToIndex(freq: number, width: number): number {
    const range = this.freqMax - this.freqMin;
    return Math.floor(((freq - this.freqMin) / range) * width);
  }

  /**
   * 规范化角度
   */
  normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  /**
   * 生成频谱数据（用于瀑布图）
   */
  generateSpectrum(): number[] {
    const spectrumWidth = 200; // 频谱点数
    const spectrum = new Array(spectrumWidth).fill(0);
    
    // 基础噪声
    for (let i = 0; i < spectrumWidth; i++) {
      spectrum[i] = Math.random() * RADIO_CONFIG.NOISE_LEVEL;
    }
    
    // 添加信号峰值
    for (const signal of this.signals) {
      const freqIndex = this.frequencyToIndex(signal.frequency, spectrumWidth);
      if (freqIndex >= 0 && freqIndex < spectrumWidth) {
        // 高斯形状的信号峰
        for (let i = -10; i <= 10; i++) {
          const idx = freqIndex + i;
          if (idx >= 0 && idx < spectrumWidth) {
            const intensity = signal.strength / 100 * Math.exp(-(i * i) / 20);
            spectrum[idx] += intensity;
          }
        }
      }
    }
    
    // 归一化
    for (let i = 0; i < spectrumWidth; i++) {
      spectrum[i] = Math.min(1, spectrum[i]);
    }
    
    return spectrum;
  }

  /**
   * 更新瀑布图
   */
  updateWaterfall(): void {
    const spectrum = this.generateSpectrum();
    this.waterfallHistory.unshift(spectrum);
    
    if (this.waterfallHistory.length > RADIO_CONFIG.WATERFALL_HEIGHT) {
      this.waterfallHistory.pop();
    }
    
    // 记录敌人频率到历史记录
    this.enemyFreqHistory.unshift(this.enemyAnalysisFreq); // 可能是 null 或频率值
    
    if (this.enemyFreqHistory.length > RADIO_CONFIG.WATERFALL_HEIGHT) {
      this.enemyFreqHistory.pop();
    }
    
    // 记录天线范围内的波纹频率到历史记录（阶段五：无线电系统升级）
    const currentWaveFreqs: Array<{ freq: number; source: string; isReflected?: boolean }> = [];
    
    // 如果天线系统已初始化，优先复用其本帧缓存的"天线范围内波纹"
    if (this.antennaSystem && this.gameState) {
      // 注意：需要扩展 IAntennaSystem 接口以访问 lastWavesInRange
      // 这里暂时使用 gameState.entities.waves 作为回退
      const wavesInRange = (this.antennaSystem as any).lastWavesInRange || this.gameState.entities.waves || [];

      for (const wave of wavesInRange) {
        // 波纹在天线范围内，记录其频率
        let sourceType = (wave as any).source || 'unknown';
        if ((wave as any).isReflectedWave) {
          sourceType = 'reflection';  // 反弹波标记
        }
        
        currentWaveFreqs.push({
          freq: (wave as any).freq || 0,
          source: sourceType,
          isReflected: (wave as any).isReflectedWave || false
        });
      }
    } else {
      // 回退到旧的activeWaveContacts系统
      const fallbackWaves = this.activeWaveContacts.map(w => ({
        freq: w.freq,
        source: w.source,
        isReflected: false
      }));
      currentWaveFreqs.push(...fallbackWaves);
    }
    
    this.waveContactHistory.unshift(currentWaveFreqs);
    
    if (this.waveContactHistory.length > RADIO_CONFIG.WATERFALL_HEIGHT) {
      this.waveContactHistory.pop();
    }
  }

  /**
   * 设置敌人分析频率（用于瀑布图显示）
   */
  setEnemyAnalysis(freq: number | null): void {
    this.enemyAnalysisFreq = freq;
  }

  /**
   * 清除敌人分析频率
   */
  clearEnemyAnalysis(): void {
    this.enemyAnalysisFreq = null;
  }

  /**
   * 添加波纹接触记录
   */
  addWaveContact(waveId: string, freq: number, source: string): void {
    // 检查是否已存在
    const existing = this.activeWaveContacts.find(w => w.id === waveId);
    if (existing) {
      existing.timer = 60; // 刷新计时器
      return;
    }
    
    this.activeWaveContacts.push({
      id: waveId,
      freq: freq,
      source: source,
      timer: 60 // 最小停留60帧
    });
  }

  /**
   * 移除波纹接触记录
   */
  removeWaveContact(waveId: string): void {
    const index = this.activeWaveContacts.findIndex(w => w.id === waveId);
    if (index !== -1) {
      this.activeWaveContacts.splice(index, 1);
    }
  }

  /**
   * 添加信号
   */
  addSignal(config: {
    id?: string;
    type?: string;
    frequency: number;
    direction: number;
    distance: number;
    message?: string;
    callsign?: string;
    strength?: number;
    persistent?: boolean;
    lifespan?: number;
    waveEmitInterval?: number;
  }): IRadioSignal {
    const signal = this.createRadioSignal(config);
    
    // 计算世界坐标（基于避难所位置）
    const angleRad = signal.direction * Math.PI / 180;
    const distanceMeters = signal.distance * 1000;
    
    // Canvas坐标系：X向右（正=东），Y向下（正=南）
    // Direction定义：0°=东，45°=东北，90°=南，135°=东南，180°=西，225°=西南，270°=北，315°=西北
    // 由于Y轴向下，要让信号在"北"方向，需要Y减小，所以对sin取反
    signal.x = this.shelterX + Math.cos(angleRad) * distanceMeters;
    signal.y = this.shelterY - Math.sin(angleRad) * distanceMeters;  // 取反sin：正角度→Y减小（北）
    
    this.signals.push(signal);
    console.log(`Signal added: ${signal.callsign} at (${signal.x.toFixed(1)}, ${signal.y.toFixed(1)}), freq ${signal.frequency} MHz`);
    
    if (this.callbacks.logMsg) {
      this.callbacks.logMsg(`NEW SIGNAL DETECTED: ${signal.callsign}`);
    }
    
    return signal;
  }

  /**
   * 创建无线电信号对象
   */
  private createRadioSignal(config: {
    id?: string;
    type?: string;
    frequency: number;
    direction: number;
    distance: number;
    message?: string;
    callsign?: string;
    strength?: number;
    persistent?: boolean;
    lifespan?: number;
    waveEmitInterval?: number;
  }): IRadioSignal {
    const id = config.id || `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const type = config.type || SIGNAL_TYPES.SURVIVOR;
    const message = config.message || '';
    const callsign = config.callsign || `UNKNOWN-${id.substr(-4)}`;
    const strength = config.strength || 50;
    const persistent = config.persistent || false;
    const lifespan = config.lifespan || Infinity;
    
    // 生成摩斯码
    const morseCode = message.toUpperCase().split('').map(char => 
      MORSE_CODE[char] || '?'
    ).join(' ');
    
    const signal: IRadioSignal = {
      id,
      type,
      frequency: config.frequency,
      direction: config.direction,
      distance: config.distance,
      message,
      callsign,
      strength,
      persistent,
      lifespan,
      discovered: false,
      x: null,
      y: null,
      receivedStrength: 0,
      morseCode,
      waveEmitInterval: config.waveEmitInterval || 5.0,
      lastWaveEmitTime: 0,
      waveEmitCount: 0,
      
      getDegradedMessage(strength: number) {
        if (strength >= 80) {
          // 完整信息
          return {
            callsign: this.callsign,
            message: this.message,
            morseCode: this.morseCode,
            quality: 'clear'
          };
        } else if (strength >= 50) {
          // 部分信息损坏
          const corruptionRate = 1 - (strength - 50) / 30; // 50%时损坏50%，80%时损坏0%
          return {
            callsign: this.corruptText(this.callsign, corruptionRate * 0.3),
            message: this.corruptText(this.message, corruptionRate * 0.4),
            morseCode: this.corruptMorse(this.morseCode, corruptionRate * 0.4),
            quality: 'noisy'
          };
        } else if (strength >= 20) {
          // 严重损坏
          return {
            callsign: this.corruptText(this.callsign, 0.7),
            message: this.corruptText(this.message, 0.8),
            morseCode: this.corruptMorse(this.morseCode, 0.8),
            quality: 'poor'
          };
        } else {
          // 几乎不可读
          return {
            callsign: '---',
            message: '...',
            morseCode: '.-?-.?',
            quality: 'weak'
          };
        }
      },
      
      corruptText(text: string, rate: number): string {
        return text.split('').map(char => {
          if (Math.random() < rate) {
            const corrupted = ['?', '#', '*', '@', '~'];
            return corrupted[Math.floor(Math.random() * corrupted.length)];
          }
          return char;
        }).join('');
      },
      
      corruptMorse(morse: string, rate: number): string {
        return morse.split('').map(char => {
          if (Math.random() < rate) {
            if (char === '.' || char === '-') {
              return Math.random() > 0.5 ? '?' : char;
            }
            return char;
          }
          return char;
        }).join('');
      },
      
      update(deltaTime: number): boolean {
        if (!this.persistent && this.lifespan !== Infinity) {
          this.lifespan -= deltaTime;
          return this.lifespan > 0;
        }
        return true;
      }
    };
    
    return signal;
  }

  /**
   * 移除信号
   */
  removeSignal(signalId: string): void {
    const index = this.signals.findIndex(s => s.id === signalId);
    if (index !== -1) {
      const signal = this.signals[index];
      this.signals.splice(index, 1);
      console.log(`Signal removed: ${signal.callsign}`);
      
      if (this.callbacks.logMsg) {
        this.callbacks.logMsg(`SIGNAL LOST: ${signal.callsign}`);
      }
    }
  }

  /**
   * 发射玩家波纹
   */
  emitPlayerWave(): void {
    const wave = {
      id: `wave_${Date.now()}`,
      x: this.shelterX,
      y: this.shelterY,
      r: 0,
      maxR: 10000, // 10km range
      speed: 300, // m/s (simplified light speed)
      freq: this.currentFrequency,
      emitTime: Date.now()
    };
    this.emittedWaves.push(wave);
    
    if (this.callbacks.logMsg) {
      this.callbacks.logMsg(`WAVE EMITTED AT ${this.currentFrequency.toFixed(1)} MHz`);
    }
  }

  /**
   * 更新波纹系统
   */
  updateWaves(deltaTime: number): void {
    // 更新发出的波纹（玩家发出的波）
    for (let i = this.emittedWaves.length - 1; i >= 0; i--) {
      const wave = this.emittedWaves[i];
      
      // 跳过响应波（在第二个循环中处理）
      if ((wave as any).signal) continue;
      
      // 扩展波纹半径
      wave.r += wave.speed * deltaTime;
      
      // 检查是否超出范围
      if (wave.r > wave.maxR) {
        this.emittedWaves.splice(i, 1);
        continue;
      }
      
      // 检查与信号的碰撞
      for (const signal of this.signals) {
        if (!signal.x || !signal.y) continue;
        
        const dx = signal.x - wave.x;
        const dy = signal.y - wave.y;
        const distToSignal = Math.sqrt(dx * dx + dy * dy);
        
        // 检查波纹是否扫过信号（使用上一帧和当前帧的半径）
        const lastR = wave.r - wave.speed * deltaTime;
        if (distToSignal >= lastR && distToSignal <= wave.r) {
          // 检查频率匹配（使用信号的带宽作为共振范围）
          // SIGNAL_BANDWIDTH 是总带宽（MHz），共振容差是半宽
          const resonanceTolerance = RADIO_CONFIG.SIGNAL_BANDWIDTH / 2; // ±1.0 MHz (如果带宽是2.0 MHz)
          const freqDiff = Math.abs(wave.freq - signal.frequency);
          if (freqDiff <= resonanceTolerance) {
            // 计算从信号到玩家的距离（用于响应波）
            const dxToPlayer = this.shelterX - signal.x;
            const dyToPlayer = this.shelterY - signal.y;
            const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
            
            // 触发共振，创建响应波
            const responseWave = {
              id: `response_${Date.now()}_${signal.id}`,
              x: signal.x,
              y: signal.y,
              targetX: this.shelterX,
              targetY: this.shelterY,
              r: 0,
              maxR: distToPlayer, // 响应波的最大范围是从信号到玩家的距离
              speed: wave.speed,
              freq: signal.frequency, // 响应波使用信号的频率
              signal: signal,
              emitTime: Date.now(),
              distance: distToSignal / 1000 // meters to km（玩家波到信号的距离）
            };
            this.emittedWaves.push(responseWave);
            
            console.log(`Signal ${signal.callsign} resonating at ${wave.freq.toFixed(1)} MHz - Response wave created`);
          }
        }
      }
    }
    
    // 更新响应波纹（检查是否到达玩家）
    for (let i = this.emittedWaves.length - 1; i >= 0; i--) {
      const wave = this.emittedWaves[i];
      if (!(wave as any).signal) continue; // 不是响应波，跳过
      
      // 更新响应波的半径（向玩家扩展）
      wave.r += wave.speed * deltaTime;
      
      const dx = wave.targetX! - wave.x;
      const dy = wave.targetY! - wave.y;
      const distToTarget = Math.sqrt(dx * dx + dy * dy);
      
      // 检查是否到达玩家
      if (wave.r >= distToTarget) {
        // 标记信号为已发现
        (wave as any).signal.discovered = true;
        
        // 在信号位置创建任务道具（如果还没有创建）
        if (!(wave as any).signal.questItemCreated && this.callbacks.spawnItem && (wave as any).signal.x && (wave as any).signal.y) {
          this.callbacks.spawnItem('quest_item', (wave as any).signal.x, (wave as any).signal.y);
          (wave as any).signal.questItemCreated = true;
          if (this.callbacks.logMsg) {
            this.callbacks.logMsg(`QUEST ITEM SPAWNED AT SIGNAL LOCATION`);
          }
        }
        
        // 计算延迟时间（毫秒）
        const delay = (wave.distance! * 2 * 1000) / wave.speed;
        
        // 添加到接收响应
        this.receivedResponses.push({
          signal: (wave as any).signal,
          morse: (wave as any).signal.morseCode,
          delay: delay,
          distance: wave.distance!,
          callsign: (wave as any).signal.callsign,
          strength: (wave as any).signal.receivedStrength,
          frequency: (wave as any).signal.frequency,
          timestamp: Date.now()
        });
        
        // 移除响应波
        this.emittedWaves.splice(i, 1);
        
        console.log(`Received response from ${(wave as any).signal.callsign} - Distance: ${wave.distance!.toFixed(2)} km, Delay: ${delay.toFixed(2)} ms`);
      } else if (wave.r > wave.maxR) {
        // 响应波超出范围，移除
        this.emittedWaves.splice(i, 1);
      }
    }
  }

  /**
   * 生成随机信号
   */
  spawnRandomSignal(): void {
    const types = [SIGNAL_TYPES.SURVIVOR, SIGNAL_TYPES.BEACON];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const messages = [
      'SOS', 'HELP', 'RESCUE', 'ALIVE', 'STRANDED',
      'SUPPLIES', 'SHELTER', 'DANGER', 'EVAC'
    ];
    
    const config = {
      type: type,
      frequency: this.freqMin + Math.random() * (this.freqMax - this.freqMin),
      direction: Math.random() * 360,
      distance: 1 + Math.random() * 9, // 1-10 km
      message: messages[Math.floor(Math.random() * messages.length)],
      callsign: `SURV-${Math.floor(Math.random() * 9000) + 1000}`,
      strength: 30 + Math.random() * 50, // 30-80
      lifespan: 300 + Math.random() * 600 // 5-15分钟
    };
    
    this.addSignal(config);
  }
}
