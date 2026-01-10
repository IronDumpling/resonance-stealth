/**
 * 无线电通讯系统
 * Radio Communication System
 * 
 * 功能：
 * - 频谱监听和瀑布图显示
 * - 频率调谐（粗调/精调）
 * - 信号测向和测距
 * - 摩斯电码解码
 * - 地图标点
 */

// 无线电配置
const RADIO_CONFIG = {
    FREQ_MIN: 100,          // 最低频率 (MHz)
    FREQ_MAX: 200,          // 最高频率 (MHz)
    COARSE_STEP: 5,         // 粗调步进 (MHz)
    FINE_STEP: 0.1,         // 精调步进 (MHz)
    SIGNAL_BANDWIDTH: 2.0,  // 信号带宽 (MHz)
    NOISE_LEVEL: 0.15,      // 基础噪声等级
    SPEED_OF_LIGHT: 300,    // 光速 (简化为 300 m/μs)
    WATERFALL_HEIGHT: 100,  // 瀑布图历史行数
    ANTENNA_SPEED: 5,       // 天线旋转速度 (度/秒)
};

// 摩斯电码表
const MORSE_CODE = {
    'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
    'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
    'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
    'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
    'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
    'Z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    ' ': '/'
};

// 反向摩斯码表
const MORSE_DECODE = {};
for (let char in MORSE_CODE) {
    MORSE_DECODE[MORSE_CODE[char]] = char;
}

// 信号类型定义
const SIGNAL_TYPES = {
    ASTRONAUT: 'astronaut',    // 宇航员信号（剧情）
    SURVIVOR: 'survivor',       // 幸存者信号
    BEACON: 'beacon',          // 信标信号
    INTERFERENCE: 'interference' // 干扰信号
};

/**
 * 无线电信号类
 */
