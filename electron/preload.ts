import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openImage: () => ipcRenderer.invoke("dialog:openImage"),
  saveRooms: (svgContent: string, defaultName: string) =>
    ipcRenderer.invoke("dialog:saveRooms", svgContent, defaultName),
  readLog: () => ipcRenderer.invoke("log:read"),
  clearLog: () => ipcRenderer.invoke("log:clear"),
  writeLog: (level: string, message: string) =>
    ipcRenderer.invoke("log:write", level, message),
});
