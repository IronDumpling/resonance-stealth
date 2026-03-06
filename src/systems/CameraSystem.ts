/**
 * 相机系统
 * Camera System
 *
 * 统一管理多个相机（world/sonar/cockpit/inventory），
 * 以及 START_SCREEN / DRIVE / INVENTORY 等模式下的过渡插值。
 *
 * 设计目标：
 * - world camera：逻辑相机，跟随玩家，用于世界/物理与坐标换算。
 * - sonar camera：声纳 UI 相机，可以基于 world camera 做平移/缩放。
 * - cockpit camera：用于开场贴近 SONAR 屏幕与拉远到驾驶舱的镜头。
 * - inventory camera：用于 180° 回头看后备箱的镜头。
 *
 * 目前仅提供数据结构和基础过渡骨架，具体位移/旋转可在后续阶段细化，
 * 或接入 React 动画库（Framer Motion / React Spring 等）。
 */

import type { IGameState } from '@/types/game';
import { lerp } from '@/utils/math';

export type CameraId = 'world' | 'sonar' | 'cockpit' | 'inventory';

export type CameraMode = 'start' | 'menu' | 'drive' | 'inventory';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rot: number;
  /** 页面级垂直偏移（vh），用于 Start/Menu 时上移对准 SONAR */
  ty: number;
  mode: CameraMode;
  transition: CameraTransition | null;
}

export interface CameraTransition {
  fromMode: CameraMode;
  toMode: CameraMode;
  duration: number;
  elapsed: number;
}

export class CameraSystem {
  cameras: Record<CameraId, CameraState>;
  activeCamera: CameraId;

  constructor() {
    this.cameras = {
      world: {
        x: 0,
        y: 0,
        zoom: 1,
        rot: 0,
        ty: 0,
        mode: 'drive',
        transition: null,
      },
      sonar: {
        x: 0,
        y: 0,
        zoom: 1,
        rot: 0,
        ty: 0,
        mode: 'drive',
        transition: null,
      },
      cockpit: {
        x: 0,
        y: 0,
        zoom: 1,
        rot: 0,
        ty: 22.5,
        mode: 'start',
        transition: null,
      },
      inventory: {
        x: 0,
        y: 0,
        zoom: 1,
        rot: 0,
        ty: 0,
        mode: 'inventory',
        transition: null,
      },
    };

    // 默认以驾驶舱视角为主相机
    this.activeCamera = 'cockpit';
  }

  /**
   * 获取指定相机
   */
  getCamera(id: CameraId): CameraState {
    return this.cameras[id];
  }

  /**
   * 设置当前用于主渲染的相机
   */
  setActiveCamera(id: CameraId): void {
    this.activeCamera = id;
  }

  /**
   * 获取页面级 transform 字符串（用于 React style.transform）
   * 当前使用 activeCamera（通常是 cockpit 或 inventory）的 zoom/rot。
   */
  getPageTransform(): string {
    const cam = this.cameras[this.activeCamera];
    const scale = cam.zoom ?? 1;
    const rot = cam.rot ?? 0;
    const ty = cam.ty ?? 0;
    // ty > 0 时下移内容，使 SONAR 中心对准视口中心（Start/Menu）；Drive 时 ty=0 对准整体中心
    const translate = ty !== 0 ? `translate(0, ${ty}vh) ` : '';
    return `${translate}scale(${scale}) rotate(${rot}rad)`;
  }

  /**
   * 切换指定相机的模式（用于 START/DRIVE/INVENTORY 等过渡）
   */
  setMode(id: CameraId, targetMode: CameraMode, duration: number = 0): void {
    const cam = this.cameras[id];
    if (!cam) return;

    if (duration <= 0) {
      cam.mode = targetMode;
      cam.transition = null;
      return;
    }

    cam.transition = {
      fromMode: cam.mode,
      toMode: targetMode,
      duration,
      elapsed: 0,
    };
  }

