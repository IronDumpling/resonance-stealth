/**
 * 输入管理器
 * Input Manager System
 * 
 * 保留结构，移除业务逻辑
 */

import {
  IInputManager,
  InputContext,
  InputEvent,
  IMouseState,
  INPUT_CONTEXTS,
} from '@/types/systems';

export class InputManager implements IInputManager {
  currentContext: InputContext = INPUT_CONTEXTS.NONE;
  keyBindings: Map<InputContext, Record<string, string>> = new Map();
  activeKeys: Set<string> = new Set();
  mouseState: IMouseState = {
    x: 0,
    y: 0,
    buttons: [false, false, false],
    wheelDelta: 0,
  };

  callbacks: {
    onKeyDown: Map<InputContext | null, Array<(event: InputEvent) => void>>;
    onKeyUp: Map<InputContext | null, Array<(event: InputEvent) => void>>;
    onMouseMove: Map<InputContext | null, Array<(event: InputEvent) => void>>;
    onMouseDown: Map<InputContext | null, Array<(event: InputEvent) => void>>;
    onMouseUp: Map<InputContext | null, Array<(event: InputEvent) => void>>;
    onWheel: Map<InputContext | null, Array<(event: InputEvent) => void>>;
  } = {
    onKeyDown: new Map(),
    onKeyUp: new Map(),
    onMouseMove: new Map(),
    onMouseDown: new Map(),
    onMouseUp: new Map(),
    onWheel: new Map(),
  };

  constructor() {
    this.registerDefaultBindings();
    this.bindEventListeners();
  }

  /**
   * 注册默认键位绑定
   */
  registerDefaultBindings(): void {
    // CRT控制上下文
    this.registerContext(INPUT_CONTEXTS.CRT_CONTROL, {
      'p': 'power_toggle',
      'enter': 'confirm',
      'escape': 'cancel'
    });
    
    // 菜单上下文
    this.registerContext(INPUT_CONTEXTS.MENU, {
      '1': 'select_start_drive',
      '2': 'select_power_off',
      'arrowup': 'navigate_up',
      'arrowdown': 'navigate_down',
      'enter': 'confirm',
    });

    // 驾驶场景上下文（游戏主场景）
    this.registerContext(INPUT_CONTEXTS.DRIVE, {
      'w': 'throttle',
      'a': 'left_turn',
      's': 'brake',
      'd': 'right_turn',
      'shift': 'inventory',
      'e': 'interact',
      'space': 'emit_sonar',
      // 开发者专用：明亮/迷雾模式切换
      'l': 'toggle_map_visibility',
    });

    // 后备箱场景上下文
    this.registerContext(INPUT_CONTEXTS.INVENTORY, {
      'shift': 'drive',
      'w': 'inv_move_up',
      'a': 'inv_move_left',
      's': 'inv_move_down',
      'd': 'inv_move_right',
      'q': 'inv_rotate_left',
      'e': 'inv_rotate_right'
    });

    // 通用无线电控制上下文（频率调整、天线旋转、发射波）
    this.registerContext(INPUT_CONTEXTS.RADIO_CONTROLS, {
      'arrowup': 'freq_up',
      'arrowdown': 'freq_down',
      'arrowleft': 'antenna_left',
      'arrowright': 'antenna_right',
      ' ': 'emit_wave',
      'escape': 'menu',
    });
  }

  /**
   * 注册上下文键位绑定
   */
  registerContext(context: InputContext, bindings: Record<string, string>): void {
    this.keyBindings.set(context, bindings);
  }

  /**
   * 设置当前输入上下文
   */
  setContext(context: InputContext): void {
    if (!Object.values(INPUT_CONTEXTS).includes(context)) {
      console.warn(`Unknown input context: ${context}`);
      return;
    }
    
    console.log(`Input context changed: ${this.currentContext} -> ${context}`);
    this.currentContext = context;
    
    // 清空活动按键(防止上下文切换时的按键残留)
    this.activeKeys.clear();
  }

  /**
   * 获取当前上下文
   */
  getContext(): InputContext {
    return this.currentContext;
  }

  /**
   * 获取按键对应的动作
   * 支持检查多个上下文（用于通用控制，如无线电控制）
   */
  getAction(key: string, additionalContexts?: InputContext[]): string | null {
    const k = this.normalizeKey(key);
    // 首先检查当前上下文
    const currentBindings = this.keyBindings.get(this.currentContext);
    if (currentBindings) {
      const action = currentBindings[k];
      if (action) return action;
    }
    
    // 如果提供了额外上下文，也检查它们
    if (additionalContexts) {
      for (const context of additionalContexts) {
        const bindings = this.keyBindings.get(context);
        if (bindings) {
          const action = bindings[k];
          if (action) return action;
        }
      }
    }
    
    return null;
  }
  
