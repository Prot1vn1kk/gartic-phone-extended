/**
 * @fileoverview Factory function для создания обработчика жестов "Vibe".
 * Реализует конечный автомат (State Machine) для управления жестами без DOM-привязки.
 * @module GestureHandler
 */

/**
 * @typedef {Object} GestureHandlerOptions
 * @property {function(Object): void} onStart - Колбэк, вызываемый в начале жеста. Принимает объект с начальным состоянием.
 * @property {function(Object): void} onUpdate - Колбэк, вызываемый при каждом движении мыши во время жеста. Принимает объект с новым состоянием.
 * @property {function(Object): void} onEnd - Колбэк, вызываемый при завершении жеста. Принимает объект с финальным состоянием.
 */

/**
 * @typedef {Object} GestureState
 * @property {boolean} isActive - Активен ли жест в данный момент.
 * @property {boolean} isPrepared - Подготовлен ли жест к активации (нажата клавиша-триггер).
 * @property {number} startX - Начальная X координата мыши.
 * @property {number} startY - Начальная Y координата мыши.
 * @property {number} currentX - Текущая X координата мыши.
 * @property {number} currentY - Текущая Y координата мыши.
 * @property {number} startValue - Начальное значение параметра.
 * @property {number} currentValue - Текущее значение параметра.
 * @property {number} deltaX - Смещение по оси X от начала жеста.
 * @property {number} deltaY - Смещение по оси Y от начала жеста.
 * @property {string} triggerKey - Клавиша-триггер, которая активировала жест.
 * @property {number} sensitivity - Чувствительность изменения значения.
 * @property {'x' | 'y'} axis - Ось, по которой происходит изменение значения.
 */

/**
 * Создает обработчик жестов для управления параметрами через мышь.
 * 
 * Логика работы:
 * 1. Пользователь зажимает клавишу-триггер (handleKeyDown) → жест подготовлен.
 * 2. Пользователь нажимает ЛКМ (handleMouseDown) → жест активирован.
 * 3. Пользователь двигает мышь (handleMouseMove) → значение обновляется.
 * 4. Пользователь отпускает ЛКМ или клавишу (handleMouseUp/handleKeyUp) → жест завершен.
 * 
 * @param {GestureHandlerOptions} options - Опции обработчика жестов.
 * @returns {Object} Объект с методами управления жестом.
 * 
 * @example
 * const gestureHandler = createGestureHandler({
 *   onStart: (state) => console.log('Жест начат', state),
 *   onUpdate: (state) => console.log('Значение:', state.currentValue),
 *   onEnd: (state) => console.log('Жест завершен', state)
 * });
 * 
 * // Внешний код вызывает методы в ответ на события:
 * document.addEventListener('keydown', (e) => gestureHandler.handleKeyDown(e.key, e));
 * document.addEventListener('mousedown', (e) => gestureHandler.handleMouseDown(e));
 * document.addEventListener('mousemove', (e) => gestureHandler.handleMouseMove(e));
 * document.addEventListener('mouseup', (e) => gestureHandler.handleMouseUp(e));
 * document.addEventListener('keyup', (e) => gestureHandler.handleKeyUp(e.key, e));
 */
