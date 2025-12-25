/**
 * Утилиты для работы с DOM
 */

/**
 * Ожидает появления элемента в DOM
 * @param {string} selector - CSS селектор искомого элемента
 * @returns {Promise<Element>} Promise, который разрешается с найденным элементом
 * 
 * @example
 * // Ожидание появления канваса
 * const canvas = await waitForElement('canvas');
 */
export const waitForElement = (selector) => {
    return new Promise((resolve) => {
        // Сначала проверяем, существует ли элемент уже
        const existingElement = document.querySelector(selector);
        if (existingElement) {
            resolve(existingElement);
            return;
        }

        // Создаем MutationObserver для отслеживания изменений в DOM
        const observer = new MutationObserver((mutations) => {
            // Проверяем наличие элемента после каждой мутации
            const element = document.querySelector(selector);
            if (element) {
                // Элемент найден - отключаем observer и разрешаем Promise
                observer.disconnect();
                resolve(element);
            }
        });

        // Начинаем наблюдение за document.body и его поддеревом
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
};
