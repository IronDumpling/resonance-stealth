/**
 * 游戏循环Hook
 * Game Loop Hook
 * 
 * 保留结构，移除业务逻辑
 */

import { useEffect, useRef } from 'react';

export interface UseGameLoopOptions {
  onUpdate?: (deltaTime: number) => void;
  onRender?: () => void;
  enabled?: boolean;
}

export const useGameLoop = (options: UseGameLoopOptions = {}) => {
  const { onUpdate, onRender, enabled = true } = options;
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const gameLoop = (currentTime: number) => {
      // 计算deltaTime
      const deltaTime = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0.016; // 默认60fps
      lastTimeRef.current = currentTime;

      // 更新游戏逻辑
      if (onUpdate) {
        onUpdate(deltaTime);
      }

      // 渲染
      if (onRender) {
        onRender();
      }

      // 继续循环
      frameRef.current = requestAnimationFrame(gameLoop);
    };

    // 启动游戏循环
    frameRef.current = requestAnimationFrame(gameLoop);

    // 清理
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled, onUpdate, onRender]);
};
