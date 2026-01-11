/**
 * 游戏主系统
 * Game System
 */

import { IGameSystem } from '@/types/systems';
import { IGameState } from '@/types/game';
import { CFG } from '@/config/gameConfig';
import { IRadioSystem } from '@/types/systems';
import { checkLineOfSight } from '@/utils/collision';
import { isInCone } from '@/utils/vision';
import { screenToWorld } from '@/utils/coordinate';

// 游戏系统回调接口
export interface IGameSystemCallbacks {
  // 实体生成
  spawnEnemy?: () => void;
  spawnItem?: (type: string, x?: number, y?: number, config?: unknown) => void;
  spawnBase?: (x: number, y: number) => void;
  initWalls?: () => void;
  
  // 实体更新
  updatePlayer?: (deltaTime: number) => void;
  updateEnemies?: () => void;
  updateItemsUI?: () => void;
  updateWave?: (wave: unknown, index: number) => void;
  handleWaveToWaveInteraction?: () => void;
  updateBase?: (deltaTime: number) => void;
  updateSignalSources?: (deltaTime: number) => void;
  checkSignalSourceDiscovery?: () => void;
  
  // 工具函数
  logMsg?: (message: string) => void;
}

export class GameSystem implements IGameSystem {
  gameState: IGameState | null = null;
  radioSystem: IRadioSystem | null = null;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  callbacks: IGameSystemCallbacks = {};

