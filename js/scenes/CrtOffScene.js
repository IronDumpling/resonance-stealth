/**
 * CrtOffScene.js
 * CRT关闭场景
 */

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

