/**
 * 主应用组件
 * Main Application Component
 * 
 * 集成所有系统，确保场景切换和输入系统正常工作
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameProvider, useGameContext } from '@/contexts/GameContext';
import { InputProvider, useInputContext } from '@/contexts/InputContext';
import { SceneManager } from '@/systems/SceneManager';
import { UIManager } from '@/ui/UIManager';
import { CrtRenderer } from '@/rendering/CrtRenderer';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useScene } from '@/hooks/useScene';
import { SCENES } from '@/types/scenes';
import { INPUT_CONTEXTS, InputEvent as GameInputEvent } from '@/types/systems';
import {
  BootScene,
  CrtOffScene,
  CrtOnScene,
  MonitorMenuScene,
  // 旧场景（将逐步废弃）
  RobotAssemblyScene,
  TacticalRadarScene,
  WideRadarScene,
  SignalProcessingScene,
  EscapeResultScene,
  // 新驾驶相关场景
  DriveScene,
  InventoryScene,
} from '@/scenes';
import { RadioControlPanel } from '@/ui/RadioControlPanel';
import { COCKPIT_CONFIG } from '@/config/gameConfig';

// 内部App组件，可以使用Context
const AppInternal: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    gameState, 
    gameSystem, 
    radioSystem, 
    inventorySystem, 
    cameraSystem,
    initGame,
    isInitialized: gameInitialized 
  } = useGameContext();
  const { inputManager, isInitialized: inputInitialized } = useInputContext();
  const radioPanelRef = useRef<RadioControlPanel | null>(null);
  const radioContainerRef = useRef<HTMLDivElement | null>(null);
  const radioControlsRef = useRef<HTMLDivElement | null>(null);
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const cockpitGimbalRef = useRef<HTMLDivElement | null>(null);

  const [sceneManager] = useState<SceneManager | null>(() => {
    const sm = new SceneManager();
    return sm;
  });

  const [uiManager] = useState<UIManager | null>(() => new UIManager());
  const [crtRenderer, setCrtRenderer] = useState<CrtRenderer | null>(null);
  const [rxTxMode, setRxTxMode] = useState<'RX' | 'TX'>('RX');

  // 初始化CRT渲染器
  useEffect(() => {
    if (canvasRef.current && !crtRenderer) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const crt = new CrtRenderer(canvas, ctx);
        setCrtRenderer(crt);
      }
    }
  }, [crtRenderer]);

  // 初始化游戏系统（当canvas和输入系统都准备好时）
  useEffect(() => {
    if (canvasRef.current && inputInitialized && !gameInitialized) {
      initGame(canvasRef.current);
    }
  }, [canvasRef.current, inputInitialized, gameInitialized, initGame]);

  // 注册场景（当所有依赖都准备好时）
  useEffect(() => {
    if (sceneManager && inputManager && crtRenderer && gameState) {
      // 注册所有场景，注入依赖
      sceneManager.registerScene(
        SCENES.BOOT,
        new BootScene(inputManager, sceneManager, crtRenderer)
      );
      sceneManager.registerScene(
        SCENES.CRT_OFF,
        new CrtOffScene(inputManager, sceneManager, gameState)
      );
      sceneManager.registerScene(
        SCENES.CRT_ON,
        new CrtOnScene(inputManager, sceneManager, crtRenderer)
      );
      sceneManager.registerScene(
        SCENES.MONITOR_MENU,
        new MonitorMenuScene(inputManager, sceneManager, crtRenderer, gameState)
      );

      // 新驾驶相关场景
      sceneManager.registerScene(
        SCENES.DRIVE,
        new DriveScene(inputManager, sceneManager, gameState, cameraSystem || undefined)
      );
      sceneManager.registerScene(
        SCENES.INVENTORY,
        new InventoryScene(inputManager, sceneManager, gameState, cameraSystem || undefined)
      );

      // 设置初始场景（启动界面）
      sceneManager.switchScene(SCENES.BOOT);
      
      console.log('All scenes registered and initialized');
    }
  }, [sceneManager, inputManager, crtRenderer, gameState, inventorySystem, radioSystem]);

  // 设置输入路由 - 将InputManager的事件连接到场景的handleInput
  useEffect(() => {
    if (inputManager && sceneManager) {
      // 全局输入处理(所有场景)
      const handleKeyDown = (event: GameInputEvent) => {
        const currentScene = sceneManager?.getScene(sceneManager.getCurrentScene());
        if (currentScene && currentScene.handleInput) {
          // 传递增强的事件对象，包含 action 信息
          currentScene.handleInput(event);
        }
      };

      const handleKeyUp = (_event: GameInputEvent) => {
        // 处理keyup事件（如果需要）
      };

      const handleMouseMove = (event: GameInputEvent) => {
        // 光标跟随：传递给 CameraSystem（Drive 模式下画面随鼠标旋转）
        if (cameraSystem && event.x !== undefined && event.y !== undefined) {
          cameraSystem.setMousePosition(event.x, event.y);
        }
        // 更新鼠标状态(用于游戏场景)
        if (gameState && canvasRef.current && event.x !== undefined && event.y !== undefined) {
          const rect = canvasRef.current.getBoundingClientRect();
          const canvasX = event.x - rect.left;
          const canvasY = event.y - rect.top;

          if (gameSystem) {
            gameSystem.updateMousePosition(canvasX, canvasY);
          }
        }
      };

      // 注册回调
      inputManager.on('onKeyDown', null, handleKeyDown);
      inputManager.on('onKeyUp', null, handleKeyUp);
      inputManager.on('onMouseMove', null, handleMouseMove);

      // 设置初始输入上下文（BOOT场景使用CRT_CONTROL上下文）
      inputManager.setContext(INPUT_CONTEXTS.CRT_CONTROL);

      // 清理函数
      return () => {
        inputManager.off('onKeyDown', null, handleKeyDown);
        inputManager.off('onKeyUp', null, handleKeyUp);
        inputManager.off('onMouseMove', null, handleMouseMove);
      };
    }
  }, [inputManager, sceneManager, gameState, gameSystem, cameraSystem]);

  // 初始化RadioControlPanel
  useEffect(() => {
    if (radioContainerRef.current && radioControlsRef.current && radioSystem && !radioPanelRef.current) {
      radioPanelRef.current = new RadioControlPanel(radioSystem);
      radioPanelRef.current.init(radioContainerRef.current, radioControlsRef.current);
    }

    return () => {
      // 清理
      if (radioPanelRef.current) {
        const panel = radioPanelRef.current;
        if (panel.container && panel.container.parentNode) {
          panel.container.parentNode.removeChild(panel.container);
        }
        if (panel.controlsContainer && panel.controlsContainer.parentNode) {
          panel.controlsContainer.parentNode.removeChild(panel.controlsContainer);
        }
        radioPanelRef.current = null;
      }
    };
  }, [radioSystem]);

  useScene({
    initialScene: SCENES.BOOT,
    sceneManager,
  });

  // 游戏循环
  useGameLoop({
    onUpdate: (deltaTime: number) => {
      // 更新游戏系统
      if (gameSystem && gameState) {
        gameSystem.update(deltaTime);
      }

      // 更新相机系统（管理不同模式下的相机状态与过渡）
      if (cameraSystem && gameState) {
        cameraSystem.update(deltaTime, gameState);
      }

      // 更新无线电系统
      if (radioSystem) {
        radioSystem.update(deltaTime);
      }

      // 更新场景管理器
      if (sceneManager) {
        sceneManager.update(deltaTime);
      }

      // 更新UI管理器
      if (uiManager) {
        uiManager.update(deltaTime);
      }

      // 更新CRT渲染器
      if (crtRenderer) {
        crtRenderer.update(deltaTime);
      }
    },
    onRender: () => {
      // 每帧同步页面级相机 transform 到 DOM（不依赖 React 重渲染）
      if (pageRootRef.current && cameraSystem) {
        pageRootRef.current.style.transform = cameraSystem.getPageTransform();
      }
      // 云台 transform（光标跟随）也需每帧更新，否则 React 不重渲染时 gimbal 不随鼠标动
      if (cockpitGimbalRef.current && cameraSystem) {
        cockpitGimbalRef.current.style.transform = cameraSystem.getGimbalTransform();
      }

      // 渲染场景
      if (canvasRef.current && sceneManager && crtRenderer) {
        // 使用 crtRenderer 的 canvas 和 ctx，确保一致性
        const canvas = crtRenderer.canvas;
        const ctx = crtRenderer.ctx;
        if (canvas && ctx) {
          crtRenderer.render(() => {
            sceneManager.render(ctx, canvas);
          });
        }
      } else if (canvasRef.current && sceneManager) {
        // 如果没有 crtRenderer，直接渲染
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          sceneManager.render(ctx, canvas);
        }
      }
    },
    enabled: inputInitialized && gameInitialized,
  });

  const pageTransform =
    cameraSystem ? cameraSystem.getPageTransform() : 'none';
  const gimbalTransform =
    cameraSystem ? cameraSystem.getGimbalTransform() : 'rotateX(0deg) rotateY(0deg)';

  const ui = COCKPIT_CONFIG.uiLayers;
  const cockpitVars = {
    '--cockpit-sonar-translateZ': `${ui.sonar.translateZ}px`,
    '--cockpit-sonar-rotateX': `${ui.sonar.rotateX}deg`,
    '--cockpit-sonar-rotateY': `${ui.sonar.rotateY}deg`,
    '--cockpit-bottom-rotateX': `${ui.cockpitBottom.rotateX}deg`,
    '--cockpit-dashboard-translateZ': `${ui.dashboard.translateZ}px`,
    '--cockpit-dashboard-rotateY': `${ui.dashboard.rotateY}deg`,
    '--cockpit-radio-translateZ': `${ui.radio.translateZ}px`,
    '--cockpit-radio-rotateY': `${ui.radio.rotateY}deg`,
    '--cockpit-driving-translateZ': `${ui.driving.translateZ}px`,
    '--cockpit-driving-rotateY': `${ui.driving.rotateY}deg`,
    '--cockpit-steering-translateZ': `${ui.steering.translateZ}px`,
    '--cockpit-steering-rotateX': `${ui.steering.rotateX}deg`,
    '--cockpit-steering-translateY': `${ui.steering.translateY}px`,
    '--cockpit-steering-width': `${ui.steering.width}px`,
    '--cockpit-steering-height': `${ui.steering.height}px`,
    '--cockpit-steering-bottom': `${ui.steering.bottom}px`,
  } as React.CSSProperties;

  return (
    <div
      id="perspective-root"
      style={{
        width: '100%',
        height: '100%',
        perspective: '1200px',
        perspectiveOrigin: 'center center',
        overflow: 'hidden',
        ...cockpitVars,
      }}
    >
      <div
        ref={pageRootRef}
        id="page-root"
        style={{
          width: '100%',
          height: '100%',
          transform: pageTransform,
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
        }}
      >
      <div id="workstation-container">
        {/* 云台：仅 rotateX/rotateY 光标跟随，无 overflow，3D 视差由兄弟元素实现 */}
        <div
          ref={cockpitGimbalRef}
          id="cockpit-gimbal"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: gimbalTransform,
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
          }}
        >
          {/* 1. 挡风玻璃声纳（最远，absolute） */}
          <div id="cockpit-sonar-wrap" className="cockpit-layer cockpit-sonar">
            <div id="crt-monitor-container">
              <div id="monitor-frame">
                <div id="monitor-screen">
                  <canvas ref={canvasRef} id="gameCanvas" />
                  {/* 声纳 HUD 提示（静态） */}
                  <div id="sonar-hud">
                    <div>SYS.ACTIVE // A.E.S RADAR</div>
                    <div>LAT: UNKNOWN</div>
                    <div>LON: UNKNOWN</div>
                  </div>

                  {/* 声纳同心网格（静态，无动画） */}
                  <div id="sonar-grid">
                    <div className="sonar-circle" />
                    <div className="sonar-circle" />
                    <div className="sonar-circle" />
                    <div className="sonar-line sonar-line-h" />
                    <div className="sonar-line sonar-line-v" />
                  </div>

                  {/* Wide Radar Display (for WideRadarScene) */}
                <div id="wide-radar-display" style={{ display: 'none' }}>
                  <div id="radar-map-container">
                    <div className="radar-header">RADAR MAP</div>
                    <canvas id="radar-canvas" />
                  </div>
                </div>

                {/* Signal Processing Display (for SignalProcessingScene) */}
                <div id="signal-processing-display" style={{ display: 'none' }}>
                  <div id="morse-reference" />
                  <div id="decode-input" />
                </div>

                {/* Assembly Scene UI */}
                <div id="assembly-container" style={{ display: 'none' }}>
                  <div className="assembly-layout">
                    <div className="warehouse-panel">
                      <h3>WAREHOUSE</h3>
                      <div id="warehouse-grid" className="item-grid warehouse-grid" />
                    </div>
                    <div className="robot-panel">
                      <div className="robot-diagram">
                        <canvas id="robot-canvas" width="300" height="400" />
                      </div>
                      <div className="robot-inventory-section">
                        <h4>ROBOT INVENTORY</h4>
                        <div id="robot-inventory-grid" className="item-grid robot-inv-grid" />
                      </div>
                    </div>
                    <div className="instructions-panel">
                      <h3>MISSION BRIEFING</h3>
                      <div id="instructions-list" className="instructions-scroll" />
                      <button id="btn-departure" className="departure-btn">
                        DEPARTURE
                      </button>
                    </div>
                  </div>
                </div>

                {/* CRT Effects Layer */}
                <div className="crt-glare" />
                <div className="crt-phosphor" />
              </div>
              {/* Power Indicator */}
              <div className="power-indicator off" />
            </div>
          </div>
          </div>

          {/* 2. 中控台基座（absolute，含仪表盘、收音机、驾驶台） */}
          <div id="cockpit-bottom" className="cockpit-layer cockpit-base" style={{ display: 'none' }}>
            {/* 左侧：车辆状态仪表盘 */}
            <div id="cockpit-dashboard" className="ref-dashboard">
              <div className="ref-gauge-grid">
                <div className="ref-gauge" data-color="blue">
                  <span className="ref-gauge-icon">◆</span>
                  <div className="ref-gauge-bar"><div className="ref-gauge-fill" style={{ width: '75%' }} /></div>
                  <span className="ref-gauge-label">HULL</span>
                  <span className="ref-gauge-value">75/100</span>
                </div>
                <div className="ref-gauge" data-color="red">
                  <span className="ref-gauge-icon">♥</span>
                  <div className="ref-gauge-bar"><div className="ref-gauge-fill" style={{ width: '90%' }} /></div>
                  <span className="ref-gauge-label">HP</span>
                  <span className="ref-gauge-value">90/100</span>
                </div>
                <div className="ref-gauge" data-color="yellow">
                  <span className="ref-gauge-icon">▣</span>
                  <div className="ref-gauge-bar"><div className="ref-gauge-fill" style={{ width: '40%' }} /></div>
                  <span className="ref-gauge-label">BATT</span>
                  <span className="ref-gauge-value">40/100</span>
                </div>
                <div className="ref-gauge" data-color="orange">
                  <span className="ref-gauge-icon">⛽</span>
                  <div className="ref-gauge-bar"><div className="ref-gauge-fill" style={{ width: '25%' }} /></div>
                  <span className="ref-gauge-label">FUEL</span>
                  <span className="ref-gauge-value">25/100</span>
                </div>
              </div>
              <div className="ref-speedometer">
                <span className="ref-speed-label">KM/H</span>
                <span className="ref-speed-value">0</span>
              </div>
            </div>

            {/* 中部：车载收音机 */}
            <div id="cockpit-console" className="ref-radio-wrap">
              <div id="radio-transceiver" ref={radioContainerRef} />
            </div>

            {/* 右侧：档位、踏板、SONAR PING */}
            <div id="cockpit-driving-ui" className="ref-driving">
              <div className="ref-drive-label">DRIVE_SYS</div>
              <div className="ref-gear-row">
                <span className="ref-gear">P</span>
                <span className="ref-gear">R</span>
                <span className="ref-gear">N</span>
                <span className="ref-gear ref-gear-active">D</span>
              </div>
              <div className="ref-pedals">
                <div className="ref-pedal">
                  <div className="ref-pedal-bar"><div className="ref-pedal-fill ref-pedal-brake" /></div>
                  <span className="ref-pedal-label">BRK</span>
                </div>
                <div className="ref-pedal">
                  <div className="ref-pedal-bar"><div className="ref-pedal-fill ref-pedal-throttle" /></div>
                  <span className="ref-pedal-label">THR</span>
                </div>
              </div>
              <div id="radio-controls" ref={radioControlsRef} className="ref-radio-controls" />
              <button
                className={`ref-sonar-btn ref-rxtx-btn ${rxTxMode === 'TX' ? 'ref-rxtx-tx' : ''}`}
                onClick={() => setRxTxMode((m) => (m === 'RX' ? 'TX' : 'RX'))}
              >
                <span className="ref-rxtx-led" />
                {rxTxMode}
              </button>
            </div>

          </div>

          {/* 3. 方向盘（最近，absolute，Boot/Menu 时隐藏） */}
          <div id="cockpit-steering" className="ref-steering cockpit-layer cockpit-steering" style={{ display: 'none' }} />
        </div>
      </div>

      {/* Edge Glow Effect (for low energy/grabbed state) */}
      <div id="edge-glow" />

      {/* World UI Container (for in-game overlays) */}
      <div id="world-ui-container" />

      {/* Inventory UI */}
      <div id="inventory-container" style={{ display: 'none' }} />
      </div>
    </div>
  );
};

// 带Provider的App组件
const AppWithProviders: React.FC = () => {
  return (
    <GameProvider>
      <InputProvider>
        <AppInternal />
      </InputProvider>
    </GameProvider>
  );
};

export default AppWithProviders;
