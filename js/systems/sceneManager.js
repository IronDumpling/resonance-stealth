// 场景管理系统 (Scene Management System)

// 场景类型定义
const SCENES = {
    BOOT: 'boot',           // 启动场景
    CRT_OFF: 'crt_off',     // CRT关闭状态
    CRT_ON: 'crt_on',       // CRT开启状态
    RADIO: 'radio',         // 无线电收发器界面
    ROBOT: 'robot',         // 机器人控制器(现有游戏)
    ASSEMBLY: 'assembly'    // 机器人组装界面
};

// 场景管理器类
class SceneManager {
    constructor() {
        this.currentScene = SCENES.BOOT;
        this.previousScene = null;
        this.transitionProgress = 0;
        this.isTransitioning = false;
        this.transitionDuration = 1.0; // 默认过渡时间(秒)
        this.transitionType = 'fade';   // fade, slide, instant
        
        // 场景实例存储
        this.scenes = {};
        
        // 场景数据缓存
        this.sceneData = {};
        
        // 过渡回调
        this.onTransitionStart = null;
        this.onTransitionEnd = null;
    }
    
    // 注册场景
    registerScene(sceneName, sceneInstance) {
        this.scenes[sceneName] = sceneInstance;
        console.log(`Scene registered: ${sceneName}`);
    }
    
    // 切换场景
    switchScene(targetScene, transitionType = 'fade', data = {}) {
        if (this.isTransitioning) {
            console.warn('Scene transition already in progress');
            return false;
        }
        
        if (!this.scenes[targetScene]) {
            console.error(`Scene not found: ${targetScene}`);
            return false;
        }
        
        console.log(`Switching scene: ${this.currentScene} -> ${targetScene}`);
        
        // 保存当前场景
        this.previousScene = this.currentScene;
        
        // 设置过渡状态
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.transitionType = transitionType;
        
        // 调用当前场景的exit
        if (this.scenes[this.currentScene]) {
            this.scenes[this.currentScene].exit();
        }
        
        // 触发过渡开始回调
        if (this.onTransitionStart) {
            this.onTransitionStart(this.currentScene, targetScene);
        }
        
        // 保存场景切换数据
        this.sceneData[targetScene] = data;
        
        // 更新当前场景
        this.currentScene = targetScene;
        
        return true;
    }
    
    // 更新场景管理器
    update(deltaTime) {
        // 更新过渡动画
        if (this.isTransitioning) {
            this.transitionProgress += deltaTime / this.transitionDuration;
            
            if (this.transitionProgress >= 1.0) {
                this.transitionProgress = 1.0;
                this.isTransitioning = false;
                
                // 调用新场景的enter
                if (this.scenes[this.currentScene]) {
                    const data = this.sceneData[this.currentScene] || {};
                    this.scenes[this.currentScene].enter(data);
                }
                
                // 触发过渡结束回调
                if (this.onTransitionEnd) {
                    this.onTransitionEnd(this.previousScene, this.currentScene);
                }
            }
        }
        
        // 更新当前场景
        if (this.scenes[this.currentScene] && !this.isTransitioning) {
            this.scenes[this.currentScene].update(deltaTime);
        }
    }
    
    // 渲染场景
    render(ctx, canvas) {
        if (this.isTransitioning) {
            // 渲染过渡效果
            this.renderTransition(ctx, canvas);
        } else {
            // 渲染当前场景
            if (this.scenes[this.currentScene]) {
                this.scenes[this.currentScene].render(ctx, canvas);
            }
        }
    }
    
