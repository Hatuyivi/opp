import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
} from "electron";
import path from "path";
import fs from "fs";
import os from "os";

// ── Logging ────────────────────────────────────────────────────────────────
const LOG_FILE = path.join(app.getPath("userData"), "app.log");

function writeLog(level: string, message: string) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line, "utf-8");
}

function log(message: string) {
  writeLog("info", message);
}
function logError(message: string) {
  writeLog("error", message);
}

// ── Window ─────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    // Use protocol handler for packaged app
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    log("Window created and shown");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  log(`App started. Platform: ${os.platform()} ${os.arch()}`);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── IPC Handlers ───────────────────────────────────────────────────────────

// Open image file dialog
ipcMain.handle("dialog:openImage", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Выберите планировку",
    filters: [
      {
        name: "Изображения",
        extensions: ["png", "jpg", "jpeg", "bmp", "tiff", "webp"],
      },
    ],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  log(`User opened image: ${filePath}`);
  // Return base64 data URL
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg"
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
ipcMain.handle(
  "dialog:saveRooms",
  async (_event, svgContent: string, defaultName: string) => {
    if (!mainWindow) return { success: false, reason: "no window" };
    const result = await dialog.showSaveDialog(mainWindow, {
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
      fs.writeFileSync(outPath, svgContent, "utf-8");
      log(`Rooms saved to: ${outPath}`);
      return { success: true, filePath: outPath };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logError(`Save failed: ${msg}`);
      return { success: false, reason: msg };
    }
  }
);

// Read log file
ipcMain.handle("log:read", async () => {
  try {
    if (!fs.existsSync(LOG_FILE)) return "";
    return fs.readFileSync(LOG_FILE, "utf-8");
  } catch {
    return "Не удалось прочитать лог.";
  }
});

// Clear log
ipcMain.handle("log:clear", async () => {
  try {
    fs.writeFileSync(LOG_FILE, "", "utf-8");
    log("Log cleared by user");
    return true;
  } catch {
    return false;
  }
});

// Write log entry from renderer
ipcMain.handle("log:write", async (_event, level: string, message: string) => {
  writeLog(level, message);
});
