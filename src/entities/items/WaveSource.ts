/**
 * 信号源实体
 * Wave Source Entity
 * 
 * 保留结构，移除业务逻辑
 */

import { BaseEntity } from '../Base';
import { IWaveSource } from '@/types/entities';

export class WaveSource extends BaseEntity implements IWaveSource {
  type: 'signal_source' = 'signal_source';
  visibleTimer: number = 0;
  frequency: number = 0;
  message: string = '';
  callsign: string = '';
  strength: number = 0;
  waveEmitInterval: number = 0;
  lastWaveEmitTime: number = 0;
  waveEmitCount: number = 0;
  discovered: boolean = false;
  morseCode: string = '';
  hintElement: HTMLElement | null = null;

  constructor(
    x: number = 0,
    y: number = 0,
    frequency: number = 0,
    message: string = '',
    callsign: string = '',
    strength: number = 0,
    waveEmitInterval: number = 0
  ) {
    super(x, y);
    this.frequency = frequency;
    this.message = message;
    this.callsign = callsign;
    this.strength = strength;
    this.waveEmitInterval = waveEmitInterval;
  }

  override init(): void {
    // 空实现，保留方法签名
  }

  override update(deltaTime: number): void {
    // 空实现，保留方法签名
  }

  override render(ctx: CanvasRenderingContext2D): void {
    // 空实现，保留方法签名
  }
}
