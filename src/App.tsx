import React, { useState, useCallback, useRef } from "react";
import { DropZone } from "./components/DropZone";
import { FloorPlanCanvas } from "./components/FloorPlanCanvas";
import { RoomList } from "./components/RoomList";
import { LogModal } from "./components/LogModal";
import {
  detectRooms,
  generateSVG,
  generateJSON,
  type Room,
} from "./utils/roomDetector";
import { logger } from "./utils/logger";

type AppState = "idle" | "processing" | "done";

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState("plan");

  // ── Load image ───────────────────────────────────────────────────────────
  const handleImageLoaded = useCallback(async (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setRooms([]);
    setSelectedIds(new Set());
    setAppState("processing");
    setProgressMsg("Инициализация…");
    logger.info("Image loaded, starting detection");

    // Get natural image size
    const img = new Image();
    img.onload = async () => {
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });

      try {
        const detected = await detectRooms(dataUrl, (msg) => {
          setProgressMsg(msg);
          logger.info(msg);
        });
        setRooms(detected);
        // Select all by default
        setSelectedIds(new Set(detected.map((r) => r.id)));
        setAppState("done");
        logger.info(`Detection complete. Rooms found: ${detected.length}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Detection error: ${msg}`);
        setProgressMsg(`Ошибка: ${msg}`);
        setAppState("idle");
      }
    };
    img.src = dataUrl;
  }, []);

  const handleOpenDialog = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api) return;
    const result = await api.openImage();
    if (!result) return;
    setFileName(result.filePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "plan");
    handleImageLoaded(result.dataUrl);
  }, [handleImageLoaded]);

  // ── Toggle rooms ─────────────────────────────────────────────────────────
  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(
    (select: boolean) => {
      if (select) setSelectedIds(new Set(rooms.map((r) => r.id)));
      else setSelectedIds(new Set());
    },
    [rooms]
  );

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (selectedIds.size === 0) {
      setSaveStatus("Выберите хотя бы одно помещение");
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    const api = (window as any).electronAPI;

    if (api) {
      // Electron: show native save dialog
      const svgContent = generateSVG(rooms, selectedIds, imageSize.w, imageSize.h);
      const result = await api.saveRooms(svgContent, `${fileName}_rooms.svg`);
      if (result.success) {
        logger.info(`Saved to: ${result.filePath}`);
        setSaveStatus(`Сохранено: ${result.filePath}`);
      } else {
        logger.warn(`Save cancelled or failed: ${result.reason}`);
        setSaveStatus(result.reason === "canceled" ? "Отменено" : `Ошибка: ${result.reason}`);
      }
    } else {
      // Browser fallback: download SVG
      const svgContent = generateSVG(rooms, selectedIds, imageSize.w, imageSize.h);
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}_rooms.svg`;
      a.click();
      URL.revokeObjectURL(url);
      logger.info("SVG downloaded via browser");
      setSaveStatus("Файл загружен");
    }

    setTimeout(() => setSaveStatus(null), 4000);
  }, [rooms, selectedIds, imageSize, fileName]);

  const handleReset = useCallback(() => {
    setImageDataUrl(null);
    setRooms([]);
    setSelectedIds(new Set());
    setAppState("idle");
    setProgressMsg("");
    logger.info("Reset to initial state");
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* ── Title bar / header ── */}
      <header className="flex items-center justify-between px-5 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm flex-shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* macOS traffic lights space */}
          <div className="w-16" />
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-200">FloorPlan Rooms</span>
            {appState === "done" && (
              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                {rooms.length} помещений
              </span>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {appState === "done" && (
            <>
              <button
                onClick={handleSave}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-xl transition-all duration-150 shadow-lg shadow-blue-900/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Сохранить
                {selectedIds.size > 0 && (
                  <span className="bg-blue-500/40 text-blue-200 text-xs px-1.5 py-0.5 rounded-full">
                    {selectedIds.size}
                  </span>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-slate-700/80 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors"
              >
                Новый файл
              </button>
            </>
          )}
          <button
            onClick={() => setShowLog(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-300 text-sm rounded-xl transition-colors border border-slate-700/60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Лог
          </button>
        </div>
      </header>

      {/* ── Save status toast ── */}
      {saveStatus && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl text-sm text-slate-200 animate-fade-in">
          {saveStatus}
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: canvas / dropzone */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {appState === "idle" && (
            <DropZone
              onFile={handleImageLoaded}
              onOpenDialog={handleOpenDialog}
            />
          )}

          {appState === "processing" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="preview"
                  className="max-h-48 max-w-full object-contain rounded-xl opacity-40"
                />
              )}
              <div className="flex flex-col items-center gap-3">
                {/* Spinner */}
                <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-300 text-sm max-w-xs text-center leading-relaxed">
                  {progressMsg}
                </p>
              </div>
            </div>
          )}

          {appState === "done" && imageDataUrl && (
            <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900/50 border border-slate-800">
              <FloorPlanCanvas
                imageDataUrl={imageDataUrl}
                rooms={rooms}
                selectedIds={selectedIds}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onToggle={handleToggle}
              />
            </div>
          )}
        </div>

        {/* Right: room list (only when done) */}
        {appState === "done" && (
          <aside className="w-72 flex-shrink-0 border-l border-slate-800 p-4 flex flex-col overflow-hidden bg-slate-900/40">
            <RoomList
              rooms={rooms}
              selectedIds={selectedIds}
              hoveredId={hoveredId}
              onToggle={handleToggle}
              onHover={setHoveredId}
              onToggleAll={handleToggleAll}
            />
          </aside>
        )}
      </main>

      {/* ── Log modal ── */}
      {showLog && <LogModal onClose={() => setShowLog(false)} />}
    </div>
  );
}
