// UI管理系统 (UI Management System)

// UI层级定义
const UI_LAYERS = {
    BACKGROUND: 0,      // 背景层
    GAME_WORLD: 10,     // 游戏世界
    GAME_UI: 20,        // 游戏UI(HUD)
    APPLICATION: 30,    // 应用界面(无线电/组装)
    DIALOG: 40,         // 对话框
    OVERLAY: 50,        // 叠加层(CRT效果)
    DEBUG: 100          // 调试信息
};

// UI管理器类
class UIManager {
    constructor() {
        this.elements = new Map();
        this.layers = new Map();
        this.animations = [];
        
        // 初始化层级容器
        this.initLayers();
    }
    
    // 初始化UI层级
    initLayers() {
        for (const [layerName, zIndex] of Object.entries(UI_LAYERS)) {
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
    
    // 创建UI元素
    createElement(id, options = {}) {
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
    
    // 获取UI元素
    getElement(id) {
        const elementData = this.elements.get(id);
        return elementData ? elementData.element : null;
    }
    
    // 显示元素
    show(id, animation = null) {
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
    
    // 隐藏元素
    hide(id, animation = null) {
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
    
    // 切换元素可见性
    toggle(id, animation = null) {
        const elementData = this.elements.get(id);
        if (!elementData) return;
        
        if (elementData.visible) {
            this.hide(id, animation);
        } else {
            this.show(id, animation);
        }
    }
    
    // 更新元素内容
    updateContent(id, content, isHTML = false) {
        const element = this.getElement(id);
        if (!element) return;
        
        if (isHTML) {
            element.innerHTML = content;
        } else {
            element.textContent = content;
        }
    }
    
    // 更新元素样式
    updateStyle(id, styles) {
        const element = this.getElement(id);
        if (!element) return;
        
        Object.assign(element.style, styles);
    }
    
    // 移除元素
    removeElement(id) {
        const elementData = this.elements.get(id);
        if (!elementData) return;
        
        elementData.element.remove();
        this.elements.delete(id);
    }
    
    // 清空指定层级
    clearLayer(layerName) {
        const layerContainer = this.layers.get(layerName);
        if (!layerContainer) return;
        
        // 移除该层级的所有元素
        const elementsToRemove = [];
        for (const [id, data] of this.elements.entries()) {
            if (data.layer === layerName) {
                elementsToRemove.push(id);
            }
        }
        
        elementsToRemove.forEach(id => this.removeElement(id));
    }
    
    // 显示动画
    animateShow(element, animationType) {
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
    
    // 隐藏动画
    animateHide(element, animationType) {
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
    
    // 创建通知消息
    showNotification(message, duration = 3000, type = 'info') {
        const id = `notification-${Date.now()}`;
        const colors = {
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
                border: `2px solid ${colors[type]}`,
                color: colors[type],
                fontFamily: '"Courier New", monospace',
                fontSize: '14px',
                borderRadius: '4px',
                boxShadow: `0 0 10px ${colors[type]}`,
                zIndex: '1000',
                pointerEvents: 'auto'
            }
        });
        
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
    
    // 更新现有游戏UI
    updateGameUI(data) {
        // 更新能量
        if (data.energy !== undefined) {
            const energyEl = document.getElementById('energy-val');
            if (energyEl) {
                energyEl.textContent = `${Math.floor(data.energy)}/${data.maxEnergy || 100}`;
            }
        }
    }
    
    // 更新函数(每帧调用)
    update(deltaTime) {
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

// 全局UI管理器实例
let uiManager = null;

// 初始化UI管理器
function initUIManager() {
    uiManager = new UIManager();
    console.log('UI Manager initialized');
    return uiManager;
}

