/**
 * 无线电UI组件
 * Radio User Interface
 * 
 * 负责渲染：
 * - 瀑布图频谱显示
 * - 频率调谐控制
 * - 信号强度指示
 * - 天线方向控制
 * - 摩斯电码显示
 * - 控制按钮
 */

class RadioUI {
    constructor(radioSystem) {
        this.radio = radioSystem;
        this.canvas = null;
        this.ctx = null;
        
        // UI布局
        this.layout = {
            waterfallX: 20,
            waterfallY: 60,
            waterfallWidth: 760,
            waterfallHeight: 300,
            
            controlsY: 380,
            controlHeight: 200
        };
        
        // 颜色主题（绿色CRT风格）
        this.colors = {
            background: '#001a00',
            primary: '#00ff00',
            secondary: '#00aa00',
            dim: '#005500',
            bright: '#88ff88',
            signal: '#ffff00'
        };
        
        // 动画
        this.blinkTimer = 0;
        this.scanlineOffset = 0;
        
        console.log('Radio UI initialized');
    }
    
    /**
     * 初始化（绑定canvas）
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    
    /**
     * 渲染主界面
     */
    render(deltaTime) {
        if (!this.ctx || !this.canvas) return;
        
        this.blinkTimer += deltaTime;
        this.scanlineOffset += deltaTime * 20;
        if (this.scanlineOffset > 2) this.scanlineOffset = 0;
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // 背景
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 标题
        this.renderTitle(ctx);
        
        // 瀑布图
        this.renderWaterfall(ctx);
        
        // 控制面板
        this.renderControls(ctx);
        
        // 信息显示
        this.renderInfo(ctx);
        
        // 摩斯电码
        this.renderMorse(ctx);
        
        // 帮助文本
        this.renderHelp(ctx);
    }
    
