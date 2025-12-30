// 输入管理系统 (Input Management System)

// 输入上下文类型
const INPUT_CONTEXTS = {
    NONE: 'none',
    CRT_CONTROL: 'crt_control',   // CRT开关机控制
    MENU: 'menu',                  // 菜单导航
    ROBOT: 'robot',                // 机器人控制(游戏)
    RADIO: 'radio',                // 无线电操作
    ASSEMBLY: 'assembly'           // 机器人组装
};

// 输入管理器类
class InputManager {
    constructor() {
        this.currentContext = INPUT_CONTEXTS.NONE;
        this.keyBindings = new Map();
        this.activeKeys = new Set();
        this.mouseState = {
            x: 0,
            y: 0,
            buttons: [false, false, false],
            wheelDelta: 0
        };
        
        // 输入回调
        this.callbacks = {
            onKeyDown: new Map(),
            onKeyUp: new Map(),
            onMouseMove: new Map(),
            onMouseDown: new Map(),
            onMouseUp: new Map(),
            onWheel: new Map()
        };
        
        // 注册默认键位绑定
        this.registerDefaultBindings();
        
        // 绑定事件监听器
        this.bindEventListeners();
    }
    
    // 注册默认键位绑定
    registerDefaultBindings() {
        // CRT控制上下文
        this.registerContext(INPUT_CONTEXTS.CRT_CONTROL, {
            'p': 'power_toggle',
            'enter': 'confirm',
            'escape': 'cancel'
        });
        
        // 菜单上下文
        this.registerContext(INPUT_CONTEXTS.MENU, {
            '1': 'select_radio',
            '2': 'select_robot',
            'p': 'power_off',
            'escape': 'back',
            'tab': 'toggle_mode'
        });
        
        // 机器人控制上下文(保留现有键位)
        this.registerContext(INPUT_CONTEXTS.ROBOT, {
            'w': 'move_up',
            'a': 'move_left',
            's': 'move_down',
            'd': 'move_right',
            ' ': 'emit_wave',
            'e': 'interact',
            'r': 'use_reserve',
            'f': 'struggle',
            'escape': 'menu',
            'tab': 'toggle_mode',
            'm': 'toggle_mode'  // Alternative key
        });
        
        // 无线电上下文
        this.registerContext(INPUT_CONTEXTS.RADIO, {
            'arrowup': 'freq_up',
            'arrowdown': 'freq_down',
            'arrowleft': 'antenna_left',
            'arrowright': 'antenna_right',
            'p': 'ping',
            'd': 'decode',
            't': 'transmit',
            'm': 'mark_location',
            'escape': 'menu',
            'tab': 'toggle_mode'
        });
        
        // 组装上下文
        this.registerContext(INPUT_CONTEXTS.ASSEMBLY, {
            '1': 'select_core_scavenger',
            '2': 'select_core_mimic',
            '3': 'select_core_heavy',
            'enter': 'deploy',
            'escape': 'menu',
            'tab': 'toggle_mode'
        });
    }
    
    // 注册上下文键位绑定
    registerContext(context, bindings) {
        this.keyBindings.set(context, bindings);
    }
    
    // 设置当前输入上下文
    setContext(context) {
        if (!Object.values(INPUT_CONTEXTS).includes(context)) {
            console.warn(`Unknown input context: ${context}`);
            return;
        }
        
        console.log(`Input context changed: ${this.currentContext} -> ${context}`);
        this.currentContext = context;
        
        // 清空活动按键(防止上下文切换时的按键残留)
        this.activeKeys.clear();
    }
    
    // 获取当前上下文
    getContext() {
        return this.currentContext;
    }
    
    // 获取按键对应的动作
    getAction(key) {
        const bindings = this.keyBindings.get(this.currentContext);
        if (!bindings) return null;
        
        const normalizedKey = key.toLowerCase();
        return bindings[normalizedKey] || null;
    }
    
    // 检查按键是否按下
    isKeyDown(key) {
        return this.activeKeys.has(key.toLowerCase());
    }
    
    // 检查动作是否激活
    isActionActive(action) {
        const bindings = this.keyBindings.get(this.currentContext);
        if (!bindings) return false;
        
        for (const [key, boundAction] of Object.entries(bindings)) {
            if (boundAction === action && this.activeKeys.has(key)) {
                return true;
            }
        }
        return false;
    }
    
    // 注册回调函数
    on(eventType, context, callback) {
        if (!this.callbacks[eventType]) {
            console.warn(`Unknown event type: ${eventType}`);
            return;
        }
        
        if (!this.callbacks[eventType].has(context)) {
            this.callbacks[eventType].set(context, []);
        }
        
        this.callbacks[eventType].get(context).push(callback);
    }
    
    // 移除回调函数
    off(eventType, context, callback) {
        if (!this.callbacks[eventType]) {
            console.warn(`Unknown event type: ${eventType}`);
            return;
        }
        
        const contextCallbacks = this.callbacks[eventType].get(context);
        if (!contextCallbacks) return;
        
        const index = contextCallbacks.indexOf(callback);
        if (index !== -1) {
            contextCallbacks.splice(index, 1);
        }
    }
    
