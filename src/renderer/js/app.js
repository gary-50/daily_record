// 全局变量
let exerciseData = [];
let paceChart = null;
let strengthChart = null;
let runningChart = null;
let currentTab = 'daily';
let currentChartType = 'line';
let currentPage = 'record';

/**
 * 初始化应用
 */
function initializeApp() {
    // 初始化日期
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('endDate').valueAsDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    document.getElementById('startDate').valueAsDate = startDate;

    // 绑定事件监听器
    bindEventListeners();

    // 加载数据
    loadData();

    // 加载设置
    loadSettings();
}

/**
 * 页面切换功能
 */
function switchPage(pageName) {
    // 移除所有页面的active类
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 移除所有导航项的active类
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // 激活当前页面
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 激活当前导航项
    const targetNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    currentPage = pageName;

    // 如果切换到统计页面，更新图表
    if (pageName === 'stats') {
        setTimeout(() => updateCharts(), 100);
    }
}

/**
 * 绑定所有事件监听器
 */
function bindEventListeners() {
    // 表单提交事件
    document.getElementById('exerciseForm').addEventListener('submit', handleFormSubmit);

    // 导航菜单点击事件
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const pageName = this.dataset.page;
            switchPage(pageName);
        });
    });

    // Tab切换事件
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            updateCharts();
        });
    });

    // 图表类型切换事件
    document.querySelectorAll('.tab-btn[data-chart]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn[data-chart]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentChartType = this.dataset.chart;
            updateCharts();
        });
    });

    // 图表复选框事件（统一处理）
    ['showPaceChart', 'showStrengthChart', 'showRunningChart'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            const wrapperId = id.replace('show', '').replace('Chart', 'ChartWrapper');
            const wrapper = document.getElementById(wrapperId.charAt(0).toLowerCase() + wrapperId.slice(1));
            wrapper.style.display = this.checked ? 'block' : 'none';
            if (this.checked) {
                updateCharts();
                // 延迟滚动，等待图表渲染完成
                setTimeout(() => {
                    wrapper.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 150);
            }
        });
    });

    // 设置页面 - 更改数据存储位置按钮
    const changeDataPathBtn = document.getElementById('changeDataPathBtn');
    if (changeDataPathBtn) {
        changeDataPathBtn.addEventListener('click', handleChangeDataPath);
    }
}

/**
 * 从Electron主进程加载数据
 */
async function loadData() {
    try {
        exerciseData = await window.electronAPI.getRecords();
        displayRecords();
        if (currentPage === 'stats') {
            updateCharts();
        }
    } catch (error) {
        console.error('加载数据错误:', error);
        showToast('加载数据失败', 'error');
    }
}

/**
 * 将时:分:秒格式转换为总秒数
 */
function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.trim() === '') return 0;
    const parts = timeStr.split(':');
    if (parts.length === 3) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
}

/**
 * 将总秒数转换为时:分:秒格式
 */
function secondsToTime(totalSeconds) {
    if (!totalSeconds || totalSeconds === 0) return '-';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 显示 Toast 提示
 * @param {string} message - 提示消息
 * @param {string} type - 提示类型: 'success', 'error', 'info'
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // 根据类型选择图标
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/></svg>';
    } else {
        iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    toast.innerHTML = `
        ${iconSvg}
        <div class="toast-message">${message}</div>
        <button class="toast-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
            </svg>
        </button>
    `;

    // 添加关闭按钮事件
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    };

    // 添加到容器
    container.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

/**
 * 显示确认对话框（非阻塞）
 * @param {string} message - 确认消息
 * @param {string} title - 对话框标题
 * @returns {Promise<boolean>} - 返回用户的选择
 */
