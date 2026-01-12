/**
 * 场景管理Hook
 * Scene Management Hook
 * 
 * 保留结构，移除业务逻辑
 */

import { useState, useEffect, useCallback } from 'react';
import { SceneManager } from '@/systems/SceneManager';
import { SceneType, SceneData, TransitionType } from '@/types/scenes';

export interface UseSceneOptions {
  initialScene?: SceneType;
  sceneManager?: SceneManager | null;
}

export const useScene = (options: UseSceneOptions = {}) => {
  const { initialScene, sceneManager } = options;
  const [currentScene, setCurrentScene] = useState<SceneType | null>(
    initialScene || null
  );

  useEffect(() => {
    if (sceneManager && initialScene) {
      setCurrentScene(sceneManager.getCurrentScene());
    }
  }, [sceneManager, initialScene]);

  const switchScene = useCallback(
    (
      targetScene: SceneType,
      transitionType: TransitionType = 'fade',
      data?: SceneData
    ) => {
      if (sceneManager) {
        const success = sceneManager.switchScene(targetScene, transitionType, data);
        if (success) {
          setCurrentScene(targetScene);
        }
        return success;
      }
      return false;
    },
    [sceneManager]
  );

  const getScene = useCallback(
    (sceneName: SceneType) => {
      return sceneManager?.getScene(sceneName);
    },
    [sceneManager]
  );

  return {
    currentScene: currentScene || (sceneManager?.getCurrentScene() || null),
    sceneManager,
    switchScene,
    getScene,
  };
};
