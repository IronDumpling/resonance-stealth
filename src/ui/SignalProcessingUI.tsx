/**
 * 信号处理UI（原RadioDisplayUI的morse code + decode部分）
 * Signal Processing UI (morse code + decode part of former RadioDisplayUI)
 */

import React, { useEffect, useRef } from 'react';
import { IRadioSystem } from '@/types/systems';
import { MORSE_CODE } from '@/config/gameConfig';

// 扩展 IRadioSystem 以包含 SignalProcessingUI 需要的属性和方法
interface ExtendedRadioSystem extends IRadioSystem {
  receivedResponses: Array<{
    morse: string;
    delay: number;
    distance: number;
    callsign: string;
    strength: number;
    frequency: number;
  }>;
  getStrongestSignal(): {
    receivedStrength: number;
    callsign: string;
    frequency: number;
    message: string;
    morseCode: string;
  } | null;
}

interface DecodedHistoryEntry {
  text: string;
  time: string;
}

export class SignalProcessingUI {
  radio: ExtendedRadioSystem | null = null;
  container: HTMLElement | null = null;
  decodeInput: HTMLInputElement | null = null;
  currentMessage: string = '';
  isVisible: boolean = false;
  decodedHistory: DecodedHistoryEntry[] = [];

  constructor(radioSystem?: IRadioSystem | null) {
    this.radio = radioSystem as ExtendedRadioSystem | null;
  }

  /**
   * 初始化信号处理UI
   */
  init(): void {
    this.container = document.getElementById('radio-mode-display');
    
    if (!this.container) {
      console.error('Radio mode display container not found!');
      return;
    }
    
    // Initialize morse reference panel
    this.initMorseReference();
    
    // Initialize decode input panel
    this.initDecodeInput();
    
    console.log('Signal Processing UI initialized');
  }

  /**
   * 初始化摩斯码参考面板
   */
  initMorseReference(): void {
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
   * 生成摩斯码表HTML
   */
  generateMorseTable(): string {
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
   * 初始化解码输入面板
   */
  initDecodeInput(): void {
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
    this.decodeInput = document.getElementById('morse-decode-field') as HTMLInputElement;
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
  submitDecode(): void {
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
    
    // 简化 logMsg 调用，使用 console.log 作为占位符
    console.log(`DECODED: ${text}`);
  }

  /**
   * Update decoded history display
   */
  updateDecodedHistory(): void {
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
   * Check decode input
   */
  checkDecode(): void {
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
   * Update received morse code display
   */
  updateReceivedMorse(): void {
    if (!this.radio) return;
    
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
   * Check for and print new received responses
   */
  checkReceivedResponses(): void {
    if (!this.radio || !this.radio.receivedResponses) return;
    
    // Process and remove new responses
    while (this.radio.receivedResponses.length > 0) {
      const response = this.radio.receivedResponses.shift();
      if (response) {
        this.printReceivedMorse(response);
      }
    }
  }

  /**
   * Print received morse code to paper tape
   */
  printReceivedMorse(responseData: {
    morse: string;
    delay: number;
    distance: number;
    callsign: string;
    strength: number;
    frequency: number;
  }): void {
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
   * 更新解码输入（用于外部调用）
   */
  updateDecodeInput(): void {
    this.checkDecode();
  }

  /**
   * 显示UI
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'grid';
      this.container.classList.add('active');
      this.isVisible = true;
    }
  }

  /**
   * 隐藏UI
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.container.classList.remove('active');
      this.isVisible = false;
    }
  }

  /**
   * 更新UI
   */
  update(deltaTime: number): void {
    if (!this.isVisible) return;
    
    // Update received morse display
    this.updateReceivedMorse();
    
    // Check for new received responses
    this.checkReceivedResponses();
  }
}

// React组件包装器
export const SignalProcessingUIComponent: React.FC<{ radioSystem?: IRadioSystem | null }> = ({
  radioSystem,
}) => {
  const uiRef = useRef<SignalProcessingUI | null>(null);

  useEffect(() => {
    if (!uiRef.current) {
      uiRef.current = new SignalProcessingUI(radioSystem);
      uiRef.current.init();
    }

    return () => {
      // 清理
    };
  }, [radioSystem]);

  return (
    <div id="radio-mode-display" style={{ display: 'none' }}>
      <div id="morse-reference" />
      <div id="decode-input" />
    </div>
  );
};
