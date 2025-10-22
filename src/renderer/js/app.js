const CONSTANTS = {
    CHART_SCROLL_DELAY: 150,
    TOAST_DURATION: 3000,
    TOAST_FADE_OUT: 2700,
    DEFAULT_DATE_RANGE: 30,
    COUNT_ANIMATION_DURATION: 1000
};

let exerciseData = [];
let filteredData = [];
let currentSortColumn = null;
let currentSortDirection = 'desc';
const charts = {
    pace: null,
    strength: null,
    running: null
};
let currentTab = 'daily';
let currentChartType = 'line';
let currentPage = 'record';
let heatmapTooltip = null;

const DOM = {};

function cacheDOMElements() {
    DOM.date = document.getElementById('date');
    DOM.endDate = document.getElementById('endDate');
    DOM.startDate = document.getElementById('startDate');
    DOM.exerciseForm = document.getElementById('exerciseForm');
    DOM.recordsBody = document.getElementById('recordsBody');
    DOM.statsGrid = document.getElementById('statsGrid');
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.currentDataPath = document.getElementById('currentDataPath');
    DOM.changeDataPathBtn = document.getElementById('changeDataPathBtn');
    DOM.recordSearch = document.getElementById('recordSearch');
    DOM.historyEmptyState = document.getElementById('historyEmptyState');
    DOM.historyTableContainer = document.getElementById('historyTableContainer');
    DOM.statsEmptyState = document.getElementById('statsEmptyState');
    DOM.statsContent = document.getElementById('statsContent');
    DOM.heatmapContainer = document.getElementById('heatmapContainer');
    DOM.heatmapGrid = document.getElementById('heatmapGrid');
    
    DOM.chartWrappers = {
        pace: document.getElementById('paceChartWrapper'),
        strength: document.getElementById('strengthChartWrapper'),
        running: document.getElementById('runningChartWrapper')
    };
    
    // 初始化：只显示配速图表
    DOM.chartWrappers.pace.style.display = 'block';
    DOM.chartWrappers.strength.style.display = 'none';
    DOM.chartWrappers.running.style.display = 'none';
}

function initializeApp() {
    cacheDOMElements();
    
    const today = new Date();
    DOM.date.valueAsDate = today;
    DOM.endDate.valueAsDate = today;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - CONSTANTS.DEFAULT_DATE_RANGE);
    DOM.startDate.valueAsDate = startDate;

    initTheme();
    bindEventListeners();
    loadData();
    loadSettings();
}

function switchPage(pageName) {
    if (currentPage === pageName) return;

    const targetPage = document.getElementById(pageName + 'Page');
    const targetNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    
    // 立即隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (targetNav) targetNav.classList.add('active');

    // 显示新页面并播放进入动画
    if (targetPage) {
        requestAnimationFrame(() => {
            targetPage.classList.add('active');
        });
    }

    currentPage = pageName;

    // 延迟加载数据，等待动画完成
    if (pageName === 'stats') {
        setTimeout(() => {
            updateEmptyStates();
            renderHeatmap();
            updateCharts();
        }, 150);
    } else if (pageName === 'history') {
        setTimeout(updateEmptyStates, 150);
    }
}

function bindEventListeners() {
    DOM.exerciseForm.addEventListener('submit', handleFormSubmit);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            switchPage(this.dataset.page);
        });
    });

    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            updateCharts();
        });
    });

    document.querySelectorAll('.tab-btn[data-chart]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn[data-chart]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentChartType = this.dataset.chart;
            updateCharts();
        });
    });

    // 图表选择按钮事件
    document.querySelectorAll('.chart-option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartType = this.dataset.chart;
            
            // 移除所有按钮的 active 类
            document.querySelectorAll('.chart-option-btn').forEach(b => b.classList.remove('active'));
            
            // 添加当前按钮的 active 类
            this.classList.add('active');
            
            // 隐藏所有图表
            Object.values(DOM.chartWrappers).forEach(wrapper => {
                wrapper.style.display = 'none';
            });
            
            // 显示选中的图表
            const wrapper = DOM.chartWrappers[chartType];
            if (wrapper) {
                wrapper.style.display = 'block';
                updateCharts();
                setTimeout(() => {
                    wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, CONSTANTS.CHART_SCROLL_DELAY);
            }
        });
    });

    if (DOM.changeDataPathBtn) {
        DOM.changeDataPathBtn.addEventListener('click', handleChangeDataPath);
    }

    // 主题切换事件
    document.querySelectorAll('.theme-mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-mode-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            setTheme(this.dataset.mode);
        });
    });

    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.theme-color-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            setThemeColor(this.dataset.color);
        });
    });

    // 搜索框事件
    if (DOM.recordSearch) {
        DOM.recordSearch.addEventListener('input', handleSearch);
    }

    // 表格排序事件
    document.querySelectorAll('.records-table th.sortable').forEach(th => {
        th.addEventListener('click', function() {
            handleSort(this.dataset.sort);
        });
    });
}