function showConfirm(message, title = '确认操作') {
    return new Promise((resolve) => {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';

        dialog.innerHTML = `
            <div class="confirm-header">
                <h3>
                    <svg class="confirm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                    </svg>
                    ${title}
                </h3>
            </div>
            <div class="confirm-body">
                <p>${message}</p>
            </div>
            <div class="confirm-footer">
                <button class="confirm-btn confirm-btn-cancel" data-action="cancel">
                    <svg class="confirm-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
                    </svg>
                    取消
                </button>
                <button class="confirm-btn confirm-btn-confirm" data-action="confirm">
                    <svg class="confirm-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    确定
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 阻止对话框点击冒泡
        dialog.onclick = (e) => e.stopPropagation();

        // 处理按钮点击
        const handleClick = (confirmed) => {
            overlay.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                overlay.remove();
                resolve(confirmed);
            }, 200);
        };

        // 绑定按钮事件
        dialog.querySelector('[data-action="cancel"]').onclick = () => handleClick(false);
        dialog.querySelector('[data-action="confirm"]').onclick = () => handleClick(true);

        // 点击遮罩层关闭
        overlay.onclick = () => handleClick(false);

        // ESC 键关闭
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleClick(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

/**
 * 计算配速（分钟/公里）
 */
function calculatePace(durationSeconds, distanceKm) {
    if (!durationSeconds || !distanceKm || distanceKm === 0) return '-';
    const paceSeconds = durationSeconds / distanceKm;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceSecondsRemainder = Math.floor(paceSeconds % 60);
    return `${paceMinutes}'${paceSecondsRemainder.toString().padStart(2, '0')}"`;
}

/**
 * 处理表单提交
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    // 获取表单和提交按钮
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    // 禁用提交按钮防止重复提交
    submitButton.disabled = true;

    // 保存按钮原始文本
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<span>保存中...</span>';

    const durationInput = document.getElementById('runDuration').value;
    const durationSeconds = timeToSeconds(durationInput);

    const record = {
        date: document.getElementById('date').value,
        runTime: document.getElementById('runTime').value || '',
        runDurationSeconds: durationSeconds,
        runDistance: parseFloat(document.getElementById('runDistance').value) || 0,
        pushups: parseInt(document.getElementById('pushups').value) || 0,
        squats: parseInt(document.getElementById('squats').value) || 0,
        mountainClimbers: parseInt(document.getElementById('mountainClimbers').value) || 0,
        feeling: document.getElementById('feeling').value
    };

    try {
        const result = await window.electronAPI.saveRecord(record);

        if (result.success) {
            await loadData();

            // 清空表单
            form.reset();
            document.getElementById('date').valueAsDate = new Date();

            // 使用 Toast 提示代替 alert
            showToast('记录已保存！', 'success');
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存数据错误:', error);

        // 使用 Toast 提示代替 alert
        showToast('保存失败：' + error.message, 'error');
    } finally {
        // 恢复按钮状态
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

/**
 * 显示历史记录
 */
function displayRecords() {
    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = '';

    // 按日期降序排序
    const sortedData = [...exerciseData].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    sortedData.forEach(record => {
        // 兼容旧数据格式（runDuration为分钟）和新数据格式（runDurationSeconds为秒）
        const durationSeconds = record.runDurationSeconds || (record.runDuration ? record.runDuration * 60 : 0);
        const durationDisplay = secondsToTime(durationSeconds);
        const pace = calculatePace(durationSeconds, record.runDistance);

        const tr = document.createElement('tr');

        // 处理体感记录的显示
        const feeling = record.feeling || '-';
        const feelingDisplay = feeling === '-' ? '-' : `<span class="feeling-preview" onclick="showFeelingModal('${encodeURIComponent(feeling)}')">${feeling}</span>`;

        tr.innerHTML = `
            <td>${record.date}</td>
            <td>${record.runTime || '-'}</td>
            <td>${durationDisplay}</td>
            <td>${record.runDistance || '-'}</td>
            <td>${pace}</td>
            <td>${record.pushups || '-'}</td>
            <td>${record.squats || '-'}</td>
            <td>${record.mountainClimbers || '-'}</td>
            <td class="feeling-cell">${feelingDisplay}</td>
            <td><button class="delete-btn" onclick="deleteRecord(${record.id})">删除</button></td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * 显示体感记录弹窗
 */
function showFeelingModal(encodedFeeling) {
    const feeling = decodeURIComponent(encodedFeeling);

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = () => overlay.remove();

    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'feeling-modal';
    modal.onclick = (e) => e.stopPropagation();

    modal.innerHTML = `
        <div class="modal-header">
            <h3>体感记录</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <div class="modal-body">
            <p>${feeling.replace(/\n/g, '<br>')}</p>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

/**
 * 删除记录
 */
async function deleteRecord(id) {
    const confirmed = await showConfirm('确定要删除这条记录吗？', '删除确认');

    if (confirmed) {
        try {
            const result = await window.electronAPI.deleteRecord(id);

            if (result.success) {
                await loadData();
                showToast('删除成功', 'success');
            } else {
                throw new Error(result.error || '删除失败');
            }
        } catch (error) {
            console.error('删除数据错误:', error);
            showToast('删除失败：' + error.message, 'error');
        }
    }
}

/**
 * 根据日期范围和统计类型对数据进行分组
 */
function groupDataByPeriod(filteredData) {
    const groupedData = {};

    filteredData.forEach(record => {
        let key = record.date;

        // 根据当前标签页类型分组
        if (currentTab === 'weekly') {
            const date = new Date(record.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else if (currentTab === 'monthly') {
            key = record.date.substring(0, 7);
        }

        // 初始化分组数据
        if (!groupedData[key]) {
            groupedData[key] = {
                runDurationSeconds: 0,
                runDistance: 0,
                pushups: 0,
                squats: 0,
                mountainClimbers: 0,
                count: 0
            };
        }

        // 兼容旧数据格式
        const durationSeconds = record.runDurationSeconds || (record.runDuration ? record.runDuration * 60 : 0);

        // 累加数据
        groupedData[key].runDurationSeconds += durationSeconds;
        groupedData[key].runDistance += record.runDistance;
        groupedData[key].pushups += record.pushups;
        groupedData[key].squats += record.squats;
        groupedData[key].mountainClimbers += record.mountainClimbers;
        groupedData[key].count += 1;
    });

    return groupedData;
}

/**
 * 更新统计卡片
 */
function updateStatCards(labels, groupedData) {
    const runDurationData = labels.map(label => groupedData[label].runDurationSeconds / 60); // 转换为分钟用于显示
    const runDistanceData = labels.map(label => {
        // 如果跑步距离为0，返回null以忽略该数据点
        return groupedData[label].runDistance > 0 ? groupedData[label].runDistance : null;
    });
    const pushupsData = labels.map(label => {
        // 如果俯卧撑为0，返回null以忽略该数据点
        return groupedData[label].pushups > 0 ? groupedData[label].pushups : null;
    });
    const squatsData = labels.map(label => {
        // 如果深蹲为0，返回null以忽略该数据点
        return groupedData[label].squats > 0 ? groupedData[label].squats : null;
    });
    const mountainClimbersData = labels.map(label => {
        // 如果登山跑为0，返回null以忽略该数据点
        return groupedData[label].mountainClimbers > 0 ? groupedData[label].mountainClimbers : null;
    });

    // 计算每个时间段的配速（分钟/公里）
    const paceData = labels.map(label => {
        const data = groupedData[label];
        if (data.runDurationSeconds > 0 && data.runDistance > 0) {
            return data.runDurationSeconds / 60 / data.runDistance;
        }
        return null;
    });

    const totalRunDurationSeconds = labels.reduce((sum, label) => sum + groupedData[label].runDurationSeconds, 0);
    const totalRunDistance = labels.reduce((sum, label) => sum + groupedData[label].runDistance, 0);
    const totalPushups = labels.reduce((sum, label) => sum + groupedData[label].pushups, 0);
    const totalSquats = labels.reduce((sum, label) => sum + groupedData[label].squats, 0);
    const totalMountainClimbers = labels.reduce((sum, label) => sum + groupedData[label].mountainClimbers, 0);

    // 计算平均配速
    const avgPace = totalRunDistance > 0 ? calculatePace(totalRunDurationSeconds, totalRunDistance) : '-';

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <h3>${secondsToTime(totalRunDurationSeconds)}</h3>
            <p>跑步总时长</p>
        </div>
        <div class="stat-card">
            <h3>${totalRunDistance.toFixed(2)}</h3>
            <p>跑步总距离（公里）</p>
        </div>
        <div class="stat-card">
            <h3>${avgPace}</h3>
            <p>平均配速</p>
        </div>
        <div class="stat-card">
            <h3>${totalPushups}</h3>
            <p>俯卧撑总数</p>
        </div>
        <div class="stat-card">
            <h3>${totalSquats}</h3>
            <p>深蹲总数</p>
        </div>
        <div class="stat-card">
            <h3>${totalMountainClimbers}</h3>
            <p>登山跑总数</p>
        </div>
    `;

    return {
        runDurationData,
        runDistanceData,
        paceData,
        pushupsData,
        squatsData,
        mountainClimbersData
    };
}

/**
 * 绘制配速图表（更精细的单位）
 */
function drawPaceChart(labels, paceData) {
    // 将配速从分钟转换为秒（用于更精细的显示）
    const paceInSeconds = paceData.map(pace => pace ? pace * 60 : null);

    paceChart = drawChart('paceChart', paceChart, labels, [
        {
            label: '配速（秒/公里）',
            data: paceInSeconds,
            borderColor: '#e67e22',
            backgroundColor: 'rgba(230, 126, 34, 0.2)',
            tension: 0.4,
            spanGaps: true
        }
    ], {
        beginAtZero: false,
        y: {
            suggestedMin: 300,  // 5分钟
            suggestedMax: 420,  // 7分钟
            ticks: {
                callback: function(value) {
                    const minutes = Math.floor(value / 60);
                    const seconds = Math.floor(value % 60);
                    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const seconds = context.parsed.y;
                        if (seconds === null) return '';
                        const minutes = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return `配速: ${minutes}'${secs.toString().padStart(2, '0')}" /公里`;
                    }
                }
            }
        }
    });
}

/**
 * 通用图表绘制函数
 */
function drawChart(chartId, chartRef, labels, datasets, yAxisOptions = {}) {
    const ctx = document.getElementById(chartId).getContext('2d');

    // 销毁旧图表
    if (chartRef) {
        chartRef.destroy();
    }

    // 创建新图表
    return new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13
                        }
                    }
                },
                ...yAxisOptions.plugins
            },
            scales: {
                y: {
                    beginAtZero: yAxisOptions.beginAtZero !== false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ...yAxisOptions.y
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * 绘制力量训练图表(深蹲、俯卧撑和登山跑)
 */
function drawStrengthChart(labels, pushupsData, squatsData, mountainClimbersData) {
    strengthChart = drawChart('strengthChart', strengthChart, labels, [
        {
            label: '俯卧撑(个)',
            data: pushupsData,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            tension: 0.4,
            spanGaps: true
        },
        {
            label: '深蹲(个)',
            data: squatsData,
            borderColor: '#f39c12',
            backgroundColor: 'rgba(243, 156, 18, 0.2)',
            tension: 0.4,
            spanGaps: true
        },
        {
            label: '登山跑(个)',
            data: mountainClimbersData,
            borderColor: '#9b59b6',
            backgroundColor: 'rgba(155, 89, 182, 0.2)',
            tension: 0.4,
            spanGaps: true
        }
    ]);
}

/**
 * 绘制跑步数据图表(仅跑步距离)
 */
function drawRunningChart(labels, runDistanceData) {
    runningChart = drawChart('runningChart', runningChart, labels, [
        {
            label: '跑步距离(公里)',
            data: runDistanceData,
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.2)',
            tension: 0.4,
            spanGaps: true
        }
    ]);
}

/**
 * 更新图表和统计数据
 */
function updateCharts() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    // 过滤数据
    let filteredData = exerciseData.filter(record => {
        return (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
    });

    // 分组数据
    const groupedData = groupDataByPeriod(filteredData);
    const labels = Object.keys(groupedData).sort();

    // 更新统计卡片
    const datasets = updateStatCards(labels, groupedData);

    // 只绘制被选中的图表
    if (document.getElementById('showPaceChart').checked) {
        drawPaceChart(labels, datasets.paceData);
    }

    if (document.getElementById('showStrengthChart').checked) {
        drawStrengthChart(labels, datasets.pushupsData, datasets.squatsData, datasets.mountainClimbersData);
    }

    if (document.getElementById('showRunningChart').checked) {
        drawRunningChart(labels, datasets.runDistanceData);
    }
}

/**
 * 加载设置信息
 */
async function loadSettings() {
    try {
        const config = await window.electronAPI.getConfig();
        const dataPathElement = document.getElementById('currentDataPath');
        if (dataPathElement) {
            dataPathElement.textContent = config.dataFilePath || '加载失败';
        }
    } catch (error) {
        console.error('加载设置错误:', error);
    }
}

/**
 * 处理更改数据存储位置
 */
async function handleChangeDataPath() {
    try {
        // 打开文件选择对话框
        const newPath = await window.electronAPI.chooseDataPath();

        if (!newPath) {
            return; // 用户取消了选择
        }

        // 设置新的数据文件路径
        const result = await window.electronAPI.setDataPath(newPath);

        if (result.success) {
            showToast(`数据存储位置已更新！\n\n新路径：${result.newPath}\n\n数据已从旧位置复制到新位置。`, 'success');

            // 更新显示的路径
            document.getElementById('currentDataPath').textContent = result.newPath;

            // 重新加载数据
            await loadData();
        } else {
            throw new Error(result.error || '更新路径失败');
        }
    } catch (error) {
        console.error('更改数据存储位置错误:', error);
        showToast('更改数据存储位置失败：' + error.message, 'error');
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initializeApp);
