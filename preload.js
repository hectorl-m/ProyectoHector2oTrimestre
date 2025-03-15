const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    startScraping: (city) => ipcRenderer.invoke('start-scraping', city)
});