async function loadData() {
    try {
        showSkeletonLoading();
        exerciseData = await window.electronAPI.getRecords();
        filteredData = [...exerciseData];
        hideSkeletonLoading();
        displayRecords();
        updateEmptyStates();
        if (currentPage === 'stats') {
            renderHeatmap();
            updateCharts();
        }
    } catch (error) {
        console.error('加载数据错误:', error);
        showToast('加载数据失败', 'error');
        hideSkeletonLoading();
    }
}

function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.trim() === '') return 0;
    
    timeStr = timeStr.trim();
    const parts = timeStr.split(':');
    
    if (parts.length === 2) {
        // HH:MM 格式（时间选择器返回的格式）
        const [hours, minutes] = parts.map(p => parseInt(p) || 0);
        return hours * 3600 + minutes * 60;
    } else if (parts.length === 3) {
        // HH:MM:SS 格式（时间选择器包含秒数）
        const [hours, minutes, seconds] = parts.map(p => parseInt(p) || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    return 0;
}

function secondsToTime(totalSeconds) {
    if (!totalSeconds || totalSeconds === 0) return '-';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function showToast(message, type = 'success') {
    const iconMap = {
        success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/></svg>',
        info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${iconMap[type]}
        <div class="toast-message">${message}</div>
        <button class="toast-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
            </svg>
        </button>
    `;

    toast.querySelector('.toast-close').onclick = () => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    };

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, CONSTANTS.TOAST_DURATION);
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

function calculatePace(durationSeconds, distanceKm) {
    if (!durationSeconds || !distanceKm || distanceKm === 0) return '-';
    const paceSeconds = durationSeconds / distanceKm;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceSecondsRemainder = Math.floor(paceSeconds % 60);
    return `${paceMinutes}'${String(paceSecondsRemainder).padStart(2, '0')}"`;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<span>保存中...</span>';

    const record = {
        date: DOM.date.value,
        runTime: document.getElementById('runTime').value || '',
        runDurationSeconds: timeToSeconds(document.getElementById('runDuration').value),
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
            e.target.reset();
            DOM.date.valueAsDate = new Date();
            showToast('记录已保存！', 'success');
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存数据错误:', error);
        showToast('保存失败：' + error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

function displayRecords() {
    DOM.recordsBody.innerHTML = '';

    if (filteredData.length === 0) {
        return;
    }

    let dataToDisplay = [...filteredData];

    // 应用排序
    if (currentSortColumn) {
        dataToDisplay.sort((a, b) => {
            let aVal = a[currentSortColumn];
            let bVal = b[currentSortColumn];

            // 处理空值
            if (aVal === null || aVal === undefined || aVal === '') aVal = currentSortDirection === 'asc' ? Infinity : -Infinity;
            if (bVal === null || bVal === undefined || bVal === '') bVal = currentSortDirection === 'asc' ? Infinity : -Infinity;

            // 字符串比较
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return currentSortDirection === 'asc' 
                    ? aVal.localeCompare(bVal) 
                    : bVal.localeCompare(aVal);
            }

            // 数字比较
            return currentSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });
    } else {
        // 默认按日期降序
        dataToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    dataToDisplay.forEach(record => {
        const durationSeconds = record.runDurationSeconds || (record.runDuration ? record.runDuration * 60 : 0);
        const durationDisplay = secondsToTime(durationSeconds);
        const pace = calculatePace(durationSeconds, record.runDistance);
        const feeling = record.feeling || '-';
        const feelingDisplay = feeling === '-' ? '-' : `<span class="feeling-preview" onclick="showFeelingModal('${encodeURIComponent(feeling)}')">${feeling}</span>`;

        const tr = document.createElement('tr');
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
        DOM.recordsBody.appendChild(tr);
    });

    updateSortIcons();
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

function updateStatCards(labels, groupedData) {
    const dataMapper = (field, checkZero = false) => 
        labels.map(label => {
            const value = groupedData[label][field];
            return checkZero && value === 0 ? null : value;
        });

    const runDistanceData = dataMapper('runDistance', true);
    const pushupsData = dataMapper('pushups', true);
    const squatsData = dataMapper('squats', true);
    const mountainClimbersData = dataMapper('mountainClimbers', true);

    const paceData = labels.map(label => {
        const data = groupedData[label];
        return (data.runDurationSeconds > 0 && data.runDistance > 0) 
            ? data.runDurationSeconds / 60 / data.runDistance 
            : null;
    });

    const totals = labels.reduce((acc, label) => {
        const data = groupedData[label];
        acc.runDurationSeconds += data.runDurationSeconds;
        acc.runDistance += data.runDistance;
        acc.pushups += data.pushups;
        acc.squats += data.squats;
        acc.mountainClimbers += data.mountainClimbers;
        return acc;
    }, { runDurationSeconds: 0, runDistance: 0, pushups: 0, squats: 0, mountainClimbers: 0 });

    const avgPace = totals.runDistance > 0 ? calculatePace(totals.runDurationSeconds, totals.runDistance) : '-';

    DOM.statsGrid.innerHTML = `
        <div class="stat-card">
            <h3>${secondsToTime(totals.runDurationSeconds)}</h3>
            <p>跑步总时长</p>
        </div>
        <div class="stat-card">
            <h3>${totals.runDistance.toFixed(2)}</h3>
            <p>跑步总距离（公里）</p>
        </div>
        <div class="stat-card">
            <h3>${avgPace}</h3>
            <p>平均配速</p>
        </div>
        <div class="stat-card">
            <h3>${totals.pushups}</h3>
            <p>俯卧撑总数</p>
        </div>
        <div class="stat-card">
            <h3>${totals.squats}</h3>
            <p>深蹲总数</p>
        </div>
        <div class="stat-card">
            <h3>${totals.mountainClimbers}</h3>
            <p>登山跑总数</p>
        </div>
    `;

    return {
        runDurationData: dataMapper('runDurationSeconds').map(v => v / 60),
        runDistanceData,
        paceData,
        pushupsData,
        squatsData,
        mountainClimbersData
    };
}

function drawPaceChart(labels, paceData) {
    const paceInSeconds = paceData.map(pace => pace ? pace * 60 : null);

    charts.pace = drawChart('paceChart', charts.pace, labels, [
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
            suggestedMin: 300,
            suggestedMax: 420,
            ticks: {
                callback: (value) => {
                    const minutes = Math.floor(value / 60);
                    const seconds = Math.floor(value % 60);
                    return `${minutes}'${String(seconds).padStart(2, '0')}"`;
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const seconds = context.parsed.y;
                        if (seconds === null) return '';
                        const minutes = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return `配速: ${minutes}'${String(secs).padStart(2, '0')}" /公里`;
                    }
                }
            }
        }
    });
}

function drawChart(chartId, chartRef, labels, datasets, yAxisOptions = {}) {
    const ctx = document.getElementById(chartId).getContext('2d');

    if (chartRef) chartRef.destroy();

    return new Chart(ctx, {
        type: currentChartType,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15,
                        font: { size: 13 }
                    }
                },
                ...yAxisOptions.plugins
            },
            scales: {
                y: {
                    beginAtZero: yAxisOptions.beginAtZero !== false,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ...yAxisOptions.y
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function drawStrengthChart(labels, pushupsData, squatsData, mountainClimbersData) {
    charts.strength = drawChart('strengthChart', charts.strength, labels, [
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

function drawRunningChart(labels, runDistanceData) {
    charts.running = drawChart('runningChart', charts.running, labels, [
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

function updateCharts() {
    const filteredData = exerciseData.filter(record => {
        return (!DOM.startDate.value || record.date >= DOM.startDate.value) && 
               (!DOM.endDate.value || record.date <= DOM.endDate.value);
    });

    const groupedData = groupDataByPeriod(filteredData);
    const labels = Object.keys(groupedData).sort();
    const datasets = updateStatCards(labels, groupedData);

    if (DOM.chartWrappers.pace.style.display !== 'none') {
        drawPaceChart(labels, datasets.paceData);
    }

    if (DOM.chartWrappers.strength.style.display !== 'none') {
        drawStrengthChart(labels, datasets.pushupsData, datasets.squatsData, datasets.mountainClimbersData);
    }

    if (DOM.chartWrappers.running.style.display !== 'none') {
        drawRunningChart(labels, datasets.runDistanceData);
    }
}

async function loadSettings() {
    try {
        const config = await window.electronAPI.getConfig();
        if (DOM.currentDataPath) {
            DOM.currentDataPath.textContent = config.dataFilePath || '加载失败';
        }
    } catch (error) {
        console.error('加载设置错误:', error);
    }
}

async function handleChangeDataPath() {
    try {
        const newPath = await window.electronAPI.chooseDataPath();
        if (!newPath) return;

        const result = await window.electronAPI.setDataPath(newPath);

        if (result.success) {
            showToast(`数据存储位置已更新！\n\n新路径：${result.newPath}\n\n数据已从旧位置复制到新位置。`, 'success');
            DOM.currentDataPath.textContent = result.newPath;
            await loadData();
        } else {
            throw new Error(result.error || '更新路径失败');
        }
    } catch (error) {
        console.error('更改数据存储位置错误:', error);
        showToast('更改数据存储位置失败：' + error.message, 'error');
    }
}

// 主题系统功能
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedColor = localStorage.getItem('themeColor') || 'purple';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-color', savedColor);
    
    // 更新按钮状态
    document.querySelectorAll('.theme-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === savedTheme);
    });
    
    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === savedColor);
    });
}

function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
}

function setThemeColor(color) {
    document.documentElement.setAttribute('data-color', color);
    localStorage.setItem('themeColor', color);
}

// 空状态管理
function updateEmptyStates() {
    const hasData = exerciseData.length > 0;
    
    // 历史记录空状态
    if (DOM.historyEmptyState && DOM.historyTableContainer) {
        if (hasData && filteredData.length === 0) {
            // 有数据但搜索无结果
            DOM.historyEmptyState.style.display = 'none';
            DOM.historyTableContainer.style.display = 'block';
        } else if (!hasData) {
            DOM.historyEmptyState.style.display = 'block';
            DOM.historyTableContainer.style.display = 'none';
        } else {
            DOM.historyEmptyState.style.display = 'none';
            DOM.historyTableContainer.style.display = 'block';
        }
    }
    
    // 统计页面空状态
    if (DOM.statsEmptyState && DOM.statsContent && DOM.heatmapContainer) {
        if (!hasData) {
            DOM.statsEmptyState.style.display = 'block';
            DOM.statsContent.style.display = 'none';
            DOM.heatmapContainer.style.display = 'none';
        } else {
            DOM.statsEmptyState.style.display = 'none';
            DOM.statsContent.style.display = 'block';
            DOM.heatmapContainer.style.display = 'block';
        }
    }
}

// 搜索功能
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredData = [...exerciseData];
    } else {
        filteredData = exerciseData.filter(record => {
            return record.date.includes(searchTerm) ||
                   (record.feeling && record.feeling.toLowerCase().includes(searchTerm)) ||
                   (record.runTime && record.runTime.includes(searchTerm));
        });
    }
    
    displayRecords();
    updateEmptyStates();
}

// 排序功能
function handleSort(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    displayRecords();
}

function updateSortIcons() {
    document.querySelectorAll('.records-table th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSortColumn) {
            th.classList.add(currentSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// 数字增长动画
function animateNumber(element, targetValue, duration = CONSTANTS.COUNT_ANIMATION_DURATION, isDecimal = false) {
    const startValue = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuad = progress * (2 - progress);
        const currentValue = startValue + (targetValue - startValue) * easeOutQuad;
        
        if (isDecimal) {
            element.textContent = currentValue.toFixed(2);
        } else {
            element.textContent = Math.floor(currentValue);
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            if (isDecimal) {
                element.textContent = targetValue.toFixed(2);
            } else {
                element.textContent = targetValue;
            }
        }
    }
    
    requestAnimationFrame(update);
}

// 热力图功能
function renderHeatmap() {
    if (!DOM.heatmapGrid || exerciseData.length === 0) return;
    
    DOM.heatmapGrid.innerHTML = '';
    
    // 生成过去52周（364天）的日期
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);
    
    // 调整到周日开始
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    // 创建日期-运动强度映射
    const exerciseMap = {};
    exerciseData.forEach(record => {
        const score = (record.runDistance || 0) + 
                     (record.pushups || 0) * 0.01 + 
                     (record.squats || 0) * 0.01 + 
                     (record.mountainClimbers || 0) * 0.01;
        exerciseMap[record.date] = score;
    });
    
    // 计算强度级别阈值
    const scores = Object.values(exerciseMap);
    const maxScore = Math.max(...scores, 1);
    
    // 生成热力图格子
    for (let i = 0; i < 371; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const score = exerciseMap[dateStr] || 0;
        
        // 计算级别 (0-4)
        let level = 0;
        if (score > 0) {
            level = Math.min(Math.ceil((score / maxScore) * 4), 4);
        }
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-day';
        cell.setAttribute('data-level', level);
        cell.setAttribute('data-date', dateStr);
        cell.setAttribute('data-score', score.toFixed(2));
        
        // 添加hover事件
        cell.addEventListener('mouseenter', showHeatmapTooltip);
        cell.addEventListener('mouseleave', hideHeatmapTooltip);
        cell.addEventListener('click', () => {
            DOM.recordSearch.value = dateStr;
            handleSearch({ target: DOM.recordSearch });
            switchPage('history');
        });
        
        DOM.heatmapGrid.appendChild(cell);
    }
}

function showHeatmapTooltip(e) {
    const cell = e.target;
    const date = cell.getAttribute('data-date');
    const score = parseFloat(cell.getAttribute('data-score'));
    const level = cell.getAttribute('data-level');
    
    let tooltip = document.getElementById('heatmap-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'heatmap-tooltip';
        tooltip.className = 'heatmap-tooltip';
        document.body.appendChild(tooltip);
    }
    
    const record = exerciseData.find(r => r.date === date);
    let content = `<strong>${date}</strong><br>`;
    
    if (record) {
        if (record.runDistance) content += `跑步: ${record.runDistance}km<br>`;
        if (record.pushups) content += `俯卧撑: ${record.pushups}个<br>`;
        if (record.squats) content += `深蹲: ${record.squats}个<br>`;
        if (record.mountainClimbers) content += `登山跑: ${record.mountainClimbers}个`;
    } else {
        content += '无运动记录';
    }
    
    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
    
    // 定位tooltip
    const rect = cell.getBoundingClientRect();
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
}

function hideHeatmapTooltip() {
    const tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// 骨架屏功能
function showSkeletonLoading() {
    if (currentPage === 'stats' && DOM.statsGrid) {
        DOM.statsGrid.innerHTML = `
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
            <div class="skeleton skeleton-card"></div>
        `;
    }
}

function hideSkeletonLoading() {
    // 骨架屏会被实际内容替换，所以不需要特别清理
}

// ==================== AI 助手功能 ====================

let aiConfig = {
    apiUrl: '',
    apiKey: '',
    model: ''
};
let aiChatHistory = [];
let isAIThinking = false;

// 加载AI配置
async function loadAIConfig() {
    try {
        const result = await window.electronAPI.getAIConfig();
        if (result.success) {
            aiConfig = result.config;
            // 在设置页面填充AI配置
            if (document.getElementById('aiApiUrl')) {
                document.getElementById('aiApiUrl').value = aiConfig.apiUrl || '';
                document.getElementById('aiApiKey').value = aiConfig.apiKey || '';
                document.getElementById('aiModel').value = aiConfig.model || '';
            }
        }
    } catch (error) {
        console.error('加载AI配置失败:', error);
    }
}

// 保存AI配置
async function saveAIConfig(event) {
    if (event) event.preventDefault();
    
    const newConfig = {
        apiUrl: document.getElementById('aiApiUrl').value.trim(),
        apiKey: document.getElementById('aiApiKey').value.trim(),
        model: document.getElementById('aiModel').value.trim()
    };
    
    if (!newConfig.apiUrl || !newConfig.apiKey || !newConfig.model) {
        showToast('请填写完整的AI配置信息', 'error');
        return;
    }
    
    try {
        const result = await window.electronAPI.saveAIConfig(newConfig);
        if (result.success) {
            aiConfig = newConfig;
            showToast('AI配置保存成功！', 'success');
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存AI配置失败:', error);
        showToast('保存AI配置失败：' + error.message, 'error');
    }
}

// 发送AI消息（支持流式输出）
async function sendAIMessage(message) {
    if (!message || !message.trim()) return;
    if (isAIThinking) return;
    
    // 检查配置
    if (!aiConfig.apiUrl || !aiConfig.apiKey || !aiConfig.model) {
        showToast('请先在设置中配置AI参数', 'error');
        switchPage('settings');
        return;
    }
    
    const userMessage = message.trim();
    
    // 添加用户消息到聊天历史
    aiChatHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });
    
    // 显示用户消息
    appendAIMessage('user', userMessage);
    
    // 清空输入框
    const input = document.getElementById('aiChatInput');
    input.value = '';
    input.style.height = 'auto';
    
    // 显示AI思考中
    isAIThinking = true;
    const thinkingElement = appendAIThinkingMessage();
    
    try {
        // 准备上下文：最近的运动数据摘要
        const recentData = getRecentDataSummary();
        const systemPrompt = `你是一个专业的运动健身教练。以下是用户的运动数据：\n${recentData}\n请根据这些数据回答用户的问题，提供专业的建议。`;
        
        // 移除思考动画，创建流式输出容器
        thinkingElement.remove();
        const streamingMessageElement = appendAIStreamingMessage();
        
        let fullResponse = '';
        
        // 调用AI API（流式）
        await callAIStreaming(systemPrompt, userMessage, (chunk) => {
            fullResponse += chunk;
            updateAIStreamingMessage(streamingMessageElement, fullResponse);
        });
        
        // 添加AI回复到聊天历史
        aiChatHistory.push({
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        });
        
        // 标记流式消息完成
        finalizeAIStreamingMessage(streamingMessageElement);
        
    } catch (error) {
        console.error('AI请求失败:', error);
        thinkingElement.remove();
        appendAIErrorMessage(error.message, userMessage);
    } finally {
        isAIThinking = false;
    }
}

// 调用AI API（流式）
async function callAIStreaming(systemPrompt, userMessage, onChunk) {
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];
    
    try {
        const response = await fetch(aiConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: aiConfig.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4000,
                stream: true
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // 保留最后一行（可能不完整）
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                
                if (trimmedLine.startsWith('data: ')) {
                    try {
                        const jsonStr = trimmedLine.slice(6);
                        const data = JSON.parse(jsonStr);
                        
                        // OpenAI格式
                        if (data.choices && data.choices[0]?.delta?.content) {
                            onChunk(data.choices[0].delta.content);
                        }
                        // Ollama格式
                        else if (data.message?.content) {
                            onChunk(data.message.content);
                        }
                        // 其他格式
                        else if (data.response) {
                            onChunk(data.response);
                        }
                    } catch (e) {
                        console.warn('解析流式数据失败:', e, trimmedLine);
                    }
                }
            }
        }
    } catch (error) {
        console.error('AI API流式调用错误:', error);
        throw error;
    }
}

// 获取最近数据摘要
function getRecentDataSummary() {
    if (exerciseData.length === 0) {
        return '用户暂无运动记录。';
    }
    
    // 获取所有数据，按日期排序（从旧到新）
    const sortedData = [...exerciseData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 统计总体数据
    const totalRuns = sortedData.filter(r => r.runDistance > 0).length;
    const totalDistance = sortedData.reduce((sum, r) => sum + (r.runDistance || 0), 0);
    const totalDuration = sortedData.reduce((sum, r) => sum + (r.runDurationSeconds || 0), 0);
    const totalPushups = sortedData.reduce((sum, r) => sum + (r.pushups || 0), 0);
    const totalSquats = sortedData.reduce((sum, r) => sum + (r.squats || 0), 0);
    const totalMountainClimbers = sortedData.reduce((sum, r) => sum + (r.mountainClimbers || 0), 0);
    
    let summary = `运动数据总览：\n`;
    summary += `- 总记录天数：${sortedData.length}天\n`;
    if (totalRuns > 0) {
        summary += `- 跑步次数：${totalRuns}次\n`;
        summary += `- 总跑步距离：${totalDistance.toFixed(2)}公里\n`;
        summary += `- 总跑步时长：${Math.floor(totalDuration / 60)}分钟\n`;
        const avgPace = totalDistance > 0 ? (totalDuration / 60 / totalDistance).toFixed(2) : 0;
        summary += `- 平均配速：${avgPace}分钟/公里\n`;
    }
    if (totalPushups > 0) summary += `- 俯卧撑总数：${totalPushups}个\n`;
    if (totalSquats > 0) summary += `- 深蹲总数：${totalSquats}个\n`;
    if (totalMountainClimbers > 0) summary += `- 登山跑总数：${totalMountainClimbers}个\n`;
    
    summary += `\n详细每日数据：\n`;
    summary += `日期 | 跑步时间 | 跑步距离(km) | 跑步时长 | 配速 | 俯卧撑 | 深蹲 | 登山跑 | 体感\n`;
    summary += `${'─'.repeat(100)}\n`;
    
    sortedData.forEach(record => {
        const date = record.date;
        const runTime = record.runTime || '-';
        const distance = record.runDistance > 0 ? record.runDistance.toFixed(2) : '-';
        const durationSeconds = record.runDurationSeconds || 0;
        const duration = durationSeconds > 0 ? secondsToTime(durationSeconds) : '-';
        const pace = calculatePace(durationSeconds, record.runDistance);
        const pushups = record.pushups > 0 ? record.pushups : '-';
        const squats = record.squats > 0 ? record.squats : '-';
        const mountainClimbers = record.mountainClimbers > 0 ? record.mountainClimbers : '-';
        const feeling = record.feeling ? record.feeling.substring(0, 30) + (record.feeling.length > 30 ? '...' : '') : '-';
        
        summary += `${date} | ${runTime} | ${distance} | ${duration} | ${pace} | ${pushups} | ${squats} | ${mountainClimbers} | ${feeling}\n`;
    });
    
    return summary;
}

// 添加消息到聊天界面
function appendAIMessage(role, content) {
    const messagesContainer = document.getElementById('aiChatMessages');
    const welcomeMessage = messagesContainer.querySelector('.ai-welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;
    
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="ai-message-avatar">
            ${role === 'user' ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `}
        </div>
        <div class="ai-message-content">
            <div class="ai-message-bubble">${formatAIMessage(content)}</div>
            <div class="ai-message-time">${timestamp}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 创建流式消息容器
function appendAIStreamingMessage() {
    const messagesContainer = document.getElementById('aiChatMessages');
    const welcomeMessage = messagesContainer.querySelector('.ai-welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message assistant';
    messageDiv.setAttribute('data-streaming', 'true');
    
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="ai-message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <div class="ai-message-content">
            <div class="ai-message-bubble">
                <span class="streaming-cursor">
                    <span class="cursor-dot"></span>
                    <span class="cursor-dot"></span>
                    <span class="cursor-dot"></span>
                </span>
            </div>
            <div class="ai-message-time">${timestamp}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// 更新流式消息内容
function updateAIStreamingMessage(messageElement, content) {
    const bubble = messageElement.querySelector('.ai-message-bubble');
    if (bubble) {
        bubble.innerHTML = formatAIMessage(content) + '<span class="streaming-cursor"><span class="cursor-bar"></span></span>';
        
        // 自动滚动到底部
        const messagesContainer = document.getElementById('aiChatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// 完成流式消息
function finalizeAIStreamingMessage(messageElement) {
    messageElement.removeAttribute('data-streaming');
    const cursor = messageElement.querySelector('.streaming-cursor');
    if (cursor) {
        cursor.remove();
    }
}

// 格式化AI消息（支持完整的markdown）
function formatAIMessage(content) {
    // 转义HTML标签
    content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 代码块 ```language\ncode\n```
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });
    
    // 行内代码 `code`
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 标题 ### Title
    content = content.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // 加粗 **text**
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // 斜体 *text*（避免与列表冲突）
    content = content.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');
    
    // 无序列表 - item 或 * item
    content = content.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    content = content.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // 有序列表 1. item
    content = content.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // 链接 [text](url)
    content = content.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 水平线 ---
    content = content.replace(/^---$/gm, '<hr>');
    
    // 引用 > text
    content = content.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // 表格处理（简单实现）
    // 先移除表格分隔符行（如 |-----|-----|）
    content = content.replace(/^\|[\s\-:|]+\|$/gm, '');
    
    // 转换表格行
    content = content.replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter(cell => cell.trim());
        const cellsHtml = cells.map(cell => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cellsHtml}</tr>`;
    });
    content = content.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="ai-table">$&</table>');
    
    // 清理块级元素周围的多余换行符，避免产生过多空白
    // 1. 先将多个连续换行统一为最多两个
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // 2. 移除块级开始标签前的换行
    content = content.replace(/\n+(<(h[1-6]|table|ul|ol|blockquote|pre|hr)>)/g, '\n$1');
    
    // 3. 移除块级结束标签后的多余换行，只保留一个
    content = content.replace(/(<\/(h[1-6]|table|ul|ol|blockquote|pre)>)\n+/g, '$1\n');
    content = content.replace(/(<hr>)\n+/g, '$1\n');
    
    // 4. 移除表格内部的换行（表格行之间）
    content = content.replace(/(<\/tr>)\n+(<tr>)/g, '$1$2');
    
    // 5. 按行分割，处理每一行
    const lines = content.split('\n').filter(line => line.trim());
    const result = [];
    let inParagraph = false;
    let paragraphLines = [];
    
    lines.forEach((line, index) => {
        // 检查是否是块级元素
        const isBlockStart = line.match(/^<(h[1-6]|table|ul|ol|blockquote|pre|hr)/);
        const isBlockEnd = line.match(/<\/(h[1-6]|table|ul|ol|blockquote|pre)>$/) || line.match(/<hr>$/);
        const isBlock = isBlockStart || isBlockEnd;
        
        if (isBlock) {
            // 如果正在段落中，先结束段落
            if (inParagraph && paragraphLines.length > 0) {
                result.push('<p>' + paragraphLines.join('<br>') + '</p>');
                paragraphLines = [];
                inParagraph = false;
            }
            // 添加块级元素
            result.push(line);
        } else {
            // 普通文本，加入段落
            if (!inParagraph) {
                inParagraph = true;
            }
            paragraphLines.push(line);
        }
    });
    
    // 处理最后剩余的段落
    if (paragraphLines.length > 0) {
        result.push('<p>' + paragraphLines.join('<br>') + '</p>');
    }
    
    return result.join('');
}

// 添加AI思考中的动画
function appendAIThinkingMessage() {
    const messagesContainer = document.getElementById('aiChatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message assistant';
    messageDiv.id = 'ai-thinking-message';
    
    messageDiv.innerHTML = `
        <div class="ai-message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <div class="ai-message-content">
            <div class="ai-message-bubble">
                <div class="ai-thinking">
                    <div class="ai-thinking-dot"></div>
                    <div class="ai-thinking-dot"></div>
                    <div class="ai-thinking-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// 添加错误消息
function appendAIErrorMessage(errorMessage, lastUserMessage) {
    const messagesContainer = document.getElementById('aiChatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message assistant';
    
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="ai-message-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <div class="ai-message-content">
            <div class="ai-message-bubble">
                抱歉，处理您的请求时出现错误。
                <div class="ai-error-message">错误信息：${errorMessage}</div>
                <div style="margin-top: 8px; font-size: 13px;">
                    请检查：<br>
                    1. AI配置是否正确（设置页面）<br>
                    2. API Key是否有效<br>
                    3. 网络连接是否正常
                </div>
                <button class="ai-retry-btn" onclick="retryLastAIMessage('${encodeURIComponent(lastUserMessage)}')">
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    重试
                </button>
            </div>
            <div class="ai-message-time">${timestamp}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 重试上一条AI消息
function retryLastAIMessage(encodedMessage) {
    const message = decodeURIComponent(encodedMessage);
    // 移除最后一条用户消息和错误消息
    if (aiChatHistory.length >= 1 && aiChatHistory[aiChatHistory.length - 1].role === 'user') {
        aiChatHistory.pop();
    }
    
    // 移除界面上的错误消息
    const messagesContainer = document.getElementById('aiChatMessages');
    const lastMessage = messagesContainer.lastElementChild;
    if (lastMessage) {
        lastMessage.remove();
    }
    
    // 重新发送
    sendAIMessage(message);
}

// 清空AI对话
async function clearAIChat() {
    const confirmed = await showConfirm('确定要清空所有对话记录吗？', '清空对话');
    if (confirmed) {
        aiChatHistory = [];
        const messagesContainer = document.getElementById('aiChatMessages');
        messagesContainer.innerHTML = `
            <div class="ai-welcome-message">
                <div class="ai-welcome-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h3>你好！我是你的AI运动助手</h3>
                <p>我可以帮你：</p>
                <ul>
                    <li>📊 分析你的运动数据和趋势</li>
                    <li>🎯 制定个性化的训练计划</li>
                    <li>💡 根据历史数据给出改进建议</li>
                    <li>📈 回答关于配速、频率等的问题</li>
                </ul>
                <p class="ai-hint">💬 试试问我："这个月的跑步数据怎么样？"</p>
            </div>
        `;
        showToast('对话已清空', 'success');
    }
}

// 绑定AI相关事件
function bindAIEvents() {
    // AI配置表单提交
    const aiConfigForm = document.getElementById('aiConfigForm');
    if (aiConfigForm) {
        aiConfigForm.addEventListener('submit', saveAIConfig);
    }
    
    // 清空对话按钮
    const clearAIChatBtn = document.getElementById('clearAIChatBtn');
    if (clearAIChatBtn) {
        clearAIChatBtn.addEventListener('click', clearAIChat);
    }
    
    // AI发送按钮
    const aiSendButton = document.getElementById('aiSendButton');
    if (aiSendButton) {
        aiSendButton.addEventListener('click', () => {
            const input = document.getElementById('aiChatInput');
            if (input && input.value.trim()) {
                sendAIMessage(input.value);
            }
        });
    }
    
    // AI输入框 - 回车发送，Shift+回车换行
    const aiChatInput = document.getElementById('aiChatInput');
    if (aiChatInput) {
        aiChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (aiChatInput.value.trim()) {
                    sendAIMessage(aiChatInput.value);
                }
            }
        });
        
        // 自动调整输入框高度
        aiChatInput.addEventListener('input', () => {
            aiChatInput.style.height = 'auto';
            aiChatInput.style.height = Math.min(aiChatInput.scrollHeight, 120) + 'px';
        });
    }
    
    // 快速问题按钮
    const quickButtons = document.querySelectorAll('.ai-quick-btn');
    quickButtons.forEach(button => {
        button.addEventListener('click', () => {
            const question = button.getAttribute('data-question');
            if (question) {
                const input = document.getElementById('aiChatInput');
                if (input) {
                    input.value = question;
                    sendAIMessage(question);
                }
            }
        });
    });
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadAIConfig();
    bindAIEvents();
});
