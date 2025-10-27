/**
 * 数据验证器模块
 */

/**
 * 验证运动记录数据
 * @param {Object} data - 运动记录数据
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
export function validateExerciseData(data) {
    const errors = [];

    // 日期验证
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        errors.push('日期格式不正确，应为 YYYY-MM-DD');
    }

    // 时间验证（如果提供）
    if (data.runTime && !/^\d{2}:\d{2}$/.test(data.runTime)) {
        errors.push('时间格式不正确，应为 HH:MM');
    }

    // 根据跑步类型验证不同字段
    if (data.runType === 'longRun') {
        // 距离验证
        if (data.runDistance !== undefined && data.runDistance !== '') {
            const distance = parseFloat(data.runDistance);
            if (isNaN(distance) || distance < 0 || distance > 500) {
                errors.push('距离必须是0-500之间的数字');
            }
        }

        // 时长验证
        if (data.runDurationSeconds !== undefined && data.runDurationSeconds !== '') {
            const duration = parseInt(data.runDurationSeconds);
            if (isNaN(duration) || duration < 0 || duration > 86400) {
                errors.push('跑步时长不合理（应在0-24小时之间）');
            }
        }
    } else if (data.runType === 'speedEndurance') {
        // 跑速耐验证
        if (data.distancePerSet !== undefined && data.distancePerSet !== '') {
            const distance = parseInt(data.distancePerSet);
            if (isNaN(distance) || distance < 0 || distance > 10000) {
                errors.push('每组距离必须是0-10000米之间的数字');
            }
        }

        if (data.sets !== undefined && data.sets !== '') {
            const sets = parseInt(data.sets);
            if (isNaN(sets) || sets < 0 || sets > 100) {
                errors.push('组数必须是0-100之间的数字');
            }
        }

        if (data.speedEnduranceNotes && data.speedEnduranceNotes.length > 500) {
            errors.push('备注内容不能超过500字符');
        }
    }

    // 力量训练验证
    const strengthFields = ['pushups', 'squats', 'mountainClimbers'];
    strengthFields.forEach(field => {
        if (data[field] !== undefined && data[field] !== '') {
            const value = parseInt(data[field]);
            if (isNaN(value) || value < 0 || value > 10000) {
                const fieldNames = {
                    pushups: '俯卧撑',
                    squats: '深蹲',
                    mountainClimbers: '登山跑'
                };
                errors.push(`${fieldNames[field]}数量必须是0-10000之间的数字`);
            }
        }
    });

    // 体感记录验证
    if (data.feeling && data.feeling.length > 1000) {
        errors.push('体感记录不能超过1000字符');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 验证饮食记录数据
 * @param {Object} data - 饮食记录数据
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
export function validateDietData(data) {
    const errors = [];

    // 日期验证
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        errors.push('日期格式不正确，应为 YYYY-MM-DD');
    }

    // 饮水量验证
    if (data.waterCups !== undefined && data.waterCups !== '') {
        const cups = parseInt(data.waterCups);
        if (isNaN(cups) || cups < 0 || cups > 100) {
            errors.push('饮水杯数必须是0-100之间的数字');
        }
    }

    // 零食备注验证
    if (data.snacks && data.snacks.length > 500) {
        errors.push('零食饮料备注不能超过500字符');
    }

    // 验证三餐数据
    const meals = ['breakfast', 'lunch', 'dinner'];
    const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
    
    meals.forEach(meal => {
        if (data[meal]) {
            // 时间格式验证
            if (data[meal].time && !/^\d{2}:\d{2}$/.test(data[meal].time)) {
                errors.push(`${mealNames[meal]}时间格式不正确，应为 HH:MM`);
            }

            // 食物内容长度验证
            if (data[meal].foods && data[meal].foods.length > 500) {
                errors.push(`${mealNames[meal]}食物内容不能超过500字符`);
            }

            // 备注长度验证
            if (data[meal].notes && data[meal].notes.length > 500) {
                errors.push(`${mealNames[meal]}备注不能超过500字符`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}
