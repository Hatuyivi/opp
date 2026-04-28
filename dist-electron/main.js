"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
// ── Logging ────────────────────────────────────────────────────────────────
const LOG_FILE = path_1.default.join(electron_1.app.getPath("userData"), "app.log");
function writeLog(level, message) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level.toUpperCase()}] ${message}\n`;
    fs_1.default.appendFileSync(LOG_FILE, line, "utf-8");
}
function log(message) {
    writeLog("info", message);
}
function logError(message) {
    writeLog("error", message);
}
// ── Window ─────────────────────────────────────────────────────────────────
let mainWindow = null;
const isDev = !electron_1.app.isPackaged;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 16, y: 16 },
        backgroundColor: "#0f172a",
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
    });
    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools();
    }
    else {
        // Use protocol handler for packaged app
        mainWindow.loadFile(path_1.default.join(__dirname, "../dist/index.html"));
    }
    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
        log("Window created and shown");
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    log(`App started. Platform: ${os_1.default.platform()} ${os_1.default.arch()}`);
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
// ── IPC Handlers ───────────────────────────────────────────────────────────
// Open image file dialog
electron_1.ipcMain.handle("dialog:openImage", async () => {
    if (!mainWindow)
        return null;
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        title: "Выберите планировку",
        filters: [
            {
                name: "Изображения",
                extensions: ["png", "jpg", "jpeg", "bmp", "tiff", "webp"],
            },
        ],
        properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0)
        return null;
    const filePath = result.filePaths[0];
    log(`User opened image: ${filePath}`);
    // Return base64 data URL
    const data = fs_1.default.readFileSync(filePath);
    const ext = path_1.default.extname(filePath).slice(1).toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "png"
            ? "image/png"
            : ext === "webp"
                ? "image/webp"
                : "image/png";
    const dataUrl = `data:${mime};base64,${data.toString("base64")}`;
    return { dataUrl, filePath };
});
// Save selected rooms as SVG
electron_1.ipcMain.handle("dialog:saveRooms", async (_event, svgContent, defaultName) => {
    if (!mainWindow)
        return { success: false, reason: "no window" };
    const result = await electron_1.dialog.showSaveDialog(mainWindow, {
        title: "Сохранить помещения",
        defaultPath: defaultName || "rooms.svg",
        filters: [
            { name: "SVG", extensions: ["svg"] },
            { name: "JSON", extensions: ["json"] },
        ],
    });
    if (result.canceled || !result.filePath)
        return { success: false, reason: "canceled" };
    const outPath = result.filePath;
    try {
        fs_1.default.writeFileSync(outPath, svgContent, "utf-8");
        log(`Rooms saved to: ${outPath}`);
        return { success: true, filePath: outPath };
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logError(`Save failed: ${msg}`);
        return { success: false, reason: msg };
    }
});
// Read log file
electron_1.ipcMain.handle("log:read", async () => {
    try {
        if (!fs_1.default.existsSync(LOG_FILE))
            return "";
        return fs_1.default.readFileSync(LOG_FILE, "utf-8");
    }
    catch {
        return "Не удалось прочитать лог.";
    }
});
// Clear log
electron_1.ipcMain.handle("log:clear", async () => {
    try {
        fs_1.default.writeFileSync(LOG_FILE, "", "utf-8");
        log("Log cleared by user");
        return true;
    }
    catch {
        return false;
    }
});
// Write log entry from renderer
electron_1.ipcMain.handle("log:write", async (_event, level, message) => {
    writeLog(level, message);
});
