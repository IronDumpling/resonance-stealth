/**
 * Morse Code System
 * 摩斯电码系统 - 用于波纹通信
 */

// 摩斯电码表
const MORSE_CODE_TABLE = {
    'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
    'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
    'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
    'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
    'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
    'Z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    ' ': '/'      // 词间隔
};

// 反向查找表
const MORSE_DECODE_TABLE = {};
for (let char in MORSE_CODE_TABLE) {
    MORSE_DECODE_TABLE[MORSE_CODE_TABLE[char]] = char;
}

class MorseCodeSystem {
    constructor() {
        this.playerMessage = '';  // 玩家当前要发送的消息
        this.receivedMessages = [];  // 接收到的消息历史
    }
    
    /**
     * 编码文本为摩斯码
     * @param {string} text - 要编码的文本
     * @returns {string} 摩斯码字符串
     */
    encode(text) {
        if (!text) return '';
        
        return text.toUpperCase()
            .split('')
            .map(char => MORSE_CODE_TABLE[char] || '?')
            .join(' ');
    }
    
    /**
     * 解码摩斯码为文本
     * @param {string} morse - 摩斯码字符串
     * @returns {string} 解码后的文本
     */
    decode(morse) {
        if (!morse) return '';
        
        return morse.split(' ')
            .map(code => MORSE_DECODE_TABLE[code] || '?')
            .join('');
    }
    
    /**
     * 为波纹生成摩斯码
     * @param {object} wave - 波纹对象
     * @returns {string} 该波纹的摩斯码
     */
    generateCodeForWave(wave) {
        if (wave.source === 'player') {
            // 玩家波纹：使用玩家设置的消息，或默认消息
            if (this.playerMessage) {
                return this.encode(this.playerMessage);
            }
            // 默认：发送频率信息
            return this.encode(`F${Math.floor(wave.freq)}`);
        } else if (wave.source === 'enemy') {
            // 敌人波纹：发送敌人ID和状态
            const enemy = state.entities.enemies.find(e => e.id === wave.ownerId);
            if (enemy) {
                let message = `E${enemy.id.substr(-2)}`;  // 敌人ID后两位
                
                // 添加状态信息
                if (enemy.state === 'alert') message += 'A';
                else if (enemy.state === 'chase') message += 'C';
                else if (enemy.state === 'stunned') message += 'S';
                else if (enemy.state === 'dormant') message += 'D';
                else message += 'P';  // patrol
                
                return this.encode(message);
            }
            return this.encode('ENEMY');
        } else if (wave.source === 'pulse') {
            // 脉冲波（受迫共振）：发送警告
            return this.encode('PULSE');
        }
        
        return this.encode('UNKNOWN');
    }
    
    /**
     * 设置玩家要发送的消息
     * @param {string} message - 消息文本
     */
    setPlayerMessage(message) {
        this.playerMessage = message;
    }
    
    /**
     * 记录接收到的消息
     * @param {object} wave - 接收到的波纹
     */
    recordReceivedMessage(wave) {
        if (!wave.morseCode) return;
        
        const decodedText = this.decode(wave.morseCode);
        const record = {
            timestamp: Date.now(),
            source: wave.source,
            frequency: wave.freq,
            morseCode: wave.morseCode,
            decodedText: decodedText,
            waveId: wave.id
        };
        
        this.receivedMessages.push(record);
        
        // 限制历史记录数量
        if (this.receivedMessages.length > 100) {
            this.receivedMessages.shift();
        }
        
        return record;
    }
    
    /**
     * 获取消息历史
     * @param {number} limit - 返回的最大记录数
     * @returns {array} 消息记录数组
     */
    getMessageHistory(limit = 20) {
        return this.receivedMessages.slice(-limit);
    }
    
    /**
     * 清空消息历史
     */
    clearHistory() {
        this.receivedMessages = [];
    }
    
    /**
     * 验证摩斯码格式
     * @param {string} morse - 摩斯码字符串
     * @returns {boolean} 是否有效
     */
    isValidMorse(morse) {
        if (!morse) return false;
        // 只允许 . - / 和空格
        return /^[.\-\/\s]*$/.test(morse);
    }
}

// 创建全局实例
let morseCodeSystem = null;

/**
 * 初始化摩斯码系统
 */
function initMorseCodeSystem() {
    morseCodeSystem = new MorseCodeSystem();
    console.log('Morse Code System initialized');
    return morseCodeSystem;
}

