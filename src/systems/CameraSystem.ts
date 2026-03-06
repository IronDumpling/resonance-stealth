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
import { COCKPIT_CONFIG } from '@/config/gameConfig';

export type CameraId = 'world' | 'sonar' | 'cockpit' | 'inventory';

export type CameraMode = 'start' | 'menu' | 'drive' | 'inventory';

export interface CameraState {
  x: number;
  y: number;
  /** 页面级 3D 参数（取代 zoom/ty） */
  translateZ: number;
  rotateX: number;
  rotateY: number;
  /** 页面级垂直偏移（px），Boot/Menu 时上移对准 SONAR */
  translateY?: number;
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

  /** 光标跟随：目标角度（度） */
  private mouseLookTargetX = 0;
  private mouseLookTargetY = 0;
  /** 光标跟随：当前插值角度（度） */
  private mouseLookX = 0;
  private mouseLookY = 0;

  constructor() {
    this.cameras = {
      world: {
        x: 0,
        y: 0,
        translateZ: 0,
        rotateX: 0,
        rotateY: 0,
        mode: 'drive',
        transition: null,
      },
      sonar: {
        x: 0,
        y: 0,
        translateZ: 0,
        rotateX: 0,
        rotateY: 0,
        mode: 'drive',
        transition: null,
      },
      cockpit: {
        x: 0,
        y: 0,
        translateZ: 450,
        rotateX: -28,
        rotateY: 0,
        translateY: -80,
        mode: 'start',
        transition: null,
      },
      inventory: {
        x: 0,
        y: 0,
        translateZ: 0,
        rotateX: 0,
        rotateY: 180,
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
   * 设置鼠标屏幕坐标，用于 Drive 模式下的光标跟随旋转
   */
  setMousePosition(screenX: number, screenY: number): void {
    if (typeof window === 'undefined') return;
    const { maxAngle } = COCKPIT_CONFIG.mouseLook;
    const nx = screenX / window.innerWidth - 0.5;
    const ny = screenY / window.innerHeight - 0.5;
    this.mouseLookTargetX = nx * maxAngle;
    this.mouseLookTargetY = ny * maxAngle;
  }

  /**
   * 获取页面级 3D transform 字符串（用于 #page-root，需配合 #perspective-root 的 perspective）
   * Boot/Menu: 拉近、上移对准 SONAR；Drive: 拉远、下移对准驾驶舱中心；Inventory: rotateY π。
   * Drive 模式下叠加光标跟随旋转。rotateX/rotateY 内部为 deg。
   */
  getPageTransform(): string {
    const cam = this.cameras[this.activeCamera];
    const z = cam.translateZ ?? 0;
    let rx = cam.rotateX ?? 0;
    let ry = cam.rotateY ?? 0;

    // Drive 模式下叠加光标跟随旋转
    if (
      (this.activeCamera === 'cockpit' || this.activeCamera === 'inventory') &&
      cam.mode === 'drive'
    ) {
      rx = rx - this.mouseLookY;
      ry = ry + this.mouseLookX;
    }

    const ty = cam.translateY ?? 0;
    const translatePart = ty !== 0 ? `translateY(${ty}px) ` : '';
    return `${translatePart}translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
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
        const base = this.getBaseStateForMode(id, cam.mode);
        if (id === 'cockpit' || id === 'inventory') {
          cam.translateZ = base.translateZ;
          cam.rotateX = base.rotateX;
          cam.rotateY = base.rotateY;
          cam.translateY = base.translateY ?? 0;
        }
        return;
      }

      tInfo.elapsed += deltaTime;
      const t = Math.min(1, tInfo.elapsed / tInfo.duration);

      const fromBase = this.getBaseStateForMode(id, tInfo.fromMode);
      const toBase = this.getBaseStateForMode(id, tInfo.toMode);

      cam.translateZ = lerp(fromBase.translateZ, toBase.translateZ, t);
      cam.rotateX = lerp(fromBase.rotateX, toBase.rotateX, t);
      cam.rotateY = lerp(fromBase.rotateY, toBase.rotateY, t);
      cam.translateY = lerp(fromBase.translateY ?? 0, toBase.translateY ?? 0, t);

      if (t >= 1) {
        cam.mode = tInfo.toMode;
        cam.transition = null;
      }
    });

    // 2b. 光标跟随 lerp 平滑
    const { lerp: mouseLerp } = COCKPIT_CONFIG.mouseLook;
    this.mouseLookX = lerp(this.mouseLookX, this.mouseLookTargetX, mouseLerp);
    this.mouseLookY = lerp(this.mouseLookY, this.mouseLookTargetY, mouseLerp);

    // 3. 根据 world camera 推导 sonar camera（仅跟随玩家）
    const worldCam = this.cameras.world;
    const sonarCam = this.cameras.sonar;
    sonarCam.x = worldCam.x;
    sonarCam.y = worldCam.y;

    // 4. 为了兼容旧代码，暂时把 world camera 写回 gameState.camera
    gameState.camera.x = worldCam.x;
    gameState.camera.y = worldCam.y;
  }

  /**
   * 不同模式下各相机的基础状态（3D 页面镜头）
   * Boot/Menu: 拉近、上移对准 SONAR；Drive: 拉远、下移对准驾驶舱中心；Inventory: rotateY π。
   */
  private getBaseStateForMode(
    id: CameraId,
    mode: CameraMode
  ): { translateZ: number; rotateX: number; rotateY: number; translateY?: number } {
    if (id === 'world' || id === 'sonar') {
      return { translateZ: 0, rotateX: 0, rotateY: 0 };
    }

    if (id === 'cockpit') {
      if (mode === 'start' || mode === 'menu') {
        // 拉近、上移对准 SONAR，镜头内仅 SONAR 可见（使用 gameConfig 的 COCKPIT_CONFIG.bootMenuCamera）
        const cfg = COCKPIT_CONFIG.bootMenuCamera;
        return {
          translateZ: cfg.translateZ,
          rotateX: cfg.rotateX,
          rotateY: 0,
          translateY: cfg.translateY,
        };
      }
      if (mode === 'drive') {
        // 拉远、下移对准驾驶舱中心，镜头内完整驾驶舱可见
        return { translateZ: 0, rotateX: 0, rotateY: 0 };
      }
      if (mode === 'inventory') {
        return { translateZ: 0, rotateX: 0, rotateY: 0 };
      }
    }

    if (id === 'inventory') {
      if (mode === 'inventory') {
        return { translateZ: 0, rotateX: 0, rotateY: 180 };
      }
      if (mode === 'drive') {
        return { translateZ: 0, rotateX: 0, rotateY: 0 };
      }
    }

    return { translateZ: 0, rotateX: 0, rotateY: 0 };
  }
}


