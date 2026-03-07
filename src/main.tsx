/**
 * 应用入口文件
 * Application Entry Point
 * 
 * React应用挂载，初始化系统
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CRT_GREEN, CRT_GREEN_RGB } from '@/config/gameConfig';
import './styles/index.css';

// 注入 CRT 绿色到 CSS 变量（在样式应用前设置）
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.style.setProperty('--crt-green', CRT_GREEN);
  document.documentElement.style.setProperty('--crt-green-rgb', CRT_GREEN_RGB.join(', '));
}

// 初始化应用
function initApplication() {
  console.log('=== Resonance v0.2 ===');
  console.log('Initializing systems...');

  // 系统初始化将在App组件中通过Context和Hooks完成
  console.log('All systems initialized');
}

// 等待DOM加载完成后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApplication();
    mountApp();
  });
} else {
  initApplication();
  mountApp();
}

function mountApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element not found!');
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('Application mounted');
}
