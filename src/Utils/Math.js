/**
 * @fileoverview Математические утилиты для расчетов координат и ограничений значений.
 */

/**
 * Вычисляет евклидово расстояние между двумя точками.
 * @param {{x: number, y: number}} point1 - Первая точка с координатами x и y.
 * @param {{x: number, y: number}} point2 - Вторая точка с координатами x и y.
 * @returns {number} Евклидово расстояние между точками.
 * 
 * @example
 * const p1 = { x: 0, y: 0 };
 * const p2 = { x: 3, y: 4 };
 * calculateDistance(p1, p2); // Возвращает: 5
 */
export const calculateDistance = (point1, point2) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Ограничивает значение в заданном диапазоне.
 * @param {number} value - Значение для ограничения.
 * @param {number} min - Минимально допустимое значение.
 * @param {number} max - Максимально допустимое значение.
 * @returns {number} Значение, ограниченное диапазоном [min, max].
 * 
 * @example
 * clamp(150, 0, 100); // Возвращает: 100
 * clamp(-50, 0, 100); // Возвращает: 0
 * clamp(50, 0, 100);  // Возвращает: 50
 */
export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Переводит значение из одного диапазона в другой.
 * @param {number} value - Исходное значение.
 * @param {number} inMin - Нижняя граница исходного диапазона.
 * @param {number} inMax - Верхняя граница исходного диапазона.
 * @param {number} outMin - Нижняя граница целевого диапазона.
 * @param {number} outMax - Верхняя граница целевого диапазона.
 * @returns {number} Значение, отображенное в новый диапазон.
 * 
 * @example
 * mapRange(50, 0, 100, 0, 10);   // Возвращает: 5
 * mapRange(0, 0, 100, 0, 360);   // Возвращает: 0
 * mapRange(100, 0, 100, 0, 360); // Возвращает: 360
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};
