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
        this.morseWaveform = this.morseToWaveform(this.morseCode);
    }
    
    textToMorse(text) {
        return text.toUpperCase().split('').map(char => 
            MORSE_CODE[char] || '?'
        ).join(' ');
    }
    
    morseToWaveform(morse) {
        return morse.replace(/\./g, '▂').replace(/-/g, '▂▂▂');
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
        this.antennaAngle = 0; // 天线指向角度
        this.signals = [];
        this.waterfallHistory = [];
        this.lastSignalSpawnTime = 0;
        this.signalSpawnInterval = 120; // 2分钟生成一个信号
        
        // 玩家位置（避难所位置）
        this.shelterX = 0;
        this.shelterY = 0;
        
        // UI状态
        this.mode = 'MONITOR'; // MONITOR, DIRECTION, DECODE
        this.selectedSignal = null;
        
        // Ping状态
        this.isPinging = false;
        this.pingStartTime = 0;
        
        console.log('Radio System initialized');
    }
    
    /**
     * 添加信号
     */
    addSignal(config) {
        const signal = new RadioSignal(config);
        this.signals.push(signal);
        console.log(`Signal added: ${signal.callsign} at ${signal.frequency} MHz`);
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
     * 粗调频率
     */
    tuneCoarse(delta) {
        this.currentFrequency += delta * RADIO_CONFIG.COARSE_STEP;
        this.currentFrequency = Math.max(RADIO_CONFIG.FREQ_MIN, 
            Math.min(RADIO_CONFIG.FREQ_MAX, this.currentFrequency));
        this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
        this.updateSignalStrengths();
    }
    
    /**
     * 精调频率
     */
    tuneFine(delta) {
        this.currentFrequency += delta * RADIO_CONFIG.FINE_STEP;
        this.currentFrequency = Math.max(RADIO_CONFIG.FREQ_MIN, 
            Math.min(RADIO_CONFIG.FREQ_MAX, this.currentFrequency));
        this.currentFrequency = Math.round(this.currentFrequency * 10) / 10;
        this.updateSignalStrengths();
    }
    
    /**
     * 旋转天线
     */
    rotateAntenna(delta) {
        this.antennaAngle += delta;
        this.antennaAngle = (this.antennaAngle + 360) % 360;
        this.updateSignalStrengths();
    }
    
    /**
     * 更新信号强度
     */
    updateSignalStrengths() {
        for (let signal of this.signals) {
            // 频率匹配度（高斯衰减）
            const freqDiff = Math.abs(signal.frequency - this.currentFrequency);
            let frequencyMatch = 0;
            if (freqDiff < RADIO_CONFIG.SIGNAL_BANDWIDTH) {
                frequencyMatch = Math.exp(-Math.pow(freqDiff / RADIO_CONFIG.SIGNAL_BANDWIDTH, 2));
            }
            
            // 方向匹配度（余弦函数）
            const angleDiff = this.normalizeAngle(signal.direction - this.antennaAngle);
            const directionMatch = Math.cos(angleDiff * Math.PI / 180) * 0.5 + 0.5;
            
            // 距离衰减
            const distanceAttenuation = 1 / (1 + signal.distance * 0.1);
            
            // 计算接收强度
            signal.receivedStrength = signal.strength * frequencyMatch * directionMatch * distanceAttenuation;
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
        const range = RADIO_CONFIG.FREQ_MAX - RADIO_CONFIG.FREQ_MIN;
        return Math.floor(((freq - RADIO_CONFIG.FREQ_MIN) / range) * width);
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
     * 更新系统
     */
    update(deltaTime) {
        // 更新信号生命周期
        for (let i = this.signals.length - 1; i >= 0; i--) {
            if (!this.signals[i].update(deltaTime)) {
                this.removeSignal(this.signals[i].id);
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
            frequency: RADIO_CONFIG.FREQ_MIN + Math.random() * (RADIO_CONFIG.FREQ_MAX - RADIO_CONFIG.FREQ_MIN),
            direction: Math.random() * 360,
            distance: 1 + Math.random() * 9, // 1-10 km
            message: messages[Math.floor(Math.random() * messages.length)],
            callsign: `SURV-${Math.floor(Math.random() * 9000) + 1000}`,
            strength: 30 + Math.random() * 50, // 30-80
            lifespan: 300 + Math.random() * 600 // 5-15分钟
        };
        
        this.addSignal(config);
    }
    
    /**
     * 初始化剧情信号
     */
    initStorySignals() {
        // 宇航员信号（主线剧情）
        this.addSignal({
            type: SIGNAL_TYPES.ASTRONAUT,
            frequency: 155.0,  // 修改为可调范围内的频率
            direction: 45,
            distance: 5.2,
            message: 'QUANTUM LINK ESTABLISHED',
            callsign: 'ASTRONAUT-01',
            strength: 70,
            persistent: true
        });
        
        console.log('Story signals initialized');
    }
}

// 全局无线电系统实例
let radioSystem = null;

/**
 * 初始化无线电系统
 */
function initRadioSystem() {
    radioSystem = new RadioSystem();
    radioSystem.initStorySignals();
    radioSystem.updateSignalStrengths(); // 初始化信号强度
    console.log('Radio System ready');
    return radioSystem;
}

