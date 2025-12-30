/**
 * 无线电UI组件 - 真实仪表风格
 * Radio User Interface - Realistic Instrument Style
 */

class RadioUI {
    constructor(radioSystem) {
        this.radio = radioSystem;
        this.container = null;
        
        // 动画状态
        this.blinkTimer = 0;
        this.meterNeedleAngle = -45; // 信号表指针角度
        this.paperTapeMessages = []; // 纸带消息队列
        this.isPrinting = false;
        
        // 旋钮状态
        this.knobRotations = {
            coarse: 0,
            fine: 0,
            antenna: 0
        };
        
        console.log('Radio UI initialized');
    }
    
    /**
     * 初始化DOM界面
     */
    init(parentElement) {
        // 创建主容器
        this.container = document.createElement('div');
        this.container.id = 'radio-interface';
        this.container.innerHTML = this.generateHTML();
        
        // 如果提供了父元素，添加到父元素；否则添加到 body
        if (parentElement) {
            parentElement.appendChild(this.container);
        } else {
            document.body.appendChild(this.container);
        }
        
        // 等待DOM渲染完成后初始化
        setTimeout(() => {
            // 绑定事件
            this.bindEvents();
            
            // 初始化瀑布图 canvas
            this.initWaterfallCanvas();
            
            console.log('Radio UI DOM created and initialized');
        }, 0);
    }
    
    /**
     * 生成HTML结构
     */
    generateHTML() {
        return `
            <div class="radio-panel">
                <!-- 顶部标题 -->
                <div class="radio-header">
                    <div class="screw"></div>
                    <div class="screw"></div>
                    <span>RF-9000 SPECTRUM ANALYZER</span>
                    <div class="screw"></div>
                    <div class="screw"></div>
                </div>
                
                <!-- 瀑布图显示区 -->
                <div class="spectrum-container">
                    <canvas id="waterfall-canvas" width="600" height="200"></canvas>
                    <div class="tuner-line"></div>
                    <div class="freq-scale">
                        <span>100</span>
                        <span>120</span>
                        <span>140</span>
                        <span>160</span>
                        <span>180</span>
                        <span>200</span>
                    </div>
                </div>
                
                <!-- 控制面板 -->
                <div class="control-row">
                    <!-- 频率显示 -->
                    <div class="digital-display">
                        <div class="display-label">FREQUENCY</div>
                        <div class="display-value" id="freq-display">150.0</div>
                        <div class="display-unit">MHz</div>
                    </div>
                    
                    <!-- 粗调旋钮 -->
                    <div class="knob-group">
                        <div class="knob-label">COARSE</div>
                        <div class="knob" id="knob-coarse">
                            <div class="knob-indicator"></div>
                        </div>
                        <div class="knob-buttons">
                            <button class="knob-btn" data-knob="coarse" data-dir="-1">◄</button>
                            <button class="knob-btn" data-knob="coarse" data-dir="1">►</button>
                        </div>
                    </div>
                    
                    <!-- 精调旋钮 -->
                    <div class="knob-group">
                        <div class="knob-label">FINE</div>
                        <div class="knob knob-small" id="knob-fine">
                            <div class="knob-indicator"></div>
                        </div>
                        <div class="knob-buttons">
                            <button class="knob-btn" data-knob="fine" data-dir="-1">◄</button>
                            <button class="knob-btn" data-knob="fine" data-dir="1">►</button>
                        </div>
                    </div>
                </div>
                
                <!-- 天线和信号表 -->
                <div class="control-row">
                    <!-- 天线方向 -->
                    <div class="instrument-group">
                        <div class="instrument-label">ANTENNA DIRECTION</div>
                        <div class="compass-meter">
                            <canvas id="compass-canvas" width="120" height="120"></canvas>
                        </div>
                        <div class="knob knob-small" id="knob-ant" style="margin: 10px auto;">
                            <div class="knob-indicator"></div>
                        </div>
                        <div class="knob-buttons">
                            <button class="knob-btn" data-knob="antenna" data-dir="-1">◄</button>
                            <span id="antenna-display">0°</span>
                            <button class="knob-btn" data-knob="antenna" data-dir="1">►</button>
                        </div>
                    </div>
                    
                    <!-- 信号强度表 -->
                    <div class="instrument-group">
                        <div class="instrument-label">SIGNAL STRENGTH</div>
                        <div class="meter">
                            <canvas id="meter-canvas" width="160" height="100"></canvas>
                        </div>
                        <div class="signal-info" id="signal-info">
                            <div id="signal-callsign">--</div>
                            <div id="signal-freq">-- MHz</div>
                        </div>
                    </div>
                </div>
                
                <!-- 操作按钮 -->
                <div class="button-row">
                    <button class="action-btn" id="btn-direction">
                        <span class="btn-led"></span>
                        RECORD DIR [D]
                    </button>
                    <button class="action-btn" id="btn-ping">
                        <span class="btn-led"></span>
                        SEND PING [P]
                    </button>
                    <button class="action-btn" id="btn-mark">
                        <span class="btn-led"></span>
                        MARK MAP [M]
                    </button>
                </div>
                
                <!-- 摩斯码纸带输出 -->
                <div class="paper-tape-container">
                    <div class="tape-label">MORSE DECODER OUTPUT</div>
                    <div class="paper-tape" id="paper-tape">
                        <div class="tape-content" id="tape-content"></div>
                    </div>
                    <div class="tape-hint">Click message to view Morse code reference</div>
                </div>
            </div>
            
            <!-- 摩斯码对照表（纸张样式） -->
            <div class="morse-reference-paper" id="morse-paper" style="display: none;">
                <div class="paper-header">
                    <h3>INTERNATIONAL MORSE CODE</h3>
                    <button class="paper-close" id="close-morse">✕</button>
                </div>
                <div class="paper-content">
                    ${this.generateMorseTable()}
                </div>
            </div>
        `;
    }
    
