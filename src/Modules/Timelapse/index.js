/**
 * @fileoverview Модуль Timelapse для Gartic Phone Extension.
 * Интегрирует Recorder, Player и UI для записи и воспроизведения рисунков.
 * @module Timelapse
 */

import { createRecorder } from './Recorder.js';
import { createPlayer } from './Player.js';
import { createPlayerUI } from './UI.js';
import { waitForElement } from '../../Utils/DOM.js';

// Глобальная ссылка на recorder для доступа из Settings
let recorderInstance = null;

/**
 * @typedef {Object} TimelapseModule
 * @property {boolean} isEnabled - Включен ли модуль.
 * @property {function(): Promise<void>} init - Инициализация модуля.
 * @property {function(): void} destroy - Очистка ресурсов модуля.
 */

/**
 * Создает модуль Timelapse для записи и воспроизведения рисунков.
 *
 * @returns {TimelapseModule} Объект модуля Timelapse.
 */
export function createTimelapseModule() {
    /**
     * @type {boolean}
     */
    let isEnabled = false;

    /**
     * @type {ReturnType<createRecorder> | null}
     */
    let recorder = null;

    /**
     * @type {ReturnType<createPlayer> | null}
     */
    let player = null;

    /**
     * @type {ReturnType<createPlayerUI> | null}
     */
    let ui = null;


    /**
     * @type {MutationObserver | null}
     */
    let phaseObserver = null;

    /**
     * @type {string | null}
     */
    let currentPhase = null;

    /**
     * @type {Map<string, HTMLImageElement>}
     */
    const resultImages = new Map();

    /**
     * @type {Map<string, HTMLElement>}
     */
    const imageWrappers = new Map();

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
     * Определяет текущую фазу игры на основе DOM.
     *
     * @private
     * @returns {string | null} Текущая фаза ('lobby', 'game', 'album', 'unknown') или null.
     */
    function _detectPhase() {
        // Проверяем наличие элементов характерных для разных фаз

        // Lobby Phase
        const lobbyElement = document.querySelector('[class*="lobby"], [class*="home"], [class*="menu"]');
        if (lobbyElement) {
            return 'lobby';
        }

        // Game Phase (Canvas для рисования)
        const canvasElement = document.querySelector('canvas[class*="game"], canvas[class*="draw"]');
        if (canvasElement) {
            return 'game';
        }

        // Album Phase (Изображения результатов)
        const albumElement = document.querySelector('[class*="album"], [class*="result"], [class*="gallery"]');
        if (albumElement) {
            return 'album';
        }

        return 'unknown';
    }

    /**
     * Обработчик изменения фазы игры.
     *
     * @private
     * @param {string} newPhase - Новая фаза.
     * @param {string} oldPhase - Предыдущая фаза.
     */
    function _handlePhaseChange(newPhase, oldPhase) {
        console.log(`[Timelapse] Phase changed: ${oldPhase} -> ${newPhase}`);

        // Выходим из предыдущей фазы
        switch (oldPhase) {
            case 'game':
                _onGamePhaseEnd();
                break;
            case 'album':
                _onAlbumPhaseEnd();
                break;
        }

        // Входим в новую фазу
        switch (newPhase) {
            case 'game':
                _onGamePhaseStart();
                break;
            case 'album':
                _onAlbumPhaseStart();
                break;
        }

        currentPhase = newPhase;
    }

    /**
     * Обработчик начала фазы игры (Game Phase).
     * Начинает запись рисования.
     *
     * @private
     */
    function _onGamePhaseStart() {
        console.log('[Timelapse] Game phase started - starting recording');

        if (recorder) {
            recorder.startRecording();
        }
    }

    /**
     * Обработчик окончания фазы игры (Game Phase).
     * Останавливает запись рисования.
     *
     * @private
     */
    function _onGamePhaseEnd() {
        console.log('[Timelapse] Game phase ended - stopping recording');

        if (recorder) {
            const session = recorder.stopRecording();
            if (session) {
                console.log(`[Timelapse] Recording completed: ${session.strokes.length} strokes`);
            }
        }
    }

    /**
     * Обработчик начала фазы альбома (Album Phase).
     * Добавляет обработчики MMB на изображения результатов.
     *
     * @private
     */
    async function _onAlbumPhaseStart() {
        console.log('[Timelapse] Album phase started - setting up image handlers');

        // Ожидаем появления изображений результатов
        await _waitForResultImages();

        // Добавляем обработчики MMB на изображения
        _setupImageHandlers();
    }

    /**
     * Обработчик окончания фазы альбома (Album Phase).
     * Очищает обработчики изображений.
     *
     * @private
     */
    function _onAlbumPhaseEnd() {
        console.log('[Timelapse] Album phase ended - cleaning up image handlers');

        // Очищаем карту изображений
        resultImages.clear();
        imageWrappers.clear();
    }

    /**
     * Ожидает появления изображений результатов.
     *
     * @private
     * @returns {Promise<void>}
     */
    async function _waitForResultImages() {
        // Ждем появления изображений в альбоме
        // Gartic Phone обычно использует <img> элементы с определенными классами
        const imageSelector = 'img[class*="result"], img[class*="drawing"], img[class*="artwork"]';

        try {
            await waitForElement(imageSelector);
            console.log('[Timelapse] Result images found');
        } catch (error) {
            console.warn('[Timelapse] No result images found:', error);
        }
    }

    /**
     * Настраивает обработчики событий на изображения результатов.
     *
     * @private
     */
    function _setupImageHandlers() {
        // Находим все изображения результатов
        const images = document.querySelectorAll('img[class*="result"], img[class*="drawing"], img[class*="artwork"]');

        images.forEach((img, index) => {
            const imageId = `result_${index}_${Date.now()}`;
            resultImages.set(imageId, img);

            // Создаем обертку для изображения
            const wrapper = document.createElement('div');
            wrapper.className = 'gp-ext-timelapse-image-wrapper';

            Object.assign(wrapper.style, {
                position: 'relative',
                display: 'inline-block',
            });

            // Вставляем обертку перед изображением и перемещаем изображение в обертку
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);

            imageWrappers.set(imageId, wrapper);

            // Добавляем обработчик MMB
            _addEventListener(img, 'mousedown', (e) => {
                if (e.button === 1) {
                    // Middle Mouse Button
                    e.preventDefault();
                    _handleImageMMB(img, wrapper);
                }
            });

            // Добавляем визуальный индикатор при наведении
            _addEventListener(img, 'mouseenter', () => {
                img.style.cursor = 'context-menu';
            });
            _addEventListener(img, 'mouseleave', () => {
                img.style.cursor = '';
            });
        });

        console.log(`[Timelapse] Set up handlers for ${images.length} result images`);
    }

    /**
     * Обработчик MMB на изображении результата.
     * Скрывает изображение и показывает плеер.
     *
     * @private
     * @param {HTMLImageElement} image - Изображение результата.
     * @param {HTMLElement} wrapper - Обертка изображения.
     */
    function _handleImageMMB(image, wrapper) {
        console.log('[Timelapse] MMB clicked on result image');

        // Получаем последнюю сессию записи
        const lastSession = recorder ? recorder.getCurrentSession() : null;

        if (!lastSession || lastSession.strokes.length === 0) {
            console.warn('[Timelapse] No recording session available');
            return;
        }

        // Скрываем изображение
        image.style.display = 'none';

        // Создаем плеер и UI
        if (!player) {
            player = createPlayer();
            player.init();
        }

        if (!ui) {
            ui = createPlayerUI(player);
            ui.init();
        }

        // Загружаем сессию в плеер
        player.loadSession(lastSession);

        // Монтируем UI в обертку
        ui.mount(wrapper);

        // Запускаем воспроизведение
        player.play();

        // Добавляем обработчик для восстановления изображения
        const restoreHandler = () => {
            image.style.display = '';
            if (ui) {
                ui.unmount();
            }
            if (player) {
                player.stop();
            }
        };

        // Добавляем кнопку для восстановления изображения
        const restoreBtn = document.createElement('button');
        restoreBtn.textContent = '×';
        restoreBtn.className = 'gp-ext-timelapse-restore-btn';

        Object.assign(restoreBtn.style, {
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '24px',
            height: '24px',
            border: 'none',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            fontSize: '16px',
            cursor: 'pointer',
            zIndex: '10',
        });

        _addEventListener(restoreBtn, 'click', restoreHandler);
        wrapper.appendChild(restoreBtn);
    }

    /**
     * Настраивает наблюдение за изменениями фаз игры.
     *
     * @private
     */
    function _setupPhaseObserver() {
        // Используем MutationObserver для отслеживания изменений DOM
        phaseObserver = new MutationObserver(() => {
            const newPhase = _detectPhase();

            if (newPhase !== currentPhase && newPhase !== 'unknown') {
                _handlePhaseChange(newPhase, currentPhase);
            }
        });

        // Наблюдаем за изменениями в body
        phaseObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        console.log('[Timelapse] Phase observer set up');
    }

    /**
     * Останавливает наблюдение за изменениями фаз игры.
     *
     * @private
     */
    function _stopPhaseObserver() {
        if (phaseObserver) {
            phaseObserver.disconnect();
            phaseObserver = null;
            console.log('[Timelapse] Phase observer stopped');
        }
    }

    /**
     * Инициализирует модуль Timelapse.
     * Настраивает наблюдение за фазами игры и инициализирует компоненты.
     *
     * @async
     * @returns {Promise<void>}
     */
    async function init() {
        if (isEnabled) {
            return;
        }

        try {
            // Создаем компоненты
            recorder = createRecorder();
            player = createPlayer();
            ui = createPlayerUI(player);

            // Инициализируем Recorder
            recorder.init();

            // Инициализируем Player
            player.init();

            // Инициализируем UI
            ui.init();

            // Настраиваем наблюдение за фазами игры
            _setupPhaseObserver();

            // Определяем начальную фазу
            const initialPhase = _detectPhase();
            if (initialPhase !== 'unknown') {
                _handlePhaseChange(initialPhase, null);
            }

            isEnabled = true;
            console.log('[Timelapse] Module initialized successfully');
        } catch (error) {
            console.error('[Timelapse] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Очищает ресурсы модуля Timelapse.
     * Удаляет наблюдатели, обработчики событий и уничтожает компоненты.
     *
     * @returns {void}
     */
    function destroy() {
        if (!isEnabled) {
            return;
        }

        try {
            // Останавливаем наблюдение за фазами
            _stopPhaseObserver();

            // Удаляем все слушатели событий
            _removeAllEventListeners();

            // Уничтожаем компоненты
            if (recorder) {
                recorder.destroy();
                recorder = null;
            }

            if (player) {
                player.destroy();
                player = null;
            }

            if (ui) {
                ui.destroy();
                ui = null;
            }

            // Очищаем карты
            resultImages.clear();
            imageWrappers.clear();

            // Сбрасываем фазу
            currentPhase = null;

            isEnabled = false;
            console.log('[Timelapse] Module destroyed successfully');
        } catch (error) {
            console.error('[Timelapse] Failed to destroy:', error);
        }
    }

    // Возвращаем публичный API модуля
    return {
        get isEnabled() {
            return isEnabled;
        },
        get recorder() {
            return recorder;
        },
        init,
        destroy,
    };
}

// Экспорт для использования в других модулях
export default createTimelapseModule;
