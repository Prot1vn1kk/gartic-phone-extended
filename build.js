#!/usr/bin/env node

/**
 * Build Script for Gartic Phone Extended UserScript
 * 
 * Использует esbuild для бандлинга всех модулей в один файл,
 * сохраняя при этом метаданные UserScript.
 */

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Получаем путь к текущему файлу (для ES модулей)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Извлекает блок метаданных UserScript из файла
 * @param {string} filePath - Путь к файлу с метаданными
 * @returns {string} Блок метаданных с новой строкой в конце
 */
function extractUserScriptMetadata(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Ищем начало и конец блока UserScript
    const startMarker = '// ==UserScript==';
    const endMarker = '// ==/UserScript==';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker, startIndex);

    if (startIndex === -1 || endIndex === -1) {
        throw new Error(`UserScript metadata block not found in ${filePath}`);
    }

    // Извлекаем блок включая оба маркера
    const metadataBlock = content.substring(startIndex, endIndex + endMarker.length);

    // Добавляем пустую строку после метаданных для разделения с кодом
    return metadataBlock + '\n';
}

/**
 * Создает обновленный блок метаданных UserScript с URL для обновлений
 * @param {string} originalBanner - Исходный блок метаданных
 * @returns {string} Обновленный блок метаданных с @downloadURL и @updateURL
 */
function createUpdatedBanner(originalBanner) {
    // URL основного файла на GitHub Pages
    const downloadURL = 'https://prot1vn1kk.github.io/gartic-phone-extended/gartic-extended.user.js';

    // Добавляем @downloadURL и @updateURL перед закрывающим маркером
    const endMarker = '// ==/UserScript==';
    const updatedBanner = originalBanner.replace(
        endMarker,
        `// @downloadURL  ${downloadURL}\n// @updateURL    ${downloadURL}\n${endMarker}`
    );

    return updatedBanner;
}

/**
 * Создает meta-файл для Tampermonkey (загрузчик)
 * @returns {string} Содержимое meta-файла
 */
function createMetaFileContent() {
    const downloadURL = 'https://prot1vn1kk.github.io/gartic-phone-extended/gartic-extended.user.js';

    return `// ==UserScript==
// @name         Gartic Phone Extended (Loader)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Installs the main Gartic Phone Extended script and keeps it updated.
// @author       VibeCoder
// @match        https://garticphone.com/*
// @downloadURL  ${downloadURL}
// @updateURL    ${downloadURL}
// @grant        none
// ==/UserScript==
`;
}

/**
 * Основная функция сборки
 */
async function build() {
    console.log('🔨 Starting build process...');

    try {
        // Путь к исходному файлу с метаданными
        const mainFilePath = path.join(__dirname, 'src', 'main.js');

        // Пути к выходным файлам
        const outFilePath = path.join(__dirname, 'dist', 'gartic-extended.user.js');
        const metaFilePath = path.join(__dirname, 'dist', 'gartic-extended.meta.js');

        // Убеждаемся, что директория dist существует
        const distDir = path.join(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
            console.log('📁 Created dist directory');
        }

        // Извлекаем метаданные UserScript
        console.log('📝 Extracting UserScript metadata...');
        const userScriptBanner = extractUserScriptMetadata(mainFilePath);

        // Создаем обновленный баннер с URL для обновлений
        const updatedBanner = createUpdatedBanner(userScriptBanner);
        console.log('✅ Metadata extracted and updated successfully');

        // Создаем meta-файл для Tampermonkey
        console.log('📝 Creating meta loader file...');
        const metaFileContent = createMetaFileContent();
        fs.writeFileSync(metaFilePath, metaFileContent, 'utf-8');
        console.log('✅ Meta loader file created');

        // Выполняем сборку с esbuild
        console.log('⚙️  Bundling modules with esbuild...');
        const result = await esbuild.build({
            entryPoints: ['src/main.js'],
            outfile: outFilePath,
            bundle: true,
            format: 'iife', // Immediately Invoked Function Expression для браузера
            target: 'es2020', // Современные браузеры поддерживают ES2020
            minify: false, // Не минифицируем для удобства чтения (можно включить при необходимости)
            sourcemap: false, // Source maps опционально
            banner: {
                js: updatedBanner
            },
            logLevel: 'info'
        });

        // Проверяем, были ли ошибки
        if (result.errors.length > 0) {
            console.error('❌ Build completed with errors:');
            result.errors.forEach(err => console.error(err));
            process.exit(1);
        }

        // Проверяем предупреждения
        if (result.warnings.length > 0) {
            console.warn('⚠️  Build completed with warnings:');
            result.warnings.forEach(warn => console.warn(warn));
        }

        // Получаем размеры выходных файлов
        const mainStats = fs.statSync(outFilePath);
        const mainSizeKB = (mainStats.size / 1024).toFixed(2);

        const metaStats = fs.statSync(metaFilePath);
        const metaSizeKB = (metaStats.size / 1024).toFixed(2);

        console.log('✅ Build completed successfully!');
        console.log(`📦 Main bundle: ${outFilePath} (${mainSizeKB} KB)`);
        console.log(`📦 Meta loader: ${metaFilePath} (${metaSizeKB} KB)`);
        console.log('');
        console.log('📝 Install using meta loader for automatic updates:');
        console.log(`   ${metaFilePath}`);

    } catch (error) {
        console.error('❌ Build failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Запускаем сборку
build();
