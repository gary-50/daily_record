const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 加载环境变量（必须在其他模块之前）
require('dotenv').config();

const GoogleAuth = require('./googleAuth');
const DriveSync = require('./driveSync');

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
let DATA_FILE = path.join(app.getPath('userData'), 'exercise-data.json');
let DIET_DATA_FILE = path.join(app.getPath('userData'), 'diet-data.json');

// Google 认证和同步实例
let googleAuth = null;
let driveSync = null;

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

function setDataDirectory(dir) {
    DATA_FILE = path.join(dir, 'exercise-data.json');
    DIET_DATA_FILE = path.join(dir, 'diet-data.json');
}

function loadConfig() {
    const config = readJSONFile(CONFIG_FILE, {});
    if (config.dataDirectory && fs.existsSync(config.dataDirectory)) {
        setDataDirectory(config.dataDirectory);
    }
}

function saveConfig(config) {
    return writeJSONFile(CONFIG_FILE, config);
}

function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        writeJSONFile(DATA_FILE, []);
    }
    if (!fs.existsSync(DIET_DATA_FILE)) {
        writeJSONFile(DIET_DATA_FILE, []);
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
app.whenReady().then(async () => {
    loadConfig();  // 先加载配置
    ensureDataFile();
    
    // 读取配置文件（用于代理和Google Auth）
    const config = readJSONFile(CONFIG_FILE, {});
    
    // 检查并设置代理
    if (config.proxy && config.proxy.enabled && config.proxy.url) {
        console.log('设置代理:', config.proxy.url);
        
        // 1. 为Electron浏览器窗口设置代理
        try {
            const session = require('electron').session;
            await session.defaultSession.setProxy({
                proxyRules: config.proxy.url
            });
            console.log('Electron代理设置成功');
        } catch (err) {
            console.error('设置Electron代理失败:', err.message);
        }
        
        // 2. 为Node.js HTTP/HTTPS请求设置代理（重要！用于googleapis）
        const proxyUrl = config.proxy.url;
        process.env.HTTP_PROXY = proxyUrl;
        process.env.HTTPS_PROXY = proxyUrl;
        process.env.http_proxy = proxyUrl;
        process.env.https_proxy = proxyUrl;
        console.log('Node.js代理环境变量已设置');
    }
    
    // 初始化 Google Auth（如果已配置）
    if (config.googleConfig && config.googleConfig.enabled) {
        initializeGoogleAuth(config.googleConfig);
        
        // 启动时自动同步
        if (driveSync && config.googleConfig.autoSyncOnStart !== false) {
            try {
                await googleAuth.ensureValidToken();
                const exerciseData = readJSONFile(DATA_FILE, []);
                const dietData = readJSONFile(DIET_DATA_FILE, []);
                
                await driveSync.performFullSync(
                    exerciseData,
                    dietData,
                    readJSONFile,
                    writeJSONFile,
                    DATA_FILE,
                    DIET_DATA_FILE
                );
                console.log('启动时自动同步完成');
            } catch (error) {
                console.error('启动时自动同步失败:', error);
            }
        }
    }
    
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

async function handleSaveRecord(filePath, record, errorPrefix) {
    try {
        const records = readJSONFile(filePath, []);
        record.id = Date.now();
        records.push(record);
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (writeJSONFile(filePath, records)) {
            return { success: true, record };
        }
        throw new Error('写入文件失败');
    } catch (error) {
        console.error(`${errorPrefix}:`, error);
        return { success: false, error: error.message };
    }
}

async function handleDeleteRecord(filePath, id, errorPrefix) {
    try {
        const records = readJSONFile(filePath, []).filter(record => record.id !== id);
        
        if (writeJSONFile(filePath, records)) {
            return { success: true };
        }
        throw new Error('写入文件失败');
    } catch (error) {
        console.error(`${errorPrefix}:`, error);
        return { success: false, error: error.message };
    }
}

ipcMain.handle('get-records', async () => {
    return readJSONFile(DATA_FILE, []);
});

ipcMain.handle('save-record', async (event, record) => {
    return handleSaveRecord(DATA_FILE, record, '保存数据失败');
});

ipcMain.handle('delete-record', async (event, id) => {
    return handleDeleteRecord(DATA_FILE, id, '删除数据失败');
});

// IPC 处理器 - 获取数据文件路径
ipcMain.handle('get-data-path', async () => {
    return DATA_FILE;
});

// IPC 处理器 - 选择数据文件夹保存位置
ipcMain.handle('choose-data-path', async () => {
    const result = await dialog.showOpenDialog({
        title: '选择数据文件夹保存位置',
        defaultPath: path.dirname(DATA_FILE),
        properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('set-data-path', async (event, newDirectory) => {
    const oldExerciseFile = DATA_FILE;
    const oldDietFile = DIET_DATA_FILE;
    try {
        if (!fs.existsSync(newDirectory)) {
            fs.mkdirSync(newDirectory, { recursive: true });
        }

        const newExerciseFile = path.join(newDirectory, 'exercise-data.json');
        const newDietFile = path.join(newDirectory, 'diet-data.json');

        if (!fs.existsSync(newExerciseFile)) {
            if (fs.existsSync(DATA_FILE)) {
                fs.copyFileSync(DATA_FILE, newExerciseFile);
            } else {
                writeJSONFile(newExerciseFile, []);
            }
        }

        if (!fs.existsSync(newDietFile)) {
            if (fs.existsSync(DIET_DATA_FILE)) {
                fs.copyFileSync(DIET_DATA_FILE, newDietFile);
            } else {
                writeJSONFile(newDietFile, []);
            }
        }

        setDataDirectory(newDirectory);

        if (saveConfig({ dataDirectory: newDirectory })) {
            return { 
                success: true, 
                newPath: newDirectory,
                exerciseFile: DATA_FILE,
                dietFile: DIET_DATA_FILE
            };
        }
        
        DATA_FILE = oldExerciseFile;
        DIET_DATA_FILE = oldDietFile;
        return { success: false, error: '保存配置失败' };
    } catch (error) {
        console.error('设置数据文件夹路径失败:', error);
        DATA_FILE = oldExerciseFile;
        DIET_DATA_FILE = oldDietFile;
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 获取当前配置
ipcMain.handle('get-config', async () => {
    const config = readJSONFile(CONFIG_FILE, {});
    const isDefaultPath = !config.dataDirectory;
    const dataDirectory = config.dataDirectory || app.getPath('userData');
    
    return {
        dataDirectory: dataDirectory,
        exerciseFile: DATA_FILE,
        dietFile: DIET_DATA_FILE,
        isDefaultPath: isDefaultPath
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

// IPC 处理器 - 获取饮食记录
ipcMain.handle('get-diet-records', async () => {
    return readJSONFile(DIET_DATA_FILE, []);
});

// IPC 处理器 - 保存饮食记录
ipcMain.handle('save-diet-record', async (event, record) => {
    return handleSaveRecord(DIET_DATA_FILE, record, '保存饮食数据失败');
});

// IPC 处理器 - 删除饮食记录
ipcMain.handle('delete-diet-record', async (event, id) => {
    return handleDeleteRecord(DIET_DATA_FILE, id, '删除饮食数据失败');
});

// ==================== Google 同步功能 ====================

// 初始化 Google Auth
function initializeGoogleAuth(config) {
    try {
        googleAuth = new GoogleAuth();
        // 使用预设的凭据或配置文件中的凭据
        const clientId = config?.clientId;
        const clientSecret = config?.clientSecret;
        googleAuth.initialize(clientId, clientSecret);
        
        // 如果有保存的 tokens，恢复认证状态
        if (config && config.tokens) {
            googleAuth.setCredentials(config.tokens);
            driveSync = new DriveSync(googleAuth.getClient());
        }
        
        return true;
    } catch (error) {
        console.error('初始化 Google Auth 失败:', error);
        return false;
    }
}

// IPC 处理器 - 保存 Google 配置
ipcMain.handle('save-google-config', async (event, config) => {
    try {
        const fullConfig = readJSONFile(CONFIG_FILE, {});
        fullConfig.googleConfig = config;
        
        if (saveConfig(fullConfig)) {
            initializeGoogleAuth(config);
            return { success: true };
        }
        throw new Error('保存配置失败');
    } catch (error) {
        console.error('保存 Google 配置失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 获取 Google 配置
ipcMain.handle('get-google-config', async () => {
    try {
        const config = readJSONFile(CONFIG_FILE, {});
        return {
            success: true,
            config: config.googleConfig || {
                clientId: '',
                clientSecret: '',
                enabled: false
            }
        };
    } catch (error) {
        console.error('获取 Google 配置失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - Google 登录
ipcMain.handle('google-login', async () => {
    try {
        const config = readJSONFile(CONFIG_FILE, {});
        
        if (!googleAuth) {
            // 检查环境变量是否配置
            if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
                return { 
                    success: false, 
                    error: 'Google OAuth 凭据未配置。请确保 .env 文件中设置了 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET' 
                };
            }
            // 使用环境变量中的凭据初始化
            const initResult = initializeGoogleAuth(config.googleConfig);
            if (!initResult) {
                return {
                    success: false,
                    error: '初始化 Google Auth 失败'
                };
            }
        }
        
        const result = await googleAuth.authenticate();
        
        if (result.success) {
            // 保存 tokens
            if (!config.googleConfig) {
                config.googleConfig = {};
            }
            config.googleConfig.tokens = result.tokens;
            config.googleConfig.userInfo = result.userInfo;
            config.googleConfig.enabled = true;
            saveConfig(config);
            
            // 初始化同步
            driveSync = new DriveSync(googleAuth.getClient());
            
            return {
                success: true,
                userInfo: result.userInfo
            };
        }
        
        return result;
    } catch (error) {
        console.error('Google 登录失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - Google 登出
ipcMain.handle('google-logout', async () => {
    try {
        if (googleAuth) {
            googleAuth.logout();
        }
        
        driveSync = null;
        
        const config = readJSONFile(CONFIG_FILE, {});
        if (config.googleConfig) {
            delete config.googleConfig.tokens;
            delete config.googleConfig.userInfo;
            config.googleConfig.enabled = false;
            saveConfig(config);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Google 登出失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 检查 Google 登录状态
ipcMain.handle('check-google-auth', async () => {
    try {
        const config = readJSONFile(CONFIG_FILE, {});
        const googleConfig = config.googleConfig;
        
        if (!googleConfig || !googleConfig.enabled || !googleConfig.tokens) {
            return { success: true, isAuthenticated: false };
        }
        
        if (!googleAuth) {
            initializeGoogleAuth(googleConfig);
        }
        
        // 检查 token 是否过期
        if (googleAuth.isTokenExpired()) {
            try {
                const newTokens = await googleAuth.refreshAccessToken();
                config.googleConfig.tokens = newTokens;
                saveConfig(config);
            } catch (error) {
                // Token 刷新失败，需要重新登录
                return { success: true, isAuthenticated: false, needReauth: true };
            }
        }
        
        return {
            success: true,
            isAuthenticated: true,
            userInfo: googleConfig.userInfo
        };
    } catch (error) {
        console.error('检查 Google 认证状态失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 执行完整同步
ipcMain.handle('sync-to-cloud', async () => {
    try {
        if (!driveSync) {
            return { success: false, error: '请先登录 Google 账号' };
        }
        
        // 确保 token 有效
        await googleAuth.ensureValidToken();
        
        // 读取本地数据
        const exerciseData = readJSONFile(DATA_FILE, []);
        const dietData = readJSONFile(DIET_DATA_FILE, []);
        
        // 执行同步
        const result = await driveSync.performFullSync(
            exerciseData,
            dietData,
            readJSONFile,
            writeJSONFile,
            DATA_FILE,
            DIET_DATA_FILE
        );
        
        return result;
    } catch (error) {
        console.error('同步失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 获取同步状态
ipcMain.handle('get-sync-status', async () => {
    try {
        if (!driveSync) {
            return { success: false, error: '未启用同步功能' };
        }
        
        await googleAuth.ensureValidToken();
        return await driveSync.getSyncStatus();
    } catch (error) {
        console.error('获取同步状态失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 手动触发同步（保存记录后）
ipcMain.handle('auto-sync', async (event, dataType) => {
    try {
        if (!driveSync) {
            return { success: false, error: '同步未启用' };
        }
        
        const config = readJSONFile(CONFIG_FILE, {});
        if (!config.googleConfig || !config.googleConfig.autoSync) {
            return { success: false, error: '自动同步未启用' };
        }
        
        await googleAuth.ensureValidToken();
        
        const data = readJSONFile(
            dataType === 'exercise' ? DATA_FILE : DIET_DATA_FILE,
            []
        );
        
        const result = await driveSync.syncDataType(
            dataType,
            data,
            writeJSONFile,
            dataType === 'exercise' ? DATA_FILE : DIET_DATA_FILE
        );
        
        return result;
    } catch (error) {
        console.error('自动同步失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 获取代理配置
ipcMain.handle('get-proxy-config', async () => {
    try {
        const config = readJSONFile(CONFIG_FILE, {});
        return {
            success: true,
            config: config.proxy || {
                url: '',
                enabled: false
            }
        };
    } catch (error) {
        console.error('获取代理配置失败:', error);
        return { success: false, error: error.message };
    }
});

// IPC 处理器 - 保存代理配置
ipcMain.handle('save-proxy-config', async (event, proxyConfig) => {
    try {
        const config = readJSONFile(CONFIG_FILE, {});
        config.proxy = proxyConfig;
        
        if (saveConfig(config)) {
            // 立即应用代理设置（需要确保在app ready之后）
            if (app.isReady()) {
                try {
                    if (proxyConfig.enabled && proxyConfig.url) {
                        await app.session.defaultSession.setProxy({
                            proxyRules: proxyConfig.url
                        });
                        console.log('代理已更新:', proxyConfig.url);
                    } else {
                        await app.session.defaultSession.setProxy({
                            proxyRules: 'direct://'
                        });
                        console.log('代理已禁用');
                    }
                } catch (proxyError) {
                    console.error('设置代理失败:', proxyError);
                    // 即使设置代理失败，配置也已保存，重启后生效
                }
            }
            return { success: true };
        }
        throw new Error('保存配置失败');
    } catch (error) {
        console.error('保存代理配置失败:', error);
        return { success: false, error: error.message };
    }
});
