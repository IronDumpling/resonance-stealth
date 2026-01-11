/**
 * UI管理器
 * UI Manager
 */

import { IUIManager, UIElementOptions } from '@/types/systems';

// UI层级定义
export const UI_LAYERS = {
  BACKGROUND: 'BACKGROUND',
  GAME_WORLD: 'GAME_WORLD',
  GAME_UI: 'GAME_UI',
  APPLICATION: 'APPLICATION',
  DIALOG: 'DIALOG',
  OVERLAY: 'OVERLAY',
  DEBUG: 'DEBUG',
} as const;

interface UIElementData {
  element: HTMLElement;
  layer: string;
  visible: boolean;
}

interface Animation {
  progress: number;
  duration: number;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

export class UIManager implements IUIManager {
  elements: Map<string, UIElementData> = new Map();
  layers: Map<string, HTMLElement> = new Map();
  animations: Animation[] = [];

  constructor() {
    this.initLayers();
  }

  /**
   * 初始化UI层级
   */
  initLayers(): void {
    const layerZIndex: Record<string, number> = {
      BACKGROUND: 0,
      GAME_WORLD: 10,
      GAME_UI: 20,
      APPLICATION: 30,
      DIALOG: 40,
      OVERLAY: 50,
      DEBUG: 100,
    };

    for (const [layerName, zIndex] of Object.entries(layerZIndex)) {
      const layerContainer = document.createElement('div');
      layerContainer.id = `ui-layer-${layerName.toLowerCase()}`;
      layerContainer.style.position = 'absolute';
      layerContainer.style.top = '0';
      layerContainer.style.left = '0';
      layerContainer.style.width = '100%';
      layerContainer.style.height = '100%';
      layerContainer.style.zIndex = zIndex.toString();
      layerContainer.style.pointerEvents = 'none'; // 默认不响应鼠标事件
      
      document.body.appendChild(layerContainer);
      this.layers.set(layerName, layerContainer);
    }
    
    console.log('UI layers initialized');
  }

  /**
   * 创建UI元素
   */
  createElement(id: string, options: UIElementOptions = {}): HTMLElement | null {
    const element = document.createElement(options.tag || 'div');
    element.id = id;
    
    // 设置样式
    if (options.className) {
      element.className = options.className;
    }
    
    if (options.style) {
      Object.assign(element.style, options.style);
    }
    
    // 设置内容
    if (options.html) {
      element.innerHTML = options.html;
    } else if (options.text) {
      element.textContent = options.text;
    }
    
    // 添加到指定层级
    const layer = options.layer || 'GAME_UI';
    const layerContainer = this.layers.get(layer);
    if (layerContainer) {
      layerContainer.appendChild(element);
    }
    
    // 设置事件响应
    if (options.interactive) {
      element.style.pointerEvents = 'auto';
    }
    
    // 存储元素引用
    this.elements.set(id, {
      element: element,
      layer: layer,
      visible: options.visible !== false
    });
    
    // 设置初始可见性
    if (options.visible === false) {
      element.style.display = 'none';
    }
    
    return element;
  }

  /**
   * 获取UI元素
   */
  getElement(id: string): HTMLElement | null {
    const elementData = this.elements.get(id);
    return elementData ? elementData.element : null;
  }

  /**
   * 显示元素
   */
  show(id: string, animation?: string): void {
    const elementData = this.elements.get(id);
    if (!elementData) return;
    
    const element = elementData.element;
    
    if (animation) {
      this.animateShow(element, animation);
    } else {
      element.style.display = 'block';
    }
    
    elementData.visible = true;
  }

  /**
   * 隐藏元素
   */
  hide(id: string, animation?: string): void {
    const elementData = this.elements.get(id);
    if (!elementData) return;
    
    const element = elementData.element;
    
    if (animation) {
      this.animateHide(element, animation);
    } else {
      element.style.display = 'none';
    }
    
    elementData.visible = false;
  }

  /**
   * 切换元素可见性
   */
  toggle(id: string, animation?: string): void {
    const elementData = this.elements.get(id);
    if (!elementData) return;
    
    if (elementData.visible) {
      this.hide(id, animation);
    } else {
      this.show(id, animation);
    }
  }

  /**
   * 更新元素内容
   */
  updateContent(id: string, content: string, isHTML: boolean = false): void {
    const element = this.getElement(id);
    if (!element) return;
    
    if (isHTML) {
      element.innerHTML = content;
    } else {
      element.textContent = content;
    }
  }

