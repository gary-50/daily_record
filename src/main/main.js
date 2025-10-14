const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 数据文件路径
const DATA_FILE = path.join(app.getPath('userData'), 'exercise-data.json');

// 确保数据文件存在
function ensureDataFile() {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
}

// 创建主窗口
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, '../../icon.png'),
        backgroundColor: '#f5f7fa',
        show: false
    });

    // 窗口准备好后再显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 加载应用
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

// 应用准备就绪
app.whenReady().then(() => {
    ensureDataFile();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC 处理器 - 获取所有记录
ipcMain.handle('get-records', async () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取数据失败:', error);
        return [];
    }
});

// IPC 处理器 - 保存记录
ipcMain.handle('save-record', async (event, record) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const records = JSON.parse(data);

        // 添加ID和时间戳
        record.id = Date.now();
        records.push(record);

        // 按日期降序排序
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 保存到文件
        fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));

        return { success: true, record };
    } catch (error) {
        console.error('保存数据失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 删除记录
ipcMain.handle('delete-record', async (event, id) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        let records = JSON.parse(data);

        // 过滤掉要删除的记录
        records = records.filter(record => record.id !== id);

        // 保存到文件
        fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));

        return { success: true };
    } catch (error) {
        console.error('删除数据失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 获取数据文件路径
ipcMain.handle('get-data-path', async () => {
    return DATA_FILE;
});
