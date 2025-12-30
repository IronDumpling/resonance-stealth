// CRT显示器模拟系统 (CRT Display Simulation)

class CRTDisplay {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // CRT状态
        this.isPoweredOn = false;
        this.powerTransitionProgress = 0;
        this.powerTransitionDuration = 1.2; // 开机动画时长(秒)
        this.isTransitioning = false;
        this.transitionType = null; // 'power_on' 或 'power_off'
        
        // CRT效果参数
        this.effects = {
            scanlines: true,
            curvature: true,
            vignette: true,
            flicker: true,
            jitter: true,
            noise: false, // 默认关闭噪点(仅在无信号时开启)
            
            // 效果强度
            scanlineIntensity: 0.15,
            curvatureAmount: 0.05,
            vignetteStrength: 0.3,
            flickerAmount: 0.02,
            jitterAmount: 0.5,
            noiseAmount: 0.1
        };
        
        // 离屏canvas用于后处理
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        // 动画计时器
        this.time = 0;
        
        // 开机动画阶段
        this.powerOnStages = {
            DOT_APPEAR: 0,      // 中心白点闪现 (0-0.1s)
            DOT_EXPAND_V: 1,    // 垂直拉伸 (0.1-0.4s)
            LINE_EXPAND_H: 2,   // 水平展开 (0.4-0.9s)
            BRIGHTNESS_FADE: 3, // 亮度稳定 (0.9-1.2s)
            COMPLETE: 4         // 完成
        };
    }
    
    // 调整画布大小
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
    }
    
    // 更新CRT效果
    update(deltaTime) {
        this.time += deltaTime;
        
        // 更新开关机动画
        if (this.isTransitioning) {
            this.powerTransitionProgress += deltaTime / this.powerTransitionDuration;
            
            if (this.powerTransitionProgress >= 1.0) {
                this.powerTransitionProgress = 1.0;
                this.isTransitioning = false;
                
                if (this.transitionType === 'power_on') {
                    this.isPoweredOn = true;
                } else if (this.transitionType === 'power_off') {
                    this.isPoweredOn = false;
                }
            }
        }
    }
    
    // 开机
    powerOn() {
        if (this.isPoweredOn || this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.transitionType = 'power_on';
        this.powerTransitionProgress = 0;
        
        console.log('CRT powering on...');
    }
    
    // 关机
    powerOff() {
        if (!this.isPoweredOn || this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.transitionType = 'power_off';
        this.powerTransitionProgress = 0;
        
        console.log('CRT powering off...');
    }
    
    // 应用CRT后处理效果
    applyEffects(sourceCanvas) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 1. 将源内容复制到离屏canvas
        this.offscreenCtx.clearRect(0, 0, width, height);
        this.offscreenCtx.drawImage(sourceCanvas || this.canvas, 0, 0);
        
        // 2. 获取图像数据
        const imageData = this.offscreenCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // 3. 应用扫描线效果
        if (this.effects.scanlines) {
            this.applyScanlines(data, width, height);
        }
        
        // 4. 应用闪烁效果
        if (this.effects.flicker) {
            this.applyFlicker(data, width, height);
        }
        
        // 5. 写回
        this.offscreenCtx.putImageData(imageData, 0, 0);
        
        // 6. 清空主canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, width, height);
        
        // 7. 应用抖动
        let offsetX = 0, offsetY = 0;
        if (this.effects.jitter) {
            offsetX = (Math.random() - 0.5) * this.effects.jitterAmount;
            offsetY = (Math.random() - 0.5) * this.effects.jitterAmount;
        }
        
        // 8. 绘制处理后的图像
        this.ctx.drawImage(this.offscreenCanvas, offsetX, offsetY);
        
        // 9. 应用曲率效果(简化版，仅边缘暗化)
        if (this.effects.curvature) {
            this.applyCurvatureOverlay();
        }
        
        // 10. 应用晕影效果
        if (this.effects.vignette) {
            this.applyVignette();
        }
        
        // 11. 应用噪点(无信号时)
        if (this.effects.noise) {
            this.applyNoise();
        }
    }
    
    // 扫描线效果
    applyScanlines(data, width, height) {
        const intensity = this.effects.scanlineIntensity;
        
        for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                data[index] *= (1 - intensity);     // R
                data[index + 1] *= (1 - intensity); // G
                data[index + 2] *= (1 - intensity); // B
            }
        }
    }
    
    // 闪烁效果
    applyFlicker(data, width, height) {
        const flicker = Math.sin(this.time * 60) * this.effects.flickerAmount;
        const factor = 1 + flicker;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] *= factor;
            data[i + 1] *= factor;
            data[i + 2] *= factor;
        }
    }
    
    // 曲率叠加(简化版)
    applyCurvatureOverlay() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const amount = this.effects.curvatureAmount;
        
        // 绘制边缘暗化
        const gradient = this.ctx.createRadialGradient(
            width / 2, height / 2, Math.min(width, height) * 0.3,
            width / 2, height / 2, Math.min(width, height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${amount})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
    }
    
    // 晕影效果
    applyVignette() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        const gradient = this.ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${this.effects.vignetteStrength})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
    }
    
    // 噪点效果
    applyNoise() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const noiseAmount = this.effects.noiseAmount;
        
        // 创建噪点图像数据
        const imageData = this.ctx.createImageData(width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 255 * noiseAmount;
            data[i] = noise;
            data[i + 1] = noise;
            data[i + 2] = noise;
            data[i + 3] = 255;
        }
        
        this.ctx.globalAlpha = noiseAmount;
        this.ctx.putImageData(imageData, 0, 0);
        this.ctx.globalAlpha = 1;
    }
    
    // 渲染开机动画
    renderPowerOnAnimation() {
        const progress = this.powerTransitionProgress;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, width, height);
        
        // 阶段1: 中心绿点闪现 (0-0.1s)
        if (progress < 0.083) {
            const dotProgress = progress / 0.083;
            const dotSize = 3 * dotProgress;
            const brightness = dotProgress;
            
            this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, dotSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        // 阶段2: 垂直拉伸 (0.1-0.4s)
        else if (progress < 0.333) {
            const lineProgress = (progress - 0.083) / 0.25;
            const lineHeight = height * lineProgress;
            const lineWidth = 2;
            
            this.ctx.fillStyle = '#00cc00';
            this.ctx.fillRect(centerX - lineWidth / 2, centerY - lineHeight / 2, lineWidth, lineHeight);
        }
        // 阶段3: 水平展开 (0.4-0.9s)
        else if (progress < 0.75) {
            const expandProgress = (progress - 0.333) / 0.417;
            const rectWidth = width * expandProgress;
            const rectHeight = height;
            
            // 使用easeOut让展开更自然
            const eased = 1 - Math.pow(1 - expandProgress, 3);
            const finalWidth = width * eased;
            
            this.ctx.fillStyle = '#00cc00';
            this.ctx.fillRect(centerX - finalWidth / 2, 0, finalWidth, rectHeight);
        }
        // 阶段4: 亮度稳定 (0.9-1.2s)
        else {
            const fadeProgress = (progress - 0.75) / 0.25;
            const brightness = 1 - fadeProgress * 0.2; // 从100%降到80%
            
            this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
            this.ctx.fillRect(0, 0, width, height);
            
            // 抖动效果
            if (fadeProgress < 0.8) {
                const shake = Math.sin(fadeProgress * 30) * (1 - fadeProgress) * 5;
                this.ctx.translate(shake, 0);
            }
        }
    }
    
    // 渲染关机动画
    renderPowerOffAnimation() {
        const progress = this.powerTransitionProgress;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // 反向播放开机动画
        
        // 阶段1: 画面闪烁 (0-0.2s)
        if (progress < 0.2) {
            const flicker = Math.sin(progress * 50);
            const brightness = 0.5 + flicker * 0.5;
            
            this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
            this.ctx.fillRect(0, 0, width, height);
        }
        // 阶段2: 水平收缩 (0.2-0.4s)
        else if (progress < 0.4) {
            const shrinkProgress = (progress - 0.2) / 0.2;
            const rectWidth = width * (1 - shrinkProgress);
            
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, width, height);
            
            this.ctx.fillStyle = '#00cc00';
            this.ctx.fillRect(centerX - rectWidth / 2, 0, rectWidth, height);
        }
        // 阶段3: 垂直收缩 (0.4-0.6s)
        else if (progress < 0.6) {
            const shrinkProgress = (progress - 0.4) / 0.2;
            const lineHeight = height * (1 - shrinkProgress);
            const lineWidth = 2;
            
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, width, height);
            
            this.ctx.fillStyle = '#00cc00';
            this.ctx.fillRect(centerX - lineWidth / 2, centerY - lineHeight / 2, lineWidth, lineHeight);
        }
        // 阶段4: 绿点消失 (0.6-1.0s)
        else {
            const dotProgress = (progress - 0.6) / 0.4;
            const dotSize = 3 * (1 - dotProgress);
            const brightness = 1 - dotProgress;
            
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, width, height);
            
            if (dotSize > 0) {
                this.ctx.fillStyle = `rgba(0, 204, 0, ${brightness})`;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, dotSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    // 主渲染函数
    render(renderCallback) {
        // 处理开关机动画
        if (this.isTransitioning) {
            if (this.transitionType === 'power_on') {
                this.renderPowerOnAnimation();
            } else if (this.transitionType === 'power_off') {
                this.renderPowerOffAnimation();
            }
            return;
        }
        
        // 如果未开机，仍然允许场景渲染（如Boot场景），但不应用CRT效果
        if (!this.isPoweredOn) {
            // 先绘制黑色背景
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 仍然调用场景渲染（允许Boot场景等显示内容）
            if (renderCallback) {
                renderCallback(this.ctx, this.canvas);
            }
            return;
        }
        
        // 调用渲染回调（场景渲染）
        if (renderCallback) {
            renderCallback(this.ctx, this.canvas);
        }
        
        // 应用CRT效果
        // 注意：这里不再次应用效果，因为会覆盖场景内容
        // 如果需要后处理，应该在场景渲染到离屏canvas后再处理
    }
    
    // 启用/禁用效果
    toggleEffect(effectName, enabled) {
        if (this.effects.hasOwnProperty(effectName)) {
            this.effects[effectName] = enabled;
        }
    }
}

// 全局CRT实例
let crtDisplay = null;

// 初始化CRT显示器
function initCRTDisplay(canvas, ctx) {
    crtDisplay = new CRTDisplay(canvas, ctx);
    console.log('CRT Display initialized');
    return crtDisplay;
}

