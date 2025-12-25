// ==UserScript==
// @name         Gartic Phone Extended
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Modules: Painter, Timelapse, Reference for Gartic Phone
// @author       VibeCoder
// @match        https://garticphone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=garticphone.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

import { modulesManager } from './Core/ModulesManager.js';
import createPainterModule from './Modules/Painter/index.js';
import createTimelapseModule from './Modules/Timelapse/index.js';
import { injectStyles, GLOBAL_STYLES } from './Utils/Styles.js';
import { renderSettingsButton, renderSettingsModal } from './UI/Settings.js';

(function () {
    'use strict';

    async function main() {
        console.log('🚀 Gartic Phone Extended Loaded');

        // Инъекция глобальных стилей
        injectStyles(GLOBAL_STYLES);

        // Создание и регистрация модуля Painter
        const painterModule = createPainterModule();
        modulesManager.register('Painter', painterModule);

        // Создание и регистрация модуля Timelapse
        const timelapseModule = createTimelapseModule();
        modulesManager.register('Timelapse', timelapseModule);

        // Рендеринг UI настроек
        renderSettingsButton();
        renderSettingsModal();

        // Инициализация всех включенных модулей
        await modulesManager.initAll();
    }

    main();
})();
