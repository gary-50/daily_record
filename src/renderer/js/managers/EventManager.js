/**
 * 事件管理器类 - 统一管理事件监听器，防止内存泄漏
 */
export class EventManager {
    constructor() {
        this.listeners = new Map();
        this.listenerCounter = 0;
    }

    /**
     * 添加事件监听器
     * @param {HTMLElement} element - DOM元素
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 可选参数
     * @returns {string} - 监听器的唯一ID
     */
    add(element, event, handler, options = {}) {
        if (!element) {
            console.warn('EventManager: 尝试为null元素添加监听器');
            return null;
        }

        element.addEventListener(event, handler, options);

        // 生成唯一键
        const key = `listener_${this.listenerCounter++}`;
        this.listeners.set(key, { element, event, handler, options });

        return key;
    }

    /**
     * 移除指定的事件监听器
     * @param {string} key - 监听器的唯一ID
     */
    remove(key) {
        const listener = this.listeners.get(key);
        if (listener) {
            const { element, event, handler, options } = listener;
            element.removeEventListener(event, handler, options);
            this.listeners.delete(key);
        }
    }

    /**
     * 清理所有事件监听器
     */
    removeAll() {
        this.listeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.listeners.clear();
        console.log('EventManager: 已清理所有事件监听器');
    }

    /**
     * 获取当前监听器数量
     * @returns {number}
     */
    getListenerCount() {
        return this.listeners.size;
    }
}