    // 渲染过渡效果
    renderTransition(ctx, canvas) {
        const progress = this.transitionProgress;
        
        switch (this.transitionType) {
            case 'fade':
                // 渲染新场景
                if (this.scenes[this.currentScene]) {
                    this.scenes[this.currentScene].render(ctx, canvas);
                }
                // 叠加淡出效果
                ctx.fillStyle = `rgba(0, 0, 0, ${1 - progress})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
                
            case 'instant':
                // 直接渲染新场景
                if (this.scenes[this.currentScene]) {
                    this.scenes[this.currentScene].render(ctx, canvas);
                }
                break;
                
            default:
                // 默认淡入淡出
                if (this.scenes[this.currentScene]) {
                    this.scenes[this.currentScene].render(ctx, canvas);
                }
                ctx.fillStyle = `rgba(0, 0, 0, ${1 - progress})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // 获取当前场景
    getCurrentScene() {
        return this.currentScene;
    }
    
    // 获取场景实例
    getScene(sceneName) {
        return this.scenes[sceneName];
    }
    
    // 保存场景状态
    saveSceneState(sceneName, state) {
        if (!this.sceneData[sceneName]) {
            this.sceneData[sceneName] = {};
        }
        this.sceneData[sceneName].savedState = state;
    }
    
    // 加载场景状态
    loadSceneState(sceneName) {
        if (this.sceneData[sceneName] && this.sceneData[sceneName].savedState) {
            return this.sceneData[sceneName].savedState;
        }
        return null;
    }
}

// 场景基类
class Scene {
    constructor(name) {
        this.name = name;
        this.isActive = false;
    }
    
    // 场景进入时调用
    enter(data) {
        this.isActive = true;
        console.log(`Scene entered: ${this.name}`);
    }
    
    // 场景退出时调用
    exit() {
        this.isActive = false;
        console.log(`Scene exited: ${this.name}`);
    }
    
    // 每帧更新
    update(deltaTime) {
        // 子类实现
    }
    
    // 渲染场景
    render(ctx, canvas) {
        // 子类实现
    }
    
    // 处理输入
    handleInput(event) {
        // 子类实现
    }
}

// 启动场景 (BOOT)
class BootScene extends Scene {
    constructor() {
        super(SCENES.BOOT);
        this.bootTimer = 0;
        this.showPrompt = false;
        this.promptFadeIn = 0;
    }
    
    enter(data) {
        super.enter(data);
        this.bootTimer = 0;
        this.showPrompt = false;
        this.promptFadeIn = 0;
    }
    
    update(deltaTime) {
        this.bootTimer += deltaTime;
        
        // 2秒后显示按键提示
        if (this.bootTimer >= 2.0) {
            this.showPrompt = true;
            this.promptFadeIn = Math.min(1, this.promptFadeIn + deltaTime * 2);
        }
    }
    
    render(ctx, canvas) {
        // 黑色背景
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 显示启动文字
        const alpha = Math.min(1, this.bootTimer * 0.8);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#33ccff';
        ctx.font = 'bold 32px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RESONANCE TERMINAL', canvas.width / 2, canvas.height / 2 - 60);
        ctx.font = '16px "Courier New"';
        ctx.fillText('v2.3 QUANTUM LINK EDITION', canvas.width / 2, canvas.height / 2 - 20);
        ctx.globalAlpha = 1;
        
        // 显示按键提示（闪烁效果）
        if (this.showPrompt) {
            const blink = Math.sin(this.bootTimer * 3) * 0.5 + 0.5;
            ctx.globalAlpha = this.promptFadeIn * blink;
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 20px "Courier New"';
            ctx.fillText('PRESS [ENTER] TO INITIALIZE', canvas.width / 2, canvas.height / 2 + 40);
            ctx.globalAlpha = 1;
        }
    }
    
    handleInput(event) {
        // 只有在提示显示后才能按Enter
        if (this.showPrompt && event.key === 'Enter') {
            // 触发CRT开机动画
            if (crtDisplay) {
                crtDisplay.powerOn();
            }
            // 等待一小段时间让开机动画开始，然后切换场景
            setTimeout(() => {
                sceneManager.switchScene(SCENES.CRT_ON, 'fade');
            }, 100);
            return true;
        }
        return false;
    }
}

// CRT关闭场景 (CRT_OFF)
class CrtOffScene extends Scene {
    constructor() {
        super(SCENES.CRT_OFF);
    }
    
    enter(data) {
        super.enter(data);
        // 显示提示信息
        logMsg("PRESS [P] TO POWER ON");
    }
    
    update(deltaTime) {
        // 等待用户按键开机
    }
    
