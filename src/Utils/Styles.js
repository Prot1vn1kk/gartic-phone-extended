/**
 * @fileoverview Утилита для инъекции CSS-стилей в документ
 * @module Utils/Styles
 */

/**
 * Инъектирует CSS-стили в документ
 * @param {string} cssContent - CSS-содержимое для инъекции
 * @returns {HTMLStyleElement} Созданный элемент style
 */
export function injectStyles(cssContent) {
    const styleElement = document.createElement('style');
    styleElement.textContent = cssContent;
    document.head.appendChild(styleElement);
    return styleElement;
}

/**
 * Глобальные базовые стили для расширения
 * Все классы имеют префикс gp-ext- для избежания конфликтов
 * @constant {string}
 */
export const GLOBAL_STYLES = `
/* ========================================
   Основные элементы UI
   ======================================== */

/* Кнопка настроек (шестеренка) */
.gp-ext-settings-button {
  cursor: pointer;
  margin-left: 10px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.gp-ext-settings-button:hover {
  opacity: 1;
}

/* Модальное окно */
.gp-ext-modal {
  position: fixed;
  z-index: 9999;
  background-color: white;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 20px;
  display: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  font-family: 'Arial', sans-serif;
  max-width: 400px;
  min-width: 300px;
}

.gp-ext-modal.gp-ext-visible {
  display: block;
}

/* Оверлей с фидбеком жеста */
.gp-ext-gesture-feedback {
  position: fixed;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 5px;
  z-index: 10000;
  font-size: 14px;
  font-weight: bold;
  transform: translate(-50%, -100%);
  margin-top: -10px;
  white-space: nowrap;
}

/* ========================================
   Компоненты настроек
   ======================================== */

/* Заголовок модального окна */
.gp-ext-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

.gp-ext-modal-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.gp-ext-close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gp-ext-close-button:hover {
  color: #ff4444;
}

/* Переключатель (toggle) модуля */
.gp-ext-module-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.gp-ext-module-toggle:last-child {
  border-bottom: none;
}

.gp-ext-module-name {
  font-weight: 500;
}

.gp-ext-toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: #ccc;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.gp-ext-toggle-switch.gp-ext-active {
  background-color: #4CAF50;
}

.gp-ext-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.gp-ext-toggle-switch.gp-ext-active .gp-ext-toggle-knob {
  transform: translateX(20px);
}

/* ========================================
   Tooltip система
   ======================================== */

.gp-ext-tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background-color: #666;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  cursor: help;
  margin-left: 5px;
}

.gp-ext-tooltip-content {
  position: absolute;
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  max-width: 250px;
  z-index: 10001;
  display: none;
  line-height: 1.4;
}

.gp-ext-tooltip-content.gp-ext-visible {
  display: block;
}

/* ========================================
   Toast уведомления
   ======================================== */

.gp-ext-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #333;
  color: white;
  padding: 12px 20px;
  border-radius: 4px;
  z-index: 10002;
  font-size: 14px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.gp-ext-toast.gp-ext-show {
  opacity: 1;
  transform: translateY(0);
}

.gp-ext-toast.gp-ext-success {
  background-color: #4CAF50;
}

.gp-ext-toast.gp-ext-error {
  background-color: #f44336;
}

.gp-ext-toast.gp-ext-warning {
  background-color: #ff9800;
}

/* ========================================
   Reference Window стили
   ======================================== */

.gp-ext-reference-window {
  position: fixed;
  background-color: white;
  border: 2px solid #333;
  border-radius: 8px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  min-width: 300px;
  min-height: 200px;
}

.gp-ext-reference-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  border-radius: 6px 6px 0 0;
  cursor: move;
}

.gp-ext-reference-title {
  font-weight: bold;
  font-size: 14px;
  margin: 0;
}

.gp-ext-reference-controls {
  display: flex;
  gap: 5px;
}

.gp-ext-reference-btn {
  background: none;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 12px;
}

.gp-ext-reference-btn:hover {
  background-color: #e0e0e0;
}

.gp-ext-reference-content {
  flex: 1;
  padding: 10px;
  overflow: auto;
}

.gp-ext-reference-search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.gp-ext-reference-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}

.gp-ext-reference-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.gp-ext-reference-image:hover {
  border-color: #4CAF50;
}

/* Resize handles */
.gp-ext-resize-handle {
  position: absolute;
  background-color: transparent;
}

.gp-ext-resize-handle.se {
  bottom: 0;
  right: 0;
  width: 15px;
  height: 15px;
  cursor: se-resize;
}

/* ========================================
   Timelapse Player стили
   ======================================== */

.gp-ext-player-container {
  position: relative;
  background-color: #f9f9f9;
  border: 2px solid #333;
  border-radius: 4px;
}

.gp-ext-player-canvas {
  display: block;
  background-color: white;
}

.gp-ext-player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  gap: 10px;
}

.gp-ext-player-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
}

.gp-ext-player-btn:hover {
  background-color: #45a049;
}

.gp-ext-player-speed-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gp-ext-player-speed-slider {
  width: 100px;
  cursor: pointer;
}

.gp-ext-player-speed-value {
  font-size: 12px;
  min-width: 40px;
  text-align: center;
}

/* ========================================
   Painter Gesture стили
   ======================================== */

.gp-ext-gesture-indicator {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
}

.gp-ext-gesture-slider-track {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.gp-ext-gesture-slider-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 2px;
}

.gp-ext-gesture-value-display {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  white-space: nowrap;
}

/* ========================================
   Утилитные классы
   ======================================== */

.gp-ext-hidden {
  display: none !important;
}

.gp-ext-flex {
  display: flex;
}

.gp-ext-flex-col {
  display: flex;
  flex-direction: column;
}

.gp-ext-absolute {
  position: absolute;
}

.gp-ext-fixed {
  position: fixed;
}

.gp-ext-z-top {
  z-index: 2147483647; /* Максимальный z-index */
}

/* Анимации */
@keyframes gp-ext-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes gp-ext-slide-up {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.gp-ext-animate-fade-in {
  animation: gp-ext-fade-in 0.3s ease;
}

.gp-ext-animate-slide-up {
  animation: gp-ext-slide-up 0.3s ease;
}
`;