  /**
   * 世界相机跟随玩家（由 GameSystem 或调用方提供玩家位置）
   * 仅更新 world camera 的 x/y，不修改模式与 zoom/rot。
   */
  syncWorldCameraToPlayer(gameState: IGameState): void {
    const worldCam = this.cameras.world;
    worldCam.x = gameState.p.x;
    worldCam.y = gameState.p.y;
  }

  /**
   * 每帧更新所有相机
   * - 处理模式过渡（插值进度）
   * - 根据 world camera 推导 sonar camera 的基础状态
   */
  update(deltaTime: number, gameState: IGameState | null): void {
    if (!gameState) return;

    // 1. 确保 world camera 与玩家位置同步（逻辑相机）
    this.syncWorldCameraToPlayer(gameState);

    // 2. 更新各相机的过渡进度
    (Object.keys(this.cameras) as CameraId[]).forEach((id) => {
      const cam = this.cameras[id];
      const tInfo = cam.transition;
      if (!tInfo) {
        // 没有过渡时，相机直接使用当前模式的基础状态
        const base = this.getBaseStateForMode(id, cam.mode);
        if (id === 'cockpit' || id === 'inventory') {
          cam.zoom = base.zoom;
          cam.rot = base.rot;
          cam.ty = base.ty;
        }
        return;
      }

      tInfo.elapsed += deltaTime;
      const t = Math.min(1, tInfo.elapsed / tInfo.duration);

      const fromBase = this.getBaseStateForMode(id, tInfo.fromMode);
      const toBase = this.getBaseStateForMode(id, tInfo.toMode);

      cam.zoom = lerp(fromBase.zoom, toBase.zoom, t);
      cam.rot = lerp(fromBase.rot, toBase.rot, t);
      cam.ty = lerp(fromBase.ty, toBase.ty, t);

      if (t >= 1) {
        cam.mode = tInfo.toMode;
        cam.transition = null;
      }
    });

    // 3. 根据 world camera 推导 sonar camera（当前简单跟随，预留缩放/偏移）
    const worldCam = this.cameras.world;
    const sonarCam = this.cameras.sonar;
    sonarCam.x = worldCam.x;
    sonarCam.y = worldCam.y;
    sonarCam.zoom = worldCam.zoom;
    sonarCam.rot = worldCam.rot;

    // 4. 为了兼容旧代码，暂时把 world camera 写回 gameState.camera
    gameState.camera.x = worldCam.x;
    gameState.camera.y = worldCam.y;
  }

  /**
   * 不同模式下各相机的基础状态（目前只定义 zoom 与 rot）
   * 可根据需要进一步扩展 x/y 偏移等。
   */
  private getBaseStateForMode(
    id: CameraId,
    mode: CameraMode
  ): { zoom: number; rot: number; ty: number } {
    // world / sonar 相机的 mode 目前不影响 zoom/rot/ty，由游戏逻辑控制
    if (id === 'world' || id === 'sonar') {
      return { zoom: 1, rot: 0, ty: 0 };
    }

    // cockpit / inventory 相机根据模式切换
    if (id === 'cockpit') {
      if (mode === 'start' || mode === 'menu') {
        // 贴近 SONAR 屏幕：上移对准 SONAR（ty 下移内容使 SONAR 中心对准视口中心）
        return { zoom: 2.6, rot: 0, ty: 22.5 };
      }
      if (mode === 'drive') {
        // 正常驾驶视角：对准整体中心
        return { zoom: 1.0, rot: 0, ty: 0 };
      }
      if (mode === 'inventory') {
        return { zoom: 1.0, rot: 0, ty: 0 };
      }
    }

    if (id === 'inventory') {
      if (mode === 'inventory') {
        return { zoom: 1.0, rot: Math.PI, ty: 0 };
      }
      if (mode === 'drive') {
        return { zoom: 1.0, rot: 0, ty: 0 };
      }
    }

    return { zoom: 1, rot: 0, ty: 0 };
  }
}


