/**
 * 广域雷达渲染器（原RadarMap）
 * Wide Radar Renderer (formerly RadarMap)
 */

import { IRadioSystem } from '@/types/systems';
import { CFG } from '@/config/gameConfig';

interface IRadioSignal {
  id: string;
  type: string;
  frequency: number;
  direction: number;
  distance: number;
  callsign: string;
  discovered: boolean;
  x: number | null;
  y: number | null;
}

interface IWave {
  id: string;
  x: number;
  y: number;
  r: number;
  maxR: number;
  speed: number;
  freq: number;
  emitTime: number;
  signal?: IRadioSignal;
}

interface IMarker {
  x: number;
  y: number;
  signal?: IRadioSignal;
  label?: string;
}

interface IPingWave {
  radius: number;
  alpha: number;
}

export class WideRadarRenderer {
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  radio: IRadioSystem | null = null;
  scale: number = 50;
  centerX: number = 0;
  centerY: number = 0;
  markers: IMarker[] = [];
  pingWaves: IPingWave[] = [];
  waves: IWave[] = [];
  scanAngle: number = 0;
  blinkTimer: number = 0;
  showMarkers: boolean = true;

  constructor(canvas: HTMLCanvasElement | null = null, radioSystem?: IRadioSystem | null) {
    this.canvas = canvas;
    this.radio = radioSystem || null;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.centerX = canvas.width / 2;
      this.centerY = canvas.height / 2;
    }
  }

  /**
   * 更新雷达状态
   */
  update(deltaTime: number): void {
    // Update scan line rotation
    this.scanAngle += deltaTime * 30; // 30 degrees per second
    if (this.scanAngle >= 360) {
      this.scanAngle -= 360;
    }
    
    // Update blink timer for markers
    this.blinkTimer += deltaTime;
    if (this.blinkTimer >= 0.5) {
      this.showMarkers = !this.showMarkers;
      this.blinkTimer = 0;
    }
    
    // Update ping waves
    for (let i = this.pingWaves.length - 1; i >= 0; i--) {
      const wave = this.pingWaves[i];
      wave.radius += deltaTime * 200; // Expand at 200 pixels/second
      wave.alpha -= deltaTime * 0.5;  // Fade out
      
      if (wave.alpha <= 0) {
        this.pingWaves.splice(i, 1);
      }
    }
    
    // Sync waves with radioSystem
    if (this.radio && 'emittedWaves' in this.radio) {
      this.waves = (this.radio as { emittedWaves: IWave[] }).emittedWaves || [];
    }
  }

  /**
   * 渲染雷达地图
   */
  render(): void {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    
    // Draw grid
    this.drawGrid();
    
    // Draw range circles
    this.drawRangeCircles();
    
    // Draw signal sources
    this.drawSignalSources();
    
    // Draw scan line
    this.drawScanLine();
    
    // Draw antenna direction
    this.drawAntenna();
    
    // Draw waves
    this.drawWaves();
    
    // Draw ping waves
    this.drawPingWaves();
    
    // Draw markers
    this.drawMarkers();
    
    // Draw center point (shelter)
    this.drawCenter();
    
    // Draw compass labels
    this.drawCompassLabels();
  }

  /**
   * Draw grid lines
   */
  private drawGrid(): void {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    const gridSpacing = 50;
    for (let x = 0; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Center cross
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.centerX, 0);
    ctx.lineTo(this.centerX, h);
    ctx.moveTo(0, this.centerY);
    ctx.lineTo(w, this.centerY);
    ctx.stroke();
  }

  /**
   * Draw range circles
   */
  private drawRangeCircles(): void {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    
    // 计算雷达地图能显示的最大范围（基于世界地图）
    let maxRangeKm = 10; // 默认10km
    if (typeof CFG !== 'undefined' && CFG.mapScale && typeof CFG.mapScale === 'number') {
      // 假设有一个主canvas，这里使用当前canvas作为参考
      const worldMapRadius = (this.canvas.width * CFG.mapScale) / 2; // 世界地图半径（米）
      maxRangeKm = worldMapRadius / 1000; // 转换为km
    }
    
    // 绘制范围圆圈，步进为最大范围的1/5
    const step = Math.max(1, Math.floor(maxRangeKm / 5)); // 至少1km步进
    for (let range = step; range <= maxRangeKm; range += step) {
      const radius = range * this.scale;
      
      // 只绘制在canvas范围内的圆圈
      if (radius > Math.max(this.canvas.width, this.canvas.height) / 2) break;
      
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw range label
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${range.toFixed(1)}km`, this.centerX, this.centerY - radius - 5);
    }
  }

  /**
   * Draw signal sources
   */
  private drawSignalSources(): void {
    if (!this.ctx || !this.radio) return;
    
    const ctx = this.ctx;
    
    // 获取信号列表
    const signals = ('signals' in this.radio) ? (this.radio as { signals: IRadioSignal[] }).signals : [];
    const shelterX = ('shelterX' in this.radio) ? (this.radio as { shelterX: number }).shelterX : 0;
    const shelterY = ('shelterY' in this.radio) ? (this.radio as { shelterY: number }).shelterY : 0;
    
    // Draw only discovered signal sources on the radar
    for (const signal of signals) {
      if (!signal.discovered) continue; // Only show discovered signals
      if (!signal.x || !signal.y) continue; // Skip signals without coordinates
      
      // Convert world coordinates to radar coordinates
      const dx = signal.x - shelterX;
      const dy = signal.y - shelterY;
      const distance = Math.sqrt(dx * dx + dy * dy) / 1000; // meters to km
      const angle = Math.atan2(dy, dx);
      
      const radarX = this.centerX + Math.cos(angle) * distance * this.scale;
      const radarY = this.centerY + Math.sin(angle) * distance * this.scale;
      
      // Draw signal indicator (pulsing dot)
      const pulsePhase = (Date.now() / 500) % 1;
      const pulseSize = 3 + Math.sin(pulsePhase * Math.PI * 2) * 1.5;
      
      // Color based on signal type
      let color = '#ffff00'; // Default yellow
      if (signal.type === 'astronaut') color = '#ff00ff'; // Magenta
      else if (signal.type === 'beacon') color = '#00ffff'; // Cyan
      
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      
      ctx.beginPath();
      ctx.arc(radarX, radarY, pulseSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Draw frequency label (small text)
      ctx.fillStyle = color;
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${signal.frequency.toFixed(1)}`, radarX, radarY - 8);
    }
  }

  /**
   * Draw rotating scan line
   */
  private drawScanLine(): void {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const angle = this.scanAngle * Math.PI / 180;
    const maxRadius = Math.max(this.canvas.width, this.canvas.height);
    
    // Create gradient for scan line
    const gradient = ctx.createLinearGradient(
      this.centerX,
      this.centerY,
      this.centerX + Math.cos(angle) * maxRadius,
      this.centerY + Math.sin(angle) * maxRadius
    );
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(
      this.centerX + Math.cos(angle) * maxRadius,
      this.centerY + Math.sin(angle) * maxRadius
    );
    ctx.stroke();
  }

  /**
   * Draw antenna direction indicator
   */
  private drawAntenna(): void {
    if (!this.ctx || !this.radio) return;
    
    const ctx = this.ctx;
    const antennaAngle = ('antennaAngle' in this.radio) ? (this.radio as { antennaAngle: number }).antennaAngle : 270;
    const angle = antennaAngle * Math.PI / 180;
    const length = 30;
    const beamWidth = 30 * Math.PI / 180; // 30 degree beam width
    
    // Draw beam cone
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.arc(
      this.centerX,
      this.centerY,
      length,
      angle - beamWidth / 2,
      angle + beamWidth / 2
    );
    ctx.closePath();
    ctx.fill();
    
    // Draw antenna direction line
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(
      this.centerX + Math.cos(angle) * length,
      this.centerY + Math.sin(angle) * length
    );
    ctx.stroke();
    
    // Draw arrow head
    const arrowSize = 6;
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(
      this.centerX + Math.cos(angle) * length,
      this.centerY + Math.sin(angle) * length
    );
    ctx.lineTo(
      this.centerX + Math.cos(angle - 2.5) * (length - arrowSize),
      this.centerY + Math.sin(angle - 2.5) * (length - arrowSize)
    );
    ctx.lineTo(
      this.centerX + Math.cos(angle + 2.5) * (length - arrowSize),
      this.centerY + Math.sin(angle + 2.5) * (length - arrowSize)
    );
    ctx.closePath();
    ctx.fill();
    
    // Draw angle text
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.round(antennaAngle)}°`,
      this.centerX,
      this.centerY - 100
    );
  }

  /**
   * Draw ping waves
   */
  private drawPingWaves(): void {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    
    for (const wave of this.pingWaves) {
      ctx.strokeStyle = `rgba(0, 255, 255, ${wave.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Draw signal markers
   */
  private drawMarkers(): void {
    if (!this.ctx || !this.showMarkers || !this.radio) return;
    
    const ctx = this.ctx;
    const shelterX = ('shelterX' in this.radio) ? (this.radio as { shelterX: number }).shelterX : 0;
    const shelterY = ('shelterY' in this.radio) ? (this.radio as { shelterY: number }).shelterY : 0;
    
    for (const marker of this.markers) {
      // Convert world coordinates to radar coordinates
      const dx = marker.x - shelterX;
      const dy = marker.y - shelterY;
      const distance = Math.sqrt(dx * dx + dy * dy) / 1000; // Convert to km
      const angle = Math.atan2(dy, dx);
      
      const radarX = this.centerX + Math.cos(angle) * distance * this.scale;
      const radarY = this.centerY + Math.sin(angle) * distance * this.scale;
      
      // Draw marker
      if (marker.signal) {
        // Signal marker
        ctx.fillStyle = marker.signal.type === 'astronaut' ? '#ff00ff' : '#ffff00';
      } else {
        // Generic marker
        ctx.fillStyle = '#ffffff';
      }
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.arc(radarX, radarY, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Draw label
      ctx.fillStyle = ctx.fillStyle;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const label = marker.signal ? marker.signal.callsign : (marker.label || 'MARK');
      ctx.fillText(label, radarX, radarY - 10);
    }
  }

  /**
   * Draw center point (shelter)
   */
  private drawCenter(): void {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    
    // Draw pulsing center dot
    const pulseSize = 3 + Math.sin(Date.now() / 200) * 2;
    
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, pulseSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Draw label
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHELTER', this.centerX, this.centerY + 20);
  }

  /**
   * Draw compass labels
   */
  private drawCompassLabels(): void {
    if (!this.ctx || !this.canvas) return;
    
    const ctx = this.ctx;
    const radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 30;
    
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // N, E, S, W
    const labels = [
      { text: 'N', angle: -90 },
      { text: 'E', angle: 0 },
      { text: 'S', angle: 90 },
      { text: 'W', angle: 180 }
    ];
    
    for (const label of labels) {
      const angle = label.angle * Math.PI / 180;
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      ctx.fillText(label.text, x, y);
    }
  }

  /**
   * Draw waves
   */
  private drawWaves(): void {
    if (!this.ctx || !this.radio || this.waves.length === 0) return;
    
    const ctx = this.ctx;
    const shelterX = ('shelterX' in this.radio) ? (this.radio as { shelterX: number }).shelterX : 0;
    const shelterY = ('shelterY' in this.radio) ? (this.radio as { shelterY: number }).shelterY : 0;
    
    for (const wave of this.waves) {
      // Convert world coordinates to radar coordinates
      const dx = wave.x - shelterX;
      const dy = wave.y - shelterY;
      const radarX = this.centerX + (dx / 1000) * this.scale;
      const radarY = this.centerY + (dy / 1000) * this.scale;
      
      // Convert radius to radar scale
      const radarR = (wave.r / 1000) * this.scale;
      
      // Calculate alpha based on age
      const age = (Date.now() - wave.emitTime) / 1000; // seconds
      const maxAge = 10; // 10 seconds fade
      const alpha = Math.max(0, 1 - age / maxAge);
      
      // Distinguish player waves from response waves
      if (wave.signal) {
        // Response wave (yellow, going back to player)
        ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.6})`;
      } else {
        // Player wave (cyan)
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.8})`;
      }
      
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Add a marker to the map
   */
  addMarker(x: number, y: number, signal?: IRadioSignal): void {
    this.markers.push({ x, y, signal });
    console.log(`Marker added: ${signal?.callsign || 'Unknown'} at (${x}, ${y})`);
  }

  /**
   * Show ping wave animation
   */
  showPingWave(): void {
    this.pingWaves.push({
      radius: 0,
      alpha: 1.0
    });
  }

  /**
   * Show emitted wave (for visual tracking)
   */
  showEmittedWave(wave: IWave): void {
    // Wave is already in radioSystem.emittedWaves, 
    // which we sync in update() method
    console.log(`Wave visualization added for wave at ${wave.freq} MHz`);
  }

  /**
   * Clear all markers
   */
  clearMarkers(): void {
    this.markers = [];
  }

  /**
   * Resize canvas and update scale
   */
  resize(width: number, height: number): void {
    if (!this.canvas) return;
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    
    // Recalculate scale to match world map
    if (typeof CFG !== 'undefined' && CFG.mapScale && typeof CFG.mapScale === 'number') {
      const worldMapRadius = (this.canvas.width * CFG.mapScale) / 2; // 世界地图半径（米）
      const radarMapRadius = Math.min(width, height) / 2; // 雷达地图半径（像素）
      const worldMapRadiusKm = worldMapRadius / 1000; // 转换为km
      this.scale = radarMapRadius / worldMapRadiusKm; // pixels per km
    }
  }
}