  /**
   * 检查动作是否在指定上下文中激活
   * 用于检查通用控制（如无线电控制）是否激活
   */
  isActionActiveInContext(action: string, context: InputContext): boolean {
    const bindings = this.keyBindings.get(context);
    if (!bindings) return false;
    
    for (const [key, boundAction] of Object.entries(bindings)) {
      if (boundAction === action && this.activeKeys.has(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查按键是否按下
   */
  isKeyDown(key: string): boolean {
    return this.activeKeys.has(this.normalizeKey(key));
  }

  /**
   * 检查当前上下文是否支持无线电控制
   */
  private supportsRadioControls(): boolean {
    return this.currentContext === INPUT_CONTEXTS.DRIVE ||
           this.currentContext === INPUT_CONTEXTS.INVENTORY;
  }

  /**
   * 检查动作是否激活
   * 对于支持无线电控制的场景，也会检查 RADIO_CONTROLS 上下文
   */
  isActionActive(action: string): boolean {
    // 首先检查当前上下文
    const bindings = this.keyBindings.get(this.currentContext);
    if (bindings) {
      for (const [key, boundAction] of Object.entries(bindings)) {
        if (boundAction === action && this.activeKeys.has(key)) {
          return true;
        }
      }
    }
    
    // 如果当前上下文支持无线电控制，也检查 RADIO_CONTROLS
    if (this.supportsRadioControls()) {
      return this.isActionActiveInContext(action, INPUT_CONTEXTS.RADIO_CONTROLS);
    }
    
    return false;
  }

  /**
   * 注册回调函数
   */
  on(
    eventType: string,
    context: InputContext | null,
    callback: (event: InputEvent) => void
  ): void {
    const callbackMap = this.callbacks[eventType as keyof typeof this.callbacks];
    if (!callbackMap) return;

    if (!callbackMap.has(context)) {
      callbackMap.set(context, []);
    }
    callbackMap.get(context)?.push(callback);
  }

  /**
   * 移除回调函数
   */
  off(
    eventType: string,
    context: InputContext | null,
    callback: (event: InputEvent) => void
  ): void {
    const callbackMap = this.callbacks[eventType as keyof typeof this.callbacks];
    if (!callbackMap) return;
    
    const contextCallbacks = callbackMap.get(context);
    if (!contextCallbacks) return;
    
    const index = contextCallbacks.indexOf(callback);
    if (index !== -1) {
      contextCallbacks.splice(index, 1);
    }
  }

  /**
   * 触发回调
   */
  trigger(
    eventType: string,
    context: InputContext | null,
    event: InputEvent
  ): void {
    const callbackMap = this.callbacks[eventType as keyof typeof this.callbacks];
    if (!callbackMap) return;
    
    const contextCallbacks = callbackMap.get(context);
    if (contextCallbacks) {
      contextCallbacks.forEach(callback => callback(event));
    }
    
    // 也触发全局回调(context为null)
    const globalCallbacks = callbackMap.get(null);
    if (globalCallbacks) {
      globalCallbacks.forEach(callback => callback(event));
    }
  }

  /**
   * 绑定DOM事件监听器
   */
  bindEventListeners(): void {
    // 键盘事件：使用捕获阶段确保在其它处理器之前接收（避免 Q/E 等被拦截）
    window.addEventListener('keydown', (e) => this.handleKeyDown(e), true);
    window.addEventListener('keyup', (e) => this.handleKeyUp(e), true);
    
    // 鼠标事件
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    window.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    
    console.log('Input event listeners bound');
  }

  /** 标准化按键名（空格键 ' ' -> 'space'，与绑定一致；支持 event.code 如 KeyQ->q） */
  private normalizeKey(key: string, code?: string): string {
    const k = (key || '').toLowerCase();
    if (k === ' ' || k === 'space') return 'space';
    if (k === 'keyq' || k === 'q') return 'q';
    if (k === 'keye' || k === 'e') return 'e';
    if (k) return k;
    if (code) {
      const c = code.toLowerCase();
      if (c === 'keyq') return 'q';
      if (c === 'keye') return 'e';
      if (c === 'keyw') return 'w';
      if (c === 'keya') return 'a';
      if (c === 'keys') return 's';
      if (c === 'keyd') return 'd';
    }
    return k || '';
  }

  /**
   * 处理键盘按下
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return; // 忽略按键重复，避免 WASD 等每次移动两格
    const key = this.normalizeKey(event.key, event.code);

    // 防止重复触发（INVENTORY 下 Q/E 不跳过，避免 activeKeys 残留导致旋转失效）
    const skipDedup = this.currentContext === INPUT_CONTEXTS.INVENTORY && (key === 'q' || key === 'e');
    if (!skipDedup && this.activeKeys.has(key)) return;
    
    this.activeKeys.add(key);
    
    // 获取对应的动作
    // 对于支持无线电控制的场景，同时检查 RADIO_CONTROLS 上下文
    const action = this.supportsRadioControls()
      ? this.getAction(key, [INPUT_CONTEXTS.RADIO_CONTROLS])
      : this.getAction(key);
    
    // 创建增强的事件对象
    const enhancedEvent: InputEvent = {
      originalEvent: event,
      key: key,
      action: action || undefined,
      context: this.currentContext
    };

    // 触发当前上下文的回调
    this.trigger('onKeyDown', this.currentContext, enhancedEvent);
    
    // 如果动作来自 RADIO_CONTROLS 上下文，也触发该上下文的回调
    if (action && this.supportsRadioControls()) {
      const radioAction = this.getAction(key, [INPUT_CONTEXTS.RADIO_CONTROLS]);
      if (radioAction && radioAction === action) {
        this.trigger('onKeyDown', INPUT_CONTEXTS.RADIO_CONTROLS, enhancedEvent);
      }
    }
    
    // 如果有对应的动作，阻止默认行为(可选)
    if (action && this.shouldPreventDefault(key)) {
      event.preventDefault();
    }
  }

  /**
   * 处理键盘释放
   */
  handleKeyUp(event: KeyboardEvent): void {
    const key = this.normalizeKey(event.key, event.code);
    
    this.activeKeys.delete(key);
    
    // 对于支持无线电控制的场景，同时检查 RADIO_CONTROLS 上下文
    const action = this.supportsRadioControls()
      ? this.getAction(key, [INPUT_CONTEXTS.RADIO_CONTROLS])
      : this.getAction(key);
    
    const enhancedEvent: InputEvent = {
      originalEvent: event,
      key: key,
      action: action || undefined,
      context: this.currentContext
    };
    
    // 触发当前上下文的回调
    this.trigger('onKeyUp', this.currentContext, enhancedEvent);
    
    // 如果动作来自 RADIO_CONTROLS 上下文，也触发该上下文的回调
    if (action && this.supportsRadioControls()) {
      const radioAction = this.getAction(key, [INPUT_CONTEXTS.RADIO_CONTROLS]);
      if (radioAction && radioAction === action) {
        this.trigger('onKeyUp', INPUT_CONTEXTS.RADIO_CONTROLS, enhancedEvent);
      }
    }
    
    if (action && this.shouldPreventDefault(key)) {
      event.preventDefault();
    }
  }

  /**
   * 处理鼠标移动
   */
  handleMouseMove(event: MouseEvent): void {
    this.mouseState.x = event.clientX;
    this.mouseState.y = event.clientY;
    
    const enhancedEvent: InputEvent = {
      originalEvent: event,
      x: event.clientX,
      y: event.clientY,
      context: this.currentContext
    };
    
    this.trigger('onMouseMove', this.currentContext, enhancedEvent);
  }

  /**
   * 处理鼠标按下
   */
  handleMouseDown(event: MouseEvent): void {
    this.mouseState.buttons[event.button] = true;
    
    const enhancedEvent: InputEvent = {
      originalEvent: event,
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      context: this.currentContext
    };
    
    this.trigger('onMouseDown', this.currentContext, enhancedEvent);
  }

  /**
   * 处理鼠标释放
   */
  handleMouseUp(event: MouseEvent): void {
    this.mouseState.buttons[event.button] = false;
    
    const enhancedEvent: InputEvent = {
      originalEvent: event,
      button: event.button,
      x: event.clientX,
      y: event.clientY,
      context: this.currentContext
    };
    
    this.trigger('onMouseUp', this.currentContext, enhancedEvent);
  }

  /**
   * 处理鼠标滚轮
   */
  handleWheel(event: WheelEvent): void {
    this.mouseState.wheelDelta = event.deltaY;
    
    const enhancedEvent: InputEvent = {
      originalEvent: event,
      delta: event.deltaY,
      shiftKey: event.shiftKey,  // 直接提供 shiftKey 便于访问
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      context: this.currentContext
    };
    
    // 触发当前上下文的回调
    this.trigger('onWheel', this.currentContext, enhancedEvent);
    
    // 如果当前场景支持无线电控制，也触发无线电控制的滚轮事件（用于频率调整）
    if (this.supportsRadioControls()) {
      this.trigger('onWheel', INPUT_CONTEXTS.RADIO_CONTROLS, enhancedEvent);
    }
    
    // 在特定上下文中阻止默认滚动
    if (this.supportsRadioControls() || this.currentContext === INPUT_CONTEXTS.RADIO_CONTROLS) {
      event.preventDefault();
    }
  }

  /**
   * 判断是否应该阻止默认行为
   */
  shouldPreventDefault(key: string): boolean {
    // 在游戏上下文中阻止空格键的默认行为(页面滚动)
    if (key === ' ' && (
      this.currentContext === INPUT_CONTEXTS.DRIVE ||
      this.currentContext === INPUT_CONTEXTS.INVENTORY ||
      this.currentContext === INPUT_CONTEXTS.RADIO_CONTROLS
    )) {
      return true;
    }
    
    // 阻止方向键的默认行为
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      return true;
    }
    
    // 后备箱场景下阻止 Q/E 默认行为，确保旋转响应
    if (this.currentContext === INPUT_CONTEXTS.INVENTORY && ['q', 'e'].includes(key)) {
      return true;
    }
    
    return false;
  }

  /**
   * 获取鼠标状态
   */
  getMouseState(): IMouseState {
    return { ...this.mouseState };
  }

  /**
   * 重置输入状态
   */
  reset(): void {
    this.activeKeys.clear();
    this.mouseState = {
      x: 0,
      y: 0,
      buttons: [false, false, false],
      wheelDelta: 0,
    };
  }
}
