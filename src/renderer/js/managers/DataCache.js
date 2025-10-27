/**
 * 数据缓存类 - 用于缓存计算结果，提升性能
 */
export class DataCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    /**
     * 生成缓存键
     * @param {string} prefix - 缓存前缀
     * @param {Object} params - 参数对象
     * @returns {string} - 缓存键
     */
    generateKey(prefix, params) {
        return `${prefix}_${JSON.stringify(params)}`;
    }

    /**
     * 获取缓存数据
     * @param {string} key - 缓存键
     * @returns {*} - 缓存的数据，如果不存在或已过期返回null
     */
    get(key) {
        if (this.cache.has(key)) {
            const item = this.cache.get(key);
            if (item.expiry > Date.now()) {
                return item.data;
            }
            this.cache.delete(key);
        }
        return null;
    }

    /**
     * 设置缓存数据
     * @param {string} key - 缓存键
     * @param {*} data - 要缓存的数据
     * @param {number} ttl - 过期时间（毫秒），默认5分钟
     */
    set(key, data, ttl = 300000) {
        // LRU淘汰策略：如果超过最大大小，删除最早的项
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    /**
     * 清除所有缓存
     */
    clear() {
        this.cache.clear();
        console.log('DataCache: 已清除所有缓存');
    }

    /**
     * 清除匹配模式的缓存
     * @param {string} pattern - 匹配模式（包含检查）
     */
    invalidate(pattern) {
        let deletedCount = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            console.log(`DataCache: 已清除 ${deletedCount} 个匹配 "${pattern}" 的缓存项`);
        }
    }

    /**
     * 获取缓存统计信息
     * @returns {Object} - 包含缓存大小和最大大小的对象
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }
}
