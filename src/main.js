// ==UserScript==
// @name         Gartic Phone Extended
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Advanced tools for Gartic Phone (Painter, Timelapse, Reference)
// @author       VibeCoder
// @match        https://garticphone.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=garticphone.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/prot1vn1kk/gartic-phone-extended/main/dist/gartic-extended.user.js
// @updateURL    https://raw.githubusercontent.com/prot1vn1kk/gartic-phone-extended/main/dist/gartic-extended.user.js
// ==/UserScript==

import { modulesManager } from './Core/ModulesManager';

// Инициализация
console.log('Gartic Phone Extended: Loading...');
modulesManager.init();
