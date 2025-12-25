/**
 * @fileoverview Модуль UI для Timelapse Player.
 * Создает оверлей с элементами управления воспроизведением.
 * @module Timelapse/UI
 */

import { createIO } from './IO.js';

/**
 * @typedef {Object} PlayerUIConfig
 * @property {boolean} showControls - Отображение элементов управления.
 * @property {boolean} showTimeline - Отображение таймлайна.
 * @property {boolean} showSpeedSlider - Отображение слайдера скорости.
 */

/**
 * Создает модуль UI для управления плеером.
 *
 * @param {Object} player - Инстанс плеера.
 * @param {PlayerUIConfig} config - Конфигурация UI.
 * @returns {Object} Объект модуля UI.
 */
export function createPlayerUI(player, config = {}) {
    /**
     * @type {PlayerUIConfig}
     */
    const DEFAULT_CONFIG = {
        showControls: true,
        showTimeline: true,
        showSpeedSlider: true
    };

    /**
     * @type {PlayerUIConfig}
     */
    let uiConfig = { ...DEFAULT_CONFIG, ...config };

    /**
     * @type {HTMLElement | null}
     */
    let container = null;

    /**
     * @type {HTMLElement | null}
     */
    let controlsBar = null;

    /**
     * @type {HTMLElement | null}
     */
    let playPauseBtn = null;

    /**
     * @type {HTMLElement | null}
     */
    let timeline = null;

    /**
     * @type {HTMLElement | null}
     */
    let timelineProgress = null;

    /**
     * @type {HTMLElement | null}
     */
    let speedSlider = null;

    /**
     * @type {HTMLElement | null}
     */
    let speedIndicator = null;

    /**
     * @type {boolean}
     */
    let isExpanded = false;

    /**
     * @type {boolean}
     */
    let isFullscreen = false;

    /**
     * @type {boolean}
     */
    let isSpeedDragging = false;

    /**
     * @type {number}
     */
    let speedDragStartX = 0;

    /**
     * @type {number}
     */
    let speedDragStartValue = 0;

    /**
     * @type {ReturnType<createIO>}
     * Модуль IO для экспорта/импорта.
     */
    const io = createIO();

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
     * Создает контейнер для UI.
     *
     * @private
     * @returns {HTMLElement} Контейнер UI.
     */
    function _createContainer() {
        const el = document.createElement('div');
        el.className = 'gp-ext-timelapse-container';

        Object.assign(el.style, {
            position: 'relative',
            display: 'inline-block',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
        });

        return el;
    }

    /**
     * Создает панель управления.
     *
     * @private
     * @returns {HTMLElement} Панель управления.
     */
    function _createControlsBar() {
        const el = document.createElement('div');
        el.className = 'gp-ext-timelapse-controls';

        Object.assign(el.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 15px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            gap: '10px',
        });

        // Кнопка Play/Pause
        playPauseBtn = document.createElement('button');
        playPauseBtn.className = 'gp-ext-timelapse-play-btn';
        playPauseBtn.textContent = '▶';

        Object.assign(playPauseBtn.style, {
            width: '32px',
            height: '32px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#4CAF50',
            color: '#ffffff',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'backgroundColor 0.2s',
        });

        _addEventListener(playPauseBtn, 'click', _handlePlayPause);
        _addEventListener(playPauseBtn, 'mouseenter', () => {
            playPauseBtn.style.backgroundColor = '#45a049';
        });
        _addEventListener(playPauseBtn, 'mouseleave', () => {
            playPauseBtn.style.backgroundColor = '#4CAF50';
        });

        // Таймлайн
        if (uiConfig.showTimeline) {
            timeline = _createTimeline();
        }

        // Слайдер скорости
        if (uiConfig.showSpeedSlider) {
            speedSlider = _createSpeedSlider();
        }

        el.appendChild(playPauseBtn);
        if (timeline) el.appendChild(timeline);
        if (speedSlider) el.appendChild(speedSlider);

        return el;
    }

    /**
     * Создает таймлайн.
     *
     * @private
     * @returns {HTMLElement} Таймлайн.
     */
    function _createTimeline() {
        const el = document.createElement('div');
        el.className = 'gp-ext-timelapse-timeline';

        Object.assign(el.style, {
            flex: '1',
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '3px',
            cursor: 'pointer',
            position: 'relative',
        });

        timelineProgress = document.createElement('div');
        timelineProgress.className = 'gp-ext-timelapse-timeline-progress';

        Object.assign(timelineProgress.style, {
            height: '100%',
            backgroundColor: '#4CAF50',
            borderRadius: '3px',
            width: '0%',
            transition: 'width 0.1s linear',
        });

        el.appendChild(timelineProgress);

        _addEventListener(el, 'click', _handleTimelineClick);

        return el;
    }

    /**
     * Создает слайдер скорости.
     *
     * @private
     * @returns {HTMLElement} Слайдер скорости.
     */
    function _createSpeedSlider() {
        const el = document.createElement('div');
        el.className = 'gp-ext-timelapse-speed-slider';

        Object.assign(el.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            minWidth: '80px',
        });

        const label = document.createElement('span');
        label.textContent = 'Speed:';
        label.style.fontSize = '12px';

        speedIndicator = document.createElement('div');
        speedIndicator.className = 'gp-ext-timelapse-speed-indicator';

        Object.assign(speedIndicator.style, {
            width: '40px',
            height: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            cursor: 'ew-resize',
            userSelect: 'none',
        });

        _updateSpeedIndicator();

        _addEventListener(speedIndicator, 'mousedown', _handleSpeedSliderMouseDown);

        el.appendChild(label);
        el.appendChild(speedIndicator);

        return el;
    }

    /**
     * Обновляет индикатор скорости.
     *
     * @private
     */
    function _updateSpeedIndicator() {
        if (speedIndicator && player) {
            const speed = player.getSpeed();
            speedIndicator.textContent = speed >= 100 ? `${speed}x` : `${speed}%`;
        }
    }

    /**
     * Обновляет прогресс таймлайна.
     *
     * @private
     */
    function _updateTimelineProgress() {
        if (timelineProgress && player) {
            const progress = player.getProgress();
            timelineProgress.style.width = `${progress * 100}%`;
        }
    }

    /**
     * Обновляет кнопку Play/Pause.
     *
     * @private
     */
    function _updatePlayPauseButton() {
        if (playPauseBtn && player) {
            if (player.isPlayingActive()) {
                playPauseBtn.textContent = '⏸';
            } else {
                playPauseBtn.textContent = '▶';
            }
        }
    }

    /**
     * Обработчик клика по кнопке Play/Pause.
     *
     * @private
     */
    function _handlePlayPause() {
        if (player.isPlayingActive()) {
            player.pause();
        } else {
            player.play();
        }
    }

    /**
     * Обработчик клика по таймлайну.
     *
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleTimelineClick(e) {
        if (!timeline || !player) return;

        const rect = timeline.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = x / rect.width;

        player.seek(progress);
    }

    /**
     * Обработчик mousedown на слайдере скорости.
     *
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleSpeedSliderMouseDown(e) {
        e.preventDefault();
        isSpeedDragging = true;
        speedDragStartX = e.clientX;
        speedDragStartValue = player.getSpeed();

        _addEventListener(document, 'mousemove', _handleSpeedSliderMouseMove);
        _addEventListener(document, 'mouseup', _handleSpeedSliderMouseUp);
    }

    /**
     * Обработчик mousemove при перетаскивании слайдера скорости.
     *
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleSpeedSliderMouseMove(e) {
        if (!isSpeedDragging) return;

        const deltaX = e.clientX - speedDragStartX;
        // Чувствительность: 1px = 2 единицы скорости
        const newSpeed = Math.max(1, Math.min(200, speedDragStartValue + deltaX * 2));

        player.setSpeed(newSpeed);
        _updateSpeedIndicator();
    }

    /**
     * Обработчик mouseup при перетаскивании слайдера скорости.
     *
     * @private
     */
    function _handleSpeedSliderMouseUp() {
        isSpeedDragging = false;

        document.removeEventListener('mousemove', _handleSpeedSliderMouseMove);
        document.removeEventListener('mouseup', _handleSpeedSliderMouseUp);
    }

    /**
     * Обработчик события изменения состояния плеера.
     *
     * @private
     * @param {Object} state - Состояние плеера.
     */
    function _handlePlayerStateChange(state) {
        _updatePlayPauseButton();
        _updateTimelineProgress();
    }

    /**
     * Обработчик mousedown на контейнере.
     * LMB: Play/Pause
     * MMB: Expand/Collapse
     * RMB: Context Menu
     *
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleContainerMouseDown(e) {
        if (e.button === 0) {
            // LMB: Play/Pause
            if (e.target === container || e.target.tagName === 'CANVAS') {
                _handlePlayPause();
            }
        } else if (e.button === 1) {
            // MMB: Expand/Collapse
            e.preventDefault();
            toggleExpand();
        } else if (e.button === 2) {
            // RMB: Context Menu
            e.preventDefault();
            _showContextMenu(e);
        }
    }

    /**
     * Обработчик dblclick на контейнере.
     * Double LMB: Fullscreen
     *
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _handleContainerDblClick(e) {
        if (e.button === 0) {
            toggleFullscreen();
        }
    }

    /**
     * Показывает контекстное меню.
     *
     * @private
     * @param {MouseEvent} e - Событие мыши.
     */
    function _showContextMenu(e) {
        const menu = document.createElement('div');
        menu.className = 'gp-ext-timelapse-context-menu';

        Object.assign(menu.style, {
            position: 'fixed',
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ffffff',
            padding: '8px 0',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: '10000',
            minWidth: '150px',
        });

        const options = [
            { label: 'Save as PNG', action: () => _handleSavePNG() },
            { label: 'Save as JSON', action: () => _handleSaveJSON() },
            { label: 'Open File', action: () => _handleOpenFile() },
        ];

        options.forEach(opt => {
            const item = document.createElement('div');
            item.textContent = opt.label;

            Object.assign(item.style, {
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
            });

            _addEventListener(item, 'mouseenter', () => {
                item.style.backgroundColor = '#4CAF50';
            });
            _addEventListener(item, 'mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            _addEventListener(item, 'click', () => {
                opt.action();
                menu.remove();
            });

            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Закрываем меню при клике вне его
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            _addEventListener(document, 'click', closeMenu);
        }, 0);
    }

    /**
     * Обработчик сохранения как PNG.
     *
     * @private
     */
    function _handleSavePNG() {
        const canvas = player.getCanvas();
        if (!canvas) {
            console.warn('[PlayerUI] No canvas available for PNG export');
            return;
        }

        io.saveSnapshot(canvas);
    }

    /**
     * Обработчик сохранения как JSON.
     *
     * @private
     */
    function _handleSaveJSON() {
        const session = player.getSession();
        if (!session) {
            console.warn('[PlayerUI] No session available for JSON export');
            return;
        }

        io.exportRecording(session);
    }

    /**
     * Обработчик открытия файла.
     *
     * @private
     */
    async function _handleOpenFile() {
        try {
            const file = await io.selectFile('application/json');
            const session = await io.importRecording(file);

            if (session && player) {
                player.loadSession(session);
                player.play();
                console.log('[PlayerUI] Loaded session from file');
            }
        } catch (error) {
            console.error('[PlayerUI] Failed to open file:', error);
        }
    }

    /**
     * Обработчик drag & drop файлов.
     *
     * @private
     * @param {DragEvent} e - Событие drag & drop.
     */
    function _handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }

    /**
     * Обработчик drop файлов.
     *
     * @private
     * @param {DragEvent} e - Событие drop.
     */
    async function _handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length === 0) {
            return;
        }

        const file = files[0];

        // Проверяем тип файла
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            console.warn('[PlayerUI] Invalid file type. Expected JSON file.');
            return;
        }

        try {
            const session = await io.importRecording(file);

            if (session && player) {
                player.loadSession(session);
                player.play();
                console.log('[PlayerUI] Loaded session from drag & drop');
            }
        } catch (error) {
            console.error('[PlayerUI] Failed to load file:', error);
        }
    }

    /**
     * Переключает режим расширенного просмотра.
     */
    function toggleExpand() {
        isExpanded = !isExpanded;

        if (container) {
            if (isExpanded) {
                Object.assign(container.style, {
                    width: '100vw',
                    height: '100vh',
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    zIndex: '9999',
                });
            } else {
                Object.assign(container.style, {
                    width: '',
                    height: '',
                    position: 'relative',
                    top: '',
                    left: '',
                    zIndex: '',
                });
            }
        }

        console.log(`[PlayerUI] ${isExpanded ? 'Expanded' : 'Collapsed'}`);
    }

    /**
     * Переключает полноэкранный режим.
     */
    function toggleFullscreen() {
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error('[PlayerUI] Failed to enter fullscreen:', err);
            });
            isFullscreen = true;
        } else {
            document.exitFullscreen();
            isFullscreen = false;
        }

        console.log(`[PlayerUI] ${isFullscreen ? 'Entered' : 'Exited'} fullscreen`);
    }

    /**
     * Монтирует UI в указанный родительский элемент.
     *
     * @param {HTMLElement} parent - Родительский элемент.
     * @returns {boolean} true если UI смонтирован успешно.
     */
    function mount(parent) {
        if (!parent) {
            console.error('[PlayerUI] No parent element provided');
            return false;
        }

        // Создаем контейнер
        container = _createContainer();

        // Добавляем canvas плеера
        const canvas = player.getCanvas();
        if (canvas) {
            container.appendChild(canvas);
        }

        // Добавляем панель управления
        if (uiConfig.showControls) {
            controlsBar = _createControlsBar();
            container.appendChild(controlsBar);
        }

        // Добавляем обработчики событий контейнера
        _addEventListener(container, 'mousedown', _handleContainerMouseDown);
        _addEventListener(container, 'dblclick', _handleContainerDblClick);

        // Добавляем обработчики drag & drop
        _addEventListener(container, 'dragover', _handleDragOver);
        _addEventListener(container, 'drop', _handleDrop);

        // Подписываемся на изменения состояния плеера
        player.setOnStateChange(_handlePlayerStateChange);

        // Добавляем контейнер в родительский элемент
        parent.appendChild(container);

        console.log('[PlayerUI] Mounted successfully');
        return true;
    }

    /**
     * Размонтирует UI.
     */
    function unmount() {
        if (container) {
            container.remove();
            container = null;
        }

        _removeAllEventListeners();

        console.log('[PlayerUI] Unmounted successfully');
    }

    /**
     * Получает контейнер UI.
     *
     * @returns {HTMLElement | null} Контейнер UI.
     */
    function getContainer() {
        return container;
    }

    /**
     * Инициализирует модуль UI.
     */
    function init() {
        io.init();
        console.log('[PlayerUI] Initialized successfully');
    }

    /**
     * Очищает ресурсы модуля UI.
     */
    function destroy() {
        console.log('[PlayerUI] Destroying...');

        unmount();

        // Уничтожаем модуль IO
        io.destroy();

        // Сбрасываем ссылки
        controlsBar = null;
        playPauseBtn = null;
        timeline = null;
        timelineProgress = null;
        speedSlider = null;
        speedIndicator = null;

        console.log('[PlayerUI] Destroyed successfully');
    }

    // Возвращаем публичный API модуля
    return {
        mount,
        unmount,
        getContainer,
        toggleExpand,
        toggleFullscreen,
        init,
        destroy
    };
}

// Экспорт для использования в других модулях
export default createPlayerUI;
