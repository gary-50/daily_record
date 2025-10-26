const CONSTANTS = {
    CHART_SCROLL_DELAY: 150,
    TOAST_DURATION: 3000,
    TOAST_FADE_OUT: 2700,
    DEFAULT_DATE_RANGE: 30,
    COUNT_ANIMATION_DURATION: 1000,
    HEATMAP_DAYS: 364,
    HEATMAP_TOTAL_CELLS: 371,
    MAX_INPUT_HEIGHT: 120,
    SUMMARY_TEXT_LIMIT: 30,
    SUMMARY_TEXT_LIMIT_DIET: 20
};

let exerciseData = [];
let filteredData = [];
let dietData = [];
let filteredDietData = [];
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
    
    // 饮食记录相关
    DOM.dietForm = document.getElementById('dietForm');
    DOM.dietDate = document.getElementById('dietDate');
    DOM.dietRecordSearch = document.getElementById('dietRecordSearch');
    DOM.dietEmptyState = document.getElementById('dietEmptyState');
    DOM.dietCardsContainer = document.getElementById('dietCardsContainer');
    
    // 初始化：只显示配速图表
    DOM.chartWrappers.pace.style.display = 'block';
    DOM.chartWrappers.strength.style.display = 'none';
    DOM.chartWrappers.running.style.display = 'none';
}

function initializeApp() {
    cacheDOMElements();
    
    const today = new Date();
    DOM.date.valueAsDate = today;
    DOM.dietDate.valueAsDate = today;
    DOM.endDate.valueAsDate = today;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - CONSTANTS.DEFAULT_DATE_RANGE);
    DOM.startDate.valueAsDate = startDate;

    initTheme();
    bindEventListeners();
    loadData();
    loadDietData();
    loadSettings();
}

function switchPage(pageName) {
    if (currentPage === pageName) return;

    const targetPage = document.getElementById(pageName + 'Page');
    const targetNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    if (targetNav) targetNav.classList.add('active');

    if (targetPage) {
        requestAnimationFrame(() => targetPage.classList.add('active'));
    }

    currentPage = pageName;

    if (pageName === 'stats') {
        setTimeout(() => {
            updateEmptyStates();
            renderHeatmap();
            updateCharts();
        }, CONSTANTS.CHART_SCROLL_DELAY);
    } else if (pageName === 'history') {
        setTimeout(() => {
            updateEmptyStates();
            updateDietEmptyState();
        }, CONSTANTS.CHART_SCROLL_DELAY);
    }
}

