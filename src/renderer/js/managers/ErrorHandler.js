/**
 * 统一错误处理类 - 提供友好的错误提示
 */
export class ErrorHandler {
    /**
     * 处理错误并显示友好提示
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文（描述操作）
     * @param {boolean} showToUser - 是否向用户显示提示，默认true
     */
    static handle(error, context = '', showToUser = true) {
        console.error(`[${context}] 错误:`, error);

        // 根据错误类型显示用户友好的提示
        let userMessage = '操作失败，请重试';

        if (error.name === 'NetworkError' || error.message.includes('网络')) {
            userMessage = '网络连接失败，请检查网络设置';
        } else if (error.name === 'ValidationError') {
            userMessage = error.message || '数据格式不正确';
        } else if (error.message.includes('ENOENT') || error.message.includes('找不到')) {
            userMessage = '文件未找到，请检查数据路径';
        } else if (error.message.includes('EACCES') || error.message.includes('权限')) {
            userMessage = '没有权限访问文件';
        } else if (error.message.includes('ENOSPC')) {
            userMessage = '磁盘空间不足';
        } else if (error.message.includes('timeout') || error.message.includes('超时')) {
            userMessage = '操作超时，请重试';
        } else if (error.message.includes('解析') || error.message.includes('parse')) {
            userMessage = '数据格式错误，无法解析';
        } else if (context) {
            userMessage = `${context}失败，请重试`;
        }

        // 显示用户提示
        if (showToUser && typeof window.showToast === 'function') {
            window.showToast(userMessage, 'error');
        }

        return userMessage;
    }

    /**
     * 异步操作的错误处理包装器
     * @param {Function} asyncFn - 异步函数
     * @param {string} context - 错误上下文
     * @returns {Function} - 包装后的函数
     */
    static async wrap(asyncFn, context = '') {
        try {
            return await asyncFn();
        } catch (error) {
            ErrorHandler.handle(error, context);
            throw error; // 继续抛出以便调用者处理
        }
    }

    /**
     * 为函数添加错误处理
     * @param {Function} fn - 要包装的函数
     * @param {string} context - 错误上下文
     * @returns {Function} - 包装后的函数
     */
    static wrapFunction(fn, context = '') {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                ErrorHandler.handle(error, context);
                return null;
            }
        };
    }

    /**
     * 验证错误处理（不显示toast，返回错误信息）
     * @param {Object} validation - 验证结果对象 {isValid, errors}
     * @param {string} context - 错误上下文
     * @returns {boolean} - 是否有效
     */
    static handleValidation(validation, context = '') {
        if (!validation.isValid) {
            const errorMsg = validation.errors.join('\n');
            console.warn(`[${context}] 验证失败:`, validation.errors);
            if (typeof window.showToast === 'function') {
                window.showToast(errorMsg, 'error');
            }
            return false;
        }
        return true;
    }
}