function createGestureHandler(options) {
    // Валидация входных параметров
    if (!options || typeof options !== 'object') {
        throw new TypeError('GestureHandler: options должен быть объектом');
    }

    const { onStart, onUpdate, onEnd } = options;

    if (typeof onStart !== 'function') {
        throw new TypeError('GestureHandler: onStart должен быть функцией');
    }

    if (typeof onUpdate !== 'function') {
        throw new TypeError('GestureHandler: onUpdate должен быть функцией');
    }

    if (typeof onEnd !== 'function') {
        throw new TypeError('GestureHandler: onEnd должен быть функцией');
    }

    /**
     * Конфигурация обработчика жестов.
     * @type {Object}
     * @property {Set<string>} triggerKeys - Множество клавиш-триггеров.
     * @property {number} defaultSensitivity - Чувствительность по умолчанию.
     * @property {'x' | 'y'} defaultAxis - Ось по умолчанию.
     */
    const config = {
        triggerKeys: new Set(['Control', 'Shift', 'Alt']),
        defaultSensitivity: 1,
        defaultAxis: 'x',
    };

    /**
     * Внутреннее состояние конечного автомата.
     * @type {GestureState}
     */
    const state = {
        isActive: false,
        isPrepared: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        startValue: 0,
        currentValue: 0,
        deltaX: 0,
        deltaY: 0,
        triggerKey: null,
        sensitivity: config.defaultSensitivity,
        axis: config.defaultAxis,
    };

    /**
     * Вычисляет новое значение параметра на основе смещения мыши.
     * 
     * @private
     * @param {number} delta - Смещение мыши по выбранной оси.
     * @returns {number} Новое значение параметра.
     */
    function _calculateValue(delta) {
        return state.startValue + (delta * state.sensitivity);
    }

    /**
     * Создает объект состояния для передачи в колбэки.
     * 
     * @private
     * @returns {Object} Объект с текущим состоянием жеста.
     */
    function _getStateObject() {
        return {
            isActive: state.isActive,
            isPrepared: state.isPrepared,
            startX: state.startX,
            startY: state.startY,
            currentX: state.currentX,
            currentY: state.currentY,
            startValue: state.startValue,
            currentValue: state.currentValue,
            deltaX: state.deltaX,
            deltaY: state.deltaY,
            triggerKey: state.triggerKey,
            sensitivity: state.sensitivity,
            axis: state.axis,
        };
    }

    /**
     * Сбрасывает внутреннее состояние в исходные значения.
     * 
     * @private
     */
    function _resetState() {
        state.isActive = false;
        state.isPrepared = false;
        state.startX = 0;
        state.startY = 0;
        state.currentX = 0;
        state.currentY = 0;
        state.startValue = 0;
        state.currentValue = 0;
        state.deltaX = 0;
        state.deltaY = 0;
        state.triggerKey = null;
        state.sensitivity = config.defaultSensitivity;
        state.axis = config.defaultAxis;
    }

    /**
     * Обрабатывает нажатие клавиши.
     * Подготавливает жест к активации, если нажата клавиша-триггер.
     * 
     * @public
     * @param {string} key - Нажатая клавиша (например, 'Control', 'Shift', 'Alt').
     * @param {KeyboardEvent} event - Объект события клавиатуры.
     * @returns {boolean} true, если клавиша-триггер была обработана.
     */
    function handleKeyDown(key, event) {
        if (config.triggerKeys.has(key) && !state.isActive) {
            state.isPrepared = true;
            state.triggerKey = key;
            return true;
        }
        return false;
    }

    /**
     * Обрабатывает нажатие кнопки мыши.
     * Активирует жест, если он был подготовлен.
     * 
     * @public
     * @param {MouseEvent} event - Объект события мыши.
     * @param {number} [initialValue=0] - Начальное значение параметра для изменения.
     * @param {number} [sensitivity=config.defaultSensitivity] - Чувствительность изменения.
     * @param {'x' | 'y'} [axis=config.defaultAxis] - Ось, по которой изменять значение.
     * @returns {boolean} true, если жест был активирован.
     */
    function handleMouseDown(event, initialValue = 0, sensitivity = config.defaultSensitivity, axis = config.defaultAxis) {
        // Активируем только ЛКМ (button 0) и только если подготовлен
        if (event.button === 0 && state.isPrepared && !state.isActive) {
            state.isActive = true;
            state.isPrepared = false;
            state.startX = event.clientX;
            state.startY = event.clientY;
            state.currentX = event.clientX;
            state.currentY = event.clientY;
            state.startValue = initialValue;
            state.currentValue = initialValue;
            state.sensitivity = sensitivity;
            state.axis = axis;
            state.deltaX = 0;
            state.deltaY = 0;

            onStart(_getStateObject());
            return true;
        }
        return false;
    }

    /**
     * Обрабатывает движение мыши.
     * Обновляет значение параметра, если жест активен.
     * 
     * @public
     * @param {MouseEvent} event - Объект события мыши.
     * @returns {boolean} true, если жест активен и значение было обновлено.
     */
    function handleMouseMove(event) {
        if (!state.isActive) {
            return false;
        }

        state.currentX = event.clientX;
        state.currentY = event.clientY;
        state.deltaX = state.currentX - state.startX;
        state.deltaY = state.currentY - state.startY;

        // Вычисляем новое значение на основе выбранной оси
        const delta = state.axis === 'x' ? state.deltaX : state.deltaY;
        state.currentValue = _calculateValue(delta);

        onUpdate(_getStateObject());
        return true;
    }

    /**
     * Обрабатывает отпускание кнопки мыши.
     * Завершает жест, если он был активен.
     * 
     * @public
     * @param {MouseEvent} event - Объект события мыши.
     * @returns {boolean} true, если жест был завершен.
     */
    function handleMouseUp(event) {
        if (state.isActive) {
            state.isActive = false;
            onEnd(_getStateObject());
            _resetState();
            return true;
        }
        return false;
    }

    /**
     * Обрабатывает отпускание клавиши.
     * Принудительно завершает жест, если отпущена клавиша-триггер.
     * 
     * @public
     * @param {string} key - Отпущенная клавиша.
     * @param {KeyboardEvent} event - Объект события клавиатуры.
     * @returns {boolean} true, если жест был завершен.
     */
    function handleKeyUp(key, event) {
        // Если отпущена клавиша-триггер, завершаем жест
        if (config.triggerKeys.has(key)) {
            if (state.isActive) {
                state.isActive = false;
                onEnd(_getStateObject());
                _resetState();
                return true;
            }

            // Сбрасываем подготовку, если жест еще не активирован
            if (state.isPrepared) {
                state.isPrepared = false;
                state.triggerKey = null;
                return true;
            }
        }
        return false;
    }

    /**
     * Добавляет клавишу-триггер.
     * 
     * @public
     * @param {string} key - Название клавиши (например, 'KeyZ', 'KeyA').
     */
    function addTriggerKey(key) {
        if (typeof key === 'string' && key.length > 0) {
            config.triggerKeys.add(key);
        }
    }

    /**
     * Удаляет клавишу-триггер.
     * 
     * @public
     * @param {string} key - Название клавиши.
     */
    function removeTriggerKey(key) {
        config.triggerKeys.delete(key);
    }

    /**
     * Проверяет, активен ли жест в данный момент.
     * 
     * @public
     * @returns {boolean} true, если жест активен.
     */
    function isActive() {
        return state.isActive;
    }

    /**
     * Проверяет, подготовлен ли жест к активации.
     * 
     * @public
     * @returns {boolean} true, если жест подготовлен.
     */
    function isPrepared() {
        return state.isPrepared;
    }

    /**
     * Получает текущее состояние жеста (копию).
     * 
     * @public
     * @returns {Object} Копия текущего состояния.
     */
    function getState() {
        return _getStateObject();
    }

    /**
     * Принудительно завершает жест.
     * 
     * @public
     * @returns {boolean} true, если жест был активен и завершен.
     */
    function forceEnd() {
        if (state.isActive || state.isPrepared) {
            const wasActive = state.isActive;
            state.isActive = false;
            state.isPrepared = false;

            if (wasActive) {
                onEnd(_getStateObject());
            }

            _resetState();
            return true;
        }
        return false;
    }

    /**
     * Устанавливает чувствительность по умолчанию.
     * 
     * @public
     * @param {number} sensitivity - Новое значение чувствительности.
     */
    function setDefaultSensitivity(sensitivity) {
        if (typeof sensitivity === 'number' && !isNaN(sensitivity)) {
            config.defaultSensitivity = sensitivity;
        }
    }

    /**
     * Устанавливает ось по умолчанию.
     * 
     * @public
     * @param {'x' | 'y'} axis - Ось ('x' или 'y').
     */
    function setDefaultAxis(axis) {
        if (axis === 'x' || axis === 'y') {
            config.defaultAxis = axis;
        }
    }

    // Возвращаем публичный API
    return {
        handleKeyDown,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleKeyUp,
        addTriggerKey,
        removeTriggerKey,
        isActive,
        isPrepared,
        getState,
        forceEnd,
        setDefaultSensitivity,
        setDefaultAxis,
    };
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createGestureHandler;
}
