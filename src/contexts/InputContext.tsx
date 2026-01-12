/**
 * 输入状态Context
 * Input State Context
 * 
 * 提供输入管理器并确保输入系统正常工作
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { InputManager } from '@/systems/InputManager';
import { InputContext as InputContextType, InputEvent } from '@/types/systems';

interface InputContextValue {
  inputManager: InputManager | null;
  currentContext: InputContextType;
  setCurrentContext: (context: InputContextType) => void;
  handleInput: (event: InputEvent) => void;
  isInitialized: boolean;
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
  const inputManagerRef = useRef<InputManager | null>(null);
  const [currentContext, setCurrentContextState] = useState<InputContextType>('none');
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化输入管理器
  useEffect(() => {
    if (!inputManagerRef.current) {
      const im = new InputManager();
      inputManagerRef.current = im;
      
      // 注册默认按键绑定
      im.registerDefaultBindings();
      
      // 绑定事件监听器
      im.bindEventListeners();
      
      // 设置初始上下文
      const initialContext = im.getContext();
      setCurrentContextState(initialContext);
      setIsInitialized(true);
      
      console.log('InputManager initialized with context:', initialContext);
    }

    // 清理
    return () => {
      // 输入管理器的事件监听器会在组件卸载时自动清理
      // 如果需要手动清理，可以在这里添加
    };
  }, []);

  const setCurrentContext = (context: InputContextType) => {
    if (inputManagerRef.current) {
      inputManagerRef.current.setContext(context);
      setCurrentContextState(context);
    }
  };

  const handleInput = (event: InputEvent) => {
    // 输入处理逻辑可以由场景自己处理
    // 这里提供一个统一的入口点
    if (inputManagerRef.current) {
      // 可以在这里添加全局输入处理逻辑
      console.log('Input event:', event);
    }
  };

  const value: InputContextValue = {
    inputManager: inputManagerRef.current,
    currentContext,
    setCurrentContext,
    handleInput,
    isInitialized,
  };

  return <InputContext.Provider value={value}>{children}</InputContext.Provider>;
};