    render(ctx, canvas) {
        // 黑屏
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 显示微弱的待机指示灯
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(0, 255, 0, ${pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(20, 20, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    handleInput(event) {
        // P键开机
        if (event.key.toLowerCase() === 'p') {
            // 触发CRT开机动画
            if (crtDisplay) {
                crtDisplay.powerOn();
            }
            // 切换到主菜单
            sceneManager.switchScene(SCENES.CRT_ON, 'fade', { manualPowerOn: true });
            return true;
        }
        return false;
    }
}

// CRT开启场景 (CRT_ON) - 主菜单/应用选择
class CrtOnScene extends Scene {
    constructor() {
        super(SCENES.CRT_ON);
        this.selectedApp = 0; // 0: Radio, 1: Robot Controller
        this.apps = ['RADIO', 'ROBOT'];
    }
    
    enter(data) {
        super.enter(data);
        
        // 如果是从手动关机后重新开机，也触发开机动画
        if (data && data.manualPowerOn && crtDisplay && !crtDisplay.isPoweredOn) {
            crtDisplay.powerOn();
        }
        
        logMsg("SELECT APPLICATION: [1] RADIO [2] ROBOT | [P] POWER OFF");
    }
    
    update(deltaTime) {
        // 应用选择逻辑
    }
    
    render(ctx, canvas) {
        // 绿色CRT背景
        ctx.fillStyle = '#001a00';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制应用菜单
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 24px "Courier New"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.fillText('RESONANCE TERMINAL v2.3', centerX, centerY - 100);
        
        ctx.font = '20px "Courier New"';
        ctx.fillText('[1] RADIO TRANSCEIVER', centerX, centerY);
        ctx.fillText('[2] ROBOT CONTROLLER', centerX, centerY + 40);
        
        ctx.font = '14px "Courier New"';
        ctx.fillStyle = '#00aa00';
        ctx.fillText('[P] POWER OFF', centerX, centerY + 120);
    }
    
    handleInput(event) {
        const key = event.key.toLowerCase();
        
        if (key === '1') {
            sceneManager.switchScene(SCENES.RADIO, 'fade');
            return true;
        } else if (key === '2') {
            sceneManager.switchScene(SCENES.ROBOT, 'fade');
            return true;
        } else if (key === 'p') {
            // 触发CRT关机动画
            if (crtDisplay) {
                crtDisplay.powerOff();
            }
            // 等待关机动画完成后切换场景
            setTimeout(() => {
                sceneManager.switchScene(SCENES.CRT_OFF, 'instant');
            }, 1000); // 关机动画约1秒
            return true;
        }
        return false;
    }
}

// 机器人控制器场景 (ROBOT) - 现有游戏
class RobotScene extends Scene {
    constructor() {
        super(SCENES.ROBOT);
    }
    
    enter(data) {
        super.enter(data);
        console.log('Robot scene entered with data:', data);
        // 初始化/恢复游戏状态
        // 这里会调用现有的 init() 函数
        
        // 重新创建所有物品的UI元素（如果物品已存在但UI丢失）
        if (typeof state !== 'undefined' && state.entities && state.entities.items) {
            state.entities.items.forEach(item => {
                if (!item.hintElement && typeof createItemHintUI === 'function') {
                    item.hintElement = createItemHintUI(item.type);
                }
            });
        }
    }
    
    exit() {
        super.exit();
        // 保存游戏状态
        
        // 清理所有物品UI（场景切换时）
        if (typeof cleanupAllItemUI === 'function') {
            cleanupAllItemUI();
        }
    }
    
    update(deltaTime) {
        // 调用机器人游戏更新和渲染函数
        if (typeof updateAndDrawRobot === 'function') {
            updateAndDrawRobot();
        }
    }
    
    render(ctx, canvas) {
        // 渲染由 updateAndDrawRobot 中的 draw() 处理
        // 这里不需要额外操作
    }
    
    handleInput(event) {
        // ESC键返回主菜单
        if (event.key === 'Escape') {
            sceneManager.switchScene(SCENES.CRT_ON, 'fade');
            return true;
        }
        // 其他输入由现有游戏系统处理
        return false;
    }
}

// 无线电场景 (RADIO)
class RadioScene extends Scene {
    constructor() {
        super(SCENES.RADIO);
        this.radio = null;
        this.radioUI = null;
    }
    
    enter(data) {
        super.enter(data);
        
        // 初始化无线电系统（如果还没初始化）
        if (!this.radio && typeof initRadioSystem === 'function') {
            this.radio = initRadioSystem();
            radioSystem = this.radio; // 设置全局引用
        } else if (radioSystem) {
            this.radio = radioSystem;
        }
        
        // 初始化无线电UI（DOM界面）
        if (!this.radioUI && typeof initRadioUI === 'function' && this.radio) {
            this.radioUI = initRadioUI(this.radio);
            radioUI = this.radioUI; // 设置全局引用
            // 初始化DOM
            this.radioUI.init();
        } else if (radioUI) {
            this.radioUI = radioUI;
            // 显示现有DOM
            const container = document.getElementById('radio-interface');
            if (container) {
                container.style.display = 'block';
            }
        }
        
        // 设置输入上下文
        if (typeof inputManager !== 'undefined') {
            inputManager.setContext(INPUT_CONTEXTS.RADIO);
            
            // 注册滚轮事件监听（用于调频）
            this.wheelHandler = (event) => {
                if (this.radio) {
                    if (event.originalEvent.shiftKey) {
                        // 精调
                        this.radio.tuneFine(event.delta > 0 ? -1 : 1);
                        if (this.radioUI) {
                            this.radioUI.knobRotations.fine += (event.delta > 0 ? -1 : 1) * 15;
                            this.radioUI.updateKnobRotation('knob-fine', this.radioUI.knobRotations.fine);
                        }
                    } else {
                        // 粗调
                        this.radio.tuneCoarse(event.delta > 0 ? -1 : 1);
                        if (this.radioUI) {
                            this.radioUI.knobRotations.coarse += (event.delta > 0 ? -1 : 1) * 30;
                            this.radioUI.updateKnobRotation('knob-coarse', this.radioUI.knobRotations.coarse);
                        }
                    }
                }
            };
            inputManager.on('onWheel', INPUT_CONTEXTS.RADIO, this.wheelHandler);
        }
        
        logMsg("RADIO TRANSCEIVER ACTIVE | [ESC] RETURN TO MENU");
    }
    
    exit() {
        super.exit();
        
        // 移除滚轮事件监听
        if (this.wheelHandler && typeof inputManager !== 'undefined') {
            inputManager.off('onWheel', INPUT_CONTEXTS.RADIO, this.wheelHandler);
        }
        
        // 隐藏无线电UI
        const container = document.getElementById('radio-interface');
        if (container) {
            container.style.display = 'none';
        }
        
        // 隐藏摩斯码对照表
        const morsePaper = document.getElementById('morse-paper');
        if (morsePaper) {
            morsePaper.style.display = 'none';
        }
        
        // 保存无线电状态（保持全局实例）
    }
    
    update(deltaTime) {
        if (this.radio) {
            this.radio.update(deltaTime);
        }
        if (this.radioUI) {
            this.radioUI.update(deltaTime);
        }
    }
    
    render(ctx, canvas) {
        // 清空canvas（无线电使用DOM渲染）
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 无线电UI通过DOM渲染，不需要canvas
    }
    
    handleInput(event) {
        if (!this.radio) return false;
        
        const key = event.key.toLowerCase();
        
        // ESC - 返回主菜单
        if (key === 'escape') {
            sceneManager.switchScene(SCENES.CRT_ON, 'fade');
            return true;
        }
        
        // 天线旋转（左右方向键）
        if (key === 'arrowleft') {
            this.radio.rotateAntenna(-5);
            if (this.radioUI) {
                this.radioUI.knobRotations.antenna -= 10;
                this.radioUI.updateKnobRotation('knob-ant', this.radioUI.knobRotations.antenna);
            }
            return true;
        }
        if (key === 'arrowright') {
            this.radio.rotateAntenna(5);
            if (this.radioUI) {
                this.radioUI.knobRotations.antenna += 10;
                this.radioUI.updateKnobRotation('knob-ant', this.radioUI.knobRotations.antenna);
            }
            return true;
        }
        
        // 操作按钮
        if (key === 'd') {
            this.radio.recordDirection();
            if (this.radioUI) {
                this.radioUI.flashButton('btn-direction');
            }
            return true;
        }
        if (key === 'p') {
            this.radio.sendPing();
            if (this.radioUI) {
                this.radioUI.flashButton('btn-ping');
            }
            return true;
        }
        if (key === 'm') {
            const marker = this.radio.markSignalOnMap();
            if (marker && this.radioUI) {
                this.radioUI.flashButton('btn-mark');
            }
            return true;
        }
        
        return false;
    }
}

// 组装场景 (ASSEMBLY) - 占位符
class AssemblyScene extends Scene {
    constructor() {
        super(SCENES.ASSEMBLY);
    }
    
    enter(data) {
        super.enter(data);
        logMsg("ROBOT ASSEMBLY | [ESC] RETURN TO MENU");
    }
    
    update(deltaTime) {
        // TODO: 实现组装系统更新
    }
    
    render(ctx, canvas) {
        // 占位符渲染
        ctx.fillStyle = '#001a00';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '20px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('ROBOT ASSEMBLY', canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = '16px "Courier New"';
        ctx.fillText('(Under Construction)', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Press ESC to return', canvas.width / 2, canvas.height / 2 + 40);
    }
    
    handleInput(event) {
        if (event.key === 'Escape') {
            sceneManager.switchScene(SCENES.CRT_ON, 'fade');
            return true;
        }
        return false;
    }
}

// 全局场景管理器实例
let sceneManager = null;

// 初始化场景管理器
function initSceneManager() {
    sceneManager = new SceneManager();
    
    // 注册所有场景
    sceneManager.registerScene(SCENES.BOOT, new BootScene());
    sceneManager.registerScene(SCENES.CRT_OFF, new CrtOffScene());
    sceneManager.registerScene(SCENES.CRT_ON, new CrtOnScene());
    sceneManager.registerScene(SCENES.ROBOT, new RobotScene());
    sceneManager.registerScene(SCENES.RADIO, new RadioScene());
    sceneManager.registerScene(SCENES.ASSEMBLY, new AssemblyScene());
    
    // 设置初始场景
    sceneManager.currentScene = SCENES.BOOT;
    sceneManager.scenes[SCENES.BOOT].enter({});
    
    console.log('Scene Manager initialized');
    
    return sceneManager;
}

