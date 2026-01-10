/**
 * 输入状态Context
 * Input State Context
 * 
 * 保留结构，移除业务逻辑
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InputManager } from '@/systems/InputManager';
import { InputContext as InputContextType, InputEvent } from '@/types/systems';

interface InputContextValue {
  inputManager: InputManager | null;
  currentContext: InputContextType;
  setCurrentContext: (context: InputContextType) => void;
  handleInput: (event: InputEvent) => void;
}

const InputContext = createContext<InputContextValue | undefined>(undefined);

export const useInputContext = () => {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error('useInputContext must be used within an InputProvider');
  }
  return context;
};

interface InputProviderProps {
  children: ReactNode;
}

export const InputProvider: React.FC<InputProviderProps> = ({ children }) => {
  const [inputManager] = useState<InputManager | null>(new InputManager());
  const [currentContext, setCurrentContext] = useState<InputContextType>(
    inputManager?.getContext() || 'none'
  );

  const handleInput = (_event: InputEvent) => {
    // 空实现，保留方法签名
  };

  const value: InputContextValue = {
    inputManager,
    currentContext,
    setCurrentContext: (context: InputContextType) => {
      setCurrentContext(context);
      inputManager?.setContext(context);
    },
    handleInput,
  };

  return <InputContext.Provider value={value}>{children}</InputContext.Provider>;
};
