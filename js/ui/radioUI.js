/**
 * 无线电UI组件 - 真实仪表风格
 * Radio User Interface - Realistic Instrument Style
 */

class RadioUI {
    constructor(radioSystem) {
        this.radio = radioSystem;
        this.container = null;
        
        // UI状态
        this.isActive = false;  // 是否可交互
        this.isVisible = true;  // 是否可见
        
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
     * 初始化DOM界面 - 嵌入到左侧面板
     */
    init(parentElement) {
        // 获取左侧无线电收发器容器
        const radioTransceiver = parentElement || document.getElementById('radio-transceiver');
        
        if (!radioTransceiver) {
            console.error('Radio transceiver container not found!');
            return;
        }
        
        // 创建主容器
        this.container = document.createElement('div');
        this.container.id = 'radio-interface';
        this.container.innerHTML = this.generateHTML();
        
        // 添加到左侧面板
        radioTransceiver.appendChild(this.container);
        
        // 等待DOM渲染完成后初始化
        setTimeout(() => {
            // 绑定事件
            this.bindEvents();
            
            // 初始化所有 canvas（瀑布图、指南针、信号表）
            this.initWaterfallCanvas();
            
            console.log('Radio UI DOM created and initialized in left panel');
        }, 0);
    }
    
    /**
     * 激活UI（允许交互）
     */
    activate() {
        this.isActive = true;
        if (this.container) {
            this.container.classList.remove('disabled');
        }
        console.log('Radio UI activated');
    }
    
    /**
     * 停用UI（禁止交互）
     */
    deactivate() {
        this.isActive = false;
        if (this.container) {
            this.container.classList.add('disabled');
        }
        console.log('Radio UI deactivated');
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
                    <button class="action-btn" id="btn-wave">
                        <span class="btn-led"></span>
                        EMIT WAVE [SPACE]
                    </button>
                </div>
                
                <!-- 摩斯码纸带输出 -->
                <div class="paper-tape-container">
                    <div class="tape-label">MORSE DECODER OUTPUT</div>
                    <div class="paper-tape" id="paper-tape">
                        <div class="tape-content" id="tape-content"></div>
                    </div>
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
                if (!this.isActive) return;  // 未激活时不响应
                const knob = e.target.dataset.knob;
                const dir = parseInt(e.target.dataset.dir);
                this.handleKnobClick(knob, dir);
                
                // 按钮动画
                e.target.classList.add('active');
                setTimeout(() => e.target.classList.remove('active'), 100);
            });
        });
        
        // 操作按钮
        document.getElementById('btn-wave')?.addEventListener('click', () => {
            if (!this.isActive) return;  // 未激活时不响应
            if (this.radio && typeof this.radio.emitPlayerWave === 'function') {
                this.radio.emitPlayerWave();
            }
            this.flashButton('btn-wave');
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
            this.radio.rotateAntenna(dir * 1); // 从5度改为1度，更精细调节
            this.knobRotations.antenna += dir * 2; // 旋钮视觉旋转也相应减少
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
        const paperTape = document.getElementById('paper-tape');
        if (!tapeContent || !paperTape) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'tape-message';
        messageDiv.innerHTML = `
            <div class="tape-morse">${morseCode}</div>
        `;
        
        // 添加新消息
        tapeContent.appendChild(messageDiv);
        
        // 计算新的高度并触发伸长动画
        const newHeight = Math.min(tapeContent.scrollHeight, 300);
        paperTape.style.minHeight = `${newHeight}px`;
        
        // 自动滚动到底部
        setTimeout(() => {
            paperTape.scrollTop = paperTape.scrollHeight;
        }, 100);
        
        // 添加打印声音效果提示（可选）
        console.log('📠 New morse code printed on tape');
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
        
        // 始终渲染瀑布图（包括敌人分析线）
        this.renderWaterfall();
        
        // 始终渲染指南针和信号表
        this.renderCompass();
        this.renderMeter(signal);
        
        // 更新游标位置和频率刻度
        this.updateTunerLine();
        this.updateFreqScale();
    }
    
    /**
     * 更新信号信息
     */
    updateSignalInfo(signal) {
        const callsignEl = document.getElementById('signal-callsign');
        const freqEl = document.getElementById('signal-freq');
        
        if (signal && signal.receivedStrength > 10) {
            // 获取根据信号强度降级的信息
            const degradedInfo = signal.getDegradedMessage(signal.receivedStrength);
            
            if (callsignEl) {
                callsignEl.textContent = degradedInfo.callsign;
                // 根据信号质量设置颜色
                if (degradedInfo.quality === 'clear') {
                    callsignEl.style.color = '#00ff00';
                } else if (degradedInfo.quality === 'noisy') {
                    callsignEl.style.color = '#ffff00';
                } else if (degradedInfo.quality === 'poor') {
                    callsignEl.style.color = '#ff8800';
                } else {
                    callsignEl.style.color = '#ff0000';
                }
            }
            
            if (freqEl) {
                freqEl.textContent = `${signal.frequency.toFixed(1)} MHz`;
            }
            
            // 根据信号强度决定是否添加到纸带
            const strengthKey = `_tape_${Math.floor(signal.receivedStrength / 10)}`;
            if (signal.message && !signal[strengthKey]) {
                this.addTapeMessage(degradedInfo.message, degradedInfo.morseCode);
                signal[strengthKey] = true;
                
                // 显示信号质量提示
                if (degradedInfo.quality !== 'clear') {
                    const qualityMsg = {
                        'noisy': 'SIGNAL NOISY - ADJUST TUNING',
                        'poor': 'SIGNAL POOR - ADJUST FREQUENCY & ANTENNA',
                        'weak': 'SIGNAL TOO WEAK'
                    };
                    logMsg(qualityMsg[degradedInfo.quality] || '');
                }
            }
        } else {
            if (callsignEl) {
                callsignEl.textContent = '--';
                callsignEl.style.color = '#00ff00';
            }
            if (freqEl) freqEl.textContent = '-- MHz';
        }
    }
    
    /**
     * 更新游标位置
     */
    updateTunerLine() {
        const tunerLine = document.querySelector('.tuner-line');
        if (!tunerLine) return;
        
        // 使用动态频率范围
        const range = this.radio.freqMax - this.radio.freqMin;
        const percent = ((this.radio.currentFrequency - this.radio.freqMin) / range) * 100;
        tunerLine.style.left = `${percent}%`;
    }
    
    /**
     * 更新频率刻度显示（动态适应核心范围）
     */
    updateFreqScale() {
        const freqScale = document.querySelector('.freq-scale');
        if (!freqScale) return;
        
        const min = this.radio.freqMin;
        const max = this.radio.freqMax;
        const step = (max - min) / 5; // 6个刻度点，5个间隔
        
        const spans = freqScale.querySelectorAll('span');
        if (spans.length === 6) {
            for (let i = 0; i < 6; i++) {
                spans[i].textContent = Math.round(min + step * i);
            }
        }
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
        
        // 绘制敌人分析频率条纹历史（橙色，宽度为共振范围）
        // 遍历历史记录，让橙色条纹像瀑布一样向下滚动
        const enemyHistory = this.radio.enemyFreqHistory || [];
        const resonanceRange = CFG.normalResTol; // 使用配置的普通共振容差
        
        if (enemyHistory.length > 0) {
            // 使用混合模式让橙色条纹叠加在瀑布图上
            ctx.globalCompositeOperation = 'lighter';
            
            const displayRows = Math.min(history.length, 50);
            const rowHeight = canvas.height / displayRows;
            
            // 遍历每一行历史记录
            for (let row = 0; row < Math.min(enemyHistory.length, displayRows); row++) {
                const enemyFreq = enemyHistory[row];
                
                // 如果该行有敌人频率（不是 null），则绘制橙色条纹
                if (enemyFreq !== null && enemyFreq !== undefined) {
                    const freqMin = enemyFreq - resonanceRange;
                    const freqMax = enemyFreq + resonanceRange;
                    
                    const xStart = this.radio.frequencyToIndex(freqMin, canvas.width);
                    const xEnd = this.radio.frequencyToIndex(freqMax, canvas.width);
                    const width = xEnd - xStart;
                    
                    // 绘制橙色条纹
                    for (let x = xStart; x < xEnd; x++) {
                        const distFromCenter = Math.abs(x - (xStart + width / 2)) / (width / 2);
                        const alpha = 0.5 + (1 - distFromCenter) * 0.3; // 中心更亮
                        
                        ctx.fillStyle = `rgba(255, 153, 0, ${alpha})`;
                        ctx.fillRect(
                            x,
                            row * rowHeight,
                            1,
                            Math.ceil(rowHeight)
                        );
                    }
                    
                    // 在第一行（最新的）添加标签
                    if (row === 0) {
                        const xCenter = this.radio.frequencyToIndex(enemyFreq, canvas.width);
                        
                        // 画中心标记线
                        ctx.strokeStyle = '#ff9900';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(xCenter, 0);
                        ctx.lineTo(xCenter, rowHeight);
                        ctx.stroke();
                        
                        // 添加标签
                        ctx.fillStyle = '#ff9900';
                        ctx.font = 'bold 10px monospace';
                        ctx.textAlign = 'center';
                        ctx.shadowColor = '#000';
                        ctx.shadowBlur = 3;
                        ctx.fillText('TARGET', xCenter, 12);
                        ctx.shadowBlur = 0;
                    }
                }
            }
            
            // 恢复混合模式
            ctx.globalCompositeOperation = 'source-over';
        }
        
        // 绘制波纹接触频率条纹历史
        const waveHistory = this.radio.waveContactHistory || [];
        const waveResonanceRange = CFG.normalResTol; // 使用配置的普通共振容差
        
        if (waveHistory.length > 0) {
            ctx.globalCompositeOperation = 'lighter';
            
            const displayRows = Math.min(history.length, 50);
            const rowHeight = canvas.height / displayRows;
            
            // 遍历每一行历史记录
            for (let row = 0; row < Math.min(waveHistory.length, displayRows); row++) {
                const waveFreqs = waveHistory[row]; // 数组，可能包含多个波纹
                
                if (!waveFreqs || waveFreqs.length === 0) continue;
                
                // 绘制每个波纹的条纹
                for (const wave of waveFreqs) {
                    const freq = wave.freq;
                    const source = wave.source;
                    const isReflected = wave.isReflected || false;
                    
                    // 根据来源选择颜色（阶段五：无线电系统升级）
                    let baseColor;
                    if (isReflected || source === 'reflection') {
                        baseColor = [0, 255, 0];  // 反弹波：绿色
                    } else if (source === 'player') {
                        baseColor = [0, 255, 255];  // 玩家波：青色
                    } else if (source === 'enemy') {
                        baseColor = [255, 100, 100];  // 敌人波：红色
                    } else if (source === 'pulse') {
                        baseColor = [255, 255, 0];  // 脉冲波：黄色
                    } else if (source === 'signal') {
                        baseColor = [255, 255, 0];  // 信号源波：黄色（5.2）
                    } else {
                        baseColor = [255, 153, 0];  // 其他：橙色（兼容旧系统）
                    }
                    
                    const freqMin = freq - waveResonanceRange;
                    const freqMax = freq + waveResonanceRange;
                    
                    const xStart = this.radio.frequencyToIndex(freqMin, canvas.width);
                    const xEnd = this.radio.frequencyToIndex(freqMax, canvas.width);
                    const width = xEnd - xStart;
                    
                    // 绘制条纹
                    for (let x = xStart; x < xEnd; x++) {
                        const distFromCenter = Math.abs(x - (xStart + width / 2)) / (width / 2);
                        const alpha = 0.4 + (1 - distFromCenter) * 0.3; // 中心更亮
                        
                        ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`;
                        ctx.fillRect(
                            x,
                            row * rowHeight,
                            1,
                            Math.ceil(rowHeight)
                        );
                    }
                }
            }
            
            // 恢复混合模式
            ctx.globalCompositeOperation = 'source-over';
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
        
        // 刻度（与雷达图一致：0度=右，90度=下，180度=左，270度=上）
        for (let i = 0; i < 360; i += 45) {
            const angle = i * Math.PI / 180;
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
        
        // 指针（与雷达图使用相同的角度系统）
        const angle = this.radio.antennaAngle * Math.PI / 180;
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
