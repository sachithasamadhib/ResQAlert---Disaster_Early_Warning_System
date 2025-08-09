const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  testFirebaseConnection: () => ipcRenderer.invoke('test-firebase-connection'),
  fetchLatestSensorData: () => ipcRenderer.invoke('fetch-latest-sensor-data'),
  fetchAllSensorData: () => ipcRenderer.invoke('fetch-all-sensor-data'),
  getUsersData: () => ipcRenderer.invoke('get-users-data'),
  getUserActivity: () => ipcRenderer.invoke('get-user-activity'),
});
