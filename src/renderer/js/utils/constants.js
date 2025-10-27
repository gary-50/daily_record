/**
 * 应用常量配置
 */

export const CONSTANTS = {
    CHART_SCROLL_DELAY: 150,
    TOAST_DURATION: 3000,
    TOAST_FADE_OUT: 2700,
    DEFAULT_DATE_RANGE: 30,
    COUNT_ANIMATION_DURATION: 1000,
    HEATMAP_DAYS: 364,
    HEATMAP_TOTAL_CELLS: 371,
    MAX_INPUT_HEIGHT: 120,
    SUMMARY_TEXT_LIMIT: 30,
    SUMMARY_TEXT_LIMIT_DIET: 20,
    SEARCH_DEBOUNCE_DELAY: 300,
    PAGE_SIZE: 50  // 每页显示50条记录
};

/**
 * 分页配置
 */
export const PAGINATION = {
    exercise: {
        currentPage: 1,
        pageSize: CONSTANTS.PAGE_SIZE,
        totalPages: 1
    },
    diet: {
        currentPage: 1,
        pageSize: CONSTANTS.PAGE_SIZE,
        totalPages: 1
    }
};

/**
 * Toast图标
 */
export const TOAST_ICONS = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