  constructor(
    gameState?: IGameState | null,
    radioSystem?: IRadioSystem | null,
    canvas?: HTMLCanvasElement | null,
    callbacks?: IGameSystemCallbacks
  ) {
    this.gameState = gameState || null;
    this.radioSystem = radioSystem || null;
    this.canvas = canvas || null;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
    }
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  /**
   * 初始化游戏系统
   */
  init(): void {
    if (!this.gameState || !this.canvas) {
      console.error('Game state or canvas not set for GameSystem');
      return;
    }

    // 初始化基地位置（地图中心）
    const mapScale = CFG.mapScale || 5;
    const baseX = this.canvas.width * mapScale / 2;
    const baseY = this.canvas.height * mapScale / 2;
    
    // 初始化玩家位置
    const playerOffsetY = 120; // 向上偏移120像素，确保在触发范围外
    this.gameState.p.x = baseX;
    this.gameState.p.y = baseY - playerOffsetY;
    
    const maxEnergy = CFG.maxEnergy || 100;
    this.gameState.p.en = maxEnergy;
    this.gameState.p.isGrabbed = false;
    this.gameState.p.grabberEnemy = null;
    this.gameState.p.struggleProgress = 0;
    this.gameState.p.chargeStartTime = 0;
    this.gameState.p.shouldShowAimLine = false;
    this.gameState.p.overload = 0;
    this.gameState.p.isGrabbingEnemy = null;
    this.gameState.p.aimLineHit = null;
    
    // 清空实体数组
    this.gameState.entities.obstacles = [];
    this.gameState.entities.radiations = [];
    this.gameState.entities.items = [];
    this.gameState.entities.baseEchoes = [];
    
    // 初始化玩家频率
    this.initPlayerFrequency();

    // 初始化墙壁系统
    if (this.callbacks.initWalls) {
      this.callbacks.initWalls();
    }

    // 生成敌人
    const numEnemy = typeof CFG.numEnemy === 'number' ? CFG.numEnemy : 15;
    if (this.callbacks.spawnEnemy) {
      for (let i = 0; i < numEnemy; i++) {
        this.callbacks.spawnEnemy();
      }
    }
    
    // 生成能量瓶
    const numEnergyBottle = typeof CFG.numEnergyBottle === 'number' ? CFG.numEnergyBottle : 25;
    if (this.callbacks.spawnItem) {
      for (let i = 0; i < numEnergyBottle; i++) {
        this.callbacks.spawnItem('energy_bottle');
      }
    }
    
    // 生成信号源
    const storySignals = CFG.storySignals;
    if (storySignals && Array.isArray(storySignals) && storySignals.length > 0) {
      const spawnItem = this.callbacks.spawnItem;
      if (spawnItem) {
        storySignals.forEach((signalConfig: any) => {
          // 计算信号源的世界坐标
          const angleRad = (signalConfig.direction || 0) * Math.PI / 180;
          const distanceMeters = (signalConfig.distance || 0) * 1000;
          const signalX = baseX + Math.cos(angleRad) * distanceMeters;
          const signalY = baseY - Math.sin(angleRad) * distanceMeters;
          
          // 生成信号源物品
          spawnItem('signal_source', signalX, signalY, {
            frequency: signalConfig.frequency,
            message: signalConfig.message || '',
            callsign: signalConfig.callsign || `SIGNAL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            strength: signalConfig.strength || 50,
            waveEmitInterval: 5.0  // 每5秒发射一次
          });
        });
      }
    }
    
    // 初始化相机位置为玩家位置
    this.gameState.camera.x = this.gameState.p.x;
    this.gameState.camera.y = this.gameState.p.y;
    
    // 初始化基地（在地图中心）
    if (this.callbacks.spawnBase) {
      this.callbacks.spawnBase(baseX, baseY);
    }
  }

  /**
   * 初始化玩家频率为核心范围中点
   */
  initPlayerFrequency(): void {
    if (!this.gameState) return;
    
    const core = this.gameState.p.currentCore;
    this.gameState.freq = (core.freqMin + core.freqMax) / 2;
    
    // 同步到无线电系统
    if (this.radioSystem) {
      this.radioSystem.setFrequencyRange(core.freqMin, core.freqMax);
      this.radioSystem.syncWithRobotFrequency(this.gameState.freq);
    }
  }

  /**
   * 调整玩家频率（同时同步到无线电）
   */
  adjustPlayerFrequency(delta: number, isFine: boolean = false): void {
    if (!this.gameState) return;
    
    const step = isFine ? 1 : 5; // shift键精调（±1Hz），否则粗调（±5Hz）
    const core = this.gameState.p.currentCore;
    
    this.gameState.freq += delta * step;
    this.gameState.freq = Math.max(core.freqMin, Math.min(core.freqMax, this.gameState.freq));
    this.gameState.freq = Math.round(this.gameState.freq * 10) / 10;
    
    // 同步到无线电
    if (this.radioSystem) {
      this.radioSystem.syncWithRobotFrequency(this.gameState.freq);
    }
  }

  /**
   * 更新相机位置（跟随玩家）
   */
  updateCamera(): void {
    if (!this.gameState) return;
    
    const targetX = this.gameState.p.x;
    const targetY = this.gameState.p.y;
    
    const cameraSmoothing = CFG.cameraSmoothing !== false;
    if (cameraSmoothing) {
      // 平滑跟随
      const cameraFollowSpeed = CFG.cameraFollowSpeed || 0.1;
      const dx = targetX - this.gameState.camera.x;
      const dy = targetY - this.gameState.camera.y;
      this.gameState.camera.x += dx * cameraFollowSpeed;
      this.gameState.camera.y += dy * cameraFollowSpeed;
    } else {
      // 直接跟随
      this.gameState.camera.x = targetX;
      this.gameState.camera.y = targetY;
    }
  }

  /**
   * 更新物品可见性
   */
  updateItemsVisibility(): void {
    if (!this.gameState) return;
    
    this.gameState.entities.items.forEach(item => {
      if (item.visibleTimer > 0) item.visibleTimer--;
      
      // 检查是否在视野内（使用 isInCone 工具函数）
      if (isInCone(
        item.x,
        item.y,
        this.gameState!.p.x,
        this.gameState!.p.y,
        this.gameState!.p.a
      )) {
        // 在视野内，检查视线
        // 将 IObstacle[] 转换为 IWall[] 格式
        const walls = this.gameState!.entities.obstacles.map(obs => ({
          x: obs.x,
          y: obs.y,
          w: obs.width,
          h: obs.height
        }));
        if (checkLineOfSight(
          this.gameState!.p.x,
          this.gameState!.p.y,
          item.x,
          item.y,
          walls
        )) {
          item.visibleTimer = 10; // 只要在视野里，就保持可见
        }
      }
    });
  }

  /**
   * 更新粒子和回声
   */
  updateParticlesAndEchoes(): void {
    if (!this.gameState) return;
    
    // 更新粒子
    this.gameState.entities.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    this.gameState.entities.particles = this.gameState.entities.particles.filter(p => p.life > 0);
    
    // 更新回声
    this.gameState.entities.echoes.forEach(e => {
      e.life -= 0.015;
    });
    this.gameState.entities.echoes = this.gameState.entities.echoes.filter(e => e.life > 0);
    
    // 更新墙壁回声
    this.gameState.entities.wallEchoes.forEach(we => {
      we.life -= 0.02;
    });
    this.gameState.entities.wallEchoes = this.gameState.entities.wallEchoes.filter(we => we.life > 0);
    
    // 更新基地轮廓
    if (this.gameState.entities.baseEchoes) {
      this.gameState.entities.baseEchoes.forEach(be => {
        be.life -= 0.02;
      });
      this.gameState.entities.baseEchoes = this.gameState.entities.baseEchoes.filter(be => be.life > 0);
    }
  }

  /**
   * 更新游戏系统
   */
  update(deltaTime: number): void {
    if (!this.gameState) return;
    
    // 更新玩家
    if (this.callbacks.updatePlayer) {
      this.callbacks.updatePlayer(deltaTime);
    }
    
    // 更新相机
    this.updateCamera();
    
    // 更新物品可见性
    this.updateItemsVisibility();

    // 处理波纹与波纹的交互（弹反波吞噬敌方波纹）
    // 在波纹位置更新前调用，优先处理波与波的抵消
    if (this.callbacks.handleWaveToWaveInteraction) {
      this.callbacks.handleWaveToWaveInteraction();
    }

    // 更新波纹（标记-清理模式避免重叠）
    // 第一遍：更新所有波纹，标记需要删除的
    if (this.callbacks.updateWave) {
      for (let i = 0; i < this.gameState.entities.waves.length; i++) {
        this.callbacks.updateWave(this.gameState.entities.waves[i], i);
      }
    }
    // 第二遍：清理标记为删除的波纹
    this.gameState.entities.waves = this.gameState.entities.waves.filter(
      (w: any) => !w._toRemove
    );
    
    // 更新天线系统：检测反弹波
    if (this.gameState.antennaSystem) {
      // 更新天线方向（跟随玩家朝向）
      this.gameState.antennaSystem.updateDirection(this.gameState.p.a);
      
      // 检测反弹波
      const reflections = this.gameState.antennaSystem.detectReflectedWaves(
        this.gameState.entities.waves,
        this.gameState.p.x,
        this.gameState.p.y
      );
      
      // 将反弹波记录到SLAM系统
      if (this.gameState.slamSystem && reflections.length > 0) {
        this.gameState.slamSystem.addPointsFromReflections(reflections);
      }
    }
    
    // 更新信号源（5.2：信号源定期释放波纹）
    if (this.callbacks.updateSignalSources) {
      this.callbacks.updateSignalSources(deltaTime);
    }
    
    // 检查信号源是否被天线发现（5.2）
    if (this.callbacks.checkSignalSourceDiscovery) {
      this.callbacks.checkSignalSourceDiscovery();
    }
    
    // 更新敌人和物品UI
    if (this.callbacks.updateEnemies) {
      this.callbacks.updateEnemies();
    }
    if (this.callbacks.updateItemsUI) {
      this.callbacks.updateItemsUI();
    }
    
    // 更新基地
    if (this.callbacks.updateBase) {
      this.callbacks.updateBase(deltaTime);
    }
    
    // 更新粒子和回声
    this.updateParticlesAndEchoes();
    
    // 更新消息计时器
    if (this.gameState.messageTimer > 0) {
      this.gameState.messageTimer--;
      if (this.gameState.messageTimer <= 0) {
        this.gameState.currentMessage = '';
      }
    }
  }

  /**
   * 初始化全局变量（canvas, ctx等）
   */
  initGlobals(
    canvas: HTMLCanvasElement,
    _uiContainer?: HTMLElement | null,
    _edgeGlow?: HTMLElement | null
  ): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Get monitor screen container for sizing
    const monitorScreen = document.getElementById('monitor-screen');
    
    if (monitorScreen) {
      // Size canvas to fit monitor (60% of screen)
      canvas.width = monitorScreen.clientWidth;
      canvas.height = monitorScreen.clientHeight;
    } else {
      // Fallback to full screen
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    console.log(`Canvas sized: ${canvas.width}x${canvas.height}`);
  }

  /**
   * 更新鼠标位置（从屏幕坐标转换为世界坐标）
   */
  updateMousePosition(canvasX: number, canvasY: number): void {
    if (!this.gameState || !this.canvas) return;
    
    const worldPos = screenToWorld(
      canvasX,
      canvasY,
      this.gameState.camera.x,
      this.gameState.camera.y,
      this.canvas
    );
    this.gameState.mouse.x = worldPos.x;
    this.gameState.mouse.y = worldPos.y;
  }
}
