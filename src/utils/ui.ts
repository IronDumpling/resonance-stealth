/**
 * UI 辅助工具函数
 * UI Utility Functions
 */

/**
 * 显示消息（需要传入state）
 */
export function logMsg(
  message: string,
  state: { currentMessage: string; messageTimer: number }
): void {
  state.currentMessage = message;
  state.messageTimer = 180; // 显示3秒（60fps）
}

/**
 * edge-glow 闪烁效果
 */
let edgeGlowFlashTimer: ReturnType<typeof setTimeout> | null = null;

export function flashEdgeGlow(
  color: 'white' | 'red' | 'green' | 'cyan',
  duration: number,
  edgeGlowElement: HTMLElement | null
): void {
  if (!edgeGlowElement) return;
  
  // 清除之前的闪烁定时器
  if (edgeGlowFlashTimer) {
    clearTimeout(edgeGlowFlashTimer);
  }
  
  // 设置颜色
  if (color === 'white') {
    edgeGlowElement.style.boxShadow = 'inset 0 0 20px 8px rgba(255, 255, 255, 0.8)';
  } else if (color === 'red') {
    edgeGlowElement.style.boxShadow = 'inset 0 0 20px 8px rgba(255, 0, 0, 0.8)';
  } else if (color === 'green') {
    edgeGlowElement.style.boxShadow = 'inset 0 0 20px 8px rgba(0, 255, 0, 0.8)';
  } else if (color === 'cyan') {
    edgeGlowElement.style.boxShadow = 'inset 0 0 20px 8px rgba(0, 255, 255, 0.8)';
  }
  
  // 显示闪烁
  edgeGlowElement.style.opacity = '1';
  
  // 设置淡出
  edgeGlowFlashTimer = setTimeout(() => {
    if (edgeGlowElement) {
      edgeGlowElement.style.opacity = '0';
    }
    edgeGlowFlashTimer = null;
  }, duration);
}
