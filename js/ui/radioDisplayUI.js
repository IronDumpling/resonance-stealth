/**
 * Radio Display UI - Monitor's Radio Mode Interface
 * Displays morse code reference, decode input, and radar map
 */

class RadioDisplayUI {
    constructor(radioSystem) {
        this.radio = radioSystem;
        this.radarMap = null;
        this.container = null;
        this.decodeInput = null;
        this.currentMessage = '';
        this.isVisible = false;
    }
    
    /**
     * Initialize the radio display UI
     */
    init() {
        this.container = document.getElementById('radio-mode-display');
        
        if (!this.container) {
            console.error('Radio mode display container not found!');
            return;
        }
        
        // Initialize morse reference panel
        this.initMorseReference();
        
        // Initialize decode input panel
        this.initDecodeInput();
        
        // Initialize radar map
        this.initRadarMap();
        
        console.log('Radio Display UI initialized');
    }
    
    /**
     * Initialize morse code reference panel
     */
    initMorseReference() {
        const morseContainer = document.getElementById('morse-reference');
        if (!morseContainer) return;
        
        // Generate morse code table
        const morseHTML = `
            <h3>MORSE CODE REFERENCE</h3>
            <div class="morse-grid">
                ${this.generateMorseTable()}
            </div>
        `;
        
        morseContainer.innerHTML = morseHTML;
    }
    
    /**
     * Generate morse code table HTML
     */
    generateMorseTable() {
        let html = '<div class="morse-columns">';
        
        // 将字母和数字分成四列
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // 第一列：A-I
        html += '<div class="morse-column">';
        for (let i = 0; i < 9; i++) {
            const letter = letters[i];
            const code = MORSE_CODE[letter] || '?';
            html += `<div class="morse-entry"><span class="morse-char">${letter}</span> <span class="morse-code">${code}</span></div>`;
        }
        html += '</div>';
        
        // 第二列：J-R
        html += '<div class="morse-column">';
        for (let i = 9; i < 18; i++) {
            const letter = letters[i];
            const code = MORSE_CODE[letter] || '?';
            html += `<div class="morse-entry"><span class="morse-char">${letter}</span> <span class="morse-code">${code}</span></div>`;
        }
        html += '</div>';
        
        // 第三列：S-Z + 0
        html += '<div class="morse-column">';
        for (let i = 18; i < 26; i++) {
            const letter = letters[i];
            const code = MORSE_CODE[letter] || '?';
            html += `<div class="morse-entry"><span class="morse-char">${letter}</span> <span class="morse-code">${code}</span></div>`;
        }
        // 添加数字0
        const code0 = MORSE_CODE['0'] || '?';
        html += `<div class="morse-entry"><span class="morse-char">0</span> <span class="morse-code">${code0}</span></div>`;
        html += '</div>';
        
        // 第四列：数字1-9
        html += '<div class="morse-column">';
        for (let num = 1; num <= 9; num++) {
            const code = MORSE_CODE[num.toString()] || '?';
            html += `<div class="morse-entry"><span class="morse-char">${num}</span> <span class="morse-code">${code}</span></div>`;
        }
        html += '</div>';
        
        html += '</div>';
        return html;
    }
    
