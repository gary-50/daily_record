/**
 * 工具函数模块
 */

/**
 * 防抖函数 - 延迟执行函数，只有在停止调用一定时间后才执行
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} - 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 时间转换为秒数
 * @param {string} timeStr - 时间字符串 (HH:MM 或 HH:MM:SS)
 * @returns {number} - 秒数
 */
export function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.trim() === '') return 0;
    
    timeStr = timeStr.trim();
    const parts = timeStr.split(':');
    
    if (parts.length === 2) {
        // HH:MM 格式
        const [hours, minutes] = parts.map(p => parseInt(p) || 0);
        return hours * 3600 + minutes * 60;
    } else if (parts.length === 3) {
        // HH:MM:SS 格式
        const [hours, minutes, seconds] = parts.map(p => parseInt(p) || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    return 0;
}

/**
 * 秒数转换为时间字符串
 * @param {number} totalSeconds - 总秒数
 * @returns {string} - 时间字符串 (HH:MM:SS)
 */
export function secondsToTime(totalSeconds) {
    if (!totalSeconds || totalSeconds === 0) return '-';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 计算配速
 * @param {number} durationSeconds - 时长（秒）
 * @param {number} distanceKm - 距离（公里）
 * @returns {string} - 配速字符串 (M'SS")
 */
export function calculatePace(durationSeconds, distanceKm) {
    if (!durationSeconds || !distanceKm || distanceKm === 0) return '-';
    const paceSeconds = durationSeconds / distanceKm;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceSecondsRemainder = Math.floor(paceSeconds % 60);
    return `${paceMinutes}'${String(paceSecondsRemainder).padStart(2, '0')}"`;
}

/**
 * 截断文本
 * @param {string} text - 文本
 * @param {number} limit - 长度限制
 * @returns {string} - 截断后的文本
 */
export function truncateText(text, limit) {
    if (!text) return '-';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
}

/**
 * HTML转义函数（防御性编程）
 * @param {string} text - 要转义的文本
 * @returns {string} - 转义后的文本
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 设置活动状态类
 * @param {string} selector - 选择器
 * @param {HTMLElement} activeElement - 要激活的元素
 */
export function setActiveClass(selector, activeElement) {
    document.querySelectorAll(selector).forEach(el => el.classList.remove('active'));
    if (activeElement) activeElement.classList.add('active');
}
