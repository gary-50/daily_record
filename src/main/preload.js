const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => () => ipcRenderer.invoke(channel);
const invokeWith = (channel) => (data) => ipcRenderer.invoke(channel, data);

contextBridge.exposeInMainWorld('electronAPI', {
    getRecords: invoke('get-records'),
    saveRecord: invokeWith('save-record'),
    deleteRecord: invokeWith('delete-record'),
    getDataPath: invoke('get-data-path'),
    chooseDataPath: invoke('choose-data-path'),
    setDataPath: invokeWith('set-data-path'),
    getConfig: invoke('get-config'),
    getAIConfig: invoke('get-ai-config'),
    saveAIConfig: invokeWith('save-ai-config'),
    getDietRecords: invoke('get-diet-records'),
    saveDietRecord: invokeWith('save-diet-record'),
    deleteDietRecord: invokeWith('delete-diet-record'),
    
    // Google 同步 API
    getGoogleConfig: invoke('get-google-config'),
    saveGoogleConfig: invokeWith('save-google-config'),
    googleLogin: invoke('google-login'),
    googleLogout: invoke('google-logout'),
    checkGoogleAuth: invoke('check-google-auth'),
    syncToCloud: invoke('sync-to-cloud'),
    getSyncStatus: invoke('get-sync-status'),
    autoSync: invokeWith('auto-sync')
});
