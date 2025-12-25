/**
 * @fileoverview Модуль поиска изображений для Reference.
 * Реализует скрейпинг Google Images и Pinterest через GM_xmlhttpRequest.
 */

/**
 * Промисифицированная обертка для GM_xmlhttpRequest.
 * @param {GMXMLHttpRequestOptions} options - Опции запроса.
 * @returns {Promise<{responseText: string, status: number}>} Промис с ответом.
 * @private
 */
const _gmRequest = (options) => {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            ...options,
            onload: (response) => {
                resolve({
                    responseText: response.responseText,
                    status: response.status
                });
            },
            onerror: (error) => {
                reject(new Error(`GM_xmlhttpRequest failed: ${error}`));
            },
            ontimeout: () => {
                reject(new Error('GM_xmlhttpRequest timeout'));
            }
        });
    });
};

/**
 * Извлекает URL-адреса изображений из HTML Google Images.
 * @param {string} html - HTML-страница Google Images.
 * @returns {string[]} Массив URL-адресов изображений.
 * @private
 */
const _parseGoogleImages = (html) => {
    const urls = [];

    try {
        // Создаем временный контейнер для парсинга
        const div = document.createElement('div');
        div.innerHTML = html;

        // Google Images хранит данные в JSON внутри скриптов и атрибутах
        // Ищем элементы с изображениями
        const images = div.querySelectorAll('img[src*="http"]');

        // Фильтруем только превью-изображения (обычно содержат gstatic.com)
        for (const img of images) {
            const src = img.src;

            // Пропускаем иконки и маленькие элементы интерфейса
            if (src.includes('logo') || src.includes('icon') || src.includes('favicon')) {
                continue;
            }

            // Google использует превью с gstatic.com, нам нужно получить оригинальный URL
            // Превью обычно имеют параметры вроде w=, h=, но мы можем использовать их
            if (src.includes('gstatic.com') && src.includes('encrypted-tbn')) {
                // Это превью Google, добавляем в список
                // В будущем можно попробовать получить оригинальный URL через data-атрибуты
                if (!urls.includes(src)) {
                    urls.push(src);
                }
            }
        }

        // Также ищем данные в JSON-скриптах (Google хранит там метаданные)
        const scripts = div.querySelectorAll('script');
        for (const script of scripts) {
            const text = script.textContent;

            // Ищем паттерны URL изображений в JSON
            const urlMatches = text.match(/"https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)"/gi);
            if (urlMatches) {
                for (const match of urlMatches) {
                    const url = match.replace(/"/g, '');
                    if (!urls.includes(url) && !url.includes('gstatic.com')) {
                        urls.push(url);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[Reference Search] Error parsing Google Images:', error);
    }

    return urls;
};

/**
 * Извлекает URL-адреса изображений из HTML Pinterest.
 * @param {string} html - HTML-страница Pinterest.
 * @returns {string[]} Массив URL-адресов изображений.
 * @private
 */
const _parsePinterestImages = (html) => {
    const urls = [];

    try {
        // Создаем временный контейнер для парсинга
        const div = document.createElement('div');
        div.innerHTML = html;

        // Pinterest хранит URL изображений в атрибутах srcset и data-src
        const images = div.querySelectorAll('img[srcset], img[data-src], img[src]');

        for (const img of images) {
            let src = null;

            // Приоритет: data-src > srcset > src
            if (img.dataset.src) {
                src = img.dataset.src;
            } else if (img.srcset) {
                // Берем первое изображение из srcset (обычно самое качественное)
                const srcsetParts = img.srcset.split(',');
                if (srcsetParts.length > 0) {
                    src = srcsetParts[0].trim().split(' ')[0];
                }
            } else if (img.src) {
                src = img.src;
            }

            if (src && src.startsWith('http')) {
                // Пропускаем иконки и аватары
                if (src.includes('75x75') || src.includes('32x32') || src.includes('logo')) {
                    continue;
                }

                // Заменяем параметры размера на оригинал (Pinterest использует 236x, 474x и т.д.)
                const originalSrc = src
                    .replace(/236x\//, 'originals/')
                    .replace(/474x\//, 'originals/')
                    .replace(/564x\//, 'originals/');

                if (!urls.includes(originalSrc)) {
                    urls.push(originalSrc);
                }
            }
        }

        // Pinterest также хранит данные в JSON-скриптах (Pins data)
        const scripts = div.querySelectorAll('script[type="application/json"], script');
        for (const script of scripts) {
            try {
                const text = script.textContent;

                // Ищем URL изображений в JSON
                const urlMatches = text.match(/"https?:\/\/i\.pinimg\.com[^"]+\.(?:jpg|jpeg|png|webp)"/gi);
                if (urlMatches) {
                    for (const match of urlMatches) {
                        const url = match.replace(/"/g, '');

                        // Заменяем на оригинальные изображения
                        const originalUrl = url
                            .replace(/236x\//, 'originals/')
                            .replace(/474x\//, 'originals/')
                            .replace(/564x\//, 'originals/');

                        if (!urls.includes(originalUrl)) {
                            urls.push(originalUrl);
                        }
                    }
                }
            } catch (e) {
                // Игнорируем ошибки парсинга JSON
            }
        }
    } catch (error) {
        console.error('[Reference Search] Error parsing Pinterest images:', error);
    }

    return urls;
};

/**
 * Выполняет поиск изображений в указанном источнике.
 * Использует GM_xmlhttpRequest для обхода CORS и скрейпит результаты.
 * 
 * @param {string} query - Поисковый запрос пользователя.
 * @param {'google'|'pinterest'} source - Источник поиска ('google' или 'pinterest').
 * @returns {Promise<string[]>} Промис, который разрешается массивом URL-адресов изображений.
 * 
 * @example
 * // Поиск в Google Images
 * const googleImages = await searchImages('cat drawing', 'google');
 * console.log(googleImages); // ['https://...', 'https://...', ...]
 * 
 * @example
 * // Поиск в Pinterest
 * const pinterestImages = await searchImages('landscape', 'pinterest');
 * console.log(pinterestImages); // ['https://i.pinimg.com/...', ...]
 */
export const searchImages = async (query, source = 'google') => {
    if (!query || typeof query !== 'string') {
        console.warn('[Reference Search] Invalid query provided');
        return [];
    }

    const encodedQuery = encodeURIComponent(query);
    let url = '';

    // Определяем URL на основе источника
    switch (source.toLowerCase()) {
        case 'pinterest':
            url = `https://www.pinterest.com/search/pins/?q=${encodedQuery}`;
            break;
        case 'google':
        default:
            url = `https://www.google.com/search?tbm=isch&q=${encodedQuery}`;
            break;
    }

    try {
        // Выполняем запрос через GM_xmlhttpRequest
        const response = await _gmRequest({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': navigator.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 15000 // 15 секунд таймаут
        });

        if (response.status !== 200) {
            console.error(`[Reference Search] Request failed with status ${response.status}`);
            return [];
        }

        // Парсим HTML и извлекаем URL изображений
        let urls = [];

        if (source.toLowerCase() === 'pinterest') {
            urls = _parsePinterestImages(response.responseText);
        } else {
            urls = _parseGoogleImages(response.responseText);
        }

        // Ограничиваем количество результатов (например, 50 изображений)
        return urls.slice(0, 50);

    } catch (error) {
        console.error('[Reference Search] Error during image search:', error);
        return [];
    }
};
