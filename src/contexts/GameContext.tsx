/**
 * 游戏状态Context
 * Game State Context
 */

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { IGameState } from '@/types/game';
import { 
  GameSystem, 
  RadioSystem, 
  InventorySystem, 
  AntennaSystem, 
  SLAMSystem 
} from '@/systems';
import { CORE_TYPES } from '@/config/gameConfig';

interface GameContextValue {
  gameState: IGameState | null;
  gameSystem: GameSystem | null;
  radioSystem: RadioSystem | null;
  inventorySystem: InventorySystem | null;
  antennaSystem: AntennaSystem | null;
  slamSystem: SLAMSystem | null;
  setGameState: (state: IGameState | null) => void;
  initGame: (canvas?: HTMLCanvasElement | null) => void;
  isInitialized: boolean;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, setGameState] = useState<IGameState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 使用 useRef 保持系统实例的稳定性
  const gameSystemRef = useRef<GameSystem | null>(null);
  const radioSystemRef = useRef<RadioSystem | null>(null);
  const inventorySystemRef = useRef<InventorySystem | null>(null);
  const antennaSystemRef = useRef<AntennaSystem | null>(null);
  const slamSystemRef = useRef<SLAMSystem | null>(null);

  const initGame = (canvas?: HTMLCanvasElement | null) => {
    if (isInitialized) {
      console.warn('Game already initialized');
      return;
    }

    console.log('Initializing game systems...');

    // 1. 创建初始游戏状态
    const initialState: IGameState = {
      p: {
        x: 0,
        y: 0,
        a: 0,
        en: 100,
        invuln: 0,
        isGrabbed: false,
        grabberEnemy: null,
        struggleProgress: 0,
        grabImmunity: 0,
        grabHintElement: null,
        isCharging: false,
        chargeStartTime: 0,
        resonanceCD: 0,
        grabParticleTimer: 0,
        shouldShowAimLine: false,
        overload: 0,
        isGrabbingEnemy: null,
        aimLineHit: null,
        isDormant: false,
        isDestroyed: false,
        currentCore: CORE_TYPES.SCAVENGER,
        durability: 100,
        inventory: new Array(6).fill(null),
      },
      keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        f: false,
        r: false,
        e: false,
        shift: false,
      },
      mouse: { x: 0, y: 0, buttons: [], wheelDelta: 0 },
      freq: 150,
      focusLevel: 0,
      currentMessage: '',
      messageTimer: 0,
      camera: { x: 0, y: 0 },
      entities: {
        obstacles: [],
        enemies: [],
        waves: [],
        echoes: [],
        particles: [],
        items: [],
        wallEchoes: [],
        radiations: [],
        base: null,
        baseEchoes: [],
      },
      antennaSystem: null,
      slamSystem: null,
    };

    // 2. 初始化系统（按依赖顺序）
    
    // SLAM系统（无依赖）
    const slamSystem = new SLAMSystem();
    slamSystemRef.current = slamSystem;
    initialState.slamSystem = slamSystem;

    // 天线系统（无依赖）
    const antennaSystem = new AntennaSystem();
    antennaSystemRef.current = antennaSystem;
    initialState.antennaSystem = antennaSystem;

    // 无线电系统（依赖天线系统）
    const radioSystem = new RadioSystem(
      initialState,
      antennaSystem,
      {
        logMsg: (message: string) => {
          if (initialState) {
            initialState.currentMessage = message;
            initialState.messageTimer = 3.0; // 3秒显示时间
          }
        },
      }
    );
    radioSystemRef.current = radioSystem;

    // 背包系统（依赖游戏状态）
    const inventorySystem = new InventorySystem(
      initialState,
      {
        onInventoryUpdate: () => {
          // UI更新回调
          console.log('Inventory updated');
        },
        onLogMessage: (message: string) => {
          if (initialState) {
            initialState.currentMessage = message;
            initialState.messageTimer = 3.0;
          }
        },
        onAddEnergy: (amount: number) => {
          if (initialState) {
            initialState.p.en = Math.min(100, initialState.p.en + amount);
          }
        },
        onSpawnParticles: (_x, _y, _color, _count) => {
          // 粒子效果回调
        },
      }
    );
    inventorySystemRef.current = inventorySystem;
    inventorySystem.initPlayerInventory();

    // 游戏系统（依赖游戏状态、无线电系统、canvas）
    const gameSystem = new GameSystem(
      initialState,
      radioSystem,
      canvas || null,
      {
        // 实体生成回调（将在后续阶段实现）
        spawnEnemy: () => {
          console.log('Spawn enemy callback');
        },
        spawnItem: (_type, _x?, _y?, _config?) => {
          console.log('Spawn item callback');
        },
        spawnBase: (_x, _y) => {
          console.log('Spawn base callback');
        },
        initWalls: () => {
          console.log('Init walls callback');
        },
        // 实体更新回调（将在后续阶段实现）
        updatePlayer: (_deltaTime) => {
          // 玩家更新逻辑
        },
        updateEnemies: () => {
          // 敌人更新逻辑
        },
        updateItemsUI: () => {
          // 物品UI更新
          if (initialState) {
            initialState.entities.items.forEach(item => {
              if (item.visibleTimer > 0) {
                item.visibleTimer--;
              }
            });
          }
        },
        updateWave: (_wave, _index) => {
          // 波纹更新逻辑
        },
        handleWaveToWaveInteraction: () => {
          // 波纹交互逻辑
        },
        updateBase: (_deltaTime) => {
          // 基地更新逻辑
        },
        updateSignalSources: (_deltaTime) => {
          // 信号源更新逻辑
        },
        checkSignalSourceDiscovery: () => {
          // 信号源发现检查
        },
        logMsg: (message: string) => {
          if (initialState) {
            initialState.currentMessage = message;
            initialState.messageTimer = 3.0;
          }
        },
      }
    );
    gameSystemRef.current = gameSystem;

    // 3. 初始化游戏系统
    if (canvas) {
      gameSystem.initGlobals(canvas);
    }
    gameSystem.init();

    // 4. 更新游戏状态
    setGameState(initialState);
    setIsInitialized(true);

    console.log('Game systems initialized successfully');
  };

  const value: GameContextValue = {
    gameState,
    gameSystem: gameSystemRef.current,
    radioSystem: radioSystemRef.current,
    inventorySystem: inventorySystemRef.current,
    antennaSystem: antennaSystemRef.current,
    slamSystem: slamSystemRef.current,
    setGameState,
    initGame,
    isInitialized,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