    /**
     * 渲染标题
     */
    renderTitle(ctx) {
        ctx.fillStyle = this.colors.primary;
        ctx.font = 'bold 24px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('RADIO TRANSCEIVER v2.3', 20, 35);
        
        // 频率显示（大号）
        ctx.font = 'bold 32px "Courier New"';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.radio.currentFrequency.toFixed(1)} MHz`, 780, 35);
    }
    
    /**
     * 渲染瀑布图
     */
    renderWaterfall(ctx) {
        const layout = this.layout;
        const history = this.radio.waterfallHistory;
        
        // 边框
        ctx.strokeStyle = this.colors.secondary;
        ctx.lineWidth = 2;
        ctx.strokeRect(layout.waterfallX, layout.waterfallY, 
            layout.waterfallWidth, layout.waterfallHeight);
        
        // 标题
        ctx.fillStyle = this.colors.dim;
        ctx.font = '14px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('SPECTRUM WATERFALL', layout.waterfallX + 5, layout.waterfallY - 5);
        
        // 绘制频谱历史
        if (history.length > 0) {
            const rowHeight = layout.waterfallHeight / RADIO_CONFIG.WATERFALL_HEIGHT;
            const colWidth = layout.waterfallWidth / history[0].length;
            
            for (let row = 0; row < Math.min(history.length, RADIO_CONFIG.WATERFALL_HEIGHT); row++) {
                const spectrum = history[row];
                for (let col = 0; col < spectrum.length; col++) {
                    const intensity = spectrum[col];
                    
                    // 颜色映射：黑->绿->黄->白
                    let color;
                    if (intensity < 0.3) {
                        // 黑到绿
                        const t = intensity / 0.3;
                        color = `rgb(0, ${Math.floor(t * 100)}, 0)`;
                    } else if (intensity < 0.7) {
                        // 绿到黄
                        const t = (intensity - 0.3) / 0.4;
                        color = `rgb(${Math.floor(t * 255)}, ${Math.floor(100 + t * 155)}, 0)`;
                    } else {
                        // 黄到白
                        const t = (intensity - 0.7) / 0.3;
                        color = `rgb(255, 255, ${Math.floor(t * 255)})`;
                    }
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        layout.waterfallX + col * colWidth,
                        layout.waterfallY + row * rowHeight,
                        Math.ceil(colWidth),
                        Math.ceil(rowHeight)
                    );
                }
            }
        }
        
        // 当前频率指示线
        const freqRange = RADIO_CONFIG.FREQ_MAX - RADIO_CONFIG.FREQ_MIN;
        const freqPos = ((this.radio.currentFrequency - RADIO_CONFIG.FREQ_MIN) / freqRange) * layout.waterfallWidth;
        ctx.strokeStyle = this.colors.signal;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(layout.waterfallX + freqPos, layout.waterfallY);
        ctx.lineTo(layout.waterfallX + freqPos, layout.waterfallY + layout.waterfallHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 频率刻度
        ctx.fillStyle = this.colors.dim;
        ctx.font = '10px "Courier New"';
        ctx.textAlign = 'center';
        for (let freq = RADIO_CONFIG.FREQ_MIN; freq <= RADIO_CONFIG.FREQ_MAX; freq += 20) {
            const pos = ((freq - RADIO_CONFIG.FREQ_MIN) / freqRange) * layout.waterfallWidth;
            ctx.fillText(`${freq}`, layout.waterfallX + pos, layout.waterfallY + layout.waterfallHeight + 12);
        }
    }
    
    /**
     * 渲染控制面板
     */
    renderControls(ctx) {
        const y = this.layout.controlsY;
        
        // 调频控制
        ctx.fillStyle = this.colors.secondary;
        ctx.font = '16px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('TUNING', 20, y);
        
        ctx.fillStyle = this.colors.primary;
        ctx.font = '14px "Courier New"';
        ctx.fillText('[SCROLL] Coarse ±5MHz', 20, y + 25);
        ctx.fillText('[SHIFT+SCROLL] Fine ±0.1MHz', 20, y + 45);
        
        // 天线控制
        ctx.fillStyle = this.colors.secondary;
        ctx.font = '16px "Courier New"';
        ctx.fillText('ANTENNA', 320, y);
        
        // 天线方向指示器
        this.renderAntennaIndicator(ctx, 400, y + 40);
        
        // 操作按钮
        ctx.fillStyle = this.colors.secondary;
        ctx.font = '16px "Courier New"';
        ctx.fillText('OPERATIONS', 520, y);
        
        const buttons = [
            { key: 'D', label: 'RECORD DIRECTION', y: y + 25 },
            { key: 'P', label: 'SEND PING', y: y + 45 },
            { key: 'M', label: 'MARK ON MAP', y: y + 65 }
        ];
        
        ctx.fillStyle = this.colors.primary;
        ctx.font = '14px "Courier New"';
        for (let btn of buttons) {
            const blink = Math.sin(this.blinkTimer * 3) * 0.3 + 0.7;
            ctx.fillStyle = this.colors.primary;
            ctx.globalAlpha = blink;
            ctx.fillText(`[${btn.key}]`, 520, btn.y);
            ctx.globalAlpha = 1;
            ctx.fillText(btn.label, 560, btn.y);
        }
    }
    
    /**
     * 渲染天线指示器
     */
    renderAntennaIndicator(ctx, cx, cy) {
        const radius = 40;
        
        // 外圈
        ctx.strokeStyle = this.colors.secondary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 刻度
        ctx.strokeStyle = this.colors.dim;
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const angle = (i * 45) * Math.PI / 180;
            const x1 = cx + Math.cos(angle) * (radius - 5);
            const y1 = cy + Math.sin(angle) * (radius - 5);
            const x2 = cx + Math.cos(angle) * radius;
            const y2 = cy + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // 天线指针
        const angle = (this.radio.antennaAngle - 90) * Math.PI / 180; // -90度使0度指向上方
        const x = cx + Math.cos(angle) * (radius - 10);
        const y = cy + Math.sin(angle) * (radius - 10);
        
        ctx.strokeStyle = this.colors.signal;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // 角度文字
        ctx.fillStyle = this.colors.primary;
        ctx.font = 'bold 16px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(this.radio.antennaAngle)}°`, cx, cy + radius + 20);
    }
    
    /**
     * 渲染信息面板
     */
    renderInfo(ctx) {
        const x = 20;
        const y = this.layout.controlsY + 110;
        
        const signal = this.radio.getStrongestSignal();
        
        ctx.fillStyle = this.colors.secondary;
        ctx.font = '16px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('SIGNAL INFO', x, y);
        
        ctx.font = '14px "Courier New"';
        
        if (signal) {
            ctx.fillStyle = this.colors.primary;
            ctx.fillText(`CALLSIGN: ${signal.callsign}`, x, y + 25);
            ctx.fillText(`FREQUENCY: ${signal.frequency.toFixed(1)} MHz`, x, y + 45);
            ctx.fillText(`STRENGTH: ${Math.round(signal.receivedStrength)}%`, x, y + 65);
            
            // 信号强度条
            this.renderSignalBar(ctx, x + 200, y + 55, signal.receivedStrength);
            
            // 测量数据
            if (signal.measuredDirection !== null) {
                ctx.fillText(`DIRECTION: ${Math.round(signal.measuredDirection)}°`, x + 350, y + 25);
            }
            if (signal.measuredDistance !== null) {
                ctx.fillText(`DISTANCE: ${signal.measuredDistance.toFixed(2)} km`, x + 350, y + 45);
            }
            
            // Ping状态
            if (this.radio.isPinging) {
                const blink = Math.sin(this.blinkTimer * 10) * 0.5 + 0.5;
                ctx.globalAlpha = blink;
                ctx.fillStyle = this.colors.signal;
                ctx.fillText('PINGING...', x + 350, y + 65);
                ctx.globalAlpha = 1;
            }
        } else {
            ctx.fillStyle = this.colors.dim;
            ctx.fillText('NO SIGNAL DETECTED', x, y + 25);
        }
    }
    
    /**
     * 渲染信号强度条
     */
    renderSignalBar(ctx, x, y, strength) {
        const width = 120;
        const height = 16;
        
        // 背景
        ctx.fillStyle = '#002200';
        ctx.fillRect(x, y, width, height);
        
        // 强度条
        const barWidth = (strength / 100) * width;
        let color;
        if (strength < 30) color = '#ff0000';
        else if (strength < 60) color = '#ffaa00';
        else color = '#00ff00';
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, height);
        
        // 边框
        ctx.strokeStyle = this.colors.secondary;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    }
    
    /**
     * 渲染摩斯电码
     */
    renderMorse(ctx) {
        const x = 20;
        const y = this.layout.controlsY + 210;
        
        const signal = this.radio.getStrongestSignal();
        
        ctx.fillStyle = this.colors.secondary;
        ctx.font = '16px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('MORSE CODE', x, y);
        
        if (signal && signal.receivedStrength > 20) {
            ctx.font = '20px "Courier New"';
            ctx.fillStyle = this.colors.primary;
            
            // 波形
            ctx.fillText(signal.morseWaveform, x, y + 30);
            
            // 解码结果或占位符
            if (signal.decoded) {
                ctx.fillStyle = this.colors.bright;
                ctx.fillText(signal.decodedMessage, x, y + 55);
            } else {
                ctx.fillStyle = this.colors.dim;
                ctx.fillText('? ? ? ? ? ? ? ?', x, y + 55);
                
                ctx.font = '12px "Courier New"';
                ctx.fillStyle = this.colors.secondary;
                ctx.fillText('(Use Morse Code Reference to decode)', x, y + 75);
            }
        } else {
            ctx.font = '14px "Courier New"';
            ctx.fillStyle = this.colors.dim;
            ctx.fillText('SIGNAL TOO WEAK', x, y + 30);
        }
    }
    
    /**
     * 渲染帮助文本
     */
    renderHelp(ctx) {
        ctx.fillStyle = this.colors.dim;
        ctx.font = '12px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('[ESC] Return to Menu  |  [←→] Rotate Antenna', 20, this.canvas.height - 15);
    }
}

// 全局无线电UI实例
let radioUI = null;

/**
 * 初始化无线电UI
 */
function initRadioUI(radioSystem) {
    radioUI = new RadioUI(radioSystem);
    console.log('Radio UI ready');
    return radioUI;
}

