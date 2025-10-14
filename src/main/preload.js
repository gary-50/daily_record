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
    getDataPath: () => ipcRenderer.invoke('get-data-path')
});
