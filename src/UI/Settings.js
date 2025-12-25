/**
 * UI Settings module for Gartic Phone Extension
 * Содержит компоненты UI для управления настройками расширения
 */

import { waitForElement } from '../Utils/DOM.js';
import { modulesManager } from '../Core/ModulesManager.js';

/**
 * SVG иконка шестеренки для кнопки настроек
 * @type {string}
 */
const GEAR_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"></circle>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
</svg>
`;

/**
 * Ссылка на элемент модального окна настроек
 * @type {HTMLElement|null}
 */
let elSettingsModal = null;

/**
 * Ссылка на элемент кнопки настроек
 * @type {HTMLElement|null}
 */
let elSettingsButton = null;

/**
 * Создает кнопку настроек и добавляет её на панель Gartic Phone
 * 
 * @returns {Promise<void>} Promise, который разрешается после добавления кнопки
 * 
 * @example
 * await renderSettingsButton();
 */
export async function renderSettingsButton() {
    // Ждем появления верхней панели Gartic Phone
    // Используем несколько возможных селекторов для надежности
    const headerSelectors = [
        '.styles_header.styles_inGame',
        '.styles_header',
        'header[class*="header"]'
    ];

    let headerElement = null;
    for (const selector of headerSelectors) {
        try {
            headerElement = await waitForElement(selector);
            if (headerElement) break;
        } catch (error) {
            // Продолжаем поиск с другим селектором
            continue;
        }
    }

    if (!headerElement) {
        console.error('[Settings] Failed to find header element');
        return;
    }

    // Создаем кнопку настроек
    elSettingsButton = document.createElement('div');
    elSettingsButton.className = 'gp-ext-settings-button';
    elSettingsButton.innerHTML = GEAR_ICON_SVG;
    elSettingsButton.style.cssText = `
        cursor: pointer;
        margin-left: 16px;
        opacity: 0.7;
        transition: opacity 0.2s ease, transform 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
    `;

    // Добавляем hover эффекты
    elSettingsButton.addEventListener('mouseenter', () => {
        elSettingsButton.style.opacity = '1';
        elSettingsButton.style.transform = 'rotate(90deg)';
    });

    elSettingsButton.addEventListener('mouseleave', () => {
        elSettingsButton.style.opacity = '0.7';
        elSettingsButton.style.transform = 'rotate(0deg)';
    });

    // Обработчик клика для открытия модального окна
    elSettingsButton.addEventListener('click', () => {
        showSettingsModal();
    });

    // Добавляем кнопку в панель
    headerElement.appendChild(elSettingsButton);

    console.log('[Settings] Settings button added to header');
}

/**
 * Создает и возвращает модальное окно настроек
 * 
 * @returns {HTMLElement} Элемент модального окна
 */
function createSettingsModal() {
    // Создаем контейнер модального окна
    const modal = document.createElement('div');
    modal.className = 'gp-ext-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    // Создаем содержимое модального окна
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #2d2d2d;
        border-radius: 12px;
        padding: 24px;
        min-width: 320px;
        max-width: 480px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        color: #fff;
    `;

    // Заголовок
    const header = document.createElement('h2');
    header.textContent = 'Gartic Phone Extension';
    header.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 20px;
        font-weight: 600;
        text-align: center;
        color: #fff;
        border-bottom: 1px solid #444;
        padding-bottom: 16px;
    `;

    // Подзаголовок для списка модулей
    const modulesHeader = document.createElement('h3');
    modulesHeader.textContent = 'Модули';
    modulesHeader.style.cssText = `
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 500;
        color: #ccc;
    `;

    // Подзаголовок для настроек Timelapse
    const timelapseHeader = document.createElement('h3');
    timelapseHeader.textContent = 'Timelapse';
    timelapseHeader.style.cssText = `
        margin: 24px 0 12px 0;
        font-size: 16px;
        font-weight: 500;
        color: #ccc;
    `;

    // Создаем список модулей
    const modulesList = document.createElement('div');
    modulesList.className = 'gp-ext-modules-list';
    modulesList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
    `;

    // Получаем список модулей из ModulesManager
    const modules = modulesManager.getModules();

    if (modules.size === 0) {
        const noModulesMsg = document.createElement('p');
        noModulesMsg.textContent = 'Нет зарегистрированных модулей';
        noModulesMsg.style.cssText = `
            text-align: center;
            color: #888;
            font-style: italic;
        `;
        modulesList.appendChild(noModulesMsg);
    } else {
        modules.forEach((module, moduleName) => {
            const moduleItem = document.createElement('div');
            moduleItem.className = 'gp-ext-module-item';
            moduleItem.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background-color: #383838;
                border-radius: 8px;
                transition: background-color 0.2s ease;
            `;

            // Hover эффект для элемента модуля
            moduleItem.addEventListener('mouseenter', () => {
                moduleItem.style.backgroundColor = '#444';
            });
            moduleItem.addEventListener('mouseleave', () => {
                moduleItem.style.backgroundColor = '#383838';
            });

            // Название модуля
            const moduleNameLabel = document.createElement('label');
            moduleNameLabel.textContent = moduleName;
            moduleNameLabel.style.cssText = `
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                flex: 1;
            `;

            // Чекбокс для переключения модуля
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = module.isEnabled;
            checkbox.style.cssText = `
                width: 18px;
                height: 18px;
                cursor: pointer;
                accent-color: #6366f1;
            `;

            // Обработчик изменения состояния чекбокса
            checkbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                    modulesManager.enableModule(moduleName);
                    console.log(`[Settings] Module "${moduleName}" enabled`);
                } else {
                    modulesManager.disableModule(moduleName);
                    console.log(`[Settings] Module "${moduleName}" disabled`);
                }
            });

            // Клик по названию модуля переключает чекбокс
            moduleNameLabel.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            });

            moduleItem.appendChild(moduleNameLabel);
            moduleItem.appendChild(checkbox);
            modulesList.appendChild(moduleItem);
        });
    }

    // Создаем секцию настроек Timelapse
    const timelapseSettings = document.createElement('div');
    timelapseSettings.className = 'gp-ext-timelapse-settings';
    timelapseSettings.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
    `;

    // Debug Mode toggle
    const debugModeItem = document.createElement('div');
    debugModeItem.className = 'gp-ext-setting-item';
    debugModeItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background-color: #383838;
        border-radius: 8px;
    `;

    const debugModeLabel = document.createElement('label');
    debugModeLabel.textContent = 'Debug Mode';
    debugModeLabel.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        flex: 1;
    `;

    const debugModeCheckbox = document.createElement('input');
    debugModeCheckbox.type = 'checkbox';
    debugModeCheckbox.checked = localStorage.getItem('gp-ext-timelapse-debug') === 'true';
    debugModeCheckbox.style.cssText = `
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #6366f1;
    `;

    // Обработчик изменения Debug Mode
    debugModeCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        localStorage.setItem('gp-ext-timelapse-debug', isChecked.toString());

        // Уведомляем Recorder о смене режима
        const timelapseModule = modulesManager.getModule('Timelapse');
        if (timelapseModule && timelapseModule.recorder) {
            timelapseModule.recorder.setDebugMode(isChecked);
        }

        console.log(`[Settings] Debug Mode ${isChecked ? 'enabled' : 'disabled'}`);
    });

    debugModeItem.appendChild(debugModeLabel);
    debugModeItem.appendChild(debugModeCheckbox);
    timelapseSettings.appendChild(debugModeItem);

    // Кнопка закрытия
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Закрыть';
    closeButton.style.cssText = `
        width: 100%;
        padding: 12px;
        background-color: #6366f1;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.1s ease;
    `;

    // Hover эффект для кнопки закрытия
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = '#4f46e5';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = '#6366f1';
    });

    // Активный эффект для кнопки закрытия
    closeButton.addEventListener('mousedown', () => {
        closeButton.style.transform = 'scale(0.98)';
    });
    closeButton.addEventListener('mouseup', () => {
        closeButton.style.transform = 'scale(1)';
    });

    // Обработчик клика для закрытия модального окна
    closeButton.addEventListener('click', () => {
        hideSettingsModal();
    });

    // Закрытие по клику на затемненный фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideSettingsModal();
        }
    });

    // Закрытие по клавише Escape
    document.addEventListener('keydown', handleEscapeKey);

    // Собираем модальное окно
    modalContent.appendChild(header);
    modalContent.appendChild(modulesHeader);
    modalContent.appendChild(modulesList);
    modalContent.appendChild(timelapseHeader);
    modalContent.appendChild(timelapseSettings);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);

    return modal;
}

