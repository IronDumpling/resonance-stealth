/**
 * 输入处理Hook
 * Input Handling Hook
 * 
 * 保留结构，移除业务逻辑
 */

import { useEffect, useCallback } from 'react';
import { useInputContext } from '@/contexts/InputContext';
import { InputEvent } from '@/types/systems';

export interface UseInputOptions {
  onKeyDown?: (event: InputEvent) => void;
  onKeyUp?: (event: InputEvent) => void;
  onMouseMove?: (event: InputEvent) => void;
  onMouseDown?: (event: InputEvent) => void;
  onMouseUp?: (event: InputEvent) => void;
  onWheel?: (event: InputEvent) => void;
}

export const useInput = (options: UseInputOptions = {}) => {
  const { inputManager, handleInput } = useInputContext();
  const {
    onKeyDown,
    onKeyUp,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onWheel,
  } = options;

  // 注册回调
  useEffect(() => {
    if (!inputManager) return;

    const context = inputManager.getContext();

    if (onKeyDown) {
      inputManager.on('onKeyDown', context, onKeyDown);
    }
    if (onKeyUp) {
      inputManager.on('onKeyUp', context, onKeyUp);
    }
    if (onMouseMove) {
      inputManager.on('onMouseMove', context, onMouseMove);
    }
    if (onMouseDown) {
      inputManager.on('onMouseDown', context, onMouseDown);
    }
    if (onMouseUp) {
      inputManager.on('onMouseUp', context, onMouseUp);
    }
    if (onWheel) {
      inputManager.on('onWheel', context, onWheel);
    }

    // 清理
    return () => {
      if (onKeyDown) {
        inputManager.off('onKeyDown', context, onKeyDown);
      }
      if (onKeyUp) {
        inputManager.off('onKeyUp', context, onKeyUp);
      }
      if (onMouseMove) {
        inputManager.off('onMouseMove', context, onMouseMove);
      }
      if (onMouseDown) {
        inputManager.off('onMouseDown', context, onMouseDown);
      }
      if (onMouseUp) {
        inputManager.off('onMouseUp', context, onMouseUp);
      }
      if (onWheel) {
        inputManager.off('onWheel', context, onWheel);
      }
    };
  }, [
    inputManager,
    onKeyDown,
    onKeyUp,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onWheel,
  ]);

  const isKeyDown = useCallback(
    (key: string): boolean => {
      return inputManager?.isKeyDown(key) || false;
    },
    [inputManager]
  );

  const isActionActive = useCallback(
    (action: string): boolean => {
      return inputManager?.isActionActive(action) || false;
    },
    [inputManager]
  );

  return {
    inputManager,
    handleInput,
    isKeyDown,
    isActionActive,
  };
};
