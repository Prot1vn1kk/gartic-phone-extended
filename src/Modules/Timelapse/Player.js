/**
 * @fileoverview Модуль Player для воспроизведения записанных рисунков.
 * Использует Canvas API для векторной отрисовки штрихов.
 * @module Timelapse/Player
 */

/**
 * @typedef {Object} StrokePoint
 * @property {number} x - X координата точки.
 * @property {number} y - Y координата точки.
 * @property {number} size - Размер кисти.
 * @property {string} color - Цвет кисти (hex).
 * @property {number} opacity - Прозрачность кисти (0-100).
 * @property {number} time - Временная метка (timestamp).
 */

/**
 * @typedef {Object} RecordingSession
 * @property {string} id - Уникальный идентификатор сессии записи.
 * @property {number} startTime - Время начала записи.
 * @property {number} endTime - Время окончания записи.
 * @property {StrokePoint[]} strokes - Массив записанных штрихов.
 * @property {Object} metadata - Метаданные сессии.
 */

/**
 * @typedef {Object} PlayerConfig
 * @property {number} speed - Скорость воспроизведения (1-200).
 * @property {boolean} loop - Зацикливание воспроизведения.
 * @property {boolean} showControls - Отображение элементов управления.
 */

/**
 * Создает модуль Player для воспроизведения записей.
 *
 * @param {PlayerConfig} config - Конфигурация плеера.
 * @returns {Object} Объект модуля Player.
 */
