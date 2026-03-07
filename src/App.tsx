/**
 * 主应用组件
 * Main Application Component
 * 
 * 集成所有系统，确保场景切换和输入系统正常工作
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  DriveScene,
  InventoryScene,
} from '@/scenes';
import { RadioControlPanel } from '@/ui/RadioControlPanel';
import { COCKPIT_CONFIG, INVENTORY_UI_LAYERS } from '@/config/gameConfig';
import type { ISurvivalState } from '@/types/game';
import type { VehicleGear } from '@/types/game';

/** 旋钮组件：RADIO FREQ / ANT DIR / ANT LEN，value 为 0–1 */
const ControlKnob: React.FC<{
  label: string;
  value: number;
  onChange: (delta: number) => void;
}> = ({ label, value, onChange }) => {
  const rot = -135 + value * 270;
  return (
    <div className="ref-control-knob">
      <div
        className="ref-knob-disk"
        style={{ transform: `rotate(${rot}deg)` }}
        onClick={() => onChange(1)}
        onContextMenu={(e) => { e.preventDefault(); onChange(-1); }}
      >
        <div className="ref-knob-indicator" />
      </div>
      <span className="ref-knob-label">{label}</span>
    </div>
  );
};

/** 将生存状态同步到仪表盘 DOM（HULL/HP 条状，BATT/FUEL 表盘，油门刹车条） */
function syncSurvivalDashboard(
  survival: ISurvivalState | null | undefined,
  throttle: number,
  brake: number
): void {
  if (!survival) return;
  const max = 100;
  // HULL / HP 条状
  const hullGauge = document.querySelector('#cockpit-dashboard .ref-gauge[data-gauge="hull"]');
  const hpGauge = document.querySelector('#cockpit-dashboard .ref-gauge[data-gauge="hp"]');
  for (const g of [hullGauge, hpGauge]) {
    if (!g) continue;
    const key = (g as HTMLElement).dataset?.gauge;
    const v = key === 'hull' ? survival.integrity : survival.life;
    const fill = g.querySelector('.ref-gauge-fill') as HTMLElement;
    const valEl = g.querySelector('.ref-gauge-value');
    if (fill) fill.style.width = `${Math.max(0, Math.min(max, v))}%`;
    if (valEl) valEl.textContent = `${Math.round(v)}/${max}`;
  }
  // BATT / FUEL 表盘
  const battNeedle = document.querySelector('.ref-dial-needle[data-dial="batt"]') as HTMLElement;
  const fuelNeedle = document.querySelector('.ref-dial-needle[data-dial="fuel"]') as HTMLElement;
  const battVal = document.querySelector('.ref-dial-gauge[data-dial="batt"] .ref-dial-value');
  const fuelVal = document.querySelector('.ref-dial-gauge[data-dial="fuel"] .ref-dial-value');
  const angle = (v: number) => -135 + (v / max) * 270;
  if (battNeedle) battNeedle.style.transform = `rotate(${angle(survival.battery)}deg)`;
  if (fuelNeedle) fuelNeedle.style.transform = `rotate(${angle(survival.fuel)}deg)`;
  if (battVal) battVal.textContent = String(Math.round(survival.battery));
  if (fuelVal) fuelVal.textContent = String(Math.round(survival.fuel));
  // 油门刹车条
  const thrBar = document.querySelector('.ref-throttle-fill') as HTMLElement;
  const brkBar = document.querySelector('.ref-brake-fill') as HTMLElement;
  const thrVal = document.querySelector('.ref-throttle-value');
  const brkVal = document.querySelector('.ref-brake-value');
  if (thrBar) thrBar.style.width = `${throttle * 100}%`;
  if (brkBar) brkBar.style.width = `${brake * 100}%`;
  if (thrVal) thrVal.textContent = `${Math.round(throttle * 100)}%`;
  if (brkVal) brkVal.textContent = `${Math.round(brake * 100)}%`;
}

