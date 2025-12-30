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
        if (typeof inputManager !== 'undefined') {
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
        if (typeof inputManager !== 'undefined') {
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
        if (this.wheelHandler && typeof inputManager !== 'undefined') {
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

