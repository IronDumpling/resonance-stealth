/**
 * RobotScene.js
 * 机器人控制器场景 - 现有游戏
 */

class RobotScene extends Scene {
    constructor() {
        super(SCENES.ROBOT);
    }
    
    enter(data) {
        super.enter(data);
        console.log('Robot scene entered with data:', data);
        
        // 初始化游戏(如果还没初始化)
        if (typeof state !== 'undefined' && !state.entities.walls.length) {
            if (typeof initInputHandlers === 'function') {
                initInputHandlers(); // 保留现有输入处理
            }
            if (typeof init === 'function') {
                init();
            }
        }
        
        // 设置输入上下文
        if (typeof inputManager !== 'undefined' && inputManager !== null) {
            inputManager.setContext(INPUT_CONTEXTS.ROBOT);
        }
        
        // 显示游戏canvas
        const gameCanvas = document.getElementById('gameCanvas');
        if (gameCanvas) gameCanvas.style.display = 'block';
        
        // 隐藏其他UI元素
        const radioModeDisplay = document.getElementById('radio-mode-display');
        if (radioModeDisplay) radioModeDisplay.style.display = 'none';
        
        const assemblyContainer = document.getElementById('assembly-container');
        if (assemblyContainer) {
            assemblyContainer.classList.remove('active');
            assemblyContainer.style.display = 'none';
        }
        
        // 显示游戏UI
        const worldUI = document.getElementById('world-ui-container');
        if (worldUI) worldUI.style.display = 'block';
        
        // 初始化并显示背包UI
        if (typeof createInventoryUI === 'function') {
            createInventoryUI();
            // 立即更新UI以显示已有物品
            if (typeof updateInventoryUI === 'function') {
                updateInventoryUI();
            }
            if (typeof showInventoryUI === 'function') {
                showInventoryUI();
            }
        }
        
        // 重新创建所有物品的UI元素（如果物品已存在但UI丢失）
        if (typeof state !== 'undefined' && state.entities && state.entities.items) {
            state.entities.items.forEach(item => {
                if (!item.hintElement && typeof createItemHintUI === 'function') {
                    item.hintElement = createItemHintUI(item.type);
                }
            });
        }
        
        // 同步无线电频率范围
        if (radioSystem && typeof state !== 'undefined' && state.p && state.p.currentCore) {
            const core = state.p.currentCore;
            radioSystem.setFrequencyRange(core.freqMin, core.freqMax);
            radioSystem.syncWithRobotFrequency(state.freq);
            
            // 设置回调：无线电调整时同步到机器人
            radioSystem.onFrequencyChange = (freq) => {
                if (typeof state !== 'undefined') {
                    state.freq = freq;
                }
            };
        }
        
        // 确保无线电UI激活
        if (radioUI) {
            radioUI.activate();
        }
        
        // 确保无线电系统激活并运行
        if (sceneManager) {
            sceneManager.setRadioState(RADIO_STATE.ACTIVE);
        }
        
        // 注册滚轮事件用于频率调整
        if (typeof inputManager !== 'undefined' && inputManager !== null) {
            this.wheelHandler = (event) => {
                // 使用 shiftKey 判断是否精调（优先使用直接字段，否则从 originalEvent 获取）
                const isFine = event.shiftKey || event.originalEvent.shiftKey;
                // 向上滚动提升频率，向下滚动降低频率
                const delta = event.delta > 0 ? -1 : 1;
                if (typeof adjustPlayerFrequency === 'function') {
                    adjustPlayerFrequency(delta, isFine);
                }
            };
            inputManager.on('onWheel', INPUT_CONTEXTS.ROBOT, this.wheelHandler);
        }
    }
    
    exit() {
        super.exit();
        
        // 移除滚轮事件
        if (this.wheelHandler && typeof inputManager !== 'undefined' && inputManager !== null) {
            inputManager.off('onWheel', INPUT_CONTEXTS.ROBOT, this.wheelHandler);
        }
        
        // 清除回调
        if (radioSystem) {
            radioSystem.onFrequencyChange = null;
        }
        
        // 隐藏游戏UI
        const worldUI = document.getElementById('world-ui-container');
        if (worldUI) worldUI.style.display = 'none';
        
        // 隐藏背包UI
        if (typeof hideInventoryUI === 'function') {
            hideInventoryUI();
        }
        
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
        
        // 更新无线电系统和UI（在机器人模式下也运行）
        if (radioSystem) {
            radioSystem.update(deltaTime);
        }
        if (radioUI) {
            radioUI.update(deltaTime);
        }
    }
    
    render(ctx, canvas) {
        // 渲染由 updateAndDrawRobot 中的 draw() 处理
        // 在右下角显示提示
        this.renderRadioHint(ctx, canvas);
    }
    
    renderRadioHint(ctx, canvas) {
        // 保存当前状态
        ctx.save();
        
        // 设置文字样式
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // 添加半透明背景
        const text = '[M] RADIO';
        const textMetrics = ctx.measureText(text);
        const padding = 8;
        const x = canvas.width - 10;
        const y = canvas.height - 10;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 30;
        
        // 绘制背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - bgWidth, y - bgHeight, bgWidth, bgHeight);
        
        // 绘制边框
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - bgWidth, y - bgHeight, bgWidth, bgHeight);
        
        // 绘制文字
        ctx.fillStyle = '#00ff00';
        ctx.fillText(text, x - padding, y - padding);
        
        // 恢复状态
        ctx.restore();
    }
    
    handleInput(event) {
        // 兼容处理：支持增强事件对象和原始事件对象
        const key = (event.key || (event.originalEvent && event.originalEvent.key) || '').toLowerCase();
        const action = event.action;
        
        // ESC键返回MonitorMenuScene
        if (action === 'menu' || key === 'escape') {
            if (sceneManager) {
                sceneManager.switchScene(SCENES.MONITOR_MENU, 'fade');
            }
            return true;
        }
        
        // M键进入RadioScene (toggle_mode action 或 m key)
        if (action === 'toggle_mode' || key === 'm') {
            if (sceneManager) {
                sceneManager.switchScene(SCENES.RADIO, 'fade');
            }
            return true;
        }
        
        // 其他输入由现有游戏系统处理
        return false;
    }
}