export function createPlayer(config = {}) {
    /**
     * @type {PlayerConfig}
     */
    const DEFAULT_CONFIG = {
        speed: 50,
        loop: false,
        showControls: true
    };

    /**
     * @type {PlayerConfig}
     */
    let playerConfig = { ...DEFAULT_CONFIG, ...config };

    /**
     * @type {RecordingSession | null}
     */
    let currentSession = null;

    /**
     * @type {HTMLCanvasElement | null}
     */
    let canvas = null;

    /**
     * @type {CanvasRenderingContext2D | null}
     */
    let ctx = null;

    /**
     * @type {boolean}
     */
    let isPlaying = false;

    /**
     * @type {boolean}
     */
    let isPaused = false;

    /**
     * @type {number}
     */
    let currentStrokeIndex = 0;

    /**
     * @type {number}
     */
    let animationFrameId = 0;

    /**
     * @type {number}
     */
    let lastFrameTime = 0;

    /**
     * @type {Function | null}
     * Колбэк для уведомления о состоянии воспроизведения.
     */
    let onStateChangeCallback = null;

    /**
     * @type {Function | null}
     * Колбэк для уведомления о завершении воспроизведения.
     */
    let onCompleteCallback = null;

    /**
     * Создает canvas элемент для воспроизведения.
     *
     * @private
     * @param {number} width - Ширина canvas.
     * @param {number} height - Высота canvas.
     * @returns {HTMLCanvasElement} Canvas элемент.
     */
    function _createCanvas(width, height) {
        const el = document.createElement('canvas');
        el.width = width;
        el.height = height;
        el.className = 'gp-ext-timelapse-canvas';

        // Стилизация через JavaScript
        Object.assign(el.style, {
            display: 'block',
            backgroundColor: '#ffffff',
            cursor: 'default',
            userSelect: 'none',
        });

        return el;
    }

    /**
     * Очищает canvas.
     *
     * @private
     */
    function _clearCanvas() {
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    /**
     * Отрисовывает точку штриха на canvas.
     *
     * @private
     * @param {StrokePoint} point - Точка штриха.
     * @param {StrokePoint} prevPoint - Предыдущая точка (для соединения линиями).
     */
    function _drawPoint(point, prevPoint = null) {
        if (!ctx) return;

        ctx.beginPath();

        // Преобразуем прозрачность из 0-100 в 0-1
        const alpha = point.opacity / 100;

        ctx.strokeStyle = point.color;
        ctx.lineWidth = point.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = alpha;

        if (prevPoint) {
            // Рисуем линию от предыдущей точки к текущей
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        } else {
            // Рисуем отдельную точку
            ctx.arc(point.x, point.y, point.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = point.color;
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Вычисляет количество штрихов для отрисовки в текущем кадре на основе скорости.
     *
     * @private
     * @param {number} deltaTime - Время с последнего кадра (ms).
     * @returns {number} Количество штрихов для отрисовки.
     */
    function _calculateStrokesPerFrame(deltaTime) {
        const speed = playerConfig.speed;

        if (speed >= 100) {
            // Скорость 100+: мгновенная отрисовка пачек штрихов
            // Чем выше скорость, тем больше штрихов за кадр
            return Math.floor((speed - 99) * 10);
        } else {
            // Скорость 1-99: интерполированная анимация
            // Базовая скорость: 1 штрих за 16ms (60 FPS)
            const baseStrokesPerMs = 1 / 16;
            // Умножаем на скорость (1-99)
            const strokesPerMs = baseStrokesPerMs * (speed / 50);
            return Math.max(1, Math.floor(strokesPerMs * deltaTime));
        }
    }

    /**
     * Основной цикл анимации.
     *
     * @private
     * @param {number} timestamp - Текущее время анимации.
     */
    function _animationLoop(timestamp) {
        if (!isPlaying || isPaused) {
            return;
        }

        const deltaTime = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        // Если нет текущей сессии или все штрихи отрисованы
        if (!currentSession || currentStrokeIndex >= currentSession.strokes.length) {
            _onComplete();
            return;
        }

        // Вычисляем количество штрихов для отрисовки
        const strokesToDraw = _calculateStrokesPerFrame(deltaTime);

        // Отрисовываем штрихи
        let prevPoint = null;
        for (let i = 0; i < strokesToDraw && currentStrokeIndex < currentSession.strokes.length; i++) {
            const point = currentSession.strokes[currentStrokeIndex];
            _drawPoint(point, prevPoint);
            prevPoint = point;
            currentStrokeIndex++;
        }

        // Продолжаем анимацию
        animationFrameId = requestAnimationFrame(_animationLoop);
    }

    /**
     * Обработчик завершения воспроизведения.
     *
     * @private
     */
    function _onComplete() {
        isPlaying = false;
        isPaused = false;
        cancelAnimationFrame(animationFrameId);

        if (playerConfig.loop) {
            // Перезапускаем воспроизведение
            play();
        } else {
            // Уведомляем о завершении
            if (onCompleteCallback) {
                onCompleteCallback();
            }
            _notifyStateChange('completed');
        }
    }

    /**
     * Уведомляет об изменении состояния воспроизведения.
     *
     * @private
     * @param {string} state - Новое состояние ('playing', 'paused', 'completed').
     */
    function _notifyStateChange(state) {
        if (onStateChangeCallback) {
            onStateChangeCallback({
                state,
                progress: getProgress(),
                currentStroke: currentStrokeIndex,
                totalStrokes: currentSession ? currentSession.strokes.length : 0
            });
        }
    }

    /**
     * Загружает сессию записи для воспроизведения.
     *
     * @param {RecordingSession} session - Сессия записи.
     * @returns {boolean} true если сессия загружена успешно.
     */
    function loadSession(session) {
        if (!session || !session.strokes || session.strokes.length === 0) {
            console.error('[Player] Invalid session provided');
            return false;
        }

        currentSession = session;
        currentStrokeIndex = 0;

        // Создаем canvas если его нет
        if (!canvas) {
            // Определяем размеры canvas на основе координат штрихов
            let maxX = 0, maxY = 0;
            for (const stroke of session.strokes) {
                maxX = Math.max(maxX, stroke.x);
                maxY = Math.max(maxY, stroke.y);
            }

            canvas = _createCanvas(maxX + 100, maxY + 100);
            ctx = canvas.getContext('2d');
        }

        console.log(`[Player] Loaded session: ${session.id} with ${session.strokes.length} strokes`);
        return true;
    }

    /**
     * Начинает воспроизведение.
     *
     * @returns {boolean} true если воспроизведение начато успешно.
     */
    function play() {
        if (!currentSession) {
            console.error('[Player] No session loaded');
            return false;
        }

        if (isPlaying && !isPaused) {
            console.warn('[Player] Already playing');
            return false;
        }

        isPlaying = true;
        isPaused = false;
        lastFrameTime = performance.now();

        animationFrameId = requestAnimationFrame(_animationLoop);

        _notifyStateChange('playing');
        console.log('[Player] Started playback');

        return true;
    }

    /**
     * Приостанавливает воспроизведение.
     *
     * @returns {boolean} true если воспроизведение приостановлено.
     */
    function pause() {
        if (!isPlaying || isPaused) {
            console.warn('[Player] Not playing or already paused');
            return false;
        }

        isPaused = true;
        cancelAnimationFrame(animationFrameId);

        _notifyStateChange('paused');
        console.log('[Player] Paused playback');

        return true;
    }

    /**
     * Возобновляет воспроизведение.
     *
     * @returns {boolean} true если воспроизведение возобновлено.
     */
    function resume() {
        if (!isPlaying || !isPaused) {
            console.warn('[Player] Not paused');
            return false;
        }

        isPaused = false;
        lastFrameTime = performance.now();

        animationFrameId = requestAnimationFrame(_animationLoop);

        _notifyStateChange('playing');
        console.log('[Player] Resumed playback');

        return true;
    }

    /**
     * Останавливает воспроизведение и сбрасывает позицию.
     *
     * @returns {boolean} true если воспроизведение остановлено.
     */
    function stop() {
        if (!isPlaying) {
            console.warn('[Player] Not playing');
            return false;
        }

        isPlaying = false;
        isPaused = false;
        cancelAnimationFrame(animationFrameId);
        currentStrokeIndex = 0;

        _clearCanvas();
        _notifyStateChange('stopped');
        console.log('[Player] Stopped playback');

        return true;
    }

    /**
     * Перематывает воспроизведение к указанной позиции.
     *
     * @param {number} progress - Прогресс воспроизведения (0-1).
     * @returns {boolean} true если перемотка выполнена успешно.
     */
    function seek(progress) {
        if (!currentSession) {
            console.error('[Player] No session loaded');
            return false;
        }

        progress = Math.max(0, Math.min(1, progress));
        const targetIndex = Math.floor(progress * currentSession.strokes.length);

        // Очищаем canvas
        _clearCanvas();

        // Перерисовываем все штрихи до целевой позиции
        let prevPoint = null;
        for (let i = 0; i < targetIndex; i++) {
            const point = currentSession.strokes[i];
            _drawPoint(point, prevPoint);
            prevPoint = point;
        }

        currentStrokeIndex = targetIndex;

        _notifyStateChange('seeked');
        console.log(`[Player] Seeked to ${Math.round(progress * 100)}%`);

        return true;
    }

    /**
     * Устанавливает скорость воспроизведения.
     *
     * @param {number} speed - Скорость воспроизведения (1-200).
     */
    function setSpeed(speed) {
        playerConfig.speed = Math.max(1, Math.min(200, speed));
        console.log(`[Player] Speed set to ${playerConfig.speed}`);
    }

    /**
     * Получает текущую скорость воспроизведения.
     *
     * @returns {number} Текущая скорость.
     */
    function getSpeed() {
        return playerConfig.speed;
    }

    /**
     * Получает прогресс воспроизведения.
     *
     * @returns {number} Прогресс (0-1).
     */
    function getProgress() {
        if (!currentSession || currentSession.strokes.length === 0) {
            return 0;
        }
        return currentStrokeIndex / currentSession.strokes.length;
    }

    /**
     * Получает canvas элемент.
     *
     * @returns {HTMLCanvasElement | null} Canvas элемент.
     */
    function getCanvas() {
        return canvas;
    }

    /**
     * Получает текущую сессию записи.
     *
     * @returns {RecordingSession | null} Текущая сессия или null.
     */
    function getSession() {
        return currentSession;
    }

    /**
     * Проверяет, активно ли воспроизведение.
     *
     * @returns {boolean} true если воспроизведение активно.
     */
    function isPlayingActive() {
        return isPlaying && !isPaused;
    }

    /**
     * Проверяет, приостановлено ли воспроизведение.
     *
     * @returns {boolean} true если воспроизведение приостановлено.
     */
    function isPlaybackPaused() {
        return isPaused;
    }

    /**
     * Устанавливает колбэк для уведомления о состоянии воспроизведения.
     *
     * @param {Function | null} callback - Функция колбэка или null для удаления.
     */
    function setOnStateChange(callback) {
        onStateChangeCallback = callback;
    }

    /**
     * Устанавливает колбэк для уведомления о завершении воспроизведения.
     *
     * @param {Function | null} callback - Функция колбэка или null для удаления.
     */
    function setOnComplete(callback) {
        onCompleteCallback = callback;
    }

    /**
     * Инициализирует модуль Player.
     */
    function init() {
        console.log('[Player] Initialized successfully');
    }

    /**
     * Очищает ресурсы модуля Player.
     */
    function destroy() {
        console.log('[Player] Destroying...');

        // Останавливаем воспроизведение
        stop();

        // Удаляем canvas
        if (canvas) {
            canvas.remove();
            canvas = null;
        }

        // Сбрасываем контекст
        ctx = null;

        // Удаляем колбэки
        onStateChangeCallback = null;
        onCompleteCallback = null;

        // Сбрасываем сессию
        currentSession = null;

        console.log('[Player] Destroyed successfully');
    }

    // Возвращаем публичный API модуля
    return {
        loadSession,
        play,
        pause,
        resume,
        stop,
        seek,
        setSpeed,
        getSpeed,
        getProgress,
        getCanvas,
        getSession,
        isPlayingActive,
        isPlaybackPaused,
        setOnStateChange,
        setOnComplete,
        init,
        destroy
    };
}

// Экспорт для использования в других модулях
export default createPlayer;