// 内部App组件，可以使用Context
const AppInternal: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    gameState, 
    gameSystem, 
    radioSystem, 
    inventorySystem, 
    cameraSystem,
    survivalSystem,
    vehicleSystem,
    initGame,
    isInitialized: gameInitialized 
  } = useGameContext();
  const { inputManager, isInitialized: inputInitialized } = useInputContext();
  const radioPanelRef = useRef<RadioControlPanel | null>(null);
  const radioContainerRef = useRef<HTMLDivElement | null>(null);
  const radioControlsRef = useRef<HTMLDivElement | null>(null);
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const cockpitGimbalRef = useRef<HTMLDivElement | null>(null);
  const cockpitInventorySliderRef = useRef<HTMLDivElement | null>(null);
  const inventoryGimbalRef = useRef<HTMLDivElement | null>(null);

  const [sceneManager] = useState<SceneManager | null>(() => {
    const sm = new SceneManager();
    return sm;
  });

  const [uiManager] = useState<UIManager | null>(() => new UIManager());
  const [crtRenderer, setCrtRenderer] = useState<CrtRenderer | null>(null);
  const [rxTxMode, setRxTxMode] = useState<'RX' | 'TX'>('RX');
  const [isMicPressed, setIsMicPressed] = useState(false);
  const [, setKnobRefresh] = useState(0);
  const gearLeverTrackRef = useRef<HTMLDivElement | null>(null);
  const gearDragRef = useRef<{ active: boolean; startX: number }>({ active: false, startX: 0 });

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
        new InventoryScene(inputManager, sceneManager, gameState, cameraSystem || undefined, inventorySystem || undefined)
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

  // 旋钮显示刷新（radioSystem 状态变化时）；INVENTORY 场景下暂停，避免 React 重渲染清空 TrunkUI 手动添加的 DOM
  useEffect(() => {
    const id = setInterval(() => {
      const scene = sceneManager?.getCurrentScene();
      if (scene === SCENES.INVENTORY) return;
      setKnobRefresh((c) => c + 1);
    }, 100);
    return () => clearInterval(id);
  }, [sceneManager]);

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

  const GEARS: VehicleGear[] = ['P', 'R', 'N', 'D'];
  const handleGearLeverPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      gearDragRef.current = { active: true, startX: e.clientX };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    []
  );
  const handleGearLeverPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!gearDragRef.current.active || !gearLeverTrackRef.current || !gameState || !vehicleSystem) return;
      const track = gearLeverTrackRef.current;
      const rect = track.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const idx = Math.max(0, Math.min(3, Math.round(x * 3)));
      vehicleSystem.setGear(gameState, GEARS[idx]);
    },
    [gameState, vehicleSystem]
  );
  const handleGearLeverPointerUp = useCallback(
    (e: React.PointerEvent) => {
      gearDragRef.current.active = false;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    },
    []
  );
  const handleGearLeverClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!gearLeverTrackRef.current || !gameState || !vehicleSystem) return;
      const track = gearLeverTrackRef.current;
      const rect = track.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const idx = Math.max(0, Math.min(3, Math.round(x * 3)));
      vehicleSystem.setGear(gameState, GEARS[idx]);
    },
    [gameState, vehicleSystem]
  );

  // 游戏循环
  useGameLoop({
    onUpdate: (deltaTime: number) => {
      // 生命归零时显示游戏结束
      if (gameState && survivalSystem && !survivalSystem.isAlive(gameState)) {
        gameState.currentMessage = 'GAME OVER';
        gameState.messageTimer = 999;
      }

      // 同步按键状态到 gameState（供 VehicleSystem 等使用）
      if (inputManager && gameState) {
        gameState.keys.w = inputManager.isKeyDown('w');
        gameState.keys.a = inputManager.isKeyDown('a');
        gameState.keys.s = inputManager.isKeyDown('s');
        gameState.keys.d = inputManager.isKeyDown('d');
        gameState.keys.space = inputManager.isKeyDown('space');
        gameState.keys.e = inputManager.isKeyDown('e');
        gameState.keys.r = inputManager.isKeyDown('r');
        gameState.keys.f = inputManager.isKeyDown('f');
        gameState.keys.shift = inputManager.isKeyDown('shift');
      }

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
      // inventory 面板的鼠标视角轻微转动；inventory 时禁用 gimbal 避免 3D 变换导致点击失效
      if (inventoryGimbalRef.current && cameraSystem && sceneManager) {
        const isInv = sceneManager.getCurrentScene() === SCENES.INVENTORY;
        inventoryGimbalRef.current.style.transform = isInv ? 'none' : cameraSystem.getGimbalTransform();
      }
      // 页面滑块 translateX（cockpit/inventory 滑动，slider 200% 宽，-50% 显示 inventory）
      if (cockpitInventorySliderRef.current && cameraSystem) {
        cockpitInventorySliderRef.current.style.transform = `translateX(${cameraSystem.getContainerTranslateX()}%)`;
      }
      // 同步生存状态到仪表盘（含油门刹车条）
      if (gameState?.survival && gameState?.vehicle) {
        syncSurvivalDashboard(
          gameState.survival,
          gameState.vehicle.throttle,
          gameState.vehicle.brake
        );
      }
      // 同步车辆状态：档位杆、速度表盘
      if (gameState?.vehicle && vehicleSystem) {
        const gear = vehicleSystem.getGear(gameState);
        const speed = Math.abs(vehicleSystem.getSpeed(gameState));
        const gearKnob = document.querySelector('.ref-gear-knob') as HTMLElement;
        if (gearKnob) {
          const idx = ['P', 'R', 'N', 'D'].indexOf(gear);
          const pct = idx >= 0 ? idx / 3 : 0;
          gearKnob.style.left = `calc(${pct * 100}% - 20px)`;
        }
        const speedNeedle = document.querySelector('.ref-dial-needle[data-dial="speed"]') as HTMLElement;
        if (speedNeedle) {
          const angle = -135 + (Math.min(120, speed) / 120) * 270;
          speedNeedle.style.transform = `rotate(${angle}deg)`;
        }
        const speedVal = document.querySelector('.ref-speed-value');
        if (speedVal) speedVal.textContent = String(Math.round(speed));
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
      <div id="cockpit-inventory-view">
        <div
          ref={cockpitInventorySliderRef}
          id="cockpit-inventory-slider"
          style={{
            display: 'flex',
            width: '200%',
            flexShrink: 0,
            height: '100%',
            transformStyle: 'preserve-3d',
          }}
        >
        <div
          id="cockpit-panel"
          style={{
            width: '50%',
            flexShrink: 0,
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
            {/* 左侧：车辆状态仪表盘
                第1行: HULL + HP | 第2行: THROTTLE + BRAKE | 第3行: BATT + FUEL + 速度表盘 */}
            <div id="cockpit-dashboard" className="ref-dashboard">
              <div className="ref-dashboard-row ref-dashboard-row-1">
                <div className="ref-gauge" data-gauge="hull" data-color="blue">
                  <span className="ref-gauge-icon">◆</span>
                  <div className="ref-gauge-bar"><div className="ref-gauge-fill" style={{ width: '75%' }} /></div>
                  <span className="ref-gauge-label">HULL</span>
                  <span className="ref-gauge-value">75/100</span>
                </div>
                <div className="ref-gauge" data-gauge="hp" data-color="red">
                  <span className="ref-gauge-icon">♥</span>
                  <div className="ref-gauge-bar"><div className="ref-gauge-fill" style={{ width: '90%' }} /></div>
                  <span className="ref-gauge-label">HP</span>
                  <span className="ref-gauge-value">90/100</span>
                </div>
              </div>
              <div className="ref-dashboard-row ref-dashboard-row-2">
                <div className="ref-throttle-bar">
                  <div className="ref-bar-header">
                    <span className="ref-bar-label">THROTTLE</span>
                    <span className="ref-throttle-value">0%</span>
                  </div>
                  <div className="ref-bar-track"><div className="ref-throttle-fill ref-bar-fill" /></div>
                </div>
                <div className="ref-brake-bar">
                  <div className="ref-bar-header">
                    <span className="ref-bar-label">BRAKE</span>
                    <span className="ref-brake-value">0%</span>
                  </div>
                  <div className="ref-bar-track"><div className="ref-brake-fill ref-bar-fill" /></div>
                </div>
              </div>
              <div className="ref-dashboard-row ref-dashboard-row-3">
                <div className="ref-dial-gauge" data-dial="batt">
                  <div className="ref-dial-face">
                    <div className="ref-dial-needle" data-dial="batt" />
                  </div>
                  <span className="ref-dial-label">BATT</span>
                  <span className="ref-dial-value ref-gauge-value">40</span>
                </div>
                <div className="ref-dial-gauge" data-dial="fuel">
                  <div className="ref-dial-face">
                    <div className="ref-dial-needle" data-dial="fuel" />
                  </div>
                  <span className="ref-dial-label">FUEL</span>
                  <span className="ref-dial-value ref-gauge-value">25</span>
                </div>
                <div className="ref-speedometer ref-dial-gauge" data-dial="speed">
                  <div className="ref-dial-face ref-speed-dial">
                    <div className="ref-dial-needle" data-dial="speed" />
                  </div>
                  <span className="ref-speed-label">KM/H</span>
                  <span className="ref-speed-value">0</span>
                  <span className="ref-speed-max">120</span>
                </div>
              </div>
            </div>

            {/* 中部：车载收音机 */}
            <div id="cockpit-console" className="ref-radio-wrap">
              <div id="radio-transceiver" ref={radioContainerRef} />
            </div>

            {/* 右侧：档位杆、旋钮、RX/TX 开关、麦克风 */}
            <div id="cockpit-driving-ui" className="ref-driving">
              <div className="ref-drive-label">COMMS & DRIVE</div>
              {/* 档位杆 */}
              <div className="ref-gear-lever-wrap">
                <div className="ref-gear-labels">
                  {GEARS.map((g) => (
                    <span key={g} className="ref-gear-label">{g}</span>
                  ))}
                </div>
                <div
                  ref={gearLeverTrackRef}
                  className="ref-gear-track"
                  onClick={handleGearLeverClick}
                  onPointerDown={handleGearLeverPointerDown}
                  onPointerMove={handleGearLeverPointerMove}
                  onPointerUp={handleGearLeverPointerUp}
                  onPointerLeave={handleGearLeverPointerUp}
                >
                  <div className="ref-gear-track-slot" />
                  <div className="ref-gear-knob" />
                </div>
              </div>
              {/* 三个旋钮 */}
              <div className="ref-knobs-row">
                <ControlKnob
                  label="RADIO FREQ"
                  value={
                    radioSystem
                      ? (radioSystem.currentFrequency - radioSystem.freqMin) /
                        (radioSystem.freqMax - radioSystem.freqMin)
                      : 0.5
                  }
                  onChange={(delta) => radioSystem?.tuneFine(delta)}
                />
                <ControlKnob
                  label="ANT DIR"
                  value={(radioSystem?.antennaAngle ?? 270) / 360}
                  onChange={(delta) => radioSystem?.rotateAntenna(delta * 10)}
                />
                <ControlKnob
                  label="ANT LEN"
                  value={(radioSystem?.antennaLength ?? 50) / 100}
                  onChange={(delta) => {
                    if (radioSystem) {
                      radioSystem.antennaLength = Math.max(
                        0,
                        Math.min(100, radioSystem.antennaLength + delta * 10)
                      );
                    }
                  }}
                />
              </div>
              <div id="radio-controls" ref={radioControlsRef} className="ref-radio-controls" />
              {/* RX/TX 拨动开关 + 麦克风 */}
              <div className="ref-comms-row">
                <div
                  className="ref-rxtx-toggle"
                  onClick={() => setRxTxMode((m) => (m === 'RX' ? 'TX' : 'RX'))}
                  role="switch"
                  aria-checked={rxTxMode === 'TX'}
                >
                  <span className={`ref-rxtx-label ${rxTxMode === 'RX' ? 'ref-rxtx-active' : ''}`}>RX</span>
                  <div className="ref-rxtx-track">
                    <div className={`ref-rxtx-knob ${rxTxMode === 'TX' ? 'ref-rxtx-tx-knob' : ''}`} />
                  </div>
                  <span className={`ref-rxtx-label ${rxTxMode === 'TX' ? 'ref-rxtx-active' : ''}`}>TX</span>
                </div>
                <div className="ref-mic-wrap">
                  <button
                    className={`ref-mic-btn ${isMicPressed ? 'ref-mic-pressed' : ''}`}
                    onPointerDown={() => setIsMicPressed(true)}
                    onPointerUp={() => setIsMicPressed(false)}
                    onPointerLeave={() => setIsMicPressed(false)}
                  >
                    <span className="ref-mic-led" />
                    <span className="ref-mic-text">{isMicPressed ? 'TRANSMITTING' : 'HOLD TO TALK'}</span>
                  </button>
                  <span className="ref-mic-icon" aria-hidden>
                    <span className="ref-mic-circle" />
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. 方向盘（最近，absolute，Boot/Menu 时隐藏） */}
          <div id="cockpit-steering" className="ref-steering cockpit-layer cockpit-steering" style={{ display: 'none' }} />
        </div>
      </div>
        </div>

        {/* Inventory Panel */}
        <div
          id="inventory-panel"
          style={{
            width: '50%',
            flexShrink: 0,
            transformStyle: 'preserve-3d',
            ['--inv-trunk-translateZ' as string]: `${INVENTORY_UI_LAYERS.trunkGrid.translateZ}px`,
            ['--inv-trunk-rotateY' as string]: `${INVENTORY_UI_LAYERS.trunkGrid.rotateY}deg`,
            ['--inv-warehouse-translateZ' as string]: `${INVENTORY_UI_LAYERS.warehousePanel.translateZ}px`,
            ['--inv-warehouse-rotateY' as string]: `${INVENTORY_UI_LAYERS.warehousePanel.rotateY}deg`,
          }}
        >
      {/* Inventory 云台：鼠标移动时 UI 轻微转动 */}
      <div
        ref={inventoryGimbalRef}
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
        }}
      >
      <div id="inventory-container" style={{ display: 'none' }} />
      </div>
        </div>
        </div>

      {/* Edge Glow Effect (for low energy/grabbed state) */}
      <div id="edge-glow" />

      {/* World UI Container (for in-game overlays) */}
      <div id="world-ui-container" />
      </div>
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
