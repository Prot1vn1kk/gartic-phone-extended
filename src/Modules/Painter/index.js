/**
 * @fileoverview Модуль Painter для Gartic Phone Extension.
 * Обеспечивает управление жестами и визуальный отклик.
 * @module Painter
 */

import { waitForElement } from '../../Utils/DOM.js';
import { createGestureHandler } from './GestureHandler.js';
import { getReactInstance, findComponent } from '../../Utils/ReactFiber.js';

/**
 * @typedef {Object} PainterModule
 * @property {boolean} isEnabled - Включен ли модуль.
 * @property {function(): Promise<void>} init - Инициализация модуля.
 * @property {function(): void} destroy - Очистка ресурсов модуля.
 */

/**
 * Создает модуль Painter для управления жестами и отображения визуального отклика.
 * 
 * @returns {PainterModule} Объект модуля Painter.
 */
export function createPainterModule() {
    /**
     * @type {boolean}
     */
    let isEnabled = false;

    /**
     * @type {ReturnType<createGestureHandler> | null}
     */
    let gestureHandler = null;

    /**
     * @type {HTMLCanvasElement | null}
     */
    let elCanvas = null;

    /**
     * @type {HTMLElement | null}
     */
    let elFeedback = null;

    /**
     * @type {Object | null}
     * React-компонент, управляющий инструментами рисования.
     */
    let painterComponent = null;

    /**
     * @type {Function | null}
     * Функция для обновления состояния компонента (setState/dispatch).
     */
    let stateUpdater = null;

    /**
     * @type {Object}
     * Кэшированные значения параметров инструментов.
     */
    let toolState = {
        size: 5,
        opacity: 100,
        color: '#000000'
    };

    /**
     * Сохраненные обработчики событий для возможности удаления.
     * @type {Array<{element: EventTarget, event: string, handler: Function}>}
     */
    const eventListeners = [];

    /**
     * Добавляет event listener и сохраняет его для последующего удаления.
     * 
     * @private
     * @param {EventTarget} element - Элемент для добавления слушателя.
     * @param {string} event - Название события.
     * @param {Function} handler - Обработчик события.
     */
    function _addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        eventListeners.push({ element, event, handler });
    }

    /**
     * Удаляет все сохраненные event listeners.
     * 
     * @private
     */
    function _removeAllEventListeners() {
        eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        eventListeners.length = 0;
    }

    /**
     * Создает элемент визуального отклика (feedback).
     * 
     * @private
     * @param {Object} state - Состояние жеста.
     * @param {number} state.currentValue - Текущее значение параметра.
     * @param {number} state.startX - Начальная X координата.
     * @param {number} state.startY - Начальная Y координата.
     */
    function _createFeedback(state) {
        elFeedback = document.createElement('div');
        elFeedback.className = 'gp-ext-gesture-feedback';
        elFeedback.textContent = `Value: ${state.currentValue}`;

        // Стилизация через JavaScript (в будущем можно вынести в отдельный CSS файл)
        Object.assign(elFeedback.style, {
            position: 'fixed',
            left: `${state.startX + 20}px`,
            top: `${state.startY + 20}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            pointerEvents: 'none',
            zIndex: '10000',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            whiteSpace: 'nowrap',
        });

        document.body.appendChild(elFeedback);
    }

    /**
     * Обновляет позицию и содержимое элемента визуального отклика.
     * 
     * @private
     * @param {Object} state - Состояние жеста.
     * @param {number} state.currentValue - Текущее значение параметра.
     * @param {number} state.currentX - Текущая X координата.
     * @param {number} state.currentY - Текущая Y координата.
     */
    function _updateFeedback(state) {
        if (elFeedback) {
            elFeedback.textContent = `Value: ${Math.round(state.currentValue)}`;
            elFeedback.style.left = `${state.currentX + 20}px`;
            elFeedback.style.top = `${state.currentY + 20}px`;
        }
    }

    /**
     * Удаляет элемент визуального отклика.
     * 
     * @private
     */
    function _removeFeedback() {
        if (elFeedback) {
            elFeedback.remove();
            elFeedback = null;
        }
    }

    /**
     * Обновляет состояние инструмента в игре.
     * 
     * @private
     * @param {string} parameter - Параметр для обновления ('size', 'opacity', 'color').
     * @param {number|string} value - Новое значение параметра.
     * @returns {boolean} Успешно ли обновлено состояние.
     */
    function _updateGameToolState(parameter, value) {
        try {
            // Пробуем прямой доступ к состоянию React компонента
            if (painterComponent && painterComponent.memoizedState) {
                const stateNode = painterComponent.memoizedState;

                // Обновляем соответствующее свойство в состоянии
                if (parameter === 'size' && stateNode.brushSize !== undefined) {
                    stateNode.brushSize = value;
                } else if (parameter === 'opacity' && stateNode.brushOpacity !== undefined) {
                    stateNode.brushOpacity = value;
                } else if (parameter === 'color' && stateNode.brushColor !== undefined) {
                    stateNode.brushColor = value;
                }

                // Если есть функция обновления состояния, вызываем её
                if (stateUpdater) {
                    stateUpdater(stateNode);
                }

                console.log(`[Painter] Updated ${parameter} to ${value} (direct state)`);
                return true;
            }
        } catch (error) {
            console.warn('[Painter] Direct state update failed:', error);
        }

        // Резервная стратегия: поиск и обновление скрытых input элементов
        try {
            const inputSelectors = {
                size: 'input[type="range"], input[type="number"]',
                opacity: 'input[type="range"], input[type="number"]',
                color: 'input[type="color"]'
            };

            const inputs = document.querySelectorAll(inputSelectors[parameter] || 'input');

            for (const input of inputs) {
                // Проверяем, связан ли input с нужным параметром
                const parent = input.closest('.styles, [class*="tool"], [class*="brush"]');
                if (!parent) continue;

                // Обновляем значение
                input.value = value;

                // Инициируем событие input для React
                const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                input.dispatchEvent(inputEvent);

                // Инициируем событие change
                const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                input.dispatchEvent(changeEvent);

                console.log(`[Painter] Updated ${parameter} to ${value} (input simulation)`);
                return true;
            }
        } catch (error) {
            console.warn('[Painter] Input simulation failed:', error);
        }

        return false;
    }

    /**
     * Получает текущее значение параметра из состояния игры.
     * 
     * @private
     * @param {string} parameter - Параметр для получения ('size', 'opacity', 'color').
     * @returns {number|string} Текущее значение параметра.
     */
    function _getCurrentToolValue(parameter) {
        try {
            // Пробуем получить из React компонента
            if (painterComponent && painterComponent.memoizedState) {
                const stateNode = painterComponent.memoizedState;

                if (parameter === 'size' && stateNode.brushSize !== undefined) {
                    return stateNode.brushSize;
                } else if (parameter === 'opacity' && stateNode.brushOpacity !== undefined) {
                    return stateNode.brushOpacity;
                } else if (parameter === 'color' && stateNode.brushColor !== undefined) {
                    return stateNode.brushColor;
                }
            }
        } catch (error) {
            console.warn('[Painter] Failed to get value from state:', error);
        }

        // Возвращаем кэшированное значение
        return toolState[parameter] || 0;
    }

    /**
     * Определяет тип параметра по клавише-триггеру.
     * 
     * @private
     * @param {string} triggerKey - Клавиша-триггер.
     * @returns {string|null} Тип параметра ('size', 'opacity', 'color') или null.
     */
    function _getParameterFromKey(triggerKey) {
        const keyMap = {
            'Control': 'size',
            'Shift': 'opacity',
            'Alt': 'color'
        };
        return keyMap[triggerKey] || null;
    }

    /**
     * Колбэк, вызываемый при начале жеста.
     * 
     * @private
     * @param {Object} state - Состояние жеста.
     */
    function _onGestureStart(state) {
        _createFeedback(state);
    }

    /**
     * Колбэк, вызываемый при обновлении жеста.
     * Обновляет состояние инструмента в игре.
     * 
     * @private
     * @param {Object} state - Состояние жеста.
     */
    function _onGestureUpdate(state) {
        _updateFeedback(state);

        // Определяем параметр по клавише-триггеру
        const parameter = _getParameterFromKey(state.triggerKey);
        if (!parameter) return;

        // Ограничиваем значения в разумных пределах
        let value = state.currentValue;

        if (parameter === 'size') {
            value = Math.max(1, Math.min(50, value)); // Размер кисти: 1-50
        } else if (parameter === 'opacity') {
            value = Math.max(0, Math.min(100, value)); // Прозрачность: 0-100
        } else if (parameter === 'color') {
            value = Math.max(0, Math.min(360, value)); // Цвет (hue): 0-360
        }

        // Обновляем состояние игры
        const success = _updateGameToolState(parameter, value);

        // Если успешно обновили, сохраняем в кэш
        if (success) {
            toolState[parameter] = value;
        }
    }

    /**
     * Колбэк, вызываемый при завершении жеста.
     * 
     * @private
     * @param {Object} state - Состояние жеста.
     */
    function _onGestureEnd(state) {
        _removeFeedback();
    }

    /**
     * Обработчик события keydown.
     * Передает событие в gestureHandler.
     * 
     * @private
     * @param {KeyboardEvent} e - Событие клавиатуры.
     */
    function _handleKeyDown(e) {
        if (gestureHandler) {
            gestureHandler.handleKeyDown(e.key, e);
        }
    }

    /**
     * Обработчик события keyup.
     * Передает событие в gestureHandler.
     * 
     * @private
     * @param {KeyboardEvent} e - Событие клавиатуры.
     */
    function _handleKeyUp(e) {
        if (gestureHandler) {
            gestureHandler.handleKeyUp(e.key, e);
        }
    }

    /**
     * Обработчик события mousedown на канвасе.
     * Передает событие в gestureHandler с текущим значением параметра.
     * 
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleMouseDown(e) {
        if (gestureHandler && gestureHandler.isPrepared()) {
            // Получаем текущее состояние gestureHandler для определения активной клавиши
            const gestureState = gestureHandler.getState();
            const triggerKey = gestureState.triggerKey;

            // Определяем параметр по клавише-триггеру
            const parameter = _getParameterFromKey(triggerKey);

            // Получаем текущее значение параметра из игры
            let initialValue = 0;
            let sensitivity = 1;
            let axis = 'x';

            if (parameter) {
                initialValue = _getCurrentToolValue(parameter);

                // Настройка чувствительности и оси для разных параметров
                if (parameter === 'size') {
                    sensitivity = 0.5; // Меньшая чувствительность для размера
                    axis = 'x';
                } else if (parameter === 'opacity') {
                    sensitivity = 0.5; // Меньшая чувствительность для прозрачности
                    axis = 'y';
                } else if (parameter === 'color') {
                    sensitivity = 1; // Стандартная чувствительность для цвета
                    axis = 'x';
                }
            }

            gestureHandler.handleMouseDown(e, initialValue, sensitivity, axis);
        }
    }

    /**
     * Обработчик события mousemove на канвасе.
     * Передает событие в gestureHandler.
     * 
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleMouseMove(e) {
        if (gestureHandler) {
            gestureHandler.handleMouseMove(e);
        }
    }

    /**
     * Обработчик события mouseup на канвасе.
     * Передает событие в gestureHandler.
     * 
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleMouseUp(e) {
        if (gestureHandler) {
            gestureHandler.handleMouseUp(e);
        }
    }

    /**
     * Инициализирует модуль Painter.
     * Ожидает появления канваса, создает обработчик жестов, интегрируется с состоянием игры.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async function init() {
        if (isEnabled) {
            return;
        }

        try {
            // Ожидаем появления игрового канваса
            elCanvas = await waitForElement('canvas.styles_canvasGame');

            // Ищем React-компонент, управляющий инструментами
            try {
                // Находим DOM-элемент панели инструментов
                const toolbarElement = document.querySelector('.styles, [class*="toolbar"], [class*="tool"]');

                if (toolbarElement) {
                    // Получаем React Fiber instance
                    const fiberInstance = getReactInstance(toolbarElement);

                    if (fiberInstance) {
                        // Ищем компонент с состоянием инструментов
                        painterComponent = findComponent(fiberInstance, (fiber) => {
                            const state = fiber.memoizedState;
                            const props = fiber.memoizedProps;

                            // Ищем компонент с параметрами инструментов в состоянии или пропсах
                            return (
                                (state && (
                                    state.brushSize !== undefined ||
                                    state.brushOpacity !== undefined ||
                                    state.brushColor !== undefined ||
                                    state.size !== undefined ||
                                    state.opacity !== undefined ||
                                    state.color !== undefined
                                )) ||
                                (props && (
                                    props.brushSize !== undefined ||
                                    props.brushOpacity !== undefined ||
                                    props.brushColor !== undefined ||
                                    props.size !== undefined ||
                                    props.opacity !== undefined ||
                                    props.color !== undefined
                                ))
                            );
                        });

                        if (painterComponent) {
                            console.log('[Painter] Found painter component:', painterComponent);

                            // Пытаемся найти функцию обновления состояния
                            // Это может быть setState, dispatch или другой метод
                            const stateNode = painterComponent.stateNode;
                            if (stateNode) {
                                if (typeof stateNode.setState === 'function') {
                                    stateUpdater = (newState) => stateNode.setState(newState);
                                } else if (typeof stateNode.forceUpdate === 'function') {
                                    stateUpdater = () => stateNode.forceUpdate();
                                }
                            }

                            // Инициализируем кэшированные значения из состояния компонента
                            const state = painterComponent.memoizedState;
                            if (state) {
                                if (state.brushSize !== undefined) toolState.size = state.brushSize;
                                if (state.brushOpacity !== undefined) toolState.opacity = state.brushOpacity;
                                if (state.brushColor !== undefined) toolState.color = state.brushColor;
                            }
                        } else {
                            console.warn('[Painter] Could not find painter component, will use fallback strategy');
                        }
                    } else {
                        console.warn('[Painter] Could not get React Fiber instance, will use fallback strategy');
                    }
                } else {
                    console.warn('[Painter] Could not find toolbar element, will use fallback strategy');
                }
            } catch (error) {
                console.warn('[Painter] Error finding React component:', error);
            }

            // Создаем обработчик жестов с колбэками для визуального отклика
            gestureHandler = createGestureHandler({
                onStart: _onGestureStart,
                onUpdate: _onGestureUpdate,
                onEnd: _onGestureEnd,
            });

            // Добавляем слушатели событий на window для клавиатуры
            _addEventListener(window, 'keydown', _handleKeyDown);
            _addEventListener(window, 'keyup', _handleKeyUp);

            // Добавляем слушатели событий на канвас для мыши
            _addEventListener(elCanvas, 'mousedown', _handleMouseDown);
            _addEventListener(elCanvas, 'mousemove', _handleMouseMove);
            _addEventListener(elCanvas, 'mouseup', _handleMouseUp);

            isEnabled = true;
            console.log('[Painter] Module initialized successfully');
        } catch (error) {
            console.error('[Painter] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Очищает ресурсы модуля Painter.
     * Удаляет все слушатели событий и сбрасывает состояние.
     * 
     * @returns {void}
     */
    function destroy() {
        if (!isEnabled) {
            return;
        }

        try {
            // Удаляем все слушатели событий
            _removeAllEventListeners();

            // Удаляем визуальный отклик, если он существует
            _removeFeedback();

            // Сбрасываем ссылки
            gestureHandler = null;
            elCanvas = null;
            painterComponent = null;
            stateUpdater = null;

            isEnabled = false;
            console.log('[Painter] Module destroyed successfully');
        } catch (error) {
            console.error('[Painter] Failed to destroy:', error);
        }
    }

    // Возвращаем публичный API модуля
    return {
        get isEnabled() {
            return isEnabled;
        },
        init,
        destroy,
    };
}

// Экспорт для использования в других модулях
export default createPainterModule;
