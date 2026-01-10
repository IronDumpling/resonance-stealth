/**
 * 游戏状态Context
 * Game State Context
 * 
 * 保留结构，移除业务逻辑
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { IGameState } from '@/types/game';
import { GameSystem } from '@/systems/GameSystem';

interface GameContextValue {
  gameState: IGameState | null;
  gameSystem: GameSystem | null;
  setGameState: (state: IGameState | null) => void;
  initGame: () => void;
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
  const [gameSystem] = useState<GameSystem | null>(new GameSystem());

  const initGame = () => {
    // 空实现，保留方法签名
    if (gameSystem) {
      gameSystem.init();
    }
  };

  const value: GameContextValue = {
    gameState,
    gameSystem,
    setGameState,
    initGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
