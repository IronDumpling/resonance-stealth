// 场景管理系统 (Scene Management System)

// 场景类型定义
const SCENES = {
    BOOT: 'boot',                        // 启动场景
    CRT_OFF: 'crt_off',                  // CRT关闭状态
    CRT_ON: 'crt_on',                    // CRT开启状态
    RADIO: 'radio',                      // 无线电收发器界面
    ROBOT: 'robot',                      // 机器人控制器
    ROBOT_ASSEMBLY: 'robot_assembly',    // 机器人组装界面
    MONITOR_MENU: 'monitor_menu'         // 监视器菜单
};

// 显示器显示模式 (Monitor Display Modes)
const DISPLAY_MODES = {
    OFF: 'off',                     // Monitor off (boot sequence not started)
    BOOTING: 'booting',             // Boot animation in progress
    MENU: 'menu',                   // Mode selection menu
    RADIO_DISPLAY: 'radio_display', // Radio mode (map + decode interface)
    ROBOT_DISPLAY: 'robot_display', // Robot control mode (game view)
    ASSEMBLY_DISPLAY: 'assembly_display' // Assembly/navigation interface
};

// 无线电系统状态 (Radio System State)
const RADIO_STATE = {
    INACTIVE: 'inactive',   // Radio not powered on
    ACTIVE: 'active'        // Radio system running
};

// 场景管理器类
class SceneManager {
    constructor() {
        this.currentScene = SCENES.BOOT;
        this.previousScene = null;
        this.transitionProgress = 0;
        this.isTransitioning = false;
        this.transitionDuration = 0.3; // 默认过渡时间(秒)
        this.transitionType = 'fade';   // fade, slide, instant
        
        // 场景实例存储
        this.scenes = {};
        
        // 场景数据缓存
        this.sceneData = {};
        
        // 过渡回调
        this.onTransitionStart = null;
        this.onTransitionEnd = null;
        
        // 新架构：双系统状态管理
        this.displayMode = DISPLAY_MODES.OFF;      // Monitor display mode
        this.radioState = RADIO_STATE.INACTIVE;    // Radio system state
        this.previousDisplayMode = null;
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
        
        // 立即调用新场景的enter，确保在过渡期间可以正确渲染
        if (this.scenes[this.currentScene]) {
            this.scenes[this.currentScene].enter(data);
        }
        
        return true;
    }
    
    // 切换显示模式 (新方法)
    switchDisplayMode(mode, data = {}) {
        if (!Object.values(DISPLAY_MODES).includes(mode)) {
            console.error(`Invalid display mode: ${mode}`);
            return false;
        }
        
        this.previousDisplayMode = this.displayMode;
        this.displayMode = mode;
        
        console.log(`Display mode switched: ${this.previousDisplayMode} -> ${this.displayMode}`);
        
        // Update UI visibility
        const gameCanvas = document.getElementById('gameCanvas');
        const radioModeDisplay = document.getElementById('radio-mode-display');
        
        if (mode === DISPLAY_MODES.ROBOT_DISPLAY) {
            if (gameCanvas) gameCanvas.style.display = 'block';
            if (radioModeDisplay) radioModeDisplay.style.display = 'none';
        } else if (mode === DISPLAY_MODES.RADIO_DISPLAY) {
            if (gameCanvas) gameCanvas.style.display = 'none';
            if (radioModeDisplay) {
                radioModeDisplay.style.display = 'grid';
                radioModeDisplay.classList.add('active');
            }
        } else if (mode === DISPLAY_MODES.MENU) {
            // MENU模式需要显示gameCanvas（用于渲染菜单）
            if (gameCanvas) gameCanvas.style.display = 'block';
            if (radioModeDisplay) radioModeDisplay.style.display = 'none';
        } else if (mode === DISPLAY_MODES.BOOTING) {
            // BOOTING模式隐藏canvas（由CRT动画处理）
            if (gameCanvas) gameCanvas.style.display = 'none';
            if (radioModeDisplay) radioModeDisplay.style.display = 'none';
        }
        
        return true;
    }
    
    // 激活/停用无线电系统
    setRadioState(state) {
        if (!Object.values(RADIO_STATE).includes(state)) {
            console.error(`Invalid radio state: ${state}`);
            return false;
        }
        
        this.radioState = state;
        console.log(`Radio state changed to: ${state}`);
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
                
                // enter已经在switchScene时调用，这里只触发过渡结束回调
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
        
        // 更新无线电系统 (如果激活)
        if (this.radioState === RADIO_STATE.ACTIVE && typeof radioSystem !== 'undefined' && radioSystem) {
            radioSystem.update(deltaTime);
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
            } else {
                console.warn(`Scene not found for rendering: ${this.currentScene}`);
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
                // 叠加淡出效果（progress从0到1，alpha从1到0，实现淡入效果）
                // 当progress=0时，alpha=1（完全黑色），当progress=1时，alpha=0（完全透明）
                const alpha = Math.max(0, Math.min(1, 1 - progress));
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
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

// ========================================
// 场景类定义已移至 js/scenes/ 目录
// ========================================

// 全局场景管理器实例
let sceneManager = null;

// 初始化场景管理器
// 注意：此函数必须在所有场景类加载后调用
function initSceneManager() {
    sceneManager = new SceneManager();
    
    // 注册所有场景（场景类必须在之前加载）
    sceneManager.registerScene(SCENES.BOOT, new BootScene());
    sceneManager.registerScene(SCENES.CRT_OFF, new CrtOffScene());
    sceneManager.registerScene(SCENES.CRT_ON, new CrtOnScene());
    sceneManager.registerScene(SCENES.ROBOT, new RobotScene());
    sceneManager.registerScene(SCENES.RADIO, new RadioScene());
    sceneManager.registerScene(SCENES.ROBOT_ASSEMBLY, new RobotAssemblyScene());
    sceneManager.registerScene(SCENES.MONITOR_MENU, new MonitorMenuScene());
    
    // 设置初始场景
    sceneManager.currentScene = SCENES.BOOT;
    sceneManager.scenes[SCENES.BOOT].enter({});
    
    console.log('Scene Manager initialized');
    
    return sceneManager;
}
