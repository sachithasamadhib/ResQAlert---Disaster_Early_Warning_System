const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  testFirebaseConnection: () => {
    console.log("IPC: Testing Firebase connection")
    return ipcRenderer.invoke("test-firebase-connection")
  },
  fetchLatestSensorData: () => {
    console.log("IPC: Fetching latest sensor data")
    return ipcRenderer.invoke("fetch-latest-sensor-data")
  },
  fetchAllSensorData: () => {
    console.log("IPC: Fetching all sensor data")
    return ipcRenderer.invoke("fetch-all-sensor-data")
  },
  getUsersData: () => ipcRenderer.invoke("get-users-data"),
  getUserActivity: () => ipcRenderer.invoke("get-user-activity"),
  onSensorDataUpdate: (callback) => {
    ipcRenderer.removeAllListeners("sensor-data-update")
    ipcRenderer.on("sensor-data-update", (_event, data) => callback(data))
  },
  // Notification APIs
  getNotifications: () => ipcRenderer.invoke("get-notifications"),
  saveNotifications: (notifications) => ipcRenderer.invoke("save-notifications", notifications),
  markNotificationsRead: (ids) => ipcRenderer.invoke("mark-notifications-read", ids),
  generateReport: (opts) => ipcRenderer.invoke('generate-report', opts),
})
