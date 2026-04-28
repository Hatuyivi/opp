// Renderer-side logger — forwards to main process via IPC if available,
// otherwise buffers in memory for web-only preview.

const memoryLog: string[] = [];

function getAPI() {
  return typeof window !== "undefined" && (window as any).electronAPI
    ? (window as any).electronAPI
    : null;
}

function formatLine(level: string, message: string) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  info(message: string) {
    const line = formatLine("info", message);
    memoryLog.push(line);
    getAPI()?.writeLog("info", message);
    console.log(line);
  },
  warn(message: string) {
    const line = formatLine("warn", message);
    memoryLog.push(line);
    getAPI()?.writeLog("warn", message);
    console.warn(line);
  },
  error(message: string) {
    const line = formatLine("error", message);
    memoryLog.push(line);
    getAPI()?.writeLog("error", message);
    console.error(line);
  },
  async read(): Promise<string> {
    const api = getAPI();
    if (api) return api.readLog();
    return memoryLog.join("\n");
  },
  async clear(): Promise<void> {
    memoryLog.length = 0;
    await getAPI()?.clearLog();
  },
};
