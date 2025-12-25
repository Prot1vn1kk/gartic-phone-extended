/**
 * Создает менеджер модулей для управления жизненным циклом расширения.
 * Использует паттерн Module Pattern с замыканием для инкапсуляции состояния.
 *
 * @returns {Object} Объект менеджера модулей с методами регистрации и управления.
 */
function createModulesManager() {
    /**
     * Приватное хранилище зарегистрированных модулей.
     * Ключ: имя модуля (string), Значение: объект модуля.
     * @type {Map<string, Object>}
     */
    const modules = new Map();

    /**
     * Регистрирует модуль в менеджере.
     *
     * @param {string} moduleName - Уникальное имя модуля.
     * @param {Object} moduleObject - Объект модуля с методами init() и destroy() и свойством isEnabled.
     * @throws {Error} Если модуль не имеет обязательных методов или свойств.
     */
    function register(moduleName, moduleObject) {
        if (!moduleObject || typeof moduleObject.init !== 'function' || typeof moduleObject.destroy !== 'function') {
            throw new Error(`Module "${moduleName}" must have init() and destroy() methods.`);
        }

        if (typeof moduleObject.isEnabled !== 'boolean') {
            throw new Error(`Module "${moduleName}" must have an isEnabled property.`);
        }

        modules.set(moduleName, moduleObject);
    }

    /**
     * Инициализирует все зарегистрированные модули.
     * Ошибки в одном модуле не прерывают инициализацию остальных.
     */
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
                // Отключаем модуль при ошибке инициализации
                module.isEnabled = false;
            }
        });
    }

    /**
     * Уничтожает все зарегистрированные модули.
     * Ошибки в одном модуле не прерывают уничтожение остальных.
     */
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

    /**
     * Получает инстанс модуля по имени.
     *
     * @param {string} moduleName - Имя модуля.
     * @returns {Object|undefined} Объект модуля или undefined, если модуль не найден.
     */
    function getModule(moduleName) {
        return modules.get(moduleName);
    }

    /**
     * Возвращает список всех зарегистрированных имен модулей.
     *
     * @returns {string[]} Массив имен модулей.
     */
    function getModuleNames() {
        return Array.from(modules.keys());
    }

    /**
     * Возвращает Map всех зарегистрированных модулей.
     *
     * @returns {Map<string, Object>} Map модулей.
     */
    function getModules() {
        return modules;
    }

    /**
     * Включает модуль по имени.
     *
     * @param {string} moduleName - Имя модуля для включения.
     * @returns {boolean} true если модуль успешно включен, false если модуль не найден.
     */
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

    /**
     * Отключает модуль по имени.
     *
     * @param {string} moduleName - Имя модуля для отключения.
     * @returns {boolean} true если модуль успешно отключен, false если модуль не найден.
     */
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

    // Возвращаем публичный API менеджера
    return {
        register,
        initAll,
        destroyAll,
        getModule,
        getModuleNames,
        getModules,
        enableModule,
        disableModule,
    };
}

/**
 * Синглтон-инстанс менеджера модулей для использования во всем приложении.
 * @type {Object}
 */
export const modulesManager = createModulesManager();
