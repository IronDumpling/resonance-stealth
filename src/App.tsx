/**
 * 主应用组件
 * Main Application Component
 * 
 * 设置Context提供者，集成场景管理器，设置游戏循环
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameProvider } from '@/contexts/GameContext';
import { InputProvider } from '@/contexts/InputContext';
import { SceneManager } from '@/systems/SceneManager';
import { UIManager } from '@/ui/UIManager';
import { CrtRenderer } from '@/rendering/CrtRenderer';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useScene } from '@/hooks/useScene';
import { SCENES } from '@/types/scenes';
import {
  BootScene,
  CrtOffScene,
  CrtOnScene,
  MonitorMenuScene,
  RobotAssemblyScene,
  TacticalRadarScene,
  WideRadarScene,
  SignalProcessingScene,
} from '@/scenes';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sceneManager] = useState<SceneManager | null>(() => {
    const sm = new SceneManager();
    
    // 注册所有场景
    sm.registerScene(SCENES.BOOT, new BootScene());
    sm.registerScene(SCENES.CRT_OFF, new CrtOffScene());
    sm.registerScene(SCENES.CRT_ON, new CrtOnScene());
    sm.registerScene(SCENES.MONITOR_MENU, new MonitorMenuScene());
    sm.registerScene(SCENES.ROBOT_ASSEMBLY, new RobotAssemblyScene());
    sm.registerScene(SCENES.TACTICAL_RADAR, new TacticalRadarScene());
    sm.registerScene(SCENES.WIDE_RADAR, new WideRadarScene());
    sm.registerScene(SCENES.SIGNAL_PROCESSING, new SignalProcessingScene());
    
    return sm;
  });

  const [uiManager] = useState<UIManager | null>(() => new UIManager());
  const [crtRenderer, setCrtRenderer] = useState<CrtRenderer | null>(null);

  const { currentScene } = useScene({
    initialScene: SCENES.BOOT,
    sceneManager,
  });

  // 初始化CRT渲染器
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setCrtRenderer(new CrtRenderer(canvas, ctx));
      }
    }
  }, []);

  // 游戏循环
  useGameLoop({
    onUpdate: (deltaTime: number) => {
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
      if (canvasRef.current && sceneManager) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx && crtRenderer) {
          crtRenderer.render(() => {
            sceneManager.render(ctx, canvas);
          });
        } else if (ctx) {
          sceneManager.render(ctx, canvas);
        }
      }
    },
    enabled: true,
  });

  return (
    <>
      <div id="workstation-container">
        {/* Left Side: Radio Transceiver */}
        <div id="radio-transceiver">
          {/* Radio Control Panel will be rendered here */}
        </div>

        {/* Right Side: CRT Monitor */}
        <div id="crt-monitor-container">
          <div id="monitor-frame">
            <div id="monitor-screen">
              {/* Game Canvas */}
              <canvas ref={canvasRef} id="gameCanvas" />

              {/* Radio Mode Display (for WideRadarScene and SignalProcessingScene) */}
              <div id="radio-mode-display" style={{ display: 'none' }}>
                <div id="morse-reference" />
                <div id="decode-input" />
                <div id="radar-map-container">
                  <div className="radar-header">RADAR MAP</div>
                  <canvas id="radar-canvas" />
                </div>
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

const AppWithProviders: React.FC = () => {
  return (
    <GameProvider>
      <InputProvider>
        <App />
      </InputProvider>
    </GameProvider>
  );
};

export default AppWithProviders;