function bindEventListeners() {
    DOM.exerciseForm.addEventListener('submit', handleFormSubmit);
    DOM.dietForm.addEventListener('submit', handleDietFormSubmit);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            switchPage(this.dataset.page);
        });
    });

    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveClass('.tab-btn[data-tab]', this);
            currentTab = this.dataset.tab;
            updateCharts();
        });
    });

    document.querySelectorAll('.tab-btn[data-chart]').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveClass('.tab-btn[data-chart]', this);
            currentChartType = this.dataset.chart;
            updateCharts();
        });
    });

    // 图表选择按钮事件
    document.querySelectorAll('.chart-option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartType = this.dataset.chart;
            setActiveClass('.chart-option-btn', this);
            
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
            setActiveClass('.theme-mode-btn', this);
            setTheme(this.dataset.mode);
        });
    });

    document.querySelectorAll('.theme-color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveClass('.theme-color-btn', this);
            setThemeColor(this.dataset.color);
        });
    });

    // 搜索框事件
    if (DOM.recordSearch) {
        DOM.recordSearch.addEventListener('input', handleSearch);
    }
    if (DOM.dietRecordSearch) {
        DOM.dietRecordSearch.addEventListener('input', handleDietSearch);
    }

    // 表格排序事件
    document.querySelectorAll('.records-table th.sortable').forEach(th => {
        th.addEventListener('click', function() {
            handleSort(this.dataset.sort);
        });
    });

    // Record页面tab切换
    document.querySelectorAll('[data-record-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.recordTab;
            setActiveClass('[data-record-tab]', this);
            
            // 切换tab内容
            document.querySelectorAll('.record-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            if (tabName === 'exercise') {
                document.getElementById('exerciseRecordTab').style.display = 'block';
            } else if (tabName === 'diet') {
                document.getElementById('dietRecordTab').style.display = 'block';
            }
        });
    });

    // History页面tab切换
    document.querySelectorAll('[data-history-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.historyTab;
            setActiveClass('[data-history-tab]', this);
            
            // 切换tab内容
            document.querySelectorAll('.history-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            if (tabName === 'exercise') {
                document.getElementById('exerciseHistoryTab').style.display = 'block';
            } else if (tabName === 'diet') {
                document.getElementById('dietHistoryTab').style.display = 'block';
            }
        });
    });

    // 跑步类型切换事件
    document.querySelectorAll('input[name="runType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const longRunSection = document.getElementById('longRunSection');
            const speedEnduranceSection = document.getElementById('speedEnduranceSection');
            
            if (this.value === 'longRun') {
                longRunSection.style.display = 'block';
                speedEnduranceSection.style.display = 'none';
            } else if (this.value === 'speedEndurance') {
                longRunSection.style.display = 'none';
                speedEnduranceSection.style.display = 'block';
            }
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

async function loadDietData() {
    try {
        dietData = await window.electronAPI.getDietRecords();
        filteredDietData = [...dietData];
        displayDietRecords();
        updateDietEmptyState();
    } catch (error) {
        console.error('加载饮食数据错误:', error);
        showToast('加载饮食数据失败', 'error');
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

const TOAST_ICONS = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${TOAST_ICONS[type]}
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

function showConfirm(message, title = '确认操作') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

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

        dialog.onclick = (e) => e.stopPropagation();

        const handleClick = (confirmed) => {
            overlay.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                overlay.remove();
                resolve(confirmed);
            }, 200);
        };

        dialog.querySelector('[data-action="cancel"]').onclick = () => handleClick(false);
        dialog.querySelector('[data-action="confirm"]').onclick = () => handleClick(true);
        overlay.onclick = () => handleClick(false);

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

function setActiveClass(selector, activeElement) {
    document.querySelectorAll(selector).forEach(el => el.classList.remove('active'));
    if (activeElement) activeElement.classList.add('active');
}

async function submitFormWithFeedback(e, getRecordData, saveMethod, loadMethod, successMsg) {
    e.preventDefault();
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span>保存中...</span>';

    try {
        const record = getRecordData();
        const result = await saveMethod(record);

        if (result.success) {
            await loadMethod();
            e.target.reset();
            showToast(successMsg, 'success');
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        console.error('保存数据错误:', error);
        showToast('保存失败：' + error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

async function handleFormSubmit(e) {
    const runType = document.querySelector('input[name="runType"]:checked').value;
    
    const baseRecord = {
        date: DOM.date.value,
        runTime: document.getElementById('runTime').value || '',
        pushups: parseInt(document.getElementById('pushups').value) || 0,
        squats: parseInt(document.getElementById('squats').value) || 0,
        mountainClimbers: parseInt(document.getElementById('mountainClimbers').value) || 0,
        feeling: document.getElementById('feeling').value,
        runType: runType
    };

    if (runType === 'longRun') {
        baseRecord.runDurationSeconds = timeToSeconds(document.getElementById('runDuration').value);
        baseRecord.runDistance = parseFloat(document.getElementById('runDistance').value) || 0;
    } else if (runType === 'speedEndurance') {
        baseRecord.distancePerSet = parseInt(document.getElementById('distancePerSet').value) || 0;
        baseRecord.sets = parseInt(document.getElementById('sets').value) || 0;
        baseRecord.pacePerSet = document.getElementById('pacePerSet').value || '';
        baseRecord.speedEnduranceNotes = document.getElementById('speedEnduranceNotes').value || '';
    }

    await submitFormWithFeedback(
        e,
        () => baseRecord,
        window.electronAPI.saveRecord,
        loadData,
        '记录已保存！'
    );
    DOM.date.valueAsDate = new Date();
}

async function handleDietFormSubmit(e) {
    await submitFormWithFeedback(
        e,
        () => ({
            date: DOM.dietDate.value,
            waterCups: parseInt(document.getElementById('waterCups').value) || 0,
            snacks: document.getElementById('snacks').value || '',
            breakfast: {
                time: document.getElementById('breakfastTime').value || '',
                foods: document.getElementById('breakfastFoods').value || '',
                notes: document.getElementById('breakfastNotes').value || ''
            },
            lunch: {
                time: document.getElementById('lunchTime').value || '',
                foods: document.getElementById('lunchFoods').value || '',
                notes: document.getElementById('lunchNotes').value || ''
            },
            dinner: {
                time: document.getElementById('dinnerTime').value || '',
                foods: document.getElementById('dinnerFoods').value || '',
                notes: document.getElementById('dinnerNotes').value || ''
            }
        }),
        window.electronAPI.saveDietRecord,
        loadDietData,
        '饮食记录已保存！'
    );
    DOM.dietDate.valueAsDate = new Date();
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
        const runType = record.runType || 'longRun';
        const feeling = record.feeling || '-';
        
        let overviewRow, detailContent;

        if (runType === 'speedEndurance') {
            // 跑速耐记录
            const distancePerSet = record.distancePerSet || 0;
            const sets = record.sets || 0;
            const pacePerSet = record.pacePerSet || '-';
            const speedEnduranceNotes = record.speedEnduranceNotes || '-';
            
            overviewRow = `
                <td class="toggle-cell" onclick="toggleExerciseRow(this)">
                    <svg class="row-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </td>
                <td>${record.date}</td>
                <td>${record.runTime || '-'}</td>
                <td colspan="2"><span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">跑速耐</span> ${distancePerSet}米×${sets}组</td>
            `;
            
            detailContent = `
                <div class="detail-section">
                    <div class="detail-item">
                        <label>每组距离</label>
                        <span>${distancePerSet}米</span>
                    </div>
                    <div class="detail-item">
                        <label>组数</label>
                        <span>${sets}组</span>
                    </div>
                    <div class="detail-item">
                        <label>配速</label>
                        <span>${pacePerSet}</span>
                    </div>
                    <div class="detail-item">
                        <label>总距离</label>
                        <span>${(distancePerSet * sets / 1000).toFixed(2)}公里</span>
                    </div>
                </div>
                ${speedEnduranceNotes !== '-' ? `
                    <div class="detail-feeling">
                        <label>备注：</label>
                        <p>${speedEnduranceNotes}</p>
                    </div>
                ` : ''}
                ${record.pushups || record.squats || record.mountainClimbers ? `
                    <div class="detail-section">
                        ${record.pushups ? `<div class="detail-item"><label>俯卧撑</label><span>${record.pushups}</span></div>` : ''}
                        ${record.squats ? `<div class="detail-item"><label>深蹲</label><span>${record.squats}</span></div>` : ''}
                        ${record.mountainClimbers ? `<div class="detail-item"><label>登山跑</label><span>${record.mountainClimbers}</span></div>` : ''}
                    </div>
                ` : ''}
                ${feeling !== '-' ? `
                    <div class="detail-feeling">
                        <label>体感记录：</label>
                        <p>${feeling}</p>
                    </div>
                ` : ''}
            `;
        } else {
            // 长跑记录
            const durationSeconds = record.runDurationSeconds || (record.runDuration ? record.runDuration * 60 : 0);
            const durationDisplay = secondsToTime(durationSeconds);
            const pace = calculatePace(durationSeconds, record.runDistance);
            
            overviewRow = `
                <td class="toggle-cell" onclick="toggleExerciseRow(this)">
                    <svg class="row-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </td>
                <td>${record.date}</td>
                <td>${record.runTime || '-'}</td>
                <td>${durationDisplay}</td>
                <td>${record.runDistance || '-'}</td>
            `;
            
            detailContent = `
                <div class="detail-section">
                    <div class="detail-item">
                        <label>配速</label>
                        <span>${pace}</span>
                    </div>
                    <div class="detail-item">
                        <label>俯卧撑</label>
                        <span>${record.pushups || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>深蹲</label>
                        <span>${record.squats || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>登山跑</label>
                        <span>${record.mountainClimbers || '-'}</span>
                    </div>
                </div>
                ${feeling !== '-' ? `
                    <div class="detail-feeling">
                        <label>体感记录：</label>
                        <p>${feeling}</p>
                    </div>
                ` : ''}
            `;
        }

        // 创建概览行
        const tr = document.createElement('tr');
        tr.className = 'record-row';
        tr.innerHTML = overviewRow;
        
        // 创建详情行（默认隐藏）
        const detailRow = document.createElement('tr');
        detailRow.className = 'record-detail-row';
        detailRow.style.display = 'none';
        detailRow.innerHTML = `
            <td colspan="5">
                <div class="record-detail-content">
                    ${detailContent}
                    <div class="detail-actions">
                        <button class="edit-btn" onclick="editRecord(${record.id})">编辑</button>
                        <button class="delete-btn" onclick="deleteRecord(${record.id})">删除记录</button>
                    </div>
                </div>
            </td>
        `;
        
        DOM.recordsBody.appendChild(tr);
        DOM.recordsBody.appendChild(detailRow);
    });

    updateSortIcons();
}

function toggleExerciseRow(cell) {
    const row = cell.parentElement;
    const detailRow = row.nextElementSibling;
    const icon = cell.querySelector('.row-toggle-icon');
    
    if (detailRow.style.display === 'none') {
        detailRow.style.display = '';
        row.classList.add('expanded');
    } else {
        detailRow.style.display = 'none';
        row.classList.remove('expanded');
    }
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
 * 编辑记录
 */
function editRecord(id) {
    const record = exerciseData.find(r => r.id === id);
    if (!record) {
        showToast('记录不存在', 'error');
        return;
    }
    
    showEditModal(record);
}

/**
 * 显示编辑弹窗
 */
function showEditModal(record) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.onclick = (e) => e.stopPropagation();
    
    const runType = record.runType || 'longRun';
    const isSpeedEndurance = runType === 'speedEndurance';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h3>编辑锻炼记录</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <div class="modal-body">
            <form id="editExerciseForm">
                <input type="hidden" id="editRecordId" value="${record.id}">
                
                <div class="form-section">
                    <h4 class="section-title">基本信息</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editDate">日期</label>
                            <input type="date" id="editDate" value="${record.date}" required>
                        </div>
                        <div class="form-group">
                            <label for="editRunTime">跑步时间</label>
                            <input type="time" id="editRunTime" value="${record.runTime || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4 class="section-title">跑步类型</h4>
                    <div class="form-group">
                        <div style="display: flex; gap: 1rem;">
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="editRunType" value="longRun" ${!isSpeedEndurance ? 'checked' : ''} style="margin-right: 0.5rem;">
                                <span>长跑</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="editRunType" value="speedEndurance" ${isSpeedEndurance ? 'checked' : ''} style="margin-right: 0.5rem;">
                                <span>跑速耐</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="form-section" id="editLongRunSection" style="${isSpeedEndurance ? 'display: none;' : ''}">
                    <h4 class="section-title">跑步数据</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editRunDuration">时长</label>
                            <input type="time" id="editRunDuration" step="1" value="${secondsToTime(record.runDurationSeconds || 0)}">
                        </div>
                        <div class="form-group">
                            <label for="editRunDistance">距离（公里）</label>
                            <input type="number" id="editRunDistance" min="0" step="0.01" value="${record.runDistance || 0}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section" id="editSpeedEnduranceSection" style="${!isSpeedEndurance ? 'display: none;' : ''}">
                    <h4 class="section-title">跑速耐数据</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editDistancePerSet">每组距离（米）</label>
                            <input type="number" id="editDistancePerSet" min="0" step="1" value="${record.distancePerSet || 0}">
                        </div>
                        <div class="form-group">
                            <label for="editSets">组数</label>
                            <input type="number" id="editSets" min="0" step="1" value="${record.sets || 0}">
                        </div>
                        <div class="form-group">
                            <label for="editPacePerSet">配速（分'秒"）</label>
                            <input type="text" id="editPacePerSet" value="${record.pacePerSet || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editSpeedEnduranceNotes">备注</label>
                        <textarea id="editSpeedEnduranceNotes" rows="3">${record.speedEnduranceNotes || ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4 class="section-title">力量训练</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editPushups">俯卧撑（个）</label>
                            <input type="number" id="editPushups" min="0" step="1" value="${record.pushups || 0}">
                        </div>
                        <div class="form-group">
                            <label for="editSquats">深蹲（个）</label>
                            <input type="number" id="editSquats" min="0" step="1" value="${record.squats || 0}">
                        </div>
                        <div class="form-group">
                            <label for="editMountainClimbers">登山跑（个）</label>
                            <input type="number" id="editMountainClimbers" min="0" step="1" value="${record.mountainClimbers || 0}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4 class="section-title">体感记录</h4>
                    <div class="form-group">
                        <textarea id="editFeeling" rows="4">${record.feeling || ''}</textarea>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                    <button type="submit" class="btn-primary">保存修改</button>
                </div>
            </form>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 跑步类型切换事件
    const editRunTypeRadios = modal.querySelectorAll('input[name="editRunType"]');
    editRunTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const longRunSection = modal.querySelector('#editLongRunSection');
            const speedEnduranceSection = modal.querySelector('#editSpeedEnduranceSection');
            
            if (this.value === 'longRun') {
                longRunSection.style.display = 'block';
                speedEnduranceSection.style.display = 'none';
            } else {
                longRunSection.style.display = 'none';
                speedEnduranceSection.style.display = 'block';
            }
        });
    });
    
    // 表单提交事件
    const form = modal.querySelector('#editExerciseForm');
    form.addEventListener('submit', handleEditFormSubmit);
    
    overlay.onclick = () => overlay.remove();
}

