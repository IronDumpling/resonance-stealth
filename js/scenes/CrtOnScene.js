/**
 * CrtOnScene.js
 * CRT开启场景 - 主菜单/应用选择
 */

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
            // 先进入Assembly场景进行机器人装备
            sceneManager.switchScene(SCENES.ASSEMBLY, 'fade');
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

