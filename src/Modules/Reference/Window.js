/**
 * @fileoverview Компонент плавающего окна для модуля Reference
 * @module Modules/Reference/Window
 */

/**
 * @typedef {Object} ReferenceWindowConfig
 * @property {string} [title='Reference'] - Заголовок окна
 * @property {number} [x=100] - Начальная позиция X
 * @property {number} [y=100] - Начальная позиция Y
 * @property {number} [width=400] - Начальная ширина
 * @property {number} [height=300] - Начальная высота
 * @property {boolean} [minimizable=true] - Можно ли сворачивать окно
 * @property {boolean} [resizable=true] - Можно ли изменять размер
 * @property {Function} [onClose] - Callback при закрытии
 * @property {Function} [onMinimize] - Callback при сворачивании
 * @property {Function} [onImageDrop] - Callback при сбросе изображения
 */

/**
 * @typedef {Object} ResizeHandle
 * @property {string} position - Позиция ручки (n, s, e, w, ne, nw, se, sw)
 * @property {string} cursor - CSS курсор для этой позиции
 * @property {Function} calculate - Функция для расчета новых размеров
 */

/**
 * Создает компонент плавающего окна для модуля Reference
 * @param {ReferenceWindowConfig} config - Конфигурация окна
 * @returns {Object} Объект с методами управления окном
 */