    /**
     * Initialize decode input panel
     */
    initDecodeInput() {
        const inputContainer = document.getElementById('decode-input');
        if (!inputContainer) return;
        
        this.decodedHistory = []; // 存储已解码的信息
        
        const inputHTML = `
            <label for="morse-decode-field">DECODE MESSAGE:</label>
            <div class="decode-input-row">
                <input type="text" id="morse-decode-field" placeholder="Enter decoded text..." maxlength="50">
                <button id="decode-submit-btn" class="decode-submit-btn">SUBMIT</button>
            </div>
            <div id="decode-feedback" class="decode-feedback"></div>
            <div id="decoded-history" class="decoded-history">
                <div class="history-label">DECODED MESSAGES:</div>
                <div id="history-list" class="history-list"></div>
            </div>
        `;
        
        inputContainer.innerHTML = inputHTML;
        
        // Get input element
        this.decodeInput = document.getElementById('morse-decode-field');
        const submitBtn = document.getElementById('decode-submit-btn');
        
        // Bind input event
        if (this.decodeInput) {
            this.decodeInput.addEventListener('input', () => this.checkDecode());
            this.decodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitDecode();
                }
            });
        }
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitDecode();
            });
        }
    }
    
    /**
     * Submit decoded message
     */
    submitDecode() {
        if (!this.decodeInput) {
            console.error('Decode input not found');
            return;
        }
        
        const text = this.decodeInput.value.trim().toUpperCase();
        if (!text) {
            console.log('Empty input, not submitting');
            return;
        }
        
        // 添加到历史记录
        const timestamp = new Date().toLocaleTimeString();
        this.decodedHistory.push({
            text: text,
            time: timestamp
        });
        
        console.log('Message added to history:', text);
        
        // 更新历史显示
        this.updateDecodedHistory();
        
        // 清空输入框
        this.decodeInput.value = '';
        
        // 清空反馈
        const feedback = document.getElementById('decode-feedback');
        if (feedback) {
            feedback.textContent = 'Message submitted!';
            feedback.className = 'decode-feedback success';
            setTimeout(() => {
                feedback.textContent = '';
                feedback.className = 'decode-feedback';
            }, 2000);
        }
        
        logMsg(`DECODED: ${text}`);
    }
    
    /**
     * Update decoded history display
     */
    updateDecodedHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        // 显示最近的5条记录
        const recentHistory = this.decodedHistory.slice(-5).reverse();
        
        historyList.innerHTML = recentHistory.map(entry => `
            <div class="history-entry">
                <span class="history-time">[${entry.time}]</span>
                <span class="history-text">${entry.text}</span>
            </div>
        `).join('');
    }
    
    /**
     * Initialize radar map
     */
    initRadarMap() {
        const radarContainer = document.getElementById('radar-map-container');
        const radarCanvas = document.getElementById('radar-canvas');
        
        if (!radarCanvas || !radarContainer) {
            console.error('Radar canvas not found!');
            return;
        }
        
        // Set canvas size - 减去header高度
        const headerHeight = 30; // radar-header的高度
        radarCanvas.width = radarContainer.clientWidth;
        radarCanvas.height = radarContainer.clientHeight - headerHeight;
        
        // Create radar map instance
        this.radarMap = new RadarMap(radarCanvas, this.radio);
        
        // 确保radar map的中心点正确设置
        this.radarMap.centerX = radarCanvas.width / 2;
        this.radarMap.centerY = radarCanvas.height / 2;
        
        console.log('Radar map initialized:', radarCanvas.width, 'x', radarCanvas.height);
    }
    
    /**
     * Update the display
     */
    update(deltaTime) {
        if (!this.isVisible) return;
        
        // Update radar map
        if (this.radarMap) {
            this.radarMap.update(deltaTime);
            this.radarMap.render();
        }
        
        // Update received morse display
        this.updateReceivedMorse();
        
        // Check for new received responses
        this.checkReceivedResponses();
    }
    
    /**
     * Check for and print new received responses
     */
    checkReceivedResponses() {
        if (!this.radio || !this.radio.receivedResponses) return;
        
        // Process and remove new responses
        while (this.radio.receivedResponses.length > 0) {
            const response = this.radio.receivedResponses.shift();
            this.printReceivedMorse(response);
        }
    }
    
    /**
     * Print received morse code to paper tape
     */
    printReceivedMorse(responseData) {
        const { morse, delay, distance, callsign, strength, frequency } = responseData;
        
        const tapeContent = document.getElementById('tape-content');
        if (!tapeContent) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'tape-message received';
        messageDiv.innerHTML = `
            <div class="tape-header">
                <span class="tape-callsign">${callsign}</span>
                <span class="tape-freq">${frequency.toFixed(1)} MHz</span>
            </div>
            <div class="tape-morse">${morse}</div>
            <div class="tape-info">
                <span>Delay: ${delay.toFixed(2)}ms</span>
                <span>Dist: ~${distance.toFixed(2)} km</span>
                <span>Signal: ${Math.round(strength)}%</span>
            </div>
        `;
        
        tapeContent.appendChild(messageDiv);
        
        // Auto-scroll
        const paperTape = document.getElementById('paper-tape');
        if (paperTape) {
            paperTape.scrollTop = paperTape.scrollHeight;
        }
        
        console.log(`Morse printed: ${callsign} - ${morse}`);
    }
    
    /**
     * Update received morse code display
     */
    updateReceivedMorse() {
        const receivedMorse = document.getElementById('received-morse');
        if (!receivedMorse) return;
        
        // Get strongest signal
        const signal = this.radio.getStrongestSignal();
        
        if (signal && signal.receivedStrength > 20) {
            const morseCode = signal.morseCode || '...';
            receivedMorse.innerHTML = `
                <div class="signal-label">${signal.callsign}</div>
                <div class="morse-display">${morseCode}</div>
                <div class="signal-strength">Signal: ${Math.round(signal.receivedStrength)}%</div>
            `;
            this.currentMessage = signal.message;
        } else {
            receivedMorse.innerHTML = 'Waiting for signal...';
            this.currentMessage = '';
        }
    }
    
    /**
     * Check decode input
     */
    checkDecode() {
        if (!this.decodeInput) return;
        
        const feedback = document.getElementById('decode-feedback');
        if (!feedback) return;
        
        const input = this.decodeInput.value.toUpperCase().trim();
        
        if (!this.currentMessage) {
            feedback.textContent = '';
            feedback.className = 'decode-feedback';
            return;
        }
        
        if (input === this.currentMessage) {
            feedback.textContent = '✓ CORRECT!';
            feedback.className = 'decode-feedback success';
        } else if (this.currentMessage.startsWith(input) && input.length > 0) {
            feedback.textContent = '→ Keep going...';
            feedback.className = 'decode-feedback partial';
        } else if (input.length > 0) {
            feedback.textContent = '✗ Incorrect';
            feedback.className = 'decode-feedback error';
        } else {
            feedback.textContent = '';
            feedback.className = 'decode-feedback';
        }
    }
    
    
    /**
     * Show the display
     */
    show() {
        if (this.container) {
            this.container.style.display = 'grid';
            this.container.classList.add('active');
            this.isVisible = true;
            
            // 重新设置radar canvas尺寸
            setTimeout(() => {
                const radarContainer = document.getElementById('radar-map-container');
                const radarCanvas = document.getElementById('radar-canvas');
                
                if (radarCanvas && radarContainer) {
                    const headerHeight = 50; // radar-header的高度（包括padding和border）
                    radarCanvas.width = radarContainer.clientWidth;
                    radarCanvas.height = radarContainer.clientHeight - headerHeight;
                    
                    // 更新radar map的中心点
                    if (this.radarMap) {
                        this.radarMap.centerX = radarCanvas.width / 2;
                        this.radarMap.centerY = radarCanvas.height / 2;
                    }
                    
                    console.log('Radar canvas resized:', radarCanvas.width, 'x', radarCanvas.height);
                }
            }, 0);
        }
    }
    
    /**
     * Hide the display
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.container.classList.remove('active');
            this.isVisible = false;
        }
    }
    
    /**
     * Add marker to radar map
     */
    addMarker(x, y, signal) {
        if (this.radarMap) {
            this.radarMap.addMarker(x, y, signal);
        }
    }
    
    /**
     * Show ping wave animation
     */
    showPingWave() {
        if (this.radarMap) {
            this.radarMap.showPingWave();
        }
    }
}

// Global instance
let radioDisplayUI = null;

/**
 * Initialize radio display UI
 */
function initRadioDisplayUI(radioSystem) {
    radioDisplayUI = new RadioDisplayUI(radioSystem);
    radioDisplayUI.init();
    console.log('Radio Display UI ready');
    return radioDisplayUI;
}