class RadioSignal {
    constructor(config) {
        this.id = config.id || `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = config.type || SIGNAL_TYPES.SURVIVOR;
        this.frequency = config.frequency || 150.0;
        this.direction = config.direction || 0; // 0-360度
        this.distance = config.distance || 1.0;  // km
        this.message = config.message || '';
        this.callsign = config.callsign || `UNKNOWN-${this.id.substr(-4)}`;
        this.strength = config.strength || 50;   // 基础强度 0-100
        this.persistent = config.persistent || false; // 是否持久信号
        this.lifespan = config.lifespan || Infinity; // 生命周期（秒）
        this.discovered = false;
        
        // 测量数据
        this.measuredDirection = null;
        this.measuredDistance = null;
        this.decoded = false;
        this.decodedMessage = '';
        
        // 接收数据
        this.receivedStrength = 0;
        this.lastUpdateTime = Date.now();
        
        // 生成摩斯码
        this.morseCode = this.textToMorse(this.message);
        
        // 世界坐标（从direction和distance计算）
        // Direction: 0° = East, 90° = South, 180° = West, 270° = North
        const angleRad = this.direction * Math.PI / 180;
        const distanceMeters = this.distance * 1000; // Convert km to meters
        
        // 坐标将由radioSystem在addSignal时设置
        this.x = null;
        this.y = null;
        
        // 存储用于后续计算
        this._angleRad = angleRad;
        this._distanceMeters = distanceMeters;
        
        // 信号源波纹发射系统
        this.waveEmitInterval = config.waveEmitInterval || 5.0;  // 默认每5秒发射一次
        this.lastWaveEmitTime = 0;
        this.waveEmitCount = 0;  // 发射次数计数
    }
    
    textToMorse(text) {
        return text.toUpperCase().split('').map(char => 
            MORSE_CODE[char] || '?'
        ).join(' ');
    }
    
    /**
     * 根据信号强度生成不完整的信息
     * @param {number} strength - 信号强度 (0-100)
     */
    getDegradedMessage(strength) {
        if (strength >= 80) {
            // 完整信息
            return {
                callsign: this.callsign,
                message: this.message,
                morseCode: this.morseCode,
                quality: 'clear'
            };
        } else if (strength >= 50) {
            // 部分信息损坏
            const corruptionRate = 1 - (strength - 50) / 30; // 50%时损坏50%，80%时损坏0%
            return {
                callsign: this.corruptText(this.callsign, corruptionRate * 0.3),
                message: this.corruptText(this.message, corruptionRate * 0.4),
                morseCode: this.corruptMorse(this.morseCode, corruptionRate * 0.4),
                quality: 'noisy'
            };
        } else if (strength >= 20) {
            // 严重损坏
            return {
                callsign: this.corruptText(this.callsign, 0.7),
                message: this.corruptText(this.message, 0.8),
                morseCode: this.corruptMorse(this.morseCode, 0.8),
                quality: 'poor'
            };
        } else {
            // 几乎不可读
            return {
                callsign: '---',
                message: '...',
                morseCode: '.-?-.?',
                quality: 'weak'
            };
        }
    }
    
    /**
     * 损坏文本
     */
    corruptText(text, rate) {
        return text.split('').map(char => {
            if (Math.random() < rate) {
                const corrupted = ['?', '#', '*', '@', '~'];
                return corrupted[Math.floor(Math.random() * corrupted.length)];
            }
            return char;
        }).join('');
    }
    
    /**
     * 损坏摩斯码
     */
    corruptMorse(morse, rate) {
        return morse.split('').map(char => {
            if (Math.random() < rate) {
                if (char === '.' || char === '-') {
                    return Math.random() > 0.5 ? '?' : char;
                }
                return char;
            }
            return char;
        }).join('');
    }
    
    /**
     * 发射信号源波纹（5.2：信号源定期释放波纹）
     * @returns {object|null} 波纹对象，如果应该发射则返回，否则返回null
     */
    emitSignalWave() {
        if (!this.x || !this.y) return null;  // 坐标未设置，不发射
        
        // 检查是否到了发射时间
        const now = Date.now() / 1000;  // 转换为秒
        if (now - this.lastWaveEmitTime < this.waveEmitInterval) {
            return null;  // 还没到发射时间
        }
        
        // 更新发射时间
        this.lastWaveEmitTime = now;
        this.waveEmitCount++;
        
        // 生成信号源波纹（全向发射）
        if (typeof emitWave === 'function' && typeof state !== 'undefined') {
            const wave = emitWave(
                this.x,
                this.y,
                0,  // 角度（全向）
                Math.PI * 2,  // 全向扩散
                this.frequency,
                'signal',  // 标记为信号源波纹
                this.id,  // ownerId为信号ID
                false, false, false, 1,  // 标准参数
                false,  // 不是反弹波
                this.x,  // originalSourceX
                this.y   // originalSourceY
            );
            
            return wave;
        }
        
        return null;
    }
    
    update(deltaTime) {
        if (!this.persistent && this.lifespan !== Infinity) {
            this.lifespan -= deltaTime;
            return this.lifespan > 0;
        }
        return true;
    }
}

/**
 * 无线电系统类
 */
class RadioSystem {
    constructor() {
        this.currentFrequency = 150.0;
        this.antennaAngle = 270; // 天线指向角度（270度=朝上/北）
        this.signals = [];
        this.waterfallHistory = [];
        this.enemyFreqHistory = []; // 敌人频率历史记录
        this.lastSignalSpawnTime = 0;
        this.signalSpawnInterval = 120; // 2分钟生成一个信号
        
        // 动态频率范围（由机器人核心决定）
        this.freqMin = 100;  // 初始值，会被核心范围覆盖
        this.freqMax = 200;
        this.onFrequencyChange = null; // 回调函数，用于通知机器人系统
        
        // 玩家位置（避难所位置）
        this.shelterX = 0;
        this.shelterY = 0;
        
        // UI状态
        this.mode = 'MONITOR'; // MONITOR, DIRECTION, DECODE
        this.selectedSignal = null;
        
        // Ping状态
        this.isPinging = false;
        this.pingStartTime = 0;
        
        // 敌人频率分析
        this.enemyAnalysisFreq = null;
        
        // 波纹接触跟踪系统
        this.activeWaveContacts = []; // 当前活跃的波纹接触：[{ id, freq, source, timer }]
        this.waveContactHistory = []; // 波纹频率历史记录（用于瀑布图）
        
        // 波纹系统
        this.emittedWaves = []; // 玩家发出的波
        this.receivedResponses = []; // 接收到的响应波
        
        console.log('Radio System initialized');
    }
    
    /**
     * 添加信号
     */
    addSignal(config) {
        const signal = new RadioSignal(config);
        
        // 计算世界坐标（基于避难所位置）
        const angleRad = signal._angleRad;
        const distanceMeters = signal._distanceMeters;
        
        // Canvas坐标系：X向右（正=东），Y向下（正=南）
        // Direction定义：0°=东，45°=东北，90°=南，135°=东南，180°=西，225°=西南，270°=北，315°=西北
        // 由于Y轴向下，要让信号在"北"方向，需要Y减小，所以对sin取反
        signal.x = this.shelterX + Math.cos(angleRad) * distanceMeters;
        signal.y = this.shelterY - Math.sin(angleRad) * distanceMeters;  // 取反sin：正角度→Y减小（北）
        
        this.signals.push(signal);
        console.log(`Signal added: ${signal.callsign} at (${signal.x.toFixed(1)}, ${signal.y.toFixed(1)}), freq ${signal.frequency} MHz`);
        logMsg(`NEW SIGNAL DETECTED: ${signal.callsign}`);
        return signal;
    }
    
    /**
     * 移除信号
     */
    removeSignal(signalId) {
        const index = this.signals.findIndex(s => s.id === signalId);
        if (index !== -1) {
            const signal = this.signals[index];
            this.signals.splice(index, 1);
            console.log(`Signal removed: ${signal.callsign}`);
            logMsg(`SIGNAL LOST: ${signal.callsign}`);
        }
    }
    
    /**
     * 发射玩家波纹
     */
    emitPlayerWave() {
        const wave = {
            id: `wave_${Date.now()}`,
            x: this.shelterX,
            y: this.shelterY,
            r: 0,
            maxR: 10000, // 10km range
            speed: 300, // m/s (simplified light speed)
            freq: this.currentFrequency,
            emitTime: Date.now()
        };
        this.emittedWaves.push(wave);
        logMsg(`WAVE EMITTED AT ${this.currentFrequency.toFixed(1)} MHz`);
        return wave;
    }
    
    /**
     * 更新波纹系统
     */
    updateWaves(deltaTime) {
        // 更新发出的波纹（玩家发出的波）
        for (let i = this.emittedWaves.length - 1; i >= 0; i--) {
            const wave = this.emittedWaves[i];
            
            // 跳过响应波（在第二个循环中处理）
            if (wave.signal) continue;
            
            // 扩展波纹半径
            wave.r += wave.speed * deltaTime;
            
            // 检查是否超出范围
            if (wave.r > wave.maxR) {
                this.emittedWaves.splice(i, 1);
                continue;
            }
            
            // 检查与信号的碰撞
            for (const signal of this.signals) {
                if (!signal.x || !signal.y) continue;
                
                const dx = signal.x - wave.x;
                const dy = signal.y - wave.y;
                const distToSignal = Math.sqrt(dx * dx + dy * dy);
                
                // 检查波纹是否扫过信号（使用上一帧和当前帧的半径）
                const lastR = wave.r - wave.speed * deltaTime;
                if (distToSignal >= lastR && distToSignal <= wave.r) {
                    // 检查频率匹配（使用信号的带宽作为共振范围）
                    // SIGNAL_BANDWIDTH 是总带宽（MHz），共振容差是半宽
                    const resonanceTolerance = RADIO_CONFIG.SIGNAL_BANDWIDTH / 2; // ±1.0 MHz (如果带宽是2.0 MHz)
                    const freqDiff = Math.abs(wave.freq - signal.frequency);
                    if (freqDiff <= resonanceTolerance) {
                        // 计算从信号到玩家的距离（用于响应波）
                        const dxToPlayer = this.shelterX - signal.x;
                        const dyToPlayer = this.shelterY - signal.y;
                        const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
                        
                        // 触发共振，创建响应波
                        const responseWave = {
                            id: `response_${Date.now()}_${signal.id}`,
                            x: signal.x,
                            y: signal.y,
                            targetX: this.shelterX,
                            targetY: this.shelterY,
                            r: 0,
                            maxR: distToPlayer, // 响应波的最大范围是从信号到玩家的距离
                            speed: wave.speed,
                            freq: signal.frequency, // 响应波使用信号的频率
                            signal: signal,
                            emitTime: Date.now(),
                            distance: distToSignal / 1000 // meters to km（玩家波到信号的距离）
                        };
                        this.emittedWaves.push(responseWave);
                        
                        console.log(`Signal ${signal.callsign} resonating at ${wave.freq.toFixed(1)} MHz - Response wave created`);
                    }
                }
            }
        }
        
        // 更新响应波纹（检查是否到达玩家）
        for (let i = this.emittedWaves.length - 1; i >= 0; i--) {
            const wave = this.emittedWaves[i];
            if (!wave.signal) continue; // 不是响应波，跳过
            
            // 更新响应波的半径（向玩家扩展）
            wave.r += wave.speed * deltaTime;
            
            const dx = wave.targetX - wave.x;
            const dy = wave.targetY - wave.y;
            const distToTarget = Math.sqrt(dx * dx + dy * dy);
            
            // 检查是否到达玩家
            if (wave.r >= distToTarget) {
                // 标记信号为已发现
                wave.signal.discovered = true;
                
                // 在信号位置创建任务道具（如果还没有创建）
                if (!wave.signal.questItemCreated && typeof spawnItem === 'function') {
                    spawnItem('quest_item', wave.signal.x, wave.signal.y);
                    wave.signal.questItemCreated = true;
                    logMsg(`QUEST ITEM SPAWNED AT SIGNAL LOCATION`);
                }
                
                // 计算延迟时间（毫秒）
                const delay = (wave.distance * 2 * 1000) / wave.speed;
                
                // 添加到接收响应
                this.receivedResponses.push({
                    signal: wave.signal,
                    morse: wave.signal.morseCode,
                    delay: delay,
                    distance: wave.distance,
                    callsign: wave.signal.callsign,
                    strength: wave.signal.receivedStrength,
                    frequency: wave.signal.frequency,
                    timestamp: Date.now()
                });
                
                // 移除响应波
                this.emittedWaves.splice(i, 1);
                
                console.log(`Received response from ${wave.signal.callsign} - Distance: ${wave.distance.toFixed(2)} km, Delay: ${delay.toFixed(2)} ms`);
            } else if (wave.r > wave.maxR) {
                // 响应波超出范围，移除
                this.emittedWaves.splice(i, 1);
            }
        }
    }
    
    /**
     * 设置频率范围（由机器人核心决定）
     */
    setFrequencyRange(min, max) {
        this.freqMin = min;
        this.freqMax = max;
        // 确保当前频率在新范围内
        this.currentFrequency = Math.max(min, Math.min(max, this.currentFrequency));
        this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
        this.updateSignalStrengths();
    }
    
    /**
     * 与机器人频率同步
     */
    syncWithRobotFrequency(freq) {
        this.currentFrequency = freq;
        this.updateSignalStrengths();
    }
    
    /**
     * 粗调频率
     */
    tuneCoarse(delta) {
        this.currentFrequency += delta * RADIO_CONFIG.COARSE_STEP;
        this.currentFrequency = Math.max(this.freqMin, 
            Math.min(this.freqMax, this.currentFrequency));
        this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
        
        // 通知机器人系统
        if (this.onFrequencyChange) {
            this.onFrequencyChange(this.currentFrequency);
        }
        
        this.updateSignalStrengths();
    }
    
    /**
     * 精调频率
     */
    tuneFine(delta) {
        this.currentFrequency += delta * RADIO_CONFIG.FINE_STEP;
        this.currentFrequency = Math.max(this.freqMin, 
            Math.min(this.freqMax, this.currentFrequency));
        this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
        
        // 通知机器人系统
        if (this.onFrequencyChange) {
            this.onFrequencyChange(this.currentFrequency);
        }
        
        this.updateSignalStrengths();
    }
    
    /**
     * 旋转天线（5.3：同步到场景中的天线方向）
     */
    rotateAntenna(delta) {
        this.antennaAngle += delta;
        this.antennaAngle = (this.antennaAngle + 360) % 360;
        
        // 同步到场景中的天线系统（5.3）
        if (typeof state !== 'undefined' && state.antennaSystem) {
            // 将角度转换为弧度并更新
            const angleRad = this.antennaAngle * Math.PI / 180;
            state.antennaSystem.updateDirection(angleRad);
        }
        
        this.updateSignalStrengths();
    }
    
    /**
     * 同步天线方向（从场景到Radio UI，5.3）
     */
    syncAntennaDirection() {
        if (typeof state !== 'undefined' && state.antennaSystem) {
            // 从场景中的天线系统获取方向（弧度），转换为角度
            const angleRad = state.antennaSystem.direction;
            this.antennaAngle = (angleRad * 180 / Math.PI + 360) % 360;
        } else if (typeof state !== 'undefined' && state.p) {
            // 回退：从玩家朝向获取
            const angleRad = state.p.a;
            this.antennaAngle = (angleRad * 180 / Math.PI + 360) % 360;
        }
    }
    
    /**
     * 更新信号强度
     */
    updateSignalStrengths() {
        for (let signal of this.signals) {
            // 频率匹配度（高斯衰减）- 调整使其更容易达到高值
            const freqDiff = Math.abs(signal.frequency - this.currentFrequency);
            let frequencyMatch = 0;
            if (freqDiff < RADIO_CONFIG.SIGNAL_BANDWIDTH) {
                // 增加容差，更容易达到高匹配度
                frequencyMatch = Math.exp(-Math.pow(freqDiff / (RADIO_CONFIG.SIGNAL_BANDWIDTH * 2), 2));
            }
            
            // 方向匹配度（余弦函数）- 优化使其在正确方向时更强
            const angleDiff = Math.abs(this.normalizeAngle(signal.direction - this.antennaAngle));
            // 使用更窄的波束宽度，但峰值更高
            const directionMatch = Math.pow(Math.cos(angleDiff * Math.PI / 180), 2) * 0.7 + 0.3; // 平方使峰值更尖锐
            
            // 距离衰减
            const distanceAttenuation = 1 / (1 + signal.distance * 0.03);
            
            // 计算接收强度
            signal.receivedStrength = signal.strength * frequencyMatch * directionMatch * distanceAttenuation * 1.5;
        }
    }
    
    /**
     * 获取最强信号
     */
    getStrongestSignal() {
        if (this.signals.length === 0) return null;
        
        let strongest = this.signals[0];
        for (let signal of this.signals) {
            if (signal.receivedStrength > strongest.receivedStrength) {
                strongest = signal;
            }
        }
        
        return strongest.receivedStrength > 10 ? strongest : null;
    }
    
    /**
     * 记录测向
     */
    recordDirection() {
        const signal = this.getStrongestSignal();
        if (!signal) {
            logMsg("NO SIGNAL DETECTED");
            return false;
        }
        
        if (signal.receivedStrength < 30) {
            logMsg("SIGNAL TOO WEAK FOR DIRECTION FINDING");
            return false;
        }
        
        signal.measuredDirection = this.antennaAngle;
        logMsg(`DIRECTION RECORDED: ${this.antennaAngle}° (${Math.round(signal.receivedStrength)}%)`);
        return true;
    }
    
    /**
     * 发送 Ping
     */
    sendPing() {
        const signal = this.getStrongestSignal();
        if (!signal) {
            logMsg("NO SIGNAL TO PING");
            return;
        }
        
        // 检查频率是否精确匹配
        const freqDiff = Math.abs(signal.frequency - this.currentFrequency);
        if (freqDiff > 0.5) {
            logMsg("FREQUENCY MISMATCH - ADJUST TUNING");
            return;
        }
        
        this.isPinging = true;
        this.pingStartTime = Date.now();
        logMsg("PING SENT...");
        
        // Show ping wave on radar display
        if (typeof radioDisplayUI !== 'undefined' && radioDisplayUI) {
            radioDisplayUI.showPingWave();
        }
        
        // 计算延迟（简化：距离km转换为毫秒延迟）
        const delay = (signal.distance / RADIO_CONFIG.SPEED_OF_LIGHT) * 2 * 1000;
        
        setTimeout(() => {
            if (this.isPinging) {
                const measuredDistance = signal.distance + (Math.random() - 0.5) * 0.2; // ±100m误差
                signal.measuredDistance = measuredDistance;
                this.isPinging = false;
                logMsg(`ECHO RECEIVED - DISTANCE: ${measuredDistance.toFixed(2)} km`);
            }
        }, Math.min(delay * 0.1, 3000)); // 缩放时间使其可玩，最多3秒
    }
    
    /**
     * 在地图上标记信号
     */
    markSignalOnMap() {
        const signal = this.getStrongestSignal();
        if (!signal) {
            logMsg("NO SIGNAL SELECTED");
            return null;
        }
        
        if (!signal.measuredDirection || !signal.measuredDistance) {
            logMsg("INSUFFICIENT DATA - NEED DIRECTION & DISTANCE");
            return null;
        }
        
        // 计算坐标
        const angle = signal.measuredDirection * Math.PI / 180;
        const distance = signal.measuredDistance * 1000; // km to m
        
        const x = this.shelterX + Math.cos(angle) * distance;
        const y = this.shelterY + Math.sin(angle) * distance;
        
        signal.markedX = x;
        signal.markedY = y;
        signal.discovered = true;
        
        logMsg(`MARKED: ${signal.callsign} at (${Math.round(x)}, ${Math.round(y)})`);
        
        // Update radio display UI if available
        if (typeof radioDisplayUI !== 'undefined' && radioDisplayUI) {
            radioDisplayUI.addMarker(x, y, signal);
        }
        
        return { x, y, signal };
    }
    
    /**
     * 生成频谱数据（用于瀑布图）
     */
    generateSpectrum() {
        const spectrumWidth = 200; // 频谱点数
        const spectrum = new Float32Array(spectrumWidth);
        
        // 基础噪声
        for (let i = 0; i < spectrumWidth; i++) {
            spectrum[i] = Math.random() * RADIO_CONFIG.NOISE_LEVEL;
        }
        
        // 添加信号峰值
        for (let signal of this.signals) {
            const freqIndex = this.frequencyToIndex(signal.frequency, spectrumWidth);
            if (freqIndex >= 0 && freqIndex < spectrumWidth) {
                // 高斯形状的信号峰
                for (let i = -10; i <= 10; i++) {
                    const idx = freqIndex + i;
                    if (idx >= 0 && idx < spectrumWidth) {
                        const intensity = signal.strength / 100 * Math.exp(-(i * i) / 20);
                        spectrum[idx] += intensity;
                    }
                }
            }
        }
        
        // 归一化
        for (let i = 0; i < spectrumWidth; i++) {
            spectrum[i] = Math.min(1, spectrum[i]);
        }
        
        return spectrum;
    }
    
    /**
     * 频率转索引
     */
    frequencyToIndex(freq, width) {
        const range = this.freqMax - this.freqMin;
        return Math.floor(((freq - this.freqMin) / range) * width);
    }
    
    /**
     * 更新瀑布图
     */
    updateWaterfall() {
        const spectrum = this.generateSpectrum();
        this.waterfallHistory.unshift(spectrum);
        
        if (this.waterfallHistory.length > RADIO_CONFIG.WATERFALL_HEIGHT) {
            this.waterfallHistory.pop();
        }
        
        // 记录敌人频率到历史记录
        this.enemyFreqHistory.unshift(this.enemyAnalysisFreq); // 可能是 null 或频率值
        
        if (this.enemyFreqHistory.length > RADIO_CONFIG.WATERFALL_HEIGHT) {
            this.enemyFreqHistory.pop();
        }
        
        // 记录天线范围内的波纹频率到历史记录（阶段五：无线电系统升级）
        const currentWaveFreqs = [];
        
        // 如果天线系统已初始化，优先复用其本帧缓存的“天线范围内波纹”
        if (typeof state !== 'undefined' && state.antennaSystem) {
            const antenna = state.antennaSystem;
            const wavesInRange = Array.isArray(antenna.lastWavesInRange)
                ? antenna.lastWavesInRange
                : (state.entities.waves || []);

            for (const wave of wavesInRange) {
                // 波纹在天线范围内，记录其频率
                let sourceType = wave.source;
                if (wave.isReflectedWave) {
                    sourceType = 'reflection';  // 反弹波标记
                }
                
                currentWaveFreqs.push({
                    freq: wave.freq,
                    source: sourceType,
                    isReflected: wave.isReflectedWave || false
                });
            }
        } else {
            // 回退到旧的activeWaveContacts系统
            const fallbackWaves = this.activeWaveContacts.map(w => ({
                freq: w.freq,
                source: w.source,
                isReflected: false
            }));
            currentWaveFreqs.push(...fallbackWaves);
        }
        
        this.waveContactHistory.unshift(currentWaveFreqs);
        
        if (this.waveContactHistory.length > RADIO_CONFIG.WATERFALL_HEIGHT) {
            this.waveContactHistory.pop();
        }
    }
    
    /**
     * 规范化角度
     */
    normalizeAngle(angle) {
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;
        return angle;
    }
    
    /**
     * 设置敌人分析频率（用于瀑布图显示）
     */
    setEnemyAnalysis(freq) {
        this.enemyAnalysisFreq = freq;
    }
    
    /**
     * 清除敌人分析频率
     */
    clearEnemyAnalysis() {
        this.enemyAnalysisFreq = null;
    }
    
    /**
     * 添加波纹接触记录
     */
    addWaveContact(waveId, freq, source) {
        // 检查是否已存在
        const existing = this.activeWaveContacts.find(w => w.id === waveId);
        if (existing) {
            existing.timer = 60; // 刷新计时器
            return;
        }
        
        this.activeWaveContacts.push({
            id: waveId,
            freq: freq,
            source: source,
            timer: 60 // 最小停留60帧
        });
    }
    
    /**
     * 移除波纹接触记录
     */
    removeWaveContact(waveId) {
        const index = this.activeWaveContacts.findIndex(w => w.id === waveId);
        if (index !== -1) {
            this.activeWaveContacts.splice(index, 1);
        }
    }
    
    /**
     * 更新系统
     */
    update(deltaTime) {
        // 同步避难所位置到机器人当前位置
        const oldShelterX = this.shelterX;
        const oldShelterY = this.shelterY;
        
        if (typeof state !== 'undefined' && state.p) {
            this.shelterX = state.p.x;
            this.shelterY = state.p.y;
        }
        
        // 同步天线方向（5.3：从场景到Radio UI）
        this.syncAntennaDirection();
        
        // 更新信号生命周期（5.2：信号源波纹发射由物品系统处理）
        for (let i = this.signals.length - 1; i >= 0; i--) {
            const signal = this.signals[i];
            
            // 更新信号生命周期
            if (!signal.update(deltaTime)) {
                this.removeSignal(signal.id);
                continue;
            }
            
            // 5.2：信号源波纹发射已移至物品系统（updateSignalSources）
            // 无线电系统只管理已发现的信号信息
        }
        
        // 更新波纹系统
        this.updateWaves(deltaTime);
        
        // 更新波纹接触计时器
        for (let i = this.activeWaveContacts.length - 1; i >= 0; i--) {
            this.activeWaveContacts[i].timer--;
            if (this.activeWaveContacts[i].timer <= 0) {
                this.activeWaveContacts.splice(i, 1);
            }
        }
        
        // 更新瀑布图（每帧更新）
        this.updateWaterfall();
        
        // 动态生成信号
        this.lastSignalSpawnTime += deltaTime;
        if (this.lastSignalSpawnTime >= this.signalSpawnInterval) {
            this.spawnRandomSignal();
            this.lastSignalSpawnTime = 0;
        }
    }
    
    /**
     * 生成随机信号
     */
    spawnRandomSignal() {
        const types = [SIGNAL_TYPES.SURVIVOR, SIGNAL_TYPES.BEACON];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const messages = [
            'SOS', 'HELP', 'RESCUE', 'ALIVE', 'STRANDED',
            'SUPPLIES', 'SHELTER', 'DANGER', 'EVAC'
        ];
        
        const config = {
            type: type,
            frequency: this.freqMin + Math.random() * (this.freqMax - this.freqMin),
            direction: Math.random() * 360,
            distance: 1 + Math.random() * 9, // 1-10 km
            message: messages[Math.floor(Math.random() * messages.length)],
            callsign: `SURV-${Math.floor(Math.random() * 9000) + 1000}`,
            strength: 30 + Math.random() * 50, // 30-80
            lifespan: 300 + Math.random() * 600 // 5-15分钟
        };
        
        this.addSignal(config);
    }
}

// 全局无线电系统实例
let radioSystem = null;

/**
 * 初始化无线电系统
 */
function initRadioSystem() {
    radioSystem = new RadioSystem();
    radioSystem.updateSignalStrengths(); // 初始化信号强度
    console.log('Radio System ready');
    return radioSystem;
}