    // 触发回调
    trigger(eventType, context, event) {
        if (!this.callbacks[eventType]) return;
        
        const contextCallbacks = this.callbacks[eventType].get(context);
        if (contextCallbacks) {
            contextCallbacks.forEach(callback => callback(event));
        }
        
        // 也触发全局回调(context为null)
        const globalCallbacks = this.callbacks[eventType].get(null);
        if (globalCallbacks) {
            globalCallbacks.forEach(callback => callback(event));
        }
    }
    
    // 绑定DOM事件监听器
    bindEventListeners() {
        // 键盘事件
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // 鼠标事件
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        window.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        console.log('Input event listeners bound');
    }
    
    // 处理键盘按下
    handleKeyDown(event) {
        const key = event.key.toLowerCase();
        
        // 防止重复触发
        if (this.activeKeys.has(key)) return;
        
        this.activeKeys.add(key);
        
        // Global hotkeys (work in any context)
        if (key === 'tab' && sceneManager) {
            event.preventDefault();
            this.handleModeToggle();
            return;
        }
        
        // 获取对应的动作
        const action = this.getAction(key);
        
        // 创建增强的事件对象
        const enhancedEvent = {
            originalEvent: event,
            key: key,
            action: action,
            context: this.currentContext
        };
        
        // 触发回调
        this.trigger('onKeyDown', this.currentContext, enhancedEvent);
        
        // 如果有对应的动作，阻止默认行为(可选)
        if (action && this.shouldPreventDefault(key)) {
            event.preventDefault();
        }
    }
    
    // Handle mode toggle (Tab key)
    handleModeToggle() {
        if (!sceneManager) return;
        
        const currentMode = sceneManager.displayMode;
        
        // Toggle between radio and robot display modes
        if (currentMode === DISPLAY_MODES.RADIO_DISPLAY) {
            sceneManager.switchDisplayMode(DISPLAY_MODES.ROBOT_DISPLAY);
            sceneManager.switchScene(SCENES.ROBOT, 'instant');
            console.log('Switched to ROBOT mode');
        } else if (currentMode === DISPLAY_MODES.ROBOT_DISPLAY) {
            sceneManager.switchDisplayMode(DISPLAY_MODES.RADIO_DISPLAY);
            sceneManager.switchScene(SCENES.RADIO, 'instant');
            console.log('Switched to RADIO mode');
        }
    }
    
    // 处理键盘释放
    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        
        this.activeKeys.delete(key);
        
        const action = this.getAction(key);
        
        const enhancedEvent = {
            originalEvent: event,
            key: key,
            action: action,
            context: this.currentContext
        };
        
        this.trigger('onKeyUp', this.currentContext, enhancedEvent);
        
        if (action && this.shouldPreventDefault(key)) {
            event.preventDefault();
        }
    }
    
    // 处理鼠标移动
    handleMouseMove(event) {
        this.mouseState.x = event.clientX;
        this.mouseState.y = event.clientY;
        
        const enhancedEvent = {
            originalEvent: event,
            x: event.clientX,
            y: event.clientY,
            context: this.currentContext
        };
        
        this.trigger('onMouseMove', this.currentContext, enhancedEvent);
    }
    
    // 处理鼠标按下
    handleMouseDown(event) {
        this.mouseState.buttons[event.button] = true;
        
        const enhancedEvent = {
            originalEvent: event,
            button: event.button,
            x: event.clientX,
            y: event.clientY,
            context: this.currentContext
        };
        
        this.trigger('onMouseDown', this.currentContext, enhancedEvent);
    }
    
    // 处理鼠标释放
    handleMouseUp(event) {
        this.mouseState.buttons[event.button] = false;
        
        const enhancedEvent = {
            originalEvent: event,
            button: event.button,
            x: event.clientX,
            y: event.clientY,
            context: this.currentContext
        };
        
        this.trigger('onMouseUp', this.currentContext, enhancedEvent);
    }
    
    // 处理鼠标滚轮
    handleWheel(event) {
        this.mouseState.wheelDelta = event.deltaY;
        
        const enhancedEvent = {
            originalEvent: event,
            delta: event.deltaY,
            shiftKey: event.shiftKey,  // 直接提供 shiftKey 便于访问
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            context: this.currentContext
        };
        
        this.trigger('onWheel', this.currentContext, enhancedEvent);
        
        // 在特定上下文中阻止默认滚动
        if (this.currentContext === INPUT_CONTEXTS.RADIO || 
            this.currentContext === INPUT_CONTEXTS.ROBOT) {
            event.preventDefault();
        }
    }
    
    // 判断是否应该阻止默认行为
    shouldPreventDefault(key) {
        // 在游戏上下文中阻止空格键的默认行为(页面滚动)
        if (key === ' ' && this.currentContext === INPUT_CONTEXTS.ROBOT) {
            return true;
        }
        
        // 阻止方向键的默认行为
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            return true;
        }
        
        return false;
    }
    
    // 获取鼠标状态
    getMouseState() {
        return { ...this.mouseState };
    }
    
    // 重置输入状态
    reset() {
        this.activeKeys.clear();
        this.mouseState = {
            x: 0,
            y: 0,
            buttons: [false, false, false],
            wheelDelta: 0
        };
    }
}

// 全局输入管理器实例
let inputManager = null;

// 初始化输入管理器
function initInputManager() {
    inputManager = new InputManager();
    console.log('Input Manager initialized');
    return inputManager;
}

// 辅助函数：创建键位绑定对象
function createKeyBinding(key, action) {
    return { key, action };
}

