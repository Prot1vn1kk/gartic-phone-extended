/**
 * @fileoverview Модуль Recorder для захвата данных рисования через WebSocket.
 * Использует monkey-patching WebSocket.prototype.send для перехвата пакетов.
 * @module Timelapse/Recorder
 */

import { createProtocolParser } from './Protocol.js';

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
 * Создает модуль Recorder для захвата данных рисования.
 *
 * @returns {Object} Объект модуля Recorder.
 */
export function createRecorder() {
    /**
     * @type {boolean}
     */
    let isRecording = false;

    /**
     * @type {RecordingSession | null}
     */
    let currentSession = null;

    /**
     * @type {StrokePoint[]}
     */
    let strokeBuffer = [];

    /**
     * @type {Function | null}
     * Оригинальный метод WebSocket.prototype.send.
     */
    let originalSend = null;

    /**
     * @type {Function | null}
     * Колбэк для уведомления о новых данных записи.
     */
    let onDataCallback = null;

    /**
     * @type {ReturnType<createProtocolParser>}
     * Парсер протокола Socket.IO.
     */
    const protocolParser = createProtocolParser();

    /**
     * Создает уникальный идентификатор для сессии записи.
     *
     * @private
     * @returns {string} Уникальный ID.
     */
    function _generateSessionId() {
        return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Конвертирует событие рисования из Protocol в точку штриха.
     *
     * @private
     * @param {Object} drawingEvent - Событие рисования от Protocol.
     * @returns {StrokePoint | null} Точка штриха или null.
     */
    function _convertToStrokePoint(drawingEvent) {
        if (!drawingEvent || !drawingEvent.data) {
            return null;
        }

        const data = drawingEvent.data;

        // Обрабатываем разные типы событий
        if (drawingEvent.type === 'clear' || drawingEvent.type === 'undo') {
            // Для clear и undo создаем специальную точку
            return {
                type: drawingEvent.type,
                x: 0,
                y: 0,
                size: 0,
                color: '#000000',
                opacity: 0,
                time: drawingEvent.timestamp,
                action: drawingEvent.type
            };
        }

        // Для draw событий извлекаем координаты и свойства кисти
        return {
            type: 'line',
            x: data.x || 0,
            y: data.y || 0,
            prevX: data.prevX || data.px || null,
            prevY: data.prevY || data.py || null,
            size: data.size || 5,
            color: data.color || '#000000',
            opacity: data.opacity || 100,
            time: drawingEvent.timestamp
        };
    }

    /**
     * Обработчик перехваченного метода WebSocket.send().
     *
     * @private
     * @param {string | ArrayBuffer | Blob | ArrayBufferView} data - Данные для отправки.
     */
    function _interceptedSend(data) {
        // Вызываем оригинальный метод
        originalSend.call(this, data);

        // Если запись не активна, пропускаем обработку
        if (!isRecording || !currentSession) {
            return;
        }

        try {
            // Обрабатываем только строковые данные (Socket.IO пакеты)
            if (typeof data !== 'string') {
                return;
            }

            // Используем Protocol parser для парсинга пакета
            const drawingEvent = protocolParser.parse(data);

            if (drawingEvent) {
                const strokePoint = _convertToStrokePoint(drawingEvent);

                if (strokePoint) {
                    strokeBuffer.push(strokePoint);

                    // Уведомляем колбэк о новых данных
                    if (onDataCallback) {
                        onDataCallback({
                            type: 'stroke',
                            data: strokePoint,
                            session: currentSession.id
                        });
                    }

                    console.log('[Recorder] Captured stroke:', strokePoint);
                }
            }
        } catch (error) {
            console.error('[Recorder] Error processing packet:', error);
        }
    }

    /**
     * Monkey-patch для WebSocket.prototype.send.
     *
     * @private
     */
    function _patchWebSocket() {
        if (originalSend) {
            console.warn('[Recorder] WebSocket already patched');
            return;
        }

        originalSend = WebSocket.prototype.send;
        WebSocket.prototype.send = _interceptedSend;

        console.log('[Recorder] WebSocket.prototype.send patched successfully');
    }

    /**
     * Восстанавливает оригинальный WebSocket.prototype.send.
     *
     * @private
     */
    function _unpatchWebSocket() {
        if (!originalSend) {
            console.warn('[Recorder] WebSocket not patched');
            return;
        }

        WebSocket.prototype.send = originalSend;
        originalSend = null;

        console.log('[Recorder] WebSocket.prototype.send restored');
    }

    /**
     * Начинает новую сессию записи.
     *
     * @returns {RecordingSession} Объект новой сессии записи.
     */
    function startRecording() {
        if (isRecording) {
            console.warn('[Recorder] Already recording, stopping previous session');
            stopRecording();
        }

        // Патчим WebSocket если еще не патчили
        _patchWebSocket();

        const sessionId = _generateSessionId();
        const startTime = Date.now();

        currentSession = {
            id: sessionId,
            startTime,
            endTime: 0,
            strokes: [],
            metadata: {
                version: '1.0',
                source: 'gartic-phone-extension'
            }
        };

        strokeBuffer = [];
        isRecording = true;

        console.log(`[Recorder] Started recording session: ${sessionId}`);

        return currentSession;
    }

    /**
     * Останавливает текущую сессию записи.
     *
     * @returns {RecordingSession | null} Завершенная сессия записи или null.
     */
    function stopRecording() {
        if (!isRecording || !currentSession) {
            console.warn('[Recorder] No active recording session');
            return null;
        }

        const endTime = Date.now();
        currentSession.endTime = endTime;
        currentSession.strokes = [...strokeBuffer];

        const completedSession = { ...currentSession };

        console.log(`[Recorder] Stopped recording session: ${currentSession.id}`);
        console.log(`[Recorder] Recorded ${currentSession.strokes.length} strokes`);

        // Сбрасываем состояние
        currentSession = null;
        strokeBuffer = [];
        isRecording = false;

        return completedSession;
    }

    /**
     * Проверяет, активна ли запись.
     *
     * @returns {boolean} true если запись активна.
     */
    function isActive() {
        return isRecording;
    }

    /**
     * Получает текущую сессию записи.
     *
     * @returns {RecordingSession | null} Текущая сессия или null.
     */
    function getCurrentSession() {
        return currentSession;
    }

    /**
     * Получает количество записанных штрихов в текущей сессии.
     *
     * @returns {number} Количество штрихов.
     */
    function getStrokeCount() {
        return strokeBuffer.length;
    }

    /**
     * Устанавливает колбэк для уведомления о новых данных записи.
     *
     * @param {Function | null} callback - Функция колбэка или null для удаления.
     */
    function setOnDataCallback(callback) {
        onDataCallback = callback;
    }

    /**
     * Очищает буфер записи.
     *
     * @private
     */
    function _clearBuffer() {
        strokeBuffer = [];
    }

    /**
     * Включает или выключает debug режим.
     *
     * @param {boolean} enabled - Включить debug режим.
     */
    function setDebugMode(enabled) {
        protocolParser.setDebugMode(enabled);
    }

    /**
     * Инициализирует модуль Recorder.
     * Патчит WebSocket для перехвата пакетов.
     */
    function init() {
        console.log('[Recorder] Initializing...');
        protocolParser.init();
        _patchWebSocket();
        console.log('[Recorder] Initialized successfully');
    }

    /**
     * Очищает ресурсы модуля Recorder.
     * Восстанавливает оригинальный WebSocket.
     */
    function destroy() {
        console.log('[Recorder] Destroying...');

        // Останавливаем запись если активна
        if (isRecording) {
            stopRecording();
        }

        // Восстанавливаем WebSocket
        _unpatchWebSocket();

        // Очищаем буфер
        _clearBuffer();

        // Удаляем колбэк
        onDataCallback = null;

        // Уничтожаем парсер протокола
        protocolParser.destroy();

        console.log('[Recorder] Destroyed successfully');
    }

    // Возвращаем публичный API модуля
    return {
        startRecording,
        stopRecording,
        isActive,
        getCurrentSession,
        getStrokeCount,
        setOnDataCallback,
        setDebugMode,
        init,
        destroy
    };
}

// Экспорт для использования в других модулях
export default createRecorder;