export function createReferenceWindow(config = {}) {
    // Конфигурация по умолчанию
    const DEFAULT_CONFIG = {
        title: 'Reference',
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        minimizable: true,
        resizable: true,
        onClose: null,
        onMinimize: null,
        onImageDrop: null
    };

    const settings = { ...DEFAULT_CONFIG, ...config };

    // Состояние
    let _isVisible = false;
    let _isMinimized = false;
    let _isDragging = false;
    let _isResizing = false;
    let _currentResizeHandle = null;

    // Позиции для перетаскивания и изменения размера
    let _dragOffset = { x: 0, y: 0 };
    let _startRect = { x: 0, y: 0, width: 0, height: 0 };
    let _startMouse = { x: 0, y: 0 };

    // DOM элементы
    let _elWindow = null;
    let _elHeader = null;
    let _elContent = null;
    let _elDropZone = null;
    let _elImageContainer = null;
    let _elMinimizeBtn = null;
    let _elCloseBtn = null;
    let _resizeHandles = {};

    /**
     * Создает DOM структуру окна
     * @private
     */
    function _createDOM() {
        // Основной контейнер окна
        _elWindow = document.createElement('div');
        _elWindow.className = 'gp-ext-reference-window';
        _elWindow.style.position = 'fixed';
        _elWindow.style.left = `${settings.x}px`;
        _elWindow.style.top = `${settings.y}px`;
        _elWindow.style.width = `${settings.width}px`;
        _elWindow.style.height = `${settings.height}px`;
        _elWindow.style.display = 'none';

        // Заголовок окна
        _elHeader = document.createElement('div');
        _elHeader.className = 'gp-ext-reference-header';

        // Заголовок текст
        const titleElement = document.createElement('h3');
        titleElement.className = 'gp-ext-reference-title';
        titleElement.textContent = settings.title;

        // Контролы окна
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'gp-ext-reference-controls';

        // Кнопка сворачивания
        if (settings.minimizable) {
            _elMinimizeBtn = document.createElement('button');
            _elMinimizeBtn.className = 'gp-ext-reference-btn';
            _elMinimizeBtn.textContent = '−';
            _elMinimizeBtn.title = 'Свернуть';
            _elMinimizeBtn.addEventListener('click', _handleMinimize);
            controlsDiv.appendChild(_elMinimizeBtn);
        }

        // Кнопка закрытия
        _elCloseBtn = document.createElement('button');
        _elCloseBtn.className = 'gp-ext-reference-btn';
        _elCloseBtn.textContent = '×';
        _elCloseBtn.title = 'Закрыть';
        _elCloseBtn.addEventListener('click', _handleClose);
        controlsDiv.appendChild(_elCloseBtn);

        _elHeader.appendChild(titleElement);
        _elHeader.appendChild(controlsDiv);

        // Содержимое окна
        _elContent = document.createElement('div');
        _elContent.className = 'gp-ext-reference-content';

        // Зона для Drag & Drop
        _elDropZone = document.createElement('div');
        _elDropZone.className = 'gp-ext-reference-dropzone';
        _elDropZone.style.cssText = `
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            color: #999;
            transition: all 0.2s ease;
            min-height: 150px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;
        _elDropZone.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 10px;">📁</div>
            <div>Перетащите изображение сюда</div>
            <div style="font-size: 12px; margin-top: 5px;">или кликните для загрузки</div>
        `;

        // Контейнер для отображения изображения
        _elImageContainer = document.createElement('div');
        _elImageContainer.className = 'gp-ext-reference-image-container';
        _elImageContainer.style.cssText = `
            display: none;
            width: 100%;
            height: 100%;
            overflow: auto;
        `;

        _elContent.appendChild(_elDropZone);
        _elContent.appendChild(_elImageContainer);

        // Сборка окна
        _elWindow.appendChild(_elHeader);
        _elWindow.appendChild(_elContent);

        // Создание ручек для изменения размера
        if (settings.resizable) {
            _createResizeHandles();
        }

        // Добавление событий
        _setupEventListeners();

        document.body.appendChild(_elWindow);
    }

    /**
     * Создает ручки для изменения размера окна
     * @private
     */
    function _createResizeHandles() {
        const handlePositions = [
            { position: 'n', cursor: 'n-resize', className: 'gp-ext-resize-handle-n' },
            { position: 's', cursor: 's-resize', className: 'gp-ext-resize-handle-s' },
            { position: 'e', cursor: 'e-resize', className: 'gp-ext-resize-handle-e' },
            { position: 'w', cursor: 'w-resize', className: 'gp-ext-resize-handle-w' },
            { position: 'ne', cursor: 'ne-resize', className: 'gp-ext-resize-handle-ne' },
            { position: 'nw', cursor: 'nw-resize', className: 'gp-ext-resize-handle-nw' },
            { position: 'se', cursor: 'se-resize', className: 'gp-ext-resize-handle-se' },
            { position: 'sw', cursor: 'sw-resize', className: 'gp-ext-resize-handle-sw' }
        ];

        handlePositions.forEach(({ position, cursor, className }) => {
            const handle = document.createElement('div');
            handle.className = `gp-ext-resize-handle ${className}`;
            handle.style.cssText = `
                position: absolute;
                background-color: transparent;
                z-index: 10;
            `;

            // Установка позиции и размера
            switch (position) {
                case 'n':
                    handle.style.top = '0';
                    handle.style.left = '10px';
                    handle.style.right = '10px';
                    handle.style.height = '5px';
                    break;
                case 's':
                    handle.style.bottom = '0';
                    handle.style.left = '10px';
                    handle.style.right = '10px';
                    handle.style.height = '5px';
                    break;
                case 'e':
                    handle.style.right = '0';
                    handle.style.top = '10px';
                    handle.style.bottom = '10px';
                    handle.style.width = '5px';
                    break;
                case 'w':
                    handle.style.left = '0';
                    handle.style.top = '10px';
                    handle.style.bottom = '10px';
                    handle.style.width = '5px';
                    break;
                case 'ne':
                    handle.style.top = '0';
                    handle.style.right = '0';
                    handle.style.width = '10px';
                    handle.style.height = '10px';
                    break;
                case 'nw':
                    handle.style.top = '0';
                    handle.style.left = '0';
                    handle.style.width = '10px';
                    handle.style.height = '10px';
                    break;
                case 'se':
                    handle.style.bottom = '0';
                    handle.style.right = '0';
                    handle.style.width = '10px';
                    handle.style.height = '10px';
                    break;
                case 'sw':
                    handle.style.bottom = '0';
                    handle.style.left = '0';
                    handle.style.width = '10px';
                    handle.style.height = '10px';
                    break;
            }

            handle.style.cursor = cursor;
            handle.dataset.resize = position;

            _elWindow.appendChild(handle);
            _resizeHandles[position] = handle;
        });
    }

    /**
     * Настраивает обработчики событий
     * @private
     */
    function _setupEventListeners() {
        // Перетаскивание окна за заголовок
        _elHeader.addEventListener('mousedown', _handleDragStart);

        // Drag & Drop для изображений
        _elDropZone.addEventListener('dragover', _handleDragOver);
        _elDropZone.addEventListener('dragleave', _handleDragLeave);
        _elDropZone.addEventListener('drop', _handleDrop);

        // Глобальные события для перетаскивания и изменения размера
        document.addEventListener('mousemove', _handleMouseMove);
        document.addEventListener('mouseup', _handleMouseUp);

        // Ручки изменения размера
        Object.values(_resizeHandles).forEach(handle => {
            handle.addEventListener('mousedown', _handleResizeStart);
        });

        // Двойной клик по заголовку для сворачивания/разворачивания
        if (settings.minimizable) {
            _elHeader.addEventListener('dblclick', _handleMinimize);
        }
    }

    /**
     * Обработчик начала перетаскивания окна
     * @param {MouseEvent} e - Событие мыши
     * @private
     */
    function _handleDragStart(e) {
        // Не перетаскивать, если клик по кнопкам
        if (e.target.tagName === 'BUTTON') return;

        _isDragging = true;
        _dragOffset.x = e.clientX - _elWindow.offsetLeft;
        _dragOffset.y = e.clientY - _elWindow.offsetTop;
        e.preventDefault();
    }

    /**
     * Обработчик начала изменения размера
     * @param {MouseEvent} e - Событие мыши
     * @private
     */
    function _handleResizeStart(e) {
        _isResizing = true;
        _currentResizeHandle = e.target.dataset.resize;
        _startMouse.x = e.clientX;
        _startMouse.y = e.clientY;
        _startRect.x = _elWindow.offsetLeft;
        _startRect.y = _elWindow.offsetTop;
        _startRect.width = _elWindow.offsetWidth;
        _startRect.height = _elWindow.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Обработчик движения мыши (перетаскивание и изменение размера)
     * @param {MouseEvent} e - Событие мыши
     * @private
     */
    function _handleMouseMove(e) {
        if (_isDragging) {
            const newX = e.clientX - _dragOffset.x;
            const newY = e.clientY - _dragOffset.y;

            // Ограничение позиции в пределах видимой области
            const maxX = window.innerWidth - _elWindow.offsetWidth;
            const maxY = window.innerHeight - _elWindow.offsetHeight;

            _elWindow.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            _elWindow.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        }

        if (_isResizing && _currentResizeHandle) {
            const deltaX = e.clientX - _startMouse.x;
            const deltaY = e.clientY - _startMouse.y;

            const minSize = 200;
            let newWidth = _startRect.width;
            let newHeight = _startRect.height;
            let newX = _startRect.x;
            let newY = _startRect.y;

            // Обработка в зависимости от направления изменения размера
            if (_currentResizeHandle.includes('e')) {
                newWidth = Math.max(minSize, _startRect.width + deltaX);
            }
            if (_currentResizeHandle.includes('w')) {
                newWidth = Math.max(minSize, _startRect.width - deltaX);
                if (newWidth > minSize) {
                    newX = _startRect.x + deltaX;
                }
            }
            if (_currentResizeHandle.includes('s')) {
                newHeight = Math.max(minSize, _startRect.height + deltaY);
            }
            if (_currentResizeHandle.includes('n')) {
                newHeight = Math.max(minSize, _startRect.height - deltaY);
                if (newHeight > minSize) {
                    newY = _startRect.y + deltaY;
                }
            }

            _elWindow.style.width = `${newWidth}px`;
            _elWindow.style.height = `${newHeight}px`;
            _elWindow.style.left = `${newX}px`;
            _elWindow.style.top = `${newY}px`;
        }
    }

    /**
     * Обработчик отпускания кнопки мыши
     * @private
     */
    function _handleMouseUp() {
        _isDragging = false;
        _isResizing = false;
        _currentResizeHandle = null;
    }

    /**
     * Обработчик события dragover
     * @param {DragEvent} e - Событие drag
     * @private
     */
    function _handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        _elDropZone.style.borderColor = '#4CAF50';
        _elDropZone.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        _elDropZone.style.color = '#4CAF50';
    }

    /**
     * Обработчик события dragleave
     * @param {DragEvent} e - Событие drag
     * @private
     */
    function _handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        _resetDropZoneStyle();
    }

    /**
     * Сбрасывает стиль зоны сброса
     * @private
     */
    function _resetDropZoneStyle() {
        _elDropZone.style.borderColor = '#ccc';
        _elDropZone.style.backgroundColor = 'transparent';
        _elDropZone.style.color = '#999';
    }

    /**
     * Обработчик события drop
     * @param {DragEvent} e - Событие drop
     * @private
     */
    function _handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        _resetDropZoneStyle();

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                _loadImage(file);
            }
        }
    }

    /**
     * Загружает и отображает изображение
     * @param {File} file - Файл изображения
     * @private
     */
    function _loadImage(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const dataUrl = e.target?.result;
            if (dataUrl) {
                _displayImage(dataUrl, file.name);

                // Вызов callback если есть
                if (typeof settings.onImageDrop === 'function') {
                    settings.onImageDrop(dataUrl, file);
                }
            }
        };

        reader.onerror = () => {
            console.error('Ошибка при чтении файла:', file.name);
            _showError('Не удалось загрузить изображение');
        };

        reader.readAsDataURL(file);
    }

    /**
     * Отображает изображение в контейнере
     * @param {string} dataUrl - Data URL изображения
     * @param {string} [name=''] - Имя файла
     * @private
     */
    function _displayImage(dataUrl, name = '') {
        // Очистка предыдущего изображения
        _elImageContainer.innerHTML = '';

        // Создание элемента изображения
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = name || 'Reference image';
        img.style.cssText = `
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 4px;
        `;

        // Кнопка очистки
        const clearBtn = document.createElement('button');
        clearBtn.className = 'gp-ext-reference-btn';
        clearBtn.textContent = 'Очистить';
        clearBtn.style.cssText = `
            margin-top: 10px;
            width: 100%;
        `;
        clearBtn.addEventListener('click', _clearImage);

        _elImageContainer.appendChild(img);
        _elImageContainer.appendChild(clearBtn);

        // Переключение отображения
        _elDropZone.style.display = 'none';
        _elImageContainer.style.display = 'block';
    }

    /**
     * Очищает изображение и показывает зону Drag & Drop
     * @private
     */
    function _clearImage() {
        _elImageContainer.innerHTML = '';
        _elImageContainer.style.display = 'none';
        _elDropZone.style.display = 'flex';
    }

    /**
     * Отображает ошибку
     * @param {string} message - Сообщение об ошибке
     * @private
     */
    function _showError(message) {
        _elDropZone.innerHTML = `
            <div style="color: #f44336; font-size: 32px; margin-bottom: 10px;">⚠️</div>
            <div style="color: #f44336;">${message}</div>
        `;

        setTimeout(() => {
            _resetDropZoneContent();
        }, 3000);
    }

    /**
     * Сбрасывает содержимое зоны Drag & Drop
     * @private
     */
    function _resetDropZoneContent() {
        _elDropZone.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 10px;">📁</div>
            <div>Перетащите изображение сюда</div>
            <div style="font-size: 12px; margin-top: 5px;">или кликните для загрузки</div>
        `;
    }

    /**
     * Обработчик закрытия окна
     * @private
     */
    function _handleClose() {
        hide();
        if (typeof settings.onClose === 'function') {
            settings.onClose();
        }
    }

    /**
     * Обработчик сворачивания окна
     * @private
     */
    function _handleMinimize() {
        if (_isMinimized) {
            expand();
        } else {
            minimize();
        }
        if (typeof settings.onMinimize === 'function') {
            settings.onMinimize(_isMinimized);
        }
    }

    /**
     * Создание DOM при инициализации
     */
    _createDOM();

    /**
     * Показывает окно
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function show() {
        _isVisible = true;
        _elWindow.style.display = 'flex';
        return windowApi;
    }

    /**
     * Скрывает окно
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function hide() {
        _isVisible = false;
        _elWindow.style.display = 'none';
        return windowApi;
    }

    /**
     * Сворачивает окно
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function minimize() {
        if (!settings.minimizable) return windowApi;
        _isMinimized = true;
        _elContent.style.display = 'none';
        if (_elMinimizeBtn) {
            _elMinimizeBtn.textContent = '+';
            _elMinimizeBtn.title = 'Развернуть';
        }
        return windowApi;
    }

    /**
     * Разворачивает окно
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function expand() {
        if (!settings.minimizable) return windowApi;
        _isMinimized = false;
        _elContent.style.display = 'block';
        if (_elMinimizeBtn) {
            _elMinimizeBtn.textContent = '−';
            _elMinimizeBtn.title = 'Свернуть';
        }
        return windowApi;
    }

    /**
     * Переключает состояние сворачивания
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function toggleMinimize() {
        if (_isMinimized) {
            expand();
        } else {
            minimize();
        }
        return windowApi;
    }

    /**
     * Возвращает DOM элемент окна
     * @returns {HTMLElement} Элемент окна
     */
    function getElement() {
        return _elWindow;
    }

    /**
     * Возвращает DOM элемент контента
     * @returns {HTMLElement} Элемент контента
     */
    function getContentElement() {
        return _elContent;
    }

    /**
     * Возвращает DOM элемент зоны Drag & Drop
     * @returns {HTMLElement} Элемент зоны Drag & Drop
     */
    function getDropZoneElement() {
        return _elDropZone;
    }

    /**
     * Возвращает DOM элемент контейнера изображения
     * @returns {HTMLElement} Элемент контейнера изображения
     */
    function getImageContainerElement() {
        return _elImageContainer;
    }

    /**
     * Устанавливает позицию окна
     * @param {number} x - Координата X
     * @param {number} y - Координата Y
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function setPosition(x, y) {
        _elWindow.style.left = `${x}px`;
        _elWindow.style.top = `${y}px`;
        return windowApi;
    }

    /**
     * Устанавливает размер окна
     * @param {number} width - Ширина
     * @param {number} height - Высота
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function setSize(width, height) {
        _elWindow.style.width = `${width}px`;
        _elWindow.style.height = `${height}px`;
        return windowApi;
    }

    /**
     * Возвращает текущую позицию окна
     * @returns {{x: number, y: number}} Координаты окна
     */
    function getPosition() {
        return {
            x: _elWindow.offsetLeft,
            y: _elWindow.offsetTop
        };
    }

    /**
     * Возвращает текущий размер окна
     * @returns {{width: number, height: number}} Размеры окна
     */
    function getSize() {
        return {
            width: _elWindow.offsetWidth,
            height: _elWindow.offsetHeight
        };
    }

    /**
     * Устанавливает заголовок окна
     * @param {string} title - Новый заголовок
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function setTitle(title) {
        const titleElement = _elHeader.querySelector('.gp-ext-reference-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
        return windowApi;
    }

    /**
     * Проверяет, видимо ли окно
     * @returns {boolean} true если окно видимо
     */
    function isVisible() {
        return _isVisible;
    }

    /**
     * Проверяет, свернуто ли окно
     * @returns {boolean} true если окно свернуто
     */
    function isMinimized() {
        return _isMinimized;
    }

    /**
     * Удаляет окно из DOM и очищает обработчики событий
     * @returns {void}
     */
    function destroy() {
        document.removeEventListener('mousemove', _handleMouseMove);
        document.removeEventListener('mouseup', _handleMouseUp);

        if (_elWindow && _elWindow.parentNode) {
            _elWindow.parentNode.removeChild(_elWindow);
        }
    }

    /**
     * Добавляет пользовательское содержимое в контейнер
     * @param {HTMLElement|string} content - DOM элемент или HTML строка
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function appendContent(content) {
        if (typeof content === 'string') {
            _elContent.insertAdjacentHTML('beforeend', content);
        } else if (content instanceof HTMLElement) {
            _elContent.appendChild(content);
        }
        return windowApi;
    }

    /**
     * Очищает содержимое контейнера (кроме зоны Drop и контейнера изображения)
     * @returns {Object} Ссылка на объект окна для цепочки вызовов
     */
    function clearContent() {
        const children = Array.from(_elContent.children);
        children.forEach(child => {
            if (child !== _elDropZone && child !== _elImageContainer) {
                _elContent.removeChild(child);
            }
        });
        return windowApi;
    }

    // Публичный API
    const windowApi = {
        show,
        hide,
        getElement,
        getContentElement,
        getDropZoneElement,
        getImageContainerElement,
        setPosition,
        setSize,
        getPosition,
        getSize,
        setTitle,
        isVisible,
        isMinimized,
        minimize,
        expand,
        toggleMinimize,
        destroy,
        appendContent,
        clearContent
    };

    return windowApi;
}
