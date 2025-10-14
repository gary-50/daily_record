const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 配置文件路径（用于存储用户设置）
const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// 默认数据文件路径
let DATA_FILE = path.join(app.getPath('userData'), 'exercise-data.json');

// 加载配置文件
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (config.dataFilePath && fs.existsSync(path.dirname(config.dataFilePath))) {
                DATA_FILE = config.dataFilePath;
            }
        }
    } catch (error) {
        console.error('加载配置文件失败:', error);
    }
}

// 保存配置文件
function saveConfig(config) {
    try {
        const configDir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('保存配置文件失败:', error);
        return false;
    }
}

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
    loadConfig();  // 先加载配置
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

// IPC 处理器 - 选择数据文件保存位置
ipcMain.handle('choose-data-path', async () => {
    const result = await dialog.showSaveDialog({
        title: '选择数据文件保存位置',
        defaultPath: DATA_FILE,
        filters: [
            { name: 'JSON 文件', extensions: ['json'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
    });

    if (!result.canceled && result.filePath) {
        return result.filePath;
    }
    return null;
});

// IPC 处理器 - 设置数据文件路径
ipcMain.handle('set-data-path', async (event, newPath) => {
    try {
        // 确保目标目录存在
        const targetDir = path.dirname(newPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 如果新路径不存在文件，复制当前数据到新位置
        if (!fs.existsSync(newPath) && fs.existsSync(DATA_FILE)) {
            fs.copyFileSync(DATA_FILE, newPath);
        } else if (!fs.existsSync(newPath)) {
            // 如果都不存在，创建新文件
            fs.writeFileSync(newPath, JSON.stringify([]));
        }

        // 更新数据文件路径
        const oldPath = DATA_FILE;
        DATA_FILE = newPath;

        // 保存配置
        const success = saveConfig({ dataFilePath: newPath });

        if (success) {
            return { success: true, oldPath, newPath };
        } else {
            DATA_FILE = oldPath; // 回滚
            return { success: false, error: '保存配置失败' };
        }
    } catch (error) {
        console.error('设置数据文件路径失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 获取当前配置
ipcMain.handle('get-config', async () => {
    return {
        dataFilePath: DATA_FILE,
        defaultPath: path.join(app.getPath('userData'), 'exercise-data.json')
    };
});