/**
 * 处理编辑表单提交
 */
async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span>保存中...</span>';
    
    try {
        const recordId = parseInt(document.getElementById('editRecordId').value);
        const runType = document.querySelector('input[name="editRunType"]:checked').value;
        
        const updatedRecord = {
            id: recordId,
            date: document.getElementById('editDate').value,
            runTime: document.getElementById('editRunTime').value || '',
            pushups: parseInt(document.getElementById('editPushups').value) || 0,
            squats: parseInt(document.getElementById('editSquats').value) || 0,
            mountainClimbers: parseInt(document.getElementById('editMountainClimbers').value) || 0,
            feeling: document.getElementById('editFeeling').value,
            runType: runType
        };
        
        if (runType === 'longRun') {
            updatedRecord.runDurationSeconds = timeToSeconds(document.getElementById('editRunDuration').value);
            updatedRecord.runDistance = parseFloat(document.getElementById('editRunDistance').value) || 0;
        } else if (runType === 'speedEndurance') {
            updatedRecord.distancePerSet = parseInt(document.getElementById('editDistancePerSet').value) || 0;
            updatedRecord.sets = parseInt(document.getElementById('editSets').value) || 0;
            updatedRecord.pacePerSet = document.getElementById('editPacePerSet').value || '';
            updatedRecord.speedEnduranceNotes = document.getElementById('editSpeedEnduranceNotes').value || '';
        }
        
        const result = await window.electronAPI.updateRecord(updatedRecord);
        
        if (result.success) {
            await loadData();
            document.querySelector('.modal-overlay').remove();
            showToast('修改成功！', 'success');
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        console.error('更新数据错误:', error);
        showToast('保存失败：' + error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

function displayDietRecords() {
    const container = document.getElementById('dietCardsContainer');
    if (!container) return;
    
    container.innerHTML = '';

    if (filteredDietData.length === 0) {
        // 如果有原始数据但过滤后为空，说明是搜索无结果
        if (dietData.length > 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <svg style="width: 64px; height: 64px; margin: 0 auto 1rem; opacity: 0.3;" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8" stroke-width="2"/>
                        <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p style="font-size: 1.1rem; margin: 0;">未找到匹配的记录</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.7;">尝试使用其他关键词搜索</p>
                </div>
            `;
        }
        return;
    }

    let dataToDisplay = [...filteredDietData];
    dataToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date));

    dataToDisplay.forEach(record => {
        const card = document.createElement('div');
        card.className = 'diet-card';
        
        // 格式化日期显示
        const dateObj = new Date(record.date + 'T00:00:00');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[dateObj.getDay()];
        
        // 构建额外信息（饮水和零食）
        let extraInfo = '';
        if (record.waterCups > 0 || record.snacks) {
            extraInfo = '<div class="diet-extra-info">';
            if (record.waterCups > 0) {
                extraInfo += `
                    <div class="extra-info-item">
                        <svg class="extra-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>饮水 ${record.waterCups} 杯</span>
                    </div>
                `;
            }
            if (record.snacks) {
                extraInfo += `
                    <div class="extra-info-item">
                        <svg class="extra-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>零食: ${record.snacks}</span>
                    </div>
                `;
            }
            extraInfo += '</div>';
        }
        
        card.innerHTML = `
            <div class="diet-card-header" onclick="toggleDietCard(this.parentElement)">
                <div class="diet-card-date">
                    <h3>${record.date}</h3>
                    <span class="diet-card-weekday">${weekday}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <svg class="diet-card-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <button class="diet-card-edit" onclick="event.stopPropagation(); editDietRecord(${record.id})" title="编辑这天的记录">
                        <svg viewBox="0 0 24 24" fill="white">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                        <span>编辑</span>
                    </button>
                    <button class="diet-card-delete" onclick="event.stopPropagation(); deleteDietRecord(${record.id})" title="删除这天的记录">
                        <svg viewBox="0 0 24 24" fill="white">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        <span>删除</span>
                    </button>
                </div>
            </div>
            
            <div class="diet-card-content" style="display: none;">
                ${extraInfo}
                ${createMealSection('breakfast', '早餐', record.breakfast)}
                ${createMealSection('lunch', '午餐', record.lunch)}
                ${createMealSection('dinner', '晚餐', record.dinner)}
            </div>
        `;
        
        container.appendChild(card);
    });
}

function createMealSection(mealType, mealName, mealData) {
    const icons = {
        breakfast: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        lunch: '<path d="M12 2v20m-6-8h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        dinner: '<path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zM3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    
    if (!mealData || (!mealData.time && !mealData.foods && !mealData.notes)) {
        return `
            <div class="meal-section meal-empty">
                <div class="meal-header">
                    <svg class="meal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        ${icons[mealType]}
                    </svg>
                    <h4>${mealName}</h4>
                </div>
                <div class="meal-empty-text">未记录</div>
            </div>
        `;
    }
    
    return `
        <div class="meal-section">
            <div class="meal-header">
                <svg class="meal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    ${icons[mealType]}
                </svg>
                <h4>${mealName}</h4>
                ${mealData.time ? `<span class="meal-time">${mealData.time}</span>` : ''}
            </div>
            <div class="meal-body">
                ${mealData.foods ? `
                    <div class="meal-foods">
                        <svg class="meal-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 2a5 5 0 015 5v4a5 5 0 01-10 0V7a5 5 0 015-5zm0 13v7m-6 0h12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>${mealData.foods}</span>
                    </div>
                ` : ''}
                ${mealData.notes ? `
                    <div class="meal-notes">
                        <svg class="meal-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>${mealData.notes}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

async function deleteDietRecord(id) {
    const confirmed = await showConfirm('确定要删除这条饮食记录吗？', '删除确认');

    if (confirmed) {
        try {
            const result = await window.electronAPI.deleteDietRecord(id);

            if (result.success) {
                await loadDietData();
                showToast('删除成功', 'success');
            } else {
                throw new Error(result.error || '删除失败');
            }
        } catch (error) {
            console.error('删除饮食数据错误:', error);
            showToast('删除失败：' + error.message, 'error');
        }
    }
}

/**
 * 编辑饮食记录
 */
function editDietRecord(id) {
    const record = dietData.find(r => r.id === id);
    if (!record) {
        showToast('记录不存在', 'error');
        return;
    }
    
    showEditDietModal(record);
}

/**
 * 显示编辑饮食记录弹窗
 */
function showEditDietModal(record) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.onclick = (e) => e.stopPropagation();
    
    modal.innerHTML = `
        <div class="modal-header">
            <h3>编辑饮食记录</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <div class="modal-body">
            <form id="editDietForm">
                <input type="hidden" id="editDietRecordId" value="${record.id}">
                
                <div class="form-section">
                    <h4 class="section-title">基本信息</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editDietDate">日期</label>
                            <input type="date" id="editDietDate" value="${record.date}" required>
                        </div>
                        <div class="form-group">
                            <label for="editWaterCups">饮水杯数</label>
                            <input type="number" id="editWaterCups" min="0" step="1" value="${record.waterCups || 0}">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4 class="section-title">零食与饮料</h4>
                    <div class="form-group">
                        <label for="editSnacks">零食饮料备注</label>
                        <textarea id="editSnacks" rows="3">${record.snacks || ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4 class="section-title">早餐</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editBreakfastTime">时间</label>
                            <input type="time" id="editBreakfastTime" value="${record.breakfast?.time || ''}">
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label for="editBreakfastFoods">食物</label>
                            <input type="text" id="editBreakfastFoods" value="${record.breakfast?.foods || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editBreakfastNotes">备注</label>
                        <textarea id="editBreakfastNotes" rows="2">${record.breakfast?.notes || ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4 class="section-title">午餐</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editLunchTime">时间</label>
                            <input type="time" id="editLunchTime" value="${record.lunch?.time || ''}">
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label for="editLunchFoods">食物</label>
                            <input type="text" id="editLunchFoods" value="${record.lunch?.foods || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editLunchNotes">备注</label>
                        <textarea id="editLunchNotes" rows="2">${record.lunch?.notes || ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h4 class="section-title">晚餐</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="editDinnerTime">时间</label>
                            <input type="time" id="editDinnerTime" value="${record.dinner?.time || ''}">
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label for="editDinnerFoods">食物</label>
                            <input type="text" id="editDinnerFoods" value="${record.dinner?.foods || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editDinnerNotes">备注</label>
                        <textarea id="editDinnerNotes" rows="2">${record.dinner?.notes || ''}</textarea>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">取消</button>
                    <button type="submit" class="btn-primary">保存修改</button>
                </div>
            </form>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 表单提交事件
    const form = modal.querySelector('#editDietForm');
    form.addEventListener('submit', handleEditDietFormSubmit);
    
    overlay.onclick = () => overlay.remove();
}

/**
 * 处理编辑饮食表单提交
 */
async function handleEditDietFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span>保存中...</span>';
    
    try {
        const recordId = parseInt(document.getElementById('editDietRecordId').value);
        
        const updatedRecord = {
            id: recordId,
            date: document.getElementById('editDietDate').value,
            waterCups: parseInt(document.getElementById('editWaterCups').value) || 0,
            snacks: document.getElementById('editSnacks').value || '',
            breakfast: {
                time: document.getElementById('editBreakfastTime').value || '',
                foods: document.getElementById('editBreakfastFoods').value || '',
                notes: document.getElementById('editBreakfastNotes').value || ''
            },
            lunch: {
                time: document.getElementById('editLunchTime').value || '',
                foods: document.getElementById('editLunchFoods').value || '',
                notes: document.getElementById('editLunchNotes').value || ''
            },
            dinner: {
                time: document.getElementById('editDinnerTime').value || '',
                foods: document.getElementById('editDinnerFoods').value || '',
                notes: document.getElementById('editDinnerNotes').value || ''
            }
        };
        
        const result = await window.electronAPI.updateDietRecord(updatedRecord);
        
        if (result.success) {
            await loadDietData();
            document.querySelector('.modal-overlay').remove();
            showToast('修改成功！', 'success');
        } else {
            throw new Error(result.error || '保存失败');
        }
    } catch (error) {
        console.error('更新饮食数据错误:', error);
        showToast('保存失败：' + error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

function handleDietSearch() {
    const searchTerm = DOM.dietRecordSearch.value.toLowerCase();
    
    if (!searchTerm) {
        filteredDietData = [...dietData];
    } else {
        filteredDietData = dietData.filter(record => {
            const date = record.date.toLowerCase();
            const snacks = (record.snacks || '').toLowerCase();
            const breakfastFoods = (record.breakfast?.foods || '').toLowerCase();
            const lunchFoods = (record.lunch?.foods || '').toLowerCase();
            const dinnerFoods = (record.dinner?.foods || '').toLowerCase();
            const breakfastNotes = (record.breakfast?.notes || '').toLowerCase();
            const lunchNotes = (record.lunch?.notes || '').toLowerCase();
            const dinnerNotes = (record.dinner?.notes || '').toLowerCase();
            
            return date.includes(searchTerm) || 
                   snacks.includes(searchTerm) ||
                   breakfastFoods.includes(searchTerm) || 
                   lunchFoods.includes(searchTerm) || 
                   dinnerFoods.includes(searchTerm) ||
                   breakfastNotes.includes(searchTerm) ||
                   lunchNotes.includes(searchTerm) ||
                   dinnerNotes.includes(searchTerm);
        });
    }
    
    displayDietRecords();
    updateDietEmptyState();
}

function toggleDietCard(card) {
    const content = card.querySelector('.diet-card-content');
    const toggle = card.querySelector('.diet-card-toggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        card.classList.add('expanded');
    } else {
        content.style.display = 'none';
        card.classList.remove('expanded');
    }
}

function updateDietEmptyState() {
    const hasData = dietData.length > 0;
    const hasFilteredData = filteredDietData.length > 0;
    
    if (!hasData) {
        // 没有任何数据，显示空状态
        DOM.dietEmptyState.style.display = 'flex';
        DOM.dietCardsContainer.style.display = 'none';
    } else if (hasData && !hasFilteredData) {
        // 有数据但搜索无结果，隐藏空状态但也隐藏容器（因为没有内容显示）
        DOM.dietEmptyState.style.display = 'none';
        DOM.dietCardsContainer.style.display = 'grid';
    } else {
        // 有过滤后的数据，显示容器
        DOM.dietEmptyState.style.display = 'none';
        DOM.dietCardsContainer.style.display = 'grid';
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

        // 兼容旧数据格式和跑速耐记录
        let durationSeconds = 0;
        let distance = 0;
        
        if (record.runType === 'speedEndurance') {
            // 跑速耐：计算总距离（米转公里）
            distance = (record.distancePerSet || 0) * (record.sets || 0) / 1000;
        } else {
            // 长跑
            durationSeconds = record.runDurationSeconds || (record.runDuration ? record.runDuration * 60 : 0);
            distance = record.runDistance || 0;
        }

        // 累加数据
        groupedData[key].runDurationSeconds += durationSeconds;
        groupedData[key].runDistance += distance;
        groupedData[key].pushups += record.pushups || 0;
        groupedData[key].squats += record.squats || 0;
        groupedData[key].mountainClimbers += record.mountainClimbers || 0;
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

    const paceData = labels.map(label => {
        const data = groupedData[label];
        return (data.runDurationSeconds > 0 && data.runDistance > 0) 
            ? data.runDurationSeconds / 60 / data.runDistance 
            : null;
    });

    const totals = labels.reduce((acc, label) => {
        const data = groupedData[label];
        ['runDurationSeconds', 'runDistance', 'pushups', 'squats', 'mountainClimbers'].forEach(field => {
            acc[field] += data[field];
        });
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
        runDistanceData: dataMapper('runDistance', true),
        paceData,
        pushupsData: dataMapper('pushups', true),
        squatsData: dataMapper('squats', true),
        mountainClimbersData: dataMapper('mountainClimbers', true)
    };
}

function drawPaceChart(labels, paceData) {
    const paceInSeconds = paceData.map(pace => pace ? pace * 60 : null);
    const formatPaceTime = (value) => {
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        return `${minutes}'${String(seconds).padStart(2, '0')}"`;
    };

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
            ticks: { callback: formatPaceTime }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const seconds = context.parsed.y;
                        return seconds === null ? '' : `配速: ${formatPaceTime(seconds)} /公里`;
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
    const createDataset = (label, data, color) => ({
        label, data, tension: 0.4, spanGaps: true,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)')
    });

    charts.strength = drawChart('strengthChart', charts.strength, labels, [
        createDataset('俯卧撑(个)', pushupsData, '#e74c3c'),
        createDataset('深蹲(个)', squatsData, '#f39c12'),
        createDataset('登山跑(个)', mountainClimbersData, '#9b59b6')
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
            const directory = config.dataDirectory || '加载失败';
            DOM.currentDataPath.textContent = directory;
            DOM.currentDataPath.title = `锻炼记录：${config.exerciseFile}\n饮食记录：${config.dietFile}`;
        }
        
        // 加载 Google 配置
        await loadGoogleConfig();
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
            showToast(`数据存储位置已更新！\n\n新目录：${result.newPath}\n\n包含文件：\n• exercise-data.json（锻炼记录）\n• diet-data.json（饮食记录）\n\n所有数据已从旧位置复制到新位置。`, 'success');
            DOM.currentDataPath.textContent = result.newPath;
            DOM.currentDataPath.title = `锻炼记录：${result.exerciseFile}\n饮食记录：${result.dietFile}`;
            await loadData();
            await loadDietData();
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
            const matchBasic = record.date.includes(searchTerm) ||
                   (record.feeling && record.feeling.toLowerCase().includes(searchTerm)) ||
                   (record.runTime && record.runTime.includes(searchTerm));
            
            // 搜索跑速耐相关字段
            const matchSpeedEndurance = record.runType === 'speedEndurance' && (
                (record.pacePerSet && record.pacePerSet.toLowerCase().includes(searchTerm)) ||
                (record.speedEnduranceNotes && record.speedEnduranceNotes.toLowerCase().includes(searchTerm)) ||
                (record.distancePerSet && record.distancePerSet.toString().includes(searchTerm)) ||
                (record.sets && record.sets.toString().includes(searchTerm))
            );
            
            return matchBasic || matchSpeedEndurance;
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

function renderHeatmap() {
    if (!DOM.heatmapGrid || exerciseData.length === 0) return;

    DOM.heatmapGrid.innerHTML = '';

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - CONSTANTS.HEATMAP_DAYS);

    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const exerciseMap = {};
    exerciseData.forEach(record => {
        const score = (record.runDistance || 0) +
                     (record.pushups || 0) * 0.01 +
                     (record.squats || 0) * 0.01 +
                     (record.mountainClimbers || 0) * 0.01;
        exerciseMap[record.date] = score;
    });

    const scores = Object.values(exerciseMap);
    const maxScore = Math.max(...scores, 1);

    for (let i = 0; i < CONSTANTS.HEATMAP_TOTAL_CELLS; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dateStr = date.toISOString().split('T')[0];
        const score = exerciseMap[dateStr] || 0;

        let level = 0;
        if (score > 0) {
            level = Math.min(Math.ceil((score / maxScore) * 4), 4);
        }

        const cell = document.createElement('div');
        cell.className = 'heatmap-day';
        cell.setAttribute('data-level', level);
        cell.setAttribute('data-date', dateStr);
        cell.setAttribute('data-score', score.toFixed(2));

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

function showSkeletonLoading() {
    if (currentPage === 'stats' && DOM.statsGrid) {
        const skeletonCards = Array(6).fill('<div class="skeleton skeleton-card"></div>').join('');
        DOM.statsGrid.innerHTML = skeletonCards;
    }
}

function hideSkeletonLoading() {
    // Skeleton will be replaced by actual content
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
        // 获取用户选择的数据类型
        const dataType = document.querySelector('input[name="aiDataType"]:checked')?.value || 'all';
        
        // 准备上下文：根据选择的数据类型获取摘要
        let recentData = '';
        let roleDescription = '';
        
        if (dataType === 'exercise') {
            recentData = getRecentDataSummary();
            roleDescription = '你是一个专业的运动健身教练。以下是用户的运动数据：';
        } else if (dataType === 'diet') {
            recentData = getDietDataSummary();
            roleDescription = '你是一个专业的营养师。以下是用户的饮食数据：';
        } else {
            const exerciseSummary = getRecentDataSummary();
            const dietSummary = getDietDataSummary();
            recentData = `=== 运动数据 ===\n${exerciseSummary}\n\n=== 饮食数据 ===\n${dietSummary}`;
            roleDescription = '你是一个专业的健康顾问，同时具备运动健身和营养学知识。以下是用户的运动和饮食数据：';
        }
        
        const systemPrompt = `${roleDescription}\n${recentData}\n请根据这些数据回答用户的问题，提供专业的建议。`;
        
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

function truncateText(text, limit) {
    if (!text) return '-';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
}

function getRecentDataSummary() {
    if (exerciseData.length === 0) {
        return '用户暂无运动记录。';
    }
    
    // 获取所有数据，按日期排序（从旧到新）
    const sortedData = [...exerciseData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 统计总体数据
    const longRuns = sortedData.filter(r => r.runType !== 'speedEndurance' && r.runDistance > 0);
    const speedEnduranceRuns = sortedData.filter(r => r.runType === 'speedEndurance');
    
    const totalDistance = sortedData.reduce((sum, r) => {
        if (r.runType === 'speedEndurance') {
            return sum + ((r.distancePerSet || 0) * (r.sets || 0) / 1000);
        }
        return sum + (r.runDistance || 0);
    }, 0);
    const totalDuration = sortedData.reduce((sum, r) => sum + (r.runDurationSeconds || 0), 0);
    const totalPushups = sortedData.reduce((sum, r) => sum + (r.pushups || 0), 0);
    const totalSquats = sortedData.reduce((sum, r) => sum + (r.squats || 0), 0);
    const totalMountainClimbers = sortedData.reduce((sum, r) => sum + (r.mountainClimbers || 0), 0);
    
    let summary = `运动数据总览：\n`;
    summary += `- 总记录天数：${sortedData.length}天\n`;
    if (longRuns.length > 0) {
        summary += `- 长跑次数：${longRuns.length}次\n`;
    }
    if (speedEnduranceRuns.length > 0) {
        summary += `- 跑速耐训练次数：${speedEnduranceRuns.length}次\n`;
    }
    if (totalDistance > 0) {
        summary += `- 总跑步距离：${totalDistance.toFixed(2)}公里\n`;
    }
    if (totalDuration > 0) {
        summary += `- 总跑步时长：${Math.floor(totalDuration / 60)}分钟\n`;
        const avgPace = totalDistance > 0 ? (totalDuration / 60 / totalDistance).toFixed(2) : 0;
        if (avgPace > 0) summary += `- 平均配速：${avgPace}分钟/公里\n`;
    }
    if (totalPushups > 0) summary += `- 俯卧撑总数：${totalPushups}个\n`;
    if (totalSquats > 0) summary += `- 深蹲总数：${totalSquats}个\n`;
    if (totalMountainClimbers > 0) summary += `- 登山跑总数：${totalMountainClimbers}个\n`;
    
    summary += `\n详细每日数据：\n`;
    summary += `日期 | 类型 | 跑步时间 | 详细信息 | 俯卧撑 | 深蹲 | 登山跑 | 体感/备注\n`;
    summary += `${'─'.repeat(120)}\n`;
    
    sortedData.forEach(record => {
        const date = record.date;
        const runTime = record.runTime || '-';
        const pushups = record.pushups > 0 ? record.pushups : '-';
        const squats = record.squats > 0 ? record.squats : '-';
        const mountainClimbers = record.mountainClimbers > 0 ? record.mountainClimbers : '-';
        
        let type = '';
        let details = '';
        let notes = '';
        
        if (record.runType === 'speedEndurance') {
            type = '跑速耐';
            const distancePerSet = record.distancePerSet || 0;
            const sets = record.sets || 0;
            const pacePerSet = record.pacePerSet || '-';
            details = `${distancePerSet}米×${sets}组, 配速:${pacePerSet}`;
            notes = truncateText(record.speedEnduranceNotes, CONSTANTS.SUMMARY_TEXT_LIMIT);
        } else {
            type = '长跑';
            const distance = record.runDistance > 0 ? record.runDistance.toFixed(2) + 'km' : '-';
            const durationSeconds = record.runDurationSeconds || 0;
            const duration = durationSeconds > 0 ? secondsToTime(durationSeconds) : '-';
            const pace = calculatePace(durationSeconds, record.runDistance);
            details = `距离:${distance}, 时长:${duration}, 配速:${pace}`;
            notes = truncateText(record.feeling, CONSTANTS.SUMMARY_TEXT_LIMIT);
        }
        
        summary += `${date} | ${type} | ${runTime} | ${details} | ${pushups} | ${squats} | ${mountainClimbers} | ${notes}\n`;
    });
    
    return summary;
}

// 获取饮食数据摘要
function getDietDataSummary() {
    if (dietData.length === 0) {
        return '用户暂无饮食记录。';
    }
    
    // 获取所有数据，按日期排序（从旧到新）
    const sortedData = [...dietData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let summary = `饮食数据总览：\n`;
    summary += `- 总记录天数：${sortedData.length}天\n\n`;
    
    summary += `详细每日饮食数据：\n`;
    summary += `日期 | 早餐时间 | 早餐食物 | 早餐备注 | 午餐时间 | 午餐食物 | 午餐备注 | 晚餐时间 | 晚餐食物 | 晚餐备注\n`;
    summary += `${'─'.repeat(150)}\n`;
    
    sortedData.forEach(record => {
        const date = record.date;
        const breakfastTime = record.breakfast?.time || '-';
        const breakfastFoods = record.breakfast?.foods || '-';
        const breakfastNotes = truncateText(record.breakfast?.notes, CONSTANTS.SUMMARY_TEXT_LIMIT_DIET);
        const lunchTime = record.lunch?.time || '-';
        const lunchFoods = record.lunch?.foods || '-';
        const lunchNotes = truncateText(record.lunch?.notes, CONSTANTS.SUMMARY_TEXT_LIMIT_DIET);
        const dinnerTime = record.dinner?.time || '-';
        const dinnerFoods = record.dinner?.foods || '-';
        const dinnerNotes = truncateText(record.dinner?.notes, CONSTANTS.SUMMARY_TEXT_LIMIT_DIET);
        
        summary += `${date} | ${breakfastTime} | ${breakfastFoods} | ${breakfastNotes} | ${lunchTime} | ${lunchFoods} | ${lunchNotes} | ${dinnerTime} | ${dinnerFoods} | ${dinnerNotes}\n`;
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

function formatAIMessage(content) {
    content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

    content = content.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/(?<!\*)\*([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>');

    content = content.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    content = content.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    content = content.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    content = content.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    content = content.replace(/^---$/gm, '<hr>');
    content = content.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    content = content.replace(/^\|[\s\-:|]+\|$/gm, '');
    content = content.replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter(cell => cell.trim());
        const cellsHtml = cells.map(cell => `<td>${cell.trim()}</td>`).join('');
        return `<tr>${cellsHtml}</tr>`;
    });
    content = content.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="ai-table">$&</table>');

    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.replace(/\n+(<(h[1-6]|table|ul|ol|blockquote|pre|hr)>)/g, '\n$1');
    content = content.replace(/(<\/(h[1-6]|table|ul|ol|blockquote|pre)>)\n+/g, '$1\n');
    content = content.replace(/(<hr>)\n+/g, '$1\n');
    content = content.replace(/(<\/tr>)\n+(<tr>)/g, '$1$2');

    const lines = content.split('\n').filter(line => line.trim());
    const result = [];
    let inParagraph = false;
    let paragraphLines = [];

    lines.forEach((line) => {
        const isBlockStart = line.match(/^<(h[1-6]|table|ul|ol|blockquote|pre|hr)/);
        const isBlockEnd = line.match(/<\/(h[1-6]|table|ul|ol|blockquote|pre)>$/) || line.match(/<hr>$/);
        const isBlock = isBlockStart || isBlockEnd;

        if (isBlock) {
            if (inParagraph && paragraphLines.length > 0) {
                result.push('<p>' + paragraphLines.join('<br>') + '</p>');
                paragraphLines = [];
                inParagraph = false;
            }
            result.push(line);
        } else {
            if (!inParagraph) {
                inParagraph = true;
            }
            paragraphLines.push(line);
        }
    });

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
        
        aiChatInput.addEventListener('input', () => {
            aiChatInput.style.height = 'auto';
            aiChatInput.style.height = Math.min(aiChatInput.scrollHeight, CONSTANTS.MAX_INPUT_HEIGHT) + 'px';
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

// ==================== Google 同步功能 ====================

let isGoogleAuthenticated = false;
let googleUserInfo = null;

// 加载 Google 配置
async function loadGoogleConfig() {
    try {
        const result = await window.electronAPI.getGoogleConfig();
        if (result.success && result.config) {
            if (result.config.autoSyncOnStart !== undefined) {
                document.getElementById('autoSyncCheckbox').checked = result.config.autoSyncOnStart !== false;
            }
        }
    } catch (error) {
        console.error('加载 Google 配置失败:', error);
    }
}

// 检查 Google 认证状态
async function checkGoogleAuthStatus() {
    try {
        const result = await window.electronAPI.checkGoogleAuth();
        if (result.success) {
            isGoogleAuthenticated = result.isAuthenticated;
            if (result.isAuthenticated && result.userInfo) {
                googleUserInfo = result.userInfo;
                updateGoogleAuthUI(true);
                await loadSyncStatus();
            } else {
                updateGoogleAuthUI(false);
            }
        }
    } catch (error) {
        console.error('检查 Google 认证状态失败:', error);
        updateGoogleAuthUI(false);
    }
}

// 更新 Google 认证 UI
function updateGoogleAuthUI(isAuthenticated) {
    const googleUserInfoEl = document.getElementById('googleUserInfo');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const googleLogoutBtn = document.getElementById('googleLogoutBtn');
    const googleSyncActions = document.getElementById('googleSyncActions');
    
    if (isAuthenticated && googleUserInfo) {
        googleUserInfoEl.textContent = `已登录：${googleUserInfo.email || googleUserInfo.name || '已授权'}`;
        googleUserInfoEl.style.color = 'var(--success-color)';
        googleLoginBtn.style.display = 'none';
        googleLogoutBtn.style.display = 'inline-flex';
        googleSyncActions.style.display = 'block';
    } else {
        googleUserInfoEl.textContent = '未登录';
        googleUserInfoEl.style.color = '#666';
        googleLoginBtn.style.display = 'inline-flex';
        googleLogoutBtn.style.display = 'none';
        googleSyncActions.style.display = 'none';
    }
}

// Google 登录
async function handleGoogleLogin() {
    try {
        showToast('正在打开登录窗口...', 'info');
        const result = await window.electronAPI.googleLogin();
        
        if (result.success) {
            googleUserInfo = result.userInfo;
            isGoogleAuthenticated = true;
            updateGoogleAuthUI(true);
            showToast('Google 登录成功！', 'success');
            await loadSyncStatus();
        } else {
            showToast(`登录失败：${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Google 登录失败:', error);
        showToast('登录失败，请重试', 'error');
    }
}

// Google 登出
async function handleGoogleLogout() {
    try {
        const result = await window.electronAPI.googleLogout();
        
        if (result.success) {
            isGoogleAuthenticated = false;
            googleUserInfo = null;
            updateGoogleAuthUI(false);
            showToast('已登出 Google 账号', 'success');
        } else {
            showToast(`登出失败：${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Google 登出失败:', error);
        showToast('登出失败，请重试', 'error');
    }
}

// 加载 Google 配置
async function loadGoogleConfig() {
    try {
        const result = await window.electronAPI.getGoogleConfig();
        if (result.success && result.config) {
            const clientId = document.getElementById('googleClientId');
            const clientSecret = document.getElementById('googleClientSecret');
            
            if (clientId) {
                clientId.value = result.config.clientId || '';
            }
            if (clientSecret) {
                clientSecret.value = result.config.clientSecret || '';
            }
        }
    } catch (error) {
        console.error('加载 Google 配置失败:', error);
    }
}

// 保存 Google 配置
async function saveGoogleConfig(event) {
    if (event) event.preventDefault();
    
    const clientId = document.getElementById('googleClientId');
    const clientSecret = document.getElementById('googleClientSecret');
    
    const config = {
        clientId: clientId.value.trim(),
        clientSecret: clientSecret.value.trim(),
        enabled: false
    };
    
    if (!config.clientId || !config.clientSecret) {
        showToast('请填写完整的 Client ID 和 Client Secret', 'error');
        return;
    }
    
    try {
        const result = await window.electronAPI.saveGoogleConfig(config);
        
        if (result.success) {
            showToast('Google 配置已保存！现在可以登录了', 'success');
        } else {
            showToast(`保存失败：${result.error}`, 'error');
        }
    } catch (error) {
        console.error('保存 Google 配置失败:', error);
        showToast('保存失败，请重试', 'error');
    }
}

async function handleManualSync() {
    const btn = document.getElementById('manualSyncBtn');
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = `
            <svg class="btn-icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            同步中...
        `;

        showToast('正在同步数据到云端...', 'info');
        const result = await window.electronAPI.syncToCloud();

        if (result.success) {
            const conflicts = result.results.exercise.conflicts || result.results.diet.conflicts;
            const message = conflicts ? '同步完成（已自动合并冲突）' : '同步完成';
            showToast(message, 'success');
            await loadSyncStatus();

            loadData();
            loadDietData();
        } else {
            showToast(`同步失败：${result.error}`, 'error');
        }
    } catch (error) {
        console.error('同步失败:', error);
        showToast('同步失败，请重试', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// 查看同步状态
async function handleSyncStatus() {
    try {
        const result = await window.electronAPI.getSyncStatus();
        
        if (result.success) {
            const lastSync = result.lastSyncTime 
                ? new Date(result.lastSyncTime).toLocaleString('zh-CN')
                : '从未同步';
            const deviceMatch = result.deviceId === result.currentDevice;
            
            const message = `
                <strong>同步状态</strong><br>
                最后同步：${lastSync}<br>
                运动数据版本：${result.exerciseVersion}<br>
                饮食数据版本：${result.dietVersion}<br>
                ${deviceMatch ? '✓ 当前设备' : '⚠ 其他设备'}
            `;
            
            showToast(message, 'info');
        } else {
            showToast(`获取状态失败：${result.error}`, 'error');
        }
    } catch (error) {
        console.error('获取同步状态失败:', error);
        showToast('获取状态失败', 'error');
    }
}

// 加载同步状态
async function loadSyncStatus() {
    try {
        const result = await window.electronAPI.getSyncStatus();
        
        if (result.success && result.lastSyncTime) {
            const lastSyncEl = document.getElementById('lastSyncTime');
            const syncTime = new Date(result.lastSyncTime).toLocaleString('zh-CN');
            lastSyncEl.textContent = `最后同步：${syncTime}`;
        }
    } catch (error) {
        console.error('加载同步状态失败:', error);
    }
}

// 切换自动同步
async function toggleAutoSync(event) {
    const enabled = event.target.checked;
    
    try {
        const config = await window.electronAPI.getGoogleConfig();
        if (config.success) {
            config.config.autoSyncOnStart = enabled;
            await window.electronAPI.saveGoogleConfig(config.config);
            showToast(
                enabled ? '已启用启动时自动同步' : '已关闭启动时自动同步',
                'success'
            );
        }
    } catch (error) {
        console.error('切换自动同步失败:', error);
        event.target.checked = !enabled;
    }
}

function bindGoogleSyncEvents() {
    // Google 配置表单
    const googleConfigForm = document.getElementById('googleConfigForm');
    if (googleConfigForm) {
        googleConfigForm.addEventListener('submit', saveGoogleConfig);
    }

    // 配置指南链接
    const googleConfigGuideLink = document.getElementById('googleConfigGuideLink');
    if (googleConfigGuideLink) {
        googleConfigGuideLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.electronAPI.openExternal && window.electronAPI.openExternal('GOOGLE_SYNC_GUIDE.md');
            showToast('请查看项目目录中的 GOOGLE_SYNC_GUIDE.md 文件', 'info');
        });
    }

    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }

    const googleLogoutBtn = document.getElementById('googleLogoutBtn');
    if (googleLogoutBtn) {
        googleLogoutBtn.addEventListener('click', handleGoogleLogout);
    }

    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', handleManualSync);
    }

    const syncStatusBtn = document.getElementById('syncStatusBtn');
    if (syncStatusBtn) {
        syncStatusBtn.addEventListener('click', handleSyncStatus);
    }

    const autoSyncCheckbox = document.getElementById('autoSyncCheckbox');
    if (autoSyncCheckbox) {
        autoSyncCheckbox.addEventListener('change', toggleAutoSync);
    }
}

// ==================== 代理配置功能 ====================

// 加载代理配置
async function loadProxyConfig() {
    try {
        const result = await window.electronAPI.getProxyConfig();
        if (result.success && result.config) {
            const proxyEnabled = document.getElementById('proxyEnabled');
            const proxyUrl = document.getElementById('proxyUrl');
            const proxyUrlGroup = document.getElementById('proxyUrlGroup');
            
            if (proxyEnabled) {
                proxyEnabled.checked = result.config.enabled || false;
            }
            if (proxyUrl) {
                proxyUrl.value = result.config.url || '';
            }
            if (proxyUrlGroup) {
                proxyUrlGroup.style.display = result.config.enabled ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('加载代理配置失败:', error);
    }
}

// 保存代理配置
async function saveProxyConfig(event) {
    event.preventDefault();
    
    const proxyEnabled = document.getElementById('proxyEnabled');
    const proxyUrl = document.getElementById('proxyUrl');
    
    const config = {
        enabled: proxyEnabled.checked,
        url: proxyUrl.value.trim()
    };
    
    if (config.enabled && !config.url) {
        showToast('请填写代理地址', 'error');
        return;
    }
    
    try {
        const result = await window.electronAPI.saveProxyConfig(config);
        if (result.success) {
            showToast('代理配置已保存！请重启应用使代理生效。', 'success');
        } else {
            showToast(`保存失败：${result.error}`, 'error');
        }
    } catch (error) {
        console.error('保存代理配置失败:', error);
        showToast('保存代理配置失败', 'error');
    }
}

// 绑定代理配置事件
function bindProxyEvents() {
    const proxyConfigForm = document.getElementById('proxyConfigForm');
    if (proxyConfigForm) {
        proxyConfigForm.addEventListener('submit', saveProxyConfig);
    }
    
    const proxyEnabled = document.getElementById('proxyEnabled');
    const proxyUrlGroup = document.getElementById('proxyUrlGroup');
    if (proxyEnabled && proxyUrlGroup) {
        proxyEnabled.addEventListener('change', () => {
            proxyUrlGroup.style.display = proxyEnabled.checked ? 'block' : 'none';
        });
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);

// ==================== 同步提示功能 ====================

// 显示同步提示
function showSyncToast(message, type = 'success') {
    const container = document.getElementById('syncToastContainer');
    if (!container) return;

    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `sync-toast ${type}`;
    
    // 图标
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'sync-toast-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    
    if (type === 'success') {
        // 云同步成功图标
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-10H15a6 6 0 00-12 1v1m0 0l3-3m-3 3l3 3');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        icon.appendChild(path);
    } else {
        // 错误图标
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        icon.appendChild(path);
    }
    
    // 文字
    const text = document.createElement('span');
    text.className = 'sync-toast-text';
    text.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    
    // 2.5秒后自动消失
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300); // 等待动画完成
    }, 2500);
}

// 监听来自主进程的同步通知
if (window.electronAPI && window.electronAPI.onSyncNotification) {
    window.electronAPI.onSyncNotification((data) => {
        if (data.success) {
            showSyncToast('已同步到云端 ☁️', 'success');
        } else {
            showSyncToast('同步失败', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadAIConfig();
    bindAIEvents();

    loadGoogleConfig();
    checkGoogleAuthStatus();
    bindGoogleSyncEvents();

    loadProxyConfig();
    bindProxyEvents();
});

// ==================== 设置页面折叠功能 ====================

function initSettingsAccordion() {
    const headers = document.querySelectorAll('.settings-section-header');
    
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isActive = header.classList.contains('active');
            
            // 关闭所有其他区域
            document.querySelectorAll('.settings-section-header').forEach(h => {
                if (h !== header) {
                    h.classList.remove('active');
                    h.nextElementSibling.classList.remove('active');
                }
            });
            
            // 切换当前区域
            if (isActive) {
                header.classList.remove('active');
                content.classList.remove('active');
            } else {
                header.classList.add('active');
                content.classList.add('active');
            }
        });
    });
    
    // 初始化时展开第一个区域
    const firstHeader = document.querySelector('.settings-section-header');
    if (firstHeader) {
        firstHeader.classList.add('active');
        firstHeader.nextElementSibling.classList.add('active');
    }
}

// 在页面切换到设置页面时初始化折叠功能
const originalSwitchPage = switchPage;
switchPage = function(pageName) {
    originalSwitchPage.call(this, pageName);
    if (pageName === 'settings') {
        setTimeout(initSettingsAccordion, 100);
    }
};
