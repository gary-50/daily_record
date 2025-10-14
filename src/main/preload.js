const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 获取所有记录
    getRecords: () => ipcRenderer.invoke('get-records'),

    // 保存新记录
    saveRecord: (record) => ipcRenderer.invoke('save-record', record),

    // 删除记录
    deleteRecord: (id) => ipcRenderer.invoke('delete-record', id),

    // 获取数据文件路径
    getDataPath: () => ipcRenderer.invoke('get-data-path'),

    // 选择数据文件保存位置
    chooseDataPath: () => ipcRenderer.invoke('choose-data-path'),

    // 设置数据文件路径
    setDataPath: (newPath) => ipcRenderer.invoke('set-data-path', newPath),

    // 获取当前配置
    getConfig: () => ipcRenderer.invoke('get-config')
});