    /**
     * 生成摩斯码对照表
     */
    generateMorseTable() {
        let html = '<div class="morse-grid">';
        
        // 字母
        html += '<div class="morse-section"><h4>LETTERS</h4>';
        for (let char = 65; char <= 90; char++) {
            const letter = String.fromCharCode(char);
            const morse = MORSE_CODE[letter] || '';
            html += `<div class="morse-item">
                <span class="morse-char">${letter}</span>
                <span class="morse-code">${morse}</span>
            </div>`;
        }
        html += '</div>';
        
        // 数字
        html += '<div class="morse-section"><h4>NUMBERS</h4>';
        for (let i = 0; i <= 9; i++) {
            const morse = MORSE_CODE[i.toString()] || '';
            html += `<div class="morse-item">
                <span class="morse-char">${i}</span>
                <span class="morse-code">${morse}</span>
            </div>`;
        }
        html += '</div>';
        
        html += '</div>';
        return html;
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 旋钮按钮
        document.querySelectorAll('.knob-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const knob = e.target.dataset.knob;
                const dir = parseInt(e.target.dataset.dir);
                this.handleKnobClick(knob, dir);
                
                // 按钮动画
                e.target.classList.add('active');
                setTimeout(() => e.target.classList.remove('active'), 100);
            });
        });
        
        // 操作按钮
        document.getElementById('btn-direction')?.addEventListener('click', () => {
            this.radio.recordDirection();
            this.flashButton('btn-direction');
        });
        
        document.getElementById('btn-ping')?.addEventListener('click', () => {
            this.radio.sendPing();
            this.flashButton('btn-ping');
        });
        
        document.getElementById('btn-mark')?.addEventListener('click', () => {
            this.radio.markSignalOnMap();
            this.flashButton('btn-mark');
        });
        
        // 纸带点击显示摩斯码表
        document.getElementById('paper-tape')?.addEventListener('click', () => {
            this.showMorseReference();
        });
        
        // 关闭摩斯码表
        document.getElementById('close-morse')?.addEventListener('click', () => {
            this.hideMorseReference();
        });
    }
    
    /**
     * 处理旋钮点击
     */
    handleKnobClick(knob, dir) {
        if (knob === 'coarse') {
            this.radio.tuneCoarse(dir);
            this.knobRotations.coarse += dir * 30;
            this.updateKnobRotation('knob-coarse', this.knobRotations.coarse);
        } else if (knob === 'fine') {
            this.radio.tuneFine(dir);
            this.knobRotations.fine += dir * 15;
            this.updateKnobRotation('knob-fine', this.knobRotations.fine);
        } else if (knob === 'antenna') {
            this.radio.rotateAntenna(dir * 5);
            this.knobRotations.antenna += dir * 10;
            this.updateKnobRotation('knob-ant', this.knobRotations.antenna);
        }
    }
    
    /**
     * 更新旋钮旋转
     */
    updateKnobRotation(knobId, angle) {
        const knob = document.getElementById(knobId);
        if (knob) {
            knob.style.transform = `rotate(${angle}deg)`;
        }
    }
    
    /**
     * 按钮闪烁效果
     */
    flashButton(btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            const led = btn.querySelector('.btn-led');
            led?.classList.add('active');
            setTimeout(() => led?.classList.remove('active'), 500);
        }
    }
    
    /**
     * 显示摩斯码对照表
     */
    showMorseReference() {
        const paper = document.getElementById('morse-paper');
        if (paper) {
            paper.style.display = 'block';
            paper.classList.add('paper-show');
        }
    }
    
    /**
     * 隐藏摩斯码对照表
     */
    hideMorseReference() {
        const paper = document.getElementById('morse-paper');
        if (paper) {
            paper.classList.remove('paper-show');
            setTimeout(() => {
                paper.style.display = 'none';
            }, 300);
        }
    }
    
    /**
     * 初始化瀑布图canvas
     */
    initWaterfallCanvas() {
        // 瀑布图canvas
        this.waterfallCanvas = document.getElementById('waterfall-canvas');
        if (this.waterfallCanvas) {
            // 设置canvas实际绘制尺寸
            const rect = this.waterfallCanvas.getBoundingClientRect();
            this.waterfallCanvas.width = rect.width || 600;
            this.waterfallCanvas.height = rect.height || 200;
            this.waterfallCtx = this.waterfallCanvas.getContext('2d');
            console.log('Waterfall canvas initialized:', this.waterfallCanvas.width, 'x', this.waterfallCanvas.height);
        } else {
            console.error('Waterfall canvas not found!');
        }
        
        // 罗盘canvas
        this.compassCanvas = document.getElementById('compass-canvas');
        if (this.compassCanvas) {
            this.compassCtx = this.compassCanvas.getContext('2d');
            console.log('Compass canvas initialized');
        }
        
        // 信号表canvas
        this.meterCanvas = document.getElementById('meter-canvas');
        if (this.meterCanvas) {
            this.meterCtx = this.meterCanvas.getContext('2d');
            console.log('Meter canvas initialized');
        }
    }
    
    /**
     * 添加纸带消息
     */
    addTapeMessage(message, morseCode) {
        const tapeContent = document.getElementById('tape-content');
        if (!tapeContent) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'tape-message';
        messageDiv.innerHTML = `
            <div class="tape-morse">${morseCode}</div>
            <div class="tape-text">${message}</div>
        `;
        
        // 打印动画
        messageDiv.style.opacity = '0';
        tapeContent.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 50);
        
        // 自动滚动
        setTimeout(() => {
            tapeContent.scrollTop = tapeContent.scrollHeight;
        }, 100);
    }
    
    /**
     * 更新显示
     */
    update(deltaTime) {
        this.blinkTimer += deltaTime;
        
        // 更新频率显示
        const freqDisplay = document.getElementById('freq-display');
        if (freqDisplay) {
            freqDisplay.textContent = this.radio.currentFrequency.toFixed(1);
        }
        
        // 更新天线显示
        const antennaDisplay = document.getElementById('antenna-display');
        if (antennaDisplay) {
            antennaDisplay.textContent = `${Math.round(this.radio.antennaAngle)}°`;
        }
        
        // 更新信号信息
        const signal = this.radio.getStrongestSignal();
        this.updateSignalInfo(signal);
        
        // 渲染canvas
        this.renderWaterfall();
        this.renderCompass();
        this.renderMeter(signal);
        
        // 更新游标位置
        this.updateTunerLine();
    }
    
    /**
     * 更新信号信息
     */
    updateSignalInfo(signal) {
        const callsignEl = document.getElementById('signal-callsign');
        const freqEl = document.getElementById('signal-freq');
        
        if (signal && signal.receivedStrength > 10) {
            if (callsignEl) callsignEl.textContent = signal.callsign;
            if (freqEl) freqEl.textContent = `${signal.frequency.toFixed(1)} MHz`;
            
            // 如果是新信号或信号内容变化，添加到纸带
            if (signal.message && !signal._tapeAdded) {
                this.addTapeMessage(signal.message, signal.morseWaveform);
                signal._tapeAdded = true;
            }
        } else {
            if (callsignEl) callsignEl.textContent = '--';
            if (freqEl) freqEl.textContent = '-- MHz';
        }
    }
    
    /**
     * 更新游标位置
     */
    updateTunerLine() {
        const tunerLine = document.querySelector('.tuner-line');
        if (!tunerLine) return;
        
        const range = RADIO_CONFIG.FREQ_MAX - RADIO_CONFIG.FREQ_MIN;
        const percent = ((this.radio.currentFrequency - RADIO_CONFIG.FREQ_MIN) / range) * 100;
        tunerLine.style.left = `${percent}%`;
    }
    
    /**
     * 渲染瀑布图
     */
    renderWaterfall() {
        if (!this.waterfallCtx || !this.waterfallCanvas) return;
        
        const ctx = this.waterfallCtx;
        const canvas = this.waterfallCanvas;
        const history = this.radio.waterfallHistory;
        
        if (history.length === 0) return;
        
        const rowHeight = canvas.height / Math.min(history.length, 50);
        const colWidth = canvas.width / history[0].length;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let row = 0; row < Math.min(history.length, 50); row++) {
            const spectrum = history[row];
            for (let col = 0; col < spectrum.length; col++) {
                const intensity = spectrum[col];
                
                // 绿色渐变
                let color;
                if (intensity < 0.2) {
                    color = `rgb(0, ${Math.floor(intensity * 255)}, 0)`;
                } else if (intensity < 0.6) {
                    const t = (intensity - 0.2) / 0.4;
                    color = `rgb(${Math.floor(t * 200)}, ${Math.floor(50 + t * 155)}, 0)`;
                } else {
                    const t = (intensity - 0.6) / 0.4;
                    color = `rgb(${Math.floor(200 + t * 55)}, ${Math.floor(205 + t * 50)}, ${Math.floor(t * 100)})`;
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(
                    col * colWidth,
                    row * rowHeight,
                    Math.ceil(colWidth),
                    Math.ceil(rowHeight)
                );
            }
        }
    }
    
    /**
     * 渲染罗盘
     */
    renderCompass() {
        if (!this.compassCtx || !this.compassCanvas) return;
        
        const ctx = this.compassCtx;
        const canvas = this.compassCanvas;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = 50;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 外圈
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 刻度
        for (let i = 0; i < 360; i += 45) {
            const angle = (i - 90) * Math.PI / 180;
            const x1 = cx + Math.cos(angle) * (radius - 5);
            const y1 = cy + Math.sin(angle) * (radius - 5);
            const x2 = cx + Math.cos(angle) * radius;
            const y2 = cy + Math.sin(angle) * radius;
            
            ctx.strokeStyle = '#777';
            ctx.lineWidth = i % 90 === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // 指针
        const angle = (this.radio.antennaAngle - 90) * Math.PI / 180;
        const x = cx + Math.cos(angle) * (radius - 10);
        const y = cy + Math.sin(angle) * (radius - 10);
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // 中心点
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * 渲染信号表
     */
    renderMeter(signal) {
        if (!this.meterCtx || !this.meterCanvas) return;
        
        const ctx = this.meterCtx;
        const canvas = this.meterCanvas;
        const cx = canvas.width / 2;
        const cy = canvas.height - 10;
        const radius = 70;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 表盘弧线
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
        ctx.stroke();
        
        // 刻度
        for (let i = 0; i <= 10; i++) {
            const angle = Math.PI + (i / 10) * Math.PI;
            const x1 = cx + Math.cos(angle) * (radius - 5);
            const y1 = cy + Math.sin(angle) * (radius - 5);
            const x2 = cx + Math.cos(angle) * radius;
            const y2 = cy + Math.sin(angle) * radius;
            
            ctx.strokeStyle = '#555';
            ctx.lineWidth = i % 2 === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // 数字
            if (i % 2 === 0) {
                ctx.fillStyle = '#777';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                const tx = cx + Math.cos(angle) * (radius - 15);
                const ty = cy + Math.sin(angle) * (radius - 15);
                ctx.fillText((i * 10).toString(), tx, ty + 3);
            }
        }
        
        // 指针
        const strength = signal ? signal.receivedStrength : 0;
        const targetAngle = Math.PI + (Math.min(strength, 100) / 100) * Math.PI;
        
        // 平滑过渡
        this.meterNeedleAngle += (targetAngle - this.meterNeedleAngle) * 0.1;
        
        const nx = cx + Math.cos(this.meterNeedleAngle) * (radius - 10);
        const ny = cy + Math.sin(this.meterNeedleAngle) * (radius - 10);
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        
        // 中心螺丝
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * 渲染主函数
     */
    render(deltaTime) {
        this.update(deltaTime);
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
