const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startScraping: (formData) => ipcRenderer.invoke('start-scraping', formData)
});
