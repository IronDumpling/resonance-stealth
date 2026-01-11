/**
 * 广域雷达UI（管理雷达地图的DOM和渲染器）
 * Wide Radar UI (manages radar map DOM and renderer)
 */

import { IRadioSystem } from '@/types/systems';
import { WideRadarRenderer } from '@/rendering/WideRadarRenderer';
import { CFG } from '@/config/gameConfig';

export class WideRadarUI {
  radioSystem: IRadioSystem | null = null;
  container: HTMLElement | null = null;
  radarRenderer: WideRadarRenderer | null = null;
  isVisible: boolean = false;

  constructor(radioSystem?: IRadioSystem | null) {
    this.radioSystem = radioSystem || null;
  }

  /**
   * 初始化广域雷达UI
   */
  init(): void {
    this.container = document.getElementById('wide-radar-display');
    
    if (!this.container) {
      console.error('Wide radar display container not found!');
      return;
    }
    
    // 初始化雷达渲染器
    this.initRadarRenderer();
    
    console.log('Wide Radar UI initialized');
  }

  /**
   * 初始化雷达渲染器
   */
  private initRadarRenderer(): void {
    const radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
    const radarContainer = document.getElementById('radar-map-container');
    
    if (!radarCanvas || !radarContainer) {
      console.error('Radar canvas or container not found!');
      return;
    }
    
    // Set canvas size
    const headerHeight = 30; // radar-header的高度
    radarCanvas.width = radarContainer.clientWidth;
    radarCanvas.height = radarContainer.clientHeight - headerHeight;
    
    // Create radar renderer instance
    this.radarRenderer = new WideRadarRenderer(radarCanvas, this.radioSystem || undefined);
    
    // 确保radar map的中心点正确设置
    if (this.radarRenderer) {
      this.radarRenderer.centerX = radarCanvas.width / 2;
      this.radarRenderer.centerY = radarCanvas.height / 2;
      
      // 计算雷达地图的scale，使其与世界地图匹配
      if (typeof CFG !== 'undefined' && CFG.mapScale && typeof CFG.mapScale === 'number') {
        // 从主canvas获取世界地图尺寸
        const mainCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
        if (mainCanvas) {
          const worldMapRadius = (mainCanvas.width * CFG.mapScale) / 2; // 世界地图半径（米）
          const radarMapRadius = Math.min(radarCanvas.width, radarCanvas.height) / 2; // 雷达地图半径（像素）
          const worldMapRadiusKm = worldMapRadius / 1000; // 转换为km
          this.radarRenderer.scale = radarMapRadius / worldMapRadiusKm; // pixels per km
          console.log(`Radar map scale calculated: ${this.radarRenderer.scale.toFixed(2)} pixels/km`);
        }
      }
    }
    
    console.log('Radar map initialized:', radarCanvas.width, 'x', radarCanvas.height);
  }

  /**
   * 显示UI
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * 隐藏UI
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * 更新UI
   */
  update(deltaTime: number): void {
    if (!this.isVisible || !this.radarRenderer) return;
    
    // 更新雷达渲染器
    this.radarRenderer.update(deltaTime);
  }

  /**
   * 渲染雷达地图
   */
  render(): void {
    if (!this.isVisible || !this.radarRenderer) return;
    
    // 渲染雷达地图
    this.radarRenderer.render();
  }

  /**
   * 处理窗口大小变化
   */
  resize(): void {
    if (!this.radarRenderer) return;
    
    const radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement | null;
    const radarContainer = document.getElementById('radar-map-container');
    
    if (!radarCanvas || !radarContainer) return;
    
    // 重新设置canvas尺寸
    const headerHeight = 30;
    const newWidth = radarContainer.clientWidth;
    const newHeight = radarContainer.clientHeight - headerHeight;
    
    if (radarCanvas.width !== newWidth || radarCanvas.height !== newHeight) {
      this.radarRenderer.resize(newWidth, newHeight);
    }
  }

  /**
   * 获取雷达渲染器（用于外部访问）
   */
  getRenderer(): WideRadarRenderer | null {
    return this.radarRenderer;
  }
}
