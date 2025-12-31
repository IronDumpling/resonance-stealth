/**
 * RadioScene.js
 * 无线电场景
 */

class RadioScene extends Scene {
    constructor() {
        super(SCENES.RADIO);
        this.radio = null;
        this.radioUI = null;
    }
    
    enter(data) {
        super.enter(data);
        
        // 使用全局的无线电系统（已在BootScene初始化）
        if (radioSystem) {
            this.radio = radioSystem;
            
            // 设置回调：无线电调整时同步到机器人
            radioSystem.onFrequencyChange = (freq) => {
                if (typeof state !== 'undefined') {
                    state.freq = freq;
                }
            };
        } else {
            console.error('Radio system not initialized!');
            return;
        }
        
        // 使用全局的无线电UI（已在BootScene初始化）
        if (radioUI) {
            this.radioUI = radioUI;
            // 确保UI可见并激活
            if (this.radioUI.container) {
                this.radioUI.container.style.display = 'flex';
            }
            // 确保UI是激活状态
            if (!this.radioUI.isActive) {
                this.radioUI.activate();
            }
        } else {
            console.error('Radio UI not initialized!');
            return;
        }
        
        // Initialize radio display UI if not already done
        if (!radioDisplayUI && typeof initRadioDisplayUI === 'function' && this.radio) {
            initRadioDisplayUI(this.radio);
        }
        
        // Show radio display
        if (radioDisplayUI) {
            radioDisplayUI.show();
        }
        
        // 设置输入上下文
        if (typeof inputManager !== 'undefined' && inputManager !== null) {
            inputManager.setContext(INPUT_CONTEXTS.RADIO);
            
            // 注册滚轮事件监听（用于调频）
            this.wheelHandler = (event) => {
                if (this.radio) {
                    // 使用 shiftKey 判断是否精调（优先使用直接字段，否则从 originalEvent 获取）
                    const isShiftPressed = event.shiftKey || event.originalEvent.shiftKey;
                    if (isShiftPressed) {
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
        if (this.wheelHandler && typeof inputManager !== 'undefined' && inputManager !== null) {
            inputManager.off('onWheel', INPUT_CONTEXTS.RADIO, this.wheelHandler);
        }
        
        // 清除回调
        if (radioSystem) {
            radioSystem.onFrequencyChange = null;
        }
        
        // Hide radio display (右侧显示器上的内容)
        if (radioDisplayUI) {
            radioDisplayUI.hide();
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
        if (radioDisplayUI && radioDisplayUI.isVisible) {
            radioDisplayUI.update(deltaTime);
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
        
        // 兼容处理：支持增强事件对象和原始事件对象
        const key = (event.key || (event.originalEvent && event.originalEvent.key) || '').toLowerCase();
        const action = event.action;
        
        // ESC - 返回RobotScene (M key now used for marking)
        if (action === 'menu' || key === 'escape') {
            if (sceneManager) {
                sceneManager.switchScene(SCENES.ROBOT, 'fade');
            }
            return true;
        }
        
        // 天线旋转（左右方向键）
        if (action === 'antenna_left' || key === 'arrowleft') {
            this.radio.rotateAntenna(-5);
            if (this.radioUI) {
                this.radioUI.knobRotations.antenna -= 10;
                this.radioUI.updateKnobRotation('knob-ant', this.radioUI.knobRotations.antenna);
            }
            return true;
        }
        if (action === 'antenna_right' || key === 'arrowright') {
            this.radio.rotateAntenna(5);
            if (this.radioUI) {
                this.radioUI.knobRotations.antenna += 10;
                this.radioUI.updateKnobRotation('knob-ant', this.radioUI.knobRotations.antenna);
            }
            return true;
        }
        
        // W key - 发射波纹
        if (action === 'emit_wave' || key === 'w') {
            const wave = this.radio.emitPlayerWave();
            if (radioDisplayUI && radioDisplayUI.radarMap) {
                radioDisplayUI.radarMap.showEmittedWave(wave);
            }
            if (this.radioUI) {
                this.radioUI.flashButton('btn-wave');
            }
            return true;
        }
        
        return false;
    }
}

