/**
 * @fileoverview Модуль IO для экспорта/импорта записей и сохранения изображений.
 * @module Timelapse/IO
 */

/**
 * @typedef {Object} RecordingSession
 * @property {string} id - Уникальный идентификатор сессии записи.
 * @property {number} startTime - Время начала записи.
 * @property {number} endTime - Время окончания записи.
 * @property {Array} strokes - Массив записанных штрихов.
 * @property {Object} metadata - Метаданные сессии.
 */

/**
 * Создает модуль IO для экспорта/импорта записей.
 *
 * @returns {Object} Объект модуля IO.
 */
export function createIO() {
    /**
     * @type {string}
     */
    const FILE_EXTENSION = '.json';

    /**
     * @type {string}
     */
    const MIME_TYPE_JSON = 'application/json';

    /**
     * @type {string}
     */
    const MIME_TYPE_PNG = 'image/png';

    /**
     * Генерирует имя файла для экспорта.
     *
     * @private
     * @param {string} sessionId - ID сессии записи.
     * @returns {string} Имя файла.
     */
    function _generateFileName(sessionId) {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10);
        const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
        return `gartic-timelapse_${dateStr}_${timeStr}_${sessionId.substring(5, 13)}`;
    }

    /**
     * Создает Blob из данных.
     *
     * @private
     * @param {any} data - Данные для Blob.
     * @param {string} mimeType - MIME тип.
     * @returns {Blob} Blob объект.
     */
    function _createBlob(data, mimeType) {
        if (typeof data === 'string') {
            return new Blob([data], { type: mimeType });
        }
        return new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
    }

    /**
     * Создает URL для скачивания файла.
     *
     * @private
     * @param {Blob} blob - Blob объект.
     * @returns {string} URL для скачивания.
     */
    function _createDownloadUrl(blob) {
        return URL.createObjectURL(blob);
    }

    /**
     * Создает скрытый элемент для скачивания и инициирует клик.
     *
     * @private
     * @param {string} url - URL для скачивания.
     * @param {string} filename - Имя файла.
     */
    function _triggerDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Удаляем элемент через небольшую задержку
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * Экспортирует сессию записи в JSON файл.
     *
     * @public
     * @param {RecordingSession} session - Сессия записи для экспорта.
     * @returns {boolean} true если экспорт выполнен успешно.
     */
    function exportRecording(session) {
        if (!session) {
            console.error('[IO] No session provided for export');
            return false;
        }

        try {
            // Создаем данные для экспорта
            const exportData = {
                version: '1.0',
                format: 'gartic-timelapse',
                session: {
                    id: session.id,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    duration: session.endTime - session.startTime,
                    strokesCount: session.strokes.length
                },
                strokes: session.strokes,
                metadata: session.metadata || {}
            };

            // Создаем Blob
            const blob = _createBlob(exportData, MIME_TYPE_JSON);

            // Генерируем имя файла
            const filename = _generateFileName(session.id) + FILE_EXTENSION;

            // Создаем URL и инициируем скачивание
            const url = _createDownloadUrl(blob);
            _triggerDownload(url, filename);

            console.log(`[IO] Exported session: ${session.id} to ${filename}`);
            return true;
        } catch (error) {
            console.error('[IO] Failed to export recording:', error);
            return false;
        }
    }

    /**
     * Импортирует сессию записи из JSON файла.
     *
     * @public
     * @param {File} file - Файл для импорта.
     * @returns {Promise<RecordingSession | null>} Promise с импортированной сессией.
     */
    function importRecording(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('[IO] No file provided for import'));
                return;
            }

            // Проверяем тип файла
            if (file.type !== MIME_TYPE_JSON && !file.name.endsWith(FILE_EXTENSION)) {
                reject(new Error('[IO] Invalid file type. Expected JSON file.'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    // Проверяем формат данных
                    if (!data.format || data.format !== 'gartic-timelapse') {
                        console.warn('[IO] Unknown format, trying to import anyway');
                    }

                    // Создаем объект сессии
                    const session = {
                        id: data.session?.id || `imported_${Date.now()}`,
                        startTime: data.session?.startTime || 0,
                        endTime: data.session?.endTime || 0,
                        strokes: data.strokes || [],
                        metadata: data.metadata || {}
                    };

                    console.log(`[IO] Imported session: ${session.id} with ${session.strokes.length} strokes`);
                    resolve(session);
                } catch (error) {
                    console.error('[IO] Failed to parse JSON file:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('[IO] Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Создает элемент input для выбора файла и возвращает Promise.
     *
     * @public
     * @param {string} accept - MIME тип или расширение файла.
     * @returns {Promise<File>} Promise с выбранным файлом.
     */
    function selectFile(accept = MIME_TYPE_JSON) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.style.display = 'none';

            input.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    resolve(file);
                } else {
                    reject(new Error('[IO] No file selected'));
                }
                document.body.removeChild(input);
            };

            input.oncancel = () => {
                reject(new Error('[IO] File selection cancelled'));
                document.body.removeChild(input);
            };

            document.body.appendChild(input);
            input.click();
        });
    }

    /**
     * Сохраняет текущий кадр canvas как PNG изображение.
     *
     * @public
     * @param {HTMLCanvasElement} canvas - Canvas элемент.
     * @param {string} filename - Имя файла (опционально).
     * @returns {boolean} true если сохранение выполнено успешно.
     */
    function saveSnapshot(canvas, filename) {
        if (!canvas) {
            console.error('[IO] No canvas provided for snapshot');
            return false;
        }

        try {
            // Генерируем имя файла если не предоставлено
            if (!filename) {
                const date = new Date();
                const dateStr = date.toISOString().slice(0, 10);
                const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
                filename = `gartic-snapshot_${dateStr}_${timeStr}.png`;
            }

            // Проверяем расширение
            if (!filename.endsWith('.png')) {
                filename += '.png';
            }

            // Получаем данные canvas
            const dataUrl = canvas.toDataURL(MIME_TYPE_PNG);

            // Создаем Blob из data URL
            const blob = dataUrlToBlob(dataUrl);

            // Создаем URL и инициируем скачивание
            const url = _createDownloadUrl(blob);
            _triggerDownload(url, filename);

            console.log(`[IO] Saved snapshot to ${filename}`);
            return true;
        } catch (error) {
            console.error('[IO] Failed to save snapshot:', error);
            return false;
        }
    }

    /**
     * Конвертирует Data URL в Blob.
     *
     * @private
     * @param {string} dataUrl - Data URL.
     * @returns {Blob} Blob объект.
     */
    function dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new Blob([u8arr], { type: mime });
    }

    /**
     * Сохраняет запись в локальное хранилище браузера.
     *
     * @public
     * @param {RecordingSession} session - Сессия записи для сохранения.
     * @returns {boolean} true если сохранение выполнено успешно.
     */
    function saveToLocalStorage(session) {
        if (!session) {
            console.error('[IO] No session provided for local storage');
            return false;
        }

        try {
            const key = `gartic_timelapse_${session.id}`;
            const data = JSON.stringify(session);
            localStorage.setItem(key, data);

            console.log(`[IO] Saved session to local storage: ${key}`);
            return true;
        } catch (error) {
            console.error('[IO] Failed to save to local storage:', error);
            return false;
        }
    }

    /**
     * Загружает запись из локального хранилища браузера.
     *
     * @public
     * @param {string} sessionId - ID сессии записи.
     * @returns {RecordingSession | null} Сессия записи или null.
     */
    function loadFromLocalStorage(sessionId) {
        if (!sessionId) {
            console.error('[IO] No session ID provided for local storage');
            return null;
        }

        try {
            const key = `gartic_timelapse_${sessionId}`;
            const data = localStorage.getItem(key);

            if (!data) {
                console.warn(`[IO] No session found in local storage: ${key}`);
                return null;
            }

            const session = JSON.parse(data);
            console.log(`[IO] Loaded session from local storage: ${key}`);
            return session;
        } catch (error) {
            console.error('[IO] Failed to load from local storage:', error);
            return null;
        }
    }

    /**
     * Получает список всех сохраненных сессий из локального хранилища.
     *
     * @public
     * @returns {RecordingSession[]} Массив сохраненных сессий.
     */
    function listSavedSessions() {
        try {
            const sessions = [];
            const prefix = 'gartic_timelapse_';

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    try {
                        const data = localStorage.getItem(key);
                        if (data) {
                            const session = JSON.parse(data);
                            sessions.push(session);
                        }
                    } catch (error) {
                        console.warn(`[IO] Failed to parse session: ${key}`, error);
                    }
                }
            }

            console.log(`[IO] Found ${sessions.length} saved sessions`);
            return sessions;
        } catch (error) {
            console.error('[IO] Failed to list saved sessions:', error);
            return [];
        }
    }

    /**
     * Удаляет сессию из локального хранилища.
     *
     * @public
     * @param {string} sessionId - ID сессии для удаления.
     * @returns {boolean} true если удаление выполнено успешно.
     */
    function deleteFromLocalStorage(sessionId) {
        if (!sessionId) {
            console.error('[IO] No session ID provided for deletion');
            return false;
        }

        try {
            const key = `gartic_timelapse_${sessionId}`;
            localStorage.removeItem(key);

            console.log(`[IO] Deleted session from local storage: ${key}`);
            return true;
        } catch (error) {
            console.error('[IO] Failed to delete from local storage:', error);
            return false;
        }
    }

    /**
     * Инициализирует модуль IO.
     */
    function init() {
        console.log('[IO] Initialized successfully');
    }

    /**
     * Очищает ресурсы модуля IO.
     */
    function destroy() {
        console.log('[IO] Destroyed successfully');
    }

    // Возвращаем публичный API модуля
    return {
        exportRecording,
        importRecording,
        selectFile,
        saveSnapshot,
        saveToLocalStorage,
        loadFromLocalStorage,
        listSavedSessions,
        deleteFromLocalStorage,
        init,
        destroy
    };
}

// Экспорт для использования в других модулях
export default createIO;
