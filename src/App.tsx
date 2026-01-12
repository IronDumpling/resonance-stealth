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
  RobotAssemblyScene,
  TacticalRadarScene,
  WideRadarScene,
  SignalProcessingScene,
  EscapeResultScene,
} from '@/scenes';
import { RadioControlPanel } from '@/ui/RadioControlPanel';

// 内部App组件，可以使用Context
const AppInternal: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    gameState, 
    gameSystem, 
    radioSystem, 
    inventorySystem, 
    initGame,
    isInitialized: gameInitialized 
  } = useGameContext();
  const { inputManager, isInitialized: inputInitialized } = useInputContext();
  const radioPanelRef = useRef<RadioControlPanel | null>(null);
  const radioContainerRef = useRef<HTMLDivElement | null>(null);

  const [sceneManager] = useState<SceneManager | null>(() => {
    const sm = new SceneManager();
    return sm;
  });

  const [uiManager] = useState<UIManager | null>(() => new UIManager());
  const [crtRenderer, setCrtRenderer] = useState<CrtRenderer | null>(null);

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
      sceneManager.registerScene(
        SCENES.ROBOT_ASSEMBLY,
        new RobotAssemblyScene(
          inputManager,
          sceneManager,
          inventorySystem?.getWarehouse() || undefined,
          gameState.p.inventory,
          gameState.p.currentCore,
          gameState // 传入完整的 IGameState
        )
      );
      sceneManager.registerScene(
        SCENES.TACTICAL_RADAR,
        new TacticalRadarScene(inputManager, sceneManager, gameState)
      );
      sceneManager.registerScene(
        SCENES.WIDE_RADAR,
        new WideRadarScene(inputManager, sceneManager, radioSystem || undefined)
      );
      sceneManager.registerScene(
        SCENES.SIGNAL_PROCESSING,
        new SignalProcessingScene(inputManager, sceneManager, radioSystem || undefined)
      );
      sceneManager.registerScene(
        SCENES.ESCAPE_RESULT,
        new EscapeResultScene(inputManager, sceneManager, gameState)
      );

      // 设置初始场景
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
        // 更新鼠标状态(用于游戏场景)
        if (gameState && canvasRef.current && event.x !== undefined && event.y !== undefined) {
          const rect = canvasRef.current.getBoundingClientRect();
          const canvasX = event.x - rect.left;
          const canvasY = event.y - rect.top;
          
          // 使用GameSystem的updateMousePosition方法
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
  }, [inputManager, sceneManager, gameState, gameSystem]);

  // 初始化RadioControlPanel
  useEffect(() => {
    if (radioContainerRef.current && radioSystem && !radioPanelRef.current) {
      radioPanelRef.current = new RadioControlPanel(radioSystem);
      radioPanelRef.current.init(radioContainerRef.current);
    }

    return () => {
      // 清理
      if (radioPanelRef.current && radioPanelRef.current.container) {
        const container = radioPanelRef.current.container;
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
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

  return (
    <>
      <div id="workstation-container">
        {/* Left Side: Radio Transceiver */}
        <div 
          id="radio-transceiver" 
          ref={radioContainerRef}
        >
          {/* RadioControlPanel will be initialized via useEffect */}
        </div>

        {/* Right Side: CRT Monitor */}
        <div id="crt-monitor-container">
          <div id="monitor-frame">
            <div id="monitor-screen">
              {/* Game Canvas */}
              <canvas ref={canvasRef} id="gameCanvas" />

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

      {/* Edge Glow Effect (for low energy/grabbed state) */}
      <div id="edge-glow" />

      {/* World UI Container (for in-game overlays) */}
      <div id="world-ui-container" />

      {/* Inventory UI */}
      <div id="inventory-container" style={{ display: 'none' }} />
    </>
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
