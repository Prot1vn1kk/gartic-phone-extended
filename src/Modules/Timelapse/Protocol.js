/**
 * @fileoverview Модуль Protocol для парсинга Socket.IO пакетов Gartic Phone.
 * Фильтрует служебные пакеты и извлекает данные рисования.
 * @module Timelapse/Protocol
 */

/**
 * @typedef {Object} SocketPacket
 * @property {number} type - Тип пакета Socket.IO (0-6).
 * @property {string} namespace - Пространство имен (например, "/" или "/game").
 * @property {any} data - Данные пакета (обычно массив или объект).
 * @property {number} id - ID пакета (для ACK).
 */

/**
 * @typedef {Object} DrawingEvent
 * @property {string} type - Тип события ('draw', 'clear', 'undo').
 * @property {Object} data - Данные события (координаты, размер, цвет и т.д.).
 * @property {number} timestamp - Временная метка.
 */

/**
 * Создает модуль Protocol для парсинга Socket.IO пакетов.
 *
 * @returns {Object} Объект модуля Protocol.
 */
export function createProtocolParser() {
    /**
     * @type {boolean}
     */
    let debugMode = false;

    /**
     * Типы пакетов Socket.IO Engine.IO.
     * @type {Object}
     */
    const PACKET_TYPES = {
        OPEN: 0,      // Открытие соединения
        CLOSE: 1,     // Закрытие соединения
        PING: 2,      // Пинг
        PONG: 3,      // Понг
        MESSAGE: 4,    // Сообщение
        UPGRADE: 5,   // Обновление протокола
        NOOP: 6       // Нет операции
    };

    /**
     * Типы сообщений Socket.IO v2/v4.
     * @type {Object}
     */
    const MESSAGE_TYPES = {
        CONNECT: 0,
        DISCONNECT: 1,
        EVENT: 2,     // Событие (draw, clear, undo)
        ACK: 3,
        ERROR: 4,
        BINARY_EVENT: 5,
        BINARY_ACK: 6
    };

    /**
     * Имена событий рисования для фильтрации.
     * @type {string[]}
     */
    const DRAWING_EVENTS = ['draw', 'clear', 'undo', 'line', 'stroke', 'path'];

    /**
     * Парсит сырой пакет Socket.IO.
     *
     * @private
     * @param {string} rawPacket - Сырой пакет от WebSocket.
     * @returns {SocketPacket | null} Распаршенный пакет или null.
     */
    function _parseSocketPacket(rawPacket) {
        try {
            // Пакет Socket.IO начинается с цифры типа сообщения
            // Формат: <messageType>[<namespace>,]<event>,[<data>...]
            // Или: <engineType><messageType>...

            let packetStr = rawPacket;

            // Проверяем наличие Engine.IO типа (первая цифра)
            let engineType = null;
            if (/^[0-9]/.test(packetStr)) {
                engineType = parseInt(packetStr.charAt(0), 10);
                packetStr = packetStr.substring(1);
            }

            // Если это не MESSAGE пакет (4), игнорируем
            if (engineType !== null && engineType !== PACKET_TYPES.MESSAGE) {
                if (debugMode) {
                    console.log('[Protocol] Ignoring Engine.IO packet type:', engineType);
                }
                return null;
            }

            // Парсим тип сообщения Socket.IO
            if (!/^[0-9]/.test(packetStr)) {
                // Нет типа сообщения - это может быть просто JSON
                return {
                    type: MESSAGE_TYPES.EVENT,
                    namespace: '/',
                    data: JSON.parse(packetStr),
                    id: null
                };
            }

            const messageType = parseInt(packetStr.charAt(0), 10);
            packetStr = packetStr.substring(1);

            // Парсим пространство имен (если есть)
            let namespace = '/';
            if (packetStr.startsWith('/')) {
                const namespaceEnd = packetStr.indexOf(',');
                if (namespaceEnd !== -1) {
                    namespace = packetStr.substring(0, namespaceEnd);
                    packetStr = packetStr.substring(namespaceEnd + 1);
                }
            }

            // Парсим ID пакета (для ACK)
            let id = null;
            const idMatch = packetStr.match(/^(\d+)(?=[,])/);
            if (idMatch) {
                id = parseInt(idMatch[1], 10);
                packetStr = packetStr.substring(idMatch[0].length);
            }

            // Парсим данные
            let data = null;
            try {
                data = JSON.parse(packetStr);
            } catch (error) {
                // Если не удалось распарсить как JSON, оставляем как строку
                data = packetStr;
            }

            return {
                type: messageType,
                namespace,
                data,
                id
            };
        } catch (error) {
            if (debugMode) {
                console.warn('[Protocol] Failed to parse packet:', rawPacket, error);
            }
            return null;
        }
    }

    /**
     * Проверяет, является ли пакет событием рисования.
     *
     * @private
     * @param {SocketPacket} packet - Распаршенный пакет.
     * @returns {boolean} true если это событие рисования.
     */
    function _isDrawingEvent(packet) {
        if (!packet || packet.type !== MESSAGE_TYPES.EVENT) {
            return false;
        }

        // Данные события обычно в формате: ['eventName', ...args]
        if (!Array.isArray(packet.data) || packet.data.length === 0) {
            return false;
        }

        const eventName = packet.data[0];
        return DRAWING_EVENTS.includes(eventName);
    }

    /**
     * Извлекает данные рисования из пакета.
     *
     * @private
     * @param {SocketPacket} packet - Распаршенный пакет.
     * @returns {DrawingEvent | null} Событие рисования или null.
     */
    function _extractDrawingData(packet) {
        if (!_isDrawingEvent(packet)) {
            return null;
        }

        const eventName = packet.data[0];
        const eventData = packet.data[1] || {};

        // Нормализуем данные рисования
        const normalizedData = _normalizeDrawingData(eventName, eventData);

        return {
            type: eventName,
            data: normalizedData,
            timestamp: Date.now()
        };
    }

    /**
     * Нормализует данные рисования в единый формат.
     *
     * @private
     * @param {string} eventType - Тип события.
     * @param {Object} rawData - Сырые данные события.
     * @returns {Object} Нормализованные данные.
     */
    function _normalizeDrawingData(eventType, rawData) {
        const normalized = {
            type: eventType,
            x: 0,
            y: 0,
            size: 5,
            color: '#000000',
            opacity: 100,
            prevX: null,
            prevY: null
        };

        // Извлекаем координаты
        if (rawData.x !== undefined) normalized.x = rawData.x;
        if (rawData.y !== undefined) normalized.y = rawData.y;
        if (rawData.prevX !== undefined) normalized.prevX = rawData.prevX;
        if (rawData.prevY !== undefined) normalized.prevY = rawData.prevY;
        if (rawData.px !== undefined) normalized.prevX = rawData.px;
        if (rawData.py !== undefined) normalized.prevY = rawData.py;

        // Извлекаем свойства кисти
        if (rawData.size !== undefined) normalized.size = rawData.size;
        if (rawData.width !== undefined) normalized.size = rawData.width;
        if (rawData.thickness !== undefined) normalized.size = rawData.thickness;

        if (rawData.color !== undefined) normalized.color = rawData.color;
        if (rawData.c !== undefined) normalized.color = rawData.c;

        if (rawData.opacity !== undefined) normalized.opacity = rawData.opacity * 100;
        if (rawData.alpha !== undefined) normalized.opacity = rawData.alpha * 100;
        if (rawData.a !== undefined) normalized.opacity = rawData.a * 100;

        // Для событий clear и undo
        if (eventType === 'clear' || eventType === 'undo') {
            normalized.action = eventType;
        }

        return normalized;
    }

    /**
     * Парсит сырой пакет и возвращает событие рисования если применимо.
     *
     * @public
     * @param {string} rawPacket - Сырой пакет от WebSocket.
     * @returns {DrawingEvent | null} Событие рисования или null.
     */
    function parse(rawPacket) {
        if (debugMode) {
            console.log('[Protocol] Parsing packet:', rawPacket);
        }

        // Парсим пакет
        const packet = _parseSocketPacket(rawPacket);
        if (!packet) {
            return null;
        }

        // Логируем тип пакета в debug режиме
        if (debugMode) {
            console.log('[Protocol] Packet type:', packet.type, 'Namespace:', packet.namespace);
        }

        // Извлекаем данные рисования
        const drawingEvent = _extractDrawingData(packet);
        if (drawingEvent && debugMode) {
            console.log('[Protocol] Drawing event captured:', drawingEvent);
        }

        return drawingEvent;
    }

    /**
     * Включает или выключает debug режим.
     *
     * @public
     * @param {boolean} enabled - Включить debug режим.
     */
    function setDebugMode(enabled) {
        debugMode = enabled;
        console.log(`[Protocol] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Проверяет, является ли пакет пингом.
     *
     * @public
     * @param {string} rawPacket - Сырой пакет от WebSocket.
     * @returns {boolean} true если это пинг.
     */
    function isPing(rawPacket) {
        return rawPacket.startsWith('2');
    }

    /**
     * Проверяет, является ли пакет сообщением.
     *
     * @public
     * @param {string} rawPacket - Сырой пакет от WebSocket.
     * @returns {boolean} true если это сообщение.
     */
    function isMessage(rawPacket) {
        // Проверяем Engine.IO тип 4 (MESSAGE)
        if (rawPacket.startsWith('4')) {
            return true;
        }
        // Или Socket.IO тип 2 (EVENT) без Engine.IO типа
        if (rawPacket.startsWith('2')) {
            const packetStr = rawPacket.substring(1);
            if (packetStr.startsWith('[')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Инициализирует модуль Protocol.
     */
    function init() {
        console.log('[Protocol] Initialized successfully');
    }

    /**
     * Очищает ресурсы модуля Protocol.
     */
    function destroy() {
        console.log('[Protocol] Destroyed successfully');
    }

    // Возвращаем публичный API модуля
    return {
        parse,
        setDebugMode,
        isPing,
        isMessage,
        init,
        destroy
    };
}

// Экспорт для использования в других модулях
export default createProtocolParser;
