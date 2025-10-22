const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
let DATA_FILE = path.join(app.getPath('userData'), 'exercise-data.json');

function readJSONFile(filePath, defaultValue = []) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return defaultValue;
    } catch (error) {
        console.error(`读取文件失败 ${filePath}:`, error);
        return defaultValue;
    }
}

function writeJSONFile(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`写入文件失败 ${filePath}:`, error);
        return false;
    }
}

function loadConfig() {
    const config = readJSONFile(CONFIG_FILE, {});
    if (config.dataFilePath && fs.existsSync(path.dirname(config.dataFilePath))) {
        DATA_FILE = config.dataFilePath;
    }
}

function saveConfig(config) {
    return writeJSONFile(CONFIG_FILE, config);
}

function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        writeJSONFile(DATA_FILE, []);
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

ipcMain.handle('get-records', async () => {
    return readJSONFile(DATA_FILE, []);
});

ipcMain.handle('save-record', async (event, record) => {
    try {
        const records = readJSONFile(DATA_FILE, []);
        record.id = Date.now();
        records.push(record);
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (writeJSONFile(DATA_FILE, records)) {
            return { success: true, record };
        }
        throw new Error('写入文件失败');
    } catch (error) {
        console.error('保存数据失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-record', async (event, id) => {
    try {
        const records = readJSONFile(DATA_FILE, []).filter(record => record.id !== id);
        
        if (writeJSONFile(DATA_FILE, records)) {
            return { success: true };
        }
        throw new Error('写入文件失败');
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

ipcMain.handle('set-data-path', async (event, newPath) => {
    const oldPath = DATA_FILE;
    try {
        const targetDir = path.dirname(newPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        if (!fs.existsSync(newPath)) {
            if (fs.existsSync(DATA_FILE)) {
                fs.copyFileSync(DATA_FILE, newPath);
            } else {
                writeJSONFile(newPath, []);
            }
        }

        DATA_FILE = newPath;

        if (saveConfig({ dataFilePath: newPath })) {
            return { success: true, oldPath, newPath };
        }
        
        DATA_FILE = oldPath;
        return { success: false, error: '保存配置失败' };
    } catch (error) {
        console.error('设置数据文件路径失败:', error);
        DATA_FILE = oldPath;
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

// IPC 处理器 - 获取AI配置
ipcMain.handle('get-ai-config', async () => {
    try {
        const config = readJSONFile(CONFIG_FILE, {});
        return {
            success: true,
            config: config.aiConfig || {
                apiUrl: '',
                apiKey: '',
                model: ''
            }
        };
    } catch (error) {
        console.error('获取AI配置失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 保存AI配置
ipcMain.handle('save-ai-config', async (event, aiConfig) => {
    try {
        const config = readJSONFile(CONFIG_FILE, {});
        config.aiConfig = aiConfig;
        
        if (saveConfig(config)) {
            return { success: true };
        }
        throw new Error('保存配置失败');
    } catch (error) {
        console.error('保存AI配置失败:', error);
        return { success: false, error: error.message };
    }
});
