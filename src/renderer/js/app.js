const CONSTANTS = {
    CHART_SCROLL_DELAY: 150,
    TOAST_DURATION: 3000,
    TOAST_FADE_OUT: 2700,
    DEFAULT_DATE_RANGE: 30
};

let exerciseData = [];
const charts = {
    pace: null,
    strength: null,
    running: null
};
let currentTab = 'daily';
let currentChartType = 'line';
let currentPage = 'record';

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
    
    DOM.chartWrappers = {
        pace: document.getElementById('paceChartWrapper'),
        strength: document.getElementById('strengthChartWrapper'),
        running: document.getElementById('runningChartWrapper')
    };
    
    DOM.chartCheckboxes = {
        pace: document.getElementById('showPaceChart'),
        strength: document.getElementById('showStrengthChart'),
        running: document.getElementById('showRunningChart')
    };
}

function initializeApp() {
    cacheDOMElements();
    
    const today = new Date();
    DOM.date.valueAsDate = today;
    DOM.endDate.valueAsDate = today;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - CONSTANTS.DEFAULT_DATE_RANGE);
    DOM.startDate.valueAsDate = startDate;

    bindEventListeners();
    loadData();
    loadSettings();
}

function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    const targetPage = document.getElementById(pageName + 'Page');
    const targetNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    
    if (targetPage) targetPage.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    currentPage = pageName;

    if (pageName === 'stats') {
        setTimeout(updateCharts, 100);
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

    Object.keys(DOM.chartCheckboxes).forEach(key => {
        DOM.chartCheckboxes[key].addEventListener('change', function() {
            const wrapper = DOM.chartWrappers[key];
            wrapper.style.display = this.checked ? 'block' : 'none';
            if (this.checked) {
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
}

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

function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.trim() === '') return 0;
    const parts = timeStr.split(':');
    if (parts.length === 3) {
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

    const sortedData = [...exerciseData].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedData.forEach(record => {
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

    if (DOM.chartCheckboxes.pace.checked) {
        drawPaceChart(labels, datasets.paceData);
    }

    if (DOM.chartCheckboxes.strength.checked) {
        drawStrengthChart(labels, datasets.pushupsData, datasets.squatsData, datasets.mountainClimbersData);
    }

    if (DOM.chartCheckboxes.running.checked) {
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

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initializeApp);
