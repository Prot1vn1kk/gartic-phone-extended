/**
 * React Fiber Utility Module
 * Provides utilities for accessing and traversing React's internal Fiber tree.
 * Essential for reverse-engineering Gartic Phone's React state.
 */

/**
 * Retrieves the React Fiber instance from a DOM element.
 * 
 * @param {HTMLElement} domElement - The DOM element to extract Fiber instance from.
 * @returns {Object|null} The React Fiber instance or null if not found.
 * 
 * @example
 * const canvas = document.querySelector('canvas');
 * const fiber = getReactInstance(canvas);
 * if (fiber) {
 *   console.log('Found Fiber node:', fiber);
 * }
 */
export function getReactInstance(domElement) {
    if (!domElement || typeof domElement !== 'object') {
        return null;
    }

    // React stores Fiber instances using hashed keys that vary by version
    // Common patterns: __reactFiber$, __reactInternalInstance$, __reactFiber
    const fiberKeys = Object.keys(domElement).filter(key =>
        key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
    );

    if (fiberKeys.length === 0) {
        return null;
    }

    // Return the first found Fiber instance
    return domElement[fiberKeys[0]] || null;
}

/**
 * Recursively searches the React Fiber tree for a component matching the predicate.
 * 
 * @param {Object|null} fiber - The starting Fiber node.
 * @param {Function} predicate - Function to test each Fiber node. Receives Fiber node, returns boolean.
 * @returns {Object|null} The Fiber node matching the predicate, or null if not found.
 * 
 * @example
 * const canvas = document.querySelector('canvas');
 * const rootFiber = getReactInstance(canvas);
 * 
 * // Find component that has state with brushSize
 * const painterComponent = findComponent(rootFiber, (fiber) => {
 *   return fiber.memoizedState?.brushSize !== undefined;
 * });
 * 
 * @example
 * // Find component by type name
 * const canvasComponent = findComponent(rootFiber, (fiber) => {
 *   return fiber.type?.name === 'CanvasPainter';
 * });
 */
export function findComponent(fiber, predicate) {
    if (!fiber || typeof predicate !== 'function') {
        return null;
    }

    // Check current node
    if (predicate(fiber)) {
        return fiber;
    }

    // Search child nodes (depth-first)
    if (fiber.child) {
        const result = findComponent(fiber.child, predicate);
        if (result) {
            return result;
        }
    }

    // Search sibling nodes
    if (fiber.sibling) {
        const result = findComponent(fiber.sibling, predicate);
        if (result) {
            return result;
        }
    }

    // Search parent nodes (upward traversal)
    if (fiber.return) {
        const result = findComponent(fiber.return, predicate);
        if (result) {
            return result;
        }
    }

    return null;
}
