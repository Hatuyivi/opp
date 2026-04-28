import React, { useEffect, useState, useRef } from "react";
import { logger } from "../utils/logger";

interface Props {
  onClose: () => void;
}

export function LogModal({ onClose }: Props) {
  const [content, setContent] = useState("Загрузка лога…");
  const [loading, setLoading] = useState(true);
  const textRef = useRef<HTMLPreElement>(null);

  const load = async () => {
    setLoading(true);
    const text = await logger.read();
    setContent(text || "Лог пуст.");
    setLoading(false);
    // Scroll to bottom
    setTimeout(() => {
      if (textRef.current)
        textRef.current.scrollTop = textRef.current.scrollHeight;
    }, 50);
  };

  useEffect(() => {
    load();
  }, []);

  const handleClear = async () => {
    await logger.clear();
    load();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-slate-100 font-semibold">Лог приложения</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Обновить
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-lg transition-colors"
            >
              Очистить
            </button>
            <button
              onClick={onClose}
              className="ml-2 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Log content */}
        <pre
          ref={textRef}
          className="flex-1 overflow-y-auto text-xs text-emerald-300 font-mono leading-relaxed px-6 py-4 whitespace-pre-wrap break-words custom-scrollbar"
        >
          {loading ? "Загрузка…" : content}
        </pre>
      </div>
    </div>
  );
}
