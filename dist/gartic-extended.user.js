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
// @downloadURL  https://prot1vn1kk.github.io/gartic-phone-extended/gartic-extended.user.js
// @updateURL    https://prot1vn1kk.github.io/gartic-phone-extended/gartic-extended.user.js
// ==/UserScript==

(() => {
  // src/Core/ModulesManager.js
  function createModulesManager() {
    const modules = /* @__PURE__ */ new Map();
    function register(moduleName, moduleObject) {
      if (!moduleObject || typeof moduleObject.init !== "function" || typeof moduleObject.destroy !== "function") {
        throw new Error(`Module "${moduleName}" must have init() and destroy() methods.`);
      }
      if (typeof moduleObject.isEnabled !== "boolean") {
        throw new Error(`Module "${moduleName}" must have an isEnabled property.`);
      }
      modules.set(moduleName, moduleObject);
    }
    function initAll() {
      modules.forEach((module, moduleName) => {
        if (!module.isEnabled) {
          console.log(`[ModulesManager] Module "${moduleName}" is disabled, skipping initialization.`);
          return;
        }
        try {
          console.log(`[ModulesManager] Initializing module: ${moduleName}`);
          module.init();
          console.log(`[ModulesManager] Module "${moduleName}" initialized successfully.`);
        } catch (error) {
          console.error(
            `[ModulesManager] Failed to initialize module "${moduleName}":`,
            error
          );
          module.isEnabled = false;
        }
      });
    }
    function destroyAll() {
      modules.forEach((module, moduleName) => {
        try {
          console.log(`[ModulesManager] Destroying module: ${moduleName}`);
          module.destroy();
          console.log(`[ModulesManager] Module "${moduleName}" destroyed successfully.`);
        } catch (error) {
          console.error(
            `[ModulesManager] Failed to destroy module "${moduleName}":`,
            error
          );
        }
      });
    }
    function getModule(moduleName) {
      return modules.get(moduleName);
    }
    function getModuleNames() {
      return Array.from(modules.keys());
    }
    function getModules() {
      return modules;
    }
    function enableModule(moduleName) {
      const module = modules.get(moduleName);
      if (!module) {
        console.error(`[ModulesManager] Module "${moduleName}" not found.`);
        return false;
      }
      if (!module.isEnabled) {
        module.isEnabled = true;
        try {
          module.init();
          console.log(`[ModulesManager] Module "${moduleName}" enabled and initialized.`);
        } catch (error) {
          console.error(`[ModulesManager] Failed to initialize module "${moduleName}":`, error);
          module.isEnabled = false;
          return false;
        }
      }
      return true;
    }
    function disableModule(moduleName) {
      const module = modules.get(moduleName);
      if (!module) {
        console.error(`[ModulesManager] Module "${moduleName}" not found.`);
        return false;
      }
      if (module.isEnabled) {
        module.isEnabled = false;
        try {
          module.destroy();
          console.log(`[ModulesManager] Module "${moduleName}" disabled and destroyed.`);
        } catch (error) {
          console.error(`[ModulesManager] Failed to destroy module "${moduleName}":`, error);
          return false;
        }
      }
      return true;
    }
    return {
      register,
      initAll,
      destroyAll,
      getModule,
      getModuleNames,
      getModules,
      enableModule,
      disableModule
    };
  }
  var modulesManager = createModulesManager();

  // src/main.js
  console.log("Gartic Phone Extended: Loading...");
  modulesManager.init();
})();