/**
 * Обработчик нажатия клавиши Escape для закрытия модального окна
 * 
 * @param {KeyboardEvent} e - Событие клавиатуры
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape' && elSettingsModal && elSettingsModal.style.display === 'flex') {
        hideSettingsModal();
    }
}

/**
 * Показывает модальное окно настроек
 */
function showSettingsModal() {
    if (!elSettingsModal) {
        elSettingsModal = createSettingsModal();
        document.body.appendChild(elSettingsModal);
    }

    elSettingsModal.style.display = 'flex';
    console.log('[Settings] Settings modal shown');
}

/**
 * Скрывает модальное окно настроек
 */
function hideSettingsModal() {
    if (elSettingsModal) {
        elSettingsModal.style.display = 'none';
        console.log('[Settings] Settings modal hidden');
    }
}

/**
 * Рендерит модальное окно настроек и добавляет его в DOM
 * 
 * @returns {HTMLElement} Элемент модального окна
 * 
 * @example
 * const modal = renderSettingsModal();
 */
export function renderSettingsModal() {
    if (!elSettingsModal) {
        elSettingsModal = createSettingsModal();
        document.body.appendChild(elSettingsModal);
    }
    return elSettingsModal;
}

/**
 * Удаляет кнопку и модальное окно настроек из DOM
 * Используется при уничтожении модуля
 */
export function destroySettings() {
    // Удаляем кнопку
    if (elSettingsButton && elSettingsButton.parentNode) {
        elSettingsButton.parentNode.removeChild(elSettingsButton);
        elSettingsButton = null;
    }

    // Удаляем модальное окно
    if (elSettingsModal && elSettingsModal.parentNode) {
        elSettingsModal.parentNode.removeChild(elSettingsModal);
        elSettingsModal = null;
    }

    // Удаляем обработчик Escape
    document.removeEventListener('keydown', handleEscapeKey);

    console.log('[Settings] Settings UI destroyed');
}