  /**
   * 更新元素样式
   */
  updateStyle(id: string, styles: Partial<CSSStyleDeclaration>): void {
    const element = this.getElement(id);
    if (!element) return;
    
    Object.assign(element.style, styles);
  }

  /**
   * 移除元素
   */
  removeElement(id: string): void {
    const elementData = this.elements.get(id);
    if (!elementData) return;
    
    elementData.element.remove();
    this.elements.delete(id);
  }

  /**
   * 清空指定层级
   */
  clearLayer(layerName: string): void {
    const layerContainer = this.layers.get(layerName);
    if (!layerContainer) return;
    
    // 移除该层级的所有元素
    const elementsToRemove: string[] = [];
    for (const [id, data] of this.elements.entries()) {
      if (data.layer === layerName) {
        elementsToRemove.push(id);
      }
    }
    
    elementsToRemove.forEach(id => this.removeElement(id));
  }

  /**
   * 显示动画
   */
  private animateShow(element: HTMLElement, animationType: string): void {
    element.style.display = 'block';
    
    switch (animationType) {
      case 'fade':
        element.style.opacity = '0';
        element.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          element.style.opacity = '1';
        }, 10);
        break;
        
      case 'slide-down':
        element.style.transform = 'translateY(-20px)';
        element.style.opacity = '0';
        element.style.transition = 'transform 0.3s, opacity 0.3s';
        setTimeout(() => {
          element.style.transform = 'translateY(0)';
          element.style.opacity = '1';
        }, 10);
        break;
        
      case 'scale':
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        element.style.transition = 'transform 0.3s, opacity 0.3s';
        setTimeout(() => {
          element.style.transform = 'scale(1)';
          element.style.opacity = '1';
        }, 10);
        break;
    }
  }

  /**
   * 隐藏动画
   */
  private animateHide(element: HTMLElement, animationType: string): void {
    switch (animationType) {
      case 'fade':
        element.style.transition = 'opacity 0.3s';
        element.style.opacity = '0';
        setTimeout(() => {
          element.style.display = 'none';
        }, 300);
        break;
        
      case 'slide-up':
        element.style.transition = 'transform 0.3s, opacity 0.3s';
        element.style.transform = 'translateY(-20px)';
        element.style.opacity = '0';
        setTimeout(() => {
          element.style.display = 'none';
        }, 300);
        break;
        
      case 'scale':
        element.style.transition = 'transform 0.3s, opacity 0.3s';
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0';
        setTimeout(() => {
          element.style.display = 'none';
        }, 300);
        break;
        
      default:
        element.style.display = 'none';
    }
  }

  /**
   * 显示通知消息
   */
  showNotification(message: string, duration: number = 3000, type: string = 'info'): void {
    const id = `notification-${Date.now()}`;
    const colors: Record<string, string> = {
      info: '#33ccff',
      success: '#00ff00',
      warning: '#ffaa00',
      error: '#ff0000'
    };
    
    const notification = this.createElement(id, {
      className: 'notification',
      html: message,
      layer: 'OVERLAY',
      style: {
        position: 'fixed',
        top: '80px',
        right: '20px',
        padding: '12px 20px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: `2px solid ${colors[type] || colors.info}`,
        color: colors[type] || colors.info,
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        borderRadius: '4px',
        boxShadow: `0 0 10px ${colors[type] || colors.info}`,
        zIndex: '1000',
        pointerEvents: 'auto'
      } as Partial<CSSStyleDeclaration>
    });
    
    if (!notification) return;
    
    // 显示动画
    this.animateShow(notification, 'slide-down');
    
    // 自动隐藏
    setTimeout(() => {
      this.animateHide(notification, 'fade');
      setTimeout(() => {
        this.removeElement(id);
      }, 300);
    }, duration);
  }

  /**
   * 更新函数（每帧调用）
   */
  update(deltaTime: number): void {
    // 更新动画
    this.animations = this.animations.filter(anim => {
      anim.progress += deltaTime / anim.duration;
      
      if (anim.progress >= 1) {
        anim.progress = 1;
        if (anim.onComplete) anim.onComplete();
        return false; // 移除完成的动画
      }
      
      if (anim.onUpdate) {
        anim.onUpdate(anim.progress);
      }
      
      return true;
    });
  }
}
