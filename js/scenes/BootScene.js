/**
 * BootScene.js
 * 启动场景
 */

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
        
        // 在boot时就初始化无线电系统和UI，但保持禁用状态
        if (!radioSystem && typeof initRadioSystem === 'function') {
            initRadioSystem();
        }
        
        if (!radioUI && typeof initRadioUI === 'function' && radioSystem) {
            initRadioUI(radioSystem);
            if (radioUI) {
                radioUI.init();
                radioUI.deactivate();  // 初始化为禁用状态
            }
        }
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

