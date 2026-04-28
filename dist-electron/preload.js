"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    openImage: () => electron_1.ipcRenderer.invoke("dialog:openImage"),
    saveRooms: (svgContent, defaultName) => electron_1.ipcRenderer.invoke("dialog:saveRooms", svgContent, defaultName),
    readLog: () => electron_1.ipcRenderer.invoke("log:read"),
    clearLog: () => electron_1.ipcRenderer.invoke("log:clear"),
    writeLog: (level, message) => electron_1.ipcRenderer.invoke("log:write", level, message),
});
